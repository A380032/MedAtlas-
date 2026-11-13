T = {}
T["p15_1"] = {0: "Action of the\npathogenic factor", 1: "Latent\nperiod", 2: "Prodromal period", 3: "Period of manifest\ndisease (clinical signs)", 4: "Outcome of\nthe disease",
              5: "Full recovery", 6: "Partial recovery", 7: "Relapse /\ntransition to a chronic form", 8: "Death\n(via terminal states)"}
T["p17_2"] = {0: "Contributing conditions\n(chilling, starvation, stress, fatigue)", 1: "Hindering conditions\n(proper nutrition, hardening, vaccination)",
              2: {"t": "enhance", "a": "l"}, 3: {"t": "weaken", "a": "l"}, 4: "Cause\n(etiological factor)", 5: "ORGANISM", 6: "DISEASE"}
T["p20_3"] = {0: "Blood loss", 1: "Decrease in circulating\nblood volume", 2: "Decrease in venous\nreturn to the heart", 3: "Fall in stroke volume\nand cardiac output",
              4: "Arterial pressure falls", 5: "vicious circle", 6: "Coronary blood flow\ndecreases → myocardial hypoxia", 7: "Myocardial contractility\nweakens further"}
T["p29_4"] = {0: "High temperature + humidity,\nheavy physical work", 1: "Decreased\nheat loss", 2: "Rise in body temperature\n(hyperthermia)", 3: "Profuse sweating →\ndehydration, loss of Na⁺ and Cl⁻",
              4: "Dilation of\nskin vessels", 5: "Blood thickens,\ncirculating blood volume falls", (6, 7): "vicious circle", 8: "Arterial pressure falls\n(collapse)",
              9: "Cerebral hypoxia\nand edema", 10: "Heat stroke:\nloss of consciousness, seizures, risk of death", 11: "Failure of the\nthermoregulatory center"}
T["p15_1"][0] = "Pathogenic\nfactor acts"; T["p15_1"][3] = "Manifest period\n(clinical signs)"
T["p34_5"] = {0: "3 white mice\n(of equal weight)", 1: "Mouse 1:\nroom temperature (+20 °C)\n— control", 2: "Mouse 2:\ncooled (+5 °C, until\nbody temperature falls)", 3: "Mouse 3:\nheated (+40 °C)",
              4: "Reducing the pressure in the\npressure chamber at the same rate\n(“ascent to altitude”)",
              5: "Recording the “altitude” and time\nat which each stage appears:\nexcitation → change in breathing →\ncyanosis → convulsions → agonal breathing"}
T["p42_6"] = {0: "REACTIVITY", 1: "Biological (species)\nreactivity", 2: "Group reactivity\n(age, sex, constitution)", 3: "Individual\nreactivity", 4: "Physiological\n(normal)", 5: "Pathological",
              6: "Specific\n(immunological)", 7: "Nonspecific", 8: "Hyperergy", 9: "Hypoergy", 10: "Dysergy", 11: "Anergy"}
T["p49_9"] = {0: "3 white mice", 1: "Mouse 1:\nphysiological saline\n— control", 2: "Mouse 2:\nnarcotic agent\n(inhibition, sleep)", 3: "Mouse 3:\ncaffeine\n(excitation)",
              4: "“Ascent to altitude” at the same\nrate in the pressure chamber", 5: "Comparing the “altitude” and time\nat which the stages of hypoxia appear"}
T["p60_11"] = {0: "Impaired outflow of\nblood through the veins", 1: "Venules and capillaries dilate,\nblood flow slows", 2: "Hydrostatic pressure in\nthe capillaries rises",
               3: "O₂ falls and CO₂ rises in the blood\n(reduced Hb increases)", 4: "Edema (transudate)", 5: "Cyanosis, fall in temperature", 6: "Tissue hypoxia", 7: "Dystrophy, atrophy,\nsclerosis (induration)"}
T["p70_12"] = {0: "Damage to the vessel wall\n(endothelium)\n(atherosclerosis, inflammation,\ninjury, catheter)", 1: "Slowing and turbulence\nof blood flow\n(venous stasis, arrhythmia,\naneurysm, prolonged bed rest)",
               2: "Increased blood coagulability\n(hypercoagulation)\n(tumor, pregnancy,\nthrombophilias)", 3: "THROMBOSIS"}
