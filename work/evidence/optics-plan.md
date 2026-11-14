# Optimization-first optics plan

## Measured baseline

Fixed 960 × 720 viewport/backing, DPR 1, 60 Hz simulation step, camera fixed, deterministic random seed, four cloud octaves, six cloud light samples, twelve deck shadow taps. Chromium 159 / ANGLE Vulkan SwiftShader (CPU software rasterizer, not the user's GPU). EXT_disjoint_timer_query_webgl2 was available and not disjoint. Three trials of 32 measured frames after 12 warmups. Baseline median GPU times: 181.47, 181.49, 179.20 ms. These are software-renderer GPU-query times, not browser-present FPS predictions.

A first wall-clock test using only gl.finish returned implausibly small JavaScript times; discarded that measurement. The retained harness uses asynchronous GPU queries and an explicit one-pixel readback to enforce completion. Neither readbacks nor gl.finish are added to production.

## Hypotheses BEFORE implementation

1. Fog visibility sheet: the old native-resolution sky shader performs up to 10 moon-occlusion and 9 door-occlusion texture reads per fog pixel. Those quantities vary in world/scene space, independently of presentation resolution. Cache the SAME visibility integrals in a compact RGBA8 field aligned with scene coordinates. Keep a direct per-pixel reference mode for matched visual-error and speed tests. Refresh on occluder/light changes. Unlike generic resolution reduction, wood, moon, particles, water normals and specular shading remain native resolution. Test field dimensions rather than asserting zero error.
2. Reflection postage atlas: reuse already-rasterized structure islands, a static sky texture and a lunar texture. Update only a bounded low-frequency reflection proxy; calculate analytic wave slopes, Fresnel and ripple rings at presentation rate. Avoid rerendering the scene from a second camera. This is a 2.5D projective reflection proxy, NOT full 3D ray tracing.
3. Shared wind carrier: evaluate an analytically integrable, deterministic gust velocity/displacement once per time key. Use it for cloud advection, fog, tree motion, airborne particles and water wave amplitudes. No fluid-simulation grid or per-particle noise textures.
4. Lunar surface bake: albedo, crater relief and spherical/regolith lighting are one-time CPU work, uploaded once. No new lunar surface shading cost each frame.

## Optical models and approximations

- Beer–Lambert extinction: T = exp(-optical depth), foreground alpha = 1 - T.
- Henyey–Greenstein-shaped forward scattering, evaluated in the low-frequency cloud pass; this remains a 2D participating-media approximation.
- Water Schlick Fresnel with IOR 1.333; analytic derivatives of gravity/capillary waves; colored water absorption. Wave angular frequencies computed from the dispersion relation once.
- Physically motivated lunar diffuse/regolith shading, with procedural—not photographic—surface data.
- Premultiplied color must remain <= alpha on the transparent output surface.

## Acceptance tests

A/B/C same viewport and simulation trajectory: old scene / new optics with direct fog visibility / new optics with cached visibility. Preserve all existing particle counts, four cloud octaves and twelve deck shadow taps. Measure median and p95 GPU time, record all raw samples and renderer identity. For new direct vs cached versions measure pixel error, silhouette-local error and cached-field memory. Check independent sky/water screenshots, controls, drag, ripples, rotation, fractional-DPR damage and fallback. Publish the winner only after tests. No universal hardware FPS claim.

## First result / rejected design

The combined optics deck shader produced trial medians 211.07, 190.56, 196.87 ms, versus the old scene's roughly 181 ms. It was not released. Pass queries localized the issue: the sky pass improved (about 98 -> 84 ms median in the profiling run), but the enlarged water/aurora/reflection branch made the entire deck program more expensive (about 64 -> 79 ms). This motivates a native-resolution, tightly scissored water-only pass, copying only the puddle's underlying deck rectangle on GPU. No CPU readback, no second scene camera, no screen-resolution reduction. Hypothesis: remove expensive water control flow/register pressure from the much larger dry-deck pass, retaining identical water calculations in the small ROI.

## Fog accuracy result before promotion

Five field dimensions were compared against the SAME direct visibility/noise equations (256×96, 384×144, 512×192, 768×288, 1024×384), four light/camera/time conditions, landscape and portrait native backings. A 512×192 sheet had low mean final-channel error (about .02–.12 / 255) yet unacceptable maxima: 41 landscape / 150 portrait. Worst-pixel coordinates consistently localize to the tiny bright doorway source, where visibility changes too rapidly for bilinear interpolation; even 1024×384 retained >100/255 portrait errors. This disproves accepting the cache on aggregate averages or raising its size blindly. Next hypothesis: retain the compact cache but calculate the original 9-tap door visibility directly in a small physical-aspect-correct source island (radius .055 scene-height units). All original shadow taps and native-resolution composition remain unchanged. Test accuracy again, then measure the cost.

## Edge fallback and native shader factoring hypothesis

A .055-radius exact doorway island removed the extreme smear, but portrait edge errors remained (sparse maxima of 11–14 code values for the 512×192 cache). A derivative-guided exact visibility path was tested: cache-texel-normalized local R/G changes > .045 invoke the original visibility equations for that channel. It substantially reduced mean/p99 errors but cost time (about 177 ms median versus 164 ms for the unguarded split). Do not report the unguarded fast layout as the final gain. Per-program control-flow/register overhead already mattered for the deck; upper-sky pixels never call fog visibility at all. New hypothesis: specialize the SAME upper-sky expression with a constant visibility sheet, scissor the native sky at its existing y=.36 branch boundary, and retain the full precise fog shader below. This removes inactive fog loops/register live ranges from the upper shader without lowering any resolution, samples or particle counts. Require matched pixel output at the split boundary and rebenchmark.


## Released result

Exact released source: b1845d5d2b3adfeb47f3d810a3556e37f90ab9d510f05b34090d0ef51ac8bff0. Final counterbalanced software-renderer comparison: old 184.259 ms, direct new 189.985 ms, adaptive 170.455 ms (median of trial medians). No reliable p95 improvement; hardware GPU/Windows Edge unvalidated. Default-field final image and shadow-edge errors <= 2/255 over eight cases; 40 field-size/case comparisons retained. Full report: OPTICS-PROOF.md. Promoted tested file atomically; live HTTP200 byte-exact.
