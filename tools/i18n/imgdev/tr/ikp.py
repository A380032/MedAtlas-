T = {}
W = "#ffffff"
def X(box, t, f="sans", s=None, **k):
    it = {"box": box, "t": t, "f": f, **k}
    if s: it["s"] = s
    return it
def N(n): return {i: None for i in range(n)}
def E(box, **k): return X(box, " ", s=6, **k)   # faqat o'chirish
T["p36_6"] = {**N(3), "x": [E([306, 0, 315, 309])]}
T["p99_57"] = {**N(3), "x": [E([0, 0, 531, 14])]}
T["p117_77"] = {**N(8), "x": [E([0, 0, 335, 9])]}
T["p217_133"] = {**N(12), "x": [E([421, 300, 432, 447])]}
_t = {"f": "sans", "s": 19, "c": "#3a3a3a"}
T["p54_16"] = {**N(14), "x": [X([62, 48, 268, 76], "oral cavity", "sans", 18, c="#333333"), X([70, 145, 268, 173], "axilla", "sans", 18, c="#333333"), X([72, 334, 262, 364], "rectum", "sans", 18, c="#333333"), X([74, 240, 266, 270], "vaginal", "sans", 18, c="#333333"),
    {"box": [398, 38, 572, 65], "t": "36.8 – 37.3 °C", **_t}, {"box": [390, 164, 564, 192], "t": "36.3 – 36.9 °C", **_t}, {"box": [390, 284, 564, 314], "t": "36.3 – 36.9 °C", **_t}, {"box": [394, 404, 568, 434], "t": "37.3 – 37.7 °C", **_t}]}
T["p79_35"] = {**N(2), "x": [X([96, 80, 226, 110], "Hyperpnea", "sansb", 18, c="#555555"), X([291, 80, 376, 110], "Apnea", "sansb", 18, c="#555555")]}
T["p81_41"] = {**N(5), "x": [X([45, 23, 176, 49], "Ninety-nine", "sansb", 16, c="#d0503c")]}
def P(box, t, a="l", **k): return X(box, t, "sansb", 9, a=a, c="#444444", **k)
T["p82_44"] = {**N(22), "x": [P([243, 16, 343, 32], "Nasal cavity"), P([253, 82, 312, 99], "Larynx"), P([256, 121, 314, 139], "Trachea"), P([260, 209, 322, 224], "Bronchi"), P([24, 219, 74, 234], "Pleura", "r"),
    P([249, 252, 292, 267], "Heart"), P([0, 287, 56, 302], "Bronchi", "r"), P([279, 316, 326, 331], "Lung"), P([263, 357, 332, 389], "Pleural\ncavity")]}
_u = {"f": "sansb", "s": 16, "c": "#a8507f"}
T["p117_78"] = {**N(24), "x": [{"box": [2, 150, 212, 200], "t": "Auscultation points\nof the lung apices", **_u}, E([213, 157, 252, 176]), {"box": [558, 203, 756, 274], "t": "Auscultation points\nof the upper lobe", **_u},
    {"box": [2, 308, 214, 386], "t": "Auscultation points\nof the lower lobe", **_u}]}
def Q(box, t, s=15, f="serifbi", **k): return X(box, t, f, s, **{"c": "#3a3a3a", **k})
T["p119_79"] = {**N(9), "x": [Q([308, 80, 448, 105], "RALES", 17, "serifb", c="#ffffff"), Q([88, 102, 250, 126], "Dry rales", f="serifb"), Q([510, 102, 672, 128], "Moist rales", f="serifb"),
    Q([22, 166, 158, 210], "Whistling\ndry rales"), Q([186, 166, 308, 234], "Buzzing\ndry rales"), Q([368, 166, 542, 236], "By location\n(bronchial\ncaliber)"), Q([574, 166, 730, 213], "By sonority"),
    Q([156, 288, 460, 316], "Fine, medium and coarse bubbling"), Q([486, 288, 606, 316], "Consonating"), {"box": [631, 288, 741, 316], "t": "Non-consonating", "f": "serifbi", "smax": 15, "c": "#3a3a3a"}]}
_r = {"c": "#c0392b"}
T["p143_89"] = {**N(5), "x": [X([2, 5, 116, 24], "Bronchoscopy", "sansb", 12, a="l", **_r), X([0, 149, 33, 163], "Trachea", "sansb", 8, a="l", **_r), X([0, 166, 37, 181], "Bronchi", "sansb", 8, a="l", **_r),
    X([0, 225, 25, 239], "Heart", "sansb", 8, a="l", **_r)]}
