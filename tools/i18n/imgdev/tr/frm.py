T = {}
def X(box, t, f="sans", s=None, **k):
    it = {"box": box, "t": t, "f": f, **k}
    if s: it["s"] = s
    return it
_r = {"a": "l"}
def _R(y0, y1, t): return X([444, y0 - 4, 757, y1 + 4], t, "dvs", smax=11, a="l", bg="#ffffff", c="#2e4a70")
def _L(box, t, f="dvs", s=11, **k): return X(box, t, f, s, a="l", bg="#ffffff", **k)
T["p14_1"] = {**{i: None for i in range(24)}, "x": [
    _R(28, 39, "1. Inscriptio — institution stamp, code"), _R(79, 87, "2. Datum — date"), _R(106, 117, "3. Nomen aegroti — patient's full name, age"),
    _R(152, 160, "4. Nomen medici — physician's full name"), _R(183, 193, "5. Invocatio — Rp.: (Recipe — take)"), _R(204, 214, "6. Designatio materiarum — drug name, dose"),
    _R(225, 236, "7. Subscriptio — dosage form, quantity"), _R(246, 257, "8. Signatura — directions for use (in the state language)"), _R(324, 335, "9. Signum et sigillum medici — signature, seal"),
    _L([39, 24, 240, 40], "Stamp of the medical institution", "dvsi", 10, c="#555555"), _L([292, 23, 322, 39], "Code", s=10),
    X([100, 50, 292, 72], "PRESCRIPTION", "dvsb", 17, bg="#ffffff", c="#1f3864"), _L([136, 80, 184, 98], "20__", s=11),
    {"box": [39, 107, 152, 126], "t": "Patient's full name", "f": "dvs", "smax": 11, "a": "l", "bg": "#ffffff"}, _L([39, 130, 73, 147], "Age"),
    {"box": [39, 153, 165, 172], "t": "Physician's full name", "f": "dvs", "smax": 11, "a": "l", "bg": "#ffffff"},
    _L([175, 187, 203, 207], "0.5", "dvsi", 13), _L([84, 231, 335, 252], "S. Take 1 tablet 3 times a day", "dvsi", 13), _L([96, 252, 300, 273], "after meals.", "dvsi", 13),
    _L([39, 304, 320, 323], "Physician's signature and personal seal"), _L([40, 325, 250, 341], "L.S.  (seal of the institution)", "dvsi", 9, c="#555555")]}
T["p21_2"] = {**{i: None for i in range(7)}, "x": [X([114, 108, 130, 124], "a", s=13, bg="#ffffff"), X([190, 245, 207, 261], "b", s=13, bg="#ffffff"), X([338, 249, 354, 262], "c", s=13, bg="#ffffff")]}
T["p36_8"] = {**{i: None for i in range(25)}, "x": [X([519, 372, 537, 392], "b", "serifi", 15, bg="#ffffff"), X([580, 728, 597, 748], "b", "serifi", 15, bg="#ffffff"),
    X([40, 409, 500, 432], "Infusion apparatus (a) and infundir pot (b)", "sansb", 14, bg="#ffffff"),
    X([4, 782, 756, 806], "Electrically heated infusion apparatus (a) and infundir pot with a magnetic stirrer (b)", "sansb", 14, bg="#ffffff")]}
T["p43_11"] = {"f": "sansb", 0: {"t": "Mouthpiece", **_r}, 4: {"t": "Screen", **_r}, 11: "Piercing\nbutton", 12: "Capsule chamber"}
T["p43_12"] = {"f": "sansb", 0: "Lid", (1, 3): "Dose\ncounter", 2: {"t": "Cartridge", "d": [-22, -2, 26, 2], "s": 20}, 4: "Button", 6: "Control window", (7, 9): "Cartridge\ncover", 8: "Protective\ncap"}
T["p44_13"] = {"f": "sansb", "s": 15, 0: {"t": "Mouthpiece", **_r}, 1: {"t": "Uniblock", "d": [0, 0, 14, 0], **_r}, 4: {"t": "Dosing chamber", **_r}, 5: {"t": "Dose-release button", **_r}, 7: {"t": "Capillary tube", **_r},
               9: {"t": "Outer housing", **_r}, 14: {"t": "Clear base", **_r}, 22: {"t": "Spring", **_r}, 25: {"t": "Cartridge", "d": [0, 0, 40, 0], **_r}}
