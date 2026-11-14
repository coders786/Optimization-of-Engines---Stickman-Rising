# Depth-aware village / shadow-engine plan

## User decisions
Expanded village composition; cinematic atmosphere. Keep the existing live HTML untouched until a tested replacement wins. Preserve water, wind, lunar detail, fog, controls, sample counts and output resolution.

## Inspection and limitation
The current deck shadow is twelve PCF texture reads against one flattened screen-space mask, with three broad caster AABBs. It cannot distinguish a near roof from a distant roof when projecting shadows. Existing fog is a separate 2D atmospheric approximation. A richer village needs explicit caster depths, not more silhouettes pasted into the same plane.

## Proposed scene-specific engine: ray-footprint interval certificates
Represent building/tree silhouettes in a small set of depth planes, all generated from the same shape data as their artwork. For a directional ray (ax, ay, -1), receiver (X, 0, Z), and caster plane Zc, the mask intersection is (X + (Z-Zc)*ax, (Z-Zc)*ay). Twelve disk-distributed ray slopes retain penumbra quality. Occluder opacity is monotonic in solid/foliage channels, so per-channel min/max bounds conservatively bound transmission.

Before twelve reads, bound ALL twelve ray footprints plus bilinear support in source-mask texels. A min/max macrocell hierarchy can certify that every ray sees the same constant opacity. Uniform cells use that exact value; uncertain cells use the original twelve rays. Independent uncertain caster planes are combined PER RAY before averaging, never by multiplying independently filtered means (which leaks at overlapping shadows).

The hierarchy depends only on occluder masks—not on camera position, moon position, shadow length or softness. Moon dragging therefore changes lookup coordinates without invalidating it. Static village masks are uploaded/built once; only wind-driven source rectangles refit. This is a custom factorization for this layered scene combined with established min/max hierarchy and conservative-culling techniques, not a claim of globally novel shadow science.

## Predeclared alternatives and tests
1. Direct twelve-ray reference against all relevant depth planes.
2. Single-level (8 source texels) range certificate; full rays when footprint is too large or uncertain.
3. Hierarchical (4, 8, 16, 32, 64 texels) range certificates; same exact-ray fallback.

Hypothesis: hierarchy reduces native shadow sampling enough to pay for dirty-rectangle refits; a flat level may win if hierarchy pass overhead dominates. Reject any option with visible/image-error regression or slower total GPU time. Never reduce PCF taps or output resolution to claim a gain.

Correctness first: random receiver/light cases, low/grazing moon, overlapping casters, thin roof/chimney details, foliage, tile boundaries, fractional DPR and camera movement. Compare native final pixels and raw visibility against direct reference. Inspect certificate false-accept counts, not just mean error. Then benchmark fixed seeded trajectories using EXT GPU timer queries, non-disjoint checks and test-only readback completion, on the available SwiftShader software renderer. Record raw samples, median and p95, renderer identity, logical texture cost and cold-start cost. This is not Windows/hardware-GPU validation.

## Art / composition
Replace the small hut with a larger crafted timber-and-plaster inn: layered roof tiles and ridge caps, overhanging eaves, posts/beams, shutters, lit lattice windows, stone plinth/steps and a lantern. Add multiple prominent neighboring houses plus receding streets/terraces, fences, lanterns and a shrine/watchtower. Generate visible art and silhouette masks from shared polygon descriptions. Bake static detail once; keep dynamic light/glow work bounded. Background ground/shadow receivers and building depths must agree; no foreground shadow from a distant house unless its ray geometry actually reaches it.

## Delivery gate
Keep the old live source available. Promote only after numerical comparison, total-cost benchmark, visual inspection and browser/native-shader regression. If no new engine beats direct at matched quality, keep the new art with the measured best engine and disclose the failed hypothesis.

