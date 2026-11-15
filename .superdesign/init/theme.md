# Theme
React 19, Vite, TypeScript, CSS Modules, own components, Onest. Graphite and paper themes; amber priorities.
---
name: "duppel"
description: "Рабочее пространство для исследования прогноза толщины стенки"
---

# Design System: duppel

## Overview

**Creative North Star: "Физическая труба и инженерные данные"**

Металл, нефть, направленный свет и ясный силуэт трубы задают характер интерфейса.
Superlative определяет постановку объекта и точность структуры; monopo определяет
пространственную связность режимов. Исходная модель трубы сохранена.

Тёплый графит и инженерная бумага образуют равноправные темы. Тонкие разделители
организуют данные вокруг объекта. Onest, марка duppel и русский интерфейс сохраняются.

**Key Characteristics:**
- Физическая труба связана с профилем и данными выбранного участка.
- Типографика и разделители задают иерархию.
- Выбор участка мгновенный; смена режима сохраняет пространственную связь.
- Измерение, прогноз и иллюстрация имеют собственные подписи.

Визуальные значения определены только в `src/shared/styles/tokens/`; здесь описаны их роли.
Композиция закреплена в `../work/screens/material-workspace.md`, компоненты в `COMPONENTS.md`.
Исходный каталог `../work/design/ds/` сохранён без изменений.

## Colors

| Роль | Токены | Применение |
|---|---|---|
| Поверхности | `--surface-base`, `--surface-raised`, `--surface-sunken`, `--surface-float` | рабочее поле, данные, поля и наложения |
| Текст | `--text-primary`, `--text-secondary`, `--text-muted` | значение, контекст, вспомогательная подпись |
| Структура | `--border-subtle`, `--border-control`, `--border-ink` | разделители, органы управления, отметки |
| Действие | `--action-primary`, `--action-primary-text`, `--surface-selected` | действия и выбор |
| Приоритет | `--status-warning`, `--text-warning` | подписанный приоритет проверки |
| Ошибка | `--status-danger`, `--text-danger` | ошибка или предоставленный нарушенный критерий |
| Сцена | `--scene-void`, `--scene-crude`, `--wall-steel`, `--wall-rust`, `--wall-amber` | фон, нефть и относительная шкала стенки |
| Фокус | `--focus-ring`, `--focus-ring-width`, `--focus-ring-offset` | контур клавиатурного фокуса |

Шкала стенки рассчитывается по всей трубе и не меняется при увеличении профиля.
Цвет приоритета не устанавливает безопасность или вероятность отказа. Прогноз нейтральный,
ВТД использует `--wall-rust`, номинал обозначен пунктиром. Интервал использует
`--surface-range` и видимую границу. Цветовое кодирование сопровождается подписями.

## Typography

Onest через `--font-sans` используется для заголовков, текста и измерений.
`--font-mono` относится к коду; зарезервированный `--font-accent` в рабочем пространстве не нужен.
Шрифт интерфейса не заменяет утверждённые контуры wordmark из `../docs/brand/`.

Иерархия использует `--font-size-heading`, `--font-size-subheading`, `--font-size-body-sm`,
`--font-size-caption` и соответствующие `--line-height-*`. Показания используют
`--font-size-readout`, `--font-size-readout-sm`, `--weight-light` и `--font-numeric`.
Единица измерения остаётся рядом со значением, источник и дата рядом с контекстом.
Числа форматируются средствами локали и обновляются без счётчика-анимации.

## Layout

Рабочая область занимает доступную ширину. Отступы используют `--space-page`,
`--space-page-wide`, `--space-section` и шкалу `--space-*`; `--prose-measure` ограничивает прозу.
Широкая композиция объединяет очередь `--nav-width`, гибкий центр со сценой и профилем,
а также данные участка `--scanner-panel`. Верхняя строка связывает трубу, участок и даты.

При первом сужении очередь открывается в `Drawer`, данные используют `--scanner-panel-min`.
На телефоне краткая сводка предшествует сцене, за ней идут профиль и подробные данные.
Пороги синхронизированы в WorkspaceFrame и Inspection. Высота сцены задана
`--pipe-scene` и `--pipe-scene-mobile`; список очереди прокручивается в ScrollArea.

Страницы Data и Model используют те же разделители и таблицы. На узком экране имя
выбранной модели занимает полную строку; длинные действия переносятся внутри своей колонки.

## Elevation & Depth

