"""Transformer-регрессор остаточной толщины стенки по сегментам трубопровода.

Вход: месячная последовательность технологического режима (окно [start, end]
строки, последние <=120 месяцев) + статические признаки сегмента.
Сравнение с бустингами на фиксированных сплитах val_case1 / val_case2.

Запуск (одной командой):
    uv run train_transformer.py

Альтернатива через requirements.txt (индексы ОБЯЗАТЕЛЬНО в CLI — uvx
игнорирует index-строки внутри файла и утянет CUDA-сборку torch с PyPI):
    uvx --python 3.12 --extra-index-url https://download.pytorch.org/whl/cpu \
        --with-requirements requirements.txt python train_transformer.py
"""
# /// script
# requires-python = "==3.12.*"
# dependencies = [
#     "torch==2.15.0+cpu",
#     "pandas",
#     "numpy",
#     "scikit-learn",
# ]
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
# ///

import random
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import GroupKFold
from torch.utils.data import DataLoader, TensorDataset

SEED = 42
MAX_MONTHS = 120  # последние 10 лет окна; ранние месяцы всё равно не покрыты рядами (ряды с 2012+)
TS_CHANNELS = [
    "watercut", "v_liquid_true", "v_mix", "gas_content_rate",
    "p_start", "t_mix", "pit_corrosion_intensity", "q",
]
CLIP_P99 = {"p_start", "q"}  # тяжёлые выбросы
META_COLS = ["id", "segment_id", "kind", "start", "end", "y", "had_defect", "split"]

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = Path(__file__).resolve().parent

D_MODEL = 48
N_HEAD = 4
N_LAYERS = 2
FF_DIM = 96
DROPOUT = 0.1
BATCH = 64
LR = 1e-3
WEIGHT_DECAY = 1e-4
MAX_EPOCHS = 30  # фиксированный бюджет + cosine LR; лучший чекпойнт по es-фолду


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


# ---------------------------------------------------------------- data


def build_monthly_ts() -> dict[int, tuple[np.ndarray, np.ndarray]]:
    """Ряды режима -> помесячное среднее по каждой трубе.

    Возвращает id -> (ordinal месяцев, матрица [n_months, n_channels]),
    каналы нормированы (клип p99 для выбросных, затем z-score по всем месяцам).
    """
    ts = pd.read_csv(
        DATA / "tech_mode_for_embedings_with_length_with_temperatures_ids16.csv",
        usecols=["simple_section_id", "calc_date", *TS_CHANNELS],
        parse_dates=["calc_date"],
    )
    ts["month"] = ts["calc_date"].dt.to_period("M").astype("int64")
    monthly = ts.groupby(["simple_section_id", "month"])[TS_CHANNELS].mean().reset_index()

    for c in TS_CHANNELS:
        if c in CLIP_P99:
            monthly[c] = monthly[c].clip(upper=monthly[c].quantile(0.99))
        mu, sd = monthly[c].mean(), monthly[c].std()
        monthly[c] = (monthly[c] - mu) / (sd if sd > 1e-8 else 1.0)
    monthly[TS_CHANNELS] = monthly[TS_CHANNELS].fillna(0.0)

    out = {}
    for pid, g in monthly.groupby("simple_section_id"):
        out[int(pid)] = (g["month"].to_numpy(), g[TS_CHANNELS].to_numpy(dtype=np.float32))
    return out