T["p52_15"] = {**{i: None for i in range(18)}, "x": [X([428, 9, 540, 31], "Absorption", s=17, bg="#ffffff"), X([86, 134, 215, 172], "Tissue", s=32, a="l", bg="#ffffff", c="#1a1a1a"),
    X([520, 135, 636, 165], "PLASMA", s=22, a="r", bg="#ffffff", c="#333333"), X([268, 192, 322, 214], "Depot", s=14, bg="#ffffff"), X([582, 206, 634, 228], "Depot", s=14, bg="#ffffff"),
    X([409, 486, 426, 502], " ", s=6, bg="#ffffff", lines=[[415, 484, 415, 504, "#a04c84", 3], [423, 485, 410, 503, "#6a676b", 2]]),
    {"arc": [409, 595, 98, 89], "band": [84, 112], "span": [168, 10], "t": "Biotransformation", "f": "sans", "s": 15, "sp": 5.5},
    X([346, 606, 484, 646], "Metabolites and\nconjugates", "sansb", 12, bg="#ffffff"), X([98, 624, 304, 664], "Sites of drug action\n(receptors)", "sansb", 12, bg="#ffffff"),
    X([164, 741, 330, 762], "- free drug", "sansb", 15, a="l"), X([164, 765, 360, 787], "- bound drug", "sansb", 15, a="l"), X([164, 789, 345, 812], "- metabolites", "sansb", 15, a="l"),
    X([164, 833, 335, 853], "- conjugates", "sansb", 15, a="l"), X([448, 736, 578, 764], "Excretion", "sansb", 19, bg="#ffffff"),
    X([0, 909, 600, 933], "Fig. II.1. Pharmacokinetics of drugs (diagram).", s=14, a="l", bg="#ffffff")]}
T["p54_16"] = {**{i: None for i in range(28)}, "x": [X([26, 12, 52, 740], "Serum concentration of the drug, mg/l", "sansb", 20, rot=90, bg="#ffffff"),
    X([262, 60, 440, 122], "Maximum\nconcentration", s=22, a="l", bg="#ffffff"), X([196, 703, 400, 738], "Time: hours", "sansb", 27, a="l", bg="#ffffff"),
    X([20, 762, 700, 812], "Fig. II.4. Determination of the bioavailability of a substance after enteral administration (after Kalant et al.).", s=14, a="l", bg="#ffffff")]}
def N(n): return {i: None for i in range(n)}
W = "#ffffff"
T["p56_17"] = {**N(29), "x": [
    X([33, 52, 105, 131], "Glomerulus\nwith capsule", s=14, rot=90, bg=W), X([33, 163, 55, 291], "Proximal tubule", s=14, rot=90, bg=W),
    X([33, 309, 105, 376], "Nephron\nloop (loop\nof Henle)", s=12, rot=90, bg=W), X([32, 409, 57, 531], "Distal tubule", s=15, rot=90, bg=W),
    X([469, 55, 705, 114], "Passive filtration\n(all low-molecular-weight\nsubstances dissolved in plasma)", s=14, a="l", bg=W),
    X([467, 157, 705, 214], "Active reabsorption\n(amino acids, glucose,\nuric acid)", s=13, a="l", bg=W), X([113, 182, 292, 243], "Active secretion\n(strong organic\nacids and bases)", s=13, a="l", bg=W),
    X([467, 315, 705, 356], "Passive reabsorption\n(lipophilic compounds)", s=13, a="l", bg=W), X([109, 334, 282, 375], "Passive excretion\n(lipophilic compounds)", s=13, a="l", bg=W),
    X([300, 556, 394, 573], "Excretion", s=13, bg=W), X([32, 574, 400, 596], "Note: a diagram of the nephron is shown.", s=16, a="l", bg=W),
    X([70, 604, 245, 628], "Active transport", "sansb", 15, a="l", bg=W), X([70, 632, 245, 655], "Passive diffusion", "sansb", 15, a="l", bg=W),
    X([16, 691, 748, 741], "Fig. II.8. Main processes affecting the renal excretion of pharmacological substances (diagram).", s=14, a="l", bg=W)]}
T["p56_18"] = {**N(13), "x": [X([150, 10, 450, 38], "Systemic circulation", "sansb", 17, bg=W), X([213, 150, 333, 175], "Gallbladder", "sansb", 16, bg=W),
    X([20, 250, 88, 275], "Liver", "sansb", 17, a="l"), X([145, 455, 172, 520], "Bile", "sansb", 17, rot=90, bg=W), X([112, 566, 202, 591], "Intestine", "sansb", 17, a="r", bg=W),
    X([222, 687, 320, 711], "Excretion", "sansb", 13, bg=W), X([14, 736, 420, 756], "Fig. II.10. Enterohepatic circulation of substances (diagram).", s=11, a="l", bg=W)]}
T["p57_19"] = {**N(18), "x": [X([520, 27, 730, 42], "Minimum toxic concentration", "dvs", 10, a="r", bg=W, c="#b0703a"), X([130, 76, 270, 95], "Therapeutic window", "dvs", 11, a="l", c="#4f6f3f"),
    X([378, 84, 645, 103], "Steady state (Css) after ≈ 4–5 × t½", "dvs", 11), X([530, 191, 730, 206], "Minimum effective concentration", "dvs", 10, a="r", c="#4f7f3f"),
    X([10, 45, 29, 236], "Plasma concentration", "dvs", 12, rot=90, bg=W), X([220, 289, 580, 311], "Time, h (dose every 8 h, t½ = 8 h)", "dvs", 12, bg=W)]}