T["p72_13"] = {0: "Intestinal and splenic veins", 1: "Portal vein\n(liver)", 2: "Veins of the\nsystemic circulation", 3: "Right atrium\nand ventricle", 4: "Branches of the\npulmonary artery",
               (5, 6): "paradoxical embolism\n(patent foramen ovale)", 7: None, 8: "Pulmonary veins,\nleft atrium and ventricle,\naorta", 9: "Systemic arteries:\nbrain, kidney, spleen,\nintestine, legs"}
T["p81_14"] = {0: "Phlogogenic factor", 1: "Primary alteration\n(direct action of the factor)", 2: "Mediators of inflammation\n(histamine, serotonin, kinins,\nprostaglandins, leukotrienes,\ncytokines, complement)",
               3: "Secondary alteration\n(lysosomal enzymes,\nfree radicals, acidosis)", 4: "Vascular reactions and\nmicrocirculatory disturbance", 5: "Exudation\n(increased permeability)",
               6: "Leukocyte emigration\nand phagocytosis", 7: "Proliferation and\nrepair (reparation)"}
T["p93_17"] = {0: "1. Approach\n(chemotaxis)", 1: "2. Adhesion\n(opsonins: IgG, C3b)", 2: "3. Engulfment\n(phagosome formation)", 3: "4. Phagolysosome",
               4: "Oxygen-dependent:\nNADPH oxidase → O₂⁻, H₂O₂\nmyeloperoxidase → HOCl\n(“respiratory burst”)", 5: "Oxygen-independent:\nlysozyme, defensins,\nlactoferrin, proteases", 6: "5. Killing and digestion"}
T["p103_18"] = {0: "Allergen (first exposure)", 1: "I. Immunological stage\nsensitization: formation of IgE (or IgG, IgM,\nsensitized T lymphocytes)\n(7–14 days)", 2: "Repeated exposure to the allergen",
                3: "II. Pathochemical stage\nrelease of mediators: histamine,\nleukotrienes, prostaglandins, PAF,\ncomplement, cytokines",
                4: "III. Pathophysiological stage\n(clinical manifestations): bronchospasm,\nincreased vascular permeability, edema,\nhypotension, itching"}
T["p105_19"] = {0: "Allergen + IgE\non the surface of mast cells\nand basophils (FcεRI)", 1: "Degranulation:\nhistamine, tryptase,\nleukotrienes, PAF", 2: "Increased permeability →\nplasma leaks into the tissue",
                3: "Bronchospasm,\nlaryngeal edema", 4: "Sharp dilation\nof vessels", 5: "Decrease in circulating\nblood volume", 6: "Asphyxia, hypoxia", 7: "Sharp fall in arterial\npressure (shock)"}
T["p118_21"] = {0: "Heart failure", 1: "Cardiac output decreases", 2: "Renal perfusion decreases", 3: "Renin → angiotensin II\n→ aldosterone", 4: "ADH secretion increases",
                5: "Na⁺ and water are retained,\ncirculating blood volume increases", 6: "Venous pressure rises", 7: "Hydrostatic pressure in\nthe capillaries rises", 8: "Edema (begins in the legs)"}
T["p139_24"] = {0: "Acid–base imbalance", 1: "ACIDOSIS\npH < 7.35", 2: "ALKALOSIS\npH > 7.45", 3: "Respiratory (gaseous) acidosis\npCO₂ ↑ (> 45 mm Hg)\nhypoventilation",
                4: "Metabolic (non-gaseous) acidosis\nHCO₃⁻ ↓ (< 22 mmol/l)\nketoacidosis, lactic acidosis,\nrenal failure, diarrhea", 5: "Respiratory (gaseous) alkalosis\npCO₂ ↓ (< 35 mm Hg)\nhyperventilation",
                6: "Metabolic (non-gaseous) alkalosis\nHCO₃⁻ ↑ (> 26 mmol/l)\nvomiting, diuretics,\nhyperaldosteronism"}
