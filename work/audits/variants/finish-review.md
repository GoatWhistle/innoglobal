disposition: fix

Inputs not supplied: a separate QUALITY BAR card; the supplied incumbent DESIGN.md and baseline.png were used for finish calibration. No approved comp applies to this code-led extension. The supplemental second-pipe captures and un-sampled implementation files were not inspected.

## persistence

Pass. frontend/PRODUCT.md and frontend/DESIGN.md exist and preserve the incumbent Onest, graphite/paper and steel/rust/amber world. FORM is explicitly pinned by the user to all five compositions; a random seed and comp approval are inapplicable. All 20 required same-pipe variant captures and both gallery captures exist, show the document top, match their names and have the stated widths. The additional paired-gallery and overlay captures are valid. Shipping raster sidecars exist; the sampled steel and scanner sidecars identify their origins. The provided detector result is empty. The logs record 376 unit tests and 50 browser tests passing; the reviewer did not rerun them or a detector.

## fidelity

| Element / promise | Status | Evidence |
| --- | --- | --- |
| TYPE | match | Onest, tabular readouts, restrained heading hierarchy and incumbent controls remain visible in both themes. |
| MATERIAL | acceptable adaptation | Scanner and inspection visibly ship the rendered steel raster, with vector navigation marks and supports; this is a code-led orthographic instrument, not a comp reproduction. The finish ceiling remains below the incumbent physical scene as described below. Atlas tiles and drafting geometry are intentionally schematic under the pinned brief. |
| GROUND | match | Sampled page ground is RGB 247/246/244 in light and 15/14/13 in dark; panels are 255/255/255 and 27/26/25. These retain the specified paper and warm graphite rather than introducing a new world. |
| THESIS / shared selection | match | The five routes use the common workspace state, actual profile rows, shared selected segment and URL range. Source and browser evidence cover keyboard selection, pipe changes, deep links, zoom and synchronized gallery views. |
| Scanner desktop composition | match | Long side elevation, selection plane, aligned forecast/observation/elevation/priority tracks and persistent right readout are present. |
| Atlas composition and layers | acceptable adaptation | Ordered real-segment field, local profile, fixed color domain, four layers and priority dimming are present. Mobile scroll and larger cells follow the explicit implementation contract. Mobile layer control fails legibility below. |
| Comparison composition | match | Dated aligned tracks, signed-difference marks, a shared selection, overlay boundary and nominal fallback are implemented and evidenced. |
| Inspection desktop composition | match | Left queue, stable local neighborhood, right evidence, ordering controls and previous/next queue traversal are present. The optional physical route is additional, as permitted. |
| Drafting dimensioned section | contradicted | In both light captures the nominal dashed ring is almost indistinguishable from the black bore; only P10 is drawn and keyed, so the requested nominal/forecast/interval comparison is incomplete in the section. |
| FIRST VIEWPORT / mobile task distinction | contradicted | All five 375px captures start with essentially the same roughly 1000px header/readout stack. Scanner navigation starts near y=1020 and its pipe near y=1350; inspection next-area appears near y=1100; drafting's longitudinal control and drawing begin much farther down. The common evidence panel displaces each variant's primary action and signature. |
| Unexpected forecast increase | contradicted | Desktop shows the 0.76mm increase and model link; on every 375px capture this warning is inside the closed measurements disclosure. SegmentFacts places the warning within that collapsed block, so the unexpected condition is not noticeable in the default mobile view. |
| Numerical chart reading | missing | Aligned tracks draw unlabeled horizontal guides and put only the complete vertical range beneath the plot. A selected negative difference has no numerical readout; the panel only emits a number for a positive increase. Overlay/atlas/drafting copy describes a light forecast line even when it is black in the light theme. |
| Gallery | contradicted | Five actual previews, open links and synchronized paired views are present. In gallery-375.png and gallery-compare-375.png the pipe selector collapses to about 26px, hiding its selected ID and affordance. |
| Atlas mobile control | contradicted | Both 375px themes show the four layer labels running together inside one constrained segmented control; the middle choices cannot be read as separate targets. |
| STORY / data truth | match | Segment minima, fixed scales, dated VTD, explicit absent UZT, uncalibrated quantiles and relative priority are preserved in sampled source. The schematic caption remains visible; no measured angular defect reconstruction is introduced by the new surfaces. |
| Floor | match except listed controls | No added eyebrow scaffolding, gradient text, glyph icons, decorative side stripes or costume typography was found in the supplied captures. The prominent forecast readout is expressly authorized by the brief. |

## ceiling

Not reached. The incumbent scene demonstrates cylindrical tonal depth, weld relief and coherent supports. The new scanner and inspection raster is close to white across most of its upper surface in both themes; the black segment divisions and flat I-shaped supports dominate instead. The drafting sheet also leaves its most distinctive dimension work beneath the generic facts stack. Use the world's existing physical lighting and precise measurement language more fully; extra ornament is not needed.

## material_fixes

1. FIRST VIEWPORT: compact the shared mobile header and SegmentFacts layout in variants-workspace.module.css, workspace-frame.module.css and segment-facts.module.css so the selected value and each variant's actual main control appear within the captured 375×1000 first viewport; move secondary evidence after the instrument and keep drafting's section beside or immediately after its longitudinal view rather than placing the entire aside first.
2. Truth / unexpected increase: move the positive forecast-versus-baseline warning and its model link outside the mobile-only collapsed measurements block in segment-facts.tsx; segment 130 must visibly disclose +0.76mm on initial mobile load in both themes.
3. Drafting fidelity: make the nominal contour contrast with the bore in light theme and show both interval bounds, with distinguishable keyed strokes or a band and readable dimensions, in the section passed by variants-workspace.tsx; retain the explicit schematic caption and avoid implying angular measurements.
4. Chart fidelity: give AlignedTrack readable vertical tick values and a selected numerical value for observation/difference tracks, including negative differences, and replace the theme-dependent prose legend with actual named forecast/measurement/interval swatches; selected segment 130 and a segment with negative difference must be quantitatively readable in both themes without estimating from unlabeled guides.
5. Gallery mobile control: replace the shrinking flex allocation in variants-workspace.module.css with a wrapping/grid arrangement that preserves a readable pipe selector and its full ID; verify gallery-375.png and gallery-compare-375.png retain separate pipe, segment and target-date controls.
6. Atlas mobile control: adapt the four layer choices in atlas.tsx/atlas.module.css into a readable wrapped control or Select below the available-width threshold, keeping all full labels and at least 44px targets; both 375px captures must have clear separation between interval, measurements and priority.
7. Material ceiling: produce a revised scanner/inspection steel-elevation raster from the incumbent steel/weld/support materials with controlled exposure and a visible cylindrical light-to-dark range; integrate coherent supports and weld relief rather than the current dominant flat bars, keep the data strip separate from decorative material, and recapture both themes at 375/1440.

## keep

Keep all five user-pinned compositions, the shared real-data selection and fixed scale, explicit forecast limitations, the original product route, and the gallery's actual implemented previews.
