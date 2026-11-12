# Non-quantum physics and engineering for lower latency and energy in distributed and on-device AI (as of November 2026)

## Q1: Speed-of-light limits. What physically can and cannot reduce latency between distant devices?

### Takeaway
Propagation delay has a hard floor of about 3.34 µs/km in vacuum or air (c). Standard silica fiber is about 1/3 slower (about 4.9–5 µs/km), and real routes add path detours plus queuing and processing. Physics leaves three levers: (1) go faster than glass (hollow-core fiber, microwave/mmWave in air, laser links in vacuum), (2) go straighter (geodesic routes), (3) remove hops and processing. None of them breaks c. Across Europe this means about 1–3 ms of savable one-way time at best. For a chat-style AI app, the server's compute time (hundreds of ms or more) dominates anyway.

### Cited Findings
**Standard fiber vs. c**
- Light in fiber travels at "only (roughly) 2/3 c". That is why the HFT industry built "speed of light networking" over microwave — [Bhattacherjee et al., "A Bird's Eye View of the World's Fastest Networks", ACM IMC 2020](https://bdebopam.github.io/papers/imc2020-hft.pdf)

**Microwave HFT links (Chicago–New Jersey), close to the physical optimum**
- Geodesic distances between the CME data center (Aurora) and the New Jersey exchanges are about 1,174–1,186 km. The c-bound along the geodesic is 3.955 ms one way. The fastest licensed microwave network in 2020 delivered 3.96171 ms, down from 4.00 ms in 2013. That is within about 0.2% of the speed-of-light limit — [IMC 2020](https://bdebopam.github.io/papers/imc2020-hft.pdf)
- Earlier trade-press figures: Quincy one-way 3.982 ms in 2016 (4.012 ms in 2015) — [WatersTechnology](https://waterstechnology.com/node/2458066). McKay Brothers round trip 8.23 ms in 2013 — [The Register 2013](https://www.theregister.com/2013/02/27/microwave_versus_fibre/)
- Trade-offs: 18 to 30+ relay towers, weather sensitivity, low bandwidth. Lower frequencies reduce weather outages, and longer tower-to-tower links are more failure-prone — [IMC 2020](https://bdebopam.github.io/papers/imc2020-hft.pdf); [WatersTechnology "Microwave gains ground on fiber"](https://www.waterstechnology.com/trading-tech/2292494/waters-microwave-gains-ground-on-fiber)
- Rough rule: wireless over a long-haul corridor is about 40% faster than fiber (the speed ratio air vs. glass plus straighter paths) — [WatersTechnology](https://www.waterstechnology.com/trading-tech/2292494/waters-microwave-gains-ground-on-fiber)

**Hollow-core fiber (HCF): Southampton / Microsoft (Lumenisity)**
- Double Nested Antiresonant Nodeless Fiber (DNANF). Loss is about 0.091 dB/km (power halves only after about 33 km, vs. about 15 km for standard fiber at about 0.2 dB/km). Light travels about 47% faster. More than double the usable spectrum. Published in Nature Photonics, September 2025 — [University of Southampton ORC news](https://www.orc.soton.ac.uk/news/7210); [optics.org](https://optics.org/news/southampton-achieves-record-low-signal-loss-with-hollow-fiber); [paper PDF (Nature Photonics, s41566-025-01747-5)](https://eprints.soton.ac.uk/504565/2/s41566-025-01747-5.pdf)
- Caveat on the record value: the paper itself reports measurement uncertainty. Different methods gave different values (cutback values around 0.055–0.065 dB/km). The 0.091 dB/km is the headline value — [paper PDF](https://eprints.soton.ac.uk/504565/2/s41566-025-01747-5.pdf) (via search summary). The best solid-core fiber is about 0.14 dB/km — [optics.org](https://optics.org/news/southampton-achieves-record-low-signal-loss-with-hollow-fiber)
- Microsoft research paper (2025): real-time long-haul HCF transmission up to 11,154 km in a ~360 km recirculating loop. 25.6 Tb/s at 1,439 km, 20.6 Tb/s at 2,878 km, 10.3 Tb/s beyond 6,000 km. Measured latency reduction of about 31.49% vs. SMF (RFC 2544), i.e. ">1.5 ms per 1000 km" — [Microsoft Research, "Real-Time, Fully-Loaded C-band, Low-Latency, Long-Haul Transmission over Hollow Core Fiber"](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/Real-Time-Fully-Loaded-C-band-Low-Latency-Long-Haul-Transmission-over-Hollow-Core-Fiber.pdf)
- Deployment: Microsoft has deployed HCF in several Azure regions since 2023. In September 2025 it announced production scale-up with Corning and Heraeus, and it plans about 15,000 km of HCF routes. Marketing claims are "up to 47% faster" and "~33% lower latency" — [Microsoft Azure Networking Blog](https://techcommunity.microsoft.com/blog/azurenetworkingblog/-/4455953)
- Unverified: a secondary source cites about 1,280 km of production Azure HCF (OFC 2026). No Microsoft primary source found — [pulse.bot (secondary)](https://www.pulse.bot/science/news/ofc-2026-part-5-of-5-hollow-core-fiber-and-next-gen-transmission-beyond-the-loss-record-5f60ed32-60d9-4b01-a701-53480a5bf141/)

**LEO satellites with laser inter-satellite links (Starlink ISL)**
- Theory: Handley (ACM HotNets 2018), "Delay is Not an Option: Low Latency Routing in Space". A LEO network with laser links can beat fiber over long distances because light in vacuum is about 47% faster than in glass. The 2019 follow-up finds an advantage roughly beyond about 1,000 km of endpoint distance — [Handley HotNets 2018 (UCL)](https://discovery.ucl.ac.uk/id/eprint/10062262/); [HotNets 2019 PDF](https://courses.grainger.illinois.edu/CS598WSI/sp2021/Papers\StarLink_Hotnets19.pdf)
- NY–London reference: the best fiber (Hibernia Express) has an RTT just under 59 ms. Analyst estimate for LEO with end-to-end ISL: about 43 ms RTT. The 43 ms is an NSR estimate, not a measurement — [NSR via SatNews](https://satnews.com/2020/10/14/leo-speed-when-milliseconds-are-worth-millions-an-nsr-insight/)
- Measurement (HitchHiking, Izhikevich et al., 2,400+ users in 27 countries): GEO RTT is physically ≥480 ms, while LEO is theoretically about 10 ms RTT. In practice, ISLs shorten the path to the ground station but "significantly increase the length of the routing path". Latency spikes coincide with dynamic ISL routing, and clients at the same PoP differ by more than an order of magnitude — [HitchHiking paper (SIGMETRICS 2024)](https://lizizhikevich.github.io/assets/papers/LEO-HitchHiking.pdf)
- Measurement (Mohan et al., ACM WWW 2024, M-Lab + RIPE Atlas, ~19.2 million samples): Starlink is broadly comparable to terrestrial ISPs in the US and Western Europe. Over ISLs, Réunion (nearest PoP in Germany, ~9,000 km) reaches Europe faster than via terrestrial routes. Latency jumps at 15-second reconfiguration intervals — [RIPE Labs summary](https://labs.ripe.net/author/nitinder-mohan/a-multifaceted-look-at-starlink-performance-the-good-the-bad-and-the-ugly/)
- No published study directly measures per-hop laser-link latency inside the constellation. Everything is inferred from end-to-end RTTs — [search finding; cf. LISL modeling arXiv 2301.05285](https://ar5iv.labs.arxiv.org/html/2301.05285)

### Inferences
- Theoretical minima within Europe (own calculation, c = 3.336 µs/km; fiber n≈1.47 → ~4.9 µs/km; HCF ~3.35 µs/km; geodesic distances approximate):
  - Frankfurt–London (~640 km): c one-way ≈ 2.1 ms (RTT 4.3 ms); ideal straight fiber ≈ 3.1 ms one-way (RTT 6.3 ms).
  - Berlin–Paris (~880 km): c ≈ 2.9 ms (RTT 5.9 ms); fiber ≈ 4.3 ms (RTT 8.6 ms).
  - Lisbon–Helsinki (~3,360 km): c ≈ 11.2 ms (RTT 22.4 ms); fiber ≈ 16.5 ms (RTT 33 ms).
  - Real fiber routes are typically 1.3–2× longer than the geodesic, plus routing and queuing. The real RTT is therefore often 1.5–3× the c-bound.
- What cannot help: no classical or quantum technique transfers information faster than c. Entanglement allows no signalling (no-communication theorem). Latency below the geodesic c-bound is physically impossible.
- What does help (ordered by practical relevance to an app): (a) shorter path and fewer hops: an edge server or PoP near the user, peering, avoiding detours. That is the largest lever, often >10 ms. (b) HCF: −31% propagation, i.e. about 1.5 ms per 1,000 km one-way. Only in carrier and hyperscaler backbones, not controllable by an app. (c) Microwave: c-bound to within 0.2%, but very low bandwidth and only niche routes (HFT). (d) LEO ISL: helps only over intercontinental distances (>~1,000–3,000 km) and is noisy in practice.
- For distributed AI inference across devices (e.g. pipeline parallelism over the Internet), each round trip per token costs at least the c-RTT. Within Europe that is ≥5–20 ms per step, more realistically 20–50 ms. That is orders of magnitude worse than on-chip memory accesses (ns). Physics therefore strongly favors local inference over fine-grained distributed inference.

### Gaps
- No primary Microsoft figure found for km of HCF actually deployed as of November 2026. No Southampton record from 2026 beyond the 2025 Nature Photonics value (an OFC 2026 report exists only from a secondary source).
- Exact median RTTs from HitchHiking and Mohan et al. are only in figures, not in text. They could not be extracted.
- European geodesic distances were not looked up from a source (approximations). Real measured RTTs between EU cities (e.g. RIPE Atlas) were not collected.

## Q2: Photonic computing, analog in-memory computing, neuromorphic. Energy and speed gains, maturity, time to consumer devices

### Takeaway
The lab results are impressive: 160 TOPS/W (Taichi), sub-ns optical inference (MIT), photonic processors running ResNet and BERT (Lightmatter, Nature 2025), and 10–12 TOPS/W analog PCM (IBM). However, all of them are research prototypes or data-center or rack products. None is a smartphone component. Realistically, none of them will reach consumer devices within 1–5 years. Photonics will arrive first as an interconnect in data centers.

### Cited Findings
**Photonic / optical computing**
- Tsinghua Taichi (Science, April 2024, DOI 10.1126/science.adl1203): diffractive-interferometric hybrid photonic chiplet. 160 TOPS/W, 879 T MACS/mm². Accuracy 91.89% on 1,623-class Omniglot and 87.74% on 100-class mini-ImageNet. Claims 2–3 orders of magnitude better efficiency than AI chips — [Tsinghua University news](https://www.tsinghua.edu.cn/en/info/1399/14193.htm); [TechXplore](https://techxplore.com/news/2024-04-taichi-large-scale-diffractive-hybrid.html)
- Tsinghua ACCEL (Nature 2023, all-analog photoelectronic chip for vision) and full-forward-mode training (Nature, August 2024) are separate works by the same group — [Tsinghua University news](https://www.tsinghua.edu.cn/en/info/1399/12830.htm)
- MIT Englund group (Nature Photonics, December 2024): fully integrated photonic processor including on-chip nonlinear units (NOFUs). Classification in under 0.5 ns, >92% inference accuracy, >96% in in-situ training. Fabricated with commercial foundry processes. No commercialization timeline — [MIT EECS / MIT News](https://www.eecs.mit.edu/?p=8210)
- Lightmatter (Nature 640, 368–374, April 2025, "Universal photonic artificial intelligence acceleration"): six-chip package with photonic tensor cores (four 128×128). Runs ResNet, BERT and Atari RL at "near-electronic precision". About 65.5 trillion 16-bit (ABFP) ops/s at 78 W electrical plus 1.6 W optical — [Physics World](https://physicsworld.com/a/photonic-computer-chips-perform-as-well-as-purely-electronic-counterparts-say-researchers/); [TechPowerUp (secondary)](https://www.techpowerup.com/forums/threads/lightmatter-unveils-six%E2%80%91chip-photonic-ai-processor-with-incredible-performance-watt.335260); [Lightmatter blog](https://lightmatter.co/blog/a-new-kind-of-computer/)
- Contradiction: heise reports "3× faster, 10× more efficient than A100", but also only about 30% of reference accuracy on natural-language tasks. That contradicts the paper's "near-electronic precision" claim and should be treated with caution — [heise](https://heise.de/-10354733)
- Lightelligence PACE (Nature 640, 361–367, 2025): >16,000 photonic components, 64×64 matrix, up to 1 GHz. Up to 500× lower minimal latency than small photonic circuits. Ising problems solved in about 5 ns (Physics World, not further confirmed) — [Physics World](https://physicsworld.com/a/photonic-computer-chips-perform-as-well-as-purely-electronic-counterparts-say-researchers/); [RePEc/Nature entry](https://ideas.repec.org/a/nat/nature/v640y2025i8058d10.1038_s41586-025-08786-6.html)

**Analog in-memory computing (IBM)**
- IBM HERMES (Nature Electronics 2023, DOI 10.1038/s41928-023-01010-1): 64 cores, phase-change memory, 14 nm. 63.1 TOPS peak, 9.76 TOPS/W (8-bit MVM), 6.5 W peak — [TechXplore](https://techxplore.com/news/2023-08-ibm-core-mixed-signal-in-memory-chip.pdf); [The Register](https://www.theregister.com/on-prem/2023/08/14/ibm-describes-analog-ai-chip-that-might-displace-gpus/1332055)
- IBM Ambrogio et al. (Nature 2023): 34 tiles, 35 million PCM devices. Up to 12.4 TOPS/W sustained, more than 14× more efficient than digital approaches in speech recognition — [Nature s41586-023-06337-5](https://www.nature.com/articles/s41586-023-06337-5.pdf); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10447234)

**Neuromorphic**
- Intel Hala Point (April 2024): 1,152 Loihi 2 processors, 1.15 billion neurons, 128 billion synapses, 140,544 cores. About 15 TOPS/W (8-bit) on conventional DNN workloads. A research system, "not close to commercialization" — [SiliconANGLE](https://siliconangle.com/?p=652453); [Live Science](https://www.livescience.com/technology/computing/intel-unveils-largest-ever-ai-neuromorphic-computer-that-mimics-the-human-brain)
- LLMs on Loihi 2 (arXiv 2503.18002, preprint): MatMul-free LLM with up to 3× throughput and 2× less energy than a transformer on an edge GPU. Self-described as "preliminary" — [arXiv 2503.18002](https://arxiv.org/html/2503.18002)

### Inferences
- Common bottleneck of the photonic approaches: nonlinearities, ADC/DAC conversion, low precision, and above all weight storage. Large LLMs (GB of weights) do not fit as fixed optical or analog weights on a small chip. The benefit is greatest for fixed, smaller models (vision, signal processing) and less so for general LLM decoding.
- Maturity, own assessment: photonic compute TRL ~4–6 (Lightmatter racks for the data center; Lightmatter is today commercially oriented mainly toward photonic interconnects). Analog PCM TRL ~4–5. Neuromorphic TRL ~4–5 (research systems). Consumer integration in phones by 2031 is unlikely for all three. The most likely spillover is analog or SRAM-based compute-in-memory inside NPUs (digital CIM) and photonic links between data-center chips.

### Gaps
- No primary source found for concrete product roadmaps (consumer) of Lightmatter, Lightelligence, IBM analog AI, or Intel Loihi 3.
- IBM NorthPole LLM figures (72.7× energy efficiency, 2024) are available only through a secondary source and were not verified.

## Q3: Mobile NPU trend. TOPS/W and memory bandwidth as the decode bottleneck, PIM

### Takeaway
On phones, LLM decode is memory-bandwidth-bound, not compute-bound: tokens/s ≈ bandwidth ÷ weight bytes. Current LPDDR5X (~77–85 GB/s) gives about 15–20 tok/s for an 8B model in INT4. NPU TOPS barely help decode. The real levers are LPDDR6 (more bandwidth, more efficiency), processing-in-memory (Samsung LPDDR5X-PIM: about 8× internal bandwidth, 3.01× inference speedup, Hot Chips 2026), plus quantization, sparsity, and speculative decoding.

### Cited Findings
- First-order bound for batch-1 decode is bandwidth ÷ weight footprint. An 8B INT4 model on about 77 GB/s LPDDR5X gives about 19 tok/s. On-device speed is set by LPDDR bandwidth, not NPU TOPS — [arXiv 2608.28048 "AI Hardware Accelerators for LLMs: Architectures and the Memory Wall" (preprint)](https://arxiv.org/pdf/2608.28048)
- On a Snapdragon 8 Gen 3, the NPU gives only 1.05–1.2× in decode (memory-bound GEMV), and CPUs beat the NPU in prefill by up to 1.6× — [arXiv 2605.27435 "When NPUs Are Not Always Faster" (preprint)](https://arxiv.org/html/2605.27435)
- Lower NPU and memory frequencies cut power by 44% while keeping >10 tok/s, and improve tokens per joule by 38% — [EnerInfer, arXiv 2606.23001 (preprint)](https://www.alphaxiv.org/abs/2606.23001)
- Measurement study on commercial phones: decode about 10 tok/s (Apple M1) vs. 2–4 tok/s (Armv8-A CPUs). GPU acceleration helps prefill much more than decode — [arXiv 2410.03613 "Understanding LLMs in Your Pockets"](https://arxiv.org/html/2410.03613v5)
- PowerInfer-2: a 47B model on a smartphone at 11.68 tok/s through neuron-level sparsity and I/O-aware scheduling — [arXiv 2406.06282](https://arxiv.org/html/2406.06282v3)
- Single-token NPU generation is memory-bound and leaves matrix units unused. Speculative decoding plus NPU coordination is one way to use them — [arXiv 2510.15312](https://arxiv.org/pdf/2510.15312)
- Snapdragon 8 Elite Gen 5 (2025): Hexagon NPU with +16% perf/W over its predecessor. LPDDR5X at 5,300 MHz, up to 24 GB. Qualcomm claims "up to 220 tokens/s" (model, quantization and context not specified, vendor figure) — [Qualcomm product brief](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-8-Elite-Gen-5-product-brief.pdf); [Qualcomm mobile AI](https://www.qualcomm.com/products/mobile/snapdragon/smartphones/mobile-ai)
- Samsung LPDDR5X-PIM (Hot Chips, August 2026): 3.01× faster AI inference than LPDDR5X with 8× bandwidth (internal). About 614 GB/s internal PIM bandwidth at LPDDR5X-9600 vs. 76.8 GB/s over the external interface. Helps only decode (GEMV), not prefill — [Tom's Hardware](https://www.tomshardware.com/pc-components/dram/hot-chips-2026-samsung-makes-lpddr5x-smart-with-logic-unit-in-memory-lpddr5x-pim-is-3-01x-faster-than-lpddr5x-in-ai-inference-with-8x-the-bandwidth); [SammyFans](https://www.sammyfans.com/2026/08/25/samsung-unveils-lpddr5x-pim-dram/amp/)
- Commercialization: reports of a first PIM product (Samsung "GAIA", 4 nm, AI PCs), mass production possibly from 2027. A JEDEC LPDDR6-PIM standard is nearing completion — [TrendForce](https://www.trendforce.com/news/2026/08/26/news-samsungs-4nm-gaia-could-mark-first-pim-commercialization-in-ai-pcs-mass-production-as-early-as-2027/); [Samsung Semiconductor Newsroom](https://news.samsungsemiconductor.com/global/?p=3132)
- Academic PIM design for edge LLMs: CD-PIM (LPDDR5-based, low-batch decode) — [arXiv 2601.12298](https://arxiv.org/html/2601.12298v1)
- LPDDR6: Samsung figure "up to 114 GB/s" and about 21% better efficiency than LPDDR5X (secondary guide only, not verified) — [bestllmfor.com (low authority)](https://bestllmfor.com/guides/lpddr6-memory-local-ai/)

### Inferences
- Own calculation: 5,300 MHz LPDDR5X equals 10.6 GT/s. On a 64-bit bus that is about 85 GB/s, which allows at most about 20 tok/s for 4 GB of weights (8B INT4) and about 40 tok/s for 3–4B models. The Qualcomm figure of 220 tok/s is only plausible for very small models (≤1B) or speculative decoding.
- PIM moves the decode bound from external (~77–85 GB/s) to internal bandwidth (~600 GB/s). In practice that means about 3× decode speed and likely better energy per token, because DRAM I/O (the main energy cost per token) is avoided. That is the most relevant physical hardware lever for local LLMs in phones and laptops in 2027–2029.
- NPU TOPS/W keeps rising (vendors claim +15–45% per generation), but it determines mainly prefill or time-to-first-token and power, not decode speed.

### Gaps
- No primary, independent time series of mobile NPU TOPS/W (2018–2026) found. Vendor TOPS figures are inconsistent (INT4 vs. INT8, sparsity).
- No primary JEDEC/Samsung source on LPDDR6 bandwidth per phone package. No independent LLM benchmarks on LPDDR6 phones (November 2026).
- The 2026 arXiv preprints (2605/2606/2607/2608.*) are only partly verified (abstract level) and not peer-reviewed.

## Q4: Conclusion. What matters for a private local AI app in 1–5 years?

### Takeaway
For a private, local AI app, memory-side progress is what counts: LPDDR6, PIM (from about 2027–2028), and larger RAM. So do software techniques that respect the memory bandwidth bound (4-bit/2-bit quantization, MoE/sparsity, speculative decoding). Photonic, analog and neuromorphic computing will not reach phones by 2031. Network physics (HCF, LEO, microwave) shortens only backbone latency by a few ms and is not controllable by the app. It does not change the basic picture that distributed inference over WAN suffers ≥5–50 ms per round trip.

### Cited Findings
- Decode is memory-bound, and NPU TOPS barely matter — [arXiv 2608.28048](https://arxiv.org/pdf/2608.28048); [arXiv 2605.27435](https://arxiv.org/html/2605.27435)
- PIM: 3.01× inference speedup, product launch from about 2027 (AI PCs first), LPDDR6-PIM standard in preparation — [Tom's Hardware](https://www.tomshardware.com/pc-components/dram/hot-chips-2026-samsung-makes-lpddr5x-smart-with-logic-unit-in-memory-lpddr5x-pim-is-3-01x-faster-than-lpddr5x-in-ai-inference-with-8x-the-bandwidth); [TrendForce](https://www.trendforce.com/news/2026/08/26/news-samsungs-4nm-gaia-could-mark-first-pim-commercialization-in-ai-pcs-mass-production-as-early-as-2027/)
- Sparsity or I/O scheduling allows a 47B model on a phone at about 11.7 tok/s — [PowerInfer-2](https://arxiv.org/html/2406.06282v3)
- HCF: about −31% propagation delay, rollout limited to the Azure backbone — [Microsoft Research](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/Real-Time-Fully-Loaded-C-band-Low-Latency-Long-Haul-Transmission-over-Hollow-Core-Fiber.pdf); [Azure Blog](https://techcommunity.microsoft.com/blog/azurenetworkingblog/-/4455953)
- Photonic and neuromorphic systems are research or rack-scale data-center systems — [Physics World](https://physicsworld.com/a/photonic-computer-chips-perform-as-well-as-purely-electronic-counterparts-say-researchers/); [SiliconANGLE](https://siliconangle.com/?p=652453)

### Inferences
- Time horizon (own assessment):
  - 1–2 years (2027–2028): flagship phones with LPDDR5X-10.7 / first LPDDR6 parts and 16–24 GB RAM. 3–8B models at 4-bit with about 15–30 tok/s locally. Measurable now.
  - 2–4 years (2028–2030): PIM in AI PCs, then possibly in phones (LPDDR6-PIM). About 2–3× decode speed and better tokens/J. Makes 8–14B models comfortable locally.
  - 5+ years: photonic or analog compute in consumer devices remains speculative. Photonic interconnects in the data center will come sooner but only affect the cloud side.
- Architecture advice for a private app: maximize local inference (designed against the bandwidth bound: quantization, MoE, speculative decoding). Use remote calls only coarse-grained (whole requests, not token-wise pipelining across devices). If a server is needed, place it close to the user in the same metro area (lever >10 ms), not "faster cables" (lever ~1–3 ms in Europe).

### Gaps
- No reliable source on Apple, Google or MediaTek roadmaps for PIM in phones.
- No study compares energy per token between local phone inference and cloud inference including network transfer under identical conditions.