T["p153_26"] = {0: "Endothelial dysfunction\n(hypertension, smoking, hyperglycemia,\nexcess LDL)", 1: "LDL enters the intima\nand is oxidized", 2: "Monocytes enter →\nmacrophages → foam cells\n(fatty streaks)",
                3: "Migration and proliferation\nof smooth muscle cells,\ncollagen synthesis", 4: "Fibrous plaque\n(lipid core + fibrous cap)", 5: "Complicated plaque:\nrupture, thrombosis, calcification,\nhemorrhage"}
T["p161_27"] = {0: "Damaging factor\n(hypoxia, toxins, radicals,\nmicrobes, immune factors)", 1: "Impaired energy\nsupply (ATP ↓)", 2: "Damage to the\ngenetic apparatus",
                3: "Ion and water imbalance\n(Na⁺, Ca²⁺ in the cell ↑,\nK⁺ ↓, cell swelling)", 4: "Impaired regulatory\nmechanisms (receptors,\nsecond messengers)",
                5: "Rise of Ca²⁺ in the cytoplasm →\nactivation of phospholipases,\nproteases, endonucleases", 6: "vicious circle",
                7: "Damage to membranes\nand enzymes\n(lipid peroxidation,\nphospholipases)", 8: "Reversible changes (dystrophy)\nor irreversible — necrosis, apoptosis"}
T["p194_33"] = {0: "Mutation of a hematopoietic cell\n→ leukemic clone", 1: "Bone marrow filled with\nblast or leukemic\ncells", 2: "Intoxication: fever,\nsweating, weight loss", 3: "Displacement of\nnormal hematopoiesis",
                4: "Leukemic infiltration:\nliver, spleen, lymph nodes,\nmeninges, gums, skin", 5: "Anemic syndrome\n(erythrocytes ↓)", 6: "Hemorrhagic syndrome\n(platelets ↓)", 7: "Infectious complications\n(mature neutrophils ↓)"}
T["p206_35"] = {0: "HEMOLYSIS", 1: "Intravascular hemolysis\n(in the blood: incompatible blood,\nmalaria, toxins, prosthetic valve)", 2: "Extravascular hemolysis\n(in splenic macrophages:\nspherocytosis, thalassemia, autoimmune)",
                3: "Hemoglobinemia,\nhemoglobinuria (dark urine),\ndecreased haptoglobin", 4: "Indirect bilirubin ↑ (jaundice),\nsplenomegaly, gallstones"}
T["p216_37"] = {0: "Dietary B₁₂\n(animal products)", 1: "Stomach: released from protein\n(HCl, pepsin)", 2: "Parietal cells of the\ngastric fundus:\nCastle's intrinsic factor", 3: "B₁₂ + intrinsic factor\ncomplex",
                4: "Absorption in the\nterminal ileum", 5: "Transcobalamin → tissues\n(3–5-year store in the liver)"}
import json as _j
from PIL import ImageFont as _IF
_F = _IF.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
def _tb(n): return _j.load(open(f"blk/pfz/{n}.json"))["blocks"][0]["tb"]
for n, t in {"p226_38": "Normal sinus rhythm, 75 beats/min", "p228_39": "Sinus tachycardia, 125 beats/min", "p228_40": "Sinus bradycardia, 45 beats/min", "p228_41": "Sinus arrhythmia (respiratory)",
             "p230_42": "Atrial extrasystole (altered P, narrow QRS, incomplete compensatory pause)", "p230_43": "Ventricular extrasystole (no P, wide QRS, inverted T, complete compensatory pause)",
             "p237_44": "First-degree AV block: PQ 0.32 s, every P is followed by a QRS",
             "p238_45": "Second-degree AV block, Mobitz I (Wenckebach periods): PQ lengthens progressively until a QRS is dropped",
             "p238_46": "Second-degree AV block, Mobitz II: PQ constant, some P waves are not followed by a QRS",
             "p238_47": "Third-degree (complete) AV block: P and QRS are independent, idioventricular rhythm 30 beats/min",
             "p240_48": "Atrial fibrillation: no P, f waves, irregular RR intervals", "p240_49": "Atrial flutter: “sawtooth” F waves, 4:1 conduction"}.items():
    _w = int(_F.getlength(t)) + 1
    T[n] = {0: None, "x": [{"box": [6, 8, max(_w + 16, _tb(n)[2] + 6), 28], "t": " ", "bg": "#fefafa", "s": 6},
                           {"box": [10, 9, 10 + _w + 4, 27], "t": t, "f": "dvb", "s": 11, "a": "l", "bg": "none", "c": "#1f2a44"}]}