Основные поверхности плоские; глубину интерфейса задают тон и разделители.
`Card appearance="ruled"` прозрачен и отделён верхней линией; `plain` убирает обрамление.
`--shadow-float` относится к плавающим элементам, `--surface-scrim` отделяет модальный Drawer.
Глубина трубы создаётся освещением, отражениями и материалами. Светлая тема сохраняет
объёмный металл и нефть на бумажном поле.

## Shapes

Структурные поверхности используют `--radius-none`, органы управления `--radius-control`.
Линии используют `--hairline`, чертёжные контуры `--ink-weight-*`.
Сканирующее кольцо, выноска и размерные отметки обозначают положение или данные.

## Components

- **Button, Select, NumberField, RangeField:** общие состояния, видимый фокус,
  цель касания `--target-min`. Hover применяется для точного указателя.
- **Navigation:** текст с собственными иконками, активная ссылка `--surface-selected`.
  На телефоне навигация занимает отдельную строку с горизонтальной прокруткой.
- **PipeScene:** трасса, развёртка и сечение сохраняют выбранный участок.
  Схематичность угловой геометрии подписана внутри сцены.
- **Выбор:** сцена, профиль, координата и очередь используют одно состояние из URL.
  Выбор участка и показания обновляются сразу, в том числе внутри сечения.
- **Движение:** смена режима использует `--dur-scene-long` и `--dur-scene-cut`.
  Прерванный переход продолжается из видимого положения. Клавиатура и reduced motion
  переключают режим сразу; reduced motion останавливает движение нефти.
- **ComparisonPanel:** база и прогноз используют одну ось расстояния; дополнительные
  режимы открываются в Disclosure. Пропуски измерений сохраняются.
- **PriorityQueue:** ранги API показаны списком или смежными группами. Выбор группы
  открывает участок с лучшим рангом; CSV сохраняет строки участков выбранной трубы.
- **SegmentFacts и SegmentEvidence:** прогноз, база, разность и интервал подписаны отдельно.
  Значение признака, медиана трубы и глобальная важность не смешиваются.
- **Drawer:** общий модальный примитив, фокус на заголовке, Escape и возврат фокуса.
  Открытие и закрытие используют `--transition-drawer` и `--transition-drawer-close`.
- **Состояния:** QueryView, NoValue, EmptyState и ErrorState отражают ответы API.
  При отказе WebGL резервные Canvas2D/SVG сохраняют выбор и численные данные.

## Do's and Don'ts

### Do:
- Сохраняйте физическую трубу, Onest, бренд duppel и обе темы.
- Связывайте объект, профиль и данные одним выбранным участком.
- Используйте семантические токены и общие примитивы.
- Оставляйте даты, единицы, источники и ограничения рядом с данными.

### Don't:
- Не превращайте относительный приоритет в аварийность или порог безопасности.
- Не представляйте угловую иллюстрацию как измеренную карту дефекта.
- Не задерживайте выбор и обновление чисел ради анимации.
- Не добавляйте декоративные градиенты, свечение, стеклянные панели или сетку несвязанных KPI.

## frontend/src/shared/styles/tokens/elevation.css

```css
:root {
  --layer-raised: 1;
  --layer-sticky: 10;
  --layer-popover: 40;
  --layer-dialog: 50;
  --layer-toast: 55;
  --layer-tooltip: 60;
  --layer-skip-link: 70;

  --shadow-ring: inset 0 0 0 var(--hairline) var(--border-strong);
  --shadow-raised: inset 0 0 0 var(--hairline) var(--border-strong), 0 1px 2px var(--shadow-near);
  --shadow-sheen: inset 0 var(--hairline) 0 var(--sheen);
  --shadow-float:
    inset 0 var(--hairline) 0 var(--sheen), 0 0 0 var(--hairline) var(--border-strong),
    0 2px 4px var(--shadow-near), 0 16px 40px -8px var(--shadow-color);

  --opacity-stale: 0.55;
}

:root {
  --shadow-sheet: var(--shadow-sheen);
  --matte-blur: 14px;
  --shadow-camera: 0 3px 0 var(--border-ink);
  --shadow-camera-on: 0 1px 0 var(--border-ink);
}

```

## frontend/src/shared/styles/tokens/keyframes.css

