# Quantum Approaches to Privacy on Foreign Machines & Quantum-Era Cryptography for End Users

(Research status: November 2026. Notes by research sub-agent. Secondary sources are flagged as such.)

## 1. Blind / delegated / verifiable quantum computing (BQC) — guarantees, demos, client requirements, AI workloads

### Takeaway
Universal blind quantum computing (BFK, FOCS 2009) lets a client with almost no quantum capability (just preparing and sending random single qubits, plus a classical computer) run a quantum computation on a remote server that learns nothing about input, algorithm or output beyond an upper bound on size. Lab demonstrations so far are tiny (4 photonic qubits in 2012; a 2-ion trapped-ion server linked by fibre in 2024; a two-client photonic demo in 2025). It is a research-stage technology with no product for end users or small teams, and it does not make sense for hiding classical AI workloads today.

### Cited Findings
**Protocol and guarantees**
- Broadbent, Fitzsimons, Kashefi, "Universal Blind Quantum Computation", arXiv:0807.4154 (v3 Dec 2009), published at IEEE FOCS 2009 — [arXiv](https://www.arxiv.org/abs/0807.4154); [Physics Today](https://physicstoday.aip.org/news/a-blind-quantum-computer-makes-its-laboratory-debut)
- Based on measurement-based quantum computation. It introduces "brickwork" graph states that need only (X,Y)-plane measurements. The client hides the computation through secret random measurement angles and qubit rotations — [arXiv PDF](https://www.arxiv.org/pdf/0807.4154)
- Client requirements: no quantum memory and no quantum computing power. The client only prepares single qubits in separable states, chosen at random from a finite set, and sends them to the server, plus a classical computer that exchanges measurement angles and results with the server — [ar5iv 0807.4154](https://ar5iv.arxiv.org/html/0807.4154); [APS 2012 abstract](https://meetings-archive.aps.org/mar/2012/t30/9)
- The BFK paper describes the scheme as the first universal scheme that can also detect a cheating server (via trap qubits) — [arXiv PDF](https://www.arxiv.org/pdf/0807.4154)
- Fitzsimons & Kashefi, "Unconditionally verifiable blind computation" (arXiv:1203.5217): trap-based verification with information-theoretic security. The client still only prepares and sends single qubits — [arXiv/alphaXiv 1203.5217](https://alphaxiv.org/abs/1203.5217)
- Mahadev, "Classical Verification of Quantum Computations" (FOCS 2018, best paper): a fully *classical* polynomial-time verifier can check BQP computations of an efficient quantum prover. Soundness is computational and rests on LWE being hard for quantum machines (unlike BFK/FK, which are information-theoretic) — [arXiv 1804.01082](https://arxiv.org/pdf/1804.01082); [IAS](https://ias.edu/node/85276)

**Experiments**
- Barz et al., "Demonstration of Blind Quantum Computing", Science 335:303–308 (20 Jan 2012), Walther group (Univ. Vienna). Photonic, 4 qubits; the client only prepares and sends single photonic qubits; ran one- and two-qubit gates and the Deutsch and Grover algorithms blindly — [Ovid/Science record](https://www.ovid.com/journals/scie/pdf/00007529-201201200-00029~demonstration-of-blind-quantum-computing); [Physics Today](https://physicstoday.aip.org/news/a-blind-quantum-computer-makes-its-laboratory-debut)
- Barz, Fitzsimons, Kashefi, Walther, "Experimental verification of quantum computation" (Nature Physics 2013): the same 4-photon setup, with trap-based verification of a remote computation — [arXiv 1309.0005](https://arxiv.org/pdf/1309.0005); [Univ. Vienna](https://turis.univie.ac.at/publications/details/pure/b524c5e6-3bdc-4a0d-ae9d-3131fd281151/show/publ/Pure)
- Drmota, ..., Lucas (Oxford), "Verifiable blind quantum computing with trapped ions and single photons", PRL 132, 150604 (2024), arXiv:2305.02936. This is the first hybrid matter–photon verifiable BQC. Server: a ⁸⁸Sr⁺ network qubit and a ⁴³Ca⁺ memory qubit, linked by standard fibre to a client-side photonic detection system. Mixed-species gate fidelity 0.961(2); ion–photon entanglement fidelity 0.81(4) after 10 s of storage; leakage quantified at ≲0.03 classical bits per qubit — [arXiv 2305.02936](https://arxiv.org/pdf/2305.02936); [phys.org](https://phys.org/news/2024-04-experimental-quantum-protocol.html); [APS Physics](https://physics.aps.org/articles/pdf/10.1103/Physics.17.85)
- Press framing of the Oxford result was "secure quantum computing from home". An outside expert noted that it is still limited to a small number of qubits — [Computing.co.uk](https://computing.co.uk/news/4196691/oxford-team-claims-secure-quantum-computing-home-breakthrough)
- Polacchi et al., "Experimental verifiable multiclient blind quantum computing", PRL 134, 200603 (published 21 May 2025): first two-client verifiable BQC in a distributed photonic setup. Clients connect by fibre and apply single-qubit transformations sequentially over a linear quantum channel — [Sapienza IRIS PDF](https://iris.uniroma1.it/retrieve/a9817b26-a9ed-4e67-b2d1-b0105b9262c9/Polacchi_Experimental-verifiable-multiclient_2025.pdf)

### Inferences
- **What the guarantee covers:** BQC hides input, algorithm and output from the server (information-theoretically in BFK). It leaks only an upper bound on computation size. Verification (FK traps) detects deviation with high probability. Mahadev's protocol removes the quantum client entirely, but only for verifiability (not blindness by itself) and only under the LWE assumption, at large overhead.
- **Client requirements in practice:** the client needs a quantum link (fibre or photonic channel) and a single-qubit source or detector, plus low-latency classical interaction during the whole computation. That is not something a phone or laptop has. The Oxford "from home" framing refers to a client-side photonic detector box on a fibre, not consumer hardware.
- **Hiding classical AI workloads:** in principle a universal quantum computer can run any classical computation blindly, but the result would be far slower and more expensive than running it classically. There is also no quantum advantage for typical neural-network inference or training, and current blind demos have 1–4 qubits. For confidential classical AI on foreign hardware, the relevant tools are classical: TEEs/confidential GPUs (hardware trust in the vendor, practical today) and FHE (cryptographic, but with large slowdowns). BQC becomes relevant only when the workload itself is quantum *and* the quantum computer is remote, which means it positions as "privacy for future cloud quantum computing", not for AI privacy today. (I found no source proposing BQC for classical AI.)
- **Maturity:** TRL is roughly laboratory proof of principle. There is nothing a small app team can integrate.

### Gaps
- No 2025/2026 Oxford follow-up was found. I also found no commercial BQC offering. Search did not surface the reported Quantinuum or IonQ "blind" cloud services, so I don't know whether they exist.
- I found no quantitative overhead figures for Mahadev-style verification on real hardware.
- No fetched sources were found for classical FHE/TEE performance numbers. The comparison above is qualitative.

## 2. QKD: principles, deployments, limits, security-agency positions

### Takeaway
QKD distributes symmetric keys with eavesdropping detection based on physics. It does not authenticate, needs dedicated fibre or free-space links, and over long distances relies on trusted relays. Real networks exist (China: 4,600 km with 32 trusted relays). The NSA (re-stated Oct 2026), the UK NCSC (Aug 2025) and the joint ANSSI/BSI/NLNCSA/Swedish Armed Forces paper (2024) all prioritise PQC and reject QKD as a general replacement. QKD is irrelevant for normal end users and small app teams.

### Cited Findings
- Chen et al., "An integrated space-to-ground quantum communication network over 4,600 kilometres", Nature (Jan 2021): more than 700 fibre QKD links plus 2 satellite–ground links, about 150 users. The fibre backbone uses 32 trusted relay nodes, and if any one of them is compromised the key may be insecure. Satellite QKD averaged 47.8 kbit/s secret key per typical pass — [PubMed](https://www.pubmed.gov/33408416/); [Physics World](https://physicsworld.com/?p=92514); [USTC](https://en.ustc.edu.cn/info/1007/3182.htm)
- **NSA:** on 1 Oct 2026, in its new PQC Resource Hub, the NSA re-stated its 2020 position. It does not recommend QKD/QC for National Security Systems unless several technical limitations are overcome. The limitations are: (1) no source authentication; (2) special-purpose equipment; (3) trusted relays raise cost and insider risk; (4) security depends on hardware and engineering, not just physics; (5) eavesdropping sensitivity makes DoS easier. The 2026 text adds that environmental drift and degradation can erode certified security — [NSA PQC Resource Hub article](https://www.nsa.gov/Cybersecurity/Post-Quantum-Cryptography-Resource-Hub/Article-Display/Article/4616320/cryptograph-solutions-are-limited-compared-to-quantum-resistant-algorithms/) (primary page returned 403 to my fetcher; content via [PostQuantum.com](https://postquantum.com/quantum-policy/nsa-qkd-guidance-rewrite/), a secondary source)
- **NCSC (UK):** the white paper "Quantum networking technologies" (Aug 2025) names PQC as the primary mitigation. The NCSC does not endorse QKD for any government or military use. QKD should not be solely relied upon and does not count as evidence under the Cyber Assessment Framework. QKD (like any quantum technique) provides no authentication. The NCSC still supports research — [NCSC](https://www.ncsc.gov.uk/paper/quantum-networking-technologies); [NCSC PDF](https://www.ncsc.gov.uk/pdfs/whitepaper/quantum-networking-technologies.pdf). Telecoms firms dispute this stance — [IT Pro](https://www.itpro.com/security/encryption/361581/ncsc-telecoms-quantum-key-distribution)
- **ANSSI / BSI / NLNCSA / Swedish Armed Forces (joint position paper, Jan 2024):** outside niche use cases, QKD is not suitable as a replacement for classical key agreement. The reasons given are distance limits, practical constraints, the need for a pre-shared classical key for authentication, trusted nodes, and immature security proofs and certification. The paper calls for a clear priority on PQC deployment — [ANSSI publication page](https://cyber.gouv.fr/en/publications/jointly-led-international-publications/position-paper-on-quantum-key-distribution/); [AIVD PDF](https://aivd.nl/binaries/aivd_nl/documenten/publicaties/2024/01/26/position-paper-on-quantum-key-distribution/Position+Paper+over+Quantum+Key+Distribution.pdf); [ANSSI summary](https://cyber.gouv.fr/actualites/uses-and-limits-quantum-key-distribution)

### Inferences
- For end users and a small app team, QKD is not an option. It needs dedicated optical links and hardware, it works point-to-point or through trusted nodes, and it still needs classical (PQC) authentication anyway. The only realistic way an app team would meet it is indirectly, through a telecom or government backbone (e.g. the EU EuroQCI), with no change to the app.

### Gaps
- I did not fetch current EuroQCI deployment status or QKD cost figures. Distance limits for unrelayed fibre QKD (typically about 100 km class in commercial systems) were not sourced in this pass.

## 3. Post-quantum cryptography: standards, adoption, what a small team should use

### Takeaway
PQC is the mainstream answer and is already deployed at scale. NIST's FIPS 203 (ML-KEM), 204 (ML-DSA) and 205 (SLH-DSA) were published on 13 Aug 2024, and HQC was selected as a code-based backup KEM in March 2025. Hybrid X25519+ML-KEM-768 is the default in Chrome and Firefox, protects over 50–60% of human TLS traffic to Cloudflare, and is used by Signal (PQXDH plus the 2025 SPQR triple ratchet) and Apple iMessage PQ3. BSI recommends hybrid ML-KEM. For a small team: use TLS 1.3 with X25519MLKEM768 (via up-to-date platforms or CDNs), and for app-level encryption use a vetted hybrid KEM such as libsodium ≥1.0.22 `crypto_kem_*` (X-Wing = ML-KEM-768 + X25519). Do not roll your own.

### Cited Findings
**Standards**
- On 13 Aug 2024, NIST published FIPS 203 (ML-KEM, from CRYSTALS-Kyber), FIPS 204 (ML-DSA, from CRYSTALS-Dilithium) and FIPS 205 (SLH-DSA, from SPHINCS+). FALCON-based FN-DSA is planned as FIPS 206 — [NIST news](https://www.nist.gov/news-events/news/2024/08/announcing-approval-three-federal-information-processing-standards-fips); [NIST CSRC](https://csrc.nist.gov/news/2024/postquantum-cryptography-fips-approved); [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final)
- On 11 Mar 2025, NIST selected HQC (code-based) at the end of Round 4 as a backup KEM with different mathematics from lattice-based ML-KEM; the rationale is in NIST IR 8545. ML-KEM remains the recommended general-purpose KEM. HQC needs more resources. NIST said a draft standard would come in about one year and a final standard in about two years (≈2027) — [NIST news](https://www.nist.gov/news-events/news/2025/03/nist-pqc-standardization-process-hqc-announced-4th-round-selection); [NIST CSRC](https://csrc.nist.gov/news/2025/hqc-announced-as-a-4th-round-selection)

**Messaging**
- Signal PQXDH (Sept 2023) added CRYSTALS-Kyber to the initial X3DH key agreement — [Signal blog](https://signal.org/blog/pqxdh/). Apple classifies this as "Level 2" (PQ only at initial key establishment) — [Apple Security Research](https://security.apple.com/blog/imessage-pq3/)
- Signal SPQR (Sparse Post-Quantum Ratchet, announced 2 Oct 2025) uses ML-KEM-768 in an "ML-KEM Braid" ratchet that runs alongside the Double Ratchet (the "Triple Ratchet"). Keys from both are mixed via a KDF, so an attacker must break both ECDH and ML-KEM. It is designed to handle ML-KEM-768 keys and ciphertexts of more than 1000 bytes each, versus 32 B for ECDH. The protocol was formally analysed and verified with Cryspen, and builds on Eurocrypt 2025 and USENIX Security 2025 papers. It downgrades gracefully for old clients and is planned to become mandatory — [Signal blog SPQR](https://signal.org/blog/spqr/); [PQShield analysis](https://pqshield.com/?p=9081)
- Apple iMessage PQ3 (announced 21 Feb 2024; iOS/iPadOS 17.4, macOS 14.4, watchOS 10.4). Initial keys use Kyber-1024 plus P-256 ECDH; the ratchet uses Kyber-768 roughly every 50 messages and at least every 7 days; signatures are ECDSA P-256; KDF HKDF-SHA384; message encryption AES-CTR-256. Apple calls it "Level 3" (PQ in both initial key establishment and ongoing rekeying) — [Apple Security Research](https://security.apple.com/blog/imessage-pq3/)

**Web/TLS**
- X25519MLKEM768 is the default in Chrome 131+ and Firefox 132+ (desktop) / 145+ (Android); Safari also ships it — [Cloudflare docs](https://developers.cloudflare.com/ssl/post-quantum-cryptography/pqc-support/index.md); [Encryption Consulting (secondary)](https://www.encryptionconsulting.com/pqc-support-in-web-browsers/)
- Cloudflare: a majority of human-initiated traffic was PQ-encrypted by the last week of October 2025 — [Cloudflare blog "State of the post-quantum Internet 2025"](https://blog.cloudflare.com/pq-2025). Over 60% of human TLS traffic used hybrid ML-KEM in 2026 per Cloudflare Radar — [InfoQ, Mar 2026](https://www.infoq.com/news/2026/03/cloudflare-post-quantum-ipsec); live data: [Cloudflare Radar](https://radar.cloudflare.com/post-quantum)
- Origin side (Cloudflare to customer servers) lags: PQ support among origins was only about 0.5% → 12.8% — [Cloudflare blog](https://blog.cloudflare.com/automatic-key-exchange-for-origins/)

**BSI (Germany)**
- TR-02102-1 recommends ML-KEM (FIPS 203), FrodoKEM and Classic McEliece for PQ key establishment, used in hybrid with classical ECDH. Version 2026-01 reportedly sets end dates for classical-only key agreement (end 2030 for the most sensitive use, end 2031 generally) and for classical signatures (2035). Hybrid is a recommendation, not a legal mandate. Note: this rests on secondary sources; check the BSI original — [PostQuantum.com on TR-02102 update](https://postquantum.com/security-pqc/bsi-tr-02102-cryptographic-guideline-update/); [PostQuantum.com BSI deadlines](https://postquantum.com/security-pqc/germany-bsi-pqc-deadlines-2030/); [Fraunhofer AISEC comparison](https://www.aisec.fraunhofer.de/en/spotlights/Competence-Center-PQC/developments-in-pqc.html)

**Libraries for small teams**
- libsodium 1.0.22 introduced `crypto_kem_*`, which uses X-Wing (hybrid ML-KEM-768 + X25519) and "should be the default choice". The raw `crypto_kem_mlkem768_*` is also available but is not hybrid. KEM gives confidentiality only, with no sender authentication; derive keys via a KDF — [libsodium docs: key encapsulation](https://doc.libsodium.org/doc/public-key_cryptography/key_encapsulation); [libsodium docs: ML-KEM768](https://doc.libsodium.org/doc/advanced/ml-kem768)
- Go has `filippo.io/mlkem768` (and ML-KEM in the Go standard library) — [pkg.go.dev](https://pkg.go.dev/filippo.io/mlkem768)

### Inferences
- **Practical guidance for a small app team (Nov 2026):**
  1. Transport: rely on TLS 1.3 with X25519MLKEM768 on current OS, browser or CDN stacks. Enable it on your own origins too, since origin adoption lags.
  2. App-level E2E encryption: hybrid KEM only (libsodium `crypto_kem_*` / X-Wing, or equivalent in BoringSSL, AWS-LC or Go). Better still, reuse a vetted protocol (Signal protocol libraries, MLS) instead of designing one.
  3. Signatures: there is less urgency than for "harvest-now-decrypt-later" on key exchange. ML-DSA is standardised, but ecosystem support (certificates, WebPKI) is still maturing, so plan crypto-agility.
  4. End users: no action beyond keeping browsers, OS and messengers updated. Signal and iMessage are already PQ-hybrid.
- Hybrid (classical + PQ) is the consensus for now, endorsed by BSI and ANSSI and used by Signal, Apple and the browsers. It protects even if ML-KEM turns out weaker than expected.

### Gaps
- I did not verify whether HQC's draft FIPS was published by Nov 2026.
- I did not verify the BSI TR-02102-1 2026-01 text directly (only secondary sources), and found no primary statement on Classic McEliece revisions.
- I did not check libsodium binding availability (e.g. libsodium.js, PyNaCl) for `crypto_kem_*`.

## 4. Positioning vs. classical confidential computing (FHE/TEE) — brief

### Takeaway
Quantum methods do not yet offer a practical way to keep computation private on someone else's machine. Today that need is met classically by TEEs (practical, but you trust the hardware vendor) and FHE (cryptographic, but slow). BQC is the quantum analogue of FHE for quantum workloads, with stronger, information-theoretic guarantees, but it is only lab-scale.

### Cited Findings
- BQC hides input, algorithm and output from the server with only single-qubit preparation on the client side — [arXiv 0807.4154](https://www.arxiv.org/abs/0807.4154)
- Classical verification of quantum computation is possible only under computational (LWE) assumptions — [arXiv 1804.01082](https://arxiv.org/pdf/1804.01082)

### Inferences
- Comparison (qualitative, not sourced in this pass):
  - **TEE (SGX/TDX/SEV-SNP, confidential GPUs):** usable today for AI inference; trust rests on the vendor and is exposed to side channels.
  - **FHE:** no hardware trust; orders of magnitude slower; limited to specific workloads.
  - **BQC:** information-theoretic blindness; needs quantum hardware and links; few qubits; there is no case for classical AI.
  - **QKD:** protects only key transport, not computation.
  - **PQC:** protects data in transit and at rest against future quantum attackers, and is the one quantum-era measure a small team should adopt now.

### Gaps
- I gathered no primary sources for FHE/TEE performance or security claims, so they should be sourced separately if they are used in the report.
