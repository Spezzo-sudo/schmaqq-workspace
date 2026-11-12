# Quantum Machine Learning and Quantum Hardware Roadmaps vs. AI/LLM Inference (status: November 2026)

## Proven/claimed quantum speedups for ML, dequantization, and the data-loading (QRAM) bottleneck

### Takeaway
The early "exponential" quantum ML speedups (HHL linear systems, quantum recommendation systems) carry serious caveats about input loading, output readout, conditioning and the classical baseline. Tang (2018) and Chia et al. (JACM 2022) showed that in the QRAM-style input model, many of these algorithms can be matched classically with only a polynomial slowdown. Exponential QML speedups that survive scrutiny are narrow. The newest claim (Zhao, Preskill, Huang et al., 2026) gives a *memory* advantage for streamed classical data, and its own authors say it does not yet apply to LLMs.

### Cited Findings
- HHL (Harrow, Hassidim, Lloyd 2008/2009) solves sparse, well-conditioned linear systems Ax=b and outputs a quantum state |x⟩ in time polylogarithmic in n. This is the basis for most claimed exponential QML speedups — [arXiv:0811.3171](https://arxiv.org/abs/0811.3171)
- Aaronson, "Read the fine print," Nature Physics 11, 291–293 (2015) (DOI 10.1038/nphys3272) — [Nature](https://www.nature.com/articles/nphys3272); preprint at [scottaaronson.com](https://scottaaronson.com/papers/qml.pdf). In the preprint he says HHL has "four caveats, each of which can be crucial in practice":
  1. The vector b must be "loaded quickly into the quantum computer's memory," for example via a "quantum RAM." That RAM is itself speculative.
  2. The matrix A must be sparse, or otherwise efficiently simulable.
  3. The condition number κ must be small.
  4. The output is a quantum state, not the vector x, so reading out all n entries would cost at least n steps. Comparisons must also be "against the fastest possible classical algorithm that performs the same task."

  He also notes that later QML algorithms "inherit many of the caveats of HHL" — [preprint PDF](https://scottaaronson.com/papers/qml.pdf); [blog post](https://scottaaronson.blog/?p=2196)
- Kerenidis & Prakash's quantum recommendation system (2016) was long considered a strong candidate for an exponential speedup — [arXiv:1603.08675](https://arxiv.org/abs/1603.08675)
- Ewin Tang (2018, STOC 2019) gave a classical "dequantized" algorithm that uses ℓ2-norm sampling access matching QRAM assumptions. It solves the same recommendation problem with only a polynomial slowdown, so that exponential speedup was removed — [arXiv:1807.04271](https://arxiv.org/abs/1807.04271); summary in [Chia et al., arXiv:1910.06151](https://arxiv.org/abs/1910.06151)
- Chia, Gilyén, Li, Lin, Tang, Wang (J. ACM, Oct 2022) built classical algorithms for the quantum singular value transformation under quantum-inspired sampling assumptions. These recover or improve dequantizations of recommendation systems, PCA, supervised clustering, SVMs, low-rank regression and SDP solving. The authors read this as "compelling evidence" that, in the QRAM data-structure input model, QSVT does not give exponential speedups for low-rank problems — [arXiv:1910.06151](https://arxiv.org/abs/1910.06151)
- Hoefler, Häner, Troyer (ETH/Microsoft; CACM May 2023) argue that asymptotic speedups are not enough once constants are counted. Their setup assumes optimistic quantum and pessimistic classical hardware. With that setup, quadratic (Grover-type) speedups need more than about 10^10 function calls before they pay off. Because QRAM is limited by gate counts, quantum computers suit "big compute on small data," not big-data problems. They conclude that many cited applications are unlikely to reach practical advantage without major algorithmic improvements — [arXiv:2307.00523](https://arxiv.org/abs/2307.00523)
- A 2022 "down-to-business" review says loading classical input into a quantum register "is significant and may exceed that of the quantum computation per se" — [arXiv:2203.17181](https://arxiv.org/pdf/2203.17181)
- New 2026 claim: Zhao, Zlokapa, Neven, Babbush, Preskill, McClean, Huang, "Exponential quantum advantage in processing massive classical data" (arXiv:2604.07639) — [arXiv](https://arxiv.org/pdf/2604.07639); explained by the first author on Caltech IQIM's blog — [Quantum Frontiers, 9 Apr 2026](https://quantumfrontiers.com/2026/04/09/unleashing-the-advantage-of-quantum-ai/)
  - Method: "quantum oracle sketching" streams classical samples once instead of storing them in QRAM.
  - Claim: exponentially less *memory* than any classical machine with the same prediction performance, for high-dimensional linear classification and dimensionality reduction.
  - Validation: numerical, with "fewer than 60 logical qubits" on sentiment and single-cell RNA data, giving a 4–6 order-of-magnitude memory reduction.
  - Cost: sample complexity grows quadratically with the number of quantum queries.
  - Scope: the post states the results "do not yet imply immediate utility for modern generative AI such as large language models."
  - Trade press notes the data-loading step still dominates runtime — [The Quantum Insider](https://thequantuminsider.com/2026/04/10/study-finds-exponential-quantum-advantage-in-machine-learning-tasks/)

### Inferences
- The pattern since 2015 is that claimed exponential QML speedups for classical data usually reduce to (a) assumptions about input access that also make fast classical sampling algorithms possible, or (b) a quantum-state output that the application cannot read out cheaply. Speedups that survive tend to be polynomial, often quadratic. Per Hoefler et al., quadratic speedups are unlikely to pay off on realistic hardware.
- The 2026 Zhao/Huang/Preskill result changes the claimed resource. It is about memory and sample complexity, not wall-clock time. That is not obviously relevant to LLM inference, which is bottlenecked by memory bandwidth and FLOPs on very large weight matrices.

### Gaps
- I did not re-verify the exact theorem statement of Tang 2018 from the STOC paper; it is cited via arXiv and the Chia et al. summary.
- I found no independent peer-reviewed replication or critique of arXiv:2604.07639 as of Nov 2026.

## Quantum transformers / quantum LLM inference (2023–2026) and expert assessments

### Takeaway
No credible source shows a quantum speedup for transformer or LLM inference on real hardware. The leading theory paper, Guo et al. (Aspuru-Guzik, Rebentrost), builds fault-tolerant quantum subroutines for transformer blocks. It offers only a *potential*, input-norm-dependent speedup and explicitly does not claim a provable end-to-end advantage. Hybrid "quantum transformer" papers are small-scale feasibility studies. Leading experts treat quantum help for modern generative AI as unproven and at best long-term.

### Cited Findings
- Guo, Yu, Choi, Han, Agrawal, Nakaji, Aspuru-Guzik, Rebentrost, "Quantum Transformer: Accelerating model inference via quantum linear algebra" (arXiv:2402.16714; v3 Oct 2025; no journal listed) — [arXiv](https://arxiv.org/abs/2402.16714)
  - Builds fault-tolerant quantum subroutines for self-attention, residual connections with layer normalization, and feed-forward layers. A key piece is a quantum Hadamard product and element-wise matrix functions.
  - Outputs an *amplitude encoding* of the transformer output, so readout costs come on top.
  - The matrix norm of the input sequence "strongly affects" the complexity.
  - Numerical experiments on open-source LLMs suggest a "potential" speedup.
  - Per the HTML version, the authors do not provide a provable end-to-end advantage, and any advantage depends on how the input is given — [arXiv HTML](https://arxiv.org/html/2402.16714)
- Kong et al., "Hybrid Quantum Transformer for Language Generation" (HyQuT, arXiv:2511.10653, Nov 2025) puts variational quantum circuits into transformers at 8M and 150M parameter scales. It is a feasibility study claiming "comparable performance" with fewer parameters, not a speed advantage — [arXiv](https://arxiv.org/abs/2511.10653)
- Other 2025 preprints, e.g. "Bridging Classical and Quantum Computing for Next-Generation Language Models" (arXiv:2508.07026), make claims about quantum attention that I did not verify (hardware vs. simulation unclear) — [arXiv](https://arxiv.org/html/2508.07026)
- Preskill's NISQ paper (2018) coined "NISQ." It warned that noisy intermediate-scale devices of 50–100 qubits are unlikely to change the world on their own and that quantum ML advantages on classical data are uncertain — [arXiv:1801.00862 / Quantum 2, 79](https://arxiv.org/abs/1801.00862)
- Preskill and Huang's group (2026) frame current quantum AI as an early "traditional machine learning era." They say heuristic exploration needs large-scale fault-tolerant machines, and their results do not yet apply to LLMs — [Quantum Frontiers](https://quantumfrontiers.com/2026/04/09/unleashing-the-advantage-of-quantum-ai/)
- Aaronson has repeatedly criticized hype. He complained of "relentlessly upbeat" QAOA papers that "dodge the speedup question" and asked "where are all those practical speedups on NISQ devices?" — [scottaaronson.blog (archive)](https://scottaaronson.blog/?m=202303); see also [Read the fine print](https://scottaaronson.com/papers/qml.pdf)
- Hoefler/Häner/Troyer place the best prospects in chemistry and materials science, with small data and super-quadratic speedups, not data-heavy ML — [arXiv:2307.00523](https://arxiv.org/abs/2307.00523)
- A 2026 field-status commentary states QML "has no proven real-world advantage yet." This is a lower-tier, secondary source — [PostQuantum](https://postquantum.com/quantum-ai/quantum-machine-learning-reality/)

### Inferences
- LLM inference is dominated by repeatedly streaming billions of classical weights and producing classical tokens. That is the worst case for quantum computing: heavy data loading (QRAM) and per-token full classical readout, with each readout needing many measurement shots. Even an idealized fault-tolerant quantum transformer would have to overcome these costs plus error-correction overheads. Fault-tolerant logical clock rates are roughly microsecond-scale cycles, versus GHz on GPUs.
- The most plausible quantum–AI interaction in the 2030s is quantum computers solving chemistry and physics problems, possibly producing training data for AI. AI also helps quantum computing, e.g. ML decoders. Accelerating LLM token generation is not among the plausible uses. This is an inference from the expert framing above, not a stated consensus finding.

### Gaps
- I did not find a 2025–2026 Nature Reviews Physics review specifically on quantum ML advantage for LLMs. A 2022 NRP piece cites Aaronson in the dequantization debate — [Nature Reviews Physics](https://www.nature.com/articles/s42254-022-00511-w) (not fetched).
- I found no explicit Aaronson blog post on "quantum computers for LLM inference." His position is inferred from his general QML writings.
- arXiv:2608.03962 ("Separating quantum circuits from classical LLMs") appeared in search but was not read — [arXiv](https://arxiv.org/pdf/2608.03962).

## Hardware status and roadmaps; resource estimates

### Takeaway
2024–2025 brought real milestones:
- Google Willow: the first convincing surface-code memory below threshold (d=7, Λ≈2.14), then a 13,000× "verifiable" advantage claim for OTOC "Quantum Echoes."
- Quantinuum Helios: 98 high-fidelity trapped-ion qubits.
- IBM: a concrete qLDPC roadmap to Starling, about 200 logical qubits and 10^8 operations in 2029.

All of these are far from what large algorithms need. Even the best 2025 estimate for RSA-2048 needs just under 1 million physical qubits for about a week. Microsoft's Majorana topological-qubit claims remain contested.

### Cited Findings
**Google**
- "Quantum error correction below the surface code threshold" (Nature, online 9 Dec 2024) — [Princeton repository record](https://collaborate.princeton.edu/en/publications/quantum-error-correction-below-the-surface-code-threshold/); [arXiv:2408.13687](https://arxiv.org/abs/2408.13687)
  - Willow: 101-qubit distance-7 surface code with 0.143% error per cycle.
  - Error suppression Λ≈2.14 per distance step of 2.
  - Logical memory lifetime 2.4× the best physical qubit.
  - Real-time decoding at d=5 with 63 µs latency and a 1.1 µs cycle.
  - The paper notes fault-tolerant computing needs error rates "well below" those shown.
- Quantum Echoes (Nature, 22 Oct 2025, "Observation of constructive interference at the edge of quantum ergodicity") — [Google Research blog](https://research.google/blog/a-verifiable-quantum-advantage/); [Google blog](https://blog.google/technology/research/quantum-echoes-willow-verifiable-quantum-advantage/)
  - Measures out-of-time-order correlators (OTOCs) on 105-qubit Willow.
  - Claims 13,000× faster than the best classical algorithm on a top supercomputer.
  - "Verifiable" means repeatable on another comparable quantum computer.
  - A proof-of-principle NMR-related molecular study with UC Berkeley used 15- and 28-atom molecules.
  - Caveat: the speedup is against a specific best-known classical method and is a Google self-report.

**IBM**
- June 2025 roadmap — [The Quantum Insider](https://thequantuminsider.com/2025/06/10/ibm-offers-roadmap-toward-large-scale-fault-tolerant-quantum-computer/); [TQI technical piece](https://thequantuminsider.com/2025/06/12/engineering-fault-tolerance-ibms-modular-scalable-full-stack-quantum-roadmap/); IBM primary: [IBM Quantum blog — roadmap](https://www.ibm.com/quantum/blog/large-scale-ftqc)
  - Starling (2029, Poughkeepsie NY): 200 logical qubits, 100 million quantum operations.
  - Uses bivariate-bicycle qLDPC codes ("gross"/"two-gross"), which IBM says need up to about 90% fewer physical qubits than surface codes.
  - Stepping stones: Loon (2025), Kookaburra (2026), Cockatoo (2027).
  - Successor Blue Jay (around 2033): about 2,000 logical qubits and 1 billion operations.
  - About 20,000 physical qubits for Starling is a secondary-source estimate — [PostQuantum](https://postquantum.com/industry-news/ibm-quantum-roadmap-2029/)

**Quantinuum**
- Helios launched 5 Nov 2025: 98 barium-ion qubits, all-to-all connectivity — [HPCwire](https://www.hpcwire.com/2025/11/05/quantinuum-introduces-helios-quantum-system-as-roadmap-advances-toward-apollo/); [Quantinuum Helios page](https://www.quantinuum.com/helios)
  - Fidelities: 1-qubit 99.9975%, 2-qubit 99.921%.
  - Logical-qubit figures vary by definition. Most coverage reports 48 error-corrected logical qubits. Quantinuum's page says 50, and 94 refers to *error-detected* qubits — [Constellation Research](https://www.constellationr.com/insights/news/quantinuum-launches-helios-quantum-computer-touts-fidelity-enterprise-customers); [Quantum Computing Report](https://quantumcomputingreport.com/quantinuum-launches-helios-quantum-computer-with-industry-leading-fidelity-and-singapore-partnership/)
  - Next system: Apollo (2029), targeting a fault-tolerant machine with thousands of physical and hundreds of logical qubits — [HPCwire](https://www.hpcwire.com/2025/11/05/quantinuum-introduces-helios-quantum-system-as-roadmap-advances-toward-apollo/)

**Microsoft**
- Microsoft announced Majorana 1 (topological-qubit chip) in Feb 2025 with a Nature paper on interferometric parity measurement. Most physicists remained unconvinced it shows topological qubits; one said the data were "incredibly unconvincing" — [Science News](https://www.sciencenews.org/article/microsoft-topological-quantum-majorana)
- Henry Legg (St Andrews) critiqued Microsoft's "topological gap protocol" on arXiv on 26 Feb 2025. Per reports, the critique was later published as a Nature Matters Arising.
  - Legg's points: the protocol gives different outcomes depending on parameter ranges; the readout regions appear gapless and disordered; signals could come from quantum dots; nothing "proves the existence of a topological qubit or Majoranas."
  - Microsoft (Chetan Nayak) replied that its case does not rest on that protocol.
  - Sources: [Network World](https://www.networkworld.com/article/4189610/researchers-cast-new-doubt-on-microsofts-quantum-computing-advance.html); [PostQuantum expert roundup](https://postquantum.com/quantum-computing/microsoft-majorana-qubit-experts/). Secondary reporting; exact Nature dates unconfirmed.

**EU**
- Quantum Europe Strategy, COM(2025) 363, adopted 2 July 2025. Goal: EU global quantum leadership by 2030 — [European Commission](https://digital-strategy.ec.europa.eu/en/library/quantum-europe-strategy); [EC news](https://digital-strategy.ec.europa.eu/en/news/commission-launches-strategy-make-europe-quantum-leader-2030); [ERA Austria summary](https://era.gv.at/news-items/new-quantum-europe-strategy-aims-to-transform-europes-scientific-excellence-into-economic-success/)
  - Five action areas.
  - Extends the EuroHPC JU's remit to quantum.
  - Pilots Quantum Grand Challenges (2025–2027), including on fault-tolerant computing.
  - Plans pilot production lines.
  - Announces a Quantum Act for 2026; one source expected a proposal in Q2 2026 — [trade.gov](https://www.trade.gov/market-intelligence/eu-quantum-strategy-implications-us-digital-and-technology-exporters)
  - The Quantum Flagship continues as the research program — [EC quantum policy page](https://digital-strategy.ec.europa.eu/en/policies/quantum)

**Resource estimates**
- Gidney (Google), May 2025: RSA-2048 could be factored in under a week with under 1 million noisy qubits — [arXiv:2505.15917](https://arxiv.org/abs/2505.15917)
  - Assumes 0.1% gate error, 1 µs cycle, nearest-neighbour connectivity.
  - Down from about 20 million qubits / 8 hours (Gidney & Ekerå 2019).
  - Uses Chevignard–Fouque–Schrottenloher approximate arithmetic, magic-state cultivation and yoked surface codes.
  - A Feb 2026 claim (Iceberg Quantum, qLDPC "Pinnacle") of under 100,000 physical qubits is single-sourced and unverified — [PostQuantum](https://postquantum.com/quantum-research/quantum-breakthrough-rsa-2048/)
- Zhao/Huang et al. estimate about 1,000 logical qubits for cryptanalysis-scale tasks, versus fewer than 60 logical qubits for their ML demonstrations (simulated) — [Quantum Frontiers](https://quantumfrontiers.com/2026/04/09/unleashing-the-advantage-of-quantum-ai/)

### Inferences
- Credible timelines: the first small fault-tolerant machines with hundreds of logical qubits are targeted for about 2029 by IBM and Quantinuum. Machines with thousands of logical qubits are targeted around 2033 (IBM Blue Jay). Machines with about a million physical qubits, needed for RSA-scale workloads, are realistically 2030s at best.
- An LLM-scale quantum transformer would need amplitude-encoding billions of parameters, i.e. huge QRAM. That is far beyond every published roadmap.
- Present "advantage" demonstrations (random circuit sampling, OTOCs) are physics-simulation tasks with no connection to ML inference.

### Gaps
- I did not verify progress through Nov 2026 on IBM Kookaburra (2026 milestone) or a published EU Quantum Act proposal. Search results were mid-2025 announcements.
- The IBM primary roadmap blog URL is cited from my knowledge of IBM's site structure but was not fetched in this session.
- Microsoft's 2026 Nature rebuttal and any "Majorana 2" announcement were seen only via secondary reports with inconsistent dates.

## Will quantum computers ever be in phones? Cloud-only access

### Takeaway
No reputable source expects on-device quantum processors in phones. Leading platforms (superconducting, trapped-ion) need dilution refrigerators at millikelvin temperatures or ultra-high-vacuum and laser systems, and fault-tolerant machines need on the order of 10^5–10^6 physical qubits. Access has been cloud-based since 2016, and phones act only as clients. "Quantum" chips in phones today are quantum random number generators or post-quantum cryptography, not quantum computers.

### Cited Findings
- IBM made a 5-qubit processor publicly accessible via the cloud in May 2016. The processor sits in a dilution refrigerator, and users connect from desktop, tablet or smartphone — [InfoWorld](https://www.infoworld.com/article/2252752/ibms-quantum-processor-comes-out-of-hiding.html); [Cold Facts / CSA](https://cold-facts.org/2016/05/13/ibm_looks_to_the_cloud_for_quantum_computing/)
- A German Macwelt analysis calls a quantum computer in a smartphone currently "essentially unrealistic," potentially decades away. It cites about 100–500 physical qubits per logical qubit — [Macwelt](https://www.macwelt.de/article/3132621/apple-quantencomputing-iphone.html) (journalistic, secondary)
- Samsung's "quantum" phones (Galaxy Quantum series) contain a quantum random number generator chip, not a quantum processor — [Mobile Village](https://mobilevillage.com/?p=16557) (secondary)
- Gidney's estimate assumes about 1 million physical qubits at a 1 µs cycle time, which shows the scale of useful fault-tolerant machines — [arXiv:2505.15917](https://arxiv.org/abs/2505.15917)
- IBM Starling is housed in a dedicated quantum data center in Poughkeepsie, the data-center model of deployment — [The Quantum Insider](https://thequantuminsider.com/2025/06/10/ibm-offers-roadmap-toward-large-scale-fault-tolerant-quantum-computer/)

### Inferences
- The relevant model for consumers is "phone → cloud → (classical GPU and possibly quantum) data center." The phone-side quantum-related change in this decade is post-quantum cryptography, driven by estimates such as Gidney 2025, not quantum processing.
- Even room-temperature photonic or NV-centre approaches would need huge qubit counts and error correction before they were useful. No credible roadmap targets mobile form factors.

### Gaps
- I found no peer-reviewed or top-expert (e.g. Preskill, Aaronson) statement specifically on "quantum computers in phones." Supporting sources are journalistic. This conclusion rests on hardware physics (cryogenics, qubit counts) rather than a citable expert quote.