```css
@keyframes kf-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes kf-fade-out {
  to {
    opacity: 0;
  }
}

@keyframes kf-scale-in {
  from {
    opacity: 0;
    transform: translateY(var(--shift-anchor)) scale(var(--enter-scale));
  }
}

@keyframes kf-scale-out {
  to {
    opacity: 0;
    transform: scale(var(--enter-scale));
  }
}

@keyframes kf-rise-in {
  from {
    opacity: 0;
    transform: translateY(var(--shift-rise));
  }
}

@keyframes kf-swap-out {
  to {
    opacity: 0;
    filter: blur(var(--blur-soft));
    transform: translateY(calc(var(--shift-rise) * -1));
  }
}

@keyframes kf-swap-in {
  from {
    opacity: 0;
    filter: blur(var(--blur-soft));
    transform: translateY(var(--shift-rise));
  }
}

@keyframes kf-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes kf-shimmer {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

@keyframes kf-alarm {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.35;
    transform: scale(0.96);
  }
}

@keyframes kf-reveal {
  from {
    opacity: 0;
    clip-path: inset(0 0 100% 0);
    transform: translateY(var(--shift-rise));
  }
}

@keyframes kf-toast-in {
  from {
    opacity: 0;
    transform: translateX(var(--space-24));
  }
}

@keyframes kf-toast-out {
  to {
    opacity: 0;
    transform: translateX(var(--space-16)) scale(var(--enter-scale));
  }
}

@keyframes kf-indeterminate {
  from {
    transform: translateX(-100%) scaleX(0.4);
  }

  to {
    transform: translateX(250%) scaleX(0.4);
  }
}

@keyframes kf-countdown {
  to {
    transform: scaleX(0);
  }
}

@keyframes kf-brand-base-in {
  from {
    opacity: 0;
    transform: translateY(calc(var(--shift-brand-align) * -1));
  }
}

@keyframes kf-brand-drop-in {
  from {
    transform: translateY(calc(var(--shift-brand-align) * -1));
  }
}

@keyframes kf-brand-busy {
  from {
    transform: translateY(calc(var(--shift-brand-align) * -1));
  }

  to {
    transform: translateY(0);
  }
}

```