_e = {"f": "sansb", "s": 16}
T["p59_20"] = {**N(30), "x": [X([205, 14, 548, 46], "TYPES OF RECEPTORS", "serifb", 24, bg=W, c="#1c1c70"), X([16, 58, 90, 79], "IONS", "serifb", 14, bg=W), X([111, 58, 186, 79], "IONS", "serifb", 14, bg=W),
    {"box": [23, 191, 41, 212], "t": "R", **_e, "c": "#ffffff"}, {"box": [295, 190, 313, 210], "t": "R", **_e, "c": "#222222"}, {"box": [449, 224, 471, 244], "t": "E", **_e, "c": "#222222", "bg": "grad"},
    {"box": [579, 181, 597, 201], "t": "R", **_e, "c": "#222222"}, {"box": [577, 235, 598, 255], "t": "E", **_e, "c": "#222222"}, {"box": [689, 319, 707, 339], "t": "R", **_e, "c": "#ffffff"},
    X([698, 168, 757, 196], "CELL\nMEMBRANE", "serifb", 9), X([410, 292, 508, 323], "SECOND\nMESSENGER", "serifb", 12, a="l", bg=W), X([514, 292, 640, 323], "PROTEIN\nPHOSPHORYLATION", "serifb", 11, a="l", bg=W),
    {"cbox": [655, 304, 36, 14], "ang": 62, "t": " ", "f": "sansb", "s": 6, "bg": "#ffffff"}, {"box": [0, 0, 1, 1], "t": " ", "f": "sans", "s": 6, "bg": "none", "lines": [[674.2, 275.8, 670.8, 277.5, "#1c1c1c", 2], [670.8, 277.5, 667.7, 279.5, "#1c1c1c", 2], [667.7, 279.5, 664.6, 281.7, "#1c1c1c", 2], [664.6, 281.7, 661.7, 284.1, "#1c1c1c", 2], [661.7, 284.1, 659.0, 286.8, "#1c1c1c", 2], [659.0, 286.8, 656.5, 289.6, "#1c1c1c", 2], [656.5, 289.6, 654.2, 292.5, "#1c1c1c", 2], [654.2, 292.5, 652.1, 295.6, "#1c1c1c", 2], [652.1, 295.6, 650.2, 298.9, "#1c1c1c", 2], [650.2, 298.9, 648.6, 302.3, "#1c1c1c", 2], [648.6, 302.3, 647.2, 305.8, "#1c1c1c", 2], [647.2, 305.8, 646.0, 309.3, "#1c1c1c", 2], [646.0, 309.3, 645.1, 313.0, "#1c1c1c", 2], [645.1, 313.0, 644.4, 316.7, "#1c1c1c", 2]]}, {"arc": [698, 325, 43, 150], "band": [44, 44.1], "span": [151, 150], "t": "NUCLEUS", "f": "sansb", "s": 7, "sp": 0.8, "c": "#222222"}, X([672, 349, 724, 375], "mRNA\nsynthesis", "sansb", 9, bg=W),
    X([76, 453, 137, 473], "agonist", s=14, a="l", bg=W), X([146, 453, 159, 473], "R", s=14, bg=W), X([177, 453, 252, 473], "receptor", s=14, a="l", bg=W),
    X([291, 453, 366, 473], "proteins", s=14, a="l", bg=W), X([382, 453, 397, 473], "E", s=14, bg=W), X([415, 453, 512, 473], "enzymes", s=14, a="l", bg=W)]}
T["p60_21"] = {**N(31), "x": [X([60, 7, 370, 25], "a) Potency and efficacy", "dvs", 10, bg=W), X([440, 7, 738, 25], "b) Therapeutic index (quantal curves)", "dvs", 10, bg=W),
    X([81, 30, 234, 42], "A — full agonist (EC50 = 1)", "dvs", 8, a="l"), X([81, 42, 234, 54], "B — lower potency (EC50 = 20)", "dvs", 8, a="l"), X([81, 54, 234, 67], "C — partial agonist (Emax = 55%)", "dvs", 8, a="l"),
    X([455, 30, 582, 42], "Therapeutic effect (ED50 = 4)", "dvs", 8, a="l"), X([455, 42, 582, 54], "Toxic effect (TD50 = 160)", "dvs", 8, a="l"),
    X([8, 95, 24, 195], "Effect, % Emax", "dvs", 9, rot=90, bg=W), X([382, 50, 398, 220], "Patients responding, %", "dvs", 9, rot=90, bg=W),
    X([95, 264, 335, 282], "Dose (concentration), log scale", "dvs", 9, bg=W), X([510, 264, 670, 282], "Dose, log scale", "dvs", 9, bg=W)]}
