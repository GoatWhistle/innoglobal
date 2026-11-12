export const VARIANTS = {
  sculpture: {
    title: "Скульптура", subtitle: "Матовый графит. Свет раскрывает форму, разрез открывает поток.",
    points: [[-10, 0, 0], [-6, 0, 0], [-3, 0, 2.8], [1, 0, 2.8], [4, 0, 0], [10, 0, 0]],
    camera: [4, 8, 20], radius: 0.72, window: [0.34, 0.69], opening: 0.34,
  },
  flow: {
    title: "Открытый поток", subtitle: "Условный разрез заполненной трубы. Весь объём занят нефтью.",
    points: [[-10, 0, 0], [-5, 0, 0], [0, 0, 0], [5, 0, -1], [8, 0, -4]],
    camera: [2, 13, 17], radius: 1.02, window: [0.06, 0.94], opening: -0.2,
  },
  loop: {
    title: "Петля", subtitle: "Один непрерывный путь. Тяжёлая жидкость внутри собранного объёма.",
    points: [[-9, 0, 4], [-9, 0, -1], [-6, 0, -4], [5, 0.5, -4], [9, 1, -1], [9, 1, 4]],
    camera: [8, 13, 22], radius: 1, window: [0.12, 0.88], opening: 0.05,
  },
}

export const toProgress = (meters) => Math.min(1, Math.max(0, meters / 12000))
export const toMeters = (progress) => Math.min(12000, Math.max(0, progress * 12000))
export const variantId = (id) => Object.hasOwn(VARIANTS, id) ? id : "sculpture"
