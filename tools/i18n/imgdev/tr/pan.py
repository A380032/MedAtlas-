import json
T = {}
W = "#ffffff"
def X(box, t, f="sans", s=None, **k):
    it = {"box": box, "t": t, "f": f, **k}
    if s: it["s"] = s
    return it
def E(box, **k): return X(box, " ", s=6, **k)
_L = json.load(open("lbox_pan.json"))
def LB(box, ch):
    x0, y0, x1, y1 = box; h = y1 - y0 + 1
    return X([x0 + 1, y0 + 1, x1 - 1, y1 - 1], ch, "sansb" if h >= 17 else "serifb", max(8, int(h * 0.82)), bg=W, c="#111111", pad=0)
_ids = {1: "c", 4: "b", 9: "b", 52: "b", 59: "b", 65: "b", 70: "b", 72: "b", 75: "N", 76: "N", 77: "N", 78: "N", 123: "b", 124: "b", 128: "b", 132: "b", 134: "b", 139: "b",
        163: "b", 174: "b", 204: "b", 206: "b"}
for _i, _ch in _ids.items():
    _r = _L[_i]; T.setdefault(_r["img"], {"x": []})["x"].append(LB(_r["box"], _ch))
T["p118_77"]["x"].append(LB([257, 63, 268, 74], "L"))
T["p172_138"]["x"] += [X([20, 525, 41, 539], "c", "sansb", 14, bg=W, c="#111111", pad=0), X([429, 525, 450, 539], "d", "sansb", 14, bg=W, c="#111111", pad=0)]
T["p20_9"] = {"x": [X([15, 16, 515, 39], "SPECIMENS FOR OPTIONAL STUDY", "serifb", 14, c="#b03040")]}
T["p123_88"] = {"x": [E([556, 530, 681, 625], bg="#000000")], "also": ["p216_200.webp"]}
T["p141_105"] = {"x": [X([60, 12, 700, 84], "Microslide No. 4. “Chronic venous congestion of the skin”\n(hematoxylin–eosin stain)", "sansi", 16, bg=W, c="#c4c4c4")]}
T["p173_139"] = {"x": [X([250, 26, 510, 60], "Sago spleen", "sansb", 20, c="#f0e890", bg="ring")]}
T["p196_173"] = {"x": [X([298, 666, 573, 758], "1 – tumor\nnodules", "dvb", 22, a="l", c="#f0f0f8", bg="ring")]}
T["p219_203"] = {"x": [X([60, 2, 480, 96], "Malarial pigment\n(hemomelanin)", "serifb", 30, a="l", c="#ffff40", bg="#0000ff"),
    X([70, 510, 385, 569], "Malarial pigmentation\nof the spleen", "serif", 21, a="l", c="#e8e8f0", bg="#0000ff"), X([405, 497, 730, 560], "Malarial pigment\nin the capillaries of the spleen", "serif", 21, a="l", c="#e8e8f0", bg="#0000ff")]}
T["p220_206"] = {"x": [X([80, 498, 759, 569], "9. Liver in malaria.\nIn stellate reticuloendothelial cells (Kupffer cells) — black pigment\nhemomelanin (1); in hepatocytes — hemosiderin (2).", "sans", 13, a="l", bg=W, c="#111111")]}
T["p208_180"] = {"x": [E([0, 351, 517, 361], bg=W)]}
T["p238_223"] = {"x": [E([0, 408, 353, 417], bg=W)]}
T["p16_2"] = {"x": [X([460, 514, 500, 534], "1 cm", "sansb", 12, c="#e8fbff", bg="ring")]}
T["p16_3"]["x"].append(X([36, 506, 86, 530], "1 cm", "sansb", 14, c="#e8fbff", bg="ring"))
T["p150_118"] = {"x": [X([211, 432, 240, 446], "1 cm", "sansb", 7, c="#d8ecff", bg="ring")]}