T["p248_50"] = {0: "1. Emergency stage\nthe load rises suddenly; work per\nunit mass increases,\nmitochondria are overstrained,\nprotein synthesis is activated",
                1: "2. Stage of stable hyperfunction\n(relatively stable)\nmyocardial mass has increased,\nwork per unit mass is normalized",
                2: "3. Stage of gradual exhaustion\nand cardiosclerosis\ncapillaries, innervation and\nmitochondria lag behind\n→ decompensation"}
T["p249_51"] = {0: "Decreased cardiac output", 1: "Increased ADH\n(vasopressin)", 2: "Renal perfusion ↓\n→ renin–angiotensin–\naldosterone system", 3: "Activation of the\nsympathoadrenal system", 4: "vicious circle",
                5: "Na⁺ and water retention,\nblood volume ↑\n(preload ↑)", 6: "Tachycardia,\nperipheral vasoconstriction\n(afterload ↑)", 7: "Edema, venous congestion",
                8: "Myocardial oxygen\ndemand ↑, remodeling,\nfibrosis, apoptosis"}
T["p262_53"] = {0: "Exogenous\n(low O₂ in the air:\nmountains, closed room)", 1: "Respiratory:\nimpaired ventilation,\ndiffusion, perfusion", 2: "Hemic (blood):\nanemia, carbon monoxide,\nmethemoglobin", 3: "HYPOXIA",
                4: "Circulatory:\nischemic,\ncongestive, shock", 5: "Tissue (histotoxic):\ncyanide, mitochondrial\ndamage", 6: "Mixed, overload\n(exertional) hypoxia"}
T["p284_56"] = {0: "Senescent erythrocytes\n(macrophages of the spleen and bone marrow)", 1: "Indirect (free, unconjugated)\nbilirubin — insoluble in water,\ncarried in the blood by albumin",
                2: "Liver cell:\nuptake → conjugation with glucuronic acid\nby UDP-glucuronyltransferase", 3: "Direct (conjugated) bilirubin —\nwater-soluble, passes with bile into the intestine",
                4: "Bacteria in the intestine:\nurobilinogen (mesobilinogen)", 5: "Stercobilinogen → stercobilin\n(stool color)",
                6: "Partly reabsorbed and returns to the liver\n(enterohepatic circulation);\na small part in the urine — urobilin"}
T["p297_58"] = {0: "ACUTE RENAL FAILURE\n(acute kidney injury)", 1: "Prerenal\nrenal perfusion ↓", 2: "Renal\nparenchymal damage", 3: "Postrenal\nurine outflow obstructed",
                4: "shock, blood loss, dehydration,\nheart failure", 5: "acute tubular necrosis (ischemia,\nnephrotoxins), glomerulonephritis", 6: "stones, prostate adenoma,\ntumors",
                7: "Oliguria / anuria → azotemia, hyperkalemia,\nmetabolic acidosis, overhydration"}
T["p307_61"] = {0: "MECHANISMS OF ENDOCRINE DISORDERS", 1: "Central (hypothalamus,\npituitary) — impaired\nregulation\n(tumor, trauma, infection)",
                2: "In the gland itself\n(primary) — impaired synthesis\nor secretion\n(autoimmune, tumor, enzyme defect)", 3: "Extraglandular\n(peripheral) — impaired transport,\nmetabolism or receptors\n(resistance)"}
T["p322_63"] = {0: "Preagonal state\nconsciousness clouded, BP very low,\npulse thready, breathing rapid and shallow", 1: "Terminal pause\n(from a few seconds\nto 2–4 minutes)\nbreathing stops, bradycardia",
                2: "Agony\nactivity of the bulbar centers:\ngasping breathing, brief rise\nin BP, convulsions", 3: "Clinical death\n(4–6 minutes at normal temperature)\nbreathing and heartbeat have stopped,\nno reflexes — REVERSIBLE",
                4: "Biological death\nirreversible changes\n(first of all in the cerebral cortex)"}
