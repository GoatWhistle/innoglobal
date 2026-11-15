## verdict

1. Resolved — mobile first viewport: the compact summary places the value and positive warning above each instrument; scanner/drafting selection surfaces, comparison controls, atlas layer/field controls and inspection next-area action now begin within the 375×1000 viewport. Drafting's scalar section follows its longitudinal drawing instead of preceding it inside the complete facts panel.
2. Resolved — positive difference: all ten required mobile captures visibly show the +0.76mm warning and model link before the instrument; FocusSummary keeps them outside disclosures.
3. Resolved — drafting section: the new light and dark captures show a contrasting nominal contour, separately styled P10 and P90, their numeric keys and the thickness dimension; the caption and constant-radius source preserve scalar/schematic meaning.
4. Resolved — quantitative chart reading: vertical tick values and selected observed/difference readouts are visible at both widths and themes; comparison-negative.png explicitly shows segment 0 at -0.72mm. Overlay and local profiles use named forecast, dated VTD and interval swatches.
5. Resolved — gallery pipe selector: gallery-375.png and gallery-compare-375.png show the complete pipe ID, a visible selection affordance and a separate target date. The replacement grid causes the segment-number regression listed below.
6. Resolved — atlas layers: the narrow Select replaces the colliding labels in both mobile captures; the sampled source supplies all four full option labels while retaining the wide segmented control.
7. Resolved — steel material: scanner/inspection recaptures at 375 and 1440 in both themes show a controlled light-to-dark cylinder, raster welds and supports, with the colored data strip outside the decorative material; the sampled render source uses reduced exposure and physical weld/support meshes.

## remaining

One regression introduced by the compact context-grid fix remains: the mobile segment NumberField displays `1…` instead of `130` in all ten required variant captures and both mobile gallery modes. Preserve the complete current segment value, including the second pipe's four-digit segment IDs, while retaining 44px increment/decrement targets and the first-viewport placement. Adjust the NumberField's actual inner width/padding or its grid allocation in variants-workspace.module.css; recapture the same mobile paths after correction. The experiment selector also truncates longer names within this grid, so allow that row enough width to show its selected variant while correcting the allocation.

All required recaptures are valid. No new search for unrelated findings or second detector was performed. The verdict is limited to the seven scored fixes and their observed regression.

disposition: fix
