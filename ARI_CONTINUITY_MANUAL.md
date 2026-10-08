# Ari Continuity Manual

Last updated: 2026-10-08
Purpose: precise handoff for any AI or developer continuing Ari without reconstructing prior work.

## 1. What Ari is
Ari is the clean, public, modular successor to the previous Ariadna Desktop stack.

Development order:
`clean chassis -> interface polish -> browser/navigation -> mobile -> models -> context/memory -> affect/identity`

The public repository must stay reusable by other people. Gus will later maintain a private/personal Ari profile layered on top of the public core.

Public Ari must contain editable systems for identity, personality, affect, memory and context, but must not contain Gus's private memory, credentials, cookies, tokens or personal configuration.

## 2. Canonical repository and branch
Public fork: `https://github.com/danumargus/Ari.git`
Upstream: `https://github.com/dsh-tauri/deepseek-harness-desktop.git`
Active branch: `ariadna-next-es`
Local checkout: `C:\Users\Gtorr\DSH_LAB\deepseek-harness-desktop`
Remote `ari`: public fork. Remote `origin`: upstream.

Known checkpoint before this manual:
`214e62e3f7170ab54b79d2fbdfb19c764a8523b3` - `Ari translation checkpoint and faster startup probe`

Previous translation commit: `919e01e` - `feat(i18n): add Spanish desktop shell support`
Previous successful CI commit: `41a25d763e2da37fe5ff5cef2523584e22062523` - `Ari_Windows_CI`

## 3. Local runtime and important paths
Tauri Nightly executable: `C:\Users\Gtorr\AppData\Local\DSH Tauri Nightly\deepseek-harness-desktop-nightly.exe`
Observed Nightly version: `0.0.0-nightly.20261008.g08e30b5`
DSH runtime: `0.2.0-rc.2`
DSH root: `C:\Users\Gtorr\AppData\Roaming\dsh-tauri-nightly\dependencies\dsh`
DSH CLI: `C:\Users\Gtorr\AppData\Roaming\dsh-tauri-nightly\dependencies\dsh\node_modules\.bin\dsh.CMD`
Active profile: `C:\Users\Gtorr\.dsh\profiles\web`
Desktop log: `C:\Users\Gtorr\AppData\Roaming\dsh-tauri-nightly\logs\desktop.log`
Harness log: `C:\Users\Gtorr\AppData\Roaming\dsh-tauri-nightly\logs\dsh-web.log`
Harness: `127.0.0.1:3080` and `0.0.0.0:3082`
Store: `C:\Users\Gtorr\AppData\Roaming\dsh-tauri-nightly\.store.dat`
Important setting: `close_action = tray`.
Clicking X normally hides Ari to tray, so reopening should not repeat a full cold start.

## 4. Frozen old Ariadna stack
Do not repair or route new Ari work through Ariadna Total Bridge unless explicitly requested.

Frozen paths:
- `C:\Users\Gtorr\Ariadna_Harness`
- `C:\Users\Gtorr\Ariadna_Harness_Home\profiles\ariadna-sdk`
- `C:\Users\Gtorr\Ariadna_Puente_Total`
- `C:\Users\Gtorr\Downloads\LEGADO_OS_BUILD`

Old ports: Core 18990, DSH 3092, hybrid 3456, Ariadna bridge 8810, OpenViking 1933, PC Ollama 11434, mobile Ollama ADB 11435, Mobile Link 11437, direct mobile llama-server 11439.
Ariadna Total Bridge previously returned MCP -32603 / HTTP 502. Use LEGADO Control Center for direct Windows work.

## 5. Current profile state
The current `web` profile is functional but not clean. Important provider packages present:
- `dsh-deepseek-web-login` `^0.6.38`
- `dsh-gemini-web` from GitHub `dtsummery/dsh-gemini-web`
- `@wlv-zedd/dsh-chatgpt-web` from GitHub `WLV-ZEDD/dsh-chatgpt-web`

