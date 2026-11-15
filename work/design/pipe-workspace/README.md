# Текущий макет: версия55

Готовый экран: [preview.html](preview.html). Откройте через HTTP-сервер из корня репозитория:

```sh
python3 -m http.server 5188
```

Адрес: http://localhost:5188/work/design/pipe-workspace/preview.html

Пересобрать из авторских файлов:

```sh
python3 work/design/pipe-workspace/restore-preview.py
```

Результат: `.superdesign/tmp/fleet-workspace.html`. Three.js и часть шрифтов загружаются с CDN; требуется интернет. Снимок API хранится в `workspace-data.json`.

Актуальные сценарии: [светлая тема](light-theme.md), [связанная развёртка](unroll-surface.md).
Чат закреплён сбоку, перемещается влево/вправо, меняет ширину; при открытии скрывает метрики.
Ниже сохранена история ранних версий, её описание поведения не заменяет текущий макет.

---

# Труба в центре рабочего пространства

2026-11-15, Superdesign v22. Это тестовый макет; frontend/backend на18080 не менялись.

[Открыть участок131](https://p.superdesign.dev/draft/bb359787-3a52-4d3a-8d5c-9fdb45a59603#pipe=1250022871&segment=131)

## Что перенесено

- Центральная3D-сцена с вращением, разрезом, текущим маркером и волнами нефти от жеста.
- Метрики выбранных10м слева: минимум, номинал, квантили, база ВТД, горизонт, приоритет.
- Раскрываемая очередь53/148участков, группировка, порядок по расстоянию/приоритету.
- График прогноза и P10/P90, историческая база ВТД/номинал, рельеф под сценой.
- Выбор по очереди, графику, развёртке, расстоянию; оба трубопровода.
- История ВТД, все признаки с медианами и глобальной важностью, паспорт и источники.
- CSV всей трубы или очереди.
- Чат поверх правой части сцены без изменения её ширины; мобильный полноэкранный режим,
  фокус, Escape, сохранение черновика/сообщений в пределах сессии по каждой трубе.

## Источники и границы

Изучен http://localhost:18080/?view=route&segment=1273.
У первой трубы1273 отсутствует; приложение показывает131,1310–1320м,2.898мм.
Взяты реальные ответы pipes, profile и segment-details для всех2000 сегментов.
Снимок4758af03febd встроен с gzip/base64; все значения сверены на полное равенство
с сохранёнными ответами API. В отличие от production, макет не обновляет данные с сервера.

OpenAPI работающего backend18010 не содержит assistant/chat endpoint.
Макет не отправляет вопрос серверу и не генерирует ответ: сохраняет вопрос и показывает
состояние отсутствующего подключения. Это перенос интерфейса чата, не реализация агента.
Форма трубы/нефти и волны иллюстративные. Развёртка показывает данные вдоль трубы,
не выдумывает измеренную толщину по углу окружности.

## Проверка

27 проверок опубликованного макета в verification.json: обе трубы,2000 сегментов,
точность выборочных значений относительно исходного API, очередь/группы, произвольное
расстояние, историческая база, полный профиль, keyboard/click выбор, разрез/развёртка,
CSV525строк, чат/черновик/Escape/focus,375px без overflow, reduced motion, ошибок JS нет.
После финального удаления повторяющейся подсказки чата дополнительно проверено:
все три кнопки вопросов помещаются в видимую область, снимок данных побайтно эквивалентен
после декодирования, версия22 повторно получена из Superdesign.

Снимки published-desktop.png, published-chat.png, published-mobile.png,
published-mobile-chat.png. Source-workspace.png исходного UI лежит в ../fleet-concept/.
Вращение на опубликованном макете: возбуждение волн0.22041, через500мс0.14208.
Impeccable layout detector: []. Первый проход нашёл отступ раскрываемых данных — исправлен.
Найдены и исправлены: фокус чата до появления слоя, шаг10м у поля расстояния,
недостаточный контраст активного масштаба, обрезка третьей кнопки вопроса.

## Критерии завершения цели

| Требование | Доказательство |
|---|---|
| Труба в центре | published-desktop.png: центральная сцена, метрики слева |
| Чат справа поверх трубы | published-chat.png; тест неизменной ширины canvas |
| Графики снизу | оба графика в published-desktop.png; данные profile API |
| Перенос данных18080 |2000details, оба профиля, равенство декодированного снимка исходнику |
| Согласованный дизайн | Manrope/IBM Plex Mono, прежний логотип/материал трубы; desktop/mobile |
| Сохранение работы с трубой | вращение/затухание волн, разрез, развёртка, сброс, увеличение |
| Пока тестируем | только Superdesign; git diff frontend/backend пуст |

Исходные части макета сохранены рядом: workspace.html/css/js и build-workspace.py.
Сборщик использует промежуточные файлы .superdesign/tmp; готовый документ можно получить
командой get-design для draft bb359787-3a52-4d3a-8d5c-9fdb45a59603.
Исходная формулировка пользователя — user-request.txt; схема экрана — spec.md.

Версия23: компактная шапка со стрелкой возврата, названием24px, метаданными ниже.
Верхняя граница сцены поднята примерно на70px при1440px. Локальные desktop/mobile
проверены без overflow/ошибок. Готовый HTML повторно получен из Superdesign.

Версия25: поле расстояния заменено номером участка по прямой просьбе пользователя.
Через850мс после ввода либо по Enter запускается подход к нижней стенке, очаг коррозии,
приближение, раскрытие отверстия и струя нефти. К4.3с достигнута фаза истечения.
Это помеченная иллюстрация, а не обнаруженная/предсказанная авария. Кнопка Завершить
возвращает камеру; повторный ввод перезапускает последовательность, неверный ID
показывает ошибку. Проверены129/130, автоматический запуск, Enter, reset,375px, GL/JS без ошибок.
Первый shader не скомпилировался из-за зарезервированного patch; заменён corrosionMask
до импорта. Снимки inspection-corrosion.png, inspection-leak.png, inspection-mobile.png.
Добавлены inspection-scene.js и add-inspection.py; сборщик вызывает последний автоматически.

## v26 — gravity and scene alignment

Oil free surface follows world gravity transformed into the rotating pipe frame. A 32-slice volume estimate preserves fill while inclination redistributes the fluid; orientation relaxes over time and gesture impulses excite damped waves. This is a visual approximation, not a fluid solver. Camera fits the rotated object outside the deliberate inspection zoom. Bottom-wall corrosion is an irregular procedural patina with pits at the selected illustrative defect; rupture still requires the inspection sequence. Removed all three scene captions and aligned analysis to the scene column.

Validated locally at1440/375: no JS/GL errors or horizontal overflow, captions absent, local gravity vector changes under drag; inspection reaches leak and resets. Evidence: gravity-desktop.png, gravity-rotated.png, gravity-mobile.png, inspection-corrosion.png. Source assembly now also runs refine-fluid.py. Production unchanged.

## v27 — underside overview and continuous discharge

Inspection holds a whole-pipe underside view before zooming to the selected location. A 2048-pixel mask maps every priority segment from API rows onto the lower wall; neighboring locations dim during focus. These are illustrative depictions of shortlisted thickness forecasts, not measured corrosion shapes. Selected hole reduced and edge subdued. Replaced shader rope with a continuously deforming tapered mesh, gravity-aligned discharge, advected bulges and falling droplets; subdued standard-material reflections. Continuous interior flow enabled and pause control removed. Reset and rotation remain available. Local desktop/mobile checks: leak reached, reset works, no GL/JS errors, no overflow. Published and retrieved v27. Production unchanged.

## v28 — clean entry and neutral status

Pipe entry starts with blank input and no segment metrics, graphs or selected marker. Entering a valid ID reveals metrics and starts inspection. Clearing input resets entry; chat scope remains whole-pipe until selection. Previous segment hash no longer preselects on entry. Corrosion uniforms default to zero and reset to zero, appearing only within the explicit inspection timeline. Status and form controls use neutral graphite. Verified at1440/375: blank entry, input121→metrics→leak, reset and clear, no JS/GL errors or overflow. Evidence entry-empty.png, entry-selected.png, entry-mobile.png. Published v28; production unchanged.

## v29 — consistent oil material

Discharge and droplets now reuse interior oilFragment shader, palette and reflection response instead of a separate standard material. Flow uniforms synchronized. Local entry, inspection, reset and mobile checks passed with no GL/JS errors. Published v29.

## v30 — edge inspection and interrupted camera

Root causes: schematic endpoint mapped beneath flange; pointerdown cleared inspection so ordinary camera fitting replaced inspection zoom. Map segment positions consistently into clear barrel span[-4.4,4.4]. Preserve inspection state on drag, releasing camera choreography while retaining discharge animation. Oil starts inside wall and follows outlet normal into gravity, with rounded meniscus covering open mesh rim. Geometry remains illustrative. Edge segments0/524 checked; zoom stays2.7 on drag, no GL/JS errors. Evidence edge-0.png and edge-524.png.

## v32 — direct scene navigation

Wheel and pinch zoom toward pointer/midpoint, bounded0.35–6; camera damping18/s (immediate under reduced motion). Drag rotates, Shift/middle drag pans, two fingers pan and zoom. Buttons± and keyboard±/0 supported; arrows rotate, Shift+arrows pan. Manual interaction preserves current camera and interrupts inspection camera animation without stopping discharge. Reset returns auto fit. Source scene-controls.js injected by add-controls.py. Verified wheel persistence, buttons, pan, reset and real CDP touch pinch (zoom0.956→1.554);375px no overflow, no GL/JS errors. Production unchanged.

## v33 — full-width entry and right metrics

Initial clean pipe spans scene width; entry form moved above scene with actual segment ID bounds as placeholder (0–524 or0–1474). Selection reveals right-side metrics rail; graphs align to scene on left. Mobile stacks metrics below. Desktop/mobile entry→selection→inspection→clear passed without GL/JS errors/overflow. Source snapshots entry-empty/selected/mobile.png. v32 navigation preserved.

## v34 — input inside scene

Moved segment form into stage upper-left overlay; removed separate row above toolbar. Input does not propagate gestures to canvas sibling. Range placeholder retained; selected caption moved below input. Desktop/mobile entry→inspection→clear verified without errors/overflow.
