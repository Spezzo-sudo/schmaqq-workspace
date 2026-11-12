# Quantum Communication Complexity, Distributed Quantum Computing and the Quantum Internet (status Nov 2026)

Note on sourcing: every claim has a URL. A few classic theory papers are cited by their well-known arXiv identifiers without being re-fetched in this session; they are marked "(arXiv ID, not re-fetched)". Press and trade-press items (The Quantum Insider, HPCwire) are flagged where they are the only source.

## 1. Quantum communication complexity: proven advantages, messages vs. rounds/latency, experiments

### Takeaway
Quantum communication and shared entanglement can provably cut the **number of bits exchanged**, in some cases exponentially. Entanglement can **never replace** communication, though, and so can never beat light-speed latency. The proven gains are in communication volume (and sometimes the number of messages for a given cost), mostly for specially built or promise problems. Experiments so far are proof-of-principle demonstrations of reduced transmitted information on narrow tasks.

### Cited Findings
**Core theory**
- Rev. Mod. Phys. review (Buhrman, Cleve, Massar, de Wolf, RMP 82, 665–698, 2010): entanglement "cannot be used to replace communication" but "can be used to reduce the communication exponentially". The review ties Bell nonlocality to communication complexity. — [arXiv:0907.3584](https://arxiv.org/abs/0907.3584); [UvA repository](https://dare.uva.nl/id/6a36e2bb-d894-415a-a28d-03910fe08ace)
- Cleve & Buhrman (1997) introduced the idea that prior entanglement can stand in for some communication in multiparty tasks. Buhrman, Cleve & van Dam showed that prior entanglement lowers communication complexity for some problems even though it cannot simulate a channel. — [arXiv quant-ph/9705033](https://arxiv.org/pdf/quant-ph/9705033); Cleve–Buhrman [quant-ph/9704026](https://arxiv.org/abs/quant-ph/9704026) (arXiv ID, not re-fetched)
- Buhrman, Cleve, Wigderson (STOC 1998), "Quantum vs. classical communication and computation": an exponential quantum advantage over *deterministic exact* classical protocols for a promise problem, and an O(√n log n) quantum protocol for set disjointness (vs Θ(n) classically). — [arXiv quant-ph/9802040](https://arxiv.org/abs/quant-ph/9802040) (arXiv ID, not re-fetched)
- Raz (1999) gave the first exponential separation between two-way quantum and two-way *randomized* (public-coin) communication complexity, for a promise problem. — cited as [Raz99] in [Gavinsky et al., arXiv quant-ph/0611209](https://arxiv.org/pdf/quant-ph/0611209)
- Bar-Yossef, Jayram, Kerenidis (2004): exponential one-way quantum vs. randomized separation for the relational Hidden Matching problem. Gavinsky, Kempe, Kerenidis, Raz, de Wolf (2006/07): the same for a Boolean (partial) function, with applications to streaming and cryptography (an extractor that fails against quantum side information). — [arXiv quant-ph/0611209](https://arxiv.org/pdf/quant-ph/0611209); [Princeton record](https://collaborate.princeton.edu/en/publications/exponential-separation-for-one-way-quantum-communication-complexi/)
- Pseudo-telepathy games (Brassard, Broadbent, Tapp): with shared entanglement, players win a nonlocal game with certainty, without communicating, where classical players cannot always win. Examples are the Mermin–Peres magic square and GHZ-type games. — [arXiv quant-ph/0407221](https://arxiv.org/abs/quant-ph/0407221) (arXiv ID, not re-fetched)

**Rounds and interaction**
- Klauck, Nayak, Ta-Shma, Zuckerman (STOC 2001; IEEE TIT 53(6), 2007), "Interaction in quantum communication": for every constant k there is a problem whose (k+1)-message *classical* complexity is exponentially smaller than its k-message *quantum* complexity. So quantum protocols **cannot always reduce interaction without raising cost** (a round hierarchy exists for quantum communication too). Consequence: k-message quantum protocols for Set Disjointness need Ω(N^{1/k}) qubits. — [arXiv quant-ph/0603135](https://arxiv.org/abs/quant-ph/0603135); [DIMACS TR 2000-36](https://archive.dimacs.rutgers.edu/TechnicalReports/abstracts/2000/2000-36.html)
- Latency-constrained coordination (Ding & Jiang, arXiv 2407.21723, 2024): frames "quantum telepathy" (Bell violation) as a way to coordinate decisions **without communicating**, which matters when the speed-of-light delay forbids waiting for a message. The test case is high-frequency trading. They model photon loss, entanglement generation rate and noise. Some scenarios need long-lived quantum memories that do not exist yet, and spreading entanglement over thousands of km would need satellites. A 2026 follow-up (Ding & Xu, arXiv 2603.10883) proposes near-term uses (trading risk, load balancing in ad hoc networks). — [arXiv 2407.21723](https://arxiv.org/html/2407.21723v2); [arXiv 2603.10883](https://arxiv.org/abs/2603.10883); press summary [The Quantum Insider, Mar 2026](https://thequantuminsider.com/2026/03/23/quantum-telepathy-could-tap-near-term-quantum-computers-for-real-world-applications/)
- The Delft/QuTech Science review says explicitly: "A quantum internet is not meant to replace classical communication but rather to supplement it". All nodes are assumed to also have classical channels for control information. — [Wehner, Elkouss, Hanson, Science 2018 (QuTech PDF)](https://qutech.nl/wp-content/uploads/2018/10/Quantum-internet-A-vision.pdf)

**Experimental demonstrations**
- Quantum fingerprinting over 5 km of telecom fibre (Nature Communications 2015, ncomms9735), practical for inputs up to ~100 Mbit. Described as "a first step" in experimental quantum communication complexity. — [Springer/Nature Comms](https://link.springer.com/10.1038/ncomms9735)
- Kumar, Kerenidis, Diamanti (Nature Communications 2019): one-way "Sampling Matching" task with a proven exponential gap. The experiment showed less transmitted information than the best known classical protocol (threshold input size ~3000 in the arXiv version). — [PMC6742668](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6742668/); [arXiv 1811.09154](https://www.arxiv.org/pdf/1811.09154)
- Quantum-switch communication advantage (Wei, Tischler et al., arXiv 1810.10238): qudits up to d = 2^13, using ≤ 0.696 ± 0.006 times the communication of any causally ordered protocol. — [arXiv 1810.10238](https://www.arxiv.org/abs/1810.10238v2)
- 2026 preprint: a proof-of-principle quantum advantage in transmitted information for the Euclidean distance problem (simultaneous-message model) at input size 10^8, using coherent-state fingerprints and tested on grayscale image data. Not yet peer-reviewed. — [arXiv 2605.31516](https://arxiv.org/pdf/2605.31516)

### Inferences
- The proven gains are in **bits and qubits exchanged**, and in some separations the number of messages needed at a given cost. They are not in physical latency. Entanglement correlations cannot carry information (no-signalling), so no protocol lets a party learn a remote input faster than light. The only latency-related use is "coordination without communication" (nonlocal games), where parties act on correlated outcomes instead of waiting for messages. The gain is in decision quality under a hard deadline, not in message delivery speed.
- The big separations (Raz, Hidden Matching, GKKRW) are for promise or relational problems. For total Boolean functions the best known gaps are polynomial (e.g. disjointness, quadratic). This limits how much they can help generic workloads.
- The experiments use optical fingerprint/coherent-state schemes, not entanglement-assisted multi-round protocols, and they win only above a threshold input size on purpose-built tasks.

### Gaps
- I did not fetch the full Raz 1999 STOC paper, the BCW 1998 paper or the Brassard–Broadbent–Tapp survey this session. Their claims are standard but come from arXiv IDs and secondary citations.
- I found no experiment showing a *round/latency* reduction on a practical distributed task, and no loophole-free nonlocal-game deployment in a real application (e.g. trading).

## 2. Applicability to classical distributed tasks (distributed ML / LLM inference, LOCAL/CONGEST models)

### Takeaway
Some theory results show quantum communication advantages for distributed learning and for distributed graph algorithms. They are narrow: they need quantum states encoding the data, quantum channels and memories, and specific model classes or artificial problems. They do not transfer to today's classical distributed ML or LLM inference, and in the LOCAL model many natural problems provably get no quantum advantage.

### Cited Findings
- Gilboa, (Michaeli, Soudry,) McClean, "Exponential Quantum Communication Advantage in Distributed Inference and Learning" (arXiv 2310.07136, v1 Oct 2023, v3 Sep 2024). For a class of models (certain graph-neural-network-like compositional models), inference and gradient-descent training need exponentially less communication than classical analogues, with modest overhead. The models perform well on standard benchmarks, and privacy of data and parameters improves. The advantage "nearly vanishes" for simple linear classifiers. The setting assumes quantum states are sent over a quantum network, and the authors note the advantage is often lost once the cost of loading classical data into quantum states is counted. — [arXiv 2310.07136](https://arxiv.org/abs/2310.07136); [v2 HTML](https://arxiv.org/html/2310.07136v2)
- Le Gall & Magniez (PODC 2018), quantum CONGEST: network diameter computed in Õ(√(nD)) rounds with quantum messages (distributed Grover search), against an Ω̃(n) classical lower bound, with a matching quantum lower bound. — [PODC'18 paper](https://www.irif.fr/~magniez/./PAPIERS/lm-podc18.pdf); [Le Gall slides, Simons](https://simons.berkeley.edu/sites/default/files/docs/15444/francoislegallslidesqw20-1.pdf)
- Le Gall, Nishimura, Rosmanis (STACS 2019), quantum LOCAL: a problem solvable in 2 rounds quantumly that needs Ω(n) rounds classically. The authors call it a proof of concept, not a problem of practical interest. Earlier work (Gavoille–Kosowski–Markiewicz; Arfaoui–Fraigniaud) found no significant quantum advantage for coloring or MIS, and many classical LOCAL lower bounds carry over. — [arXiv 1810.10838](https://arxiv.org/pdf/1810.10838.pdf)
- STOC 2024: approximate graph coloring has **no** quantum advantage in the LOCAL model (deterministic or randomized). — [STOC 2024 paper (IISc eprint)](https://eprints.iisc.ac.in/85607/1/STOC_2024.pdf); see also [arXiv 2510.01657](https://arxiv.org/pdf/2510.01657v1), which notes that LOCAL-model advantages found so far are for "artificial" problems.

### Inferences
- Here "rounds" in LOCAL/CONGEST are synchronous communication rounds, so the CONGEST diameter result is a genuine round reduction for a graph problem. It assumes a network of quantum nodes exchanging qubits, which is stage 4–6 hardware in the Wehner model (section 4).
- For LLM inference and training, the bottleneck traffic is classical activations, gradients and KV-cache tensors. The Gilboa–McClean result needs the model *and data* to be natively quantum-encoded, and data loading kills the advantage. I found no credible source showing a quantum communication advantage for transformer/LLM inference or classical all-reduce.

### Gaps
- I found no peer-reviewed experimental demonstration of quantum-communication-assisted distributed learning.
- I did not verify the final publication venue of arXiv 2310.07136.

## 3. Distributed quantum computing: linking quantum processors

### Takeaway
Since 2025, separate quantum processors have been linked to run gates and small algorithms across modules: Oxford (photonic, trapped ions, Nature 2025), IBM (microwave cables between two 120-qubit chips, 2026 preprint) and IonQ (photonic, 2026, few details). Links are short (cm to m), fidelities trail on-chip gates, and photonic entanglement rates are low. Vendors treat modular interconnects as necessary for fault-tolerant scaling around 2027–2029.

### Cited Findings
- Main et al., "Distributed quantum computing across an optical network link", Nature 638, 383–388 (5 Feb 2025), Oxford: two trapped-ion modules about 2 m apart, linked photonically. A CZ gate was teleported between modules at 86% fidelity, and Grover's search ran across modules at 71% success. The authors call it the first distributed algorithm with several non-local two-qubit gates. The team (David Lucas) says scaling up remains a major challenge. — [Oxford news](https://www.ox.ac.uk/news/2025-02-06-first-distributed-quantum-algorithm-brings-quantum-supercomputers-closer); [Oxford Physics](https://www.physics.ox.ac.uk/news/paving-way-quantum-supercomputers); [ORA record](https://ora.ox.ac.uk/objects/uuid:e8e788d3-e15c-48a3-ae23-107ad7d43ea2)
- A trade-press report on the Oxford work says entanglement generation took ~100 ms-scale per attempt (reported as "~103 ms"). Treat this as unverified secondary reporting. — [Quantum Computing Report](https://quantumcomputingreport.com/?p=31636)
- IBM (arXiv 2610.29986, Oct 2026, not peer-reviewed): two 120-qubit Nighthawk R1 processors linked by four ~80 cm aluminium coax cables. Results: state transfer ~99% on average (best 99.29%), remote CZ 94.75% on average (best 96.42%), and 4-/6-qubit cross-chip entangled states at 77%/68% raw fidelity. Only qubits near the links were used, magnetic shielding is a temporary fix, and reconnection was not tested. — [arXiv 2610.29986](https://arxiv.org/pdf/2610.29986); [The Quantum Insider summary](https://thequantuminsider.com/2026/10/27/ibm-connects-two-120-qubit-processors-with-99-state-transfer-fidelity/)
- IBM roadmap (June 2025): Loon (2025, on-chip long-range "c-couplers"), Kookaburra (2026, first modular processor storing and processing encoded information), Cockatoo (2027, entangles two Kookaburra modules via "L-couplers") and Starling (2029, Poughkeepsie, 200 logical qubits, 10^8 operations). After that comes Blue Jay (2,000 logical qubits, 10^9 operations). — [HPCwire](https://www.hpcwire.com/off-the-wire/ibm-unveils-plan-for-fault-tolerant-quantum-computer-by-2029/); [The Quantum Insider](https://thequantuminsider.com/?p=2378833)
- IonQ (April 2026, with AFRL): two trapped-ion systems photonically linked and entangled, called "the first networked commercial quantum computers". Critics note no published fidelity, rate, distance or wavelength. — [PostQuantum](https://postquantum.com/industry-news/ionq-photonic-interconnect-networked-quantum/); [Pipeline](https://pipelinepub.com/news/ionq-achieves-key-photonic-interconnect-milestone)

### Inferences
- "Distributed quantum computing" today means linking modules **inside one lab or cryostat** to get around chip-size limits. It is not geographically distributed computing over the internet.
- Photonic links (ions, NV/SiV) can in principle reach far, but rates and fidelities are well below what fault-tolerant, inter-site gates need.

### Gaps
- I found no reliable primary source on Nu Quantum's or Photonic Inc.'s 2025–26 technical results.
- I could not confirm whether IBM's Kookaburra (2026) shipped on schedule.

## 4. Quantum internet: stage model, testbeds, repeaters, China, EU and US roadmaps

### Takeaway
Measured against Wehner–Elkouss–Hanson's six-stage model, deployed networks outside the lab are still at **stage 1 (trusted-node QKD)**, including China's large satellite and fiber QKD infrastructure. Labs have shown stage 2–4 elements on metropolitan scales: memory nodes entangled over 10–35 km of deployed fiber and teleportation across a 3-node network. Repeaters exist only as elementary links. The EU's QIA targets a two-metro, repeater-linked prototype in a 42-month phase (to about late 2029). The US DOE (2020) said a prototype nationwide quantum internet was "within reach over the next decade".

### Cited Findings
**Stage model (Science 362, eaam9288, 2018)**
- The six functionality-driven stages: (1) trusted repeater networks, (2) prepare-and-measure networks, (3) entanglement distribution networks, (4) quantum memory networks, (5) few-qubit fault-tolerant networks, (6) quantum computing networks. A stage counts as reached only if it and all earlier stages are available to all end nodes. As of 2018, "only trusted repeater networks (first stage) have been realized" outside the lab. A trusted-node network does not allow end-to-end transmission of qubits. — [QuTech PDF](https://qutech.nl/wp-content/uploads/2018/10/Quantum-internet-A-vision.pdf); [TU Delft repository](https://repository.tudelft.nl/file/File_982e12e8-1a4c-4ccc-a02b-10fa7e958b4d)

**QuTech / Delft**
- Hermans, Pompili et al., Nature 605, 663–668 (2022): qubit teleportation between non-neighbouring nodes of a 3-node NV-diamond network (entanglement swapping at the middle node plus memory storage), beating the classical bound of 2/3. — [QuTech](https://qutech.nl/lab/hanson-lab/research-highlights/quantum-teleportation-across-a-network/); [CORDIS](https://cordis.europa.eu/article/id/442356-sending-quantum-information-from-alice-to-charlie)
- Pompili et al., Science 372 (2021), first 3-node multi-node network. I did not verify this source this session; arXiv ID [2102.04471](https://arxiv.org/abs/2102.04471) (not re-fetched).
- Stolk et al., Science Advances 10(44), 2024 (DOI 10.1126/sciadv.adp6442): heralded entanglement between independently operated NV nodes in Delft and The Hague, ~10 km apart over ~25 km of deployed KPN fiber, with quantum frequency conversion and a fiber link stabilised to well within the photon wavelength. A follow-on node was delivered to Aachen (Germany) in January 2025. — [arXiv 2404.03723](https://arxiv.org/html/2404.03723v1); [Bits&Chips](https://bits-chips.com/article/quantum-link-set-up-between-delft-and-the-hague); [Quantum Delta NL](https://quantumdelta.nl/news/a-rudimentary-quantum-network-link-between-dutch-cities)

**US academic testbeds**
- Knaut et al. (Harvard/AWS, Nature 2024): two SiV-in-nanophotonic-diamond memory nodes entangled over a 35 km deployed fiber loop in Boston (17 dB loss), with telecom conversion to 1350 nm and entanglement stored for >1 s. — [arXiv 2310.01316](https://arxiv.org/pdf/2310.01316); [Lukin lab](https://lukin.physics.harvard.edu/quantum-networking-siv)
- Brookhaven/Stony Brook: ~120 km Long Island fiber testbed, and polarization qubits sent over 140 km (2020). — [BNL news](https://www.bnl.gov/newsroom/news.php?a=117351)

**Quantum repeaters**
- USTC (Nature, Feb 2026), "Long-lived remote ion–ion entanglement for scalable quantum repeaters": two ion nodes over 10 km of spooled fiber. A secondary source reports 550 ± 36 ms coherence and 0.578 fidelity, and calls it a building block (elementary link), not a full repeater chain. — [CAS](https://english.cas.cn/newsroom/cas-in-media/202602/t20260206_1149922.shtml); [The Quantum Insider](https://thequantuminsider.com/2026/02/06/chinese-researchers-clear-hurdles-for-long-distance-quantum-networks/)
- USTC (Nature 2024): memory–memory entanglement among three independent atomic-ensemble nodes on a metropolitan scale, with telecom conversion. — [Nature s41586-024-07308-0](https://www.nature.com/articles/s41586-024-07308-0.pdf)
- A Toshiba/GÉANT/PSNC 2025 claim of a "first effective quantum repeater" on telecom infrastructure is closer to a relay-based QKD (twin-field-style) setup than to a memory-based entanglement repeater, so treat it with caution. — [Science|Business](https://sciencebusiness.net/network-updates/toshiba-europe-geant-psnc-and-anglia-ruskin-university-announce-first-demonstration)

**China (Pan Jianwei / USTC)**
- Micius satellite: entanglement distribution over 1,200 km (2017), as cited in DOE 2020. — [DOE report](https://www.energy.gov/sites/prod/files/2020/07/f76/QuantumWkshpRpt20FINAL_Nav_0.pdf)
- Jinan-1 microsatellite (Nature, 19 March 2025): real-time QKD between Beijing and Stellenbosch (12,900 km) with the satellite as a **trusted relay**. Details: 23 kg payload, ~100 kg ground stations, up to 1 Mbit of key per pass. It uses a simpler protocol than entanglement-based Micius, so a compromised satellite could learn the key. — [USTC](https://en.ustc.edu.cn/info/1007/5032.htm); [CAS](https://english.casad.cas.cn/newsroom/ma/202503/t20250325_908666.html); [Scientific American](https://scientificamerican.com/article/mini-satellite-sends-encrypted-quantum-message-a-record-breaking-distance)

**EU Quantum Internet Alliance**
- QIA phase 1 ran October 2022 to March 2026. The EC granted €47.5 M for a 42-month phase 2 (SGA2) to build a full-stack, programmable prototype: two metropolitan networks with quantum processors, connected by a long-distance fiber backbone with quantum repeaters. On 8 Sep 2026 QIA and GÉANT signed an MoU on moving from lab prototypes to field trials, potentially cross-border. The original 2022 programme was described as seven years. — [QuTech QIA](https://qutech.nl/qia/); [CORDIS 101297140](https://cordis.europa.eu/project/id/101297140); [TNO 2022](https://www.tno.nl/en/newsroom/2022/10/european-program-build-world-first/); [Quantum Computing Report on GÉANT MoU](https://quantumcomputingreport.com/geant-and-quantum-internet-alliance-partner-to-advance-european-quantum-networking-architecture/)

**US DOE Blueprint (July 2020)**
- Five milestones: (1) verified secure quantum protocols over fiber, (2) inter-campus and intra-city entanglement distribution, (3) intercity quantum communication with entanglement swapping, (4) interstate entanglement distribution with quantum repeaters, (5) a multi-institutional lab/academia/industry ecosystem. The report says the community sees a first prototype global quantum internet as "within reach over the next decade". — [DOE report PDF](https://www.energy.gov/sites/prod/files/2020/07/f76/QuantumWkshpRpt20FINAL_Nav_0.pdf); [OSTI 1638794](https://www.osti.gov/biblio/1638794/); [BNL](https://www.bnl.gov/newsroom/news.php?a=117351)

### Inferences
- In stage-model terms (my assessment): deployed networks are stage 1 (China's QKD backbones and satellites, EU and other trusted-node QKD). Metro testbeds (Delft–The Hague, Boston, Hefei) show stage 3–4 *ingredients* between two or three nodes, but not stage-level service to arbitrary end nodes. Stages 5–6 (fault-tolerant and quantum-computing networks) have no field demonstrations.
- DOE milestones 2–3 are partly met in metro testbeds. Milestone 4 (interstate entanglement with repeaters) is not met as of Nov 2026.

### Gaps
- QIA's public year-by-year milestones for SGA2 were not found, so the "about 2029" end date is inferred from the 42 months plus the phase-1 end in March 2026.
- I did not find an authoritative 2025–26 DOE update to the 2020 blueprint.

## 5. Realistic timelines for consumer relevance

### Takeaway
No credible institution projects consumer-facing quantum-internet services this decade beyond QKD-type security via providers. Institutional targets are prototypes: QIA's repeater-linked two-metro prototype by about the end of the decade, DOE's "prototype within a decade" (from 2020, i.e. ~2030), and IBM's fault-tolerant modular Starling in 2029 (in one data centre). Applications that would matter to end users, such as distributed quantum computing, blind computing and communication-complexity gains, sit at stages 4–6, which have no field demonstrations yet.

### Cited Findings
- QuTech/Delft: a quantum internet supplements and does not replace classical communication. Its applications are QKD, secure identification, clock sync, sensing and blind quantum computing, graded by stage. — [Science 2018 (QuTech PDF)](https://qutech.nl/wp-content/uploads/2018/10/Quantum-internet-A-vision.pdf)
- DOE 2020: prototype within reach "over the next decade". — [DOE report](https://www.energy.gov/sites/prod/files/2020/07/f76/QuantumWkshpRpt20FINAL_Nav_0.pdf)
- QIA: prototype network in a 42-month phase from 2026. — [CORDIS 101297140](https://cordis.europa.eu/project/id/101297140); [QuTech QIA](https://qutech.nl/qia/)
- IBM: modular entangled modules (Cockatoo) in 2027, and Starling (200 logical qubits) in 2029. — [HPCwire](https://www.hpcwire.com/off-the-wire/ibm-unveils-plan-for-fault-tolerant-quantum-computer-by-2029/)
- Latency-coordination applications need long-lived memories "still under development" and satellites for long distances. — [arXiv 2407.21723](https://arxiv.org/html/2407.21723v2)

### Inferences
- Consumers are most likely to meet quantum networking first as security in carrier and backbone networks (QKD, trusted nodes and satellites). Quantum resources that reduce communication for everyday distributed computing (ML, LLM inference) would need quantum memory networks, quantum data encodings and native quantum workloads. Realistically, that is after 2035, if ever, for classical workloads (my judgment based on the sources above, not an institutional forecast).

### Gaps
- I found no institutional forecast with a specific date for consumer quantum-internet services.
