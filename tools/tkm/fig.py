"""TKM qo'llanmasi uchun chizilgan rasmlar (grafiklar, sxemalar, struktura formulalar).

  python3 tools/tkm/fig.py            -> barcha rasmlar
  python3 tools/tkm/fig.py t01_biogen -> faqat bittasi

Har bir rasm ikki tilda chiziladi: data/img/tkm/<nom>.webp (o'zbekcha) va
data/en/img/tkm/<nom>.webp (inglizcha). Tilga bog'liq matni yo'q rasmlar (struktura formulalar)
faqat data/img/tkm ga yoziladi (LANG_FREE ro'yxati).
Haqiqiy fotosurati bor narsalar (asboblar, alanga rangi) bu yerda CHIZILMAYDI — ular manbadan olinadi
(tools/tkm/photos.json)."""
import io, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = {"uz": os.path.join(ROOT, "data/img/tkm"), "en": os.path.join(ROOT, "data/en/img/tkm")}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11, "axes.spines.top": False,
                     "axes.spines.right": False, "savefig.dpi": 160})
INK, MUTED = "#22313f", "#6b7785"
C1, C2, C3, C4, C5 = "#2f78b5", "#c0504d", "#3d8a5a", "#c27c1a", "#7a5bc9"
FIGS, LANG_FREE = {}, set()


def fig(name, lang_free=False):
    def deco(f):
        FIGS[name] = f
        if lang_free: LANG_FREE.add(name)
        return f
    return deco


def save(name, f, lang):
    os.makedirs(OUT[lang], exist_ok=True)
    buf = io.BytesIO()
    f.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
    plt.close(f)
    im = Image.open(buf).convert("RGB")
    if im.width > 1400:
        im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    p = os.path.join(OUT[lang], name + ".webp")
    im.save(p, "WEBP", quality=88, method=6)
    return im.size


def T(lang, uz, en):
    return uz if lang == "uz" else en


# ---------------------------------------------------------------- 1-mavzu
PT = [
    "H,,,,,,,,,,,,,,,,,He", "Li,Be,,,,,,,,,,,B,C,N,O,F,Ne", "Na,Mg,,,,,,,,,,,Al,Si,P,S,Cl,Ar",
    "K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr",
    "Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe",
    "Cs,Ba,La,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn", "Fr,Ra,Ac,,,,,,,,,,,,,,,"]
ORG = {"C", "H", "O", "N", "P", "S"}
MACRO = {"Ca", "K", "Na", "Cl", "Mg"}
MICRO = {"Fe", "Zn", "Cu", "Mn", "Co", "Mo", "Cr", "I", "F", "Se", "B", "Si", "V", "Ni", "Li", "Br"}
TOXIC = {"Pb", "Hg", "Cd", "As", "Tl", "Be"}


@fig("t01_biogen")
def t01_biogen(lang):
    f, ax = plt.subplots(figsize=(13, 7.2))
    ax.set_xlim(0, 18); ax.set_ylim(-1.6, 7.2); ax.axis("off")
    col = {"org": "#c0504d", "mac": "#e8a33d", "mic": "#3d8a5a", "tox": "#6b6b6b", "oth": "#eef1f4"}
    for r, row in enumerate(PT):
        for c, el in enumerate(row.split(",")):
            if not el: continue
            k = "org" if el in ORG else "mac" if el in MACRO else "mic" if el in MICRO else "tox" if el in TOXIC else "oth"
            y = 6 - r
            ax.add_patch(FancyBboxPatch((c + .06, y + .06), .88, .88, boxstyle="round,pad=0,rounding_size=.08",
                                        fc=col[k], ec="white", lw=1.2))
            ax.text(c + .5, y + .5, el, ha="center", va="center", fontsize=13, weight="bold",
                    color="white" if k != "oth" else "#9aa4ae")
    for i, g in enumerate(["IA", "IIA"]): ax.text(i + .5, 7.08, g, ha="center", fontsize=9, color=MUTED)
    for i, g in enumerate(["IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"]): ax.text(12 + i + .5, 7.08, g, ha="center", fontsize=9, color=MUTED)
    ax.text(7.5, 3.6 + 3.45, T(lang, "d-elementlar", "d-elements"), ha="center", fontsize=10, color=MUTED)
    labels = [("org", T(lang, "Organogenlar (C, H, O, N, P, S) — massaning ≈ 97 %", "Organogenic elements (C, H, O, N, P, S) — ≈ 97 % of mass")),
              ("mac", T(lang, "Boshqa makroelementlar", "Other macroelements")),
              ("mic", T(lang, "Mikroelementlar", "Microelements")),
              ("tox", T(lang, "Zaharli og‘ir metallar va boshqalar", "Toxic heavy metals and others"))]
    for i, (k, t) in enumerate(labels):
        x = [0, 9.2, 0, 9.2][i]; y = [-.55, -.55, -1.35, -1.35][i]
        ax.add_patch(FancyBboxPatch((x, y), .5, .5, boxstyle="round,pad=0,rounding_size=.06", fc=col[k], ec="none"))
        ax.text(x + .7, y + .25, t, va="center", fontsize=11, color=INK)
    return f