Other notable packages include `@changfenhuang/dsh-genui`, `@wenbin_wb/dsh-bridge`, `@xmanrui/dsh-im`, `billion-context`, `dsh-better-sidebar`, `dsh-context`, `dsh-rewind-plugin`, `dshmarket`, Tauri internal packages, `dsh-translate-tab` and several local LEGADO donor plugins.

Do not assume the current `web` profile is the final public Ari profile. A clean reproducible profile is still required.

## 6. Spanish translation status
Spanish support has already been added to Ari source and checkpointed.
Existing translation documentation: `ARI_TRANSLATION_STATUS.md`.

Areas touched include:
- `src-tauri/src/service/patch/mod.rs`
- `src-tauri/src/service/patch/translation.rs`
- `src-tauri/src/service/workflow/launch.rs`
- `src/i18n/locales/en-US.json`
- `src/i18n/locales/es-ES.json`
- `src/i18n/locales/zh-CN.json`
- `src/layout/components/navbar.tsx`
- `src/layout/components/webview.tsx`

The live Nightly installation is not necessarily the same as current Ari source. Always distinguish source state from installed runtime state.

## 7. GitHub Actions build status
Workflow: `Ari Windows Build`
Run ID: `37803510556`
Commit: `214e62e3f7170ab54b79d2fbdfb19c764a8523b3`
Result: SUCCESS

Completed steps include Node/pnpm, Rust stable, frontend dependencies, MSI version preparation, package build, asset normalization and artifact upload.

Artifact: `release-windows`
Artifact ID: `11563365862`
Approximate size: 33.4 MB
Reported SHA-256: `01aab8d4a75724decb2fab7f02d91c3b9da54338d4ee9900318b2b2c0acf51ab`
Observed expiry: 2026-10-15

Build success proves compilation/package validity, not final runtime performance. Cold start must still be measured on the installed Ari build.

## 8. Startup investigation - verified results
This section is critical. Do not repeat random plugin-removal tests without reading it.

### Baseline
Cold startup of current Nightly `web` profile has repeatedly been about 18.5-20 s before HTTP 200 on port 3080.

### Tauri launch profiling
`desktop.log` contains `STARTUP_PHASE` timing.
Representative costs before optimization:
- stale sweep and port handling: ~1.37-1.40 s
- active runtime preparation: ~0.84-0.95 s
- patch entry preflight: ~0.46-0.59 s
- Windows spawn probe/register: ~2.51 s
- Tauri launch path total: ~5.4-5.6 s

The remaining large delay occurs after Node spawn, during DSH/profile/plugin activation.

### Windows early-exit probe optimization
In `src-tauri/src/service/workflow/launch.rs`, the fixed Windows early-exit probe was reduced from 2500 ms to 700 ms using `EARLY_EXIT_PROBE_WAIT_MS = 700`.
`rustfmt --edition 2021 --check src-tauri/src/service/workflow/launch.rs` passed.
The change compiled successfully in GitHub Actions.
Expected saving from this probe is about 1.8 s, but do not call that measured until the built Ari artifact is cold-start tested.

### A/B tests already done
Removing only ChatGPT Web from current profile bundles: startup remained ~20.0 s. It is not the sole bottleneck.
Removing only `billion-context`: startup remained ~20.0 s. It is not the sole bottleneck.
Setting `BILI_ATTACH_HEALTH_DEADLINE_MS=1500` made startup worse (~22.5 s). The environment change was reverted. Do not reapply it.

### Minimal DSH profile test
A temporary profile with only `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app` opened its test port in approximately `0.84 s`.
This is the strongest result: DSH base itself is fast.

### Tauri bundle group test
A temporary profile with the Tauri bundle group opened extremely quickly once warm (~0.19 s in that test).
Conclusion: the Tauri chassis itself is not the main source of the 13+ s delay.

### Provider tests
Representative temporary-profile observations:
- Gemini Web alone: ~10.38 s to ready in one test
- ChatGPT Web alone: ~10.47 s to ready in one test
- DeepSeek Web alone: not ready by ~12.38 s in one isolated test

