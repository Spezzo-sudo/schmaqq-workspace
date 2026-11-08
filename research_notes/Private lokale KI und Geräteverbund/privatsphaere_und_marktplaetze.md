# Privacy for inference on foreign devices, and decentralized compute marketplaces

Research status: November 8, 2026. Items marked **[prior knowledge, not re-fetched]** come from well-known primary pages that were not re-opened in this session. Verify them before quoting exact wording. Items marked **[older]** date from before 2025.

---

## 1. Confidential computing (TEEs) for AI: maturity, overhead, attestation, and use on consumer devices

### Takeaway
Datacenter GPU TEEs are production-ready. NVIDIA H100/H200/Blackwell paired with AMD SEV-SNP or Intel TDX costs under about 9% on average for LLM inference, mostly from encrypted PCIe I/O. Apple PCC and Google Private AI Compute show the full architecture: attested, stateless nodes and transparency logs. TEEs on consumer hardware (gaming GPUs, phones) are a different story. Third-party apps cannot use them to protect their own inference on someone else's device in 2026. Android's new AISeal (Oct 2026) is a platform enclave, not a public app API, and has no NPU/GPU access yet.

### Cited Findings
**NVIDIA GPU confidential computing**
- A Phala Network benchmark study (arXiv 2409.03992, Sept 2024, several revisions) measured vLLM with TEE mode on and off on H100. Later versions report an average overhead under 9%. v1 said "below 5% for most typical queries", and the Phala blog says under 7%. The figures differ between versions. — [arXiv 2409.03992 v2](https://arxiv.org/html/2409.03992v2); [v4](https://arxiv.org/html/2409.03992v4); [Phala blog](https://phala.com/posts/confidential-computing-on-nvidia-h100-gpu-a-performance-benchmark-study)
- In the same study, the 8B model had the highest overhead. A 70B model (4-bit on one H100) showed overhead near zero. Time to first token (TTFT) is hit harder than inter-token latency, so the authors attribute the cost to I/O (encrypted CPU-GPU transfer), not compute. Overhead falls as sequence length grows. The study covers only three models and vLLM v0.5.4. — [arXiv 2409.03992](https://arxiv.org/pdf/2409.03992)
- In Hopper's multi-GPU passthrough mode (PPCIe), GPU-to-GPU NVLink traffic is not encrypted. Blackwell HGX/DGX supports secure multi-GPU TEE setups with 1, 2, 4 or 8 GPUs, with NVLink encryption per vendor blogs. These are vendor and neocloud claims, not checked against NVIDIA's primary docs. — [Spheron blog](https://www.spheron.network/blog/confidential-gpu-computing-nvidia-tee-encrypted-vram/); [Chutes TEE announcement](https://chutes.ai/news/i-built-an-open-source-tee-stack-for-confidential-gpu-compute)
- NVIDIA's whitepaper "Secure AI with Blackwell and Hopper GPUs" (Aug 2025) is the primary reference, including a multi-GPU passthrough section. Only its table of contents was visible here. — [NVIDIA whitepaper PDF](https://docs.nvidia.com/nvidia-secure-ai-with-blackwell-and-hopper-gpus-whitepaper.pdf)
- How H100 CC works: the GPU must be paired with a CPU TEE (AMD SEV-SNP or Intel TDX confidential VM). Data crosses PCIe through encrypted bounce buffers. The GPU provides an attestation report that is checked via NVIDIA's attestation service or a local verifier. **[prior knowledge, not re-fetched; older, 2023]** — [NVIDIA dev blog: Confidential Computing on H100](https://developer.nvidia.com/blog/confidential-computing-on-h100-gpus-for-secure-and-trustworthy-ai/)
- TEE-I/O (Intel TDX Connect / PCIe TDISP) is still listed as "the road ahead", meaning a future replacement for bounce buffers. — [in2p3 bounce buffer article](https://think.in2p3.fr/?p=1252)
- Research on end-to-end CPU+GPU TEE pipelines continues, for example EnclaveX (arXiv 2606.31408, June 2026). Only the title and abstract page were seen. — [alphaXiv EnclaveX](https://www.alphaxiv.org/abs/2606.31408)

**Apple Private Cloud Compute (PCC)**
- Apple's PCC design blog (June 2024) defines five core requirements. These are: stateless computation on personal data; enforceable guarantees; no privileged runtime access; non-targetability; and verifiable transparency. Devices send requests only to nodes whose attested software measurements appear in a public transparency log. Nodes are Apple-silicon servers with Secure Enclave and Secure Boot. **[prior knowledge, not re-fetched; older, 2024]** — [Apple Security Blog: Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/)
- In Oct 2024 Apple released a Virtual Research Environment (VRE) for macOS 15.1, requiring Apple silicon and 16 GB or more. It lets anyone list and inspect PCC releases, verify transparency-log consistency, download binaries, boot a release in a VM with a virtual SEP, and run inference against demo models. Bug bounties go up to $1M for remote code execution. **[older, 2024]** — [Apple: Security research on PCC](https://security.apple.com/blog/pcc-security-research/); [9to5Mac](https://9to5mac.com/2024/10/24/apple-private-cloud-compute-ai/); [SecurityWeek](https://www.securityweek.com/apple-opens-private-cloud-compute-for-public-security-inspection/)

**Google Private AI Compute (announced Nov 11, 2025)**
- It runs on Trillium TPUs plus "Titanium Intelligence Enclaves" (TIE). CPU workloads use an AMD-based hardware TEE (SEV-SNP). Workload credentials are provisioned only after the node's attestation is validated against reference values, and workloads mutually validate each other. — [The Hacker News](https://thehackernews.com/2025/11/google-launches-private-ai-compute.html); [The Register](https://www.theregister.com/2025/11/12/google_touts_private_ai_compute/); [SiliconANGLE](https://siliconangle.com/2025/11/11/google-details-cloud-based-private-ai-compute-system-securing-pixel-data/)
- An external assessment (NCC Group, per The Hacker News) found three issues in the attestation implementation that could cause denial of service. A researcher noted that the TPU platform's security "has definitely been less scrutinized (at least publicly)" than SEV-SNP. Google promised client-side attestation verification, external inspection of attestation data, and VRP coverage. — [The Hacker News](https://thehackernews.com/2025/11/google-launches-private-ai-compute.html)
- Later news coverage reports persistent server-side memory being added to Private AI Compute. Not verified in detail. — [Unite.AI](https://www.unite.ai/google-brings-persistent-server-side-memory-to-private-ai-compute/)

**Android / phones**
- AVF/pKVM protected VMs keep "the integrity of the executed code and confidentiality of the pVM's assets, even if host Android ... compromised". AVF targets security use cases that need isolation stronger than the app sandbox. — [AOSP AVF overview](https://source.android.com/docs/core/virtualization)
- A 2023 Android blog says AVF is "only for developers of privileged applications and platform developers". **[older]** — [Android Developers Blog (Dec 2023)](https://goo.gle/3GBkUQK)
- On Oct 7, 2026 Google announced **AISeal** ("Android on-device AI seal"). It is a pKVM protected-VM vault for personal AI context. pKVM ships via GKI and is certified to SESIP Level 5. MediaTek Dimensity 9600 Pro supports it, and Qualcomm Snapdragon support comes via AVF. The current milestone is isolated personal-context storage only. In-vault inference, direct NPU device assignment, and confidential cloud extension are future work. The post does not describe third-party app access or attestation. — [Google blog: AISeal](https://blog.google/security/enabling-the-next-gen-enclave-architecture-for-on-device-ai-on-android/); [Privacy Guides summary](https://www.privacyguides.org/news/2026/10/09/android-on-device-ai-gets-a-security-bump-with-next-gen-enclaves.md)
- AnBridge (DSN 2026) is academic work porting on-device AI apps into pVMs. It adds about 600 LOC to the pVM TCB and has measurable overhead. This is research, not a shipping API. — [AnBridge paper (Purdue)](https://engineering.purdue.edu/dcsl/publications/papers/2026/anbridge-dsn26.pdf)

### Inferences
- In a "share your GPU" network, a TEE can only protect the user from the host if the host hardware has a GPU TEE. Today that means H100/H200/B200-class datacenter GPUs plus SEV-SNP/TDX servers. Consumer GeForce/Radeon cards and gaming PCs have no equivalent for third-party code. I found no source showing consumer-GPU CC support, which is consistent with NVIDIA listing CC only for Hopper/Blackwell datacenter parts.
- Phones cannot act as trustworthy workers for others' data. Third-party apps get no attestable enclave with NPU/GPU access. AISeal protects the phone owner's data from the phone's own OS, not a stranger's data from the phone owner.
- For a small team, TEE overhead is low (under 10%). The real costs are operational: specific hardware, attestation verification on the client, reproducible builds, a transparency log, and a key-release service. Apple and Google needed years and dedicated security teams to build this. A small team could realistically rent attested CC instances from a neocloud or a "TEE GPU" provider and verify attestation client-side, rather than build PCC itself.

### Gaps
- No primary NVIDIA statement was checked on whether consumer GeForce/RTX PRO workstation GPUs support CC mode. RTX PRO 6000 Blackwell may support it per some claims, but this is unverified.
- No independent Blackwell CC overhead benchmark was found. Most numbers are Hopper-era (2024).
- Arm CCA (Realms) and Intel TDX/AMD SEV-SNP details, such as consumer availability and phone deployment of CCA realms for apps, were not researched in this session. No source was found showing CCA realms available to third-party Android apps in 2026.
- Android Private Compute Core architecture was not re-checked in this session.

---

## 2. Cryptographic approaches (FHE, MPC), split inference, and inversion attacks

### Takeaway
FHE and MPC for full LLM inference are still 2 to 4 orders of magnitude too slow for interactive use in 2026. The best FHE results run at roughly 18 to 22 s per output token for Llama-3-8B on 8 high-end GPUs. MPC runs at about 3 to 7 s per token for a 6B model under good networks, with tens of MB per token of traffic. Split or pipeline inference, where one worker sees intermediate activations, gives **no meaningful privacy**. Several 2025–2026 papers reconstruct prompts (up to about 4k tokens) from hidden states, including deep layers.

### Cited Findings
**FHE**
- A CKKS implementation of Llama-3-8B (arXiv 2601.18511, Jan 2026, revised June 2026) on 8 NVIDIA RTX PRO 6000 GPUs takes about 20 s prefill plus about 18 s per output token with 128 encrypted tokens. With 4096 tokens, only the last 128 encrypted, it takes 64 s prefill plus 22 s per token. — [arXiv 2601.18511](https://arxiv.org/abs/2601.18511); [alphaXiv](https://www.alphaxiv.org/abs/2601.18511)
- The earlier CKKS Llama-2-7B result on 8 RTX 4090s was 85 s prefill plus 33 s per output token. — [Moonlight review of the Llama-2-7B CKKS paper](https://www.themoonlight.io/review/scaling-up-privacy-preserving-ml-a-ckks-implementation-of-llama-2-7b)
- An FHE-on-Llama-3 paper (arXiv 2604.12168, April 2026) reports up to 80 tok/s for a modified single-head quantized model and 8.91 to 30 tok/s for a multi-head variant on an Apple M3, against 142 tok/s plaintext. These are heavily modified or partial models, not full Llama-3 under encryption. Summaries conflict on 30 vs 8.91 tok/s. — [Emergent Mind 2604.12168](https://www.emergentmind.com/papers/2604.12168); [Moonlight review](https://www.themoonlight.io/review/fully-homomorphic-encryption-on-llama-3-model-for-privacy-preserving-llm-inference)
- NEXUS (non-interactive secure transformer inference) has an amortized 51.84 s per token. One summary labels it an "MPC-style" comparison, but NEXUS is HE-based, so the label is inconsistent. — [alphaXiv 2601.18511](https://www.alphaxiv.org/abs/2601.18511.md)
- A secondary opinion source (Feb 2026) puts the FHE overhead at roughly 1,000× to 10,000× versus plaintext. — [Wavect blog](https://wavect.io/blog/fully-homomorphic-encryption-practical-2026.md)
- Zama's Concrete ML is the main open-source FHE ML toolkit. Its LLM demos encrypt only parts of small models (e.g., GPT-2). **[prior knowledge, not re-fetched]** — [Concrete ML GitHub](https://github.com/zama-ai/concrete-ml)

**MPC**
- PermLLM (2024) runs two-party ChatGLM-6B at about 3 s per token with 10 ms RTT and 1 Gbps, or about 7 s per token with 20 ms RTT and 100 Mbps. About 20 MB per token after the prompt. It relies on weaker, permutation-based security for nonlinear layers. **[older]** — [alphaXiv 2405.18744](https://alphaxiv.org/abs/2405.18744)
- BumbleBee (NDSS 2025): a private inference on a 12-layer BERT can need up to 90 GB of communication in earlier systems. BumbleBee is an order of magnitude better than Iron and 3× faster than BOLT. — [NDSS 2025 paper](https://ndss-symposium.org/wp-content/uploads/2025-57-paper.pdf)
- Nimbus (NeurIPS 2024) is 2.7 to 5.9× faster than BumbleBee on BERT-base with 60% less communication. These are encoder-scale results, not LLM chat. — [arXiv 2411.15707](https://arxiv.org/html/2411.15707v1)
- PUMA claims "secure inference of LLaMA-7B in five minutes" for a whole prompt. — [Security and Safety (2025)](https://sands.edpsciences.org/articles/sands/abs/2025/01/sands20250020/sands20250020.html)

**Split / pipeline inference and inversion attacks**
- "Depth Gives a False Sense of Privacy" (arXiv 2507.16372, July 2025) uses white-box inversion of LLM internal states, including deep layers, and recovers prompts up to 4,112 tokens long. — [arXiv 2507.16372](https://arxiv.org/html/2507.16372v1)
- Prompt inversion against collaborative inference (arXiv 2503.09022, 2025) addresses exactly the pipeline setting: a malicious participant reconstructs the prompt from activations passed by the previous participant. It far exceeds the best baseline (22.8%). — [arXiv 2503.09022](https://arxiv.org/pdf/2503.09022v2)
- arXiv 2607.00852 (July 2026) does gradient-based inversion of last-layer hidden states. GPT-2's last-layer states carry nearly as much information about the input as the text itself. — [arXiv 2607.00852](https://arxiv.org/abs/2607.00852)
- "Embed Parrot" trains a lightweight transformer that maps hidden states back to input embeddings. — [Moonlight review](https://www.themoonlight.io/review/information-leakage-from-embedding-in-large-language-models)
- Language Model Inversion (2023) recovers hidden prompts from output logits alone. **[older]** — [arXiv 2311.13647](https://arxiv.org/pdf/2311.13647)
- Petals, the BitTorrent-style pipeline of transformer blocks across volunteers, warns that public-swarm peers process your data. It recommends a private swarm for sensitive data. **[prior knowledge, not re-fetched; older]** — [Petals GitHub](https://github.com/bigscience-workshop/petals)

### Inferences
- What a pipeline worker learns: anyone holding layers k..n sees the activations of every token. With the published attacks and open weights, it can reconstruct the prompt nearly verbatim. The last-layer worker also sees the output distribution, and so the generated text. Holding only "middle layers" is not protection.
- Noise or obfuscation of activations (differential privacy, permutation) trades accuracy for weak and often broken guarantees. None of the sources show a practical, strong defense for LLM pipeline splitting.
- For a small team, FHE and MPC are research-grade. They can be used for tiny models or narrow sub-tasks (classification, embedding similarity), not general chat. Expect seconds to tens of seconds per token on top-end multi-GPU hardware, plus heavy engineering.

### Gaps
- I did not verify a Zama-specific 2026 LLM benchmark. Zama's own current numbers are missing.
- No 2026 MPC benchmark for a 7B+ decoder with per-token latency under realistic WAN conditions, such as consumer home networks, was found.
- No evaluation was found of split learning defenses that hold up against the 2025–2026 inversion attacks.

---

## 3. Decentralized compute marketplaces: model, privacy, verification, real-world problems

### Takeaway
Almost all marketplaces rent whole jobs, containers or VMs to a single host, and the host can in principle see the data. Privacy rests on host vetting, container isolation, intrusion monitoring, and (newly) optional GPU TEEs on datacenter hosts. Verification of honest computation varies. Projects use reputation, staking and auditors (Akash, Golem); redundancy and sampling games (Hyperbolic PoSP); activation hashing (Prime Intellect TOPLOC); refereed delegation with bitwise-reproducible ops (Gensyn Verde); or nothing cryptographic at all (Render, many DePINs). Sybil and fake-hardware fraud has occurred at scale (io.net, about 1.8M fake GPUs, April 2024).

### Cited Findings
**Model and privacy by platform**
- **Vast.ai** (marketplace of individual and datacenter hosts): clients are isolated in unprivileged Docker containers. Vast says "individual hosts may have less formal security measures" and points to Tier-4 datacenter hosts for sensitive work. It also markets NVIDIA Confidential Computing offerings. — [Vast security FAQ](https://docs.vast.ai/guides/reference/faq/security.md); [Vast: Running private AI models](https://vast.ai/article/running-private-ai-models-without-the-risk-of-data-exposure); [Vast: NVIDIA Confidential Computing](https://vast.ai/article/Absolute-Security-with-NVIDIA-Confidential-Computing)
- A third-party guide says the host's root user "could in principle observe activity in the container". This is unverified against Vast docs, but it follows from how Docker works. — [Trust and verification guide](https://chrisgmartin-github-io.pages.dev/neocloud/vast-ai/07-trust-verification-networking)
- RunPod Community-tier hosts retain Docker host access (processes, volumes, filesystem). Third-party analysis. — [State of Surveillance: RunPod](https://stateofsurveillance.org/resources/runpod/)
- **SaladCloud** runs on idle consumer gaming GPUs (RTX 3060 up to 5090) as containers. It monitors for host intrusion (folder access, shell attempts) and destroys and blacklists the machine on detection. It holds SOC 2 Type I and uses ephemeral storage. Monitoring is detection, not cryptographic protection. — [Salad.com](https://salad.com/); [Northflank on Salad alternatives](https://northflank.com/blog/saladcloud-alternatives)
- **Akash** (container leases on provider clusters): hardware is verified by a decentralized network of Auditors and accredited "trusted providers". AEP-29 proposes hardware verification via TEEs. Trust is largely economic and reputational. — [Akash AEP-9 Trusted Providers](https://akash.network/roadmap/aep-9/); [Akash AEP-29](https://akash.network/roadmap/aep-29/)
- **Golem** (requestor/provider task market): reputation tracks success rate, provider age and uptime. — [Medium overview of decentralized GPU clouds](https://medium.com/@bhagyarana80/10-decentralized-gpu-clouds-taking-on-aws-7bfac993c86f) (secondary)
- **Nosana** (Solana, AI inference jobs): about 75% of GPUs reportedly come from individual contributors. — [Cointelegraph AMA with Nosana](https://cointelegraph.com/news/decentralized-gpu-networks-promise-scalable-and-affordable-ai-ama-with-nosana)
- **Render**: critics say corrupted renders were returned with "no onchain way to detect it". Other commentators class it as "verifiable proof-of-work", so the sources conflict. — [Cointelegraph opinion: "Decentralized compute has failed"](https://cointelegraph.com/opinion/decentralized-compute-has-failed); [Hackernoon](https://hackernoon.com/the-decentralized-compute-problem-nobodys-talking-about)
- **Chutes** (a serverless inference network on Bittensor) announced a publicly available open-source TEE stack for confidential GPU compute. — [Chutes TEE announcement](https://chutes.ai/news/i-built-an-open-source-tee-stack-for-confidential-gpu-compute)

**Verification methods**
- **TOPLOC** (Prime Intellect, arXiv 2501.16007, Jan 2025) hashes top-k intermediate activations with locality-sensitive hashing. It detects swapped models, prompts or precision with 100% accuracy in the authors' tests. Validation is up to 100× faster than inference, with 258 bytes per 32 tokens. It has vLLM and SGLang integrations. TOPLOC v2 was used for distributed inference workers in SYNTHETIC-2 (July 2025). It gives integrity, not confidentiality. — [arXiv 2501.16007](https://arxiv.org/html/2501.16007v1); [Prime Intellect SYNTHETIC-2](https://primeintellect.ai/blog/synthetic-2-release); [toploc on PyPI](https://pypi.org/project/toploc/0.0.1/)
- **Proof of Sampling / spML** (Hyperbolic with Berkeley and Columbia, arXiv 2405.00295) randomly re-checks a fraction of results, with stake and slashing. The authors prove a unique pure-strategy Nash equilibrium of honesty, and say it is much cheaper than zkML. **[older, 2024]** — [arXiv 2405.00295](https://arxiv.org/html/2405.00295v2); [Hyperbolic blog](https://hyperbolic.xyz/blog/hyperbolic-introduces-novel-practical-solution-to-the-problem-of-verification-in-decentralized-ai)
- **Verde** (Gensyn, arXiv 2502.19405, Feb 2025) uses refereed delegation. When two providers disagree, a referee bisects the computation graph to the first diverging op. This needs bitwise-reproducible operators (RepOps) across hardware. Gensyn says it is about 4 orders of magnitude cheaper than cryptographic proofs. — [arXiv 2502.19405](https://arxiv.org/html/2502.19405v1); [Gensyn blog](https://blog.gensyn.ai/verde-a-verification-system-for-machine-learning-over-untrusted-nodes/)
- **Proof-of-Logits** (Ambient) has the verifier sample a token position and re-execute that single step to check the miner's logits. Secondary source. — [BlockEden on Gensyn Judge (KO)](https://blockeden.xyz/ko/blog/2026/04/29/gensyn-judge-decentralized-verifiable-ai-evaluation-deai-quality-layer/)
- A general critique: most decentralized GPU networks lack cryptographic verification, and "you're trusting the provider". — [Messier: GPU Nodes](https://rohanmenezes.substack.com/p/messier-gpu-nodes)

**Real-world problems**
- **io.net, April 2024**: about 1.8M fake GPUs tried to connect in a Sybil attack to farm rewards. A related intrusion manipulated device metadata. Critics questioned the reported GPU counts. **[older]** — [The Block](https://www.theblock.co/post/291315/solana-based-depin-io-net-ceo-claims-network-was-attacked-in-detailed-postmortem); [BH News](https://en.bitcoinhaber.net/io-net-tackles-cybersecurity-incident-with-rapid-enhancements)

### Inferences
- The splitting of a single model across many consumer devices (Petals-style) is rare in commercial marketplaces. Commercial demand is job- or container-level renting, because splitting adds latency and gives no privacy.
- Verification and privacy are separate problems. TOPLOC, PoSP, Verde and redundancy check that the right model ran. They all assume the verifier or the redundant worker sees the input, so redundancy actually multiplies data exposure.
- Incentive tokens attract Sybil and fake-hardware fraud. Any reward-paying network needs hardware attestation or proof-of-work-on-real-workload from day one.

### Gaps
- Bittensor's validator mechanics (Yuma consensus, the weight-copying problem, commit-reveal fix) were not sourced in this session.
- No independent audit was found comparing host-access controls across Vast, Salad, Akash, Nosana and io.net.
- No documented public incident was found in which a host exfiltrated customer prompts or data on these marketplaces. The absence of reports is not evidence of safety.
- zkML (EZKL, etc.) proving costs for LLMs were not researched in this session.

---

## 4. Implications for a "share your GPU" network for privacy-focused normal users

### Takeaway
A consumer-device sharing network can offer *availability and cost* but not *confidentiality* against the device owner with current technology. On consumer GPUs and phones, the device owner can see prompts and outputs. Splitting the model across devices does not fix this (inversion attacks), and FHE/MPC are far too slow. Honest privacy options are: (1) keep sensitive inference on devices the user owns, such as their own household or group of devices; (2) send sensitive jobs only to attested datacenter GPU TEEs; and (3) use stranger devices only for non-sensitive work, with integrity checks such as TOPLOC or spot-check redundancy.

### Cited Findings
- Consumer gaming-GPU marketplaces protect customers mainly through monitoring and blacklisting, not cryptography. — [Salad.com](https://salad.com/); [Vast security FAQ](https://docs.vast.ai/guides/reference/faq/security.md)
- GPU TEE overhead is small (under about 9%) where available (H100-class). — [arXiv 2409.03992](https://arxiv.org/html/2409.03992v2)
- Activations from collaborative or pipeline inference let a peer reconstruct prompts. — [arXiv 2503.09022](https://arxiv.org/pdf/2503.09022v2); [arXiv 2507.16372](https://arxiv.org/html/2507.16372v1)
- FHE Llama-3-8B: about 18 to 22 s per token on 8 high-end GPUs. — [arXiv 2601.18511](https://arxiv.org/abs/2601.18511)
- Android's AISeal does not yet give NPU access to the enclave or a documented third-party API. — [Google blog: AISeal](https://blog.google/security/enabling-the-next-gen-enclave-architecture-for-on-device-ai-on-android/)
- Reward-driven networks attract Sybil and fake-GPU attacks. — [The Block on io.net](https://www.theblock.co/post/291315/solana-based-depin-io-net-ceo-claims-network-was-attacked-in-detailed-postmortem)
- Apple PCC shows what is needed for credible "remote but private" inference: attested stateless nodes, a public transparency log, client-side checks, and a research VM. — [Apple: PCC security research](https://security.apple.com/blog/pcc-security-research/)

### Inferences
- **Trust tiers as product design:** For the user's own devices (desktop, laptop, phone in one account), privacy is equal to local inference, as long as transport is end-to-end encrypted and devices are mutually authenticated. "Friends and family" pools are trust-based, with explicit consent. For strangers' devices, only public or non-personal tasks should be sent (e.g., summarizing public web pages, batch embedding of public data), with spot-check verification.
- **Verification without privacy loss is not available:** redundancy-based checks (PoSP-style re-execution) send the same input to more parties. TOPLOC lowers re-execution cost, but the validator still needs the prompt.
- **Splitting a model across several users' GPUs makes privacy worse.** Every stage holder becomes a potential inverter, and latency rises. Petals-style splitting is only acceptable within a trusted group.
- **For a small team, the realistic confidential option** is to integrate attested CC GPU instances (rented H100/B200 CC VMs, or networks like Chutes/Phala that expose attestation), verify NVIDIA plus SEV-SNP/TDX attestation on the client, and pin images in a transparency log. Building PCC from scratch is out of scope.
- **Messaging to normal users** must be blunt. "Your data is encrypted in transit" is not "the helper device cannot read it". Overclaiming would be the main reputational risk.
- **Abuse of the hosting side**: for hosts offering their GPU, the risks are running untrusted containers (malware, illegal content generation) and legal exposure. Sandboxing (gVisor, VMs) and content policies are needed. This is not researched in depth here.

### Gaps
- No user research was found on whether normal users understand or accept tiered privacy in sharing networks.
- No legal analysis (GDPR, liability of hosts for processed content) was covered in this session.
- Energy, cost and latency economics of consumer-GPU sharing versus local-only inference were not covered.
