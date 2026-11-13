T = {}
W = "#ffffff"
def X(box, t, f="sans", s=None, **k):
    it = {"box": box, "t": t, "f": f, **k}
    if s: it["s"] = s
    return it
def N(n): return {i: None for i in range(n)}
def E(box, **k): return X(box, " ", s=6, **k)
def S(box, t, s=12, f="serif", **k): return X(box, t, f, s, **{"bg": W, "c": "#222222", **k})
T["p35_19"] = {**N(40), "x": [S([20, 336, 76, 374], "Fetus\n2 mo"), S([110, 336, 166, 374], "Fetus\n5 mo"), S([182, 336, 264, 374], "Newborn"), S([268, 336, 328, 357], "2 years"), S([350, 336, 406, 357], "6 years"),
    S([424, 336, 486, 357], "12 years"), S([502, 336, 564, 357], "18 years")]}
def Si(box, t, s=11, **k): return S(box, t, s, "serifi", **k)
T["p55_24"] = {**N(11), "x": [Si([28, 180, 102, 203], "ga, goo, aa"), Si([178, 174, 272, 211], "mama, papa,\nbaba", a="l"), Si([316, 173, 442, 212], "give, no, I won't,\ngo, etc.", a="l"), Si([468, 175, 562, 209], "let's go\nfor a walk"),
    S([221, 229, 236, 246], "b"), S([381, 230, 395, 246], "c"), S([527, 230, 541, 246], "d"), S([187, 280, 202, 298], "b"), S([327, 281, 341, 298], "c"), S([445, 281, 459, 298], "d"),
    S([20, 499, 35, 517], "e"), S([214, 499, 229, 517], "f"), S([409, 499, 426, 517], "g")]}
T["p111_107"] = {**N(20), "x": [S([168, 5, 182, 22], "b"), S([50, 48, 122, 66], "6–8 months", 11), S([48, 94, 124, 112], "8–12 months", 11), S([44, 160, 128, 179], "12–16 months", 11),
    S([44, 234, 128, 253], "16–20 months", 11), S([44, 320, 128, 339], "20–30 months", 11), S([194, 82, 262, 101], "5–7 years", 11), S([194, 173, 262, 192], "8–9 years", 11),
    S([192, 261, 264, 280], "9–10 years", 11), S([190, 349, 266, 368], "10–13 years", 11), S([190, 449, 266, 468], "12–13 years", 11)]}
T["p116_119"] = {**N(19), "x": [S([248, 2, 345, 42], "Internal\nrotation", 13, a="l"), S([493, 2, 582, 42], "External\nrotation", 13, a="l"), S([311, 386, 327, 404], "b", 13)]}
def G(box, t, s=13, **k): return X(box, t, "sans", s, **{"c": "#222222", "bg": "ring", **k})
T["p135_136"] = {**N(18), "x": [G([76, 32, 182, 74], "Birth of\nthe child"), G([262, 38, 380, 86], "Rise in\npCO₂"), G([510, 28, 660, 106], "Stimulation of\nchemoreceptors of the\naorta and carotid artery", 12),
    G([70, 150, 190, 196], "Clamping of\nthe cord"), G([459, 148, 541, 196], "Respiratory\ncenter", 12), G([596, 144, 694, 200], "Muscle tone\ncenters"), G([256, 158, 388, 240], "Entry of air\ninto the\nairways"),
    G([70, 254, 192, 278], "Surfactant"), G([476, 258, 678, 320], "Convulsive contraction\nof the diaphragm\nand skeletal muscles"), G([198, 306, 328, 344], "Expansion of\nthe lung"),
    G([370, 362, 550, 402], "Absorption of\nlung fluid")]}
def Gv(box, t, s=13, **k): return G(box, t, s, rot=90, **k)
def Gc(box, t, col, s=13, **k):
    it = G(box, t, s, rot=90, col=col, **k); it.pop("bg", None); return it