With Tauri group included:
- Tauri + Gemini: failed to reach ready in one test and Node crashed
- Tauri + ChatGPT: still not ready at ~17.49 s in one test
- Tauri + DeepSeek: ready at ~14.1 s in one test

These tests show provider/community bundles can heavily affect the startup critical path.

### DSH loader behavior discovered
`@deepseek-ai/dsh-app-boot` computes recursive dependency closure before startup.
Relevant functions found: `profileDependencyNames()`, `dependencyClosure()`, `collectProfileScopePackages()`, `createRuntimeResolution()`.
It recursively reads dependency and peer-dependency package manifests with `readFileSync`.

This matters because provider plugins may pull large dependency trees such as Playwright, Chromium BiDi, tiktoken and others into profile resolution before the web server listens.

Architectural direction: heavy providers should not block Ari core startup. Prefer lazy/deferred loading or external sidecars where practical.

## 9. RAM constraint
The Windows machine has about 6 GB physical RAM.
During one startup investigation only ~394-451 MB was free. Several ChatGPT desktop processes together consumed more than 2 GB, and Memory Compression roughly another 500 MB.
Do not close user applications without permission, but account for memory pressure when interpreting cold-start measurements.
Avoid local full Rust builds unless necessary. Prefer GitHub Actions.

## 10. Provider status

### ChatGPT Web
Package: `@wlv-zedd/dsh-chatgpt-web` version `1.0.3`
Mode: `browser-only`
Sidecar: `127.0.0.1:17841`
Known facts: managed Chrome, automatic browser interaction, context window 256000, unofficial browser automation acknowledgement already accepted, browser authentication previously reported healthy by doctor.
Do not ask for the unofficial disclaimer again unless setup is reset.
Do not expose control tokens or secret config values.

### Gemini Web
Package: `dsh-gemini-web` version `0.3.0`
Provider: `gemini-web`
Kernel: `gemini-web2api-go.exe`
Observed port: `127.0.0.1:3461`
Its code registers provider and bootstraps the kernel asynchronously.
There has also been an old Gemini kernel from the frozen Ariadna bridge path. Do not kill it blindly without identifying ownership.

### DeepSeek Web
Package: `dsh-deepseek-web-login` version `0.6.38`
Provider: `deepseek-web`
Models: `deepseek-chat`, `deepseek-reasoner`
Supports Edge browser login and stores web-login state under DSH home.
At the last explicit auth check it had no logged-in account/cookie captured yet.
Interactive login may be required. The user performs account login personally; never handle passwords.

## 11. Mobile integration status
Current Ari includes `dsh-tauri-mobile-ui`.
It is primarily a mobile-responsive DSH UI layer for layout, sessions, workspace, sidebar and settings. It is not by itself complete Android control/ADB/Ollama integration.

Observed state:
- port `3082` listening from Harness
- `11435`, `11437`, `11439` not active during latest inspection
- `adb` was not available in PATH from current Tauri environment during inspection

Future mobile architecture should separate:
1. Android as Ollama/model server
2. Ari as native remote Ollama client
3. mobile as remote UI/navigation terminal
4. ADB as optional maintenance/control, not permanent backbone

Do not rebuild the old multi-hop mobile bridge unless specifically required.

## 12. Public Ari personality/affect architecture
This is the intended public architecture and is not yet fully implemented.
Public Ari must let every user edit all relevant personality layers from the UI.

Editable layers required:
- identity
- personality
- relationship model
- affect/emotion parameters
- memory policy
- context policy
- initiative/autonomy preferences
- voice/presence settings when available

The public repository ships neutral/example defaults only. A user's private Ari profile must live outside tracked source files.

Conceptual separation:
`ARI CORE -> identity -> personality -> affect -> memory policy -> context policy -> providers/models`

Gus's personal Ari is a private, richer profile layered on top of Ari Core.