T["p34_5"][4] = "Lowering the chamber pressure\nat the same rate\n(“ascent to altitude”)"
T["p139_24"][3] = "Respiratory acidosis\npCO₂ ↑ (> 45 mm Hg)\nhypoventilation"; T["p139_24"][4] = "Metabolic acidosis\nHCO₃⁻ ↓ (< 22 mmol/l)\nketoacidosis, lactic acidosis,\nrenal failure, diarrhea"
T["p139_24"][5] = "Respiratory alkalosis\npCO₂ ↓ (< 35 mm Hg)\nhyperventilation"; T["p139_24"][6] = "Metabolic alkalosis\nHCO₃⁻ ↑ (> 26 mmol/l)\nvomiting, diuretics,\nhyperaldosteronism"
T["p72_13"][0] = "Intestinal and\nsplenic veins"
T["p297_58"] = {0: "ACUTE RENAL FAILURE\n(acute kidney injury)", 1: "Prerenal\nrenal perfusion ↓\n\nshock, blood loss, dehydration,\nheart failure",
                2: "Renal\nparenchymal damage\n\nacute tubular necrosis (ischemia,\nnephrotoxins), glomerulonephritis", 3: "Postrenal\nurine outflow obstructed\n\nstones, prostate adenoma,\ntumors",
                4: "Oliguria / anuria → azotemia, hyperkalemia,\nmetabolic acidosis, overhydration"}
T["p285_57"] = {0: "JAUNDICE\n(blood bilirubin > 20.5 µmol/l)", 1: "Prehepatic (hemolytic)\nbilirubin formation ↑\n\nindirect ↑ in blood\nno bilirubin in urine,\nurobilin ↑; dark stool",
                2: "Hepatic (parenchymal)\nhepatocytes damaged\n\nindirect and direct ↑ in blood\nbilirubin in urine, urobilin ↑;\npaler stool",
                3: "Posthepatic (obstructive)\nbile outflow blocked\n\ndirect ↑↑, bile acids ↑ in blood\nbilirubin in urine (dark),\nno urobilin; white (acholic) stool"}
T["p127_22"] = {0: "INSULIN\n(β cells)\n• glucose entry into cells (GLUT4)\n• glycogenesis, lipogenesis, protein synthesis\n• stops gluconeogenesis",
                1: "COUNTER-INSULIN HORMONES\nglucagon, epinephrine, cortisol,\ngrowth hormone, thyroid hormones\n• glycogenolysis, gluconeogenesis\n• lipolysis",
                2: {"t": "lowers", "a": "l"}, 3: {"t": "raises", "a": "l"}, 4: "Blood glucose\n3.3–5.5 mmol/l (fasting)"}
T["p273_55"] = {0: {"t": "AGGRESSIVE FACTORS\n  • Helicobacter pylori\n  • HCl and pepsin hypersecretion\n  • NSAIDs, glucocorticoids\n  • smoking, stress\n  • bile acid reflux\n  • impaired evacuation", "a": "l"},
                1: {"t": "increase", "a": "l"}, 2: "If the balance shifts\ntoward aggression →\nULCER", 3: {"t": "weaken", "a": "l"},
                4: {"t": "PROTECTIVE FACTORS\n  • mucus–bicarbonate barrier\n  • prostaglandins (E₂, I₂)\n  • good blood supply\n  • rapid epithelial renewal\n  • antroduodenal “acid brake”", "a": "l"}}
T["p127_22"][2] = {"t": "lowers", "a": "l", "s": 13}; T["p127_22"][3] = {"t": "raises", "a": "l", "s": 13}
T["p57_10"] = {"c": "#1c1c1c", "smax": 9, 0: "ARTERIAL HYPEREMIA\n(dilation of arterioles)", 1: "Neurotonic\ntone of vasodilator nerves rises\n(acetylcholine, NO)", 2: "Neuroparalytic\nsympathetic (vasoconstrictor)\ninfluence is lost",
               3: "Neuromyoparalytic (metabolic)\nlocal metabolites: adenosine,\nCO₂, H⁺, K⁺, lactate", 4: "Humoral\nhistamine, bradykinin,\nprostaglandins, NO", 5: "Reactive (postischemic)\nrestoration of blood flow\nafter ischemia"}
