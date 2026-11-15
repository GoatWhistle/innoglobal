import type { Glyph } from "./glyph"

export const GLYPHS = {
  pipe: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M2.75 5.25h2.5v13.5h-2.5zM18.75 5.25h2.5v13.5h-2.5zM5.25 8.25h13.5M5.25 15.75h13.5",
        },
      },
    ],
  },
  flow: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M2 5.25h20M2 18.75h20M4.5 12h13M13.5 8l4 4-4 4" } }],
  },
  "flow-start": {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
      { tag: "path", attrs: { d: "M10 8.25v7.5L15.75 12z" } },
    ],
  },
  "flow-stop": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M2 5.25h20M2 18.75h20M9 9h6v6H9z" } }],
  },
  leak: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M2 3.75h20M2 9.75h7M15 9.75h7M12 11.25s-4 4.6-4 7.25a4 4 0 0 0 8 0c0-2.65-4-7.25-4-7.25z",
        },
      },
    ],
  },
  "leak-insert": {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M10 5.5s-5 5.6-5 9.2a5 5 0 0 0 10 0c0-3.6-5-9.2-5-9.2zM18.75 2.25v6.75M15.375 5.625h6.75",
        },
      },
    ],
  },
  pressure: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M5.64 19.11a9 9 0 1 1 12.72 0M12 3.75V6" } },
      { tag: "path", attrs: { d: "M12 12.75l5.25-5.25" } },
      { tag: "circle", attrs: { cx: "12", cy: "12.75", r: "1.75" } },
    ],
  },
  temperature: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M9.75 4.5a2.25 2.25 0 0 1 4.5 0v9.2a4.5 4.5 0 1 1-4.5 0z" } },
      { tag: "path", attrs: { d: "M12 9v8.25M17.25 6h2.5M17.25 9.75h2.5" } },
    ],
  },
  sensor: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "9", r: "2.5" } },
      {
        tag: "path",
        attrs: {
          d: "M12 11.5v7.25M6.75 18.75h10.5M7.4 4.4a6.5 6.5 0 0 0 0 9.2M16.6 4.4a6.5 6.5 0 0 1 0 9.2",
        },
      },
    ],
  },
  "sensor-off": {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M12 11.5v7.25M6.75 18.75h10.5M7.4 4.4a6.5 6.5 0 0 0 0 9.2M16.6 13.6a6.5 6.5 0 0 0 0-9.2M9.6 7.4A2.5 2.5 0 0 0 12 11.5M3 3l18 18",
        },
      },
    ],
  },
  valve: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M2.75 10.5v9l9.25-4.5zM21.25 10.5v9L12 15zM12 15V6.75M7.5 6h9" },
      },
    ],
  },
  shut: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
      { tag: "path", attrs: { d: "M7 12h10" } },
    ],
  },
  pump: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "10.5", cy: "13.5", r: "6.75" } },
      { tag: "path", attrs: { d: "M10.5 6.75h10.5v4.5M10.5 13.5l3.75-3.75M3.75 21h13.5" } },
    ],
  },
  diverge: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M2 12h3l2-2.25 2.5 5 3-8 3.5 11 3.5-14.5 2.5 8.75" } }],
  },
  alarm: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M6.75 18V12.75a5.25 5.25 0 0 1 10.5 0V18M4.5 18h15M12 2.25v2.5M4.5 6l1.75 1.75M19.5 6l-1.75 1.75M9.75 21h4.5",
        },
      },
    ],
  },
  warning: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M12 3.25l9.5 17h-19z" } },
      { tag: "path", attrs: { d: "M12 9.5v5M12 16.25v1.75" } },
    ],
  },
  error: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M8.25 3h7.5L21 8.25v7.5L15.75 21h-7.5L3 15.75v-7.5z" } },
      { tag: "path", attrs: { d: "M12 7.25v6M12 15v1.75" } },
    ],
  },
  info: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
      { tag: "path", attrs: { d: "M12 10.5v6.5M12 7v1.75" } },
    ],
  },
  help: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
      {
        tag: "path",
        attrs: { d: "M9.5 9.75a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1 1-1.1 1.75v.5M12 15.75v1.75" },
      },
    ],
  },
  offline: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a4.8 4.8 0 0 1 6.4 0M12 19.25v1.5M3 3l18 18",
        },
      },
    ],
  },
  server: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M3.75 3.75h16.5v7.5H3.75zM3.75 12.75h16.5v7.5H3.75zM6.75 7.5h2.25M6.75 16.5h2.25M15 7.5h2.25M15 16.5h2.25",
        },
      },
    ],
  },
  cube: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" } },
      { tag: "path", attrs: { d: "M4 7.4l8 4.6 8-4.6M12 12v9.2" } },
    ],
  },
  layers: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M12 3.5l9 4.75-9 4.75-9-4.75z" } },
      { tag: "path", attrs: { d: "M3 12.5l9 4.75 9-4.75M3 16.5l9 4.75 9-4.75" } },
    ],
  },
  chart: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M3.75 3v17.25H21M6.75 15.75l4.5-5.25 3.75 3 5.25-6.75" } }],
  },
  sliders: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M3 6.75h10.5M18.5 6.75H21M3 17.25h2.5M10.5 17.25H21" } },
      { tag: "circle", attrs: { cx: "16", cy: "6.75", r: "2.5" } },
      { tag: "circle", attrs: { cx: "8", cy: "17.25", r: "2.5" } },
    ],
  },
  journal: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M5.25 3h13.5v18H5.25zM8.25 7.5h7.5M8.25 11.25h7.5M8.25 15h4.5" },
      },
    ],
  },
  "map-pin": {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" },
      },
      { tag: "circle", attrs: { cx: "12", cy: "10", r: "2.25" } },
    ],
  },
  timer: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "13.5", r: "7.5" } },
      { tag: "path", attrs: { d: "M12 13.5V9M9.75 2.25h4.5M18 6.75l1.75-1.75" } },
    ],
  },
  clock: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
      { tag: "path", attrs: { d: "M12 6.75V12h4.5" } },
    ],
  },
  calendar: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M3.75 5.25h16.5v15H3.75zM3.75 9.75h16.5M8.25 2.25v4.5M15.75 2.25v4.5" },
      },
    ],
  },
  play: { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M7.5 4.5v15l12-7.5z" } }] },
  pause: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M8.25 4.5v15M15.75 4.5v15" } }],
  },
  reset: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M4.5 12.75a7.5 7.5 0 1 0 2.2-5.3L3.75 10.4" } },
      { tag: "path", attrs: { d: "M3.75 4.5v5.9h5.9" } },
    ],
  },
  refresh: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5" } },
      { tag: "path", attrs: { d: "M18 2.75V7.25h-4.5M6 21.25v-4.5h4.5" } },
    ],
  },
  search: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "10.5", cy: "10.5", r: "6.75" } },
      { tag: "path", attrs: { d: "M15.4 15.4L21 21" } },
    ],
  },
  filter: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M3 4.5h18l-7 8.25v6.75l-4 2.25v-9z" } }],
  },
  sort: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M8.25 20V4.5M4.5 8.25l3.75-3.75L12 8.25M15.75 4v15.5M12 15.75l3.75 3.75 3.75-3.75",
        },
      },
    ],
  },
  "sort-asc": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M12 20.25V4.5M6 10.5l6-6 6 6" } }],
  },
  "sort-desc": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M12 3.75V19.5M6 13.5l6 6 6-6" } }],
  },
  "chevron-down": { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M6 9l6 6 6-6" } }] },
  "chevron-up": { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M6 15l6-6 6 6" } }] },
  "chevron-left": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M15 6l-6 6 6 6" } }],
  },
  "chevron-right": { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M9 6l6 6-6 6" } }] },
  "chevron-up-down": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M7.5 9.75L12 5.25l4.5 4.5M7.5 14.25l4.5 4.5 4.5-4.5" } }],
  },
  "arrow-right": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M3.75 12h15.5M13.5 6.25l5.75 5.75-5.75 5.75" } }],
  },
  "arrow-left": {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M20.25 12H4.75M10.5 6.25L4.75 12l5.75 5.75" } }],
  },
  external: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M14.25 3.75h6v6M20.25 3.75l-9 9M17.25 14.25v6H3.75V6.75h6" } },
    ],
  },
  x: { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M6 6l12 12M18 6L6 18" } }] },
  check: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M4.5 12.5l4.75 4.75L19.5 7" } }],
  },
  plus: { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M12 4.5v15M4.5 12h15" } }] },
  minus: { viewBox: "0 0 24 24", nodes: [{ tag: "path", attrs: { d: "M4.5 12h15" } }] },
  copy: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M8.25 8.25h12v12h-12z" } },
      { tag: "path", attrs: { d: "M15.75 8.25v-4.5h-12v12h4.5" } },
    ],
  },
  download: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M12 3v12M6.75 9.75L12 15l5.25-5.25M3.75 20.25h16.5" } }],
  },
  upload: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M12 15.75v-12M6.75 9L12 3.75 17.25 9M3.75 20.25h16.5" } }],
  },
  edit: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M3.75 20.25l1-5L15.5 4.5l4 4L8.75 19.25z" } },
      { tag: "path", attrs: { d: "M12.75 7.25l4 4" } },
    ],
  },
  trash: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M3.75 6h16.5M9 6V3h6v3M5.75 6l1 15h10.5l1-15M10 10.5v6.75M14 10.5v6.75" },
      },
    ],
  },
  eye: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M2.25 12Q12 1.5 21.75 12 12 22.5 2.25 12z" } },
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } },
    ],
  },
  "eye-off": {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M9.5 5.85A11.5 11.5 0 0 1 21.75 12a17 17 0 0 1-3.3 3.3M15.1 17.9A11.5 11.5 0 0 1 2.25 12a17 17 0 0 1 3.9-3.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2",
        },
      },
    ],
  },
  lock: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M4.5 10.5h15v10.5h-15zM8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3M12 14.25v3" },
      },
    ],
  },
  more: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "5.25", cy: "12", r: "1.125" } },
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "1.125" } },
      { tag: "circle", attrs: { cx: "18.75", cy: "12", r: "1.125" } },
    ],
  },
  "more-vertical": {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "5.25", r: "1.125" } },
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "1.125" } },
      { tag: "circle", attrs: { cx: "12", cy: "18.75", r: "1.125" } },
    ],
  },
  drag: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "9", cy: "5.25", r: "1.125" } },
      { tag: "circle", attrs: { cx: "15", cy: "5.25", r: "1.125" } },
      { tag: "circle", attrs: { cx: "9", cy: "12", r: "1.125" } },
      { tag: "circle", attrs: { cx: "15", cy: "12", r: "1.125" } },
      { tag: "circle", attrs: { cx: "9", cy: "18.75", r: "1.125" } },
      { tag: "circle", attrs: { cx: "15", cy: "18.75", r: "1.125" } },
    ],
  },
  menu: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" } }],
  },
  expand: {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: { d: "M3.75 9V3.75H9M20.25 9V3.75H15M3.75 15v5.25H9M20.25 15v5.25H15" },
      },
    ],
  },
  sun: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } },
      {
        tag: "path",
        attrs: {
          d: "M12 2.25v2.5M12 19.25v2.5M2.25 12h2.5M19.25 12h2.5M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M5.1 18.9l1.8-1.8M17.1 6.9l1.8-1.8",
        },
      },
    ],
  },
  moon: {
    viewBox: "0 0 24 24",
    nodes: [{ tag: "path", attrs: { d: "M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z" } }],
  },
  cursor: {
    viewBox: "0 0 24 24",
    nodes: [
      { tag: "path", attrs: { d: "M5 3.5l14.5 7-6.3 1.8-1.8 6.3z" } },
      { tag: "path", attrs: { d: "M13.2 12.3l5.8 5.8" } },
    ],
  },
  "message-circle": {
    viewBox: "0 0 24 24",
    nodes: [
      {
        tag: "path",
        attrs: {
          d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
        },
      },
    ],
  },
} as const satisfies Readonly<Record<string, Glyph>>

export type IconName = keyof typeof GLYPHS