def B(box, t, s=13, c="#444444", **k): return X(box, t, "sansb", s, c=c, **k)
_mv = "#6f5f8f"; _pk = "#d0607a"; _ol = "#6f5520"
T["p190_104"] = {**N(41), "x": [B([116, 83, 240, 121], "Superior\nvena cava", 14, _mv), B([526, 90, 700, 114], "Pulmonary artery", 14), B([528, 123, 646, 145], "To the lungs", 13, "#5a6a9a", a="l"),
    B([62, 150, 172, 173], "To the lungs", 13, "#5a6a9a", a="r"), B([556, 165, 700, 188], "From the lungs", 13, _pk, a="l"), B([30, 201, 148, 224], "From the lungs", 13, _pk, a="r"),
    B([532, 206, 690, 232], "Pulmonary vein", 14), B([58, 257, 188, 365], "1. Oxygen-poor\nblood from the\ntissues enters\nthe right atrium", 11, "#333333", a="l"),
    B([562, 246, 712, 293], "4. Blood returns\nfrom the lungs\nto the left atrium", 11, _ol), B([540, 315, 696, 349], "5. Flows into the\nleft ventricle", 11, _ol),
    B([562, 386, 716, 410], "Valves", 15, _pk), B([56, 378, 200, 402], "Valves", 15, _pk), B([86, 409, 190, 457], "2. Flows into\nthe right\nventricle", 11, "#333333", a="l"),
    B([558, 421, 727, 483], "6. From the left\nventricle blood is\npumped to all organs\nand tissues", 11, _ol), B([88, 498, 230, 540], "Inferior\nvena cava", 14, _mv),
    B([478, 522, 638, 574], "3. The right ventricle\npumps blood\nto the lungs", 11, "#333333", a="l")]}
T["p197_112"] = {**N(9), "x": [E([0, 4, 19, 21]), E([0, 138, 17, 154]), E([0, 163, 17, 179]), E([0, 199, 6, 213]), E([0, 306, 19, 320]), E([122, 126, 141, 143]), E([134, 148, 141, 161]), E([122, 161, 141, 176])]}
_rb = "#a84848"
def C(box, t, **k): return {"box": box, "t": t, "f": "sansb", "smax": 9, "c": _rb, **k}
T["p199_116"] = {**N(11), "x": [C([44, 0, 128, 20], "Superior vena cava"), C([268, 23, 342, 53], "Left pulmonary\nartery"), C([8, 43, 84, 76], "Right pulmonary\nartery"), C([270, 139, 324, 169], "Left\nventricle"),
    C([6, 161, 106, 178], "Right atrium", a="l"), C([6, 182, 96, 198], "Right ventricle", a="l"), C([260, 178, 343, 206], "Apex beat")]}
T["p199_115"] = {**N(4), "x": [B([226, 189, 340, 208], "Right ventricle", 13, "#c0392b")]}
_wh = "#f6f2f6"
T["p202_120"] = {**N(6), "x": [X([222, 9, 356, 28], "Diffuse", "serifb", 13, c=_wh, col=213), X([20, 115, 150, 137], "High", "serifb", 13, c=_wh, col=12), X([434, 121, 552, 145], "Forceful", "serifb", 13, c=_wh, col=427),
    X([224, 236, 364, 258], "Resistant", "serifb", 13, c=_wh, col=215), X([210, 90, 368, 172], "Apex beat in\nleft ventricular\nhypertrophy", "serifb", 14, c=_wh)]}