def build_sequences(df: pd.DataFrame, ts_by_id: dict) -> tuple[np.ndarray, np.ndarray]:
    """Для каждой строки: последние <=120 месяцев окна [start, end].

    Признаки шага: 8 каналов режима (0 если месяц не покрыт данными),
    флаг has_data, нормированное время до end. Паддинг слева, маска = месяцы
    раньше start (или за пределами 120).
    """
    n_feat = len(TS_CHANNELS) + 2
    X = np.zeros((len(df), MAX_MONTHS, n_feat), dtype=np.float32)
    pad_mask = np.ones((len(df), MAX_MONTHS), dtype=bool)  # True = паддинг

    start_m = df["start"].dt.to_period("M").astype("int64").to_numpy()
    end_m = df["end"].dt.to_period("M").astype("int64").to_numpy()
    ids = df["id"].to_numpy()

    for i in range(len(df)):
        seq_len = min(MAX_MONTHS, end_m[i] - start_m[i] + 1)
        months = np.arange(end_m[i] - seq_len + 1, end_m[i] + 1)
        offset = MAX_MONTHS - seq_len
        pad_mask[i, offset:] = False
        X[i, offset:, -1] = (end_m[i] - months) / MAX_MONTHS  # время до end

        pid = int(ids[i])
        if pid in ts_by_id:
            ts_months, ts_vals = ts_by_id[pid]
            idx = np.searchsorted(ts_months, months)
            idx_c = np.clip(idx, 0, len(ts_months) - 1)
            hit = ts_months[idx_c] == months
            rows = np.where(hit)[0]
            X[i, offset + rows, : len(TS_CHANNELS)] = ts_vals[idx_c[rows]]
            X[i, offset + rows, len(TS_CHANNELS)] = 1.0  # has_data
    return X, pad_mask