### Context-loading rule
Do not inject everything on startup.
Desired flow:
1. startup loads only compact identity metadata
2. first real conversation loads relevant session context
3. memory is retrieved only when semantically relevant
4. affect state is loaded as a small dynamic state object
5. deeper project/history context is retrieved only on demand

The UI should eventually show a context budget/inspector with approximate token cost by layer.
Suggested modes: Light, Normal, Deep.
Goal: prevent giant context payloads and provider token explosions.

## 13. Personality and affect candidates already investigated
Strong identity candidate: `zuohaisu/dsh-ai-soul`.
Reason: persistent identity layer independent of underlying model.

Strong affect candidate: `jonah791/dsh-agent-emotion`.
Reason: six-dimensional runtime signal/emotion/personality-drift/status pipeline.

Lightweight soul donor: `Scorp1o117/dsh-soul-md`.

Companion/UI candidates exist, but do not install multiple personality engines at once. Avoid several plugins competing to rewrite system prompt or memory.

Preferred architecture:
- one identity engine
- one affect engine
- memory as separate service
- context router as separate service
- companion/avatar as presentation only

## 14. Public/private project split
Public repository: `Ari Core`.
Should contain clean UI/runtime, editable identity/personality/affect/context/memory-policy screens, profile import/export, neutral defaults and modular optional plugins. No private user data.

Private/personal layer: `Ari Gus`.
May contain locally Gus-specific personality configuration, relationship state, private memory, provider sessions, voice/avatar choices, mobile setup and additional automation/experimental modules.

Never commit private personal data to public Ari.

## 15. Design rule for the future Identity screen
Ari needs a dedicated editable screen, not only hidden settings.
Planned sections:
- name / identity
- how Ari addresses the user
- character traits
- tone
- humor
- formality
- initiative
- relationship posture
- boundaries
- emotional dimensions
- emotion persistence/decay
- memory policy
- context depth/budget
- voice/avatar/presence
- presets
- import/export profile

Suggested UI split:
Simple mode: name, how Ari addresses user, character, tone, initiative, relationship.
Advanced mode: affect weights, decay/persistence, thresholds, context token budgets, memory retrieval controls and expert prompt fragments.

## 16. Do not repeat / known dead ends
Do not:
- route new work through Ariadna Total Bridge
- assume Nightly runtime equals current Ari source build
- reapply `BILI_ATTACH_HEALTH_DEADLINE_MS=1500`
- blame `billion-context` alone for startup time
- blame ChatGPT Web alone for startup time
- create another giant custom provider bridge before checking native/provider/sidecar options
- make Harness survive real app exit without redesigning ownership/update/DLL-lock handling
- expose credentials or session tokens
- kill unknown Gemini/old-stack processes blindly
- commit Gus-specific private identity or memory to public Ari
- install multiple soul/emotion plugins simultaneously without understanding collisions

## 17. Next exact steps
1. Keep the public repository clean and reproducible.
2. Add public profile/identity architecture before importing Gus-specific private personality.
3. Design and implement editable `Identity / Personality / Affect / Memory & Context` UI.
4. Inspect `dsh-ai-soul` and `dsh-agent-emotion` internally before adopting, forking or extracting concepts.
5. Make heavy provider integrations lazy/deferred so Ari core can reach 3080 quickly.
6. Install/test the successful `214e62e` Windows build and measure real cold-start improvement from the 700 ms Windows probe.
7. Continue provider validation with real end-to-end responses.
8. Later integrate mobile as independent layers: remote Ollama, remote UI/navigation, optional ADB maintenance.
9. Only after Ari Core is clean and public-ready, layer Gus's private/vitaminized Ari profile on top.

## 18. Required handoff discipline
Every AI/developer continuing this project must:
1. read this file before editing
2. run `git status` and confirm branch/remotes
3. inspect live runtime separately from source
4. state whether a conclusion is measured, inferred or pending
5. preserve public/private separation
6. test before claiming success
7. update this document after meaningful architectural changes, new measured results, new ports, provider state changes or priority changes

If this file disagrees with live measured state, live measured state wins. Update this file immediately afterward.