# ---------------------------------------------------------------- 2-mavzu
def ph_strong(Ca, Va, Cb, Vb):
    import math
    na, nb = Ca * Va, Cb * Vb
    d = (na - nb) / (Va + Vb)            # ortiqcha H+ (manfiy bo'lsa OH-)
    h = (d + math.sqrt(d * d + 4e-14)) / 2
    return -math.log10(h)


@fig("t02_egri")
def t02_egri(lang):
    import numpy as np
    v = np.linspace(0, 40, 2001)
    ph = [ph_strong(.1, 20, .1, x) for x in v]
    f, ax = plt.subplots(figsize=(10, 6.4))
    bands = [(3.1, 4.4, "#f2a65a", T(lang, "metiloranj", "methyl orange")),
             (4.4, 6.2, "#e57373", T(lang, "metil qizil", "methyl red")),
             (8.2, 10.0, "#c86dd7", T(lang, "fenolftalein", "phenolphthalein"))]
    for lo, hi, c, t in bands:
        ax.axhspan(lo, hi, color=c, alpha=.18, lw=0)
        ax.text(39.5, (lo + hi) / 2, t, ha="right", va="center", fontsize=10.5, color=INK)
    ax.plot(v, ph, color=C1, lw=2.6)
    ax.axvline(20, color=MUTED, ls="--", lw=1)
    ax.plot([20], [7], "o", color=C2, ms=8, zorder=5)
    ax.annotate(T(lang, "ekvivalent nuqta\npH = 7", "equivalence point\npH = 7"), (20, 7), (23, 5.6),
                fontsize=10.5, color=INK, arrowprops=dict(arrowstyle="->", color=MUTED))
    ax.annotate("", (19.2, 9.7), (19.2, 4.3), arrowprops=dict(arrowstyle="<->", color=C2, lw=1.4))
    ax.text(18.6, 7.9, T(lang, "titrlash\nsakrashi\n4,3–9,7", "titration\njump\n4.3–9.7"), ha="right", fontsize=10, color=C2)
    ax.set_xlim(0, 40); ax.set_ylim(0, 14); ax.set_yticks(range(0, 15, 2))
    ax.set_xlabel(T(lang, "Qo‘shilgan 0,1 M NaOH hajmi, ml", "Volume of 0.1 M NaOH added, mL"))
    ax.set_ylabel("pH")
    ax.set_title(T(lang, "20 ml 0,1 M HCl ni 0,1 M NaOH bilan titrlash", "Titration of 20 mL of 0.1 M HCl with 0.1 M NaOH"), fontsize=12, color=INK)
    ax.grid(alpha=.25)
    return f


# ---------------------------------------------------------------- 4-mavzu
def ph_weak(Ca, Va, Cb, Vb, pKa=4.76):
    """Kuchsiz kislotani kuchli asos bilan titrlash: zaryad balansini aniq yechadi."""
    import math
    Ka = 10 ** -pKa; Kw = 1e-14
    V = Va + Vb; CA = Ca * Va / V; Na = Cb * Vb / V
    lo, hi = 0.0, 14.0
    for _ in range(80):
        ph = (lo + hi) / 2; h = 10 ** -ph
        f = h + Na - Kw / h - CA * Ka / (Ka + h)
        if f > 0: lo = ph
        else: hi = ph
    return ph


@fig("t04_bufer")
def t04_bufer(lang):
    import numpy as np
    v = np.linspace(0.01, 30, 1500)
    ph = [ph_weak(.1, 20, .1, x) for x in v]
    f, ax = plt.subplots(figsize=(10, 6.4))
    ax.axhspan(3.76, 5.76, color=C3, alpha=.14, lw=0)
    ax.text(0.6, 5.95, T(lang, "bufer sohasi: pK~a~ ± 1", "buffer region: pK~a~ ± 1").replace("~a~", "$_a$"), fontsize=11, color=C3)
    ax.plot(v, ph, color=C1, lw=2.6)
    ax.plot([10], [4.76], "o", color=C2, ms=8, zorder=5)
    ax.annotate(T(lang, "yarim neytrallanish:\npH = pK$_a$ = 4,76", "half-neutralization:\npH = pK$_a$ = 4.76"), (10, 4.76), (12.5, 3.0),
                fontsize=10.5, color=INK, arrowprops=dict(arrowstyle="->", color=MUTED))
    ax.plot([20], [ph_weak(.1, 20, .1, 20)], "o", color=C5, ms=8, zorder=5)
    ax.annotate(T(lang, "ekvivalent nuqta\npH ≈ 8,7", "equivalence point\npH ≈ 8.7"), (20, 8.73), (22.5, 7.2),
                fontsize=10.5, color=INK, arrowprops=dict(arrowstyle="->", color=MUTED))
    ax.set_xlim(0, 30); ax.set_ylim(0, 14); ax.set_yticks(range(0, 15, 2))
    ax.set_xlabel(T(lang, "Qo‘shilgan 0,1 M NaOH hajmi, ml", "Volume of 0.1 M NaOH added, mL"))
    ax.set_ylabel("pH")
    ax.set_title(T(lang, "20 ml 0,1 M CH$_3$COOH ni 0,1 M NaOH bilan titrlash", "Titration of 20 mL of 0.1 M CH$_3$COOH with 0.1 M NaOH"), fontsize=12, color=INK)
    ax.grid(alpha=.25)
    return f


