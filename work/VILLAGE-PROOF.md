# Moonlit Sakura — village / shadow-engine proof

## Decision: experimental candidate, not promoted

The larger village and rebuilt inn are implemented. The custom shadow engine is substantially faster than directly tracing the **same expanded scene**, but the complete expanded scene is still slower than the smaller live release. **The optimization-first release gate has not been met.** The existing main live HTML is unchanged.

- Candidate: `moonlit-sakura-village.html` — **145,355 bytes**.
- Candidate SHA-256: `14143ecfb36335586a2f24ef099c0e26e3a836b1f86799da64eb90a219d8e36b`.
- Unchanged live release: `moonlit-sakura-optimized.html` — **96,166 bytes**.
- Live SHA-256: `b1845d5d2b3adfeb47f3d810a3556e37f90ab9d510f05b34090d0ef51ac8bff0`.
- Machine-readable results: `evidence-village/final-summary.json`.
- Inputs and identities: `evidence-village/candidate-manifest.json`.

## What changed visually

Fifteen buildings occupy five explicit caster depths: the enlarged main inn, prominent neighboring houses and a watchtower, plus receding village rows. The baked artwork includes roof tile channels/ridge caps, deep eaves, timber framing, shutters, lit lattice windows, plinths, steps, lanterns, fences and a paved central street with terraces. Shared architectural profiles generate artwork and shadow silhouettes.

Long directional shadows now distinguish the five caster planes rather than flattening every building into one screen mask. The released water/reflection system, moon, aurora, clouds, analytic wind, particle counts, quality controls, compositor safeguards and Canvas fallback remain. Shadow softness is a separate control.

**Scope limit:** this is a layered 2.5D renderer. Ground shadows are depth-aware; atmospheric shafts remain a separate 2D fog approximation, not a newly implemented depth-correct volumetric transport solver. Water reflections remain the released projective proxies, not full 3D ray tracing.

## Technique: depth bands, native row packets and motion-envelope certificates

This is a scene-specific engine combining custom factorization with established conservative culling and integer summed-area tables. It is **not a claim of globally novel shadow science**.

### 1. Keep the reference calculation

For receiver `(X, 0, Z)`, caster depth `Zc`, distance `d = Z - Zc`, and directional slope `(ax, ay, -1)`, a ray reaches the caster at:

```
sourceX = X + d * ax
sourceY = d * ay
```

Twelve rotated disk offsets perturb the slope. All uncertain planes are multiplied **inside each ray**, then the twelve products are averaged. Multiplying separately averaged plane shadows would be wrong at overlapping penumbrae; this implementation does not do that.

The Direct control retains the generic twelve-ray reference against the same scene geometry.

### 2. Factor invariants, not resolution or quality

Receiver depth and caster distances/radii are invariant along a native output row. A small RGBA32F row table stores source-coordinate coefficients. Conservative depth-row bands select shaders with literal caster indices, avoiding generic indexing where the geometry already tells us which planes could contribute.

Visibility is still evaluated at **native output resolution**. Every uncertain receiver retains the original **12 correlated rays**. There is no lower-resolution shadow image to upscale.

Algebraic regrouping changes floating-point rounding slightly; numerical comparisons below measure this instead of calling the implementation bit-exact.

### 3. Certify only all-clear or all-opaque footprints

A source texel is encoded as:

- `0`: fully clear in both opacity channels;
- `2`: fully red-opaque;
- `1`: anything uncertain, including antialiasing and foliage.

An exact R32UI prefix-sum atlas answers a footprint rectangle with four integer reads. Since every code is in `[0,2]`:

- rectangle sum `0` proves every contributing texel is clear;
- rectangle sum `2 × area` proves every contributing texel is opaque;
- every other result retains the twelve rays.

The queried rectangle bounds all receivers in the native tile, every rotated disk offset and bilinear texture support. A partially active caster cannot certify the entire tile opaque. No average-opacity estimate substitutes for a ray calculation.

### 4. Eliminate repeated source-pixel reads without freezing motion

CPU instrumentation found roughly **16–25 ms** spent reading the changing near-plane Canvas on warmed changed frames; prefix construction was usually about **1.5–2.4 ms**. Rebuilding that prefix every wind tick was the wrong cost tradeoff.