## 19. Image generation integration (2026-10-08)
Ari Core now integrates image generation directly into the existing DSH chat instead of replacing the chat screen.

Architecture:
`Ari chat -> generate_image tool / media route -> LEGADO AI Photo Studio (127.0.0.1:8787) -> Cloudflare Workers AI -> durable DSH image attachment -> inline chat preview`

Primary engine:
- local PhotoStudio health: `http://127.0.0.1:8787/health`
- provider: Cloudflare
- model verified live: `@cf/black-forest-labs/flux-2-klein-4b`
- Ari does NOT depend on Ariadna Total Bridge for this path
- direct Cloudflare credentials are only an optional fallback through environment variables; no credentials are committed

Ari host routes added in `dsh-tauri-ui`:
- `GET /api/desktop/dsh-tauri-ui/media/image/status`
- `POST /api/desktop/dsh-tauri-ui/media/image/generate`

Model-facing tool:
- name: `generate_image`
- registered through `ctx.tools.register`
- generated bytes are persisted through the DSH attachment store
- the model-facing result uses a durable image attachment instead of injecting the full base64 image into conversation context

Client UI:
- `image-generation-overlay.tsx`
- silver/plasma animated generation panel in the existing chat shell
- phases: queued, generating, finalizing, done, error
- progress advances visually up to a ceiling while waiting for Cloudflare; this percentage is explicitly estimated because the current Cloudflare/PhotoStudio endpoint does not expose granular generation progress
- `generate_image` has a dedicated tool view and loads the durable attachment inline with the session-authorized DSH `loadImage` function

Measured verification on 2026-10-08:
- direct PhotoStudio 512x512 generation: PASS, PNG returned, model `@cf/black-forest-labs/flux-2-klein-4b`
- `dsh-tauri-ui` direct `tsdown` build: PASS
- `publint`: PASS
- Ari runtime after corrected deployment: `89/89` client modules ready with no new `dsh-tauri-ui failed to import`
- image status through Ari on port 3080: HTTP 200, engine `photo_studio`, online true, configured true
- image generation through Ari port 3080: PASS, Cloudflare PNG returned
- current warning from `bili-native-dsh` about `/api/generate` being a custom/non-model endpoint is expected; BILI does not proxy/compress that custom route

Local Nightly deployment note:
`C:\Users\Gtorr\.dsh\profiles\web\node_modules\dsh-tauri-ui` is a symlink to:
`C:\Users\Gtorr\AppData\Local\DSH Tauri Nightly\resources\node_modules\dsh-tauri-ui`
A backup of the prior `dist` was created as `dist.backup-ari-image-20261008` before the first live deployment.

Next media step:
reuse the same job/progress contract for the existing Colab video engine, but keep video as a separate tool/backend because its lifecycle is longer and job-based.

## 20. Video generation integration (2026-10-08)
Ari Core now has a job-based video integration for the existing Colab/Wan engine. The chat screen is preserved; video generation is added as a tool + progress UI.

Architecture:
`Ari chat -> generate_video tool -> Ari media/video routes -> standalone Colab bridge (127.0.0.1:8812) -> Colab CLI/session -> Wan 2.2 TI2V-5B worker -> job progress/result`

Important separation:
- this uses `colab_bridge.py` as a standalone local coordinator
- it does NOT route through Ariadna Total Bridge
- the old bridge remains only a donor/reference source for the proven Colab job contract
- no Colab token/URL is committed to GitHub

Ari host routes added in `dsh-tauri-ui`:
- `GET /api/desktop/dsh-tauri-ui/media/video/status`
- `POST /api/desktop/dsh-tauri-ui/media/video/generate`
- `POST /api/desktop/dsh-tauri-ui/media/video/refresh`
- `POST /api/desktop/dsh-tauri-ui/media/video/cancel`

Model-facing tool:
- name: `generate_video`
- returns quickly with a local job id and initial status
- generation continues asynchronously in Colab
- model context receives only compact job metadata, never MP4 bytes

