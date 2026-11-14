# Product

## Users and operating context

The hackathon jury explores a pipeline forecast on a laptop or projector. An inspection engineer
needs to identify segments with the thinnest predicted wall, inspect their measurement history and
understand which evidence supports the priority. The interface is Russian only. Dark is the default;
light is equally complete for a bright room.

## Positioning

A pipeline wall scanner that connects a selected ten-metre segment, its predicted minimum thickness
and its available inspection evidence. The product is duppel, always lowercase; PipeTwin is the
organizer's case name.

The name is German Doppel, "twin". The mark is the ditto sign 〃 ("the same") whose second stroke
has dropped: the twin no longer matches reality. Reference: `work/design/ds/doc-brand.html`,
sources in `docs/brand/`.

## Product truth

The current case predicts minimum residual wall thickness at date T for every ten-metre segment of
two pipes. One case starts from a previous in-line inspection (VTD); the other starts from nominal
wall thickness at commissioning. The target inspection is withheld. The score is squared Pearson
correlation, not the coefficient of determination. Sources: the organizer brief, pages 1–3.

The current deliverable is an HTML design-system catalog and interactive synthetic example, separate
from the React product. There are no trained degradation model, real case datasets or product API
endpoints for the scanner. Every example is labelled synthetic. The earlier live leak simulator is
preserved as an experiment and does not define the current product.

## Primary scenario

Choose a pipe, move the wall scanner, read the selected segment's minimum thickness alongside its
baseline and optional interval, then open the thinnest ten percent to prioritize checks. All views
share one selection. Keyboard and 2D fallback support the same route.

## Design commitments

- Preserve Onest, the own icon set and the warm graphite / engineering-paper themes.
- The signature is the movable cross-section, linked to the profile and dimensioned wall diagram.
- A segment minimum does not describe corrosion around the circumference. The diagram is explicitly
  schematic, with wall thickness exaggerated for legibility. No invented pits are measured defects.
- Use neutral surfaces and data; amber marks inspection priority. Red needs an error or a supplied
  violated criterion. Low predicted thickness alone never establishes a leak or failure probability.
- Keep dates and sources attached to their values. Missing measurements and uncertainty stay missing.
- No generic KPI-card grid, decorative gradients, glass, glow, fake badges or ornamental animation.

## Evidence and boundaries

The demo is deterministic, with two synthetic pipeline cases, a partial terminal segment and
incomplete-data states. Factors shown in the example are context, not established causal effects.
Uncertainty bands are illustrative and their coverage has not been assessed. A ranked list is a
relative selection, not a maintenance safety limit. Validation metrics will be added only after
runs against available historical inspections.

## Accessibility

Text contrast at least 4.5:1, visible keyboard focus, 44px targets and text alongside status colour.
Selection works through the range, coordinate field, previous/next actions and priority list.
Reduced motion keeps selection immediate and removes camera smoothing. WebGL failure retains the
profile, schematic and all numerical evidence.