T["p63_22"] = {**N(34), "x": [X([58, 19, 144, 38], "Anesthetic", "serifb", 14, bg=W), X([246, 3, 362, 38], "Astringent\nagent", "serifb", 14, bg=W), X([408, 0, 506, 37], "Coating\nagent", "serifb", 14, bg=W),
    X([556, 2, 686, 37], "Adsorbent\nagent", "serifb", 14, bg=W),
    *[X([123, int(91 + 17.45 * (i + 1)) + 2, 139, int(91 + 17.45 * (i + 2)) - 2], ch, "sansb", 10, bg=W) for i, ch in enumerate("EPITHELIUM")],
    X([3, 286, 186, 304], "Afferent fibers with", "serifb", 14, a="l", bg=W), X([3, 304, 178, 321], "sensory endings", "serifb", 14, a="l", bg=W), X([218, 310, 375, 331], "Irritant agent", "serifb", 14, a="l", bg=W),
    X([0, 370, 748, 426], "Fig. 1.2. Main direction of action of agents that prevent excitation of sensory nerve endings.", s=16, a="l", bg=W)]}
T["p64_23"] = {**N(42), "x": [X([95, 0, 445, 18], "Chemical structure of some anesthetics", "sansb", 14, bg=W), X([120, 18, 380, 35], "Plant-derived agents", "sansi", 14, bg=W),
    X([150, 35, 350, 52], "Benzoylecgonine ester", s=14, bg=W), X([165, 141, 335, 157], "cocaine hydrochloride", s=14, bg=W), X([160, 157, 335, 173], "Synthetic agents", "sansi", 14, bg=W),
    X([110, 179, 385, 198], "Esters of para-aminobenzoic acid", s=14, bg=W), X([15, 306, 160, 322], "Novocaine (procaine)", s=10, bg=W), X([270, 304, 420, 320], "Dicaine (tetracaine)", s=10, bg=W),
    X([160, 330, 345, 349], "Substituted anilides", "sansi", 14, bg=W), X([75, 462, 165, 477], "Lidocaine", s=10, bg=W), X([330, 460, 430, 475], "Trimecaine", s=10, bg=W)]}
T["p65_24"] = {**N(30), "x": [X([116, 192, 400, 216], "Propagation of excitation", "serifb", 16), X([603, 188, 624, 247], "Axon", "sansb", 12, rot=90, bg=W),
    X([186, 544, 526, 571], "Block of conduction of excitation", "serifb", 16), X([133, 711, 300, 731], "axon membrane", "sansb", 11, a="l", bg=W), X([133, 734, 320, 754], "anesthetic molecule", "sansb", 11, a="l", bg=W),
    X([497, 126, 513, 141], " ", s=6, bg=W, lines=[[508, 134, 508, 153, "#111111", 3], [499, 143, 517, 143, "#111111", 3]]), X([489, 125, 503, 141], "b", "serifi", 11, bg="none", c="#222222"), X([497, 293, 513, 307], " ", s=6, bg=W, lines=[[508, 282, 508, 301, "#111111", 3], [499, 291, 517, 291, "#111111", 3]]), X([489, 294, 503, 310], "b", "serifi", 11, bg="none", c="#222222"), X([37, 371, 59, 393], "B", "sansbi", 16, bg=W),
    X([12, 788, 748, 812], "Fig. 1.1. Effect of anesthetics on the conduction of excitation along a nerve fiber.", s=14, a="l", bg=W)]}
def S(box, t, s=10, f="serifb", **k): return X(box, t, f, s, bg=W, **{"a": "l", **k})
T["p76_25"] = {**N(59), "x": [S([38, 24, 100, 42], "Midbrain"), S([38, 73, 90, 89], "Pons"), S([52, 124, 115, 151], "Medulla\noblongata", a="r"),
    S([32, 204, 62, 276], "Carotid\nsinus", rot=90, a="c"), S([34, 377, 55, 516], "Skeletal muscles", s=11, rot=90, a="c"),
    S([515, 30, 562, 45], "Eye"), S([512, 98, 605, 141], "Lacrimal and\nsalivary\nglands"), S([514, 169, 605, 198], "Trachea and\nbronchi"), S([515, 235, 575, 253], "Heart"),
    S([513, 285, 595, 302], "Arteriole"), S([513, 312, 655, 341], "Liver with bile ducts\nand gallbladder"), S([513, 353, 595, 369], "Stomach"), S([513, 377, 625, 393], "Small intestine"),
    S([514, 397, 655, 428], "Proximal part of\nthe large intestine"), S([515, 443, 655, 471], "Adrenal medulla"), S([514, 479, 625, 519], "Kidney with\nadrenal gland"),
    S([514, 530, 655, 557], "Distal part of\nthe large intestine"), S([516, 579, 605, 596], "Rectum"), S([518, 617, 645, 634], "Urinary bladder"),
    S([246, 692, 445, 707], "– cholinergic neurons"), S([246, 707, 445, 722], "– adrenergic neurons"), S([246, 724, 475, 741], "– sensory (afferent) neurons"),
    X([28, 765, 754, 813], "Fig. 3.1. General scheme of cholinergic and adrenergic innervation. C, Th, L, S — segments of the spinal cord.", s=14, a="l", bg=W)]}