# ---------------------------------------------------------------- 5-mavzu
@fig("t05_entalpiya")
def t05_entalpiya(lang):
    import numpy as np
    f, axs = plt.subplots(1, 2, figsize=(13, 6))
    x = np.linspace(0, 1, 400)
    for ax, (r, p, tt, dh) in zip(axs, [(3, 1, T(lang, "Ekzotermik reaksiya", "Exothermic reaction"), "ΔH < 0"),
                                         (1, 3, T(lang, "Endotermik reaksiya", "Endothermic reaction"), "ΔH > 0")]):
        top = max(r, p) + 2.2
        y = r + (p - r) * (1 / (1 + np.exp(-(x - .5) * 14))) + (top - max(r, p)) * np.exp(-((x - .5) / .13) ** 2)
        ax.plot(x, y, color=C1, lw=2.6)
        ax.hlines(r, 0, .3, color=INK, lw=1.2); ax.hlines(p, .7, 1, color=INK, lw=1.2)
        ax.text(.02, r + .15, T(lang, "boshlang‘ich\nmoddalar", "reactants"), fontsize=10.5, color=INK, va="bottom")
        ax.text(.72, p + .15, T(lang, "mahsulotlar", "products"), fontsize=10.5, color=INK, va="bottom", ha="left")
        ym = y.max()
        ax.annotate("", (.5, ym), (.5, r), arrowprops=dict(arrowstyle="<->", color=C4, lw=1.5))
        ax.text(.535, (ym + r) / 2, "E$_a$", fontsize=12, color=C4)
        ax.annotate("", (.95, p), (.95, r), arrowprops=dict(arrowstyle="->", color=C2, lw=1.8))
        ax.hlines(r, .3, .97, color=MUTED, lw=.8, ls=":")
        ax.text(.93, (r + p) / 2, dh, fontsize=12, color=C2, ha="right", va="center")
        ax.set_title(tt, fontsize=12.5, color=INK)
        ax.set_xticks([]); ax.set_yticks([]); ax.set_ylim(0, top + .8)
        ax.set_xlabel(T(lang, "Reaksiya borishi", "Reaction progress"))
        ax.set_ylabel(T(lang, "Entalpiya, H", "Enthalpy, H"))
    f.tight_layout()
    return f


@fig("t05_gess")
def t05_gess(lang):
    f, ax = plt.subplots(figsize=(11, 6))
    ax.axis("off"); ax.set_xlim(0, 10); ax.set_ylim(-1, 7)
    def box(x, y, t):
        ax.add_patch(FancyBboxPatch((x - 1.3, y - .45), 2.6, .9, boxstyle="round,pad=.05,rounding_size=.15", fc="#eef3f8", ec=C1, lw=1.5))
        ax.text(x, y, t, ha="center", va="center", fontsize=13, color=INK)
    box(1.8, 6, "C + O$_2$"); box(8.2, 0, "CO$_2$"); box(8.2, 4, "CO + ½O$_2$")
    ax.annotate("", (7.0, .2), (2.2, 5.5), arrowprops=dict(arrowstyle="-|>", color=C2, lw=2.2))
    ax.text(2.3, 2.3, "ΔH$_1$ = −393,5 kJ" if lang == "uz" else "ΔH$_1$ = −393.5 kJ", fontsize=12.5, color=C2, rotation=-38)
    ax.annotate("", (6.8, 4.25), (3.2, 5.8), arrowprops=dict(arrowstyle="-|>", color=C3, lw=2.2))
    ax.text(4.2, 5.45, "ΔH$_2$ = −110,5 kJ" if lang == "uz" else "ΔH$_2$ = −110.5 kJ", fontsize=12.5, color=C3, rotation=-22)
    ax.annotate("", (8.2, .55), (8.2, 3.5), arrowprops=dict(arrowstyle="-|>", color=C3, lw=2.2))
    ax.text(8.4, 2, "ΔH$_3$ = −283,0 kJ" if lang == "uz" else "ΔH$_3$ = −283.0 kJ", fontsize=12.5, color=C3)
    ax.text(.3, -.6, T(lang, "ΔH$_1$ = ΔH$_2$ + ΔH$_3$:  −110,5 + (−283,0) = −393,5 kJ",
                       "ΔH$_1$ = ΔH$_2$ + ΔH$_3$:  −110.5 + (−283.0) = −393.5 kJ"), fontsize=13, color=INK)
    return f


# ---------------------------------------------------------------- 6-mavzu
LAM = {"H": 349.8, "OH": 198.6, "Na": 50.1, "Cl": 76.3, "Ac": 40.9}   # S·sm2/mol, 25 °C