Client UI:
- `video-generation-overlay.tsx`
- progress card in the same Ari conversation
- progress is real job progress from Colab, not an invented percentage
- shows current phase and completed/total shots
- supports cancellation through the Ari video cancel route

Verified engine contract:
- engine: `Wan2.2-TI2V-5B`
- transport: `colab_cli`
- modes: text-to-video and image-to-video
- nominal shot length: 5 seconds
- fps: 24
- resolution: 720p
- continuity: previous-shot last frame
- GPU class previously reported by persisted runtime: NVIDIA L4

Measured verification on 2026-10-08:
- standalone `colab_bridge.py` launched successfully on 127.0.0.1:8812
- bridge `/health`: HTTP 200
- bridge `/engine/status`: HTTP 200
- `dsh-tauri-ui` direct `tsdown` build with video integration: PASS
- `publint`: PASS
- Ari video status route after deployment: HTTP 200

Critical stale-state fix:
The persisted Colab runtime snapshot could say `session_ready=true` even when the real Colab CLI session no longer existed. A real job refresh returned `Session 'ariadna-video' not found`.
Ari now probes `/cli/session/status` and treats the session as unavailable when the CLI output contains `not found`, even if the old snapshot says ready.
Measured final state after restart:
- `online: false`
- `configured: true`
- `sessionReady: false`
This is the correct current state and prevents false-green UI and impossible job creation.

To run a real new video job later:
1. create/reconnect a real Colab session named `ariadna-video`
2. verify `/api/desktop/dsh-tauri-ui/media/video/status` returns `online:true` and `sessionReady:true`
3. then invoke `generate_video`
4. the chat card will poll refresh and display real progress

## 21. Kaggle Ollama integration (2026-10-08)
Ari Core now includes a generic remote Ollama provider package:
`packages/dsh-ollama-remote`

Current Kaggle provider:
- provider id: `ollama-kaggle`
- display name: `Ollama Kaggle`
- model verified live: `qwen3:8b`
- dynamic local config: `~/.dsh/ollama-remote/kaggle.json`
- contextWindow: 4096
- maxTokens: 1024
- keepAlive: 45m
- model discovery uses Ollama `GET /api/tags`
- inference uses Ollama `POST /api/chat`
- tool calls are projected into DSH tool-call blocks
- endpoint credentials are local/private and are not committed

Kaggle runtime:
- existing kernel recovered: `gustavotorre/ari-ollama-qwen3-8b`
- previous failure cause: Kaggle image lacked `zstd`, required by the current Ollama installer
- repaired by installing `zstd` before Ollama
- kernel runs Ollama behind a local authenticated HTTP proxy
- Cloudflare Quick Tunnel exposes only the authenticated proxy, not raw unauthenticated Ollama
- the changing tunnel URL is published separately and saved locally in the dynamic config file

Measured verification:
- Kaggle kernel reached RUNNING after repair
- dynamic endpoint announced and saved locally
- authenticated `/api/tags`: PASS, model `qwen3:8b`
- `dsh-ollama-remote` isolated build: PASS
- real adapter end-to-end test: PASS, returned exact marker `KAGGLE_OLLAMA_OK`
- first real inference was 96.27 s, interpreted as cold model load; do not treat this as warm latency
- DSH effective config (`--dump-config`) includes `ollama-remote` and `ollama-kaggle/qwen3:8b`
- Ari cold startup with the first heavy adapter version rose to 43.886 s
- after removing the unnecessary `@deepseek-ai/dsh-llm` dependency/inheritance and using the adapter contract directly, startup returned to 13.981 s

Design rule:
Do not reintroduce Gradio/ntfy as the inference transport. Discovery may publish the current endpoint, but inference itself is standard Ollama HTTP through the authenticated tunnel.
The same `dsh-ollama-remote` package is intended to serve the mobile Ollama provider next.
## 22. Mobile Qwen/Vulkan integration (2026-10-08)
Ari now uses the same `dsh-ollama-remote` package for the phone, but with a dedicated `llama-cpp` protocol instead of the slower classic Ollama-over-ADB path.

