# Deck plan: duppel

Status: draft. Updated 2026-11-15.
Rules: [AGENTS.md](AGENTS.md). Proofs: [pitch-evidence.md](pitch-evidence.md).

## 1. Regulation

| Item | Value | Source |
| --- | --- | --- |
| Talk | 5:00 (speech 4:40 plus 0:20 reserve) | `../brief/TASK.md`, p. 3 |
| Q&A | 3:00 | `../brief/TASK.md`, p. 3 |
| Slides | up to 10 by the brief; the user asked for 10 plus the final slide | `../brief/TASK.md`, p. 3; user, 2026-11-15 |
| Format | unknown: on site or online | open, ask the user |
| Demo | not inside the talk; 3D scenes of the product run in the deck | user, 2026-11-15 |
| Who switches slides | speaker | default |
| Screen | 1920x1080 | default |
| Deck language | ru | `../brief/PLATFORM.md` default |
| Deck file required by organizers | presentation as PDF, date unknown | `Критерии оценивания Nedra Digital PipeTwin.pdf` |

## 2. Criteria and slides

Four criteria scored 0 to 10 each, equal weight; extras count as a plus
(`Критерии оценивания Nedra Digital PipeTwin.pdf`).

| Criterion | Weight | Slides | Seconds | Proof shown on the slide |
| --- | ---: | --- | ---: | --- |
| result.csv format | 25 | 9 | 25 | result.csv node, 2000 rows by the integration test |
| Reproducible code | 25 | 9 | 25 | one-command pipeline, fixed seed |
| README | 25 | 9 | 25 | stages and cleaning assumptions named in the speech |
| Presentation and defense | 25 | all | 280 | 3D product scenes, measured numbers |
| Extra: forecast against fact, thickness profile | plus | 6, 10 | 60 | scatter plots, profile with P10 and P90 |
| Extra: top 10 % segments | plus | 6 | 25 | queue of 53 segments on pipe 1250022871 |
| Extra: uncertainty interval | plus | 6 | 25 | P10 and P90 band |
| Extra: approaches comparison | plus | 10 | 35 | four approaches by r2 |

## 3. End-to-end example

- **Input:** pipe 1250022871 Куст-1 - ДНС-1, 5.25 km, ILI 2018 and 2022, hidden ILI 2023-12-01.
- **Product output:** 525 segment forecasts, minimum 2.90 mm at segment 131, 53 segments in the queue.
- **Checked by hand:** values read from `result.csv`, `artifacts/uncertainty.csv` and
  `artifacts/top_risk_segments.csv` on 2026-11-15; the hidden ILI cannot be checked.
- **On slides:** 5 the gap between ILI 2018 and 2022; 6 the forecast and the queue; 1 and 11 the pipe name.
- **On the demo stand:** the same pipe opens at `/?pipe=1250022871`.

## 4. Slide list

| # | id | Title (thesis) | Criterion | Time | Cumulative |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | cover | Виртуальный датчик толщины стенки | defense | 0:15 | 0:15 |
| 2 | scale | scale of the pipeline network and failures | defense | 0:30 | 0:45 |
| 3 | cost | what a failure costs | defense | 0:30 | 1:15 |
| 4 | diagnostics | Снаряд раз в годы, датчик в точках | defense | 0:25 | 1:40 |
| 5 | methods | Между проверками стенку не видно | defense | 0:25 | 2:05 |
| 6 | sensor | Толщина стенки в каждом сегменте | extras | 0:25 | 2:30 |
| 7 | research | Коррозия снизу, память в прошлой ВТД | defense | 0:30 | 3:00 |
| 8 | features | Половина решения в прошлом пропуске | defense | 0:25 | 3:25 |
| 9 | architecture | Две модели, один конвейер | csv, code, README | 0:25 | 3:50 |
| 10 | quality | Точнее базовых подходов в обоих кейсах | extras | 0:35 | 4:25 |
| 11 | final | Готовы к вашим вопросам | defense | 0:15 | 4:40 |

Reserve: 0:20. Appendices: none yet.

## 5. Slide cards

Every 3D scene is the product's own engine from `frontend/src/features/material-pipe/engine`,
bundled by `npm run pipe3d`; added meshes use the same three.js build.

### 1. Cover
- **Visual:** logo assembly, the product's 3D pipe with oil fills from the side.
- **Key sentence:** a virtual wall thickness sensor for every ten metres.

### 2. Scale
- **Visual:** map of Russia from Natural Earth regions, main oil pipeline corridors drawn as a
  schematic, oil regions tinted, flow particles. Numbers wait for sourced facts.
- **TODO:** `[NEED TO CHECK]` length, failures per year, corrosion share with primary sources.

### 3. Cost
- **Visual:** the product's inspection scene: corrosion grows at the bottom, the wall opens, oil leaks.
- **TODO:** `[NEED TO CHECK]` failure cost, diagnostics cost, downtime losses with sources.

### 4. Diagnostics
- **Visual:** cutaway pipe, ILI tool with cups and a scanning ring travels inside and reveals the
  corrosion map; three UT probes pulse on top.
- **TODO:** `[NEED TO CHECK]` whether the chosen ILI type needs a flow stop.

### 5. Methods
- **Visual:** ILI and UT columns, timeline ILI 2018, unknown gap, ILI 2022, forecast date T.

### 6. Sensor
- **Visual:** 3D pipe with the real queue as a corrosion map, a sensor ring stops at segment 131;
  the forecast profile with P10 and P90 is aligned under the pipe.
- **[HONEST]:** P10 and P90 coverage is not measured.

### 7. Research
- **Visual:** 3D cross-section, defects settle on the bottom at 120 to 240 degrees; Spearman
  matrix on 690 pairs with previous ILI.

### 8. Features
- **Visual:** one 3D pipe split into sections by importance share; rejected features listed.

### 9. Architecture
- **Visual:** pipeline drawn as a pipe: six sources, DuckDB with 42 checks, segments, two models,
  result.csv with P10, P90 and the queue; data particles flow.

### 10. Quality
- **Visual:** forecast against fact for both cases, r2 ladder of four approaches.
- **[HONEST]:** strict case 2 validation gives r2 0.05; case 1 validation has 55 segments.

### 11. Final
- **Visual:** lockup, the same 3D pipe as the cover, QR to the repository.
- **TODO:** `[NEED TO CHECK]` add the stand QR when a public URL exists.

## 6. Organizer memo coverage

| Requirement (quote) | Where | Status |
| --- | --- | --- |
| «До 10 слайдов, 5 минут выступления, 3 минуты вопросов» | whole deck | 11 slides with the final, user decision |

## 7. Open markers

| Marker | Slide | What exactly | Owner | Due |
| --- | --- | --- | --- | --- |
| `[NEED TO CHECK]` | 2, 3 | sourced industry numbers | agent research | 2026-11-15 |
| `[NEED TO CHECK]` | 11 | public stand URL for the QR | team | before defense |
| `[NEED TO CHECK]` | 4, 5 | flow stop for ILI types | team | before defense |

## 8. Audit

Not run yet.
