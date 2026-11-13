# Product

## Register

product

## Users

Jury of the hackathon case "Nedra Digital: PipeTwin" first, pipeline operators second. The jury sits
at a laptop or watches a projector, opens the stand once, clicks the pipe to insert a leak and counts
the seconds until the system catches it (`brief/TASK.md`). An operator watches one section of a
trunk line for hours and needs to know at a glance whether the line is calm, suspicious or leaking.

## Product Purpose

duppel (always lowercase) is a digital twin of a pipeline section in the browser: a flow model (Darcy-Weisbach,
heat losses) runs on the client and the system detects a leak in real time from the gap between
modelled and "measured" pressure. Success is observable: the jury inserts a leak with the mouse and
sees the alarm, its location and the detection time without anyone explaining the screen. The
decision to shut off a section stays with the human.

## Brand Personality

Quiet, exact, physical. Copy reads like an operator's log: a fact, a place, a number, no
exclamation marks and no hedging. Ink carries action and structure; amber carries suspicion and
oxblood carries a leak, and nothing else in the interface has a hue. The only rich colour is the
crude oil inside the WebGL pipe. Two equal personalities: at night a control room with depth and
glossy oil, by day an engineering drawing in ink on paper.

The name is German Doppel, "twin". The mark is the ditto sign 〃 ("the same") whose second stroke
has dropped: the twin no longer matches reality, that is the leak. The same double prime ″ reads as
seconds, the time to catch it. Reference: `work/design/ds/doc-brand.html`, sources in `docs/brand/`.

## Anti-references

- Generic AI SaaS: gradients and glows for decoration, glassmorphism, sparkle icons, purple-blue
  hero washes, gradient text.
- Grids of identical cards with an icon, a title and a sentence.
- KPI tiles for the sake of tiles: a big number, a caption and a gradient with no conclusion.
- Centred narrow column with empty fields on the sides of a wide screen.
- Caps-lock eyebrows above every section, fake step numbers 01, 02, 03.
- Dashes and middle dots as separators, emoji instead of icons.
- SCADA screens of the 2000s: saturated green and red everywhere, so a real alarm drowns among
  decorative colour; bevelled 3D buttons; dense tables with no hierarchy.

## Design Principles

1. **Colour means an event.** Normal is silent and monochrome; a hue appears only when the model
   and the sensors disagree, so a leak is impossible to miss.
2. **Show the gap, not the claim.** Measured and modelled values sit side by side; the alarm points
   to the place on the pipe and the time it took.
3. **No dead ends.** Every empty, error and long-running state explains itself and offers the next
   step.
4. **Data is the main visual.** The pipe and the readouts replace paragraphs of explanation.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast at least 4.5:1 and UI parts 3:1 in both themes, computed from the tokens
on the foundations page. Full keyboard control, always visible focus, touch targets of 44px. State
is never conveyed by colour alone: an icon and a word go with it. The leak alarm is announced with
`role="alert"`. `prefers-reduced-motion` turns the scene's viscous moves into short fades without
removing feedback. The interface is Russian only; numbers follow `ru-RU` formatting. The demo runs
on a projector, so the dark theme is default and the light theme must survive a bright room.