## frontend/src/shared/styles/tokens/motion.css

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-linear: linear;
  --ease-viscous: cubic-bezier(0.19, 1, 0.22, 1);

  --dur-instant: 80ms;
  --dur-press: 140ms;
  --dur-fast: 160ms;
  --dur-fast-exit: 110ms;
  --dur-base: 200ms;
  --dur-exit: 140ms;
  --dur-panel: 260ms;
  --dur-slow: 320ms;
  --dur-draw: 900ms;
  --dur-spin: 800ms;
  --dur-breathe: 2400ms;
  --dur-scene-cut: 1000ms;
  --dur-scene: 800ms;
  --dur-scene-long: 1250ms;
  --dur-alarm: 1600ms;
  --dur-indeterminate: 1400ms;
  --delay-tooltip: 500ms;
  --window-tooltip-skip: 400ms;
  --timeout-toast: 5000ms;
  --timeout-toast-error: 10000ms;

  --stagger: 40ms;
  --press-scale: 0.97;
  --press-scale-surface: 0.99;
  --enter-scale: 0.95;
  --shift-rise: 6px;
  --shift-anchor: 4px;
  --blur-soft: 2px;
  --shift-brand-align: 7px;

  --delay-skeleton: 200ms;
  --hold-skeleton: 300ms;
  --delay-spinner: 400ms;
  --reduced-fade: 160ms;
  --reduced-fade-exit: 110ms;
  --view-transition-limit: 900ms;
  --delay-brand-accent: calc(var(--dur-scene) * 0.4);
  --delay-brand-drop: var(--dur-scene);

  --transition-control:
    background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out), scale var(--dur-instant) var(--ease-out);
  --transition-control-press:
    background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out), scale var(--dur-press) var(--ease-out);
  --transition-choice: scale var(--dur-instant) var(--ease-out);
  --transition-choice-press: scale var(--dur-press) var(--ease-out);
  --transition-fade: opacity var(--dur-base) var(--ease-out);
  --transition-brand-drop: transform var(--dur-scene-long) var(--ease-viscous);
  --transition-brand-rise: transform var(--dur-scene) var(--ease-viscous);

  --transition-drawer:
    transform var(--dur-panel) var(--ease-drawer), opacity var(--dur-panel) var(--ease-out);
  --transition-drawer-close:
    transform var(--dur-exit) var(--ease-out), opacity var(--dur-exit) var(--ease-out);
  --motion-fade-in: kf-fade-in var(--dur-base) var(--ease-out) both;
  --motion-fade-out: kf-fade-out var(--dur-exit) var(--ease-out) both;
  --motion-scale-in: kf-scale-in var(--dur-base) var(--ease-out) both;
  --motion-scale-out: kf-scale-out var(--dur-exit) var(--ease-out) both;
  --motion-rise-in: kf-rise-in var(--dur-slow) var(--ease-out) both;
  --motion-swap-in: kf-swap-in var(--dur-fast) var(--ease-out) both;
  --motion-swap-out: kf-swap-out var(--dur-fast-exit) var(--ease-out) both;
  --motion-spin: kf-spin var(--dur-spin) var(--ease-linear) infinite;
  --motion-shimmer: kf-shimmer var(--dur-breathe) var(--ease-in-out) infinite;
  --motion-alarm: none;
  --motion-reveal: kf-reveal var(--dur-scene) var(--ease-viscous) both;
  --motion-toast-in: kf-toast-in var(--dur-slow) var(--ease-out) both;
  --motion-toast-out: kf-toast-out var(--dur-exit) var(--ease-out) both;
  --motion-indeterminate: kf-indeterminate var(--dur-indeterminate) var(--ease-in-out) infinite;
  --motion-countdown: kf-countdown var(--timeout-toast) var(--ease-linear) both;
  --motion-brand-base-in: kf-brand-base-in var(--dur-scene) var(--ease-viscous) both;
  --motion-brand-accent-in: kf-fade-in var(--dur-scene) var(--ease-out) var(--delay-brand-accent)
    both;
  --motion-brand-drop-in: kf-brand-drop-in var(--dur-scene-long) var(--ease-viscous)
    var(--delay-brand-drop) both;
  --motion-brand-busy: kf-brand-busy var(--dur-scene) var(--ease-in-out) infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-instant: 1ms;
    --dur-press: 1ms;
    --dur-fast: 1ms;
    --dur-fast-exit: 1ms;
    --dur-base: 1ms;
    --dur-exit: 1ms;
    --dur-panel: 1ms;
    --dur-slow: 1ms;
    --dur-draw: 1ms;
    --dur-spin: 1ms;
    --dur-breathe: 1ms;
    --dur-scene-cut: 1ms;
    --dur-scene: 1ms;
    --dur-scene-long: 1ms;
    --dur-alarm: 1ms;
    --dur-indeterminate: 1ms;
    --stagger: 0ms;
    --press-scale: 1;
    --press-scale-surface: 1;
    --enter-scale: 1;
    --shift-rise: 0px;
    --shift-anchor: 0px;
    --blur-soft: 0px;
    --shift-brand-align: 0px;
    --motion-spin: none;
    --motion-shimmer: none;
    --motion-alarm: none;
    --motion-indeterminate: none;
    --motion-brand-busy: none;
  }

  [data-motion="fade"] {
    --motion-fade-in: kf-fade-in var(--reduced-fade) var(--ease-out) both;
    --motion-fade-out: kf-fade-out var(--reduced-fade-exit) var(--ease-out) both;
    --motion-scale-in: kf-fade-in var(--reduced-fade) var(--ease-out) both;
    --motion-scale-out: kf-fade-out var(--reduced-fade-exit) var(--ease-out) both;
    --motion-rise-in: kf-fade-in var(--reduced-fade) var(--ease-out) both;
    --motion-swap-in: kf-fade-in var(--reduced-fade) var(--ease-out) both;
    --motion-swap-out: kf-fade-out var(--reduced-fade-exit) var(--ease-out) both;
  }
}

```

## frontend/src/shared/styles/tokens/palette.css

```css
:root {
  --ink-0: #ffffff;
  --ink-25: #f7f6f4;
  --ink-50: #f0efed;
  --ink-100: #e7e6e3;
  --ink-200: #d2d1ce;
  --ink-300: #b8b7b4;
  --ink-350: #a6a29c;
  --ink-400: #878683;
  --ink-500: #6d6c69;
  --ink-550: #65615c;
  --ink-600: #555451;
  --ink-650: #5e5a55;
  --ink-700: #3e3d3b;
  --ink-775: #33312e;
  --ink-800: #282826;
  --ink-825: #23211f;
  --ink-850: #1b1a19;
  --ink-900: #151514;
  --ink-925: #121110;
  --ink-950: #0f0e0d;
  --ink-1000: #000000;

  --crude-sage: #a0e0ab;
  --crude-olive: #4c5a3c;
  --crude-amber: #ffac2e;
  --crude-umber: #6b4219;
  --crude-oxblood: #a52d25;
  --crude-pitch: #050403;

  --leak-300: #ff7a66;
  --leak-700: #a3271e;
  --amber-300: #ffb547;
  --amber-400: #ffac2e;
  --amber-500: #b06f00;
  --amber-700: #855200;

  --steel-300: #9fa4a8;
  --steel-500: #6c7277;
  --rust-500: #a4532c;
  --rust-600: #94472a;
  --wall-amber-500: #d9870f;
}