@fig("t06_kondukt")
def t06_kondukt(lang):
    import numpy as np
    v = np.linspace(0, 5, 400)
    Ca, Va, Cb = .01, 20, .1
    def strong(x):
        V = Va + x; na, nb = Ca * Va, Cb * x
        h = max(na - nb, 0) / V; oh = max(nb - na, 0) / V; na_ = nb / V; cl = na / V
        return LAM["H"] * h + LAM["OH"] * oh + LAM["Na"] * na_ + LAM["Cl"] * cl
    def weak(x):
        V = Va + x; ph = ph_weak(Ca, Va, Cb, x); h = 10 ** -ph; oh = 1e-14 / h
        CA = Ca * Va / V; Ka = 10 ** -4.76; ac = CA * Ka / (Ka + h)
        return LAM["H"] * h + LAM["OH"] * oh + LAM["Na"] * Cb * x / V + LAM["Ac"] * ac
    k1 = np.array([strong(x) for x in v]) * 1000 * .1   # mS/m ga yaqin shartli birlik
    k2 = np.array([weak(x) for x in v]) * 1000 * .1
    f, ax = plt.subplots(figsize=(10, 6.4))
    ax.plot(v, k1, color=C2, lw=2.6, label=T(lang, "HCl + NaOH (kuchli kislota)", "HCl + NaOH (strong acid)"))
    ax.plot(v, k2, color=C1, lw=2.6, label=T(lang, "CH$_3$COOH + NaOH (kuchsiz kislota)", "CH$_3$COOH + NaOH (weak acid)"))
    ax.axvline(2, color=MUTED, ls="--", lw=1)
    ax.text(2.08, max(k1.max(), k2.max()) * 1.12, T(lang, "ekvivalent nuqta", "equivalence point"), fontsize=10.5, color=INK)
    ax.set_xlim(0, 5); ax.set_ylim(0, max(k1.max(), k2.max()) * 1.35)
    ax.set_xlabel(T(lang, "Qo‘shilgan 0,1 M NaOH hajmi, ml (20 ml 0,01 M kislotaga)", "Volume of 0.1 M NaOH added, mL (to 20 mL of 0.01 M acid)"))
    ax.set_ylabel(T(lang, "Elektr o‘tkazuvchanlik (nisbiy birlik)", "Conductivity (relative units)"))
    ax.set_yticks([]); ax.legend(frameon=False, fontsize=10.5, loc="upper left"); ax.grid(alpha=.25)
    return f


@fig("t06_nafas")
def t06_nafas(lang):
    st = [("NAD$^+$/NADH", -.32), ("FMN", -.30), (T(lang, "KoQ", "CoQ"), .04), (T(lang, "sit. b", "cyt b"), .08),
          (T(lang, "sit. c$_1$", "cyt c$_1$"), .22), (T(lang, "sit. c", "cyt c"), .25), (T(lang, "sit. a", "cyt a"), .29),
          (T(lang, "sit. a$_3$", "cyt a$_3$"), .55), ("O$_2$/H$_2$O", .82)]
    f, ax = plt.subplots(figsize=(11, 6.3))
    for i, (n, e) in enumerate(st):
        ax.add_patch(FancyBboxPatch((i - .38, e - .035), .76, .07, boxstyle="round,pad=0,rounding_size=.02",
                                    fc=C1 if i not in (0, len(st) - 1) else C2, ec="none", alpha=.9))
        ax.text(i, e + .06, n, ha="center", fontsize=10.5, color=INK)
        ax.text(i, e - .085, (f"{e:+.2f}" if lang == "en" else f"{e:+.2f}".replace(".", ",")).replace("-", "−"), ha="center", fontsize=9.5, color=MUTED)
        if i: ax.annotate("", (i - .4, e), (i - .6, st[i - 1][1]), arrowprops=dict(arrowstyle="->", color=MUTED, lw=1.2))
    ax.set_xlim(-.7, len(st) - .3); ax.set_ylim(-.5, 1.0)
    ax.set_xticks([]); ax.set_ylabel("E°′, V")
    if lang == "uz":
        from matplotlib.ticker import FuncFormatter
        ax.yaxis.set_major_formatter(FuncFormatter(lambda y, _: f"{y:.1f}".replace(".", ",").replace("-", "−")))
    ax.text(0, .9, "ΔE°′ = 1,14 V  →  ΔG°′ ≈ −220 kJ/mol" if lang == "uz" else "ΔE°′ = 1.14 V  →  ΔG°′ ≈ −220 kJ/mol", fontsize=12, color=C2)
    ax.set_title(T(lang, "Nafas zanjirida elektronlar oqimi", "Electron flow in the respiratory chain"), fontsize=12.5, color=INK)
    ax.grid(axis="y", alpha=.25)
    return f


# ---------------------------------------------------------------- 7-mavzu
@fig("t07_izoterma")
def t07_izoterma(lang):
    import numpy as np
    f, (a1, a2) = plt.subplots(1, 2, figsize=(13, 6))
    C = np.linspace(0, 10, 400); G8, K = 1.0, 0.8
    a1.plot(C, G8 * K * C / (1 + K * C), color=C1, lw=2.6)
    a1.axhline(G8, color=C2, ls="--", lw=1.2)
    a1.text(6.2, G8 + .03, "Γ$_∞$", fontsize=13, color=C2)
    a1.plot(C[:60], G8 * K * C[:60], color=MUTED, ls=":", lw=1.5)
    a1.text(1.25, .55, "Γ ≈ Γ$_∞$·K·C", fontsize=11, color=MUTED)
    a1.set_xlim(0, 10); a1.set_ylim(0, 1.15)
    a1.set_xlabel(T(lang, "Muvozanat konsentratsiya C", "Equilibrium concentration C"))
    a1.set_ylabel(T(lang, "Adsorbsiya Γ", "Adsorption Γ"))
    a1.set_title(T(lang, "Lengmyur izotermasi", "Langmuir isotherm"), fontsize=12.5, color=INK)
    a1.set_xticks([]); a1.set_yticks([])
    lc = np.linspace(-1, 1, 50)
    a2.plot(lc, .3 + .45 * lc, color=C3, lw=2.6)
    a2.plot([-1, 0], [.3, .3], color=MUTED, ls=":", lw=1.2)
    a2.text(-.95, .33, "lgK", fontsize=12, color=MUTED)
    a2.annotate("", (.6, .3 + .45 * .6), (.2, .3 + .45 * .2), arrowprops=dict(arrowstyle="-", color=C2))
    a2.text(.42, .25, T(lang, "og‘ish = 1/n", "slope = 1/n"), fontsize=11.5, color=C2)
    a2.axvline(0, color=INK, lw=.8)
    a2.set_xlabel("lg C"); a2.set_ylabel("lg(x / m)")
    a2.set_title(T(lang, "Freyndlix tenglamasi (logarifmik)", "Freundlich equation (logarithmic)"), fontsize=12.5, color=INK)
    a2.set_xticks([]); a2.set_yticks([])
    f.tight_layout()
    return f