def D(box, t, s=10, f="dv", **k): return X(box, t, f, s, bg=W, c="#333333", **k)
T["p77_26"] = {**N(26), "x": [D([98, 45, 181, 60], "Mitochondrion", a="r"), D([232, 44, 262, 58], "CoA", f="dvb", a="l"), D([150, 76, 197, 90], "AcCoA"), D([198, 70, 228, 84], "ChAT", s=9),
    D([154, 94, 198, 108], "choline"), D([244, 87, 270, 100], "ACh"), D([132, 147, 171, 161], "Choline", s=9, a="r"), D([25, 156, 55, 170], "blood", s=9), D([84, 174, 131, 187], "Acetate"),
    D([142, 167, 195, 191], "Acetic\nacid"), D([369, 146, 498, 160], "Cholinergic receptors", a="l"), X([132, 223, 348, 245], "E n d   p l a t e", "dv", 10, c="#333333"),
    X([150, 246, 332, 263], "S k e l e t a l   m u s c l e", "dv", 10, c="#333333"), D([486, 222, 516, 237], "1 mV", a="l"),
    D([225, 378, 240, 415], "Nerve", rot=90), D([250, 357, 266, 423], "impulses", rot=90), D([2, 438, 76, 467], "Presynaptic\nmembrane", a="l"), D([22, 524, 101, 553], "Postsynaptic\nmembrane", a="l"),
    D([483, 553, 531, 568], "−90 mV", s=9), D([378, 584, 446, 611], "Nerve\nimpulses")]}
T["p77_27"] = {**N(51), "x": [D([258, 6, 334, 35], "Anionic\nsite"), D([416, 5, 498, 34], "Esteratic\nsite"), D([40, 54, 205, 83], "Schematic structure of\nacetylcholinesterase", a="l"),
    D([348, 45, 392, 61], "Protein"), D([55, 287, 170, 303], "Acetylcholine"), D([30, 447, 170, 462], "Proserine (neostigmine)"), D([65, 570, 155, 587], "Edrophonium"),
    D([88, 694, 122, 710], "DFP"), D([240, 705, 345, 722], "Hydrophobic part", a="l"), D([237, 737, 455, 754], "Bond that undergoes hydrolysis", a="l")]}
T["p94_28"] = {**N(22), "x": [X([25, 17, 535, 38], "Chemical structure of some N-cholinomimetics", "sansb", 13, bg=W), X([95, 43, 435, 62], "Plant-derived compounds (alkaloids)", "sansi", 12, bg=W),
    X([165, 65, 350, 81], "Tertiary amines", s=12, bg=W), X([78, 165, 148, 180], "Nicotine", s=10, bg=W), X([312, 166, 458, 184], "Lobeline hydrochloride", s=10, bg=W),
    X([165, 202, 310, 219], "Secondary amines", s=12, bg=W), X([222, 300, 288, 315], "Cytisine", s=10, bg=W)]}
T["p96_29"] = {**N(28), "x": [X([8, 17, 416, 38], "Chemical structure of some ganglionic blockers", "sansb", 13, bg=W), X([55, 38, 355, 56], "Bis-quaternary ammonium compounds", "serifi", 13, bg=W),
    X([125, 84, 255, 102], "Benzohexonium", "serif", 12, bg=W), X([160, 152, 260, 168], "Pentamine", "serif", 12, bg=W), X([155, 247, 255, 264], "Hygronium", "serif", 12, bg=W),
    X([125, 263, 290, 281], "Tertiary amines", "serifi", 13, bg=W), X([160, 379, 250, 396], "Pirilene", "serif", 12, bg=W)]}
def R(box, t, s=11, f="serif", **k): return X(box, t, f, s, bg=W, **k)
T["p98_30"] = {**N(39), "x": [R([167, 106, 183, 142], "Nerve", rot=90), R([191, 102, 207, 151], "impulse", rot=90), R([167, 409, 183, 445], "Nerve", rot=90), R([191, 405, 207, 453], "impulse", rot=90),
    R([348, 242, 403, 258], "Agent"), R([404, 240, 487, 258], "Nerve impulse"), R([487, 187, 531, 203], "−90 mV", s=10), R([483, 452, 535, 467], "−90 mV", s=10),
    R([364, 505, 419, 521], "Agent"), R([430, 507, 522, 525], "Nerve impulse"), R([447, 549, 592, 567], "Acetylcholine", a="l"), R([447, 567, 592, 597], "Acetylcholine hydrolysis\nproducts", a="l"),
    R([446, 597, 592, 612], "Acetylcholinesterase", a="l"), R([446, 613, 592, 631], "Cholinergic receptor", a="l"), R([446, 637, 592, 655], "Curare-like agents", a="l")]}