```

## frontend/src/shared/styles/tokens/radius.css

```css
:root {
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-control: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;
  --radius-round: 50%;
}

```

## frontend/src/shared/styles/tokens/semantic.css

```css
:root,
:root[data-theme="light"] {
  color-scheme: light;

  --surface-base: var(--ink-25);
  --surface-raised: var(--ink-0);
  --surface-raised-hover: var(--ink-25);
  --surface-sunken: var(--ink-50);
  --surface-selected: var(--ink-0);
  --surface-float: var(--ink-0);
  --surface-inverse: var(--ink-950);
  --surface-skeleton: var(--ink-100);
  --surface-scrim: color-mix(in oklab, var(--ink-950) 28%, transparent);

  --text-primary: var(--ink-950);
  --text-secondary: var(--ink-600);
  --text-muted: var(--ink-550);
  --text-disabled: var(--ink-300);
  --text-on-inverse: var(--ink-0);
  --text-accent: var(--ink-950);
  --text-danger: var(--leak-700);
  --text-warning: var(--amber-700);
  --text-success: var(--ink-950);
  --action-primary-text: var(--ink-0);

  --action-primary: var(--ink-950);
  --action-primary-hover: var(--ink-800);
  --action-primary-press: var(--ink-700);
  --action-ghost-hover: color-mix(in oklab, var(--ink-1000) 4%, transparent);
  --action-ghost-press: color-mix(in oklab, var(--ink-1000) 8%, transparent);
  --action-disabled: var(--ink-100);
  --action-danger: var(--leak-700);
  --action-danger-text: var(--ink-0);
  --action-danger-hover: color-mix(in oklab, var(--leak-700) 86%, var(--ink-1000));
  --action-danger-press: color-mix(in oklab, var(--leak-700) 74%, var(--ink-1000));

  --border-subtle: var(--ink-200);
  --border-strong: var(--ink-300);
  --border-control: var(--ink-400);
  --border-control-hover: var(--ink-600);
  --border-ink: var(--ink-950);

  --status-danger: var(--leak-700);
  --status-success: var(--ink-950);
  --status-warning: var(--amber-500);
  --status-neutral: var(--ink-500);
  --signal-danger-surface: color-mix(in oklab, var(--leak-700) 7%, var(--ink-0));
  --signal-warning-surface: color-mix(in oklab, var(--amber-300) 20%, var(--ink-0));

  --scene-void: var(--ink-25);
  --scene-crude: var(--crude-pitch);
  --scene-crude-text: var(--ink-0);
  --scene-sheen-cool: var(--crude-olive);
  --scene-sheen-warm: var(--crude-amber);
  --scene-sheen-deep: var(--crude-umber);
  --scene-leak: var(--crude-oxblood);
  --scene-steel: var(--ink-400);

  --brand-ink: var(--ink-950);
  --brand-accent: var(--leak-700);

  --focus-ring: var(--ink-950);
  --shadow-near: color-mix(in oklab, var(--ink-1000) 6%, transparent);
  --shadow-color: color-mix(in oklab, var(--ink-1000) 10%, transparent);
  --scrollbar-thumb: color-mix(in oklab, var(--ink-1000) 20%, transparent);
  --scrollbar-thumb-hover: color-mix(in oklab, var(--ink-1000) 44%, transparent);
  --scrollbar-thumb-active: color-mix(in oklab, var(--ink-1000) 64%, transparent);
  --surface-range: color-mix(in oklab, var(--ink-1000) 6%, transparent);
  --text-highlight: var(--ink-1000);

  --drawing-frame: var(--ink-950);
  --drawing-contour: var(--ink-950);
  --drawing-line: var(--ink-600);
  --drawing-fine: color-mix(in oklab, var(--ink-1000) 30%, transparent);
  --hatch-neutral: color-mix(in oklab, var(--ink-1000) 24%, transparent);
  --hatch-warning: var(--amber-500);
  --hatch-danger: var(--leak-700);
  --fill-warning: color-mix(in oklab, var(--amber-300) 10%, transparent);
  --fill-danger: color-mix(in oklab, var(--leak-700) 5%, transparent);
  --paper-grid: color-mix(in oklab, var(--ink-1000) 3.5%, transparent);
  --paper-grid-major: color-mix(in oklab, var(--ink-1000) 6.5%, transparent);
  --selection-mark: var(--ink-950);
  --trace: var(--ink-950);
  --sheen: transparent;

  --chart-measured: var(--ink-950);
  --chart-model: var(--ink-500);
  --chart-grid: color-mix(in oklab, var(--ink-1000) 8%, transparent);
  --chart-axis: color-mix(in oklab, var(--ink-1000) 34%, transparent);
  --chart-band: color-mix(in oklab, var(--ink-1000) 4%, transparent);
  --chart-crosshair: color-mix(in oklab, var(--ink-1000) 45%, transparent);
  --chart-warning: var(--amber-500);
  --chart-danger: var(--leak-700);
  --wall-steel: var(--steel-300);
  --wall-rust: var(--rust-500);
  --wall-amber: var(--wall-amber-500);
  --wall-0: color-mix(in oklab, var(--wall-rust) 0%, var(--wall-steel));
  --wall-1: color-mix(in oklab, var(--wall-rust) 29%, var(--wall-steel));
  --wall-2: color-mix(in oklab, var(--wall-rust) 57%, var(--wall-steel));
  --wall-3: color-mix(in oklab, var(--wall-rust) 86%, var(--wall-steel));
  --wall-4: color-mix(in oklab, var(--wall-amber) 14%, var(--wall-rust));
  --wall-5: color-mix(in oklab, var(--wall-amber) 43%, var(--wall-rust));
  --wall-6: color-mix(in oklab, var(--wall-amber) 71%, var(--wall-rust));
  --wall-7: color-mix(in oklab, var(--wall-amber) 100%, var(--wall-rust));
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --surface-base: var(--ink-950);
  --surface-raised: var(--ink-850);
  --surface-raised-hover: var(--ink-825);
  --surface-sunken: var(--ink-925);
  --surface-selected: var(--ink-775);
  --surface-float: var(--ink-800);
  --surface-inverse: var(--ink-25);
  --surface-skeleton: var(--ink-775);
  --surface-scrim: color-mix(in oklab, var(--ink-1000) 72%, transparent);

  --text-primary: var(--ink-25);
  --text-secondary: var(--ink-300);
  --text-muted: var(--ink-350);
  --text-disabled: var(--ink-600);
  --text-on-inverse: var(--ink-950);
  --text-accent: var(--ink-25);
  --text-danger: var(--leak-300);
  --text-warning: var(--amber-300);
  --text-success: var(--ink-25);
  --action-primary-text: var(--ink-1000);

  --action-primary: var(--ink-25);
  --action-primary-hover: var(--ink-100);
  --action-primary-press: var(--ink-200);
  --action-ghost-hover: color-mix(in oklab, var(--ink-0) 7%, transparent);
  --action-ghost-press: color-mix(in oklab, var(--ink-0) 12%, transparent);
  --action-disabled: var(--ink-825);
  --action-danger: var(--leak-700);
  --action-danger-text: var(--ink-0);
  --action-danger-hover: color-mix(in oklab, var(--leak-700) 90%, var(--ink-0));
  --action-danger-press: color-mix(in oklab, var(--leak-700) 80%, var(--ink-0));

  --border-subtle: var(--ink-775);
  --border-strong: var(--ink-650);
  --border-control: var(--ink-400);
  --border-control-hover: var(--ink-300);
  --border-ink: var(--ink-25);

  --status-danger: var(--leak-300);
  --status-success: var(--ink-25);
  --status-warning: var(--amber-300);
  --status-neutral: var(--ink-400);
  --signal-danger-surface: color-mix(in oklab, var(--leak-300) 15%, var(--ink-950));
  --signal-warning-surface: color-mix(in oklab, var(--amber-300) 12%, var(--ink-950));

  --scene-void: var(--ink-950);
  --scene-crude: var(--crude-pitch);
  --scene-crude-text: var(--ink-0);
  --scene-sheen-cool: var(--crude-olive);
  --scene-sheen-warm: var(--crude-amber);
  --scene-sheen-deep: var(--crude-umber);
  --scene-leak: var(--crude-oxblood);
  --scene-steel: var(--ink-500);

  --brand-ink: var(--ink-25);
  --brand-accent: var(--amber-400);

  --focus-ring: var(--ink-25);
  --shadow-near: color-mix(in oklab, var(--ink-1000) 60%, transparent);
  --shadow-color: color-mix(in oklab, var(--ink-1000) 72%, transparent);
  --scrollbar-thumb: color-mix(in oklab, var(--ink-0) 22%, transparent);
  --scrollbar-thumb-hover: color-mix(in oklab, var(--ink-0) 44%, transparent);
  --scrollbar-thumb-active: color-mix(in oklab, var(--ink-0) 64%, transparent);
  --surface-range: color-mix(in oklab, var(--ink-0) 9%, transparent);
  --text-highlight: var(--ink-0);

  --drawing-frame: color-mix(in oklab, var(--ink-0) 14%, transparent);
  --drawing-contour: var(--ink-200);
  --drawing-line: var(--ink-500);
  --drawing-fine: color-mix(in oklab, var(--ink-0) 16%, transparent);
  --hatch-neutral: color-mix(in oklab, var(--ink-0) 12%, transparent);
  --hatch-warning: transparent;
  --hatch-danger: transparent;
  --fill-warning: color-mix(in oklab, var(--amber-300) 14%, transparent);
  --fill-danger: color-mix(in oklab, var(--leak-300) 18%, transparent);
  --paper-grid: transparent;
  --paper-grid-major: transparent;
  --selection-mark: transparent;
  --trace: transparent;
  --sheen: color-mix(in oklab, var(--ink-0) 9%, transparent);

  --chart-measured: var(--ink-25);
  --chart-model: var(--ink-400);
  --chart-grid: color-mix(in oklab, var(--ink-0) 9%, transparent);
  --chart-axis: color-mix(in oklab, var(--ink-0) 30%, transparent);
  --chart-band: color-mix(in oklab, var(--ink-0) 6%, transparent);
  --chart-crosshair: color-mix(in oklab, var(--ink-0) 45%, transparent);
  --chart-warning: var(--amber-300);
  --chart-danger: var(--leak-300);
  --wall-steel: var(--steel-500);
  --wall-rust: var(--rust-600);
  --wall-amber: var(--amber-400);
  --wall-0: color-mix(in oklab, var(--wall-rust) 0%, var(--wall-steel));
  --wall-1: color-mix(in oklab, var(--wall-rust) 29%, var(--wall-steel));
  --wall-2: color-mix(in oklab, var(--wall-rust) 57%, var(--wall-steel));
  --wall-3: color-mix(in oklab, var(--wall-rust) 86%, var(--wall-steel));
  --wall-4: color-mix(in oklab, var(--wall-amber) 14%, var(--wall-rust));
  --wall-5: color-mix(in oklab, var(--wall-amber) 43%, var(--wall-rust));
  --wall-6: color-mix(in oklab, var(--wall-amber) 71%, var(--wall-rust));
  --wall-7: color-mix(in oklab, var(--wall-amber) 100%, var(--wall-rust));
}