T["p83_15"] = {"c": "#1c1c1c", "smax": 12, 0: "1. Brief spasm\nof arterioles\n(seconds)", 1: "2. Arterial hyperemia\n(10–30 minutes)", 2: "3. Venous hyperemia\n(hours, days)", 3: "4. Prestasis\n(pendulum-like movement)", 4: "5. Stasis"}
T["p91_16"] = {"c": "#1c1c1c", "smax": 8, 0: "1. Margination\n(leukocytes move to\nthe vessel wall)", 1: "2. Rolling\nselectins: P-, E-selectin", 2: "3. Firm adhesion\nintegrins (LFA-1, Mac-1)\n+ ICAM-1, VCAM-1",
               3: "4. Diapedesis (transmigration)\nbetween endothelial cells\n(PECAM-1)", 4: "5. Chemotaxis\ntoward the focus of inflammation\n(C5a, LTB₄, IL-8, bacterial peptides)", 5: "6. Phagocytosis"}
T["p117_20"] = {0: None, 1: None, 2: None, 3: None, 4: None, 5: None, 6: None, "x": [
    {"box": [11, 9, 144, 35], "t": "Hydrostatic factor\ncapillary pressure ↑\n(heart failure, venous thrombosis)", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [162, 9, 271, 35], "t": "Oncotic factor\nplasma albumin ↓\n(nephrotic syndrome,\nstarvation, cirrhosis)", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [290, 9, 403, 35], "t": "Membranogenic factor\nvascular permeability ↑\n(inflammation, allergy, toxins)", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [421, 9, 513, 35], "t": "Osmotic factor\nNa⁺ and osmotically active\nsubstances build up in tissue", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [531, 7, 648, 37], "t": "Lymphogenic factor\nimpaired lymph outflow\n(lymph node removal,\nfilariasis)", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [666, 9, 751, 35], "t": "Neurohumoral factor\nRAAS, aldosterone, ADH\n→ Na⁺ and water retention", "f": "dv", "smax": 8, "c": "#1c1c1c"},
    {"box": [358, 55, 456, 80], "t": "EDEMA\n(excess accumulation of\ninterstitial fluid)", "f": "dv", "smax": 8, "c": "#1c1c1c"}]}
T["p173_29"] = {"c": "#1c1c1c", "smax": 8, 0: "Carcinogenic factor\n(chemical, physical, viral)", 1: "1. INITIATION\nIrreversible DNA damage:\nactivation of proto-oncogenes,\ninactivation of tumor suppressor genes",
                2: "2. PROMOTION\nStimulation of proliferation\nof the initiated cell\n(hormones, chronic inflammation)", 3: "Transformed cell\n(start of the tumor clone)",
                4: "3. PROGRESSION\nNew mutations, growing\nmalignancy:\ninvasion, metastasis"}
T["p174_30"] = {"c": "#1c1c1c", "smax": 8, 0: "Primary tumor", 1: "Detachment of cells\n(E-cadherin ↓)", 2: "Invasion of basement\nmembrane and stroma\n(metalloproteinases)", 3: "Entry into vessel\n(intravasation)",
                4: "Survival in blood or\nlymph flow (platelet\n“shield”)", 5: "Exit from vessel\n(extravasation)", 6: "Growth at a new site,\nangiogenesis → metastasis"}
T["p181_31"] = {"c": "#1c1c1c", "smax": 9, 0: "Myeloblast", 1: "Promyelocyte", 2: "Myelocyte", 3: "Metamyelocyte\n(juvenile)", 4: "Band\nneutrophil", 5: "Segmented\nneutrophil",
                6: "Shift to the right →\n5 or more segments\n(B₁₂ deficiency)", 7: "← Shift to the left:\nyoung forms increase in blood\n(purulent infection, sepsis)"}
T["p182_32"] = {"c": "#1c1c1c", "smax": 10, 0: "LEUKOCYTOSIS", 1: "Redistributive\n(from the marginal pool)\nexercise, stress, epinephrine", 2: "Accelerated release\nfrom the bone marrow\n(glucocorticoids, endotoxin)",
                3: "True (absolute)\nincreased leukopoiesis\n(G-CSF, GM-CSF, IL-1, IL-6)", 4: "Relative (hemoconcentration)\ndehydration, blood thickening"}