The selected engine instead marks the complete swept motion envelope as permanently uncertain (`1`). Outside the envelope, static clear/opaque certificates remain valid. The real animated mask still uploads normally, and all uncertain receivers still trace the actual twelve rays.

Bounds follow the code's analytic wind and geometry amplitudes:

```
|windX| <= 0.85 * maxWind
rack amplitude <= .0028 + .0018 * .85 * maxWind
cherry amplitude <= .0024 + .0015 * .85 * maxWind
maximum foliage shear multiplier = .26 / .22
```

A dilation around the anchor includes twice the displacement bound, vertical branch motion, stroke/cap support and raster padding. It initially covers wind strengths through `2`, exceeding the UI maximum `1.8`; a larger programmatic wind strength rebuilds it. Resize rebuilds geometry.

In each final default benchmark page there were **five prefix uploads total**, **zero hierarchy refits**, and **41 actual source-mask uploads**. The latter confirms that wind masks were not frozen to obtain the gain. Light/camera-only edits triggered no prefix upload.

## Final controlled performance comparison

**Environment:** Chromium 159, ANGLE Vulkan **SwiftShader software GPU**, 960×720 backing pixels, DPR 1, fixed seed, cache cadence 30 Hz, same released effects/sample counts. These are not hardware-GPU FPS claims.

Order: live A → direct A → one-level A → selected A → selected B → one-level B → direct B → live B. Each page used 12 warmup frames and three 32-frame trials: **six trials / 192 timed frames per mode**. Reported center is the median of trial medians. GPU queries were checked for disjoint results. Harness-only pixel readback measured completion; production contains neither WebGL framebuffer readback nor `gl.finish()`.

| Scene / execution | GPU elapsed center | Median trial p95 | Completed-frame center |
|---|---:|---:|---:|
| Smaller live release | **175.46 ms** | 246.22 ms | 184.60 ms |
| Expanded village, generic Direct | 374.01 ms | 454.07 ms | 386.60 ms |
| Expanded village, native packets / one-level intervals | 218.08 ms | 310.10 ms | 225.35 ms |
| Expanded village, selected motion-envelope / footprint SAT | **200.75 ms** | 284.76 ms | **213.35 ms** |

The selected engine measured:

- **46.3% less GPU elapsed time** than directly tracing the same expanded scene;
- **7.9% less** than the native one-level alternative;
- but **14.4% more GPU time than the smaller live release**;
- and no improvement to the smaller release's tail latency.

Final submission-time p95 was about **1.85 ms** for the selected mode, versus **1.60 ms** for the smaller live release. Prefix reads no longer repeatedly stall the render thread during normal wind animation.

Raw samples and identities are in `evidence-village/benchmark-*-final-{a,b}.json`; the combined console log is `final-counterbalanced-benchmark-output.txt`. This is a fixed default-view trajectory, not a performance guarantee for every moon pose, device or browser. Six light/camera/softness poses are covered by correctness tests, not a hardware performance survey.

## Numerical and browser proof

### Actual production visibility, not only helper functions

`compare-native-shadows.cjs` compares the selected native visibility framebuffer against the original generic Direct calculation:

- **4,447,140 native receiver pixels** over six poses and two screens;
- maximum visibility error **0.000164062**;
- largest case p99 error **0.000009**;
- **zero sampled certificate false accepts** and no nonfinite values;
- light-only edits: **zero prefix uploads**.

Actual tested backings were 960×720 and 538×1165. The portrait page requested device scale 1.5, but the retained low-end governor capped the scene at 1.25. Separate High-mode damage tests exercised fractional DPR 1.3.

`compare-shadows.cjs` additionally checks 589,824 fixed regular/seeded world receiver points per comparison mode, and native final-frame pixels for all twelve cases. The generic flat/hierarchy helper comparisons were exact in these samples; the selected production frame's maximum native channel difference from Direct was **1/255**, with **no channels over 1**. Its debug-only hierarchy refits are not enabled in the production SAT path.

These are sampled results, not a universal floating-point or cross-hardware equivalence guarantee.

### Motion-envelope validation

