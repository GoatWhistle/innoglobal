# Style: monopo saigon (Refero)

New reference discussed 2026-11-15: [Superlative and engineering workspace](superlative/direction.md).
The historical monopo extraction below remains intact; no new frontend styling has been applied.

- Style page: https://styles.refero.design/style/3e52dd36-6ab1-48c6-bc40-47ef6d33abc2
- Source site: https://monopo.vn/
- Theme on Refero: light. Requested by the user on 2026-11-12: both light and dark themes, Russian
  only, own fonts, own icons (no default sets), WebGL for oil, pipes and flow, 3D allowed. The style
  is a reference, not a copy; everything can still change after discussion.
- Pulled: 2026-11-12. The user pasted the DESIGN.md export into the chat; it is kept verbatim below.

## Source site observations (work/design/source/)

The site is a scroll-jacked single viewport (document height equals the viewport); the scroll wheel
swaps the hero phrase over one persistent WebGL canvas (1440×900).

home-1440-scroll1.png
1. The live hero is dark, not white: near-black field with a WebGL fluid in olive green, amber and
   brown, covered with film grain. It reads as crude oil with a thin-film sheen.
2. A large glass sphere sits right of centre and refracts the fluid behind it; its rim catches a
   bright amber caustic. This lens is the only "object" in the scene.
3. Headline is about 56px, weight 400, white, centred, with single glyphs swapped to a Raleway
   italic (Hội, giới) — the italic swap is the typographic signature.

home-1440-work.png
1. Navigation: wordmark top-left (geometric wide "monopo" plus light "saigon"), locale switcher in
   the centre with a 1px vertical tick as the active marker, menu stacked right in small caps at
   about 11px, low-contrast grey on the dark field.
2. Bottom-left: rotating circular "SCROLL DOWN" text badge with two interlocking rings in the centre.
3. Cookie banner bottom-right: translucent dark panel with no radius, filled grey pill "Accept" and a
   thin close cross.

home-1440-deep.png
1. Between phrases the fluid keeps moving; colour never enters the interface chrome.
2. Grain is strong and uniform, it unifies the gradients and kills banding.
3. A bottom vignette fades the scene to pure black before the page edge.

home-375.png
1. Mobile shows the fluid clipped inside a circle (the lens) on black, with "hello saigon" centred
   and the italic swap on "a".
2. All chrome disappears on load; the composition is one object in the centre.
3. Grain is visibly coarser at this size.

## Refero DESIGN.md export (verbatim, as pasted by the user)

# monopo saigon — Style Reference
> Liquid iridescence behind editorial silence — a monochrome editorial gallery floating on molten light.

**Theme:** light

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Monopo Saigon runs on radical monochrome discipline: pure black and white with whisper-thin grays, wrapped around massive Roobert typography that breathes across full-bleed canvases. The signature contrast lives between austere editorial restraint (sharp 0px corners on navigation and text links, generous whitespace, 4px-based rhythm) and a single expressive gesture — full-pill 75px-radius buttons that float like liquid over imagery. Hero environments lean into iridescent, fluid, chromatic atmospheres (greens dissolving into amber into deep oxblood) while the interface itself never picks up a hue, creating the feeling of a black-and-white editorial gallery floating on a river of liquid light. Type sets the temperature: weight 300 at 78px whispers, weight 400 at 225px fills the viewport, and weight 400 at 11px labels everything else with confident minimalism. Motion is expressive but patient — cubic-bezier(0.19, 1, 0.22, 1) ease curves stretching up to 1.25s transform transitions, letting elements glide rather than snap.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Obsidian | `#000000` | `--color-obsidian` | Primary text, SVG strokes, overlay fills — pure black carries all foreground information and graphic marks |
| Paper | `#ffffff` | `--color-paper` | Light text on dark surfaces, inverse labels, and high-contrast captions. Do not promote it to the primary CTA color |
| Inkstone | `#181818` | `--color-inkstone` | Footer body copy and secondary headings — softened black for long-form reading blocks |
| Felt Gray | `#6d6d6d` | `--color-felt-gray` | Muted helper text, address blocks, legal copy — quiet annotations that recede without disappearing |
| Slate Pill | `#636363` | `--color-slate-pill` | Filled neutral button background — the only solid fill used for actions like Accept |
| Ash Mist | `#9a9a9a` | `--color-ash-mist` | Mid-tone neutral for disabled or low-contrast surfaces in the surface stack |
| Pewter | `#808080` | `--color-pewter` | Secondary mid-tone neutral for hover or muted state layers |
| Iridescent Fade | `linear-gradient(90deg, rgb(160, 224, 171), rgb(255, 172, 46) 50%, rgb(165, 45, 37))` | `--color-iridescent-fade` | Chromatic accent appearing only inside the hero gradient wash — molten oxblood anchor of the iridescent atmosphere, not used in interface controls |