T["p205_34"] = {"c": "#1c1c1c", "smax": 8, 0: "Acute blood loss", 1: "1. Reflex (vascular) stage\nfirst hours\nvasospasm, release of blood from depots,\ntachycardia; Hb and Ht still unchanged",
                2: "2. Hydremic stage\n1–3 days\ntissue fluid passes into the blood\n→ blood is diluted, Hb and Ht fall", 3: "3. Bone marrow stage\nfrom day 4–5\nerythropoietin → erythropoiesis ↑,\nreticulocytosis",
                4: "Recovery\n(if iron stores are\nsufficient, 4–6 weeks)"}
T["p214_36"] = {"c": "#1c1c1c", "smax": 9, 0: "Dietary iron\n(10–20 mg per day)", 1: "Duodenal enterocytes:\nabsorption 1–2 mg\n(Fe³⁺ → Fe²⁺, DMT1)", 2: "Bone marrow\n(hemoglobin synthesis)", 3: "Hepcidin (liver)\nblocks ferroportin",
                4: "Ferroportin → blood", 5: "Transferrin\n(transport)", 6: "Stores: ferritin, hemosiderin\n(liver, spleen, bone marrow)", 7: "Macrophages: reuse of\niron from senescent\nerythrocytes",
                "x": [{"box": [604, 30, 644, 43], "t": "120 days", "f": "dv", "s": 8, "bg": "#ffffff", "c": "#1c1c1c"}]}
T["p91_16"][5] = {"t": "6. Phagocytosis", "d": [-4, 0, 4, 0]}
T["p150_25"] = {0: "Absolute insulin deficiency\n+ excess of counter-insulin hormones", 1: "Glucose entry into cells\ndecreases,\ngluconeogenesis increases", 2: "Lipolysis increases →\nfree fatty acids",
                3: "Hyperglycemia", 4: "Glucosuria → osmotic diuresis\n→ dehydration, loss of Na⁺ and K⁺", 5: "Ketone bodies in the liver\n(acetoacetic, β-hydroxybutyric\nacids, acetone)",
                6: "Hypovolemia, decreased\nrenal perfusion", 7: None, 8: "Metabolic acidosis\n(Kussmaul breathing)", 9: "KETOACIDOTIC COMA"}
T["p306_60"] = {0: "HYPOTHALAMUS\nliberins (CRH, TRH, GnRH, GHRH)\nstatins (somatostatin, dopamine)", 1: None, 2: "portal vessels", 3: "axons", 4: "ADENOHYPOPHYSIS\nACTH, TSH, LH/FSH, GH, prolactin",
                5: "NEUROHYPOPHYSIS\nADH, oxytocin\n(synthesized in the hypothalamus)", 6: "long feedback\nloop (–)", 7: "tropic hormones", 8: "short feedback\nloop (–)", 9: None,
                10: "Peripheral glands:\nadrenal cortex, thyroid gland,\ngonads; liver (IGF-1)", 11: "peripheral hormones", 12: "Target tissues\n(hormone action)"}
T["p318_62"] = {0: "Shock-inducing factor\n(blood loss, pain, endotoxin,\ncardiac damage, allergen)", 1: "Circulating blood volume ↓ or\ncardiac output ↓ or vascular tone ↓",
                6: "Compensation: sympathoadrenal system,\nRAAS, ADH → tachycardia, vasoconstriction,\ncentralization of the circulation", 7: "Ischemia of peripheral organs (skin,\nintestine, kidney, muscle), hypoxia,\nlactic acidosis",
                8: "vicious circle", 9: "Microcirculatory disturbance:\nprecapillary sphincters relax,\nvenules remain constricted → blood stasis,\nplasma leakage, sludge, DIC",
                14: "Decentralization of the circulation:\nvenous return and cardiac output fall further,\nischemia of the brain and heart", 15: "Multiple organ failure\n(shock lung, shock kidney, liver, intestine)\n→ irreversible shock",
                2: None, 3: None, 4: None, 5: None, 10: None, 11: None, 12: None, 13: None}