`test-motion-envelope.cjs` tested **480 wind/time poses**, including strengths 0, .7, 1.8, 2 and a programmatic 3, with times through 2,500 seconds across landscape and portrait geometry. It checked **151,075,280 static-classified source texels** and found **zero violations** outside uncertain regions. Strength 3 correctly caused one additional prefix upload/rebuild.

### Regressions

- Five real-browser regression groups passed: controls/15-building count/premultiplied alpha; fractional-DPR damage clears; portrait rotation/optional float16 Canvas fallback; WebGL-unavailable Canvas fallback; packed targets and real context loss/restoration.
- Both the normal float/SAT path and packed path recovered from actual WebGL context loss.
- Zero sampled alpha-contract violations, no residual particle trails, GL error 0.
- Three 2,500-frame JavaScript mock runs passed. The mock deliberately stubs expensive SAT pixel work; actual SAT pixel work is covered by the real-browser numerical tests.
- **68 exported fragment programs** compiled and linked with native Mesa OpenGL ES 3.2 (25.0.7). Current exports are in `shaders-village-final/`, not the older `shaders-village/` folder.

Evidence: `native-shadow-error.json`, `shadow-error.json`, `motion-envelope.json`, `browser-village.json`, `final-smoke-output.txt`, `final-native-shader-validation.txt` under `evidence-village/`.

## Memory and startup: costs, not hidden wins

At 960×720, tracked live WebGL **logical texture** allocations were:

| | Smaller live release | Selected village |
|---|---:|---:|
| Texture count | 12 | 23 |
| Logical texture storage | 10.93 MiB | **27.56 MiB** |
| Programs after first default render | 8 | 27 |
| Navigation → first completed frame, one observed run | 2.30 s | **4.38 s** |

The village adds **16.63 MiB of logical texture storage**. Known CPU shadow arrays use a pooled 1.5 MiB scratch prefix plus two .375 MiB occupancy/envelope buffers. The five source canvases represent another 5.5 MiB of logical RGBA backing. These figures are **not total process, browser-compositor, driver or GPU-resident memory**.

Two same-size rebuilds returned to exactly the same live texture count and logical bytes; no texture leak was observed in that test. Startup numbers are individual observations, not statistical averages. Lazy shader variants and initial Canvas reads contribute to startup cost. These costs are further reasons not to replace the main live release yet.

## Rejected hypotheses

The work did not assume that an attractive idea was an optimization:

- Literal indexing won a matched single-caster microbenchmark (27.6 vs 83.5 ms), but unrolling all five casters inside the large material shaders **lost** in the complete scene (~386 ms). Rejected.
- Native material separation / depth bands improved the first ~329 ms hierarchy candidate to ~237 ms; scanline factoring improved it further, but neither alone beat the live release.
- Guarded 4/8/16-pixel square tile classifiers did not deliver a clear total-cost gain. Tight integer footprint queries replaced their overly broad squares.
- Factoring fog into an extra native pass did not pay for itself and added memory. Rejected.
- Tiny-quad GPU work compaction required a separate jitter-identity pass to satisfy the image gate, then measured roughly **490 ms** on SwiftShader. Rejected, not generalized into a claim that instancing is bad on all GPUs.
- Aurora column packets added a pass without a convincing whole-frame win. Rejected.

Intermediate observations are not the final benchmark. The final numbers above are the counterbalanced run on the identified candidate.

## Reproduce

The HTML is self-contained and requires no build tools or network assets to view. To rebuild/test in the development workspace (Playwright/Chromium and native EGL/GLES libraries required for the harnesses):

```bash
python3 build-village.py
node compare-native-shadows.cjs
node compare-shadows.cjs
node test-motion-envelope.cjs
node smoke-village.cjs
python3 validate-shaders.py shaders-village-final
node test-village-browser.cjs
node measure-village-resources.cjs
node bench-village.cjs baseline-final-a direct-final-a flat-final-a interval-final-a interval-final-b flat-final-b direct-final-b baseline-final-b
```

**Next gate:** reduce native shadow/fog total cost, startup compilation and added memory without dropping rays, resolution or retained effects; validate on an actual hardware GPU and Windows/Edge. Until then, this is a working, numerically checked **candidate**, not a completed overall-performance upgrade.
