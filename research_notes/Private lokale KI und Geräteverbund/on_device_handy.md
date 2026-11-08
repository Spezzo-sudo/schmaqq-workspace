# Running AI models fully on-device on smartphones (Android and iOS), state as of November 2026

Scope note: 17 tool calls of research on 2026-11-08. Primary sources (Google AI Edge docs, Android Developers, Apple Developer/WWDC, arXiv) are preferred. Items from earlier than 2026 are marked [older]. Anything not verified in this session goes to Inferences or Gaps.

## 1. Which models are suitable for phones (sizes, multimodality, licenses, quantization and RAM)?

### Takeaway
In late 2026 the default open-weight choice for phones is **Gemma 4 E2B/E4B**: Apache 2.0, text + image + audio, 128K context, with official LiteRT-LM builds of about 2.6 GB and 3.7 GB. On iOS, Apple's built-in ~3B system model (rebuilt for iOS 27, now accepts images, 8K context) costs nothing in app size, but it cannot be swapped out and it only runs on Apple Intelligence devices. On Android, Gemini Nano (via AICore/ML Kit) is a similar "free" system model, but only on a limited set of flagship devices.

### Cited Findings
**Gemma 4 (released 2026-04-02)**
- Gemma 4 came out on April 2, 2026, and Google dropped its earlier custom Gemma license for **Apache 2.0** (commercial use, modification and redistribution allowed, no royalties) — [TechWyse](https://www.techwyse.com/news/ai-search/google-deepmind-gemma-4-open-models-apache-2-0-release); [DataNorth](https://datanorth.ai/news/google-releases-gemma-4-open-models); Wikipedia also gives April 2, 2026 as the stable release date — [Wikipedia](https://en.wikipedia.org/wiki/Gemma_(language_model)). (A MindStudio blog dates the release to 2025. That conflicts with the other sources and should be treated as an error — [MindStudio](https://www.mindstudio.ai/blog/gemma-4-e2b-vs-e4b-edge-models-audio-vision-phone).)
- Family: E2B (~2.3B effective parameters), E4B (~4.5B effective), 26B A4B MoE and 31B dense. E2B/E4B have 128K context; the large models have 256K. E2B/E4B take **native audio input** (ASR and speech-to-translated-text). Image/video input is supported across the family — [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/google-releases-gemma-4-frontier-open-models-under-apache-2-0/); [DataNorth](https://datanorth.ai/news/google-releases-gemma-4-open-models). Unconfirmed: noze.it reports an additional "Gemma 4 12B" with audio and 256K context. No other source mentions it — [noze.it](https://noze.it/en/insights/gemma-nuova-release).
- Official LiteRT-LM files: Gemma4-E2B **2583 MB**, Gemma4-E4B **3654 MB** — [Google AI Edge LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview). Ready-to-run artifacts are on Hugging Face (`litert-community/gemma-4-E2B-it-litert-lm`). There is a separate Qualcomm NPU variant of E2B, and it is not interchangeable with the CPU/GPU file — [HF litert-community](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm); [Gemma 4 on Google AI Edge](https://developers.google.com/edge/litert-lm/models/gemma-4).
- Peak CPU memory for Gemma4-E2B: S26 Ultra 1733 MB (CPU backend) / 676 MB (GPU backend); iPhone 17 Pro 607 MB (CPU) / 1450 MB (GPU) — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview). (This is CPU-side memory only. GPU memory is not reported separately.)

**Gemma 3n [older, 2025] and other models in the LiteRT-LM catalog**
- Gemma-3n-E2B 2965 MB, Gemma-3n-E4B 4235 MB, Gemma3-1B 1005 MB, phi-4-mini 3906 MB, Qwen2.5-1.5B 1598 MB, Qwen3-0.6B 586 MB, Qwen2.5-0.5B 521 MB, FunctionGemma 289 MB. The page also lists Llama as supported and calls the list a subset — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).
- EmbeddingGemma 2 (multimodal embeddings): 740M (485 MB, text/image/video/audio), 440M text-vision (388 MB), 270M text (165 MB) — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).

