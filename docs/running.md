# Как запустить продукт

Для просмотра нужны Docker с Compose и Buildx, готовые файлы из [контракта данных](data-contract.md), включая `chart_data.json` и исторический `train_dataset.csv`.
Платные ключи и обучение не нужны. Команды выполняются из корня репозитория.

## Как поднять стенд?

```bash
docker buildx bake
BACKEND_PORT=18010 FRONTEND_PORT=18080 docker compose up -d --wait
```

Откройте http://localhost:18080. API: http://localhost:18010/docs.
Выбранные порты позволяют держать локальный dev-сервер отдельно. Без переменных используются 8000 и 8080.
Compose подключает DuckDB, признаки, артефакты и результат в `/data` только для чтения.
Backend работает непривилегированным пользователем. Nginx проксирует `/api/` и поддерживает прямые ссылки SPA.

```bash
BACKEND_PORT=18010 FRONTEND_PORT=18080 docker compose ps
curl --fail http://localhost:18080/api/v1/ready
BACKEND_PORT=18010 FRONTEND_PORT=18080 docker compose restart
```

`/health` проверяет процесс, `/ready` проверяет загруженный снимок. Healthcheck Compose использует readiness.
При изменении исходных файлов перезапустите backend: снимок читается при старте, не на каждый запрос.
Для остановки используйте `docker compose down`; исходные данные остаются в репозитории.

## Как работать без контейнеров?

В отдельных терминалах:

```bash
cd backend
uv sync
uv run uvicorn app.main:create_app --factory --port 8000
```

```bash
cd frontend
npm ci
npm run dev -- --port 5179
```

Откройте http://localhost:5179. Vite направляет `/api/` на localhost:8000;
другой адрес задаётся `API_URL`. Backend принимает `DATA_ROOT`, по умолчанию корень репозитория.
Данные не попадают во frontend bundle.

## Как проверить изменения?

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest tests/unit
uv run pytest tests/integration
```

```bash
cd frontend
npm run verify
npm run api:types
E2E_BASE_URL=http://localhost:18080 npx playwright test e2e/product.spec.ts
```

Интеграционные тесты читают настоящие DuckDB/CSV. Браузерные тесты требуют запущенного backend.
Для первого запуска Playwright установите Chromium: `npx playwright install chromium`.
Обучение и подготовка описаны отдельно в [README ML](../README-ML.md);
`run_all.py` перезаписывает артефакты, поэтому для проверки готового сайта он не нужен.

---

<sub>[Документация](README.md) · [README проекта](../README.md)</sub>

## Отдельный стенд рабочего фронта

```bash
COMPOSE_PROJECT_NAME=duppel-live docker buildx bake
COMPOSE_PROJECT_NAME=duppel-live BACKEND_PORT=18012 FRONTEND_PORT=18081 docker compose up -d --wait
```

Рабочее приложение: http://localhost:18081. Это React со своим API и реальными данными,
не HTML-превью. После изменения фронта пересоберите образ и повторите `compose up`.
Для разработки с горячим обновлением можно направить Vite на API этого стенда:

```bash
cd frontend
API_URL=http://localhost:18012 npm run dev -- --port 5191 --strictPort
```