def Gh(box, t, col, s=13):
    it = G(box, t, s, col=col); it.pop("bg", None); return it
T["p154_144"] = {**N(13), "x": [Gc([89, 120, 119, 380], "Total lung capacity", 84), Gc([133, 148, 157, 212], "VC", 129), Gc([175, 82, 212, 244], "Inspiratory\ncapacity", 260), Gc([224, 76, 257, 214], "Inspiratory reserve", 260),
    Gc([224, 268, 257, 302], "TV", 260), Gc([223, 320, 258, 386], "Expiratory\nreserve", 260, 12), Gc([175, 326, 212, 504], "Functional\nresidual capacity", 260), Gc([130, 404, 165, 504], "Residual\nvolume", 168),
    Gc([223, 404, 258, 504], "Residual\nvolume", 260), Gh([574, 22, 726, 68], "Maximal\ninspiration", 735), Gh([570, 454, 720, 500], "Maximal\nexpiration", 735)]}
def F(box, t, a="l", s=10, **k): return X(box, t, "serif", s, **{"a": a, "c": "#222222", **k})
T["p175_153"] = {**N(41), "x": [F([20, 18, 66, 36], "Aorta"), F([20, 73, 70, 90], "Lung"), F([20, 150, 88, 186], "Pulmonary\nartery"), F([20, 226, 104, 262], "Right\natrium"),
    F([20, 301, 104, 335], "Hepatic\nvein"), F([20, 376, 90, 410], "Portal\nvein"), F([20, 451, 92, 486], "Umbilical\nvein"),
    F([436, 18, 566, 91], "Ductus arteriosus\n(between the\npulmonary artery\nand the aorta)", "r"), F([496, 130, 566, 167], "Pulmonary\nvessels", "r"), F([488, 187, 566, 224], "Left\natrium", "r"),
    F([492, 243, 566, 299], "Ductus\nvenosus\n(of Arantius)", "r"), F([492, 319, 567, 353], "Inferior\nvena cava", "r"), F([480, 394, 566, 430], "Descending\naorta", "r"),
    F([502, 469, 567, 506], "Umbilical\narteries", "r"), E([496, 470, 504, 484], bg=W)]}
T["p175_154"] = {**N(40), "x": [F([19, 19, 60, 37], "Aorta"), F([18, 75, 74, 112], "Pulmonary\nartery"), F([19, 150, 82, 186], "Right\natrium"), F([20, 225, 92, 260], "Hepatic\nvein"),
    F([20, 300, 80, 335], "Portal\nvein"), F([18, 376, 76, 429], "Round\nligament\nof the liver"), F([500, 113, 562, 128], "Lung", "r"), F([500, 169, 563, 204], "Pulmonary\nvessels", "r"),
    F([486, 244, 563, 281], "Left\natrium", "r"), F([482, 319, 563, 372], "Ligamentum\nvenosum\n(of Arantius)", "r"), F([490, 394, 563, 429], "Inferior\nvena cava", "r"),
    F([478, 470, 563, 506], "Descending\naorta", "r"), E([72, 78, 84, 91], bg=W), E([77, 168, 98, 188], bg=W), E([91, 228, 103, 241], bg=W), E([76, 312, 87, 330], bg=W)]}
def Sm(box, t, s=11, **k): return X(box, t, "serif", s, **{"c": "#222222", "bg": W, **k})
T["p202_175"] = {**N(21), "x": [Sm([158, 19, 175, 36], "b"), Sm([199, 19, 215, 36], "c"), Sm([239, 19, 254, 36], "d"), Sm([317, 19, 334, 36], "e"), Sm([383, 19, 399, 36], "f"),
    Sm([140, 190, 260, 207], "Heart sounds"), Sm([120, 270, 280, 287], "“Innocent murmur”"), Sm([130, 354, 270, 384], "Mitral\ninsufficiency"), Sm([140, 432, 260, 462], "Aortic\nstenosis"),
    Sm([96, 510, 300, 541], "Ventricular septal\ndefect"), Sm([110, 592, 290, 607], "Pulmonary stenosis"), Sm([96, 662, 306, 678], "Aortic insufficiency"), Sm([86, 733, 316, 750], "Patent ductus arteriosus")]}