T["p98_31"] = {**N(75), "x": [R([55, 4, 485, 25], "Chemical structure of some curare-like compounds", 13, "serifb"), R([145, 27, 385, 43], "Quaternary ammonium compounds"), R([145, 44, 385, 61], "Plant-derived agents", f="serifi"),
    R([190, 232, 340, 250], "Tubocurarine chloride"), R([180, 256, 320, 272], "Synthetic agents", f="serifi"), R([285, 371, 385, 388], "Pancuronium"), R([293, 522, 397, 541], "Pipecuronium"),
    R([195, 730, 290, 747], "Atracurium"), R([170, 807, 320, 823], "Ditilin (suxamethonium)")]}
def G(box, t, s=11, **k): return X(box, t, "sans", s, c="#444444", **{"a": "l", "bg": W, **k})
T["p109_32"] = {**N(23), "x": [G([403, 75, 512, 108], "Sympathetic\nganglion"), G([516, 162, 613, 194], "Effector\ncell"), G([228, 239, 408, 260], "Varicosity", 13, a="c"), G([442, 246, 508, 265], "Tyrosine"),
    G([388, 291, 433, 308], "DOPA"), G([357, 330, 432, 349], "Dopamine"), G([27, 348, 167, 385], "Adrenergic\nfiber", 13, a="c"), G([204, 388, 241, 405], "MAO", a="c", bg=None),
    G([22, 443, 158, 476], "Deaminated\nmetabolites", a="c"), G([178, 443, 228, 460], "PreAR", 10, a="c", bg=None), G([2, 499, 102, 548], "O-methylated\nmetabolites"),
    G([506, 500, 613, 557], "Catecholamines\nentering from\nthe blood"), G([200, 580, 345, 601], "Adrenoceptors", 12, a="c", bg=None), G([53, 595, 100, 612], "COMT", a="c", bg=None),
    G([492, 605, 538, 622], "COMT", a="c", bg=None), G([188, 614, 358, 636], "Effector cell", 13, a="c")]}
for _n in ("p109_32",):
    for _i in T[_n]["x"]:
        if _i.get("bg", 1) is None: _i.pop("bg")
def A(ctr, rt, mid, band, span, t, s=12, **k):
    return {"arc": [ctr[0], ctr[1], rt, mid], "band": band, "span": span, "t": t, **{"f": "sans", "s": s, "fill": True, "c": "#1a1a1a", **k}}
_cl, _cr = (154, 344), (595, 345)
T["p158_39"] = {**N(19), "x": [X([160, 99, 258, 116], "Mast cell", s=11, bg=W), X([514, 99, 594, 118], "Bronchiole", s=11, bg=W), X([302, 180, 454, 196], "Adrenomimetics", s=14, bg=W),
    X([304, 203, 455, 265], "Salbutamol (β₂)\nIsoprenaline (β₁, β₂)\nEpinephrine (α, β₁, β₂)\nEphedrine (α, β₁, β₂)", "dv", 10, a="l", bg=W, c="#b03080"),
    X([124, 263, 167, 282], "cAMP", s=12, a="r", bg=W, c="#b03080"), X([91, 380, 135, 398], "cAMP", s=12, a="r", bg=W), X([55, 349, 110, 369], "5′-AMP", s=12, bg=W), X([200, 349, 236, 369], "ATP", s=12, bg=W),
    X([132, 447, 184, 463], "Granules", s=10, bg=W), X([126, 494, 198, 526], "Histamine\nSRS-A", s=12, bg=W), X([24, 547, 167, 569], "M-cholinergic blockers", s=12, bg=W),
    X([582, 547, 725, 569], "M-cholinergic blockers", s=12, bg=W), X([570, 264, 614, 283], "cAMP", s=12, a="r", bg=W, c="#b03080"), X([589, 393, 632, 412], "cAMP", s=12, a="r", bg=W),
    X([508, 350, 543, 369], "ATP", s=12, bg=W), X([633, 350, 688, 369], "5′-AMP", s=12, bg=W),
    {"cbox": [370, 456, 168, 16], "ang": 13, "t": "Spasmogenic action", "f": "sans", "s": 12, "bg": "#ffffff"},
    {"cbox": [65, 168, 66, 15], "ang": -61, "t": "Allergen", "f": "sans", "s": 12, "bg": "#ffffff"},
    {"cbox": [74, 310, 64, 28], "ang": 66, "t": "Phosphodi-\nesterase", "f": "sans", "s": 12, "bg": "#ffffff"},
    {"cbox": [668, 302, 66, 28], "ang": -58, "t": "Phosphodi-\nesterase", "f": "sans", "s": 12, "bg": "#ffffff"},
    A(_cl, 125, 34, [116, 134], [66, 0], "β-adrenoreceptor", 11, f="dv"), A(_cl, 103, 34, [95, 111], [68, -1], "Adenylate cyclase", 11, lines=[[290, 288, 230, 319, "#c0307f", 2]]),
    A(_cl, 106, 225, [98, 114], [254, 196], "Adenylate cyclase", 10, ccw=True), A(_cl, 127, 225, [119, 135], [253, 198], "M-cholinoreceptor", 11, ccw=True, c="#ffffff"),
    A(_cr, 126, 148, [117, 135], [180, 116], "β₂-adrenoreceptor", 11, f="dv"), A(_cr, 104, 147, [96, 112], [181, 113], "Adenylate cyclase", 11, lines=[[449, 287, 521, 319, "#c0307f", 2]]),
    A(_cr, 105, 314, [97, 113], [342, 286], "Adenylate cyclase", 10, ccw=True), A(_cr, 127, 314, [119, 135], [341, 287], "M-cholinoreceptor", 11, ccw=True, c="#ffffff"),
    X([561, 325, 577, 368], "Spasm", s=12, rot=90, c="#7a1a00"), A((592.7, 346.7), 31, 4, [25, 37], [82, -74], "Relaxation", 11, c="#7a1a00", bg="#e68a12")]}
