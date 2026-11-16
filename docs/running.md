# Запуск

Нужны Docker и Docker Compose v2. Платные ключи и GPU не нужны. Команды выполняются из корня
репозитория.

**Читайте, если** поднимаете стенд или работаете с кодом · **Связано:**
[Архитектура](architecture.md) · [Данные](data-contract.md) · [Безопасность](security.md)

---

## Как поднять стенд?

```bash
docker compose up --build -d --wait
```

Compose собирает три образа и запускает их по очереди:

| Сервис | Что делает | Порт |
| --- | --- | --- |
| `pipeline` | Читает `data/*.csv`, строит хранилище, признаки, модели и прогноз, пишет результат в том `results` и завершается | — |
| `backend` | FastAPI: загружает снимок из тома `results`, проверяет его полноту и отдаёт API | `127.0.0.1:8000` |
| `frontend` | Nginx: раздаёт интерфейс и проксирует `/api/` в backend | `127.0.0.1:8080` |

Первый запуск занимает несколько минут: сборка образов и около минуты на конвейер. Затем откройте
**http://localhost:8080**. Интерактивная схема API: http://localhost:8000/docs.

Результаты лежат в томе `results` и при повторных запусках не пересчитываются.

```bash
docker compose ps
curl --fail http://localhost:8080/api/v1/ready
docker compose logs --tail=50 pipeline
```

`/health` проверяет процесс, `/ready` проверяет загруженный снимок; healthcheck Compose
использует `/ready`.

## Как пересчитать прогноз?

```bash
docker compose run --rm pipeline python -m pipetwin
docker compose restart backend
```

Backend читает снимок при старте, поэтому после пересчёта его нужно перезапустить.
Конвейер детерминирован: seed 42, версии библиотек закреплены в `ml/uv.lock`, повторный запуск
даёт тот же `result.csv` байт в байт.

Забрать прогноз из тома:

```bash
docker compose cp backend:/data/result.csv ./result.csv
```

## Какие настройки есть?

Скопируйте `.env.example` в `.env` и меняйте нужные значения.

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `duppel` | Имя проекта Compose, образов и томов |
| `FRONTEND_PORT`, `BACKEND_PORT` | `8080`, `8000` | Порты на `127.0.0.1` |
| `LLM` | `false` | `true` ставит в образ backend библиотеки LLM-помощника |
| `LANGUAGE_MODEL` | `none` | `codex` включает исследовательский режим помощника |
| `DECISION_MODEL` | `lexical` | Классификатор запросов помощника; `system_one` — внешний HTTP-сервис |
| `SITE_URL` | пусто | Публичный адрес для мета-тегов интерфейса |

Без LLM помощник отвечает сводкой по выбранному сегменту. Как подключить модель:
[помощник](assistant.md#как-включить-модель).

## Как работать без контейнеров?

Нужны [uv](https://docs.astral.sh/uv/) и Node.js 22.18 или новее; Python 3.12 uv поставит сам.

```bash
cd ml && uv sync && uv run python -m pipetwin && cd ..
```

Конвейер пишет `result.csv`, `artifacts/`, `warehouse/`, `data/processed/` и `chart_data.json`
в корень репозитория. В отдельных терминалах:

```bash
cd backend && uv sync && uv run uvicorn app.main:create_app --factory --port 8000
```

```bash
cd frontend && npm ci && npm run dev
```

Интерфейс откроется на http://localhost:5173; Vite направляет `/api/` на `localhost:8000`,
другой адрес задаётся `API_URL`. Backend читает файлы из `DATA_ROOT`, по умолчанию из корня
репозитория.

## Как проверить изменения?

```bash
cd ml && uv run pytest && uv run ruff check src tests warehouse
```

```bash
cd backend && uv run ruff check . && uv run mypy . && uv run pytest
```

```bash
cd frontend && npm run verify
```

Тесты backend читают настоящие результаты конвейера, поэтому сначала нужен локальный
`python -m pipetwin`. На Windows запускайте Python-проверки с `PYTHONUTF8=1`. Браузерные сценарии требуют запущенного стенда:

```bash
cd frontend
npx playwright install chromium
E2E_BASE_URL=http://localhost:8080 npm run e2e
```

---

<sub>[Документация](README.md) · [README проекта](../README.md)</sub>
