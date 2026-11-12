# What quantum entanglement can and cannot do for communication across distance

Scope note: notes compiled 2026-11-12. Primary sources were favoured (arXiv records of peer-reviewed papers, Stanford Encyclopedia of Philosophy, Caltech lecture notes). nobelprize.org's "advanced information" / scientific-background PDF returned HTTP 403 and could not be read directly; Nobel facts below come from the official press-release page (search-indexed) and AIP. APS (journals.aps.org) and nature.com abstract pages also blocked fetching, so arXiv records (which list the journal references) are used instead.

## 1. The no-communication (no-signalling) theorem: statement, authorship, attempted circumventions

### Takeaway
Whatever Alice does locally to her half of an entangled system (choice of measurement, unitary, etc.), the statistics of Bob's local measurements — fully captured by his reduced density matrix — are unchanged, so no message can be read by Bob until classical information arrives. The result is usually credited to Eberhard (1978) and Ghirardi–Rimini–Weber (1980), with later extensions to QFT (Eberhard & Ross 1989) and a modern relativistic treatment by Peres & Terno (2004); the best-known "circumvention" (Herbert's FLASH, 1982) failed and instead prompted the no-cloning theorem.

### Cited Findings
- Plain-language statement (Caltech, Preskill, Physics 229 notes, §2.5.3 "Faster than light?"): a scheme where Bob measures his halves of many EPR pairs either along z or along x, "preparing" Alice's spins in different ensembles, fails because "both ensembles are described by precisely the same density matrix ρ_A. Thus, there is no conceivable measurement Alice can make that will distinguish the two ensembles, and no way for Alice to tell what action Bob performed. The 'message' is unreadable." — [Preskill, Lecture Notes for Physics 229, Caltech (copy hosted by Univ. of Arizona OPTI 646)](https://wp.optics.arizona.edu/opti646/wp-content/uploads/sites/55/2025/08/Preskills-notes-copy.pdf); canonical course page [theory.caltech.edu/~preskill/ph229](http://theory.caltech.edu/~preskill/ph229/)
- Same section: Alice *can* later detect what Bob did by comparing her outcomes to Bob's list of results, "but in this case there is certainly no faster-than-light communication, because Alice had to receive Bob's phone call before she could perform her test." The correlations exist but are only visible once classical data are compared. — [Preskill notes, §2.5.3](https://wp.optics.arizona.edu/opti646/wp-content/uploads/sites/55/2025/08/Preskills-notes-copy.pdf)
- Authorship: Ghirardi, Rimini & Weber, "A general argument against superluminal transmission through the quantum mechanical measurement process," Lettere al Nuovo Cimento (1980), is the standard reference; a historical account describes it as showing quantum nonlocality cannot carry information faster than light. — [PhilArchive historical paper (ALLFNT-2)](https://philarchive.org/archive/ALLFNT-2); [Springer record](https://link.springer.com/doi/10.1007/BF02817189)
- Eberhard (1978), "Bell's Theorem and the Different Concepts of Locality," Il Nuovo Cimento, is cited as an early rigorous demonstration that FTL communication via quantum systems is impossible; Eberhard & Ross (1989), "Quantum field theory cannot provide faster-than-light communication," extended this to QFT. (Secondary source; primary text not fetched.) — [Wikipedia, No-communication theorem (history section)](https://www.wikipedia.org/wiki/No-signaling_principle)
- Caveat: a Wikipedia talk-page discussion notes the standard NCT is a non-relativistic QM result while Eberhard's work is framed differently, and that their asserted equivalence is unsourced. — [Wikipedia talk page](https://wiki.riteme.site/wiki/Talk:No-communication_theorem)
- Peres & Terno, "Quantum Information and Relativity Theory," Rev. Mod. Phys. 76, 93–123 (2004): "Special relativity imposes severe restrictions on the transfer of information between distant systems"; also argue quantum entropy is not Lorentz covariant and that reduced density matrices of entangled systems may transform non-completely-positively under Lorentz boosts. — [arXiv:quant-ph/0212023](https://arxiv.org/abs/quant-ph/0212023)
- Finer structure (SEP, Bell's Theorem): factorizability = Parameter Independence (PI, outcome probabilities independent of the distant *setting*) ∧ Outcome Independence (OI) (Jarrett; terms by Shimony). Quantum mechanics violates OI but not PI at the level of observable statistics. Jarrett argued violating PI would permit superluminal signalling if the state were controllable; the entry notes de Broglie–Bohm theory violates PI at the hidden-variable level yet still does not permit signalling (because λ is not controllable). — [SEP, "Bell's Theorem"](https://plato.stanford.edu/entries/bell-theorem/)
- SEP, "Quantum Entanglement and Information": Schrödinger already noted that "the second system cannot be steered into a particular quantum state at the whim of the experimenter" — the measured outcome is random, which is why steering does not transmit a choice. — [SEP, qt-entangle](https://plato.stanford.edu/entries/qt-entangle/)
- Famous circumvention attempt: Nick Herbert's "FLASH — A superluminal communicator based upon a new kind of measurement" (Found. Phys., 1982). Asher Peres refereed it and later admitted he recommended publication "knowing perfectly well that it was wrong," because finding the flaw would be instructive. The refutations by Wootters & Zurek ("A single quantum cannot be cloned," Nature 1982) and Dieks (Phys. Lett. 1982) showed FLASH required perfect copying of an unknown quantum state, which linearity forbids. — [Peres, "How the no-cloning theorem got its name," arXiv:quant-ph/0205076](https://arxiv.org/pdf/quant-ph/0205076); [Ortigoso, "Twelve years before the quantum no-cloning theorem," arXiv:1707.06910](https://arxiv.org/pdf/1707.06910) (argues Park 1970 already had a proof)
- Ghirardi also refereed FLASH and recommended rejection; per Peres/Kaiser accounts he had a general proof earlier. — [Peres, arXiv:quant-ph/0205076](https://arxiv.org/pdf/quant-ph/0205076)
- Nonlocality debate: Salart et al. comment/reply exchange (see §4) shows that even physicists who bound the "speed" of hypothetical influences stress such influences cannot be used to signal. — [Salart et al. preprint arXiv:0808.3316](https://arxiv.org/pdf/0808.3316)

### Inferences
- For a non-physicist: entanglement gives each side a random outcome; the randomness is *correlated*, but neither side can choose its outcome, so the "message" is indistinguishable from noise until the two records are put side by side — which requires an ordinary (≤ c) channel.
- Every known circumvention proposal (FLASH-type amplifiers/cloners, ensemble-distinguishing schemes) fails on one of: no-cloning, linearity of QM, or the fact that different decompositions of the same density matrix are physically indistinguishable. Physicists reject them because the NCT follows from the core postulates (Born rule + local operations act only on local tensor factor), not from any approximation.
- Would-be signalling would require a modification of QM itself (e.g., nonlinear dynamics, or non-Born-rule statistics); such modifications are known (Gisin, Polchinski) to generically permit signalling — but I did not fetch those papers (see Gaps).

### Gaps
- Primary texts of Eberhard 1978 and GRW 1980 were not retrieved; volume/page numbers not independently verified (GRW commonly cited as Lett. Nuovo Cimento 27, 293 (1980) — unverified here).
- Gisin (1990) / Polchinski (1991) results that nonlinear QM permits signalling were not fetched.
- No specific "serious modern proposal" to break NCT from a reputable group was found; consistent with mainstream consensus but absence not exhaustively verified.

## 2. Bell tests and the 2022 Nobel Prize

### Takeaway
The 2022 Nobel Prize (Aspect, Clauser, Zeilinger) recognised experiments establishing violation of Bell inequalities — i.e., nature's correlations cannot be explained by any local-realist (local hidden variable) model — and pioneering quantum information. 2015 experiments in Delft, Vienna and NIST/Boulder closed the main loopholes simultaneously. Importantly, violating Bell inequalities is fully consistent with no-signalling.

### Cited Findings
- Official citation: "for experiments with entangled photons, establishing the violation of Bell inequalities and pioneering quantum information science"; announced 4 Oct 2022. Clauser's measurements "supported quantum mechanics by clearly violating a Bell inequality"; Aspect "developed the setup, using it in a way that closed an important loophole"; Zeilinger's group "demonstrated a phenomenon called quantum teleportation." — [NobelPrize.org press release](https://www.nobelprize.org/prizes/physics/2022/press-release/); [AIP statement](https://www.aip.org/news/aip-congratulates-2022-nobel-prize-winners-physics)
- Zeilinger also led a "Cosmic Bell Test" using starlight to choose settings (addressing freedom-of-choice). — [AIP](https://www.aip.org/news/aip-congratulates-2022-nobel-prize-winners-physics)
- Loopholes (SEP): communication/locality loophole (measurement arms must be spacelike separated — Aspect, Dalibard & Roger 1982 used rapidly switched analyzers, with imperfections); detection loophole (fair-sampling assumption; Eberhard's work lowering required efficiency); freedom-of-choice loophole (settings must be independent of hidden variable λ). Aspect, Grangier & Roger 1982 with two-channel analyzers violated the Bell limit by ~40 standard deviations. — [SEP, Bell's Theorem](https://plato.stanford.edu/entries/bell-theorem/)
- Hensen et al. (Delft, Hanson group), Nature 526, 682–686 (2015): NV-centre electron spins separated by 1.3 km, event-ready scheme; 245 trials; CHSH S = 2.42 ± 0.20 (local realism requires S ≤ 2); p = 0.039; closes detection and locality loopholes together. — [arXiv:1508.05949](https://arxiv.org/abs/1508.05949)
- Giustina et al. (Vienna, Zeilinger group), PRL 115, 250401 (2015): entangled photons, superconducting detectors, fast settings; probability under local realism ≤ 3.74 × 10⁻³¹ (≈11.5σ). — [arXiv:1511.03190](https://arxiv.org/abs/1511.03190)
- Shalm et al. (NIST), PRL 115, 250402 (2015): spacelike separated events, fast RNGs, high-efficiency detectors; unadjusted p = 5.9 × 10⁻⁹, adjusted p = 2.3 × 10⁻⁷. — [arXiv:1511.03189](https://arxiv.org/abs/1511.03189)
- Hensen et al. note the result enables device-independent quantum-secure communication and randomness certification. — [arXiv:1508.05949](https://arxiv.org/abs/1508.05949)

### Inferences
- Bell tests prove *correlations* stronger than any classical shared-randomness model, not *signalling*. In every Bell test each party's local outcome statistics are 50/50 regardless of the other's setting (PI holds), which is precisely the no-signalling condition (see SEP PI/OI discussion in §1).
- "Spooky action" (Einstein's phrase) is therefore best described as nonlocal correlation, not a usable causal channel.

### Gaps
- Nobel "Scientific Background" PDF (nobelprize.org) blocked (403); could not quote its wording on signalling.
- Clauser–Freedman 1972 primary paper (PRL 28, 938) not fetched.

## 3. Quantum teleportation: why a classical channel is required; record distances

### Takeaway
Teleportation transfers an unknown qubit state using a pre-shared entangled pair *plus* two classical bits per qubit; without the bits Bob's qubit is maximally mixed (no information), so teleportation is bounded by the speed of the classical channel (≤ c). The record ground-to-satellite teleportation (Micius, Pan Jianwei group, 2017) reached up to ~1,400 km.

### Cited Findings
- Protocol (Preskill §4.2.4): Alice performs a Bell measurement on the unknown qubit plus her half of an EPR pair and "sends her measurement outcome (two bits of classical information) to Bob over the classical channel"; Bob applies one of four Pauli corrections. "The measurement outcome is in fact completely random … so Alice (and Bob) actually acquire no information at all" about the state; the original is destroyed, consistent with no-cloning. — [Preskill notes, §4.2.4](https://wp.optics.arizona.edu/opti646/wp-content/uploads/sites/55/2025/08/Preskills-notes-copy.pdf)
- Without entanglement, the best classical measure-and-prepare strategy gives average fidelity F = 2/3 (vs 1/2 for random guessing) — this is the "classical limit" teleportation experiments must beat. — [Preskill notes, eq. 4.79](https://wp.optics.arizona.edu/opti646/wp-content/uploads/sites/55/2025/08/Preskills-notes-copy.pdf)
- SEP: after "Alice communicates the outcome of her operation to Bob," Bob can reconstruct the state — Bob needs Alice's classical bits. — [SEP, qt-entangle](https://plato.stanford.edu/entries/qt-entangle/)
- Original protocol: Bennett, Brassard, Crépeau, Jozsa, Peres, Wootters, PRL 70, 1895 (1993). — [APS DOI 10.1103/PhysRevLett.70.1895](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.70.1895) (abstract page blocked fetch; citation from standard reference)
- Micius record: Ren et al., "Ground-to-satellite quantum teleportation," Nature 549, 70–73 (2017): single-photon qubits teleported from Ngari, Tibet (altitude 5,100 m) to the Micius satellite (launched 16 Aug 2016, ~500 km orbit) at distances up to 1,400 km; average fidelity 0.80 ± 0.01 over six input states, above the classical limit. Prior fibre/terrestrial free-space teleportation was limited to ~100 km by photon loss. — [arXiv:1707.00934](https://arxiv.org/pdf/1707.00934)
- 1,400 km is the maximum slant range (near horizon); overhead distance ~500 km. — [arXiv:1707.00934](https://arxiv.org/pdf/1707.00934)
- Entanglement itself has been distributed between locations more than 1,200 km apart (Micius) and over 143 km terrestrially. — [SEP, qt-entangle](https://plato.stanford.edu/entries/qt-entangle/)

### Inferences
- Latency of teleportation = latency of the classical channel (≥ distance / c, in fibre ≈ distance / (0.67c)), plus Bell-measurement and correction time. Entanglement pre-distribution can be done in advance, but it does not shorten the critical path for transferring new information.
- Teleportation is useful for *moving quantum states* reliably (quantum networks, distributed quantum computing), not for beating light-speed latency.

### Gaps
- I did not verify whether any teleportation distance record after 2017 surpasses Micius (as of Nov 2026); no reputable source found in this pass.

## 4. What entanglement CAN do across distance; "speed of spooky action" experiments

### Takeaway
Entanglement provides correlations stronger than shared classical randomness: it improves winning probabilities in nonlocal games (CHSH: 75% classical → ~85.4% quantum), can exponentially reduce communication in some distributed tasks, and enables device-independent cryptography/randomness — but it "cannot be used to replace communication." Experiments bounding the "speed" of hypothetical influences (≥10,000c) are about ruling out hidden-signal models, not about usable FTL.

### Cited Findings
- Buhrman, Cleve, Massar & de Wolf, "Non-locality and communication complexity," Rev. Mod. Phys. 82, 665 (2010): entanglement "cannot be used to replace communication, [but] can be used to reduce the communication exponentially" for certain distributed tasks. — [arXiv:0907.3584](https://arxiv.org/abs/0907.3584)
- CHSH game: no classical strategy wins more than 75% — [Aaronson, UT Austin lecture 14](https://www.scottaaronson.com/qclec/14.pdf); with a shared EPR pair players win with probability cos²(π/8) ≈ 85%, and Tsirelson showed this is optimal for quantum strategies regardless of entanglement amount — [Quantum Computing Lecture Notes, arXiv:1907.09415](https://arxiv.org/pdf/1907.09415); [MIT/Vidick notes](https://people.csail.mit.edu/vidick/matt_chsh.html)
- Cleve, Høyer, Toner & Watrous, "Consequences and limits of nonlocal strategies" (CCC 2004): nonlocal games where entangled strategies beat all classical ones; entanglement "can profoundly affect the soundness property of two-prover interactive proof systems"; Tsirelson-type upper bounds on entangled winning probabilities. — [arXiv:quant-ph/0404076](https://arxiv.org/abs/quant-ph/0404076)
- Loophole-free Bell violations support device-independent secure communication and randomness certification. — [Hensen et al., arXiv:1508.05949](https://arxiv.org/abs/1508.05949)
- "Speed of spooky action": Salart, Baas, Branciard, Gisin & Zbinden, Nature 454, 861–864 (2008): 24-hour Bell-type test between two villages 18 km apart (Geneva region); concluded any hypothetical influence producing the correlations (in a preferred frame) would need speed ≥ 10,000 × c. — [arXiv:0808.3316](https://arxiv.org/pdf/0808.3316); [UNIGE archive](https://archive-ouverte.unige.ch/unige:879)
- Critique: Kofler, Ursin, Brukner & Zeilinger argued the setup was Franson-type, so not a genuine Bell test, and that a common-cause explanation fits the data; Salart et al. replied this is not a fundamental issue. — [Comment, arXiv:0810.4452](https://arxiv.org/pdf/0810.4452); [Reply, arXiv:0810.4607](https://ar5iv.arxiv.org/html/0810.4607)

### Inferences
- For distributed computing: entanglement can act as an "upgraded shared random seed." Nodes that must make *correlated decisions without talking* (coordination games, certain load-balancing/consensus-flavoured games) can do statistically better than with classical shared randomness, with zero added latency at decision time — but each node still cannot learn anything about the other's input until a message arrives. Any task whose output at node B must depend on a *fresh* input at node A still needs ≥ d/c latency.
- Communication-complexity savings reduce *bits exchanged* (bandwidth/rounds in some tasks), not the light-speed lower bound on latency of a single dependency.
- The "≥10,000c" numbers should be read as: if a hidden superluminal mechanism existed, it would have to be at least that fast — and per the NCT it could still not carry a controllable signal.

### Gaps
- No concrete measured latency benefit of entanglement-assisted coordination in a real distributed-computing deployment was found.
- Later "speed of influence" bounds (e.g., Yin et al. 2013, Micius-scale tests) not fetched.

## 5. Relativity/causality: why FTL signalling would break causality

### Takeaway
In special relativity, events at spacelike separation have no invariant time order; a signal faster than light in one inertial frame travels backwards in time in another, so FTL signalling plus relativity permits sending a message into one's own past (causal paradoxes). The NCT is what lets quantum nonlocality coexist with relativity ("peaceful coexistence").

### Cited Findings
- Bell's locality condition is grounded in relativity's prohibition on superluminal causation: "direct causes and effects are nearby, and indirect ones are no further away than light allows" (PLC-1); PI is "a consequence of the causal locality condition PLC-1 alone." — [SEP, Bell's Theorem](https://plato.stanford.edu/entries/bell-theorem/)
- "Special relativity imposes severe restrictions on the transfer of information between distant systems." — [Peres & Terno, RMP 76, 93 (2004), arXiv:quant-ph/0212023](https://arxiv.org/abs/quant-ph/0212023)
- Kent (1999) built secure classical bit-commitment from relativistic no-signalling constraints — illustrating that the light-speed limit is treated as a hard, exploitable physical constraint in quantum cryptography. — [SEP, qt-entangle](https://plato.stanford.edu/entries/qt-entangle/)
- Bell tests need spacelike separation of measurement events precisely so that no light-speed signal could coordinate outcomes (locality loophole). — [SEP, Bell's Theorem](https://plato.stanford.edu/entries/bell-theorem/); [Shalm et al., arXiv:1511.03189](https://arxiv.org/abs/1511.03189)

### Inferences
- Standard textbook argument (relativity of simultaneity → FTL signal + boost = signal into the past → "tachyonic antitelephone" paradox) is well established, but I did not retrieve a specific reputable source wording it in this session; see Gaps.
- Consequence for system design: no physical mechanism, quantum or classical, will lower one-way latency below d/c; entanglement is valuable for security, correlated randomness and reducing communication *volume*, not latency.

### Gaps
- No fetched primary source explicitly spelling out the Lorentz-transformation "signal into the past" argument (e.g., Tolman 1917 / Einstein 1907, or a university relativity text); report writer should treat this as textbook knowledge requiring a citation if used verbatim.
- Shimony's "peaceful coexistence" phrase not sourced in this pass.