def build_static(df: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    feat_cols = [c for c in df.columns if c not in META_COLS]
    X = df[feat_cols].astype(np.float64).copy()
    X["kind_vtd2vtd"] = (df["kind"] == "vtd2vtd").astype(float)
    tr = X[df["split"].to_numpy() == "train"]
    med = tr.median()
    X = X.fillna(med)
    mu, sd = tr.fillna(med).mean(), tr.fillna(med).std().replace(0, 1.0)
    X = (X - mu) / sd
    return X.to_numpy(dtype=np.float32), list(X.columns)


# ---------------------------------------------------------------- model


class PipeTransformer(nn.Module):
    def __init__(self, ts_dim: int, static_dim: int):
        super().__init__()
        self.proj = nn.Linear(ts_dim, D_MODEL)
        self.pos = nn.Parameter(torch.zeros(1, MAX_MONTHS, D_MODEL))
        layer = nn.TransformerEncoderLayer(
            d_model=D_MODEL, nhead=N_HEAD, dim_feedforward=FF_DIM,
            dropout=DROPOUT, batch_first=True, norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=N_LAYERS)
        self.static_mlp = nn.Sequential(
            nn.Linear(static_dim, 64), nn.ReLU(), nn.Dropout(DROPOUT), nn.Linear(64, D_MODEL),
        )
        self.head = nn.Sequential(
            nn.Linear(2 * D_MODEL, 64), nn.ReLU(), nn.Dropout(DROPOUT), nn.Linear(64, 1),
        )

    def forward(self, seq, pad_mask, static):
        h = self.proj(seq) + self.pos
        h = self.encoder(h, src_key_padding_mask=pad_mask)
        valid = (~pad_mask).unsqueeze(-1).float()
        pooled = (h * valid).sum(1) / valid.sum(1).clamp(min=1.0)
        s = self.static_mlp(static)
        return self.head(torch.cat([pooled, s], dim=1)).squeeze(-1)


# ---------------------------------------------------------------- metrics


def pearson_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if np.std(y_pred) < 1e-8 or np.std(y_true) < 1e-8:
        return 0.0
    return float(np.corrcoef(y_true, y_pred)[0, 1] ** 2)


# ---------------------------------------------------------------- main


def main() -> None:
    set_seed(SEED)
    torch.set_num_threads(max(1, torch.get_num_threads()))

    df = pd.read_csv(DATA / "processed" / "train_dataset.csv", parse_dates=["start", "end"])
    ts_by_id = build_monthly_ts()
    seq, pad_mask = build_sequences(df, ts_by_id)
    static, feat_cols = build_static(df)
    y = df["y"].to_numpy(dtype=np.float32)
    split = df["split"].to_numpy()
    # нормализация таргета по train — без неё модель коллапсирует в константу
    y_mu = float(y[split == "train"].mean())
    y_sd = float(y[split == "train"].std())
    y_n = ((y - y_mu) / y_sd).astype(np.float32)

    cov = (seq[..., len(TS_CHANNELS)].sum(1) / (~pad_mask).sum(1))
    for s in ["train", "val_case1", "val_case2"]:
        m = split == s
        print(f"{s}: n={m.sum()}, покрытие окна рядами (median) = {np.median(cov[m]):.2f}")

    # внутренний val (выбор чекпойнта): GroupKFold по id, фолд ближе всего к 15% строк
    tr_all = np.where(split == "train")[0]
    groups = df["id"].to_numpy()[tr_all]
    folds = list(GroupKFold(n_splits=6).split(tr_all, groups=groups))
    fit_i, es_i = min(folds, key=lambda f: abs(len(f[1]) - 0.15 * len(tr_all)))
    fit_idx, es_idx = tr_all[fit_i], tr_all[es_i]
    print(f"fit: {len(fit_idx)} строк / {df['id'].iloc[fit_idx].nunique()} труб, "
          f"early-stop: {len(es_idx)} строк / {df['id'].iloc[es_idx].nunique()} труб")

    def tensors(idx):
        return (torch.from_numpy(seq[idx]), torch.from_numpy(pad_mask[idx]),
                torch.from_numpy(static[idx]), torch.from_numpy(y_n[idx]))

    train_dl = DataLoader(TensorDataset(*tensors(fit_idx)), batch_size=BATCH,
                          shuffle=True, generator=torch.Generator().manual_seed(SEED))
    es_t = tensors(es_idx)

    model = PipeTransformer(ts_dim=seq.shape[-1], static_dim=static.shape[-1])
    n_params = sum(p.numel() for p in model.parameters())
    print(f"параметров: {n_params:,}")

    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=MAX_EPOCHS, eta_min=1e-5)
    loss_fn = nn.L1Loss()

    best_val, best_state = float("inf"), None
    t0 = time.time()
    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        tot, n = 0.0, 0
        for sb, mb, xb, yb in train_dl:
            opt.zero_grad()
            loss = loss_fn(model(sb, mb, xb), yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot += loss.item() * len(yb)
            n += len(yb)
        sched.step()
        model.eval()
        with torch.no_grad():
            val_mae = loss_fn(model(es_t[0], es_t[1], es_t[2]), es_t[3]).item()
        print(f"epoch {epoch:2d}  train L1 {tot / n:.4f}  es L1 {val_mae:.4f}")
        if val_mae < best_val - 1e-4:
            best_val = val_mae
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
    train_time = time.time() - t0
    model.load_state_dict(best_state)

    # ---------------- оценка
    model.eval()
    results = {}
    preds_dump = []
    with torch.no_grad():
        for s in ["val_case1", "val_case2"]:
            idx = np.where(split == s)[0]
            st = tensors(idx)
            pred = model(st[0], st[1], st[2]).numpy() * y_sd + y_mu
            results[s] = {
                "r2": pearson_r2(y[idx], pred),
                "mae": float(np.mean(np.abs(y[idx] - pred))),
                "pred_std": float(np.std(pred)),
            }
            preds_dump.append(pd.DataFrame({
                "id": df["id"].iloc[idx], "segment_id": df["segment_id"].iloc[idx],
                "split": s, "y": y[idx], "pred": pred,
            }))

    pd.concat(preds_dump).to_csv(OUT / "val_predictions.csv", index=False)

    print("\n=== РЕЗУЛЬТАТЫ ===")
    print(f"параметров: {n_params:,}, время обучения: {train_time:.0f} c")
    for s, r in results.items():
        print(f"{s}: pearson r2 = {r['r2']:.3f}, MAE = {r['mae']:.3f} мм, std(pred) = {r['pred_std']:.3f}")
    print("\nбустинги для сравнения: val_case1 CatBoost r2=0.150 / ансамбль 0.134; "
          "val_case2 CatBoost 0.042 / ансамбль 0.043; MAE CatBoost 0.355 / 0.929 мм")


if __name__ == "__main__":
    main()