# ---------------------------------------------------------------- 8-mavzu
@fig("t08_mitsella")
def t08_mitsella(lang):
    import numpy as np
    from matplotlib.patches import Circle
    f, ax = plt.subplots(figsize=(12, 7.6))
    ax.set_aspect("equal"); ax.axis("off"); ax.set_xlim(-6.2, 9.6); ax.set_ylim(-4.9, 4.9)
    ax.add_patch(Circle((0, 0), 4.6, fc="#f3f6fa", ec=C1, lw=1.2, ls=(0, (2, 3))))
    ax.add_patch(Circle((0, 0), 2.75, fc="#e6eef7", ec=C2, lw=1.6, ls="--"))
    ax.add_patch(Circle((0, 0), 1.45, fc="#d9c9a3", ec="#8a6d3b", lw=1.5))
    ax.text(0, 0, "[mAgI]", ha="center", va="center", fontsize=14, color=INK, weight="bold")
    for a in np.linspace(0, 2 * np.pi, 14, endpoint=False):
        ax.text(1.85 * np.cos(a), 1.85 * np.sin(a), "I$^−$", ha="center", va="center", fontsize=11, color=C2)
    for a in np.linspace(.2, 2 * np.pi + .2, 10, endpoint=False):
        ax.text(2.4 * np.cos(a), 2.4 * np.sin(a), "K$^+$", ha="center", va="center", fontsize=10.5, color=C1)
    rng = np.random.default_rng(3)
    for a, r in zip(rng.uniform(0, 2 * np.pi, 9), rng.uniform(3.2, 4.2, 9)):
        ax.text(r * np.cos(a), r * np.sin(a), "K$^+$", ha="center", va="center", fontsize=10.5, color=C1, alpha=.85)
    lab = [(1.0, T(lang, "yadro (agregat)", "core (aggregate)")),
           (1.85, T(lang, "potensial hosil qiluvchi ionlar (I$^−$)", "potential-determining ions (I$^−$)")),
           (2.4, T(lang, "adsorbsion qavat qarshi ionlari (K$^+$)", "counterions of the adsorption layer (K$^+$)")),
           (2.75, T(lang, "sirpanish chegarasi — granula (ζ-potensial)", "slipping boundary — granule (ζ-potential)")),
           (4.0, T(lang, "diffuz qavat qarshi ionlari (K$^+$)", "counterions of the diffuse layer (K$^+$)"))]
    for i, (r, t) in enumerate(lab):
        y = 3.6 - i * 1.75
        th = np.radians(40 - i * 20)
        ax.plot([r * np.cos(th)], [r * np.sin(th)], "o", ms=4, color=INK)
        ax.annotate(t, (r * np.cos(th), r * np.sin(th)), (5.0, y), fontsize=11, color=INK, va="center",
                    arrowprops=dict(arrowstyle="-", color=MUTED, lw=.9))
    ax.text(1.6, -4.85, "{[mAgI]·nI$^−$·(n − x)K$^+$}$^{x−}$·xK$^+$", ha="center", fontsize=13, color=INK)
    return f


# ---------------------------------------------------------------- struktura formulalar (tilsiz)
def mol(smiles, w=900, h=700):
    from rdkit import Chem
    from rdkit.Chem import rdDepictor
    from rdkit.Chem.Draw import rdMolDraw2D
    rdDepictor.SetPreferCoordGen(True)
    m = Chem.MolFromSmiles(smiles, sanitize=False)
    m.UpdatePropertyCache(strict=False)
    rdDepictor.Compute2DCoords(m)
    d = rdMolDraw2D.MolDraw2DCairo(w, h)
    o = d.drawOptions(); o.bondLineWidth = 2; o.minFontSize = 22; o.padding = .06
    d.DrawMolecule(m); d.FinishDrawing()
    return Image.open(io.BytesIO(d.GetDrawingText())).convert("RGB")


class MolFig:
    """mol() natijasini save() ga mos qiladi."""
    def __init__(self, im): self.im = im
    def savefig(self, buf, **k): self.im.save(buf, format="png")


_close = plt.close
plt.close = lambda f=None: None if isinstance(f, MolFig) else _close(f)


def molfig(name, smiles, w=900, h=700):
    FIGS[name] = lambda lang: MolFig(mol(smiles, w, h))
    LANG_FREE.add(name)


