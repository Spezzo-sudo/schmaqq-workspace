# Private local AI on smartphones: use cases, agent control, security risks, competitive landscape and market gap

Research date: 2026-11-08. Many sources are secondary (blogs, review sites, aggregators); this is flagged where it matters. Primary sources (Google Play policy, Google/Apple help and developer docs, arXiv) are preferred.

## 1. Photo sorting/search on-device (Google Photos, Apple Photos, Immich, PhotoPrism, Ente; CLIP/SigLIP, faces; 10,000 photos)

### Takeaway
On-device semantic photo search (CLIP-family embeddings) and face clustering already ship in production. Ente does it fully on the client with Apple's MobileCLIP and encrypts the indexes; Apple Photos clusters faces on the device overnight. Self-hosted tools (Immich) run the same ML on a home server instead. A library of 10,000 photos is clearly feasible. The practical pattern is "index on a stronger device (desktop/home server), search everywhere". That maps directly onto a phone-plus-own-PC setup.

### Cited Findings
- Ente runs ML on-device: "your photos and face data are never sent to Ente's servers"; search indexes are encrypted before syncing — [Ente ML help](https://help.ente.io/photos/features/search-and-discovery/machine-learning); [ente.com/ml](https://ente.com/ml/)
- Ente face recognition detects faces, groups similar faces into person clusters locally, and encrypts person entities before they leave the device — [Ente ML help](https://ente.com/help/photos/features/search-and-discovery/machine-learning)
- Ente "Magic Search" uses CLIP; its technical write-up says it is based on Apple's MobileCLIP. It is off by default and must be enabled. It is unavailable on the web app (mobile/desktop only) — [Ente Magic Search](https://help.ente.io/photos/features/search-and-discovery/magic-search); [Ente community ML](https://community.ente.io/ml)
- Once indexed, Ente's face recognition and magic search work fully offline — [Ente ML help](https://help.ente.io/photos/features/search-and-discovery/machine-learning)
- Ente recommends indexing large libraries on desktop because desktops index faster than phones. It has no built-in reset for the ML database. Docs conflict on whether face-group editing is possible on desktop — [Ente ML help](https://ente.com/help/photos/features/search-and-discovery/machine-learning)
- Apple Photos: Apple's ML research describes a pipeline that assigns face and upper-body embeddings to clusters during "overnight clustering" on the device — [Apple ML Research: Recognizing People in Photos](https://machinelearning.apple.com/research/recognizing-people-photos)
- Apple's Enhanced Visual Search (landmarks) does use servers. The device privately matches against a global index on Apple's servers. Faces are not part of this — [Apple Photos & Privacy](https://www.apple.com/au/legal/privacy/data/en/photos/)
- Google Photos: a 2019 report says disabling face grouping deletes face models created "on your device", which suggests some local processing. I found no current primary source on where Google Photos face recognition or Ask Photos (Gemini) processing runs — [9to5Google 2019](https://9to5google.com/2019/08/22/google-photos-face-grouping/)
- Immich (self-hosted) runs CLIP and face recognition in a separate ML container on the server, on CPU by default and optionally on CUDA GPUs. The ML container can run on a separate machine via `IMMICH_MACHINE_LEARNING_URL` (secondary guides) — [popularai: does Immich need GPU](https://www.popularai.org/p/does-immich-need-gpu); [Unraid Immich ML CUDA template](https://ca.unraid.net/apps/immich-machine-learning-cuda-1b72g7j0rx4wkj)
- Immich sizing (secondary, approximate): minimum about 6 GB RAM and 2 cores with ML enabled (4 GB only without ML); the ML container adds about 1–4 GB depending on source — [evetech guide](https://evezone.evetech.co.za/deep-dives/hardware-for-self-hosting-immich-replace-google-photos-at-home); [computingforgeeks](https://computingforgeeks.com/install-immich-ubuntu-2604/)
- Feasibility data point (single author, not a benchmark): Immich's search model indexed 51,126 items in under an hour on a 2018 Intel NUC without a GPU — [mustafa.net, 2026-10-10](https://mustafa.net/2026/10/10/immich-without-gpu-intel-nuc/)

### Inferences
- If a 2018 mini PC CPU embeds about 51k images per hour, 10,000 photos is roughly 10–15 minutes of CLIP indexing on a modest PC. On a phone NPU/GPU with MobileCLIP, a one-time background job (overnight, while charging) is plausible. Ente's "index on desktop" advice suggests phones are notably slower in practice.
- Storage is trivial. 10,000 embeddings × 512 dims × 4 bytes ≈ 20 MB (float32), less when quantized. Brute-force cosine search over 10k vectors is instant on a phone.
- Differentiation is not "semantic search exists" (Ente and Apple already have it). It is: (a) Android mid-range plus any photo source (local gallery, not a cloud silo), (b) offloading indexing to the user's own PC/NAS, (c) natural-language queries combined with an LLM ("photos of receipts from March"), (d) open models (SigLIP/MobileCLIP) and transparency.
- PhotoPrism was not researched in depth (no sources fetched). It is a server-side self-hosted tool like Immich.

### Gaps
- No primary, current source on Google Photos face recognition / Ask Photos processing location.
- No measured on-phone MobileCLIP/SigLIP throughput (images/sec) on mid-range Android was found.
- PhotoPrism ML specifics not verified.

## 2. Summarizing private messages/notifications locally (NotificationListenerService, WhatsApp/Signal, Apple Intelligence)

### Takeaway
On Android, a NotificationListenerService can technically see the text of incoming notifications, including the message previews that WhatsApp/Signal show. This is the only practical, non-root route to a summary of message content without breaking app sandboxes. Google Play treats the permission as sensitive and allows it only for a justified core feature. Apple runs notification and message summaries with on-device models. On-device summarization APIs (Gemini Nano via ML Kit) exist but are limited to newer flagship and upper-mid devices and to foreground use.

### Cited Findings
- Android's NotificationListenerService "receives calls from the system when new notifications are posted or removed, or their ranking changed" — [Android developers: NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- Secondary guidance: Play treats notification-listener access as restricted/sensitive. Apps should request it only for a genuine core function and must not collect or send notification content beyond what that feature needs — [ptkd.com security note](https://ptkd.com/journal/android-notification-listener-service-security)
- Example (2026): an Android app uses NotificationListenerService plus an on-device model to semantically classify each notification (an "anti-spoiler" filter). This shows the pattern works in practice — [yage.ai write-up](https://yage.ai/share/android-notification-listener-en-20260619.html)
- Gemini Nano on-device via ML Kit GenAI APIs (built on AICore) includes a Summarization API ("summarize articles or chat conversations as a bulleted list") — [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai)
- ML Kit GenAI limits: inference is permitted only when the app is the top foreground app, and AICore enforces a per-app inference quota. Device support covers Tensor, Snapdragon and Dimensity devices (examples: Pixel 9, Galaxy S25, Xiaomi 15, Razr 60 Ultra), and Gemini Nano versions differ per device — [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai); [Android Developers Blog, May 2025](https://android-developers.googleblog.com/2025/05/on-device-gen-ai-apis-ml-kit-gemini-nano.html); [InfoQ](https://www.infoq.com/news/2025/06/google-mlkit-genai-gemini-nano)
- Apple: preview summaries of emails, messages and notifications are generated by on-device models. Heavier requests go to Private Cloud Compute (PCC), which Apple says neither stores the data nor makes it accessible to Apple — [Apple Intelligence & Privacy](https://apple.com/uk/legal/privacy/data/en/intelligence-engine)

### Inferences
- The background constraint on ML Kit (foreground only, quotas) means an always-on notification summarizer on Android likely needs its own bundled runtime (llama.cpp / LiteRT / MLC) rather than relying on Gemini Nano.
- The notification-listener route only sees what the notification shows: truncated previews, nothing if the user hides content, no history. Full WhatsApp/Signal history is end-to-end encrypted and sandboxed. Only exports or backups (user-initiated) give more. This is an inference; no primary source was fetched on WhatsApp/Signal data access.
- GDPR angle: processing third parties' messages (the contacts' data) locally on the user's device for personal use likely falls under the household exemption (Art. 2(2)(c) GDPR). Any upload to a vendor server would turn the vendor into a processor/controller. This is a legal inference that needs verification by a lawyer; no source was fetched.

### Gaps
- No primary Google Play policy text specifically on NotificationListenerService/notification access for AI apps was retrieved.
- No source on WhatsApp/Signal ToS regarding third-party apps reading notifications, or on DMA messaging interoperability as an access route.
- The EU availability status of Apple notification summaries in late 2026 is unclear. Secondary sources conflict, and the Sep 2026 Siri upgrade is reported as not available in the EU (see section 4).

## 3. Letting an on-device agent control apps (Android Accessibility policy, Gemini screen automation, AppFunctions, iOS App Intents, research agents, prompt injection and mitigations)

### Takeaway
Policy, not technology, is the main blocker. Google Play explicitly prohibits using the AccessibilityService API to power autonomous agents that plan and execute actions, except verified disability tools. Google itself ships "screen automation" in Gemini (beta, flagship-only, no EU). It is pushing AppFunctions as the sanctioned agent interface (policy effective April 2027). iOS allows no cross-app control by third parties; only App Intents via Siri/Shortcuts. Research agents (DroidRun etc.) reach 80–90% on AndroidWorld but are highly vulnerable to indirect prompt injection via notifications, notes, calendar entries and web content. A safe design needs capability limits, confirmations and CaMeL-style data/control separation.

### Cited Findings
**Google Play Accessibility policy**
- Play policy: any use of the Accessibility API that "enables an app to autonomously initiate, plan, and execute actions or decisions is strictly prohibited". Deterministic, rule-based automation remains allowed. Verified accessibility tools (`isAccessibilityTool="true"`) may use autonomous functionality only if it serves their core purpose of helping people with disabilities — [Play Console Help: Use of the AccessibilityService API](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en)
- Non-accessibility-tool apps using the API need a prominent in-app disclosure (not only in the store listing or privacy policy, shown during normal use) and affirmative consent. Apps targeting API 31+ must complete a Play Console declaration (since Nov 3, 2021) — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en)
- Google's policy announcement of October 30, 2025 clarified and reinforced the rules against autonomous actions via Accessibility. A third-party summary gives an effective date of Jan 28, 2026 (not confirmed on Google's pages) — [Play policy announcement Oct 30, 2025](https://support.google.com/googleplay/android-developer/answer/16550159?hl=en); [myappmonitor summary](https://myappmonitor.com/blog/google-play-accessibility-services-policy-update)
- Sensitive permissions policy (incl. Accessibility restrictions) — [Play: Permissions and APIs that Access Sensitive Information](https://support.google.com/googleplay/android-developer/answer/16558241?hl=en); [Preview version](https://support.google.com/googleplay/android-developer/answer/16909972?hl=en)
- AppFunctions preview policy: AppFunctions must not deceive or manipulate AI agents; effective date April 14, 2027 — [Play preview policy](https://support.google.com/googleplay/android-developer/answer/16909972?hl=en)
- Practical routes for agent developers: ADB-based control for experiments, app APIs, AppFunctions (secondary) — [DEV Community: five routes in 2026](https://dev.to/alon_n_ecceca6aa868e0761d/how-an-ai-agent-can-use-android-apps-that-have-no-api-five-routes-in-2026-2gfe); [openally.ai](https://openally.ai/blog/how-ai-agents-do-things-on-your-phone)

**Google's own agents**
- AppFunctions is an Android 16 platform feature plus Jetpack library that lets apps expose functions to callers such as agent apps ("MCP-like"). Google is also building a UI automation framework for agents — [9to5Google, 2026-02-25](https://9to5google.com/2026/02/25/android-appfunctions-gemini/)
- Gemini "screen automation" rolled out on Galaxy S26 in March 2026 (initially US/Korea, English) — [9to5Google, 2026-03-12](https://9to5google.com/2026/03/12/gemini-android-app-automation-galaxy-s26-rollout/); [Android Central](https://www.androidcentral.com/apps-software/gemini-screen-automation-rolling-out-for-galaxy-s26)
- Pixel help page (current): beta. Select apps only, for rides, flights, accommodation, tickets, buying/selling, food/groceries. Devices: Pixel 10/11, Galaxy S26, Z Flip 8/Fold 8, Tab S12. Regions: India, Japan, South Korea, UK, US, so no EU. Languages: EN/JA/KO. Requires age 18+ and a personal account. It runs in an "on-device virtual phone environment"; the page does not say where model reasoning runs. Controls: Gemini pauses for passwords, payments, finalizing transactions and sign-ins, and aims to confirm before sending messages. Per-app permission: Always / Ask every time / Do not allow. Daily request limits apply. The user is "responsible for Gemini's actions" — [Pixel Phone Help: multi-step tasks](https://support.google.com/pixelphone/answer/16940971?hl=en)
- "Gemini Intelligence" (agentic automation, autofill) was announced at The Android Show: I/O Edition, May 2026. It launches first on Galaxy S26 and Pixel 10 and expands to more Android phones later in 2026 — [BusinessToday, 2026-05-12](https://www.businesstoday.in/technology/story/google-introduces-gemini-intelligence-for-android-with-app-automation-auto-fill-and-more-features-531166-2026-05-12); [Deccan Herald](https://www.deccanherald.com/technology/artificial-intelligence/google-showcases-gemini-intelligences-agentic-automation-capabilities-for-android-phones-4001581)

**iOS**
- No API lets a third-party app invoke another app's intents directly; Siri/Shortcuts is the orchestrator (WWDC26 session Q&A summary). Apps cannot reach across sandboxes. App Intents is the opt-in surface for Siri, Shortcuts, Spotlight and Apple Intelligence — [Apple WWDC26 session 8011](https://developer-mdn.apple.com/videos/play/wwdc2026/8011/); [yage.ai iOS 27 guide](https://yage.ai/share/ios27-siri-app-intents-foundation-models-en-20260919.html)
- An Apple Developer Forums thread from a chat-assistant developer asks whether App Intents is the full extent of what third parties can access in the new Siri; no Apple answer was found. Another forum proposal asks for user-controlled third-party AI access — [Apple Dev Forums 832390](https://developer.apple.com/forums/thread/832390); [Apple Dev Forums 845238](https://developer.apple.com/forums/thread/845238)
- One source says SiriKit is deprecated in iOS 27 (single third-party source, unverified) — [yage.ai](https://yage.ai/share/ios27-siri-app-intents-foundation-models-en-20260919.html)
- Analyst view: Android allows more experimentation (launchers, assistant replacement, accessibility overlays, forks) than iOS — [Sacra](https://sacra.com/chat/h/aa52e8e7-b354-4170-8eb6-3ead5c648082/)

**Research agents (capability)**
- DroidRun vendor benchmark: 91.4% on AndroidWorld (116 tasks), using GPT-5 and direct Accessibility API access (vendor-published, 2025-10-03) — [DroidRun benchmark](https://droidrun.ai/benchmark/)
- An independent paper reports DroidRun with AppCards (GPT-5, v0.3.9) at 88.8% vs 84.5% previously reported for MobileUse — [arXiv 2601.19306](https://arxiv.org/html/2601.19306v1)
- Another paper notes leaderboard claims at the time of 0.84 for MobileUse and 0.78 for DroidRun. Numbers vary by version, backbone and setup — [Agent+P, arXiv 2510.06042](https://arxiv.org/html/2510.06042v1)
- MobileUse's own paper: 62.9% AndroidWorld, 44.2% AndroidLab (older configuration) — [arXiv 2507.16853](https://arxiv.org/pdf/2507.16853)
- These top results use large cloud models (GPT-5). No source found shows comparable success for small on-device models.

**Security: prompt injection on mobile agents**
- "Not an A11y" (arXiv, Aug 2026) treats the accessibility tree as an untrusted channel. Attack vectors: notification bodies (A1), runtime overlays (A2/A3), hidden accessibility metadata (A4), webpage T&C text (A5), calendar event descriptions (A6), notes (A7), contact Notes fields (A8), poisoned planning AppCards (A9) — [arXiv 2608.08939](https://arxiv.org/html/2608.08939v1)
- Results (5 trials per config, descriptive). Aggregate attack success: MobileRun + Gemma4:31B 0.822; MobileRun + Qwen3.6:35B 0.544; Mobile-Use + Gemma4:31B 0.750; Mobile-Use + Qwen3.6:35B 0.150. Application-content and AppCard attacks were most effective. Vision input was not a reliable defense. The root cause is frameworks treating passive environmental text as trusted instructions — [arXiv 2608.08939](https://arxiv.org/html/2608.08939v1)
- Proposed (unevaluated) mitigations: track the source app and visibility of each UI element; treat web, notification, note, calendar, contact and hidden-node text as data; enforce data/instruction separation architecturally, not just with delimiters; require policy checks or user confirmation for cross-app actions; limit untrusted content flowing between planner, memory and executor; check accessibility tree against screenshot consistency (not sufficient alone) — [arXiv 2608.08939](https://arxiv.org/html/2608.08939v1)
- "Action rebinding" attacks exploit the gap between observation and action in GUI agents. All tested agents (incl. DroidRun, Mobile-Agent-v3, AppAgent) were vulnerable — [arXiv 2601.12349](https://arxiv.org/pdf/2601.12349)
- CaMeL (Google/ETH Zurich, arXiv 2503.18813) is a system layer around the LLM. It extracts control and data flow from the trusted user query, so untrusted retrieved data cannot change program flow. It uses capabilities to block exfiltration over unauthorized data flows, enforced in a custom interpreter with explicit security policies. AgentDojo: 67% of tasks solved with provable security in the v1 abstract, about 77% in a later version, vs 84% undefended (check the v2 PDF). Code is in google-research "camel-prompt-injection" — [arXiv 2503.18813](https://arxiv.org/pdf/2503.18813); [MIT 6.858 reading](https://css.csail.mit.edu/6.858/2026/readings/camel.pdf)

### Inferences
- A Play-distributed app cannot legally ship an LLM that autonomously drives other apps via Accessibility. Viable compliant designs:
  - (a) deterministic, user-confirmed single actions ("draft reply; the user taps send");
  - (b) intents, share sheets and deep links;
  - (c) AppFunctions where apps expose them (ecosystem still immature; policy effective 2027);
  - (d) distribution outside Play (F-Droid / sideload / ADB "power user mode"), which reduces reach;
  - (e) the agent running on the user's PC and controlling the phone via ADB, which ties into the "Geräteverbund" (own PC offload) idea.
- Gemini screen automation is not available in the EU and only on flagships. This leaves a temporary gap for EU/mid-range users, but competing directly with OS-level automation is risky.
- The security posture for a niche product should be "read-mostly agent": summarize, search and draft locally, with every outbound action (send, pay, delete, share) behind explicit confirmation. Add capability tokens per app and CaMeL-style separation so that message/notification text can never trigger tool calls. This is also a marketing differentiator ("can't be hijacked by a WhatsApp message").
- Smaller on-device models are, if anything, likely more injection-prone and less capable at multi-step GUI tasks. Local-first agents should prefer structured APIs over GUI control.

### Gaps
- Exact current wording and effective date of the Oct 2025 accessibility clarification on Google's own page were not retrieved.
- No data on how Play enforces against existing AI-agent apps (removals, appeals).
- No source on success rates of mobile GUI agents with small (≤4B) on-device models.
- AppAgent / Mobile-Agent AndroidWorld numbers were not found in the retrieved results.

## 4. Competitors and products (Apple Intelligence/PCC, Gemini Nano, Samsung Galaxy AI on-device mode, PocketPal, Private LLM, PrivateLM, Layla, MLC Chat, AI Edge Gallery, Nothing, Brave Leo, desktop tools, personal AI startups): what do they lack?

### Takeaway
The big platforms are hybrid. Apple sends complex requests to PCC, and since 2026 some features to Google Cloud. Samsung's on-device-only switch removes many features. Google's agent features are flagship-only and not in the EU. Standalone local-LLM apps (PocketPal, AI Edge Gallery, Private LLM, Layla) are chat front-ends with no integration into the user's photos, notifications or apps, and no agent or PC offload. No product combines an open, transparent, Android-mid-range-capable local assistant with personal-data features and offload to the user's own PC.

### Cited Findings
**Apple Intelligence**
- Notification/message/email summaries run on-device. Larger requests go to Private Cloud Compute, where Apple says data is not stored or accessible to Apple — [Apple Intelligence & Privacy](https://apple.com/uk/legal/privacy/data/en/intelligence-engine)
- June 2026: Apple extended Private Cloud Compute to Google Cloud infrastructure (Nvidia GPUs, Google Titan chips) for its new foundation models — [Neowin](https://www.neowin.net/amp/apple-is-expanding-private-cloud-compute-beyond-its-own-data-centers/); [The Decoder](https://the-decoder.com/apple-intelligence-gets-a-second-go-with-the-help-of-google-and-nvidia/)
- July 2026: iOS 26/27 shows a new permission popup when AI features send data to Google Cloud (e.g., iWork shape generation, Freeform AI, Creator Studio features) — [9to5Mac, 2026-07-06](https://9to5mac.com/2026/07/06/apple-adds-new-popup-for-ai-features-that-send-data-to-google-cloud/)
- Apple partners with Google Gemini for Siri AI — [PPC Land](https://ppc.land/apple-turns-to-google-gemini-for-siri-ai-and-rewrites-app-store-marketing/)
- Sept 18, 2026: Apple launched the "privacy-first" Siri AI upgrade, but it is not available in the EU amid an ongoing regulatory standoff (article body truncated; specific regulation not confirmed) — [ITPro](https://www.itpro.com/software/apple/apple-launches-privacy-first-ai-upgrade-to-siri-but-it-wont-be-available-in-the-eu)
- Criticism: PCC is closed, which a commentator argues conflicts with EU expectations (opinion) — [Wccftech](https://wccftech.com/apple-stores-icloud-data-on-government-servers-in-china-but-throws-a-hissy-fit-in-the-eu-over-siri-ai/)

**Google Gemini Nano / Gemini on Android**
- On-device Gemini Nano via AICore and ML Kit GenAI: summarization, proofreading, rewriting, image description, Prompt API. Device-limited, foreground-only, per-app quota — [ML Kit GenAI](https://developers.google.com/ml-kit/genai)
- Gemini screen automation: beta, flagships only, no EU (see section 3) — [Pixel Help](https://support.google.com/pixelphone/answer/16940971?hl=en)
- Google announced "Private AI Compute" (cloud, similar to Apple PCC) in Nov 2025 — [The Register, 2025-11-12](https://www.theregister.com/2025/11/12/google_touts_private_ai_compute/)

**Samsung Galaxy AI**
- The "Process data only on device" setting keeps processing local, but cloud-dependent features stop or degrade: Note Assist formatting/summaries, Browsing Assist summaries, Sketch to Image, Portrait Studio, heavier Generative Edit. Sources conflict on how many features remain (Tom's Guide on S24: mainly Chat Assist and translation) — [SamMobile, 2025-09-26](https://www.sammobile.com/news/use-galaxy-ai-without-sending-data-to-samsung-heres-what-you-lose/); [Tom's Guide](https://www.tomsguide.com/phones/samsung-phones/how-to-use-on-device-ai-only-on-samsung-galaxy-s24); [9to5Google](https://9to5google.com/2025/02/20/how-to-turn-on-galaxy-ai-on-device-processing/)
- Knox: on-device-processed AI features don't use data for training; enterprises can enforce the setting — [Samsung Knox docs](https://docs.samsungknox.com/admin/knox-platform-for-enterprise/knox-service-plugin/configure-advanced-policies/data-processing-for-galaxy-ai/)

**Standalone local LLM apps** (secondary review sites; verify in stores)
- PocketPal AI: free, open source, llama.cpp/GGUF, Android and iOS. The most commonly recommended free option — [TokForge comparison](https://tokforge.ai/guides/best-offline-ai-apps-android/); [PromptQuorum Android 2026](https://www.promptquorum.com/power-local-llm/best-local-llm-apps-android-2026)
- Google AI Edge Gallery: free Google app on LiteRT-LM, centered on Gemma models. Sources conflict on platforms (Android only vs also iOS/macOS) — [TokForge](https://tokforge.ai/guides/best-offline-ai-apps-android/); [PromptQuorum mobile](https://www.promptquorum.com/local-llms/mobile-local-llms)
- Private LLM (privatellm.app): paid (about $4.99–5.99), closed source, Apple-only, native Apple implementation, popular for larger models on iPad — [modelfit.io](https://modelfit.io/guides/best-llm-for-iphone/); [PromptQuorum iPhone 2026](https://www.promptquorum.com/power-local-llm/best-local-llm-apps-iphone-2026)
- Layla: paid (about $19.99), companion/roleplay focus; iOS availability conflicting — [PromptQuorum Layla review](https://www.promptquorum.com/power-local-llm/layla-review)
- MLC LLM/MLC Chat is compared against Ollama on mobile — [PromptQuorum: MLC LLM vs Ollama](https://www.promptquorum.com/local-llms/mobile-local-llms)
- "PrivateLM (orailnoor)": no matching product or source was found in search.

**Nothing**
- Essential Space: mixed on-device (transcription) and cloud (deep summarization via Nothing servers, with a monthly processing cap). Cloud backup runs on Google cloud infrastructure, "in line with GDPR". A community post criticizes that transcripts require sharing with third parties (forum sources, unverified) — [Ted's blog, 2026-01-15](https://tedssalmagundi.blogspot.com/2026/01/essential-space-on-nothing-phone-3.html); [Nothing community: cloud storage](https://nothing.community/de/d/56466-essential-space-now-supports-cloud-storage); [Nothing product data page](https://at.nothing.tech/pages/product-data-information); [PhoneArena](https://www.phonearena.com/news/nothing-clarifies-essential-space-stays-free-but-premium-features-may-arrive_id171480)

**Brave Leo**
- BYOM lets desktop Brave connect Leo to local models (Ollama at localhost:11434) or custom endpoints. Brave has no visibility into that traffic — [Brave blog: BYOM](https://brave.com/blog/byom-nightly/); [Brave support](https://support.brave.app/hc/en-us/articles/34070140231821-How-do-I-use-the-Bring-Your-Own-Model-BYOM-with-Brave-Leo)
- BYOM is missing on Android; users there must use Brave-hosted inference (open feature request) — [GitHub brave-browser #59722](https://github.com/brave/brave-browser/issues/59722)

**Desktop (Jan / LM Studio / Ollama)**
- Ollama-compatible endpoints are the de-facto standard for local model serving (see Brave BYOM integration) — [Brave blog](https://brave.com/blog/byom-nightly/)

### Inferences
Gap matrix (synthesized from the above):

| Lack | Who |
|---|---|
| Hybrid cloud, not fully local | Apple (PCC, now incl. Google Cloud), Samsung (default), Nothing, Brave on Android |
| Flagship-only / no mid-range | Gemini Nano GenAI APIs, Gemini screen automation, Apple Intelligence (newer iPhones) |
| No EU availability for newest features | Gemini screen automation, the Sep 2026 Siri upgrade |
| Closed / not transparent | Apple PCC, Private LLM, Samsung |
| Pure chat, no personal data integration | PocketPal, AI Edge Gallery, Layla, Private LLM, MLC Chat |
| No offload to the user's own PC | All mobile apps found; Brave BYOM does it only on desktop |
| No agent/app actions | All standalone local apps |

- Most promising niche for a small team: an **open-source, Android-first (mid-range-capable), EU/GDPR-native local assistant**. It would focus on personal data (photos, notifications, documents) with read-mostly features, and offload heavy work to the user's own PC/NAS (Ollama-compatible) over an encrypted LAN or tunnel. Actions stay confirmation-gated, which avoids Play's accessibility ban.
- The "own PC offload" is a clear white space. Ollama/LM Studio are desktop-only, and no phone app found pairs with them as a first-class "Geräteverbund".

### Gaps
- No primary sources for Jan / LM Studio / Ollama mobile companions, MLC Chat status, or Personal AI startups (e.g., Rewind/Limitless-type products) were fetched.
- No verified PrivateLM (orailnoor) information.
- Apple Intelligence general EU availability (believed to have launched in EU with iOS 18.4 in spring 2025) was not re-verified in this session.

## 5. User demand / privacy sentiment in Europe/Germany for local AI; GDPR angle

### Takeaway
European, and especially German, consumers are strongly privacy-oriented about AI. About three-quarters (76% in Germany) prefer protecting their device and personal data even if that limits AI assistants. German consumers lead in willingness to pay for AI data transparency. Businesses cite data protection as the top AI barrier. No survey specifically measures demand for on-device AI on smartphones.

### Cited Findings
- Freshwater Strategy poll for Chamber of Progress (an industry-funded advocacy group, so framing is caution-worthy): 8,042 adults in 12 European countries. 75% prefer protecting devices and personal information even if it limits some AI assistants' access; Germany 76% "privacy & security first" vs 8% "full access for all AI" (16% unsure) — [Chamber of Progress](https://progresschamber.org/news/new-poll-europeans-want-privacy-and-security-prioritised-in-digital-markets-act-enforcement/); [Research page](https://progresschamber.org/research/survey-europeans-want-privacy-security-prioritized-dma/)
- Usercentrics State of Digital Trust 2026 (fielded March 2026, 7 markets): over half of consumers will pay more for brands transparent about AI data use. In Germany 73% would pay about a 9% premium, the highest of all markets. 71% find AI-driven personalization intrusive — [Usercentrics press](https://usercentrics.com/press/usercentrics-state-of-digital-trust-2026-report/)
- Usercentrics 2025: 59% of consumers are uncomfortable with their data being used to train AI (about 10,000 respondents, 2,500 from Germany) — [PPC Land](https://ppc.land/consumer-trust-crisis-hits-marketing-as-ai-data-use-sparks-privacy-concerns/)
- Samsung study (8,000+ people aged 18–35 in 8 countries incl. Germany): almost 9 of 10 are concerned about privacy. 62% would use AI features more if they understood the benefits and trusted data protection (not representative; vendor study) — [EU Insider](https://www.euinsider.eu/news/survey-nine-out-of-ten-europeans-concerned-about-privacy-hesitate-to-embrace-ai-without-data-security); [hi-tech.ua](https://hi-tech.ua/en/samsung-study-88-of-europeans-are-worried-about-ai-in-everyday-life/)
- Bitkom KI 2025 (604 companies): 48% cite high data-protection requirements as a barrier; 39% fear data falling into the wrong hands — [Bitkom Research: KI 2025](https://bitkom-research.de/studien/kuenstliche-intelligenz-2025); [Bitkom press](https://www.bitkom.org/Presse/Presseinformation/Durchbruch-Kuenstliche-Intelligenz)
- Bitkom data-protection study: 69% see data protection as a hurdle for training AI, while 59% see European data protection as an advantage for AI development. In a 2026 survey, 78% say data-protection review of AI projects is getting more effortful — [Bitkom Studienbericht Datenschutz 2026](https://www.bitkom.org/sites/main/files/2026-02/bitkom-studienbericht-datenschutz.pdf); [Bitkom press](https://www.bitkom.org/Presse/Presseinformation/Unternehmen-aechzen-unterm-Datenschutz)
- Shadow AI: 4 in 10 German companies assume employees use private AI tools; only 23% have AI rules (Bitkom, Oct 2025) — [Bitkom: Schatten-KI](https://www.bitkom.org/Presse/Presseinformation/Beschaeftigte-nutzen-Schatten-KI)
- Ping Identity 2026 consumer survey on AI trust (not fetched in detail) — [Ping Identity](https://www.pingidentity.com/en/lp/4423-2026-consumer-survey-ai-trust.html)

### Inferences
- Demand signal: privacy-first positioning resonates strongly in Germany (76% / 73% figures). A "Made in EU, fully local, open source" message is a credible differentiator. The willingness-to-pay data supports a paid tier (one-time or small subscription), despite the free PocketPal/Edge Gallery competition.
- B2B / shadow-AI angle: companies with strict data protection may adopt a local assistant for employee phones (Samsung Knox already lets enterprises force on-device processing), which is a possible second niche.
- GDPR: fully local processing minimizes the vendor's controller/processor role. Offloading to the user's own PC keeps data in the user's domain. Any vendor cloud fallback reintroduces DPAs, transfer issues (e.g., Apple and Nothing using Google Cloud) and DPIA obligations. This is a legal inference; no primary GDPR guidance on on-device AI was fetched.

### Gaps
- No survey found measuring explicit demand for on-device/local AI on smartphones in Germany.
- No EDPB / German DPA (DSK/BfDI) guidance on on-device AI assistants or notification processing was retrieved.
- No market-size data (downloads/revenue) for local LLM apps was found.