def Z(box, t, s=10, f="sans", **k): return X(box, t, f, s, **k)
T["p109_33"] = {**N(13), "x": [Z([392, 0, 472, 27], "Varicosity", a="l", bg=W), Z([249, 31, 273, 48], "NE", f="sansb", c="#ffffff"), Z([249, 197, 273, 214], "NE", f="sansb", c="#ffffff"),
    Z([84, 210, 120, 227], "EPI", f="sansb", c="#ffffff"), Z([406, 210, 442, 227], "EPI", f="sansb", c="#ffffff"), Z([33, 172, 142, 190], "Vascular bed", bg=W), Z([391, 172, 500, 190], "Vascular bed", bg=W),
    Z([200, 301, 326, 326], "Postsynaptic\nmembrane")]}
T["p113_34"] = {**N(22), "x": [Z([215, 204, 325, 244], "Varicosity", 14, bg=W), Z([440, 322, 515, 362], "Nerve\nimpulse", 14), Z([262, 350, 281, 366], "NE", 13), Z([259, 468, 281, 486], "NE", 13, bg=W),
    Z([6, 398, 130, 414], "Phentolamine", 13), Z([6, 418, 130, 435], "Tropaphen", 13), Z([6, 474, 98, 493], "Prazosin", 13), Z([185, 634, 355, 658], "Effector cell", 14, bg=W)]}
T["p132_36"] = {**N(14), "x": [Z([430, 66, 512, 102], "Nerve\nending", 13, bg=W), Z([50, 134, 160, 156], "Flumazenil", 13, bg="grad"), Z([322, 155, 372, 174], "GABA", 12, f="sansb"),
    Z([62, 208, 92, 229], "BZ", 13, bg="grad"), Z([58, 339, 141, 378], "Neuronal\nmembrane", 13, bg=W), Z([286, 339, 364, 381], "GABA-A\nreceptor", 13), Z([105, 427, 237, 465], "Allosteric\nsite", 13, bg=W)]}
def Cc(box, t, s=9, **k): return X(box, t, "serifb", s, **{"a": "l", **k})
T["p144_37"] = {**N(36), "x": [Cc([43, 11, 170, 40], "SEROTONERGIC\nNEURON", 10, bg=W), Cc([580, 27, 752, 47], "ADRENERGIC NEURON", 11, bg=W, a="r"), Cc([308, 20, 444, 35], "MAO INHIBITORS"),
    Cc([310, 41, 444, 96], "1. NONSELECTIVE\n(NIALAMIDE,\nTRANYLCYPROMINE)\n2. MAO-A INHIBITORS\n(MOCLOBEMIDE)", 8), Cc([0, 101, 110, 117], "METABOLITES", 10, a="r", bg=W),
    Z([188, 101, 222, 117], "MAO", 11), Z([530, 100, 563, 116], "MAO", 11), Cc([643, 100, 758, 116], "METABOLITES", 10, bg=W), Z([38, 136, 110, 156], "Serotonin", 12, bg=W), Z([626, 135, 737, 154], "Norepinephrine", 12, bg=W),
    Cc([19, 239, 132, 311], "INHIBITORS OF\nNEURONAL\nREUPTAKE OF\nSEROTONIN\n(FLUOXETINE)", 10), Cc([610, 233, 724, 303], "INHIBITORS OF\nNEURONAL\nREUPTAKE OF\nNOREPINEPHRINE\n(MAPROTILINE)", 9),
    Cc([308, 258, 465, 323], "INHIBITORS OF NEURONAL\nREUPTAKE OF NOREPINEPHRINE\nAND SEROTONIN —\nTRICYCLIC ANTIDEPRESSANTS\n(IMIPRAMINE, AMITRIPTYLINE)", 8),
    Cc([158, 384, 258, 412], "SEROTONIN\nRECEPTORS", 9, a="c"), Cc([483, 379, 618, 395], "ADRENOCEPTORS", 9, a="c", bg=W), Cc([275, 432, 483, 448], "POSTSYNAPTIC NEURONS", 10, a="c", bg=W)]}
