# Restore existing 3D controls on the main workspace

Mode: Operate. Code-led restoration, incumbent duppel visual authority.
User asks to replace the main 2D pipe with the existing 3D pipe and expose all already-written
controls and cuts. Explicit correction: «не придумывай, а просто возьми».

Restore the previous PipeWorkspace camera bar, route/unroll/section URL state, shortcuts 1/2/3,
PipeControls coordinate form and previous/next, SegmentStrip picking/range, and original PipeScene.
The existing engine handles cuts and unroll-to-section selection; do not change its geometry,
materials, shaders, camera or oil simulation. Light section keeps original drawing treatment;
dark section retains original oil material. Explain rather than invent new controls.

3D appears at the former main 2D pipe position, not inside a closed disclosure. Remove SteelPipe
and its raster. Keep comparison and selected evidence. Hide the duplicate SceneReadout in this
composition because the same facts already occupy the adjacent panel and the overlay covers cuts.
Keep the existing WebGL failure fallback for access to values on unsupported devices.

Test all three modes, URL persistence, coordinate and unroll picking, both themes at 375/1440.
Review captures and source against the original implementation, not a new identity or a new comp.
