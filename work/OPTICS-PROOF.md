# Moonlit Sakura — measured optics upgrade

**Released:** `moonlit-sakura-optimized.html` · Wind & Water Optics Edition  
**Live:** same port-3000 preview; refresh it to load the update.  
**Single-file:** all code, shaders, procedural assets and styles are embedded; no network assets or libraries.

## What changed

- **Water:** enlarged irregular puddle; moving moon, cloud, aurora and structure reflections; three analytically differentiated gravity/capillary waves; four interactive ripple slots; Schlick Fresnel for IOR 1.333; colored absorption. Reflections use a **2.5D projective proxy**, not 3D scene ray tracing.
- **Air:** an analytically integrated gust carrier drives cloud/fog displacement and contributes to tree motion, mist, drifting petals and wave strength. The new wind control preserves displacement when its strength changes, avoiding a phase jump.
- **Moon:** once-baked 640² procedural mare/crater relief, spherical normals and diffuse/regolith-like shading. This is procedural artwork, not a photographic or scientifically calibrated lunar map.
- **Clouds and fog:** Beer–Lambert-shaped extinction, forward-scattering cloud lighting, smooth illumination spill, premultiplied composition and an adaptive scene-space visibility cache with exact native-pixel reconstruction in classified shadow-edge cells and around the compact door light.
- **Native shader factoring:** water runs only in its projected rectangle; the upper sky is specialized at an existing branch boundary so it carries no inactive fog loops. This is scene-specific engineering combined with established optics and GPU techniques, not a claim of universally novel algorithms.

## Final controlled timing

**Chromium 159 · ANGLE/Vulkan SwiftShader software renderer. These are WebGL GPU-query times, not hardware-GPU results, browser-presented FPS, or total compositor frame times.**

| Variant | Median GPU time¹ | Median of trial p95 values |
|---|---:|---:|
| Previous live scene | 184.3 ms | 230.8 ms |
| New optics, direct fog reference | 190.0 ms | 238.7 ms |
| **Released adaptive optics** | **170.5 ms** | **232.1 ms** |

The released scene used about **7.5% less median GPU time than the old scene**, and **10.3% less than the new direct-fog reference**, in this environment. **Tail latency did not reliably improve.** No universal FPS or large hardware speedup is claimed.

¹ Median of trial medians. Same seeded scene, 960×720 viewport and backing, DPR 1, cache rate fixed at 30 Hz, 60 Hz simulation trajectory, 12 warmup frames, then 3 trials × 32 frames per page. Final order: old / direct / adaptive / adaptive / old. Thus old and adaptive each have six trials (192 measured frames), direct has three (96). Raw samples are retained. Asynchronous `EXT_disjoint_timer_query_webgl2` queries were non-disjoint; explicit one-pixel test readback ensured completion. Production adds neither readback nor `gl.finish()`.

The previous scene was already optimized. This is a modest measured improvement while adding effects—not a claim of an order-of-magnitude gain. Extra one-time moon baking and shader compilation are outside the warm-frame benchmark.

## Rejected designs and why

1. **Combined deck/water shader:** first candidate median ≈196.9 ms versus the initial old-scene ≈181.5 ms. Rejected instead of released. Pass queries localized extra cost to the enlarged deck program. Moving water to a small native-resolution pass removed that regression. Shader control-flow/register pressure was a hypothesis, not hardware-counter proof.
2. **Plain fog interpolation:** mean errors looked small, yet worst final-channel errors reached 150/255 in portrait. Coordinates localized the problem to the tiny bright doorway source. Even a 1024×384 plain cache retained large local errors, so increasing cache size alone was rejected.
3. **Only a source guard / local derivative guard:** removed the largest smear, but sparse edge errors remained. A four-fetch reconstruction cost more without solving every local extremum. The released cache-rate 3×3 classifier stores separate moon/door edge flags in the otherwise spare alpha byte; each uncertain native pixel recomputes only the affected visibility integral.
4. **Blindly shrinking fields:** five dimensions were checked for image error, with an additional timing sweep. Smaller fields were not demonstrated to be faster after exact-edge work. The default remains 512×192; High uses 768×288. No output-resolution, particle-count, octave or PCF-tap reduction was introduced.