molfig("t03_glitsinat", "[Cu]%11%12%13%14.O%11C(=O)C[NH2]%12.O%13C(=O)C[NH2]%14", 900, 600)
molfig("t03_gem", "[Fe]%91%92%93%94.CC1=C(C=C)C2=CC3=C(C)C(CCC(=O)O)=C(N%933)C=C4C(CCC(=O)O)=C(C)C(=CC5=C(C)C(C=C)=C(N%945)C=C1N%912)N%924", 900, 800)


# ---------------------------------------------------------------- 9-mavzu
def molgrid(smiles_list, legends, w=600, h=520):
    from rdkit import Chem
    from rdkit.Chem import rdDepictor, Draw
    from rdkit.Chem.Draw import rdMolDraw2D
    rdDepictor.SetPreferCoordGen(True)
    ms = []
    for sm in smiles_list:
        m = Chem.MolFromSmiles(sm); rdDepictor.Compute2DCoords(m); ms.append(m)
    d = rdMolDraw2D.MolDraw2DCairo(w * len(ms), h, w, h)
    o = d.drawOptions(); o.bondLineWidth = 2; o.minFontSize = 22; o.legendFontSize = 30; o.padding = .1
    d.DrawMolecules(ms, legends=legends); d.FinishDrawing()
    return Image.open(io.BytesIO(d.GetDrawingText())).convert("RGB")


FIGS["t09_alanin"] = lambda lang: MolFig(molgrid(["C[C@H](N)C(=O)O", "C[C@@H](N)C(=O)O"],
    ["L-alanin (S)", "D-alanin (R)"] if lang == "uz" else ["L-alanine (S)", "D-alanine (R)"]))


@fig("t09_kraun", lang_free=True)
def t09_kraun(lang):
    import numpy as np
    f, ax = plt.subplots(figsize=(7.5, 7))
    ax.set_aspect("equal"); ax.axis("off")
    n = 18; R = 3.0
    ang = np.pi / 2 + np.arange(n) * 2 * np.pi / n
    pts = [(R * np.cos(a), R * np.sin(a)) for a in ang]
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        ax.plot([x1, x2], [y1, y2], color=INK, lw=2.2, zorder=1)
    for i in range(0, n, 3):
        x, y = pts[i]
        ax.plot([0, x * .8], [0, y * .8], color=C1, lw=1.6, ls=(0, (3, 3)), zorder=0)
        ax.add_patch(plt.Circle((x, y), .36, fc="white", ec="none", zorder=2))
        ax.text(x, y, "O", ha="center", va="center", fontsize=20, color="#d62728", zorder=3)
    ax.add_patch(plt.Circle((0, 0), .62, fc="#e6eef7", ec=C1, lw=1.6, zorder=2))
    ax.text(0, 0, "K$^+$", ha="center", va="center", fontsize=22, color=INK, zorder=3)
    ax.set_xlim(-3.6, 3.6); ax.set_ylim(-3.6, 3.6)
    return f

FIGS["t10_katexol"] = lambda lang: MolFig(molgrid(["NCCc1ccc(O)c(O)c1", "NC[C@H](O)c1ccc(O)c(O)c1", "CNC[C@H](O)c1ccc(O)c(O)c1"],
    ["Dofamin", "Noradrenalin", "Adrenalin"] if lang == "uz" else ["Dopamine", "Norepinephrine", "Epinephrine"], 470, 520))
FIGS["t10_pabk"] = lambda lang: MolFig(molgrid(["Nc1ccc(cc1)C(=O)O", "Nc1ccc(cc1)S(N)(=O)=O", "CC(=O)Oc1ccccc1C(=O)O"],
    ["PABK", "Sulfanilamid", "Atsetilsalitsil kislota"] if lang == "uz" else ["PABA", "Sulfanilamide", "Acetylsalicylic acid"], 470, 520))

def _het(lang):
    sm = ["c1cc[nH]c1", "c1c[nH]cn1", "c1ccncc1", "c1cncnc1", "c1ncc2[nH]cnc2n1", "c1ccc2[nH]ccc2c1"]
    uz = ["Pirrol", "Imidazol", "Piridin", "Pirimidin", "Purin", "Indol"]
    en = ["Pyrrole", "Imidazole", "Pyridine", "Pyrimidine", "Purine", "Indole"]
    a = molgrid(sm[:3], uz[:3] if lang == "uz" else en[:3], 466, 450)
    b = molgrid(sm[3:], uz[3:] if lang == "uz" else en[3:], 466, 450)
    can = Image.new("RGB", (a.width, a.height + b.height), "white"); can.paste(a, (0, 0)); can.paste(b, (0, a.height))
    return MolFig(can)


FIGS["t11_geterohalqa"] = _het
FIGS["t11_mediator"] = lambda lang: MolFig(molgrid(["NCCc1c[nH]c2ccc(O)cc12", "COc1ccc2[nH]cc(CCNC(C)=O)c2c1", "NCCc1c[nH]cn1"],
    ["Serotonin", "Melatonin", "Gistamin"] if lang == "uz" else ["Serotonin", "Melatonin", "Histamine"], 470, 520))