def R(box, t, a="l", s=None, f="serif", **k):
    it = X(box, t, f, s, **{"a": a, "c": "#222222", "bg": W, **k})
    if not s: it["smax"] = 13
    return it
T["p216_177"] = {**N(43), "x": [R([430, 23, 590, 42], "Coarctation of the aorta", "r", f="serifb"), R([468, 62, 590, 100], "Site of aortic\nnarrowing", "r"), R([470, 123, 590, 160], "Ductus\narteriosus", "r"),
    R([10, 123, 138, 182], "Ventricular\nseptal\ndefect"), R([10, 282, 118, 341], "Patent\nductus\narteriosus"), R([468, 262, 590, 300], "Aortic valve\nstenosis", "r"),
    R([440, 401, 592, 420], "Tetralogy of Fallot", "r", f="serifb"), R([10, 422, 138, 460], "Pulmonary valve\nstenosis"), R([460, 441, 592, 479], "Pulmonary\nstenosis", "r"),
    R([458, 501, 592, 559], "Ventricular\nseptal\ndefect", "r"), R([424, 600, 592, 639], "Transposition of the aorta\nand pulmonary artery", "r", f="serifb"),
    R([10, 661, 134, 719], "Atrial\nseptal\ndefect"), R([470, 660, 592, 678], "Pulmonary artery", "r"), R([548, 701, 592, 718], "Aorta", "r")]}
T["p229_179"] = {**N(17), "x": [R([452, 261, 548, 294], "Weeks of\ngestation", "c"), R([36, 562, 126, 597], "yolk\nsac", "c"), R([170, 600, 236, 618], "liver", "c"),
    R([296, 719, 424, 737], "long bone", "c"), R([440, 719, 552, 737], "flat bone", "c")]}
def Hm(box, t, s=7): return X(box, t, "serif", s, c="#222222", bg=W, pad=0)
T["p229_180"] = {**N(59), "x": [Hm([194, 58, 312, 73], "Stem cell", 10), Hm([294, 168, 462, 199], "Myeloid progenitor\ncell", 10), Hm([14, 286, 78, 299], "Lymphoblast"), Hm([88, 286, 144, 298], "Monoblast"),
    Hm([158, 280, 228, 308], "Basophilic\nblast"), Hm([236, 280, 294, 308], "Eosinophilic\nblast"), Hm([306, 289, 374, 301], "Myeloblast"), Hm([380, 290, 446, 302], "Erythroblast"),
    Hm([452, 289, 536, 303], "Megakaryoblast"), Hm([10, 357, 82, 370], "Prolymphocyte"), Hm([88, 357, 152, 370], "Promonocyte"), Hm([234, 366, 292, 390], "Promyelo-\ncytes"),
    Hm([382, 366, 456, 379], "Pronormocyte"), Hm([462, 363, 556, 376], "Promegakaryocyte"), Hm([236, 450, 296, 462], "Myelocytes"), Hm([388, 442, 460, 473], "Basophilic\nnormocyte"),
    Hm([228, 526, 306, 540], "Metamyelocytes"), Hm([368, 521, 480, 547], "Polychromatophilic\nnormocyte"), Hm([482, 542, 558, 556], "Megakaryocyte"), Hm([386, 604, 460, 628], "Orthochromatic\nnormocyte"),
    Hm([224, 613, 312, 628], "Band neutrophils"), Hm([392, 673, 458, 688], "Reticulocyte"), Hm([308, 690, 400, 716], "Segmented\nneutrophil"), Hm([26, 689, 82, 703], "Lymphocyte"),
    Hm([94, 689, 144, 703], "Monocyte"), Hm([168, 689, 216, 703], "Basophil"), Hm([238, 689, 292, 703], "Eosinophil"), Hm([488, 706, 556, 720], "Platelets"), Hm([396, 753, 454, 768], "Erythrocyte")]}