_L = {"f": "serifbi", "bg": "#ffffff"}
T["p46_7"] = {0: None, 1: None, "x": [{"box": [60, 440, 94, 472], "t": "a", "s": 24, **_L}, {"box": [250, 440, 284, 472], "t": "b", "s": 24, **_L}, {"box": [456, 440, 490, 472], "t": "c", "s": 24, **_L}, {"box": [654, 440, 688, 472], "t": "d", "s": 24, **_L}], 2: None, 3: None, 4: None, 5: None}
T["p46_8"] = {**{i: None for i in range(21)}, 21: None, 22: None, 23: None, "x": [{"box": [129, 198, 149, 217], "t": "a", "s": 14, **_L}, {"box": [374, 198, 394, 217], "t": "b", "s": 14, **_L}, {"box": [635, 198, 655, 217], "t": "c", "s": 14, **_L}]}
def _c(box, t, s=12, f="inter", **k): return {"box": box, "t": t, "f": f, "s": s, "bg": "#ffffff", **k}
T["p130_23"] = {**{i: None for i in range(25)}, "x": [
    _c([108, 33, 210, 51], "Normal", 13, a="l"), _c([108, 54, 326, 72], "Impaired glucose tolerance", 13, a="l"), _c([108, 75, 240, 93], "Diabetes mellitus", 13, a="l"),
    _c([14, 120, 33, 305], "Blood glucose, mmol/l", 13, rot=90), _c([718, 159, 749, 177], "11.1", 11, c="#666666"), _c([720, 228, 747, 246], "7.8", 11, c="#666666"),
    _c([230, 433, 580, 454], "Time after glucose intake, min", 13)]}
T["p271_54"] = {**{i: None for i in range(19)}, "x": [
    _c([116, 14, 210, 30], "basal secretion", 10, c="#8a8a8a"), _c([264, 14, 330, 30], "stimulant", 10, a="l", c="#8a8a8a"),
    _c([597, 21, 752, 36], "Normal", 10, a="l"), _c([597, 38, 752, 53], "Excitable (hypersecretory)", 10, a="l"), _c([597, 55, 752, 70], "Asthenic", 10, a="l"),
    _c([597, 72, 752, 87], "Inhibited (inert)", 10, a="l"), _c([597, 89, 752, 104], "Weak (hypo-, anacid)", 10, a="l"),
    _c([9, 80, 29, 270], "Secretion volume (arbitrary units)", 11, rot=90), _c([245, 361, 370, 380], "Time, min", 12)]}
T["p299_59"] = {**{i: None for i in range(38)}, "x": [
    _c([52, 4, 412, 22], "Normal: specific gravity 1008–1026, daytime diuresis predominates", 10, f="interb", c="#1f3a5f"),
    _c([428, 5, 735, 24], "Isosthenuria + nocturia: specific gravity 1009–1011", 10, f="interb", c="#1f3a5f"),
    {"box": [280, 31, 314, 45], "t": "night", "f": "inter", "s": 9, "c": "#9a9a9a"}, {"box": [641, 31, 675, 45], "t": "night", "f": "inter", "s": 9, "c": "#9a9a9a"},
    _c([7, 50, 25, 200], "Specific gravity, 1000 + …", 11, rot=90), _c([165, 246, 272, 265], "Portion (hour)", 11), _c([526, 246, 633, 265], "Portion (hour)", 11),
    _c([230, 265, 530, 281], "Numbers above the bars — portion volume, ml", 9, c="#8a8a8a")]}
T["p260_52"] = {**{i: None for i in range(11)}, "x": [
    _c([14, 11, 730, 30], "Normal breathing (eupnea), 15 breaths/min", 11, f="interb", a="l", c="#1f2a44"),
    _c([14, 102, 730, 122], "Kussmaul breathing: deep, noisy, slow (ketoacidosis, uremia)", 11, f="interb", a="l", c="#1f2a44"),
    _c([14, 194, 730, 213], "Cheyne–Stokes breathing: waves that gradually deepen and then become shallow, followed by apnea", 11, f="interb", a="l", c="#1f2a44"),
    _c([14, 285, 730, 305], "Biot's breathing: breaths of equal depth and long apneic pauses", 11, f="interb", a="l", c="#1f2a44"),
    _c([14, 376, 730, 396], "Gasping (agonal) breathing: infrequent, short, strong “gasps”", 11, f="interb", a="l", c="#1f2a44"),
    _c([340, 471, 420, 490], "Time, s", 12)]}
T["p284_56"][0] = "Senescent erythrocytes\n(spleen and bone marrow macrophages)"; T["p284_56"][3] = "Direct (conjugated) bilirubin —\nwater-soluble, with bile to the intestine"