**Llama 3.2 1B/3B, Qwen2.5, Phi (academic benchmarks)**
- The "Is Your NPU Ready for LLMs?" study (July 2026) benchmarks Qwen2.5-1.5B/7B, Llama-3.2-1B/3B and Phi-3.5-mini at **w4** (MLLM/Genie partly w4a16) on 16 GB phones — [arXiv 2607.05475](https://arxiv.org/html/2607.05475v1).
- The ExecuTorch paper (May 2026) compares Qwen3 0.6B, Llama 3.2 1B and Phi4 Mini on the Galaxy S25 — [arXiv 2605.08195](https://arxiv.org/pdf/2605.08195).

**Apple Foundation Models (system model)**
- 2025 tech report [older]: a ~3B on-device model optimized for Apple silicon, plus a PT-MoE server model for Private Cloud Compute — [arXiv 2507.13575](https://arxiv.org/pdf/2507.13575); [Apple ML Research](https://pr-mlr-shield-prod.apple.com/research/apple-foundation-models-tech-report-2025). Per a secondary summary: 2-bit QAT weights, and KV-cache sharing between two blocks (−37.5 % memory/prefill). Not checked against the paper text — [EmergentMind](https://www.emergentmind.com/articles/2507.13575).
- WWDC26 / iOS 27: the on-device model was "rebuilt from the ground up" with better reasoning and tool calling. It **accepts images as input** (UIImage/CGImage/CVPixelBuffer/file URL, any size; larger images use more tokens). `SystemLanguageModel().contextSize` returns **8192** in Apple's example. `tokenCount(for:)` has been available since iOS 26.4 — [WWDC26 "What's new in the Foundation Models framework"](https://developer.apple.com/videos/play/wwdc2026/241/).
- No new parameter count for the iOS 27 model was found. ChatForest says Apple has not published one — [ChatForest](https://chatforest.com/builders-log/apple-foundation-models-ios-27-on-device-llm-api-builder-guide/). "AFM 3 Core" as a model name appears only in one blog post — [ofox.ai](https://ofox.ai/blog/apple-foundation-models-3-wwdc-2026-developer-read/).

**Gemini Nano (Android system model)**
- Runs in the AICore system service. AICore manages download and updates, so the model does not count against the app's storage or RAM budget. There are "token limits, device hardware limitations, and model capability boundaries" — [Android Developers: Gemini Nano](https://developer.android.com/ai/gemini-nano).
- The Prompt API works best on the Pixel 10 series with "nano-v3" [Oct 2025] — [Android Developers Blog](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html).

### Inferences
- For a 2-person team building a "private assistant", Gemma 4 E2B is the most pragmatic cross-platform open-weight model. It covers text, images and audio in one model, it is Apache 2.0, it has an official runtime with Kotlin/Swift/Flutter bindings, and it fits in about 2.6 GB of download. E4B is roughly 2.5–3× slower (see section 3) and better suited to 12–16 GB flagships.
- Apple's system model and Gemini Nano cost no download, but the team gets no control over model version, context size (8K on iOS) or availability. They work as an optional "fast path", not as the only base.
- Rule of thumb from the numbers: at w4/Q4, a model of about 1–1.5B is roughly 0.5–1.6 GB, and about 3–4B is 2.5–4 GB on disk. Download size is in the same range as the files listed above.

### Gaps
- Qwen3 small models (1.7B/4B) and SmolLM2/3 had no current phone benchmarks or RAM figures in the sources found. Only Qwen3-0.6B appears in the LiteRT-LM table.
- Official license texts for Llama 3.2 (Llama Community License), Phi-4-mini (MIT, from prior knowledge) and Qwen (Apache 2.0, from prior knowledge) were not checked in this session.
- The parameter count and quantization of Apple's iOS 27 on-device model are unclear.

## 2. Runtimes: which ones exist, which use NPUs, licenses, bindings (Flutter/React Native/Kotlin)?

### Takeaway
**LiteRT-LM** (Google) is the most mature cross-platform path in 2026: Android, iOS, web and desktop, with CPU/GPU everywhere and NPU on Android. Kotlin is stable; Swift and JS are early preview; Flutter is community-maintained (`flutter_gemma`). On iOS, Apple's Foundation Models framework adds a `LanguageModel` protocol in iOS 27 that also wraps local MLX/Core AI models. NPUs (Qualcomm QNN/Genie) speed up prefill substantially, but not decode, and NPU decode is more energy-hungry.

### Cited Findings
**Google LiteRT-LM / AI Edge**
- Platforms: Android, iOS, web, macOS/Windows/Linux, IoT. CPU on all of them. GPU on Android/iOS/macOS/Windows/Linux. **NPU marked supported on Android**; not listed for iOS — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).
- Bindings: CLI, Python, **Kotlin, C++ = stable**; **Swift = Early Preview**; JavaScript (web) = Early Preview; **Flutter = Community (`flutter_gemma`)** — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).
- The newest GitHub release is v0.19.0. It adds multi-token prediction (MTP) for E4B on desktop/Raspberry Pi, plus Swift, JavaScript and Flutter APIs — [GitHub google-ai-edge/LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM). (No license is stated on the overview page. The GitHub repo is described as "open-source".)
- The `litert-lm` CLI can pull Gemma 4 E2B directly from Hugging Face — [Gemma 4 on Google AI Edge](https://developers.google.com/edge/litert-lm/models/gemma-4).

**ML Kit GenAI APIs (Gemini Nano via AICore, Android)**
- APIs as of today: Prompt API (`GenerativeModel`: text-only or multimodal, structured output, multi-turn via `sessionId`), **AgentRunner** (multi-step tool-calling loops), Speech Recognition, Speech Translation, Text-to-Speech, Image Description, Summarization, Proofreading, Rewriting, and a **Semantic Search/Embedding API** (text + image embeddings with AndroidX AppSearch) — [Android Developers: Gemini Nano](https://developer.android.com/ai/gemini-nano).
- Privacy architecture: AICore follows Private Compute Core principles. It has no direct internet access (downloads go through Private Compute Services) and keeps no record of inputs/outputs. The ML Kit GenAI Additional Terms of Service apply — [Android Developers: Gemini Nano](https://developer.android.com/ai/gemini-nano).
- Hybrid fallback to Gemini Flash/Pro in the cloud via Firebase AI Logic is possible — [Android Developers: Gemini Nano](https://developer.android.com/ai/gemini-nano).
- Devices [older, June 2025]: Pixel 9 series, Samsung Galaxy S25, Xiaomi 15, Motorola Razr 60 Ultra and others, on MediaTek Dimensity, Snapdragon and Tensor — [InfoQ](https://www.infoq.com/news/2025/06/google-mlkit-genai-gemini-nano). Prompt API best on Pixel 10 (nano-v3) [Oct 2025] — [Android Developers Blog](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html).

**Apple Foundation Models framework (iOS 26+, extended in iOS 27)**
- iOS 27: new **`LanguageModel` protocol**. `SystemLanguageModel` (on-device) and `PrivateCloudComputeLanguageModel` (PCC, 32K context, reasoning levels) conform to it. Open-source implementations **`CoreAILanguageModel`** (Apple Neural Engine) and **`MLXLanguageModel`** let local models plug into the same `LanguageModelSession`. Anthropic and Google publish Swift packages for their cloud models — [WWDC26 Session 241](https://developer.apple.com/videos/play/wwdc2026/241/).
- New in iOS 27: system tools (`OCRTool`, `BarcodeReaderTool`, a **Spotlight search tool for fully local RAG** over a Core Spotlight index), Dynamic Profiles, an Evaluations framework, an `fm` CLI (macOS 27) and a Python SDK (`apple_fm_sdk`). The core framework is open source — [WWDC26 Session 241](https://developer.apple.com/videos/play/wwdc2026/241/).
- PCC is free for developers with fewer than 2 million first-time downloads. Users get a daily PCC quota (higher with iCloud+), with no exact figures. Note: PCC is cloud, so it is not "fully on-device" — [WWDC26 Session 241](https://developer.apple.com/videos/play/wwdc2026/241/).
- 2025 [older]: the framework offers guided generation, constrained tool calling and LoRA adapter fine-tuning — [EmergentMind summary of arXiv 2507.13575](https://www.emergentmind.com/articles/2507.13575). Conflict: one DEV post says there is still no bring-your-own-fine-tune path for the on-device runtime in iOS 27 (it points to Core AI), while ChatForest claims iOS 27 brings on-device fine-tuning — [DEV Community](https://dev.to/arshtechpro/wwdc-2026-apple-just-opened-the-foundation-models-framework-to-any-llm-provider-5ejn); [ChatForest](https://chatforest.com/builders-log/apple-foundation-models-ios-27-on-device-llm-api-builder-guide/).

**llama.cpp**
- OpenCL backend for Qualcomm Adreno. The Adreno 830 (Snapdragon 8 Elite) is a verified device. Q4_0 is optimized (build with `--pure` recommended); Q4_K/Q6_K still need optimization. Adreno 6xx is not supported. Flash attention does not always help — [llama.cpp OPENCL.md (mirror)](https://huggingface.co/hekod19045/llama-cuda/blob/main/docs/backend/OPENCL.md); [Qualcomm Developer Blog, Nov 2024](https://www.qualcomm.com/developer/blog/2024/11/introducing-new-opn-cl-gpu-backend-llama-cpp-for-qualcomm-adreno-gpus).
- Field report (Reddit, May 2026, anecdotal): on a Snapdragon 8 Elite, CPU was mostly fastest for prefill and decode. OpenCL was only worthwhile for small dense models, and offloading more than 4 layers crashed under Termux — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1tg3ssd/snapshots/2026-05-23T00%3A36%3A34.219378Z).
- On the S25, llama.cpp had higher decode throughput than ExecuTorch for Qwen3 and Phi4 Mini, with comparable prefill — [ExecuTorch paper arXiv 2605.08195](https://arxiv.org/pdf/2605.08195).

**ExecuTorch (Meta/PyTorch)**
- The paper (May 2026) compares ExecuTorch with llama.cpp, ONNX Runtime, LiteRT and CoreML. The **QNN delegate (Qualcomm NPU)** performs "very strongly" on NPU inference compared with LiteRT and ONNX — [arXiv 2605.08195](https://arxiv.org/pdf/2605.08195).

**Qualcomm QNN/Genie, MLC LLM, MNN, mllm (NPU comparison)**
- On the OnePlus 15 (SM8850), Genie reaches **15× the prefill speed** of llama.cpp-NPU (1463.7 vs 115.1 tok/s), with similar decode. NPU decode costs **2–4× the energy** of CPU/GPU decode — [arXiv 2607.05475](https://arxiv.org/html/2607.05475v1).
- MLC-LLM (GPU) performed poorly in this study: 42.4 prefill / 19.6 decode tok/s for Qwen2.5-1.5B on the OnePlus 15 — [arXiv 2607.05475](https://arxiv.org/html/2607.05475v1).
- A further study argues that NPUs are "not always faster" and calls for stage-aware CPU–NPU scheduling (Snapdragon 8 Gen 3) — [arXiv 2605.27435](https://arxiv.org/pdf/2605.27435).

### Inferences
- **NPU in practice:** today, NPUs pay off mainly for long prompts (RAG context, image tokens) and for prefill. For chat decode, CPU/GPU is as fast or faster and more energy-efficient. NPU paths are vendor-specific (QNN for Qualcomm). The NPU build of Gemma 4 E2B is a separate artifact, so the team would ship and test several model files.
- **Recommended stack for 2 people:** (a) Android: LiteRT-LM via Kotlin (stable), with ML Kit GenAI/Gemini Nano as an optional fast path on supported devices. (b) iOS: either LiteRT-LM Swift (Early Preview, which is a risk) or Apple Foundation Models + `MLXLanguageModel`/`CoreAILanguageModel`. That keeps one iOS API and allows the system model as a fallback. (c) Cross-platform UI in Flutter: `flutter_gemma` (community) as the binding to LiteRT-LM.
- llama.cpp (GGUF) remains the most flexible choice for "any model". On Android, though, it mostly runs on CPU, with limited OpenCL benefit.

### Gaps
- MediaTek NeuroPilot / Dimensity NPU: no current sources found (LLM tok/s, SDK access, licenses).
- MLX Swift (iOS) benchmarks, Core ML LLM numbers on the iPhone 17/18, and React Native bindings (e.g. llama.rn, react-native-executorch) were not researched in this session.
- Licenses for runtimes not checked in this session: llama.cpp (MIT), MLC LLM (Apache 2.0), ExecuTorch (BSD), LiteRT-LM (Apache 2.0). These come from prior knowledge and must be confirmed in each GitHub repo.
- Current official Gemini Nano device list for 2026: the device-support page was not reached. The Nov 2026 status is therefore unclear.
- Qualcomm AI Hub (precompiled models, on-device profiling): not researched.

## 3. Real benchmarks: prefill/decode tok/s, RAM, download sizes, battery and thermals

### Takeaway
On 2026 flagships, Gemma 4 E2B decodes at about **47–57 tok/s** (GPU/CPU), with prefill at 2,900–3,800 tok/s on GPU and TTFT of about 0.3 s. E4B decodes at about 18–25 tok/s. 2024 flagships (S24 Ultra) manage only about 9–16 tok/s with Gemma 3n. No reliable mid-range numbers or sustained-load thermal/battery measurements were found. This gap matters for the decision.

### Cited Findings
**Google LiteRT-LM (vendor numbers)** — all from the [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview):
| Model | Device | CPU prefill / decode tok/s | GPU prefill / decode tok/s | TTFT | Peak CPU RAM |
|---|---|---|---|---|---|
| Gemma4-E2B (2583 MB) | Samsung S26 Ultra | 557 / 47 | 3808 / 52 | 1.8 s CPU / 0.3 s GPU | 1733 MB CPU / 676 MB GPU |
| Gemma4-E2B | iPhone 17 Pro | 532 / 25 | 2878 / 56–57 | 1.9 s / 0.3 s | 607 MB / 1450 MB |
| Gemma4-E4B (3654 MB) | S26 Ultra | 195 / 18 | 1293 / 22 | – | – |
| Gemma4-E4B | iPhone 17 Pro | 159 / 10 | 1189 / 25 | – | – |
| Gemma-3n-E2B (2965 MB) [older model] | S24 Ultra | 111 / 16 | 816 / 16 | – | – |
| Gemma-3n-E4B (4235 MB) | S24 Ultra | 74 / 9 | 548 / 9 | – | – |
| Gemma3-1B (1005 MB) | S24 Ultra | 177 / 33 | 1191 / 24 | – | – |
| phi-4-mini (3906 MB) | S24 Ultra | 67 / 7 | 314 / 10 | – | – |
| Qwen2.5-1.5B (1598 MB) | S25 Ultra | 298 / 34 | 1668 / 31 | – | – |
| Qwen3-0.6B (586 MB) | Vivo X300 Pro | 165 / 9 | 580 / 21 | – | – |
| FunctionGemma (289 MB) | S25 Ultra | 2238 / 154 | – | – | – |
- The page itself is inconsistent: iPhone 17 Pro GPU decode is listed as 56 in one table and 57 in the other — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).

**Independent study "Is Your NPU Ready for LLMs?" (arXiv, 2026-07-06)** — [arXiv 2607.05475](https://arxiv.org/html/2607.05475v1)
- Devices: Xiaomi 17 / OnePlus 15 (SM8850, Snapdragon 2025), Xiaomi 15 (SM8750), Xiaomi 14 (SM8650), each with 16 GB. w4, 256 prefill + 256 decode tokens, more than 400 configurations.
- Qwen2.5-1.5B on the OnePlus 15 (prefill / decode tok/s; decode energy µJ/token): llama.cpp CPU 299.9 / 55.7 (9.7e4); llama.cpp GPU 754.8 / 50.3 (1.4e5); MLC GPU 42.4 / 19.6; Genie NPU 1463.7 / 23.0 (3.2e5); MLLM NPU w4a16 966.8 / 34.3 (8.7e4); MNN NPU 700.9 / 10.3.
- Qwen2.5-7B on the OnePlus 15: Genie NPU 1411.1 / 16.8 tok/s; llama.cpp CPU 58.6 / 14.3. Llama-3.2-1B Genie NPU prefill 2316.1 tok/s. Llama-3.2-3B MLLM NPU prefill 886.2 tok/s.
- Energy levers: W4A16 on Genie gives 2.2–2.6× prefill and 2.3–2.6× decode speedup and −53.5 to −66.9 % energy per token (but +30 % perplexity on Llama-3.2-1B, only +1 % on 3B). CPU DVFS at mid-range clocks saves 42–50 % energy for −13 to −20 % throughput. A best-practice config saves an estimated 54.8 % energy on NPU (an estimate, not measured).
- Thermals: the devices were cooled below 28 °C before each run, so **no throttling data** is reported.

**ExecuTorch paper** — the Galaxy S25 got a 60-second cooldown between runs, again to exclude thermal effects — [arXiv 2605.08195](https://arxiv.org/pdf/2605.08195).

**Sustained load** — the paper "LLM Inference at the Edge: Mobile, NPU, and GPU Performance Efficiency Trade-offs Under Sustained Load" (arXiv 2603.23640, sections including "Thermal Throttling in Mobile SoCs") exists, but its results could not be extracted (compressed PDF) — [arXiv 2603.23640](https://arxiv.org/abs/2603.23640).

### Inferences
- Interactive chat with Gemma 4 E2B is comfortable on 2025/26 flagships: about 50 tok/s is faster than reading speed, and TTFT is 0.3 s on GPU. E4B at about 20 tok/s is still usable. On 2024 flagships, Gemma 3n/E4B at about 9 tok/s is slow.
- Mid-range devices (8 GB RAM, older Snapdragon 7-series/Dimensity) would probably get only a fraction of this. With E2B (2.6 GB of weights plus runtime), the 8 GB RAM class is borderline once other apps are running. For mid-range, plan models of ≤1.5B (Qwen2.5-1.5B, Gemma3-1B) or Gemini Nano. This is an inference with no measured mid-range data behind it.
- All academic benchmarks deliberately rule out throttling. For long batch jobs, sustained throughput should be expected to be clearly below the peak values. The team should measure this on their own devices.

### Gaps
- No reliable 2026 measurements found for mid-range phones (e.g. Pixel 10a, Galaxy A56/A57).
- No battery-drain numbers (%/hour, Wh per 1,000 tokens) and no thermal throttling curves for phones under continuous LLM load.
- No measured numbers for Apple's on-device system model (tok/s), MLX Swift or Core ML on the iPhone 17/18.

## 4. Background execution: can a large batch job (e.g. 10,000 photos) run overnight?

### Takeaway
**Android:** yes, practically. WorkManager with charging/idle constraints works, and foreground services of type `dataSync`/`mediaProcessing` are limited to **6 hours per 24 h** for apps targeting Android 15+, with the budget resetting when the user opens the app. The job must be resumable. **iOS:** `BGProcessingTask` (requiresExternalPower) is opportunistic, with no guaranteed duration. `BGContinuedProcessingTask` (iOS 26+) only works when the user starts it explicitly with a progress UI, and Apple explicitly excludes automatic work such as photo sync. **Background GPU access is reportedly not available on iPhones** (only iPad). A 10K-photo job on iOS therefore has to be split into small resumable chunks, run on CPU/ANE, or run partly in the foreground.

### Cited Findings
**Android**
- For apps targeting Android 15 (API 35)+, foreground services of type `dataSync` and the new `mediaProcessing` may run **at most 6 hours within 24 hours**. The two types have separate budgets. On timeout the app has a few seconds to call `stopSelf()` (otherwise a fatal `RemoteServiceException`). Once the budget is used up, a new start throws `ForegroundServiceStartNotAllowedException`. The timer **resets when the user brings the app to the foreground**. Google recommends starting only from direct user interaction or using WorkManager instead — [Android Developers: Foreground service timeout](https://developer.android.com/develop/background-work/services/fg-service-timeout); [Android 15 behavior changes](https://developer.android.com/about/versions/15/behavior-changes-15).
- For testing, the timeout can be shortened with `adb shell device_config put activity_manager data_sync_fgs_timeout_duration <ms>` (or `media_processing_fgs_timeout_duration`) — [Android Developers](https://developer.android.com/develop/background-work/services/fg-service-timeout).

**iOS**
- Background execution is "opportunistic and discretionary". Apps are suspended by default. Apple advises deferring non-urgent work until charging, processing in batches, saving progress often, and responding to expiration. Users control this through Low Power Mode and Background App Refresh — [WWDC25 "Finish tasks in the background"](https://developer.apple.com/videos/play/wwdc2025/227/).
- `BGProcessingTask` is explicitly meant for things like "running an ML model on generated data" and has `requiresExternalPower`/`requiresNetworkConnectivity`. **Apple gives no concrete duration or time limit** — [WWDC25 Session 227](https://developer.apple.com/videos/play/wwdc2025/227/).
- `BGContinuedProcessingTask` (iOS/iPadOS 26): must start from an **explicit user action**. Apple says not to use it for maintenance, backups or **photo syncing**; tasks started without such an action may be cancelled. The system UI shows progress, and the user can cancel at any time. **Tasks that report no progress are expired**, and if progress is slow the system asks the user whether to continue. Strategy is `.queue` (default) or `.fail`. GPU access is available "on supported devices" via an entitlement plus a runtime check of `supportedResources` — [WWDC25 Session 227](https://developer.apple.com/videos/play/wwdc2025/227/).
- GPU entitlement: `com.apple.developer.background-tasks.continued-processing.gpu`. The iOS 27 SDK header says background GPU is "not supported on all devices", and under heavy GPU contention there is no guaranteed runtime — [miniswift.run: BackgroundTasks iOS 27 SDK](https://miniswift.run/whats-new/backgroundtasks/).
- Developer report (Apple forums, Feb 2026): `supportedResources.contains(.gpu)` returns **false on iPhone 15 Pro and 16 Pro**. No Apple engineer replied. Other developers assume iPad-only — [Apple Developer Forums thread 816774](https://developer.apple.com/forums/thread/816774). A GitHub issue claims Apple DTS confirmed this, but that could not be verified — [ManifoldKit Issue #1713](https://github.com/ManifoldKit/ManifoldKit/issues/1713).

### Inferences
- **Android 10,000 photos:** at, say, 50–200 ms per image for embeddings (section 5), that is about 10–35 minutes of pure compute, well within the 6-hour budget. With a VLM caption per image (hundreds of prefill tokens plus 30–50 decode tokens, about 1–3 s per image), it is about 3–8 h, so close to the limit. Use WorkManager chunks with `setRequiresCharging(true)`/`setRequiresDeviceIdle(true)` plus checkpointing. These are estimates, not measurements.
- **iOS 10,000 photos:** embeddings (MobileCLIP, a few ms per image on the ANE) are realistic in BGProcessingTask chunks overnight while charging, or in the foreground. LLM/VLM captions for 10K photos in the background are unlikely to be reliable on iPhone. Run them in the foreground ("keep the screen on while charging") or as a user-started BGContinuedProcessingTask with visible progress. The latter is borderline because of Apple's photo-sync guidance and the missing iPhone GPU support.
- Whether the ANE/Core ML (as opposed to the GPU) is usable in background tasks was not explicitly confirmed. Apple restricts only "GPU" as a resource.

### Gaps
- No official Apple figures for BGProcessingTask runtime (anecdotally "minutes" overnight), and no official confirmation that iPhones lack background GPU.
- No data found on how OEM battery optimizations (Samsung, Xiaomi) cut WorkManager jobs, or whether Apple Foundation Models can be called from a background task.

## 5. Image embeddings on phones: CLIP/SigLIP/MobileCLIP speed per image

### Takeaway
Apple's **MobileCLIP2** image encoders take about **1.5–20 ms per image** (S0 to S4, measured on an iPhone 12 Pro Max per the model card). 10,000 photos is therefore seconds to minutes of pure inference; image decoding and resizing will dominate. Google's **EmbeddingGemma 2** (multimodal, 388–485 MB) takes about 70–120 ms per text+image embedding on a 2026 flagship GPU, and the Android ML Kit Embedding API offers system-side image+text embeddings.

### Cited Findings
- MobileCLIP2 latency (image encoder + text encoder, ms): S0 1.5 + 3.3; S2 3.6 + 3.3; B 10.4 + 3.3; S3 8.0 + 6.6; S4 19.6 + 6.6; L/14 57.9 + 6.6. The model card mentions an iPhone 12 Pro Max for the S4 comparison; it is unclear whether all values were measured on that device. The text-encoder values differ between cards — [HF apple/MobileCLIP2-B](https://huggingface.co/apple/MobileCLIP2-B/blob/main/README.md); [HF apple/mobileclip2_coca…](https://huggingface.co/apple/mobileclip2_coca_dfn2b_s13b_context77); [GitHub apple/ml-mobileclip](https://github.com/apple/ml-mobileclip).
- MobileCLIP family: 3–15 ms latency at 50–150M parameters — [MobileCLIP2 paper arXiv 2508.20691](https://arxiv.org/html/2508.20691v1) (Aug 2025) [older]. Several MobileCLIP2 checkpoints carry the license tag `apple-amlr` (Apple ML Research license, check whether commercial use is allowed) — [HF apple/mobileclip2_coca…](https://huggingface.co/apple/mobileclip2_coca_dfn2b_s13b_context77/blob/main/README.md).
- EmbeddingGemma 2 latency (ms; text / text+vision): Pixel 11 Pro **TPU 8.3 / 49**; S26 Ultra CPU 27.1 / 175, GPU 25.9 / 119; **iPhone 18 Pro GPU 11.6 / 69.8**, CPU 41.8 / 191. Also audio variants (150–450 ms) — [LiteRT-LM Overview](https://developers.google.com/edge/litert-lm/overview).
- ML Kit GenAI "Semantic Search": an embedding API for text and images, combined with AndroidX AppSearch — [Android Developers: Gemini Nano](https://developer.android.com/ai/gemini-nano).

### Inferences
- For a photo search feature, MobileCLIP2-S2/S3 via Core ML (iOS) or a LiteRT/ONNX/ExecuTorch conversion (Android) is the most efficient choice: under 10 ms per image on the ANE/NPU means 10K images in under 2 minutes of compute. EmbeddingGemma 2 (440M text-vision) is about 5–10× slower, but multilingual and multimodal including audio, which suits an assistant with a single embedding space for text, photos and voice notes.
- Before shipping, check MobileCLIP's `apple-amlr` license for commercial use. Alternatives are SigLIP/SigLIP2 (Apache 2.0, from prior knowledge, not checked here) or EmbeddingGemma 2 (likely under the Gemma 4 / Apache terms, not checked).

### Gaps
- No current 2026 measurements of MobileCLIP2/SigLIP2 on Android NPUs (Snapdragon, Tensor) or on the iPhone 17/18 found. The MobileCLIP figures come from an older iPhone, probably the 12 Pro Max.
- No measurement of end-to-end throughput (decode JPEG, resize, embed, write to index) for 10K photos, and none on battery use.
- The EmbeddingGemma 2 license and release date were not checked.