# ---------------------------------------------------------------- 12-mavzu
def haworth(ax, x0, subs, title, ring_o="O"):
    """subs: {atom: (yuqori, past)} C1..C5 uchun; Xeuors proyeksiyasi."""
    P = {"O": (.8, .55), "C1": (1.35, 0), "C2": (.8, -.45), "C3": (-.2, -.45), "C4": (-.75, 0), "C5": (-.2, .55)}
    P = {k: (x + x0, y) for k, (x, y) in P.items()}
    order = ["C5", "O", "C1", "C2", "C3", "C4", "C5"]
    for a, b in zip(order, order[1:]):
        thick = {a, b} <= {"C1", "C2", "C3", "C4"}
        ax.plot([P[a][0], P[b][0]], [P[a][1], P[b][1]], color=INK, lw=5 if thick else 1.8, solid_capstyle="round", zorder=1)
    ax.add_patch(plt.Circle(P["O"], .13, fc="white", ec="none", zorder=2))
    ax.text(*P["O"], ring_o, ha="center", va="center", fontsize=15, color="#d62728", zorder=3)
    for k, (up, dn) in subs.items():
        x, y = P[k]
        for t, d in ((up, 1), (dn, -1)):
            if not t: continue
            ax.plot([x, x], [y, y + .42 * d], color=INK, lw=1.6, zorder=0)
            ax.text(x, y + .55 * d, t, ha="center", va="center", fontsize=12.5, color="#d62728" if "OH" in t and "CH" not in t else INK)
    ax.text(x0 + .3, -1.35, title, ha="center", fontsize=13, color=INK)


@fig("t12_glukoza")
def t12_glukoza(lang):
    f, ax = plt.subplots(figsize=(12, 5.2))
    ax.set_aspect("equal"); ax.axis("off"); ax.set_xlim(-1.3, 6.4); ax.set_ylim(-1.6, 1.6)
    base = {"C2": ("H", "OH"), "C3": ("OH", "H"), "C4": ("H", "OH"), "C5": ("CH$_2$OH", "")}
    haworth(ax, 0, dict(base, C1=("H", "OH")), T(lang, "α-D-glyukopiranoza", "α-D-glucopyranose"))
    haworth(ax, 3.8, dict(base, C1=("OH", "H")), T(lang, "β-D-glyukopiranoza", "β-D-glucopyranose"))
    ax.annotate("", (2.55, 0), (1.95, 0), arrowprops=dict(arrowstyle="<->", color=MUTED, lw=1.4))
    ax.text(2.25, .18, T(lang, "mutarotatsiya", "mutarotation"), ha="center", fontsize=10.5, color=MUTED)
    return f


def molgrid_txt(smiles_list, legends, w=470, h=470):
    """RDKit rasmlari + ostida DejaVu shriftida yozuv (yunon harflari uchun)."""
    from PIL import ImageDraw, ImageFont
    im = molgrid(smiles_list, [""] * len(smiles_list), w, h)
    can = Image.new("RGB", (im.width, im.height + 60), "white"); can.paste(im, (0, 0))
    dr = ImageDraw.Draw(can); font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    for i, t in enumerate(legends):
        tw = dr.textlength(t, font=font); dr.text((i * w + (w - tw) / 2, im.height - 10), t, fill="#22313f", font=font)
    return can


DISAX = ["C([C@@H]1[C@H]([C@@H]([C@H]([C@H](O1)O[C@@H]2[C@H](OC([C@@H]([C@H]2O)O)O)CO)O)O)O)O",
         "C([C@@H]1[C@H]([C@@H]([C@H]([C@H](O1)O[C@]2([C@H]([C@@H]([C@H](O2)CO)O)O)CO)O)O)O)O",
         "C([C@@H]1[C@@H]([C@@H]([C@H]([C@@H](O1)O[C@@H]2[C@H](O[C@H]([C@@H]([C@H]2O)O)O)CO)O)O)O)O"]
FIGS["t12_disaxarid"] = lambda lang: MolFig(molgrid_txt(DISAX,
    ["Maltoza (α-1,4)", "Saxaroza (α-1,β-2)", "Laktoza (β-1,4)"] if lang == "uz" else ["Maltose (α-1,4)", "Sucrose (α-1,β-2)", "Lactose (β-1,4)"]))



# ---------------------------------------------------------------- 13-mavzu
@fig("t13_zaryad")
def t13_zaryad(lang):
    import numpy as np
    ph = np.linspace(0, 14, 600); p1, p2 = 2.34, 9.60
    q = 1 / (1 + 10 ** (ph - p1)) - 1 / (1 + 10 ** (p2 - ph))
    f, ax = plt.subplots(figsize=(10, 5.8))
    ax.plot(ph, q, color=C1, lw=2.6); ax.axhline(0, color=MUTED, lw=.8)
    pi = (p1 + p2) / 2
    ax.plot([pi], [0], "o", color=C2, ms=8)
    ax.annotate(("pI = 5,97" if lang == "uz" else "pI = 5.97"), (pi, 0), (pi + .6, .35), fontsize=11.5, color=C2,
                arrowprops=dict(arrowstyle="->", color=C2))
    for x, t in ((p1, "pK$_1$"), (p2, "pK$_2$")):
        ax.axvline(x, color=MUTED, ls=":", lw=1); ax.text(x + .1, -.95, t, fontsize=11, color=MUTED)
    ax.text(.3, .8, "$^+$H$_3$N−CH$_2$−COOH", fontsize=11.5, color=INK)
    ax.text(4.0, .12, "$^+$H$_3$N−CH$_2$−COO$^−$", fontsize=11.5, color=INK)
    ax.text(10.1, -.78, "H$_2$N−CH$_2$−COO$^−$", fontsize=11.5, color=INK)
    ax.set_xlim(0, 14); ax.set_ylim(-1.1, 1.1); ax.set_yticks([-1, -.5, 0, .5, 1])
    ax.set_xlabel("pH"); ax.set_ylabel(T(lang, "Umumiy zaryad", "Net charge"))
    ax.set_title(T(lang, "Glitsin zaryadining pH ga bog‘liqligi", "Dependence of the charge of glycine on pH"), fontsize=12.5, color=INK)
    ax.grid(alpha=.25)
    if lang == "uz":
        from matplotlib.ticker import FuncFormatter
        ax.yaxis.set_major_formatter(FuncFormatter(lambda y, _: f"{y:.1f}".replace(".", ",").replace("-", "−")))
    return f