## Tokens — Typography

### Roobert — Primary typeface across all interface text, navigation, hero headlines, body, lists, and footers. The custom sans carries geometric clarity with humanist warmth; its wide weight range (300 whisper through 600 anchor) lets the system breathe from monumental 225px headlines down to 11px labels · `--font-roobert`
- **Substitute:** Inter or Söhne — both share Roobert's geometric-humanist balance and clean aperture
- **Weights:** 300, 400, 600
- **Sizes:** 11px, 12px, 16px, 18px, 29px, 30px, 39px, 45px, 54px, 78px, 94px, 225px
- **Line height:** 0.70–2.34 (tight 0.70–0.76 on display sizes, generous 1.58 on body)
- **Role:** Primary typeface across all interface text, navigation, hero headlines, body, lists, and footers. The custom sans carries geometric clarity with humanist warmth; its wide weight range (300 whisper through 600 anchor) lets the system breathe from monumental 225px headlines down to 11px labels

### Raleway — Reserved for specific heading contexts where a slightly more elegant, narrower sans introduces contrast — appears sparingly as a counterpoint to Roobert's bolder presence · `--font-raleway`
- **Substitute:** Montserrat or Jost
- **Weights:** 400
- **Sizes:** 54px
- **Line height:** 1.39
- **Role:** Reserved for specific heading contexts where a slightly more elegant, narrower sans introduces contrast — appears sparingly as a counterpoint to Roobert's bolder presence

### system-ui — Micro UI labels, cookie banner body, fine print — browser default fallback ensuring legibility at the smallest scale without committing to a custom face · `--font-system-ui`
- **Weights:** 400
- **Sizes:** 9px, 16px
- **Line height:** 1.15–1.32
- **Role:** Micro UI labels, cookie banner body, fine print — browser default fallback ensuring legibility at the smallest scale without committing to a custom face

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | — | — | 12px | 1.19 | 0px | `--text-caption` |
| body-sm | — | — | 16px | 1.15 | 0px | `--text-body-sm` |
| body | — | — | 18px | 1.21 | 0px | `--text-body` |
| subheading | — | — | 39px | 1.19 | 0px | `--text-subheading` |
| subheading-lg | — | — | 45px | 1.15 | 0px | `--text-subheading-lg` |
| heading-sm | — | — | 54px | 1.39 | 0px | `--text-heading-sm` |
| heading | — | — | 78px | 1.1 | 0px | `--text-heading` |
| heading-lg | — | — | 94px | 0.76 | 0px | `--text-heading-lg` |
| display | — | — | 225px | 1.25 | 0px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** spacious

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 28 | 28px | `--spacing-28` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 68 | 68px | `--spacing-68` |
| 152 | 152px | `--spacing-152` |

### Border Radius

| Element | Value |
|---------|-------|
| tags | 75px |
| cards | 0px |
| images | 0px |
| inputs | 0px |
| buttons | 75px |

### Layout

- **Page max-width:** 1078px
- **Section gap:** 46px
- **Card padding:** 34px
- **Element gap:** 14px

## Components

### Ghost Pill Button (Dark Surface)
**Role:** Primary action button used over iridescent or dark hero media

Transparent background, 1px solid rgba(255,255,255,0.3) border, #ffffff text, 75px border-radius (full pill), 11px vertical and 33px horizontal padding, Roobert 16px weight 400. The translucent border dissolves into the iridescent background while the pill silhouette stays unmistakable.

### Ghost Pill Button (Light Surface)
**Role:** Secondary action on white or light gray sections

