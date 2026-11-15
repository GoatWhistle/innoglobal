# Larger assistant: documentation confirmation

Reviewed 2026-11-15. This remains an ordinary frontend extension of duppel's incumbent
Operate workspace. Preserve PRODUCT.md, DESIGN.md and the existing visual world.
No system replacement or additional design artifact is needed.

The updated COMPONENTS.md entry accurately records the 480px desktop assistant column,
compact facts, 800px expanded Drawer, independent message scrolling, 16px text and multiline
composer. Source confirms `Drawer.size` is optional and defaults to `default`; its existing
440px width remains unchanged. The assistant opts into `wide`. Width values remain in the
existing spacing-token source. Scope and Send share the composer footer.

Inspected `large-light-1440.png`, `large-dark-1440.png`, `large-light-375.png`,
`large-dark-375.png`, `expanded-light.png` and `expanded-dark.png` in the main assistant
worktree's `work/audits/engineering-assistant/`. The captures retain duppel, Onest, graphite/paper,
neutral controls, ruled surfaces and the existing pipe/profile. The enlarged panel and Drawer
use the same component language; the phone view keeps facts and the complete composer visible.

The documented endpoint remains a future frontend contract, with an honest unavailable state;
this size adjustment introduces no claim of a working backend or live model. The parent reports
382 tests and seven browser scenarios passing; the documenter did not rerun them.

No documentation correction is needed. Only this report was written during this handoff.