Measured phone state:
- device: Xiaomi 12 Pro / model `2201122G`, serial `f65e03c8`
- phone LAN IP observed: `192.168.1.138`
- model blob present in Termux: Qwen3 8B, about 5.2 GB
- fast runtime binary: Termux Ollama bundled `llama-server`
- launcher: `C:\Users\Gtorr\Ariadna_Puente_Total\tools\start-llama-direct-mobile.sh`
- phone server: `127.0.0.1:11439`
- runtime: llama.cpp with Vulkan enabled
- model health after load: `/health` returned `{status: ok}`

Measured verification:
- direct llama.cpp `/completion` probe through temporary USB forward: PASS
- first measured probe in this work: 9.76 s for a 16-token capped request
- DSH adapter end-to-end probe: PASS, returned exact marker `MOBILE_DSH_OK`
- DSH adapter measured time: 7.77 s
- effective DSH profile contains `ollama-mobile`, protocol `llama-cpp`, model `qwen3:8b`
- Ari runtime restarted successfully after the change; measured startup ready time 17,454 ms on this run

Architecture:
`Ari -> dsh-ollama-remote -> ollama-mobile -> llama.cpp /completion -> Qwen3 8B on phone Vulkan`

Current transport note:
- the phone server currently binds loopback and Windows reaches it through a temporary ADB forward on port 11439
- this is deliberately safer than exposing an unauthenticated llama.cpp server to the LAN
- ADB is therefore still used only as the local transport/maintenance fallback for this runtime
- preferred future transport is direct LAN only after the installed llama.cpp build is confirmed to support authenticated access; do not expose 11439 unauthenticated on Wi-Fi

Context policy for the mobile provider:
- context window 2048
- max output tokens 256
- the adapter converts the DSH conversation to ChatML
- `/no_think` is injected at the transport layer so Qwen3 does not expose chain-of-thought style reasoning text
- identity/personality/context remain owned by Ari/DSH; the mobile model is only the inference engine

Do not revive the old multi-hop 11435/11437 bridge architecture unless needed for recovery. Prefer the new single provider abstraction and the Vulkan direct path.

## 23. Mobile Vulkan live UI validation and DSH adapter compatibility fix (2026-10-08 late)
The live DSH runtime had advanced beyond the adapter contract used by the first `dsh-ollama-remote` implementation. A real Ari UI turn failed before provider I/O with `registration.adapter.prepareCall is not a function`.

Compatibility fix in `packages/dsh-ollama-remote/src/index.ts`:
- added `prepareCall(provider, model, signal)` to bind model resolution and dispatch
- added `imageRequestPricing()` neutral fallback
- updated model metadata to the current DSH shape: `context.contextWindow`, `defaultMaxTokens`, `inputModalities`
- kept the adapter lightweight and did not re-add `@deepseek-ai/dsh-llm` as a heavy package dependency

Measured progression:
- the old adapter contract failed in Ari UI before inference
- after the contract fix, Ari reached llama.cpp correctly
- a Creator-mode request produced 3538 prompt tokens and exceeded the stable phone context of 2048
- a 4096-context experiment was rejected with forced `-ngl 99` because device memory could not fit it
- allowing automatic GPU-layer fitting at 4096 made short probes work, but larger Ari prompts crashed the Xiaomi Vulkan/Mesa path with a workgroup-barrier compute-shader error
- the phone was therefore restored to the previously stable runtime: context 2048, full Vulkan offload with `-ngl 99`, loopback `127.0.0.1:11439`, ADB forward transport

Stable usage rule:
`ollama-mobile/qwen3:8b` should use DSH `Modo mínimo` for local/mobile inference. Do not use Creator mode as the default for this provider: its large prompt/tool surface defeats the purpose of the 8B phone engine and can exceed the stable context budget.

