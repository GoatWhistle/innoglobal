# API

HTTP API на FastAPI. Прогноз и данные только читаются; запись есть лишь у помощника
(артефакты и версии дашбордов). Авторизации нет, см. [безопасность](security.md).
Полные схемы ответов и параметров — в `/openapi.json` и интерактивном `/docs` backend.
Типы frontend генерируются командой `cd frontend && npm run api:types`.

`POST /api/v1/assistant` принимает `prompt`, `context` и необязательную `history`.
Контекст содержит `pipe_id,segment_id,snapshot_id,target_date`, необязательные
`comparison_date,scope,from_m,to_m`. Ответ — `application/x-ndjson`, одна запись на строку.
Каждая запись содержит `type,text,code,actions,values`; типы событий:
`status,evidence,delta,done,error`. После начала потока сбои передаются событием `error`
без `done`; до его начала неверный контекст получает 422. Неизвестная труба или сегмент — 404,
неготовый снимок — 503. Ответы не кэшируются. [Режимы и лимиты](assistant.md).

## Какие запросы доступны?

Все пути ниже начинаются с `/api/v1`.

| GET | Результат |
| --- | --- |
| `/health` | Состояние процесса |
| `/ready` | `ready,snapshot_id,issues`; 503 при неготовом снимке |
| `/pipes` | `snapshot_id,items`: паспорта целевых труб, сценарии, даты, сводки и обследования |
| `/pipes/{pipe_id}` | Один паспорт и сводка прогноза |
| `/pipes/{pipe_id}/profile` | `snapshot_id,pipe_id,nominal_wall_mm,run_dates,rows`: весь профиль |
| `/pipes/{pipe_id}/segments` | `total,offset,limit,items`: фильтрованные сегменты |
| `/pipes/{pipe_id}/segments/{segment_id}` | Сегмент, доступные наблюдения, признаки, соседние номера |
| `/pipes/{pipe_id}/priorities` | Отобранные первые 10% и правило отбора |
| `/pipes/{pipe_id}/priorities.csv` | Ранжированный CSV выбранной трубы |
| `/network` | Реальные трассы и идентификатор снимка |
| `/data-quality` | Проверки, карантин, количества строк слоёв, режимы и обследования |
| `/model/validation` | Исторические метрики, разбиения, пары «прогноз — факт», глобальная важность, квантили |
| `/exports/result.csv` | Прогноз всех целевых труб, `id,segment_id,thickness_pred` |

`segments` принимает `from_m,to_m ≥ 0`, `priority_only`, `sort`, `descending`, `offset ≥ 0`,
`limit` от 1 до 500. Значения `sort` перечислены в OpenAPI. Перевёрнутый диапазон отклоняется.
Все толщины в мм, расстояния в м. Даты ISO 8601. Неизвестное значение: JSON `null`.
Семантика сегментов и ранжирования описана в [контракте данных](data-contract.md).

## Что отдаёт помощник?

| Метод и путь | Результат |
| --- | --- |
| `POST /assistant` | Поток NDJSON событий ответа |
| `GET /assistant/artifacts/{artifact_id}` | Описание таблицы или графика, построенного помощником |
| `GET /assistant/artifacts/{artifact_id}/rows` | Строки таблицы-артефакта с пагинацией |
| `GET /assistant/dashboards` | Сохранённые дашборды помощника |
| `POST /assistant/dashboards/{artifact_id}/refresh` | Новая версия дашборда: запросы повторяются без модели |
| `GET /assistant/dashboards/{artifact_id}/versions` | История версий дашборда |

## Как сообщается ошибка?

Ответ содержит `code,message`. Интерфейс выбирает русский текст по `code` или HTTP-классу,
не показывает технический `message` пользователю.

| Статус | Код | Причина |
| --- | --- | --- |
| 404 | `pipe_not_found` | Труба не является целевой |
| 404 | `segment_not_found` | Сегмент вне сетки трубы |
| 422 | `invalid_range` | Неверный диапазон |
| 422 | `validation_error` | Неверный тип или граница параметра |
| 503 | `data_unavailable` | Снимок не загружен или отклонён |

CSV выдаётся как вложение. Экспорт результата сохраняет порядок и точность исходного файла;
заголовок `X-Snapshot-Id` связывает его с обслуживаемым снимком.

`comparisons` отделены от метрик выбранной модели. Согласованная серия имеет статус `available`,
идентифицированные точки и пересчитанные r²/MAE. При расхождении с историческим разбиением
статус `source_mismatch`, точки пусты, обе метрики `null`. Поля `source` и `source_samples`
показывают происхождение и размер архивной серии. Правила сверки: [контракт данных](data-contract.md).

---

<sub>[Документация](README.md) · [README проекта](../README.md)</sub>