T["p154_38"] = {**N(27), "x": [Z([225, 6, 348, 23], "Medulla oblongata", bg=W), Z([76, 26, 168, 100], "Respiratory\nstimulants of\ncentral action\n(analeptics)", 11, a="l"),
    Z([381, 40, 497, 99], "Antitussives\nof central\naction", 11, a="l"), Z([40, 133, 98, 163], "Carotid\nsinus", bg=W), Z([20, 198, 115, 285], "Respiratory\nstimulants of\nreflex action\n(N-cholino-\nmimetics)", 11, a="l"),
    Z([401, 185, 516, 244], "Antitussives\nof peripheral\naction", 11, a="l"), Z([410, 395, 512, 454], "Expectorants\nof direct\naction", 11, a="l"), Z([388, 521, 490, 580], "Expectorants\nof reflex\naction", 11, a="l"),
    {"cbox": [307, 587, 52, 13], "ang": 20, "t": "Stomach", "f": "sansi", "s": 10, "bg": "#ffffff"}, Z([240, 609, 400, 624], "afferent fibers", a="l", bg=W), Z([240, 624, 400, 639], "cholinergic fibers", a="l", bg=W)]}
T["p169_40"] = {**N(18), "x": [Z([486, 84, 530, 101], "SA node", 9, bg=W), Z([486, 186, 530, 204], "Atrium", 9, bg=W), Z([486, 293, 530, 325], "AV\nnode", 9, bg=W), Z([412, 634, 498, 667], "Action\npotentials", bg=W), Z([333, 729, 362, 745], "ECG", bg=W)]}
T["p170_41"] = {**N(19), "x": [Z([487, 22, 503, 40], "b", 11, "sansbi", bg=W), Z([85, 268, 101, 286], "c", 11, "sansbi", bg=W), Z([487, 268, 503, 286], "d", 11, "sansbi", bg=W),
    Z([197, 35, 320, 56], "Purkinje fiber", 11, a="l", bg=W), Z([254, 100, 356, 135], "Ventricular\nmyofibril", 11, a="l", bg=W), Z([110, 200, 185, 219], "Normal", 11, bg=W),
    Z([588, 4, 708, 53], "Block of conduction\nof orthodromic\nstimuli", 11, a="l", bg=W), Z([604, 62, 758, 96], "Zone of functional\nblock", 11, a="l", bg=W), Z([646, 97, 742, 132], "Slowed\nconduction", 11, a="l", bg=W),
    Z([462, 199, 638, 235], "Unidirectional block\n(arrhythmia develops)", 11, bg=W), Z([211, 278, 380, 313], "Block of conduction of ortho-\nand antidromic stimuli", 11, a="l", bg=W),
    Z([45, 438, 250, 472], "Bidirectional block\n(under the influence of quinidine)", 11, bg=W), Z([440, 437, 655, 472], "Facilitated conduction\n(under the influence of isoprenaline)", 11, bg=W)]}
def Zb(box, t, **k): return X(box, t, 'sansb', 10, c='#222222', **k)
T["p171_42"] = {**N(21), "x": [Zb([295, 100, 317, 115], "SA", bg=W), Zb([323, 153, 344, 168], "AV"), Zb([395, 217, 418, 235], "HB", bg=W), Zb([400, 245, 423, 263], "PF", bg=W),
    Zb([26, 222, 113, 286], "In supra-\nventricular and\nventricular\narrhythmias", a="l", bg=W), Zb([126, 200, 194, 246], "Quinidine-\nlike\nagents", a="l", bg=W), Zb([126, 252, 194, 281], "β-Blockers", a="l", bg=W),
    Zb([126, 289, 194, 308], "Amiodarone", a="l", bg=W), Zb([522, 185, 595, 219], "Cardiac\nglycosides", a="r", bg=W), Zb([522, 232, 595, 252], "Verapamil", a="r", bg=W),
    Zb([606, 194, 702, 244], "In supra-\nventricular\narrhythmias", a="l", bg=W), Zb([531, 271, 595, 289], "Lidocaine", a="r", bg=W), Zb([531, 313, 595, 334], "Phenytoin", a="r", bg=W),
    Zb([606, 278, 702, 327], "In ventricular\narrhythmias", a="l", bg=W)]}