## Accuracy, not just averages

`compare-fog.cjs` compares the **same new optics**, at the **same time and camera/light state**, with adaptive versus direct visibility/noise. Five field sizes × four conditions × two viewports = 40 comparisons. Conditions include a low/grazing moon, camera parallax, and a deliberately retained one-refresh lag. Landscape backing: 960×720. Portrait backing: 538×1165 under the retained DPR cap (430×932 CSS viewport).

At the released default **512×192** field, over its eight conditions:

- Final **premultiplied RGBA** error in the fog region: mean 0.0046–0.0072 code values out of 255 per channel.
- **99th-percentile error: 0/255. Worst final-channel error: 2/255.**
- A separately selected shadow-edge mask (neighbor changes >4/255 in direct visibility): **worst final-channel error 2/255**.
- The raw visibility field is **not mathematically exact everywhere**: worst R/G error was 16/255 in these cases. The final radiometric weighting and exact-edge path keep the measured final-image error much smaller. These are tested-case results, not a universal error bound.
- Upper-sky specialization versus the unspecialized shader: **bit-identical in the packed-target browser test** (zero differing channels).

The two default fog targets occupy **786,432 logical bytes = 0.75 MiB**, before driver padding. This is the fog-field cost, **not the entire added GPU memory**; the sky/reflection textures and bounded water-copy texture also consume memory.

## Regression evidence

All completed against the exact released source:

- JavaScript syntax, Canvas fallback mock, float-target mock and packed-target mock; 2,500-frame trajectories per mock mode.
- **Eight** native Mesa GLES fragment programs compiled and linked.
- Real Chromium: controls, moon drag, deck-click ripples, reset, HUD/ray inspector, transparent Canvas borders and premultiplied WebGL output.
- Fractional-DPR damage comparison: no residual trails; differences within retained raster-rounding tolerances.
- Portrait/rotation, missing optional float16 Canvas, real packed cloud targets, separate Canvas fallback.
- Actual `WEBGL_lose_context` loss/restoration recovered successfully; GL error 0.
- Wind velocity versus the derivative of its analytic displacement: maximum numerical error about 2.1e-10 in the Float64 mathematical test. Interactive displacement jump was about 1.1e-8 in the browser test.
- Preserved counts: 120 twinkles + 320 baked stars; 16 mist banks; 248 blossoms; 18 petals; 10 embers; 5 birds; 24 foreground + 14 extreme particles. Four cloud octaves, six cloud transport samples, twelve deck PCF taps, ten lunar and nine doorway fog visibility steps retained.
- Live HTTP 200, served bytes equal the tested file; final live Chromium inspection: no errors or warnings.

**Not validated on the user's Windows Edge/hardware GPU.** The previous black-layer issue was not reproduced on that hardware. The earlier compositor-safe alpha/clearing fixes are retained.

## Inspect and reproduce

In the scene's controls, switch **Fog visibility → Adaptive / Direct**. Wind is independently adjustable. Shift-drag moves the moon; tapping the deck creates a ripple; H hides the controls.

Primary raw evidence:

- `evidence/benchmark-{baseline-a,baseline-b,reference-final,optimized-a,optimized-b}.json`
- `evidence/fog-error.json` (all sizes, cases, maxima and shadow-edge statistics)
- `evidence/browser-optics.json`, `evidence/profile-{baseline,optimized}.json`
- `evidence/optics-plan.md` (hypotheses and rejected iterations)
- `evidence/release-manifest.json`, `evidence/optics-summary.json`

Workspace reproduction (requires the installed Playwright/Chromium and Mesa environment):

```sh
python3 build-scene.py                 # candidate only; never edits live HTML
node smoke-optics.cjs
python3 validate-shaders.py shaders-optics
node test-optics-browser.cjs
node compare-fog.cjs
node bench-optics.cjs baseline-a reference-final optimized-a optimized-b baseline-b
```

Released HTML SHA-256:

```text
b1845d5d2b3adfeb47f3d810a3556e37f90ab9d510f05b34090d0ef51ac8bff0
```

Frozen previous live file: `versions/moonlit-sakura-before-optics.html`.