T["p231_181"] = {**N(17), "x": [R([130, 264, 200, 280], "4–5 days", "c", 11), R([455, 263, 497, 279], "5 years", "c", 11), R([324, 293, 420, 310], "lymphocytes", s=11), R([324, 318, 420, 335], "neutrophils", s=11)]}
T["p233_182"] = {**N(12), "x": [R([64, 341, 104, 358], "No. 1", "c", 11), R([123, 341, 166, 359], "No. 2", "c", 11), R([183, 341, 225, 358], "No. 3", "c", 11)]}
T["p256_193"] = {**N(10), "x": [X([52, 152, 114, 170], "1.5–2 cm", "serif", 10, c="#222222"), X([228, 157, 262, 173], "1 cm", "serif", 10, c="#222222"),
    R([262, 206, 278, 224], "b", "c", 13), R([459, 206, 476, 224], "c", "c", 13)]}
def Ru(box, t, s=11, a="c", **k): return X(box, t, k.pop("f", "serif"), s, **{"a": a, "c": "#222222", "bg": W, **k})
T["p301_222"] = {**N(30), "x": [Ru([212, 9, 272, 26], "Antigen"), Ru([40, 36, 150, 68], "Peptide\npresentation"), Ru([146, 91, 226, 109], "MACROPHAGE", 10, f="serifb", bg="ring", c="#3a1a10"),
    Ru([420, 90, 498, 124], "Incomplete\nantigen"), Ru([338, 129, 430, 147], "Recognition"), Ru([46, 236, 176, 268], "T lymphocyte (CD8)\ncytotoxic"), Ru([228, 230, 336, 250], "T helper (CD4)"),
    Ru([414, 221, 506, 242], "B lymphocyte"), Ru([160, 278, 254, 297], "T lymphocytes"), Ru([54, 316, 172, 336], "Cytotoxicity"), Ru([242, 326, 320, 345], "Cytokines"),
    Ru([358, 343, 510, 362], "Plasma cell"), Ru([236, 390, 328, 421], "Chronic\ninflammation"), Ru([400, 393, 470, 411], "Antibodies")]}
T["p302_223"] = {**N(30), "x": [Ru([6, 33, 176, 52], "Receptor for antigen", 13, "l"), Ru([278, 38, 384, 57], "IgG molecule", 13), Ru([466, 205, 578, 227], "Light chain L", 13, "l"),
    Ru([456, 281, 578, 302], "Heavy chain H", 13, "l"), Ru([204, 391, 314, 410], "IgM molecule", 13),
    Ru([4, 68, 48, 200], "Fab fragment\n(variable)", 13, rot=90), Ru([4, 220, 48, 336], "Fc fragment\n(constant)", 13, rot=90)]}