## Measured revision: caster specialization + scanline invariants
- Generic versus literal caster index, otherwise matched single-caster kernel: 83.487 vs 27.604 ms median on SwiftShader. This isolated test is not a frame-time claim.
- Unrolling all five casters inside material programs was rejected: 386.385 ms median of three trial medians, worse than the first 328.596 ms hierarchy implementation. Single-caster microbench gains did not transfer blindly.
- Separating native-resolution visibility from materials and specializing conservative depth-row bands measured 236.677 ms (three trial medians). All 12 sampled native-frame comparisons were byte-identical to the original direct reference. Still slower than the 172.614 ms live baseline; not a release.
- Profile: banded shadow kernels ~83 ms/frame total, native material passes ~75 ms. Next hypothesis is algebraic scanline factorization, not lower sample counts/resolution: at fixed receiver row, Z and all caster distances/radii are invariant in X. Source-mask coordinates are affine in receiver X and each disk coordinate. Compute those coefficients once per native row, retain the same rotated 12-ray disk, and retain per-ray products across planes. Conservative interval certificates continue to return only constant regions.
- Algebraic regrouping can change floating-point rounding. The existing native image gate stays at <=1/255 per channel against the original direct shader; record raw visibility errors separately rather than calling the new path bit-exact. Reject boundary/temporal artifacts. R32F visibility avoids half-float quantization. Packed fallback retains the prior exact-math banded shader if a floating-point row-coefficient target is unavailable.

### Tight-rectangle certificate hypothesis
The 4/8/16 square min/max tile tests measured 212.619/219.877/216.912 ms; no clear gain over scanline factoring. At tile size 8, 60.3% of native-ground tiles retained rays. Guarded power-of-two squares are overly broad, especially at receding village rows. Reject the extra classifier as a speed success.
Next compare an exact integer summed-area occupancy certificate. Encode each source texel as 0 (fully transparent), 2 (fully red-opaque), or 1 (anything uncertain, including foliage/antialiasing). A rectangle with sum 0 is provably all clear; sum 2*area is provably all opaque. Four integer prefix lookups answer an arbitrarily shaped rectangle without guard-cell overcoverage. Prefix sums never filter or approximate shadow opacity. Native uncertain tiles still use all 12 correlated rays. Cost to account for explicitly: per-changed-plane Canvas pixel read, O(width*height) CPU integer prefix construction, and R32UI upload, plus 6 MiB GPU atlas and matching CPU prefix arrays. Wind changes only the near plane; static village prefixes upload once. Measure whole-frame submission, completed latency and startup, not merely the final shader. Keep the min/max/one-level path as a comparison and fallback; do not claim this standard SAT primitive itself is new science.

### Measured CPU bottleneck / kinematic uncertainty envelope
Instrumented 12-frame CPU breakdown (`sat-cpu-stages.json`) attributes ~16–25 ms of changed-frame SAT work to Canvas pixel reads; integer prefix construction is generally ~1.5–2.4 ms, uploads ~0.2–0.4 ms. Avoiding reads is more valuable than shaving the prefix loop.
The next bounded-motion variant will create the near-plane SAT once per geometry generation. All source texels that ANY allowed wind pose could touch are permanently encoded 1 (uncertain). Outside this conservative motion envelope, the original static 0/2 occupancy certificates remain valid. Actual animated source masks still upload at the released cadence and every uncertain receiver keeps 12 rays. No frozen shadows or dropped wind samples.
Bound: |windX| <= .85 * maxWind; rack horizontal amplitude <= .0028+.0018*.85*maxWind; cherry amplitude <= .0024+.0015*.85*maxWind. The foliage shear's maximum horizontal multiplier is .26/.22. Dilation around an arbitrary anchor pose uses twice these displacement bounds, plus stroke/cap and raster support; vertical rack-end displacement <= .0036 screen heights. Any larger programmatic wind value rebuilds the envelope. Resize resets all geometry. Validate actual source occupancy across time/wind cases outside all uncertain texels, then re-run native reference comparisons and total-cost benchmarks. This is a conservative work certificate, not an approximation of moving opacity.