FIGS["t13_peptid"] = lambda lang: MolFig(molgrid_txt(["NCC(=O)N[C@@H](C)C(=O)O", "N[C@@H](CCC(=O)N[C@@H](CS)C(=O)NCC(=O)O)C(=O)O"],
    ["Glitsilalanin (Gly-Ala)", "Glutation (γ-Glu-Cys-Gly)"] if lang == "uz" else ["Glycylalanine (Gly-Ala)", "Glutathione (γ-Glu-Cys-Gly)"], 700, 470))

FIGS["t14_atf"] = lambda lang: MolFig(molgrid_txt([
    "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O",
    "Nc1ncnc2c1ncn2[C@@H]1O[C@@H]3COP(=O)(O)O[C@H]3[C@H]1O"],
    ["ATF (adenozintrifosfat)", "sAMF (3′,5′-siklik AMF)"] if lang == "uz" else ["ATP (adenosine triphosphate)", "cAMP (3′,5′-cyclic AMP)"], 700, 470))

FIGS["t15_yogkislota"] = lambda lang: MolFig(molgrid_txt([
    "CCCCCCCCCCCCCCCCCC(=O)O", "CCCCCCCC/C=C\\CCCCCCCC(=O)O", "CCCCC/C=C\\C/C=C\\CCCCCCCC(=O)O"],
    ["Stearin (C18:0)", "Olein (C18:1, ω-9)", "Linol (C18:2, ω-6)"] if lang == "uz" else ["Stearic (C18:0)", "Oleic (C18:1, ω-9)", "Linoleic (C18:2, ω-6)"], 470, 470))
FIGS["t15_steroid"] = lambda lang: MolFig(molgrid_txt([
    "C[C@H](CCCC(C)C)[C@H]1CC[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC=C4[C@@]3(CC[C@@H](C4)O)C)C",
    "C[C@]12CCC(=O)C=C1CC[C@@H]3[C@@H]2[C@H](C[C@]4([C@H]3CC[C@@]4(C(=O)CO)O)C)O",
    "C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=C3C=CC(=C4)O"],
    ["Xolesterin", "Kortizol", "Estradiol"] if lang == "uz" else ["Cholesterol", "Cortisol", "Estradiol"], 470, 470))

FIGS["t10_keton"] = lambda lang: MolFig(molgrid_txt(["CC(=O)CC(=O)O", "C[C@@H](O)CC(=O)O", "CC(C)=O"],
    ["Atsetosirka kislota", "β-Gidroksimoy kislota", "Atseton"] if lang == "uz" else ["Acetoacetic acid", "β-Hydroxybutyric acid", "Acetone"], 470, 400))
FIGS["t11_alkaloid"] = lambda lang: MolFig(molgrid_txt([
    "CN1C2CCC1CC(C2)OC(=O)C(CO)c1ccccc1",
    "CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O",
    "COC1=CC2=C(C=CN=C2C=C1)[C@H]([C@@H]3C[C@@H]4CCN3C[C@@H]4C=C)O",
    "Cn1cnc2c1c(=O)n(C)c(=O)n2C"],
    ["Atropin", "Morfin", "Xinin", "Kofein"] if lang == "uz" else ["Atropine", "Morphine", "Quinine", "Caffeine"], 420, 420))
FIGS["t15_eikozanoid"] = lambda lang: MolFig(molgrid_txt([
    "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)O",
    "CCCCC[C@@H](/C=C/[C@H]1[C@@H](CC(=O)[C@@H]1C/C=C\\CCCC(=O)O)O)O",
    "CCCCC/C=C\\C[C@H](/C=C/C=C/C=C\\[C@H](CCCC(=O)O)O)O"],
    ["Araxidon kislota", "Prostaglandin E₂", "Leykotriyen B₄"] if lang == "uz" else ["Arachidonic acid", "Prostaglandin E₂", "Leukotriene B₄"], 520, 470))


FIG_ORDER = list(FIGS)


def main():
    names = sys.argv[1:] or list(FIGS)
    for n in names:
        for lang in ("uz", "en"):
            if lang == "en" and n in LANG_FREE: continue
            sz = save(n, FIGS[n](lang), lang)
        print(n, sz)


if __name__ == "__main__":
    main()
