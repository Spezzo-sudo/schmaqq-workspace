# Distributed LLM inference across consumer devices (LAN and WAN): state of the art, November 2026

Method note: the project READMEs were read from raw.githubusercontent.com (HEAD as of 2026-11-08). Last-commit dates come from shallow `git clone` of each default branch on 2026-11-08. The GitHub API and github.com HTML pages were not reachable from this environment, so star counts and release-note text are not included. The PrivateLM `1.0.7-cluster` source code was inspected directly at that tag. Paper numbers come from arXiv abstracts and arXiv HTML full text.

## Q1: How do exo, Petals, prima.cpp, distributed-llama, llama.cpp RPC, PrivateLM (1.0.7-cluster) and edge-llm-cluster work? Measured speeds, transport security, maintenance status

### Takeaway
Every consumer-device project except distributed-llama splits the model by layers (pipeline). distributed-llama, and exo when it has RDMA/Thunderbolt, use tensor parallelism. All of the LAN tools (exo, llama.cpp RPC, distributed-llama, prima.cpp, PrivateLM, edge-llm-cluster) assume a trusted local network. None of them has transport encryption or authentication as a shipped feature: llama.cpp RPC calls itself "insecure", and PrivateLM and edge-llm-cluster state outright that they have no auth. Petals is the only one of these projects built for the internet (libp2p with NAT relay), and its code has been dormant since August 2024.

### Cited Findings