:root[data-theme="light"] {
  --matte-fill: color-mix(in oklab, var(--surface-float) 90%, transparent);
}
:root[data-theme="dark"] {
  --matte-fill: color-mix(in oklab, var(--surface-float) 82%, transparent);
}

```

## frontend/src/shared/styles/tokens/space.css

```css
:root {
  --space-2: 2px;
  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;
  --space-40: 40px;
  --space-48: 48px;
  --space-64: 64px;
  --space-96: 96px;
  --space-152: 152px;

  --space-page: var(--space-24);
  --space-page-wide: var(--space-32);
  --space-section: var(--space-32);
  --space-card: var(--space-20);
  --space-element: var(--space-12);
  --space-control-inline: var(--space-16);
  --space-control-block: var(--space-12);

  --hairline: 1px;
  --target-min: 44px;
  --control-height: 44px;
  --control-height-compact: 36px;
  --icon-sm: 16px;
  --icon-control: 18px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 48px;
  --brand-size-sm: 24px;
  --brand-size-md: 32px;
  --brand-size-lg: 64px;
  --icon-stroke: 1.5;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --scrollbar-size: 9px;
  --scrollbar-gutter: 3px;
  --header-height: 64px;
  --state-min-height: 160px;
  --panel-min: 320px;
  --term-min: 160px;
  --prose-measure: 70ch;
  --field-max-width: 480px;
  --border-width-control: 1px;
  --indicator-size: 20px;
  --switch-width: 40px;
  --switch-height: 24px;
  --thumb-size: 20px;
  --option-height: 40px;
  --popover-min-width: 220px;
  --popover-max-block: 320px;
  --tooltip-max-width: 260px;
  --toast-width: 400px;
  --dialog-width: 480px;
  --drawer-width: 440px;
  --fade-edge: 24px;
  --track-size: 2px;

  --header-height-compact: 48px;
  --nav-width: 240px;
  --panel-width: 384px;
  --panel-width-wide: 440px;
  --panel-max: 480px;
  --sheet-peek: 136px;
  --columns-sm: 4;
  --columns-md: 8;
  --columns-lg: 12;
  --grid-gap: var(--space-24);

  --row-height: 48px;
  --row-height-compact: 36px;
  --cell-padding: var(--space-12);
  --cell-padding-compact: var(--space-8);

  --chart-stroke: 2px;
  --chart-stroke-model: 1.5px;
  --chart-dash-model: 6 4;
  --chart-marker: 8px;
  --chart-hit: 24px;
  --chart-height: 240px;
  --chart-height-sm: 160px;
  --sparkline-width: 96px;
  --sparkline-height: 24px;

  --ink-weight-contour: 2px;
  --ink-weight-line: 1px;
  --ink-weight-fine: 0.75px;
  --hatch-angle: 45deg;
  --hatch-spacing: 6px;
  --hatch-width: 1px;
  --centerline-dash: 28 6 3 6;
  --dimension-tick: 8px;
  --leader-shelf: 24px;
  --mark-corner: 8px;
  --paper-cell: 8px;
  --paper-cell-major: 40px;
  --scanner-panel: 320px;
  --scanner-panel-min: 280px;
  --scanner-scene-min: 200px;
  --scanner-scene-max: 360px;
  --scanner-scene-mobile: 260px;
  --scanner-section-height: 140px;
  --scanner-list-height: 300px;
}