Final live Ari UI verification:
- first clean `Modo mínimo` turn returned exact `ARI_MOBILE_MIN_OK`
- Ari UI reported `Completed in 15s`
- the same session reported about 167 tokens of working context for the first turn
- immediate warm second turn returned exact `ARI_MOBILE_WARM_OK`
- Ari UI reported `Completed in 6s`
- direct adapter-style short probe also returned exact `MOBILE_STABLE_OK` in 6.09 s at about 3.13 generated tokens/s, with `/no_think` suppressing visible reasoning
- current Tauri restart reached HTTP 200 on port 3080 in about 10.84 s on this run

Current recommended architecture remains:
`Ari -> dsh-ollama-remote -> ollama-mobile -> ADB forward 127.0.0.1:11439 -> llama.cpp Vulkan -> qwen3:8b`

Do not expose the unauthenticated llama.cpp endpoint on Wi-Fi. ADB remains transport/maintenance fallback until an authenticated direct-LAN path is available.

## 24. Automatic Spanish translation for dynamic UI metadata (2026-10-09)
Ari's translation plugin now handles not only static shell strings but also dynamic presentation metadata.

Architecture:
- static shell strings remain in the Spanish locale dictionaries
- dynamic plugin/extension display text goes through `ctx.locale.resolveText(...)`
- `ari-translate` wraps that presentation resolver only while `es-ES` is active
- technical identities remain untouched: package ids, routes, commands, model ids, provider ids and executable names are never rewritten
- translated strings are cached in `localStorage` so each value is translated once and reused

Automatic backend policy:
`MyMemory key-free HTTP translation -> persistent local cache -> Ari LLM fallback`

The previous Google translate endpoint experiment was rejected because the current network received automated-query protection responses. MyMemory was tested from Windows and returned `Embedded Browser -> Navegador integrado` successfully.

Live UI verification in Plugins:
- `Agent Teams` -> `Equipos de agentes`
- `Auto Authorization Review` -> `Revision de Autorizacion Automatica`
- `Automation tasks` -> `Tareas de automatizacion`
- `Voice input` -> `Entrada de voz`
- plugin descriptions are being translated as well
- the Plugins page keeps package ids and runtime controls unchanged

Translation page UI was redesigned into a native Ari-style control surface with:
- a large automatic translation header and global toggle
- cards for state, engine and identity protection
- normal mode hides implementation details
- Advanced contains optional local LibreTranslate endpoint, diagnostics and a manual translation test
- current normal engine label is `Automatico rapido`

Current limitation:
- raw skill invocation names are technical identifiers and must remain unchanged
- skill descriptions and MCP/tool presentation surfaces still need their own safe presentation hooks where those packages bypass `ctx.locale.resolveText`; do not translate invocation ids such as `/skill-name` or tool function names

## 25. Skill and MCP presentation translation (2026-10-09)
The dynamic Spanish translation layer now reaches the Skills surface without changing invocation identity.

Persistent source change:
- `packages/dsh-tauri-extension/src/client/components/skills-tab.tsx` sends only `skill.description` through `window.__ARI_TRANSLATE_DYNAMIC__`
- `skill.name` remains untouched because it is the technical invocation id used by `/skill-name`
- when the translator is unavailable, the original description remains visible

Nightly runtime validation:
- the precompiled `dsh-tauri-extension/dist/client.cjs` in Tauri Nightly was patched with one exact guarded description expression after a backup
- Node syntax validation passed
- Harness returned HTTP 200 after restart
- live Skills page kept ids such as `diagnose-windows-sandbox-acl`, `find-skills`, `genui` and `skill-creator` unchanged while their human descriptions appeared in Spanish
- the translation cache drains cards progressively; untranslated text safely remains original until its cached translation arrives

MCP safety rule:
- the MCP panel currently exposes dynamic `serverName`, command/args or URL values as technical identity, so those values are intentionally never translated
- static MCP presentation copy is handled by Ari's normal locale fallback and automatic translation layer; live verification showed the panel description and empty-state copy changing to Spanish while no MCP server identity was modified
- if future MCP metadata gains a separate human `title` or `description`, translate only that presentation field, never the server id/tool prefix/command/URL