**exo (exo-explore/exo)**
- exo "connects all your devices into an AI cluster". It discovers devices automatically, has "Topology-Aware Auto Parallel" that takes into account "device resources and network latency/bandwidth between each link", and supports tensor parallelism with "up to 1.8x speedup on 2 devices and 3.2x speedup on 4 devices". It uses MLX and MLX distributed as backend and communication layer — [exo README](https://github.com/exo-explore/exo)
- Supported sharding modes are `pipeline`, `tensor` or `both`. The README also ships day-0 "RDMA over Thunderbolt 5", which it says gives a "99% reduction in latency between devices" (needs macOS Tahoe 26.2+) — [exo README](https://github.com/exo-explore/exo)
- Scope is LAN only. Devices find each other "when they are on the same network and run the same version of exo". Discovery runs through a Zenoh namespace (`EXO_ZENOH_NAMESPACE`), and "guest Wi-Fi and some office networks stop devices from seeing each other". The README says nothing about encryption or authentication between nodes. Its only security note is about `trust_remote_code` for custom models — [exo README](https://github.com/exo-explore/exo)
- Platform limits: "On Linux, exo currently runs on CPU". "A Mac and a Linux machine don't join each other, even on the same commit", and mixed exo versions are not supported in one cluster — [exo README](https://github.com/exo-explore/exo)
- Maintenance: very active. Last commit 2026-11-06 ("Serve requests without the master …"), and the latest app tag is v1.0.71 (git clone/ls-remote, 2026-11-08) — [exo repo](https://github.com/exo-explore/exo)
- Measured (Dec 2025, Jeff Geerling, 4× M3 Ultra Mac Studio, TB5 RDMA). Qwen3-235B: exo 19.5 tok/s on 1 node and 31.9 tok/s on 4 nodes, while llama.cpp (TCP) went from 20.4 tok/s on 1 node to 15.2 tok/s on 4. DeepSeek V3.1 671B: exo 21.1 tok/s on 1 node and 32.5 on 4. Secondary sources disagree on some llama.cpp figures — [AppleInsider](https://appleinsider.com/articles/25/12/20/ai-calculations-on-mac-cluster-gets-a-big-boost-from-new-rdma-support-on-thunderbolt-5), [GIGAZINE](https://wbgsv0a.gigazine.net/gsc_news/en/20251222-mac-rdma-over-thunderbolt-1-5tb)
- Geerling: RDMA lowered memory-access latency "from 300μs down to < 50μs". Thunderbolt gives about 50-60 Gbps real-world, compared with the Macs' 10 Gbps Ethernet. HPL over Thunderbolt TCP crashed and rebooted the Macs. The hardware is about $40k of Mac Studios, which is not consumer gear — [Jeff Geerling blog](https://www.jeffgeerling.com/blog/2025/15-tb-vram-on-mac-studio-rdma-over-thunderbolt-5)
- In the prima.cpp paper's home Wi-Fi testbed, exo (pipeline mode) ran Llama-3 8B at 263 ms/token TPOT, against 15 ms for single-device llama.cpp. It ran out of memory on 70B, and it could not run on the Android phone because it "requires root access on the phone" — [prima.cpp paper, arXiv 2504.08791 v3](https://arxiv.org/html/2504.08791)

**llama.cpp RPC (ggml-rpc / rpc-server)**
- The README warns: "proof-of-concept development stage … fragile and insecure. Never run the RPC server on an open network or in a sensitive environment!" Transport is plain TCP with no auth or encryption, and RDMA is optional (RoCEv2 on Linux, TB5 on macOS 26.2+) — [llama.cpp tools/rpc README](https://github.com/ggml-org/llama.cpp/blob/master/tools/rpc/README.md)
- How it splits: a main host runs `llama-cli`/`llama-server --rpc host:port,...`. "By default, llama.cpp distributes model weights and the KV cache across all available devices … in proportion to each device's available memory", and `--tensor-split` overrides this. A local tensor cache (`-c`) avoids resending weights over the network on reload — [llama.cpp tools/rpc README](https://github.com/ggml-org/llama.cpp/blob/master/tools/rpc/README.md)
- Maintenance: llama.cpp is extremely active (last commit 2026-11-08, git clone). The RPC README now documents RDMA transport and `GGML_RPC_DEBUG` levels — [llama.cpp repo](https://github.com/ggml-org/llama.cpp)
- Scaling: llama.cpp over TCP got slower going from 1 to 4 Mac Studios (20.4 → 15.2 tok/s, Qwen3-235B) — [AppleInsider](https://appleinsider.com/articles/25/12/20/ai-calculations-on-mac-cluster-gets-a-big-boost-from-new-rdma-support-on-thunderbolt-5). A tutorial says a layer-split cluster "gets slower per node added" (unverified secondary source) — [computingforgeeks](https://computingforgeeks.com/?p=178136)
- I found no reliable measured number for llama.cpp RPC with 70B over 1 GbE. One blog estimates about 16 ms of network overhead per token across 80 layers even at 10 Gbps (estimate only) — [DEV Community](https://dev.to/ljkunal/distributed-llm-inference-across-nvidia-blackwell-and-apple-silicon-over-10gbe-2feg)

**distributed-llama (b4rtaz)**
- It uses tensor parallelism with "high-speed synchronization over Ethernet". There is one root node plus 2^n−1 workers ("only on 1, 2, 4... 2^n nodes"), and the maximum number of nodes equals the model's KV heads. Synchronization buffers are `q80` (with `q40` weights). The README shows a switch/router LAN topology — [distributed-llama README](https://github.com/b4rtaz/distributed-llama)
- Models offered: Llama 3.1 8B to 405B Q40 (238 GB), Llama 3.3 70B, Qwen 3 up to 30B-A3B MoE, Qwen 3.5 9B. It has CPU (ARM/AVX2) and experimental Vulkan backends. News: "9 Jan 2025 — Llama 3.3 70B on 4 x Mac Mini M4 Pro 24GB RAM", and "27 Oct 2026 — Diffusion Gemma Fork" — [distributed-llama README](https://github.com/b4rtaz/distributed-llama)
- Maintenance: active. Last commit 2026-11-07 ("feat: new model."), latest tag v0.17.0 (git, 2026-11-08) — [distributed-llama repo](https://github.com/b4rtaz/distributed-llama)
- The README does not mention any transport encryption or auth. Workers listen on a plain `ip:port` such as `10.0.0.2:9999` — [distributed-llama README](https://github.com/b4rtaz/distributed-llama)
- On the prima.cpp Wi-Fi testbed, dllama measured 1150 ms/token for 8B, 2201 ms for 14B and 6235 ms for 45B, and ran out of memory at 65B and 70B. Tensor parallelism suffers on Wi-Fi — [prima.cpp paper](https://arxiv.org/html/2504.08791)

**prima.cpp (now OpenCPIL/prima.cpp; formerly Lizonghang/prima.cpp)**
- It is a llama.cpp fork of about 20K LoC, accepted at ICLR 2026. It uses "pipelined-ring parallelism (PRP) to overlap disk I/O with compute and communication" (mmap offloading with prefetch), together with the Halda scheduler, which co-optimizes per-device CPU/GPU workload and device selection — [arXiv 2504.08791](https://arxiv.org/abs/2504.08791), [prima.cpp README](https://github.com/OpenCPIL/prima.cpp)
- Testbed: four home devices on one Wi-Fi router, with 320-610 Mbps bandwidth and 3-7 ms link latency between devices. The devices are a Mac M1 (2.4 GiB available RAM), a Linux laptop with an RTX 3070, a Linux desktop with an RTX 2080Ti, and a Huawei Mate40Pro phone running Termux, with 37 GiB RAM+VRAM in total — [prima.cpp paper](https://arxiv.org/html/2504.08791)
- TPOT (ms/token) for llama.cpp vs prima.cpp: 8B 15 vs 15, 30B 202 vs 72, 45B 328 vs 233, 60B 7965 vs 468, 70B 10120 vs 674 (about 1.5 tok/s). Speculative decoding gives 32B at 26 tok/s. Memory pressure stays below 6% — [prima.cpp paper, Table 4](https://arxiv.org/html/2504.08791)
- README: "QwQ-32B generates 11 tokens per second, and Llama 3-70B generates 1.5 tokens per second" — [prima.cpp README](https://github.com/OpenCPIL/prima.cpp)
- Network-sensitivity study with 4 Wi-Fi devices, Llama-3-70B and an artificial added RTT: TPOT is "insensitive to bandwidth changes, except under extremely low bandwidth (e.g., lower than 50 Mbps)". Going "from 100 ms to 200 ms [RTT], TPOT rises by 68%". "Bandwidth is no longer the primary bottleneck, but link latency has become the main limiting factor" — [prima.cpp paper, App. A.17](https://arxiv.org/html/2504.08791)
- The README describes setup as "connect them to the same local Wi-Fi", with a ring overlay over a fully connected LAN. The paper calls it "privacy-preserving" in the sense that data stays local, but I found no transport encryption or auth described — [prima.cpp README](https://github.com/OpenCPIL/prima.cpp)
- Maintenance: last commit 2026-09-01 ("Update README"). The paper's v3 was revised on 4 Jul 2026 — [git clone of OpenCPIL/prima.cpp](https://github.com/OpenCPIL/prima.cpp), [arXiv 2504.08791](https://arxiv.org/abs/2504.08791)

**PrivateLM (orailnoor/cross-platform-llm-client), tag 1.0.7-cluster**
- Tag `1.0.7-cluster` points to commit b12a871 of 2026-10-31, titled "feat(cluster): serve PCs, re-find workers, stop crashes, more models" (git ls-remote / clone) — [tag 1.0.7-cluster](https://github.com/orailnoor/cross-platform-llm-client/releases/tag/1.0.7-cluster)
- Mechanism (from source): "Phone cluster: one phone (the master) runs a model whose layers are spread across other phones (workers) on the same Wi-Fi, using llama.cpp's RPC backend." It is built with `GGML_RPC=ON` and RDMA off on Android, and uses default port 50052. Only Android can be master. iOS devices can be workers ("their GPU serves a master's layers") — [llama_cluster.dart @1.0.7-cluster](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/local_plugins/llama_flutter_android/lib/src/llama_cluster.dart), [cluster_service.dart @1.0.7-cluster](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/lib/services/cluster_service.dart)
- Security: "The RPC protocol has no authentication: only run workers on a network you trust." Pairing works through Android NSD discovery, a QR code (`privatelm://worker?host=…&port=…`) or manual `IP:port`. The worker runs as an Android foreground service — [llama_cluster.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/local_plugins/llama_flutter_android/lib/src/llama_cluster.dart), [cluster_service.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/lib/services/cluster_service.dart)
- Planner: it needs about the model size ×1.1 (for KV cache and buffers). The master offers 70% of its free RAM and workers offer 75% of theirs. Devices are ranked by a measured speed in GB/s, the memory bandwidth benchmark. If the model fits locally, the app asks whether to keep it local ("faster: no Wi-Fi in the loop"). Otherwise it fills the fastest phones first: "phones take turns on every token, so the most work belongs on the fastest one, and phones that aren't needed are left out (one less Wi-Fi hop each)" — [cluster_service.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/lib/services/cluster_service.dart)
- The public README at HEAD does not document the cluster feature. It describes the app as a Flutter client wrapping llama.cpp (Vulkan on Android, Metal on iOS) with a cloud API fallback. I found no published benchmarks — [PrivateLM README](https://github.com/orailnoor/cross-platform-llm-client)

**edge-llm-cluster (meliharik/edge-llm-cluster)**
- Pipeline parallelism: "contiguous shards, one per device, sized proportionally to each device's usable memory". Per token, the hidden state that crosses a boundary is "hidden_dim x 2 bytes (about 4 KB for a 3B model, about 8 KB for 8B)". KV caches stay local. Tensor parallelism is rejected because it "would drown Wi-Fi immediately". The coordinator is MLX Swift on macOS, discovery is mDNS, and an open TCP wire protocol is meant for Android and Linux workers (roadmap) — [edge-llm-cluster README](https://github.com/meliharik/edge-llm-cluster)
- Status: Phase 0 (token-exact sharding proof) is done. Phase 1 (first real cluster) is "all pieces in place; first end to end run on real hardware is next". Performance targets, not measurements: ≥15 tok/s for 3B and ≥5 tok/s for 7-8B across 3 devices — [edge-llm-cluster README](https://github.com/meliharik/edge-llm-cluster)
- Security: "Version 1 has no authentication or encryption and targets trusted local networks only … Planned: pre-shared key handshake, then TLS" — [edge-llm-cluster PROTOCOL.md](https://github.com/meliharik/edge-llm-cluster/blob/main/docs/PROTOCOL.md)
- Last commit on the default branch is 2026-08-20 (git). GitHub search lists the repo as updated 2026-10-21 — [repo](https://github.com/meliharik/edge-llm-cluster)

**Petals** (details in Q2): pipeline over the internet with libp2p. Last commit 2024-08-25 ("Upgrade Pydantic to >= 2.0.0"), latest tag v2.2.0 (git, 2026-11-08) — [Petals repo](https://github.com/bigscience-workshop/petals)

### Inferences
- Pipeline parallelism (layer split) is the only scheme that works on Wi-Fi or WAN between consumer devices, because it needs one small activation hand-off per stage per token. Tensor parallelism (distributed-llama, exo-TP) pays off only on very low-latency links (Ethernet LAN, TB5 RDMA). The 18× and larger TPOT gap between dllama/exo and prima.cpp on Wi-Fi reflects this.
- For a single user, pipeline parallelism adds memory, not speed: devices take turns. PrivateLM's own planner encodes this by keeping the model local when it fits.
- None of the LAN projects can be exposed to the internet safely as shipped. An overlay VPN (WireGuard, Tailscale or similar) would be the minimum. This is my inference; no project docs recommend a specific VPN.

### Gaps
- Star counts, release-note text of `1.0.7-cluster` and GitHub issue status could not be retrieved (GitHub API blocked).
- I did not inspect the distributed-llama or exo source for encryption. The README-level absence of a security feature is not proof that none exists.
- I found no first-party measured numbers for distributed-llama, such as the 4× Mac Mini 70B discussion #147, because GitHub discussions were unreachable.
- I found no measured PrivateLM cluster tok/s.

## Q2: Petals over the internet: real throughput for big models, handling of unreliable nodes, privacy

### Takeaway
Petals delivered about 1 step/s on BLOOM-176B in 2022 and up to about 6 tok/s on Llama-2-70B (README claim). Its controlled experiments show sequential decode falling sharply at 100 ms RTT (BLOOM-176B on 10× RTX 3090: 1.17 → 0.34 steps/s), while batched throughput degrades far less. Fault tolerance comes from client-side activation caches plus a decentralized load balancer. Privacy is weak by design: peers see your activations. The codebase has been inactive since August 2024.

### Cited Findings
- The original paper ran "inference of BLOOM-176B on consumer GPUs with ≈ 1 step per second" — [Petals paper, arXiv 2209.01188](https://arxiv.org/abs/2209.01188)
- The README claims single-batch inference "up to 6 tokens/sec for Llama 2 (70B) and up to 4 tokens/sec for Falcon (180B)". It lists Llama 3.1 up to 405B, Mixtral 8x22B and BLOOM-176B as supported — [Petals README](https://github.com/bigscience-workshop/petals)
- Llama 2 70B on 3× T4, sequential inference in steps/s at sequence length 128: 1 Gbit/s with <5 ms RTT gives 2.29, and 100 Mbit/s with 100 ms RTT gives 1.57. Offloading gives 0.139. Parallel forward with batch 64×128: 155.1 tok/s (LAN) vs 128.7 tok/s (100 Mbit/s, 100 ms) — [arXiv 2312.08361, Table 2](https://arxiv.org/html/2312.08361)
- BLOOM-176B: 3× A100 at 1 Gbit/s gives 1.71 steps/s, and local NVLink pipeline gives 2.46. 10× RTX 3090 gives 1.17 steps/s (1 Gbit/s, <5 ms), 1.05 (100 Mbit/s, <5 ms) and 0.34 (100 Mbit/s, 100 ms). Offloading gives 0.0427 — [arXiv 2312.08361, Table 3](https://arxiv.org/html/2312.08361)
- Real-world BLOOM test: "14 smaller servers holding 2× RTX 3060, 4× 2080Ti, 2× 3090, 2× A4000, and 4× A5000 … spread across Europe and North America and connected to the Internet at speeds of 100–1000 Mbit/s. Four of the servers operate from behind firewalls", traversed with the libp2p Circuit Relay — [arXiv 2312.08361](https://arxiv.org/html/2312.08361)
- Fault tolerance uses "dual attention caches": a server-side cache holds the KV for its layers, and a client-side cache holds "past inputs sent to a given pipeline stage". On failure, the client replays these inputs to a replacement server. Load balancing is decentralized: each server measures network and GPU throughput and picks blocks to maximize total swarm throughput — [arXiv 2312.08361](https://arxiv.org/html/2312.08361)
- The paper's conclusion: "a large enough model (50B+) can run efficiently even on geodistributed devices in a consumer-grade network", and Petals is "up to 10× faster than offloading" — [arXiv 2312.08361](https://arxiv.org/abs/2312.08361)
- Privacy: "Your data will be processed with the help of other people in the public swarm … For sensitive data, you can set up a private swarm among people you trust." Security: "Hosting a server does not allow others to run custom code on your computer" — [Petals README](https://github.com/bigscience-workshop/petals)
- Maintenance: last commit 2024-08-25, tag v2.2.0 (git clone, 2026-11-08) — [Petals repo](https://github.com/bigscience-workshop/petals). A July 2026 blog says there is limited recent GitHub activity and recommends checking maintenance status before relying on it (secondary source) — [explainx blog](https://explainx.ai/blog/petals-distributed-llm-inference-revisited-july-2026)

### Inferences
- Moving from LAN to 100 ms RTT cuts Petals' interactive speed by about 30% (3 stages, Llama-70B) to about 70% (10 stages, BLOOM-176B). The penalty scales with the number of pipeline hops. Batched throughput is barely affected (155 → 129 tok/s), so Petals over WAN suits batch work far better than chat.
- Each Petals server sees the hidden states of the layers it serves, and a malicious server can return wrong outputs. A public swarm is therefore unsuitable for private data, and results are not verified.

### Gaps
- Exact tok/s from the real-world two-continent BLOOM run were not extracted from the paper text.
- I found no measured Petals number for Llama 3.1 405B. health.petals.dev was unreachable (connection reset), so the current swarm size is unknown.
- The Petals privacy/security wiki page was not reachable (GitHub blocked).

## Q3: Research on decentralized/WAN inference and training (SWARM, DiLoCo/OpenDiLoCo, Prime Intellect, Nous DisTrO/Psyche, 2024–2026 papers, network speculative decoding, MoE distribution)

### Takeaway
Training over WAN has become practical through low-communication optimizers: DiLoCo is 500× less communication, INTELLECT-1 400×, DeMo 85×. Real runs include INTELLECT-1 (10B), INTELLECT-2 (32B with decentralized RL rollouts) and Psyche's Consilience 40B. Inference over WAN research (Parallax, BloomBee) improves scheduling and throughput but does not remove per-token latency. A 2026 analysis argues that edge-draft/cloud-verify speculative decoding rarely lowers single-request latency at WAN round-trip times.

### Cited Findings
**Training**
- SWARM parallelism (2023) is "a model-parallel training algorithm designed for poorly connected, heterogeneous and unreliable devices" that builds "temporary randomized pipelines … rebalanced in case of failure". It trained about a 13B-equivalent (1B shared parameters) Transformer "on preemptible T4 GPUs with less than 200Mb/s network" — [SWARM, arXiv 2301.11913](https://arxiv.org/abs/2301.11913)
- DiLoCo (DeepMind, 2023) is federated-averaging style training with AdamW inner and Nesterov outer optimizers. "DiLoCo on 8 workers performs as well as fully synchronous optimization while communicating 500 times less" — [arXiv 2311.08105](https://arxiv.org/abs/2311.08105)
- OpenDiLoCo (Prime Intellect, 2024) trained "across two continents and three countries, while maintaining 90-95% compute utilization", built on Hivemind — [arXiv 2407.07852](https://arxiv.org/abs/2407.07852). Repo last commit 2025-01-13 — [OpenDiLoCo repo](https://github.com/PrimeIntellect-ai/OpenDiLoCo)
- INTELLECT-1 (Dec 2024) is a 10B model trained on 1T tokens. It used "up to 14 concurrent nodes distributed across 3 continents, with contributions from 30 independent compute providers", with 83-96% compute utilization. Its int8 all-reduce and DiLoCo-FSDP2 cut bandwidth 400× — [arXiv 2412.01152](https://arxiv.org/abs/2412.01152)
- INTELLECT-2 (May 2025) was "the first globally distributed reinforcement learning (RL) training run of a 32 billion parameter language model". It used "a dynamic, heterogeneous swarm of permissionless compute contributors", with TOPLOC to verify "rollouts from untrusted inference workers" and SHARDCAST to broadcast weights — [arXiv 2505.07291](https://arxiv.org/abs/2505.07291)
- INTELLECT-3 (Dec 2025) is a 106B MoE (12B active) built with SFT and RL on GLM-4.5-Air-Base, "scaling RL training up to 512 H200s". It was centralized, not decentralized — [arXiv 2512.16144](https://arxiv.org/abs/2512.16144). prime-rl is very active (last commit 2026-11-07) — [prime-rl repo](https://github.com/PrimeIntellect-ai/prime-rl)
- DeMo (Nous, the basis of DisTrO) "transmits up to 85x less data per GPU than AdamW-DDP while achieving comparable loss" and is "topology-agnostic and enables training across multi-datacenter or Ethernet-based setups" — [arXiv 2411.19870](https://arxiv.org/abs/2411.19870). DisTrO repo last commit 2025-10-14 — [DisTrO repo](https://github.com/NousResearch/DisTrO)
- Nous Psyche: Consilience 40B (MLA architecture, 20T tokens) is described as "the largest distributed pre-training run" by parameters and data, coordinated on Solana. The bandwidth-reduction claims (1000-10000×) vary across secondary sources — [Nous: The Next Phase of Psyche](https://nousresearch.com/the-next-phase-of-psyche), [CO/AI](https://getcoai.com/news/nous-research-launches-tool-to-train-ai-models-across-distributed-networks). Psyche repo last commit 2026-03-20 — [psyche repo](https://github.com/PsycheFoundation/psyche)

**Decentralized inference papers**
- Parallax (Gradient, Sep 2025) is a two-phase scheduler. Model allocation places layers across heterogeneous GPUs under memory and link-bandwidth constraints, then per-request pipeline selection "stitches layers from different replicas". It was evaluated "over real volunteer nodes" — [arXiv 2509.26182](https://arxiv.org/abs/2509.26182)
- BloomBee (Apr 2026) is "internet-scale" and combines layer assignment, micro-batching, tensor offloading, lossless compression and speculative decoding tuned for low bandwidth. It reports up to 1.76× throughput and 43.2% lower latency than state-of-the-art decentralized systems (baselines include Petals and Helix) — [arXiv 2604.21072](https://arxiv.org/abs/2604.21072)
- "Shard" (c0mpute, blog post, not peer-reviewed) reports that naive pipeline parallelism over WAN gives about 1.87 tok/s and proposes ring/direct-return topologies — [starlog.is](https://starlog.is/articles/llm-engineering/leyten-shard)

**Speculative decoding across the network**
- "Speculation at a Distance" (Jun 2026): co-located speculative decoding gives 1.5-3×. Distributed speculative decoding (draft on the edge, target in the cloud) has a "per-request latency benefit [that] is limited under WAN edge-cloud communication". Pipelining helps "only in low-RTT regimes". The real benefit is multi-tenant capacity: the server sustains (1+γ·t_d/t_v)× more clients — [arXiv 2606.25091](https://arxiv.org/abs/2606.25091)
- SPADE (Aug 2026): an edge draft with a cloud verifier "reduces the cloud model calls by 76% with zero loss in accuracy" — [arXiv 2608.13076](https://arxiv.org/abs/2608.13076)
- Edge-cloud speculative decoding with early exits (TMLR 2025): Jetson Nano draft (Vicuna-68M) and A100 target (Llama2-7B) give "up to a 35% reduction in latency compared to cloud-based autoregressive decoding", plus 11% from preemptive drafting — [arXiv 2505.21594](https://arxiv.org/abs/2505.21594)
- prima.cpp with speculative decoding reaches 32B at 26 tok/s on its home cluster — [arXiv 2504.08791](https://arxiv.org/abs/2504.08791)

**MoE across devices**
- OD-MoE (Dec 2025) does on-demand expert loading across a 10-node edge testbed of GPU machines, not phones. It reaches about 75% of the decode speed of a fully GPU-cached deployment with 1/3 of the GPU memory — [arXiv 2512.03927](https://arxiv.org/abs/2512.03927)
- AirMoE (2026) hosts the gateway and LM head on an edge server and spreads the experts across wireless devices — [arXiv 2608.22932](https://arxiv.org/pdf/2608.22932)
- distributed-llama supports Qwen3-30B-A3B MoE on CPU and Vulkan (2025) — [distributed-llama README](https://github.com/b4rtaz/distributed-llama)

### Inferences
- The training results do not carry over to inference latency. DiLoCo-style methods hide communication over many local steps, but autoregressive decode has a hard dependency on every token.
- The most successful decentralized compute use so far, INTELLECT-2, put untrusted volunteers on rollout inference, which is batch generation that tolerates latency, and verified their output with TOPLOC. That is the template for "pooling" that works.
- Spreading MoE experts across WAN devices would add a round trip to every MoE layer, possibly more than one per layer. It is only promising on LAN or wireless-edge setups.

### Gaps
- I did not retrieve concrete Parallax tok/s numbers, a primary Psyche bandwidth figure, or Prime Intellect's 2026 decentralized-inference work, if any exists.
- I found no peer-reviewed paper on MoE expert parallelism across consumer smartphones.

## Q4: Physics — activation size, latency per hop, why decode is latency-bound, batch vs single-user, WAN latency implications

### Takeaway
A decode step sends only a few KB per hop: hidden size × 2 bytes, so 8 KB at d=4096 and 16 KB at d=8192. Bandwidth is irrelevant for decode. Each pipeline hop adds a full network one-way latency to every token, so 4 WAN hops at 20-50 ms cap the cluster at a few tok/s even with infinitely fast compute. Tensor parallelism needs about 2 syncs per layer and is hopeless over WAN. Batching amortizes latency, so throughput survives WAN while single-user speed does not.

### Cited Findings
- Hidden state per boundary per token = `hidden_dim × 2 bytes`, "about 4 KB for a 3B model, about 8 KB for 8B". N devices means N hops per token. Tensor parallelism "needs an all-reduce inside every attention and MLP block, hundreds of round trips per token" — [edge-llm-cluster README](https://github.com/meliharik/edge-llm-cluster)
- "Autoregressive generation requires many sequential communication rounds, making it sensitive to network latency" — [arXiv 2312.08361](https://arxiv.org/html/2312.08361)
- "At small batch sizes, decoding is bandwidth-bound" (memory bandwidth) — [prima.cpp paper](https://arxiv.org/html/2504.08791). PrivateLM ranks devices by measured GB/s because "token generation speed follows this closely" — [llama_cluster.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/local_plugins/llama_flutter_android/lib/src/llama_cluster.dart)
- prima.cpp measured that bandwidth matters only below about 50 Mbps, while RTT from 100 to 200 ms raises TPOT by 68% — [prima.cpp App. A.17](https://arxiv.org/html/2504.08791)
- Petals: sequential speed collapses with RTT (BLOOM 10 stages: 1.05 → 0.34 steps/s from <5 ms to 100 ms RTT), but batched parallel forward keeps most of its throughput (Llama-70B: 155 → 129 tok/s) — [arXiv 2312.08361](https://arxiv.org/html/2312.08361)
- RDMA over TB5 cut latency from about 300 µs to under 50 µs, and that is what made tensor parallelism scale on Macs. Over TCP, llama.cpp got slower with more nodes — [Jeff Geerling](https://www.jeffgeerling.com/blog/2025/15-tb-vram-on-mac-studio-rdma-over-thunderbolt-5), [AppleInsider](https://appleinsider.com/articles/25/12/20/ai-calculations-on-mac-cluster-gets-a-big-boost-from-new-rdma-support-on-thunderbolt-5)

### Inferences
These are my own calculations from standard physics and the formulas above; they are not taken from a source.
- **Activation size.** d=4096 in FP16 is 8 KB per token per hop. On a 10 Mbit/s uplink that serializes in about 6.5 ms, and on 100 Mbit/s in about 0.65 ms. d=8192 (Llama-70B class) is 16 KB. Prefill is different: 2,000 prompt tokens × 8 KB = 16 MB per hop, which is about 13 s on a 10 Mbit/s home uplink and about 1.3 s on 100 Mbit/s. On asymmetric home connections, prefill can therefore become bandwidth-bound.
- **Pipeline latency floor.** Per token, t ≥ Σ compute_i + Σ one-way latency of each hop (a ring back to the head ≈ one full loop). With 4 devices at 25 ms one-way each, the network alone takes about 100 ms/token, a cap of about 10 tok/s. At 50 ms per hop (Starlink-like 25-60 ms) the cap is about 5 tok/s. With slow consumer compute added (prima.cpp's 70B already needs about 674 ms/token on LAN), real numbers land around 0.5-2 tok/s for 70B.
- **Tensor parallel over WAN.** With 80 layers × 2 all-reduces = 160 sync points per token, at 20 ms RTT that is about 3.2 s/token (about 0.3 tok/s) before compute. It is unusable.
- **Speed of light.** In fiber, light travels about 5 µs/km, so 1000 km is about 5 ms one-way before routing. A "neighborhood" pool in one city could reach about 5-15 ms RTT, while cross-country or intercontinental pools reach 50-150 ms.
- **Batching.** Throughput scales with batch size and number of concurrent pipelines, because each stage can work on different requests (micro-batching). Aggregate tokens/s across many users can be high even when each user sees only 1-2 tok/s.

### Gaps
- I found no primary measurements of residential-to-residential RTT distributions or Starlink peer-to-peer RTT in this session. The ranges 10-50 ms (fiber) and 25-60 ms (Starlink) are taken from the assignment, not verified.
- I found no measured study of pipeline inference across residential NAT'd connections with phones (as opposed to university servers).

## Q5: Which use cases tolerate slow distributed inference, and what is realistic for pooling phones/PCs of normal people over the internet

### Takeaway
Realistic: (a) a LAN or home cluster (same Wi-Fi) running 30-70B models at about 1.5-11 tok/s (prima.cpp), and (b) WAN pools of volunteer GPUs for batch or background jobs (RL rollouts, bulk summarization, embeddings, evals) where throughput matters and latency does not. Unrealistic: interactive chat with large models over the internet on pooled phones. Latency per hop, device churn (phones sleep or get throttled), asymmetric uplinks, missing transport security and untrusted peers (privacy, result integrity) all work against it.

### Cited Findings
- Petals batched throughput over 100 ms/100 Mbit/s stays at about 83% of LAN, while sequential speed drops much more — [arXiv 2312.08361](https://arxiv.org/html/2312.08361)
- INTELLECT-2 used permissionless, untrusted inference workers for RL rollouts, with TOPLOC verification. This is a working example of latency-tolerant decentralized inference — [arXiv 2505.07291](https://arxiv.org/abs/2505.07291)
- Distributed speculative decoding pays off mainly for multi-tenant server capacity, not single-request latency — [arXiv 2606.25091](https://arxiv.org/abs/2606.25091)
- Home Wi-Fi clusters: 70B at about 1.5 tok/s, QwQ-32B at 11 tok/s, 32B with speculative decoding at 26 tok/s — [prima.cpp README](https://github.com/OpenCPIL/prima.cpp), [arXiv 2504.08791](https://arxiv.org/abs/2504.08791)
- The PrivateLM worker status tracks `throttled` and `batteryUnrestricted` flags, and the planner tolerates workers that are "off or away". This shows that phone churn and throttling are real operational issues — [llama_cluster.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/local_plugins/llama_flutter_android/lib/src/llama_cluster.dart), [cluster_service.dart](https://github.com/orailnoor/cross-platform-llm-client/blob/1.0.7-cluster/lib/services/cluster_service.dart)
- edge-llm-cluster: "The goal is possible, not fast … the cluster does not add speed; it adds memory" — [edge-llm-cluster README](https://github.com/meliharik/edge-llm-cluster)
- Petals warns that public-swarm data is processed by other people, and recommends private swarms for sensitive data — [Petals README](https://github.com/bigscience-workshop/petals)

### Inferences
- **Tolerant use cases:** overnight batch jobs (document summarization, classification, translation of archives), embedding generation, synthetic data or RL rollouts, evaluation runs, agent tasks with long deadlines (minutes to hours), and asynchronous "email-style" assistants. Many independent requests can each run on one device or one small LAN group, so you get data parallelism across devices rather than model splitting across WAN.
- **Best architecture for "pooling normal people's devices":** route whole requests to devices or home clusters that can each hold a full (small/medium, quantized) model. Do not pipeline one model across homes. Use the WAN for job distribution, not for per-token activations. Use pipeline splitting only within a LAN or home.
- **Security minimum for any WAN pooling:** an encrypted, authenticated overlay (none of the inspected tools provide one natively), plus output verification (TOPLOC-like spot checks or redundant execution), plus the explicit acceptance that remote peers can read prompts and activations unless TEEs are used.
- **Interactive use over WAN:** at most about 1-5 tok/s for 30-70B across 2-4 hops in good conditions. That is more plausible with a speculative local draft model and a few powerful peers (gaming PCs with GPUs) than with phones. Phones contribute mainly as memory or layer holders on LAN and are poor WAN peers (battery, OS background limits, NAT, thermal throttling).

### Gaps
- I found no published end-to-end measurement of a phone-based cluster across different households over the public internet.
- I found no data on the economics or incentive designs for consumer-device inference pools, beyond the crypto-coordinated training of Psyche.