:root {
  --pipe-scene: clamp(360px, 44vh, 560px);
  --pipe-scene-focus: 72vh;
  --pipe-scene-mobile: 360px;
  --priority-list-height: clamp(300px, 48vh, 620px);
  --readout-width: 18rem;
}

```

## frontend/src/shared/styles/tokens/typography.css

```css
:root {
  --font-sans:
    "Onest Variable", "Onest", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    sans-serif;
  --font-accent: "Raleway Variable", "Raleway", var(--font-sans);
  --font-mono: ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, Consolas, monospace;
  --font-features: "kern" 1;
  --font-numeric: tabular-nums;

  --weight-light: 300;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 600;

  --font-size-micro: 0.6875rem;
  --line-height-micro: 1.4545;
  --font-size-caption: 0.75rem;
  --line-height-caption: 1.33;
  --font-size-label: 0.8125rem;
  --line-height-label: 1.23;
  --font-size-body-sm: 0.875rem;
  --line-height-body-sm: 1.43;
  --font-size-body: 1rem;
  --line-height-body: 1.5;
  --font-size-lead: 1.125rem;
  --line-height-lead: 1.5556;
  --font-size-subheading: 1.25rem;
  --line-height-subheading: 1.4;
  --font-size-heading: 1.75rem;
  --line-height-heading: 1.14;
  --font-size-heading-lg: clamp(2rem, 1.4rem + 2vw, 3rem);
  --line-height-heading-lg: 1.04;
  --font-size-display: clamp(3.5rem, 1rem + 9vw, 10rem);
  --line-height-display: 0.86;
  --font-size-monument: clamp(7rem, 1rem + 20vw, 20rem);
  --font-size-readout: 3rem;
  --line-height-readout: 1;
  --font-size-readout-sm: 1.5rem;
  --line-height-readout-sm: 1.1667;

  --tracking-display: -0.035em;
  --tracking-tight: -0.02em;
  --tracking-readout: -0.035em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}

:root {
  --font-size-scene: clamp(4rem, 2rem + 4vw, 6.5rem);
  --tracking-stencil: 0.14em;
}

```