T["p199_174"] = {**N(16), "x": [Ru([90, 451, 168, 468], "III, inspiration", 10, "l", bg="ring"), Ru([54, 475, 68, 492], "b", 13, bg="ring")]}
_MAP = {"б": "b", "в": "c", "г": "d", "д": "e", "е": "f", "ж": "g", "з": "h"}
_PL = [("p20_7", [287, 448, 293, 457], "б"), ("p20_7", [484, 450, 488, 456], "в"), ("p60_37", [406, 250, 414, 264], "б"), ("p107_99", [271, 125, 277, 135], "б"), ("p107_99", [272, 205, 276, 212], "в"),
    ("p107_100", [474, 106, 480, 115], "б"), ("p107_100", [554, 109, 559, 115], "в"), ("p108_102", [5, 211, 11, 221], "б"), ("p108_103", [8, 239, 13, 246], "в"), ("p100_97", [6, 330, 12, 340], "б"),
    ("p116_116", [5, 200, 11, 209], "б"), ("p116_117", [310, 259, 316, 268], "б"), ("p116_118", [313, 218, 319, 227], "б"), ("p117_122", [316, 162, 322, 171], "б"), ("p123_129", [312, 279, 318, 288], "б"),
    ("p134_134", [570, 371, 579, 384], "б"), ("p134_135", [555, 336, 564, 350], "б"), ("p137_137", [299, 294, 309, 308], "б"), ("p140_139", [389, 243, 397, 256], "б"), ("p140_139", [47, 497, 54, 506], "в"),
    ("p140_139", [391, 495, 397, 504], "г"), ("p140_139", [49, 745, 57, 755], "д"), ("p140_139", [393, 745, 399, 754], "е"), ("p140_140", [395, 252, 403, 266], "б"), ("p141_141", [535, 350, 545, 365], "б"),
    ("p142_142", [577, 284, 586, 298], "б"), ("p142_142", [181, 631, 188, 641], "в"), ("p142_142", [588, 632, 594, 641], "г"), ("p142_142", [181, 948, 189, 958], "д"), ("p142_142", [586, 949, 593, 958], "е"),
    ("p160_147", [392, 283, 400, 297], "б"), ("p160_148", [447, 219, 454, 230], "б"), ("p160_148", [140, 488, 146, 495], "в"), ("p160_148", [455, 488, 459, 496], "г"), ("p160_148", [140, 733, 146, 741], "д"),
    ("p160_148", [454, 733, 459, 740], "е"), ("p180_157", [314, 204, 320, 214], "б"), ("p181_158", [318, 144, 324, 154], "б"), ("p181_158", [14, 327, 19, 334], "в"), ("p181_158", [319, 327, 323, 333], "г"),
    ("p181_158", [13, 487, 19, 493], "д"), ("p181_158", [318, 486, 323, 493], "е"), ("p181_158", [14, 666, 23, 673], "ж"), ("p181_158", [319, 666, 324, 672], "з"), ("p182_159", [683, 273, 691, 286], "б"),
    ("p183_163", [10, 242, 15, 249], "в"), ("p183_162", [9, 238, 15, 247], "б"), ("p184_167", [315, 223, 321, 232], "б"), ("p252_185", [322, 223, 328, 232], "б"), ("p252_186", [316, 208, 322, 217], "б"),
    ("p252_186", [12, 449, 17, 456], "в"), ("p252_186", [316, 450, 320, 456], "г"), ("p290_211", [310, 227, 316, 236], "б"), ("p297_220", [190, 271, 196, 281], "б"), ("p297_220", [6, 473, 11, 480], "в"),
    ("p297_220", [309, 472, 315, 480], "г"), ("p296_216", [317, 219, 323, 228], "б"), ("p238_184", [6, 330, 12, 340], "б"), ("p193_170", [136, 11, 142, 21], "б"), ("p193_170", [208, 14, 213, 21], "в"),
    ("p290_212", [10, 154, 15, 160], "в"), ("p193_170", [275, 14, 280, 21], "г"), ("p193_170", [290, 253, 296, 260], "д"), ("p193_170", [401, 253, 406, 259], "е")]
for _n, (_x0, _y0, _x1, _y1), _ch in _PL:
    _h = _y1 - _y0 + 1
    _asc = _ch in "бдз"   # ko'tarilgan harflar (b, e?, h) — o'lchamni moslash
    _s = max(9, round(_h * (1.3 if _ch == "б" else 1.55)))
    _it = {"box": [_x0 - 2, _y0 - 3, max(_x1 + 2, _x0 + 8), _y1 + 2], "t": _MAP[_ch], "f": "serif", "s": _s, "bg": "ring", "c": "#1e1e1e", "pad": 0}
    T.setdefault(_n, {"x": []}).setdefault("x", []).append(_it)