Transparent background, 1px solid #000000 border, #000000 text, 75px border-radius, 11px vertical and 33px horizontal padding, Roobert 16px weight 400. Mirrors the dark-surface variant — same geometry, inverted palette.

### Filled Neutral Pill
**Role:** Cookie consent and utilitarian confirmations

rgba(55,55,55,0.78) background (functionally Slate Pill #636363), #ffffff text, 1px solid #ffffff border, 75px border-radius, 11px vertical and 33px horizontal padding. The only solid-filled action in the system — used sparingly for compliance and consent, never for primary marketing CTAs.

### Underline-Free Text Link
**Role:** Inline navigation, menu items, language switcher, footer links

No background, no border, 0px radius. Roobert 12–16px weight 400, color shifts between #ffffff (on dark) and #000000 (on light). Underlines are absent — context and weight set the link apart from body copy. Generous line-height (1.36 at 11px, 1.19 at 12px) keeps stacked menus airy.

### Hero Display Headline
**Role:** Full-viewport editorial title

Roobert 225px weight 400, line-height 1.25, #ffffff over iridescent dark media. Letter-spacing normal. The headline is the hero — no subhead, no CTA, just one monumental phrase centered in the viewport breathing against fluid light.

### Section Heading (Whisper Weight)
**Role:** Atmospheric headline for manifesto or feature sections

Roobert 78px weight 300, line-height 1.10. The 300-weight at this scale is anti-convention — most sites push 600–700 here. The whisper weight lets the headline feel like it is being spoken, not shouted, giving the editorial chamber its hushed authority.

### Section Heading (Anchor Weight)
**Role:** Bold editorial divider or statement

Roobert 94px weight 400, line-height 0.76. The tight line-height (0.76) is dramatic — text lines almost touch, creating a dense typographic block that reads as art object. Used for large statement moments where the text itself is visual.

### Project Card / List Row
**Role:** Featured work entry — paired image and title

Transparent background, 0px border-radius, no shadow. Image bleeds full-width within the 1078px container; title sits below in Roobert 16–18px weight 400. No card chrome — the card is content, not a container. Spacing between rows controlled by 14–46px gaps depending on section density.

### Language Switcher
**Role:** Top-bar locale selector (EN / VN / 中文)

Three inline text links in Roobert 12px weight 400, color #ffffff or #000000 depending on surface, 0px radius, separated by visual whitespace rather than dividers. Active locale carries the same color but slightly heavier visual weight through spacing alone.

### Rotating Scroll Indicator
**Role:** Bottom-left circular badge prompting downward exploration

Circular SVG badge with text tracing the circumference ('SCROLL DOWN · SCROLL DOWN'), rotating continuously at slow tempo. Sits at 0,0 of the bottom-left corner with small offset. Ink black stroke on transparent fill — a typographic punctuation mark, not a button.

### Footer Address Block
**Role:** Studio contact information

Roobert 11px weight 400 line-height 1.36, #6d6d6d Felt Gray text. Tight 8px top margins between lines create a compact address stack that recedes into the page. No dividers or labels — the muted gray does the work.

### Cookie Banner
**Role:** Compliance notice with single accept action

Fixed bottom bar, rgba(55,55,55,0.78) Slate Pill background, white body text in system-ui 9–16px, paired with Filled Neutral Pill 'Accept' button. Minimal copy, single action, no settings — the banner respects attention by asking for nothing beyond consent.

### Top Navigation Bar
**Role:** Persistent header with logo, locale, and menu

Fixed transparent header 66px tall. Logo wordmark top-left (Roobert 16px weight 400 'monopo saigon'), language switcher centered, menu stack right-aligned (WORK / MANIFESTO / SAIGON SOULS / TEAM / CONTACT at 11–12px weight 400). No background fill — the header is invisible until content scrolls behind it.

### Iridescent Hero Backdrop
**Role:** Atmospheric media behind hero headlines

Full-viewport organic gradient or video: soft sage green (rgb 160,224,171) dissolving through molten amber (rgb 255,172,46) into deep oxblood (rgb 165,45,37). Applied as a flowing, liquid texture — never as a flat gradient. This is the only chromatic surface in the entire system and exists only behind text, never as UI fill.

## Do's and Don'ts

### Do
- Set display headlines at 225px Roobert weight 400 and let them own the viewport — never crowd them with subheads or CTAs
- Use the 75px pill radius exclusively for buttons and tags — keep all other elements (cards, images, inputs) at 0px radius for sharp editorial contrast
- Reserve color for one iridescent hero backdrop per page — keep all interface text, borders, and fills strictly in the black/white/gray scale
- Use weight 300 at 78px for manifesto and atmospheric headlines to create whisper authority — never push above weight 400 at this scale
- Set line-height to 0.70–0.76 on display sizes above 78px to let lines lock together as typographic art objects
- Apply cubic-bezier(0.19, 1, 0.22, 1) easing to transform and color transitions with durations of 0.8–1.25s for patient, gliding motion
- Keep all interactive text links at 0px radius with no underlines — let spacing, color, and context signal affordance

### Don't
- Never introduce a chromatic UI color — black, white, and gray are the interface palette; the iridescent gradient is media only
- Never use box-shadow or elevation on cards, buttons, or images — the system relies on flat surfaces and hairline 1px borders
- Never set border-radius between 1px and 74px — the system jumps from sharp 0px to full 75px pill, no intermediate rounding
- Never use bold or heavy weights (600+) above 45px — large sizes should whisper at 300 or speak at 400, never shout
- Never center-align body copy in address blocks, lists, or project descriptions — left-align with 8–14px line gaps for editorial flow
- Never add gradients to buttons, badges, or UI controls — gradients belong only in the hero atmospheric media
- Never use Raleway for body or navigation — it is a heading accent only, and even there it appears sparingly
- Never fill the canvas with imagery — the system is text-dominant with one hero-sized visual gesture per page

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 1 | Paper | `#ffffff` | Primary canvas — most sections sit on pure white |
| 2 | Slate Pill | `#636363` | Filled button surface for cookie consent and neutral actions |
| 3 | Obsidian | `#000000` | Dark overlay and inverse section — full-bleed dark bands behind iridescent media |
| 4 | Ash Mist | `#9a9a9a` | Quiet mid-tone layer for inset panels or disabled zones |

## Elevation

The system deliberately avoids shadow elevation. Surfaces are distinguished by color inversion (white to black bands) and hairline 1px borders rather than stacked shadows. The lone 'elevation' gesture is the translucent slate pill on the cookie banner, which uses background opacity rather than shadow to separate from content.

## Imagery

Imagery is theatrical and singular: one massive iridescent fluid texture dominates the hero — organic greens dissolving through amber into oxblood like oil on water or molten glass. It reads as full-bleed atmospheric media, possibly video or shader-driven canvas, and occupies the entire viewport as a singular sensory moment rather than a repeated pattern. Project showcases use contained editorial photography (tight product crops, campaign stills) presented without frames or borders — the image is the content. No illustration, no icons beyond tiny UI glyphs, no decorative shapes. Iconography is minimal or absent; the rotating circular text badge functions as the system's only typographic ornament. Overall density: text-dominant with one hero-sized visual gesture, then long quiet editorial stretches of typography and product imagery.

## Layout

Layout is max-width contained at 1078px, centered, with full-bleed dark hero sections breaking the container. The hero is full-viewport: centered monumental headline (Un i ted, Unbound) floating over iridescent media, minimal navigation floating at top, single rotating badge at bottom-left. Body sections follow a spacious editorial rhythm — generous 46px section gaps create breathing room between blocks, alternating between white and dark (black with white type) bands. Content arrangement is asymmetric: text-left/image-right and image-left/text-right alternations dominate, with no centered stacks outside the hero. Card grids appear as single-column project lists rather than multi-column grids — each project gets the full width with its image and title. Navigation is a transparent top bar with logo left, locale center, menu right — no sticky color shift, no shadow, just invisible persistence. The footer is a compact three-column address block (Tokyo, Saigon, London) with quiet 11px copy. Overall: editorial magazine pacing in a digital frame.

## Agent Prompt Guide

**Quick Color Reference**
- text primary: #000000
- text muted: #6d6d6d
- background: #ffffff
- dark overlay / inverse section: #000000
- border (light surface): #000000
- border (dark surface): rgba(255,255,255,0.3)
- accent: none — the only chromatic color is the iridescent hero gradient, which is media only
- primary action: no distinct CTA color

**3 Example Component Prompts**
No distinct primary action color was observed; use the extracted neutral button treatments instead of inventing a filled CTA color.

2. Build a project list row: transparent background, 0px radius, no shadow. Full-bleed image at the top within the 1078px container, sharp corners. Project title below in Roobert 16px weight 400, color #000000. 46px gap to the next row. No card chrome, no borders, no padding around the content itself.

3. Build a Ghost Pill Button on a light surface: transparent background, 1px solid #000000 border, 75px border-radius, 11px padding-top and padding-bottom, 33px padding-left and padding-right. Label in Roobert 16px weight 400, color #000000. No hover fill — animate border opacity and letter-spacing on transition with cubic-bezier(0.19, 1, 0.22, 1) over 0.8s.

## Motion Personality

Motion is expressive but unhurried — the system treats transitions as slow camera moves rather than UI snaps. The signature curve is cubic-bezier(0.19, 1, 0.22, 1) (a gentle ease-out) applied to transform, color, and opacity at 0.8s and 1.25s durations. Shorter easing uses plain 'ease' at 0.4s for color and opacity micro-transitions. A rotating animation runs continuously on the scroll-indicator badge at slow tempo. Transforms dominate over positional animation — elements glide, slide, and reveal through transform rather than repositioning layout. The 1.25s duration on transforms (69 occurrences) signals that the studio prefers patience over responsiveness; nothing should feel abrupt. Border transitions (6 occurrences) and flex-basis shifts are rare and reserved for layout reveals, not micro-interactions.

## Similar Brands

- **Resn** — Same liquid iridescent hero treatment behind monochrome editorial typography and full-pill ghost buttons
- **Active Theory** — Same immersive full-bleed dark hero with single monumental headline and restrained monochrome chrome around it
- **Locomotive** — Same editorial agency rhythm — oversized whisper-weight headlines, generous 46px+ section gaps, and zero shadow elevation
- **Pentagram** — Same austere black-and-white editorial system with sharp 0px corners and custom geometric sans (Roobert echoing Pentagram's house faces)

## Quick Start

The CSS Custom Properties and Tailwind v4 blocks were pasted too; their values repeat the tables above
(plus `--radius-lg: 10px` and `--radius-full: 75.024px`). Not copied: the user asked not to take
anything from other projects or styles as-is, and values for this product live only in
`frontend/src/shared/styles/tokens/`.

## Conflicts with our rules and the product

To be resolved with the user; decisions recorded here with the date.

| # | Style says | We need | Proposal |
|---|---|---|---|
| C1 | No chromatic UI colour at all | A leak alarm, warnings and normal state readable in a second | Monochrome UI plus one alarm hue taken from the oxblood end of the fluid; amber for warning |
| C2 | Gradient only in hero media | `frontend/AGENTS.md` bans gradients and glows | The WebGL oil scene is the one allowed chromatic surface; never on controls |
| C3 | Roobert (commercial, no open Cyrillic) | Russian-only UI | Free Cyrillic grotesk chosen from a specimen |
| C4 | 0.8–1.25s patient motion everywhere | A real-time leak detector must answer instantly | Slow curve for scene and route moves only; controls stay fast |
| C5 | Light theme on Refero, dark on the live site | Both themes | Both, derived from one neutral ramp; default to be chosen |
| C6 | RU and EN in `AGENTS.md` | The user: Russian only | Russian only, recorded as a user instruction |
| C7 | 1078px centred column | Full-width product panels | Full-width app shell; 1078px measure only for prose |
| C8 | No icons beyond tiny glyphs; template allows lucide | The user: own icons, no default sets | Own icon set on our grid, drawn for the pipeline domain |

## Decisions, 2026-11-12

Answered by the user in the chat:

- C1: monochrome UI plus signal. Oxblood means a leak, amber means suspicion; normal and success stay
  neutral. Tokens: `--leak-*`, `--amber-*`, `--signal-*-surface`.
- C3: Onest for every role (tabular figures checked), Raleway Italic only for the one-letter swap in
  the scene headline and the mark. Commissioner and Wix Madefor Display were dropped: no tabular
  figures.
- C4: two tempos. UI keeps the template motion tokens; the scene uses `--ease-viscous`
  (`cubic-bezier(0.19, 1, 0.22, 1)` from the style) with `--dur-scene` and `--dur-scene-long`.
- C5: dark theme by default, light theme complete.

Taken as proposed, open to change: C2 (colour lives only in the WebGL scene), C6 (Russian only),
C7 (full-width shell), C8 (own icon set, `work/design/ds/icons.svg`).

Showcase: `work/design/ds/index.html`, served from the repository root
(`python -m http.server 5178`, then `/work/design/ds/`).

## Decisions, 2026-11-12, design-system pass

Taken by the design-system lead; open for the user to overrule. Audit and plan:
`work/design/ds/SYSTEM-NOTES.md`; reasons: `docs/design-decisions.md`.

- Ink ramp is warm-neutral (OKLCH hue 88, chroma at most 0.0045), sharing the hue of crude pitch.
  Pure white and pure black stay at the ends.
- Light theme is paper: page `--ink-25`, panels white, tracks `--ink-50`, text `--ink-950`, dimming
  scrim in ink instead of white haze. Hairlines 10/22% (light) and 11/24% (dark).
- Dark text is `--ink-25`, not pure white; the page stays pure black for the scene's vignette.
- New tokens: `--amber-500` (warning marks in light), `--surface-float`, `--shadow-near`.
- Line heights snapped to 4px (`micro`, `lead`, `subheading`, `readout-sm`); global headings at 400.
- `--scene-void` follows the page in light (`--ink-25`), so the scene sits on the same paper.
- Foundations page `work/design/ds/index.html` shows foundations only; controls go to `kit.html`,
  the scene to `scene.html`.

### Answers to the design-system pass questions, 2026-11-12

The user delegated these three to the lead.

- Warm ink ramp and paper `#f7f6f4` stay. The interface shares the hue of crude pitch, so the UI and the
  scene read as one material; pure white remains for raised panels.
- Dark-theme text `#f7f6f4` on pure black stays: less halation on large light type, and black stays
  black for the scene.
- Two ambers in the light theme stay, as a rule: marks, outlines and fills use `--amber-500`, text
  uses `--amber-700`. The same split applies to any future signal colour.

### Light theme identity, 2026-11-12

The user: the light theme felt secondary ("мне не нравится что светлая тема вторичная", "чтобы она
была поинтереснее"). Chosen concept: two equal personalities of one product. Dark is the night
control room (glossy oil, light, depth, grain). Light is an engineering drawing on paper (ink weights,
hairlines, section hatching, dimension lines, leader callouts, dash-dot centre lines, faint grid),
with its own signature details, including the 3D scene rendered as a drawing. Structure, components
and semantics stay shared. Dark remains the default theme.

## Decisions, 2026-11-12, foundations pass 2

- User: the light theme must not feel secondary and should be more interesting. Concept: two equal
  personalities. Dark is the night control room (pitch, depth, glossy oil, sheen on floats). Light is
  an engineering drawing (paper, ink in three weights, hatching, dimension lines, leader callouts,
  dash-dot centre lines, millimetre grid behind work areas, title block). Dark stays the default.
- Rule of two layers: ink layer on in light, fill and sheen layer on in dark; the off layer is
  `transparent`. Components never branch on the theme.
- Light palette review: paper `--ink-25` and ink `--ink-950` stay; `--border-subtle` in light raised
  from 10 to 12 % so panels hold on paper. Amber and oxblood act as inks in light (hatch over a faint
  wash) and as light in dark (wash, no hatch).
- Foundations split into nine pages with one shared shell; new chapters: build checklist, two
  personalities, drawing vocabulary, signature details, layout, density, numbers, real time, charts,
  chart states, alert lifecycle, feedback, forms, tables, keys, glossary.
- Keys: Space inserts a leak, Esc closes the top layer or resets with undo, P pauses, A accepts the
  alarm, / searches, G then S, J or P navigates, [ and ] step ticks, ? shows the map.
