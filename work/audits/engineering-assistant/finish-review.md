## verdict

Scope: scores the original three findings and the fix-batch formatting regression against the user's amended frontend-only instruction. Backend/provider implementation and live LLM completion are excluded.

1. Resolved under amended scope: not-connected.png shows the real missing endpoint as assistant unavailable; frontend-only contract makes no successful live answer claim.
2. Resolved: retries bind saved request and message ID. The browser regression verifies original segment130 → later131 → retry130, preserves the later message and keeps selection131; all six supplied browser scenarios pass.
3. Resolved: frozen message context shows its own original baseline and requested chart range, independently of current selection.
4. Resolved: refreshed not-connected.png visibly shows «База сравнения: 6 июля 2022 г.. 1 270–1 340 м»; source formats both endpoints with format.integer. The raw floating-point range is gone.

## remaining

Clear for the scored fixes. This ship verdict covers those fixes at frontend-only scope; it does not certify a connected assistant or a new whole-surface review.

disposition: ship