T["p160_98"] = {**N(8), "x": [B([28, 15, 118, 53], "Parietal\npleura", 14, "#555555"), B([25, 191, 94, 213], "Lung", 14, "#555555"), B([334, 255, 458, 290], "Vessels and\nnerves", 14, "#555555")]}
T["p176_100"] = {**N(7), "x": [B([38, 39, 178, 62], "Healthy lung", 15, "#607080"), B([284, 19, 428, 59], "Bronchiectasis", 15, "#c05a70")]}
_cm = [("190", 234), ("183", 247), ("175", 260), ("167", 273), ("160", 286), ("175", 379), ("167", 391), ("160", 406), ("152", 420)]
T["p144_93"] = {**N(37), "x": [X([14, 138, 32, 330], "PEF (L/MIN)", "sansb", 12, rot=90, c="#444444")] + [X([484, y - 6, 526, y + 6], f"{v} cm", "sansb", 8, a="l", c="#333333") for v, y in _cm]}
def Sn(box, t, s=14, **k): return X(box, t, "sansb", s, bg=W, c="#333333", **k)
T["p236_158"] = {**N(10), "x": [Sn([196, 16, 270, 38], "S2"), Sn([112, 111, 180, 133], "S1"), Sn([524, 20, 598, 42], "S2"), Sn([426, 115, 493, 137], "S1"), Sn([618, 72, 634, 92], "P", 13),
    Sn([100, 223, 300, 245], "On expiration", 13), Sn([440, 221, 596, 243], "On inspiration", 13)]}
T["p236_159"] = {**N(9), "x": [Sn([20, 7, 100, 32], "S2"), Sn([116, 62, 134, 84], "P", 13), Sn([0, 237, 150, 259], "On inspiration", 13), Sn([352, 5, 432, 31], "S2"), Sn([451, 62, 470, 84], "P", 13),
    Sn([250, 109, 324, 136], "S1"), Sn([240, 236, 470, 259], "On expiration", 13)]}
T["p236_160"] = {**N(19), "x": [Sn([90, 17, 152, 40], "S1", 13), Sn([222, 18, 292, 41], "S2", 13), Sn([285, 63, 350, 85], "S3", 12), Sn([342, 110, 407, 132], "S4", 12), Sn([398, 13, 458, 36], "S1", 13),
    Sn([529, 14, 597, 37], "S2", 13), Sn([593, 65, 657, 88], "S3", 12), Sn([655, 110, 719, 132], "S4", 12), Sn([85, 173, 147, 196], "S1", 13), Sn([216, 174, 283, 197], "S2", 13),
    Sn([295, 174, 359, 197], "S3", 12), Sn([395, 171, 455, 195], "S1", 13), Sn([527, 172, 594, 196], "S2", 13), Sn([603, 182, 666, 204], "S3", 12)]}
def Vt(x, y0, y1, t): return X([x - 6, y0, x + 6, y1], t, "sansb", 6, rot=90, bg=W, c="#444444")
T["p238_162"] = {**N(35), "x": [X([236, 52, 304, 65], "SYSTOLIC", "sansb", 7, bg=W, c="#444444"), X([462, 51, 540, 64], "DIASTOLIC", "sansb", 7, bg=W, c="#444444"),
    Vt(98, 78, 140, "Presystolic"), Vt(207, 76, 144, "Protosystolic"), Vt(258, 76, 144, "Mesosystolic"), Vt(343, 70, 138, "Late systolic"), Vt(411, 76, 148, "Protodiastolic"),
    Vt(500, 75, 148, "Mesodiastolic"), Vt(595, 83, 142, "Presystolic"), X([155, 252, 194, 266], "S1", "sansb", 8, bg=W, c="#444444"), X([338, 253, 380, 268], "S2", "sansb", 8, bg=W, c="#444444")]}
_br = "#b04a40"
T["p240_164"] = {**N(12), "x": [X([4, 134, 208, 212], "5 – Botkin–Erb point\n(auscultation site of\nthe aortic valve)", "sansb", 12, bg="ring", c=_br), X([64, 278, 224, 334], "4 – Auscultation site\nof the tricuspid valve", "sansb", 12, bg="ring", c=_br)]}
def Ek(box, t, **k): return X(box, t, "sansb", 7, bg=W, c="#222222", **k)
T["p244_165"] = {**N(7), "x": [Ek([138, 75, 161, 87], "RV"), Ek([99, 98, 126, 112], "IVS"), Ek([95, 153, 122, 166], "LV"), Ek([66, 202, 114, 216], "LVPW"), Ek([165, 202, 193, 216], "LA"),
    X([20, 289, 48, 304], "ECG", "sansb", 8, bg="#3a3a3a", c="#f0f0f0")]}
T["p218_138"] = {**N(8), "x": [X([172, 244, 252, 302], "Transverse\ndiameter of\nthe heart", "sansb", 9, bg="grad", c="#f0d8d0")]}
T["p197_111"] = {**N(6), "x": [E([129, 2, 139, 17])]}
