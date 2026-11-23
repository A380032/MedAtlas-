"""Test battle uchun DEMO savollar (Biokimyo, 2-kurs, o'zbek va ingliz tilida).
python3 tools/battle/demo_bkm.py > /tmp/demo.sql   — keyin SQL Supabase'da ishga tushiriladi.
Har savol: (topic, diff, uz_q, [uz opts], en_q, [en opts], [to'g'ri indekslar], uz_izoh, en_izoh). Haqiqiy savollar kelgach, demo=true lar o'chiriladi."""
import json, hashlib, sys

ADMIN = "c847585e-62c4-4719-a7e2-90d9067c9d96"
TOPICS = {
  "t2": (2, "Fermentlarning tuzilishi va ta’sir mexanizmi. Ferment reaksiyalari kinetikasi. Fermentlar faolligining boshqarilishi",
         "Structure and mechanism of action of enzymes. Kinetics of enzyme reactions. Regulation of enzyme activity"),
  "t4": (4, "Biologik oksidlanish", "Biological oxidation"),
  "t6": (6, "Uglevodlar almashinuvi va funksiyalari", "Carbohydrate metabolism and functions"),
  "t9": (9, "Yog‘larning oraliq almashinuvi", "Intermediary metabolism of fats"),
}
Q = [
 # ---------- t2 Fermentlar ----------
 ("t2", 1, "Fermentlar kimyoviy tabiatiga ko‘ra asosan qanday moddalar?", ["Oqsillar", "Lipidlar", "Uglevodlar", "Mineral tuzlar"],
  "By chemical nature, enzymes are mainly which substances?", ["Proteins", "Lipids", "Carbohydrates", "Mineral salts"], [0],
  "Fermentlarning deyarli barchasi oqsil; katalitik RNK (ribozimlar) kam uchraydigan istisno.", "Almost all enzymes are proteins; catalytic RNA (ribozymes) is a rare exception."),
 ("t2", 1, "Mixaelis konstantasi (Km) nimani bildiradi?", ["Reaksiya tezligi maksimal tezlikning yarmiga teng bo‘lgandagi substrat konsentratsiyasi", "Reaksiyaning maksimal tezligi", "Ferment konsentratsiyasi", "Reaksiyaning faollanish energiyasi"],
  "What does the Michaelis constant (Km) show?", ["The substrate concentration at which the reaction rate is half of the maximum rate", "The maximum reaction rate", "The enzyme concentration", "The activation energy of the reaction"], [0],
  "Km = ½Vmax ga erishiladigan [S]; Km qancha kichik bo‘lsa, fermentning substratga moyilligi shuncha yuqori.", "Km is the [S] at which ½Vmax is reached; the lower the Km, the higher the enzyme’s affinity for the substrate."),
 ("t2", 2, "Raqobatli ingibitor ta’sirida kinetik ko‘rsatkichlar qanday o‘zgaradi?", ["Km oshadi, Vmax o‘zgarmaydi", "Km o‘zgarmaydi, Vmax kamayadi", "Km ham, Vmax ham kamayadi", "Km kamayadi, Vmax oshadi"],
  "How do kinetic parameters change with a competitive inhibitor?", ["Km increases, Vmax is unchanged", "Km is unchanged, Vmax decreases", "Both Km and Vmax decrease", "Km decreases, Vmax increases"], [0],
  "Raqobatli ingibitor faol markaz uchun substrat bilan raqobatlashadi; substrat ko‘paytirilsa, Vmax ga baribir erishiladi.", "A competitive inhibitor competes with the substrate for the active site; with enough substrate, Vmax is still reached."),
 ("t2", 2, "Fermentlarga xos xususiyatlarni belgilang.", ["Yuqori spetsifiklik", "Reaksiyaning faollanish energiyasini kamaytiradi", "Reaksiyaning muvozanat konstantasini o‘zgartiradi", "Reaksiyada sarflanib ketadi", "Harorat oshgani sari faolligi cheksiz ortadi"],
  "Mark the properties of enzymes.", ["High specificity", "They lower the activation energy of the reaction", "They change the equilibrium constant of the reaction", "They are used up in the reaction", "Their activity rises without limit as temperature rises"], [0, 1],
  "Ferment muvozanatni siljitmaydi, faqat unga tezroq erishtiradi va reaksiyadan o‘zgarmay chiqadi; yuqori haroratda denaturatsiyaga uchraydi.", "An enzyme does not shift the equilibrium, it only speeds up reaching it and comes out unchanged; at high temperature it denatures."),
 ("t2", 2, "Oksidoreduktazalar sinfiga kiruvchi fermentlarni belgilang.", ["Laktatdegidrogenaza", "Katalaza", "Alaninaminotransferaza", "Lipaza", "Aldolaza"],
  "Mark the enzymes that belong to the oxidoreductase class.", ["Lactate dehydrogenase", "Catalase", "Alanine aminotransferase", "Lipase", "Aldolase"], [0, 1],
  "Aminotransferaza — transferaza, lipaza — gidrolaza, aldolaza — liaza.", "Aminotransferase is a transferase, lipase is a hydrolase, aldolase is a lyase."),
 ("t2", 3, "Allosterik fermentlarga xos belgilarni ko‘rsating.", ["Tezlikning substrat konsentratsiyasiga bog‘liqligi S-simon (sigmasimon) egri chiziq", "Faol markazdan tashqari boshqaruv (allosterik) markazi bor", "Odatda bir nechta subbirlikdan tuzilgan", "Mixaelis–Menten kinetikasiga to‘liq bo‘ysunadi", "Faqat qaytmas ingibirlanadi"],
  "Indicate the features of allosteric enzymes.", ["A sigmoid (S-shaped) curve of rate versus substrate concentration", "A regulatory (allosteric) site separate from the active site", "Usually made of several subunits", "They follow Michaelis–Menten kinetics fully", "They are inhibited only irreversibly"], [0, 1, 2],
  "Subbirliklar orasidagi kooperativlik S-simon egri chiziq beradi; allosterik effektorlar qaytar bog‘lanadi.", "Cooperativity between subunits gives the sigmoid curve; allosteric effectors bind reversibly."),
 ("t2", 1, "NAD⁺ koferment qaysi vitaminning hosilasi?", ["PP (niatsin, B3)", "B1 (tiamin)", "B2 (riboflavin)", "B6 (piridoksin)"],
  "The coenzyme NAD⁺ is derived from which vitamin?", ["PP (niacin, B3)", "B1 (thiamine)", "B2 (riboflavin)", "B6 (pyridoxine)"], [0],
  "B1 — tiaminpirofosfat, B2 — FAD/FMN, B6 — piridoksalfosfat manbai.", "B1 gives thiamine pyrophosphate, B2 gives FAD/FMN, B6 gives pyridoxal phosphate."),
 ("t2", 3, "Hujayrada ferment faolligini boshqarish usullarini belgilang.", ["Kovalent modifikatsiya (fosforillanish/defosforillanish)", "Allosterik boshqaruv", "Cheklangan proteoliz (zimogenning faollashuvi)", "Ferment sintezining induksiyasi va repressiyasi", "Substratning optik izomerlanishi", "Fermentning issiqlikdan denaturatsiyasi"],
  "Mark the ways enzyme activity is regulated in the cell.", ["Covalent modification (phosphorylation/dephosphorylation)", "Allosteric regulation", "Limited proteolysis (activation of a zymogen)", "Induction and repression of enzyme synthesis", "Optical isomerization of the substrate", "Heat denaturation of the enzyme"], [0, 1, 2, 3],
  "Denaturatsiya boshqaruv emas, faollikning qaytmas yo‘qolishi.", "Denaturation is not regulation but an irreversible loss of activity."),
 ("t2", 2, "Qon zardobida kreatinkinazaning MB izofermenti oshishi ko‘proq nimaga xos?", ["Miokard infarkti", "O‘tkir pankreatit", "Virusli gepatit", "Surunkali buyrak yetishmovchiligi"],
  "A rise of the MB isoenzyme of creatine kinase in serum is most typical of what?", ["Myocardial infarction", "Acute pancreatitis", "Viral hepatitis", "Chronic kidney failure"], [0],
  "KK-MB asosan yurak mushagida bo‘ladi; hozir troponinlar bilan birga baholanadi.", "CK-MB is found mainly in heart muscle; today it is assessed together with troponins."),
 ("t2", 3, "Qaysi moddalar fermentni qaytmas ingibirlaydi?", ["Fosfororganik birikmalar (atsetilxolinesterazani)", "Atsetilsalitsil kislota (siklooksigenazani atsetillaydi)", "Malonat (suksinatdegidrogenazani)", "Sulfanilamidlar (bakteriyalarda folat sintezini)", "Metotreksat (digidrofolatreduktazani)"],
  "Which substances inhibit an enzyme irreversibly?", ["Organophosphates (acetylcholinesterase)", "Acetylsalicylic acid (acetylates cyclooxygenase)", "Malonate (succinate dehydrogenase)", "Sulfonamides (folate synthesis in bacteria)", "Methotrexate (dihydrofolate reductase)"], [0, 1],
  "Malonat, sulfanilamidlar va metotreksat — raqobatli (qaytar) ingibitorlar.", "Malonate, sulfonamides and methotrexate are competitive (reversible) inhibitors."),
 # ---------- t4 Biologik oksidlanish ----------
 ("t4", 1, "Mitoxondriyada ATF sintez qiluvchi ferment qaysi?", ["ATF-sintaza (V kompleks)", "Sitoxrom-c-oksidaza", "NADH-degidrogenaza", "Suksinatdegidrogenaza"],
  "Which enzyme synthesizes ATP in mitochondria?", ["ATP synthase (complex V)", "Cytochrome c oxidase", "NADH dehydrogenase", "Succinate dehydrogenase"], [0],
  "ATF-sintaza protonlarning membranalararo bo‘shliqdan matriksga qaytishi energiyasidan foydalanadi.", "ATP synthase uses the energy of protons flowing back from the intermembrane space into the matrix."),
 ("t4", 1, "Nafas zanjirida elektronlarning oxirgi aktseptori nima?", ["Kislorod", "NAD⁺", "FAD", "Sitoxrom c"],
  "What is the final electron acceptor of the respiratory chain?", ["Oxygen", "NAD⁺", "FAD", "Cytochrome c"], [0],
  "IV kompleksda kislorod qaytarilib, suv hosil bo‘ladi.", "In complex IV, oxygen is reduced to water."),
 ("t4", 2, "Suksinatdegidrogenaza nafas zanjirining qaysi kompleksi hisoblanadi?", ["II kompleks", "I kompleks", "III kompleks", "IV kompleks"],
  "Succinate dehydrogenase is which complex of the respiratory chain?", ["Complex II", "Complex I", "Complex III", "Complex IV"], [0],
  "Suksinatdegidrogenaza ham Krebs siklining fermenti, ham II kompleks; protonlarni haydamaydi.", "Succinate dehydrogenase is both a Krebs cycle enzyme and complex II; it does not pump protons."),
 ("t4", 2, "Oksidlanish va fosforillanishni ajratuvchi (razobshitel) moddalarni belgilang.", ["2,4-dinitrofenol", "Termogenin (UCP1)", "Sianid", "Oligomitsin", "Rotenon"],
  "Mark the substances that uncouple oxidation from phosphorylation.", ["2,4-dinitrophenol", "Thermogenin (UCP1)", "Cyanide", "Oligomycin", "Rotenone"], [0, 1],
  "Sianid IV kompleksni, oligomitsin ATF-sintazani, rotenon I kompleksni ingibirlaydi.", "Cyanide inhibits complex IV, oligomycin inhibits ATP synthase, rotenone inhibits complex I."),
 ("t4", 2, "Sitoxromoksidazani (IV kompleks) ingibirlovchi moddalarni ko‘rsating.", ["Sianidlar", "Uglerod monoksid (CO)", "Vodorod sulfid (H₂S)", "Antimitsin A", "Rotenon"],
  "Indicate the inhibitors of cytochrome oxidase (complex IV).", ["Cyanides", "Carbon monoxide (CO)", "Hydrogen sulfide (H₂S)", "Antimycin A", "Rotenone"], [0, 1, 2],
  "Antimitsin A — III kompleks, rotenon — I kompleks ingibitori.", "Antimycin A inhibits complex III, rotenone inhibits complex I."),
 ("t4", 2, "NADH dan nafas zanjiriga bir juft elektron o‘tganda taxminan nechta ATF hosil bo‘ladi (zamonaviy P/O)?", ["2,5", "1,5", "4", "1"],
  "About how many ATP form when one pair of electrons passes from NADH into the respiratory chain (modern P/O)?", ["2.5", "1.5", "4", "1"], [0],
  "FADH₂ uchun P/O ≈ 1,5, chunki elektronlar I kompleksni chetlab o‘tadi.", "For FADH₂ the P/O is about 1.5 because the electrons bypass complex I."),
 ("t4", 3, "Nafas zanjirining harakatchan (mobil) elektron tashuvchilarini belgilang.", ["Ubixinon (koferment Q)", "Sitoxrom c", "Sitoxrom a₃", "FMN", "Temir-oltingugurt oqsillari"],
  "Mark the mobile electron carriers of the respiratory chain.", ["Ubiquinone (coenzyme Q)", "Cytochrome c", "Cytochrome a₃", "FMN", "Iron–sulfur proteins"], [0, 1],
  "Ubixinon membrana ichida, sitoxrom c membranalararo bo‘shliqda harakatlanadi; qolganlari komplekslarga bog‘langan.", "Ubiquinone moves within the membrane and cytochrome c in the intermembrane space; the others are bound in the complexes."),
 ("t4", 3, "Faol kislorod shakllarini zararsizlantiruvchi antioksidant tizim a’zolarini belgilang.", ["Superoksiddismutaza", "Katalaza", "Glutationperoksidaza", "E vitamini (tokoferol)", "Ksantinoksidaza", "NADFH-oksidaza"],
  "Mark the members of the antioxidant system that neutralize reactive oxygen species.", ["Superoxide dismutase", "Catalase", "Glutathione peroxidase", "Vitamin E (tocopherol)", "Xanthine oxidase", "NADPH oxidase"], [0, 1, 2, 3],
  "Ksantinoksidaza va NADFH-oksidaza aksincha, faol kislorod shakllarini hosil qiladi.", "Xanthine oxidase and NADPH oxidase, on the contrary, produce reactive oxygen species."),
 ("t4", 1, "Biologik oksidlanish va ATF sintezi asosan hujayraning qaysi organoidida boradi?", ["Mitoxondriya", "Ribosoma", "Golji apparati", "Lizosoma"],
  "In which organelle do biological oxidation and ATP synthesis mainly take place?", ["Mitochondrion", "Ribosome", "Golgi apparatus", "Lysosome"], [0],
  "Nafas zanjiri va ATF-sintaza mitoxondriyaning ichki membranasida joylashgan.", "The respiratory chain and ATP synthase sit in the inner mitochondrial membrane."),
 ("t4", 3, "Mitoxondriyaning ichki membranasida joylashgan fermentlarni belgilang.", ["NADH-degidrogenaza (I kompleks)", "Suksinatdegidrogenaza (II kompleks)", "Sitoxrom bc₁ (III kompleks)", "Sitoxromoksidaza (IV kompleks)", "ATF-sintaza", "Sitratsintaza", "Piruvatkarboksilaza"],
  "Mark the enzymes located in the inner mitochondrial membrane.", ["NADH dehydrogenase (complex I)", "Succinate dehydrogenase (complex II)", "Cytochrome bc₁ (complex III)", "Cytochrome oxidase (complex IV)", "ATP synthase", "Citrate synthase", "Pyruvate carboxylase"], [0, 1, 2, 3, 4],
  "Sitratsintaza va piruvatkarboksilaza mitoxondriya matriksida joylashgan.", "Citrate synthase and pyruvate carboxylase are located in the mitochondrial matrix."),
 # ---------- t6 Uglevodlar ----------
 ("t6", 1, "Anaerob sharoitda glikolizning yakuniy mahsuloti nima?", ["Laktat", "Atsetil-KoA", "Glyukoza-6-fosfat", "Oksaloatsetat"],
  "What is the end product of glycolysis under anaerobic conditions?", ["Lactate", "Acetyl-CoA", "Glucose 6-phosphate", "Oxaloacetate"], [0],
  "Piruvat laktatdegidrogenaza ta’sirida laktatga aylanadi va NAD⁺ qayta tiklanadi.", "Pyruvate is turned into lactate by lactate dehydrogenase, regenerating NAD⁺."),
 ("t6", 2, "Glikolizning asosiy boshqaruvchi (eng sekin boruvchi) fermenti qaysi?", ["Fosfofruktokinaza-1", "Aldolaza", "Enolaza", "Fosfoglitseratmutaza"],
  "Which is the main regulatory (rate-limiting) enzyme of glycolysis?", ["Phosphofructokinase-1", "Aldolase", "Enolase", "Phosphoglycerate mutase"], [0],
  "FFK-1 ni AMF va fruktoza-2,6-bisfosfat faollashtiradi, ATF va sitrat ingibirlaydi.", "PFK-1 is activated by AMP and fructose 2,6-bisphosphate and inhibited by ATP and citrate."),
 ("t6", 1, "Glikogen sintezida glyukoza qoldig‘ining faol shakli qaysi?", ["UDF-glyukoza", "Glyukoza-6-fosfat", "Fruktoza-6-fosfat", "Glyukoza-1,6-bisfosfat"],
  "What is the activated form of glucose used in glycogen synthesis?", ["UDP-glucose", "Glucose 6-phosphate", "Fructose 6-phosphate", "Glucose 1,6-bisphosphate"], [0],
  "Glyukoza-1-fosfat UTF bilan reaksiyaga kirib UDF-glyukoza hosil qiladi; uni glikogensintaza ishlatadi.", "Glucose 1-phosphate reacts with UTP to form UDP-glucose, which glycogen synthase uses."),
 ("t6", 2, "Glikolizda substrat darajasida fosforillanishni katalizlovchi fermentlarni belgilang.", ["Fosfoglitseratkinaza", "Piruvatkinaza", "Geksokinaza", "Fosfofruktokinaza-1", "Glitseraldegid-3-fosfatdegidrogenaza"],
  "Mark the glycolytic enzymes that carry out substrate-level phosphorylation.", ["Phosphoglycerate kinase", "Pyruvate kinase", "Hexokinase", "Phosphofructokinase-1", "Glyceraldehyde 3-phosphate dehydrogenase"], [0, 1],
  "Geksokinaza va FFK-1 ATF sarflaydi; GAF-degidrogenaza NADH hosil qiladi, ATF emas.", "Hexokinase and PFK-1 use ATP; GAP dehydrogenase forms NADH, not ATP."),
 ("t6", 2, "Glikolizning qaytmas reaksiyalarini katalizlovchi fermentlarni ko‘rsating.", ["Geksokinaza", "Fosfofruktokinaza-1", "Piruvatkinaza", "Aldolaza", "Triozofosfatizomeraza"],
  "Indicate the enzymes that catalyze the irreversible reactions of glycolysis.", ["Hexokinase", "Phosphofructokinase-1", "Pyruvate kinase", "Aldolase", "Triose phosphate isomerase"], [0, 1, 2],
  "Glyukoneogenezda aynan shu uch bosqich boshqa fermentlar bilan aylanib o‘tiladi.", "In gluconeogenesis exactly these three steps are bypassed by other enzymes."),
 ("t6", 2, "Mushaklarda glyukoza-6-fosfataza yo‘qligi qanday oqibatga olib keladi?", ["Mushak glikogeni qonga erkin glyukoza chiqara olmaydi", "Mushakda glikogen umuman sintezlanmaydi", "Mushak glikogeni faqat jigarda parchalanadi", "Mushakda glikoliz bormaydi"],
  "What follows from the absence of glucose 6-phosphatase in muscle?", ["Muscle glycogen cannot release free glucose into the blood", "Muscle cannot synthesize glycogen at all", "Muscle glycogen is broken down only in the liver", "Glycolysis does not take place in muscle"], [0],
  "Mushak glikogeni faqat mushakning o‘zi uchun yoqilg‘i; qondagi glyukozani jigar ushlab turadi.", "Muscle glycogen fuels only the muscle itself; the liver maintains blood glucose."),
 ("t6", 3, "GLUT4 tashuvchisi haqidagi to‘g‘ri fikrlarni belgilang.", ["Insulin ta’sirida hujayra membranasiga ko‘chadi", "Asosan skelet mushaklari va yog‘ to‘qimasida bo‘ladi", "Jigar va oshqozon osti bezi β-hujayralarining asosiy tashuvchisi", "Glyukozani natriy bilan birga simport qiladi", "Eritrotsitlarning asosiy glyukoza tashuvchisi"],
  "Mark the correct statements about the GLUT4 transporter.", ["Insulin moves it to the cell membrane", "It is found mainly in skeletal muscle and adipose tissue", "It is the main transporter of liver and pancreatic β-cells", "It carries glucose in symport with sodium", "It is the main glucose transporter of red blood cells"], [0, 1],
  "Jigar va β-hujayralarda GLUT2, eritrotsitlarda GLUT1; natriy bilan simport — SGLT.", "Liver and β-cells use GLUT2, red cells use GLUT1; sodium symport is done by SGLT."),
 ("t6", 1, "Hujayra ichida glikogen parchalanishining asosiy fermenti qaysi?", ["Glikogenfosforilaza", "Glikogensintaza", "Laktaza", "Geksokinaza"],
  "Which is the main enzyme of glycogen breakdown inside the cell?", ["Glycogen phosphorylase", "Glycogen synthase", "Lactase", "Hexokinase"], [0],
  "Glikogenfosforilaza glyukoza-1-fosfat ajratadi; uni adrenalin va glyukagon faollashtiradi.", "Glycogen phosphorylase releases glucose 1-phosphate; adrenaline and glucagon activate it."),
 ("t6", 3, "Adrenalin jigarda qaysi jarayonlarni kuchaytiradi?", ["Glikogenoliz", "Glyukoneogenez", "Adenilatsiklaza faollashib, sAMF hosil bo‘lishi", "Glikogenez", "Glikoliz"],
  "Which processes does adrenaline enhance in the liver?", ["Glycogenolysis", "Gluconeogenesis", "Activation of adenylate cyclase and cAMP formation", "Glycogenesis", "Glycolysis"], [0, 1, 2],
  "Jigarda adrenalin sAMF orqali glikogenez va glikolizni susaytiradi, qonga glyukoza chiqarishni kuchaytiradi.", "In the liver, adrenaline acting through cAMP slows glycogenesis and glycolysis and increases glucose output into the blood."),
 ("t6", 2, "Glyukoza aerob sharoitda oxirigacha oksidlanganda nimalar hosil bo‘ladi?", ["CO₂", "H₂O", "ATF", "Issiqlik energiyasi", "Laktat", "Etanol"],
  "What is formed when glucose is fully oxidized under aerobic conditions?", ["CO₂", "H₂O", "ATP", "Heat energy", "Lactate", "Ethanol"], [0, 1, 2, 3],
  "Laktat anaerob glikolizda, etanol esa achitqilarda (spirtli bijg‘ishda) hosil bo‘ladi.", "Lactate forms in anaerobic glycolysis and ethanol in yeast (alcoholic fermentation)."),
 # ---------- t9 Yog'lar almashinuvi ----------
 ("t9", 1, "Yog‘ kislotalarining β-oksidlanishi asosan hujayraning qayerida boradi?", ["Mitoxondriya matriksida", "Sitoplazmada", "Silliq endoplazmatik to‘rda", "Yadroda"],
  "Where in the cell does β-oxidation of fatty acids mainly take place?", ["In the mitochondrial matrix", "In the cytoplasm", "In the smooth endoplasmic reticulum", "In the nucleus"], [0],
  "Juda uzun zanjirli yog‘ kislotalari avval peroksisomalarda qisqartiriladi.", "Very-long-chain fatty acids are first shortened in peroxisomes."),
 ("t9", 1, "Yog‘ kislotalarini mitoxondriyaga tashuvchi modda qaysi?", ["Karnitin", "Kreatin", "Albumin", "Glutation"],
  "Which substance carries fatty acids into the mitochondria?", ["Carnitine", "Creatine", "Albumin", "Glutathione"], [0],
  "Atsil guruhi karnitin-palmitoiltransferaza I va II yordamida ichki membranadan o‘tkaziladi.", "The acyl group crosses the inner membrane with carnitine palmitoyltransferase I and II."),
 ("t9", 2, "Yog‘ kislotalari sintezining asosiy boshqaruvchi fermenti qaysi?", ["Atsetil-KoA-karboksilaza", "Karnitin-palmitoiltransferaza I", "GMG-KoA-reduktaza", "Lipoproteinlipaza"],
  "Which is the main regulatory enzyme of fatty acid synthesis?", ["Acetyl-CoA carboxylase", "Carnitine palmitoyltransferase I", "HMG-CoA reductase", "Lipoprotein lipase"], [0],
  "Atsetil-KoA-karboksilazani sitrat va insulin faollashtiradi; GMG-KoA-reduktaza xolesterin sintezini boshqaradi.", "Acetyl-CoA carboxylase is activated by citrate and insulin; HMG-CoA reductase controls cholesterol synthesis."),
 ("t9", 1, "Keton tanachalariga kiruvchi moddalarni belgilang.", ["Atsetoatsetat", "β-gidroksibutirat", "Piruvat", "Laktat", "Malonil-KoA"],
  "Mark the substances that are ketone bodies.", ["Acetoacetate", "β-hydroxybutyrate", "Pyruvate", "Lactate", "Malonyl-CoA"], [0, 1],
  "Uchinchi keton tanachasi — atseton; u energiya manbai bo‘lmaydi.", "The third ketone body is acetone; it is not used as fuel."),
 ("t9", 2, "Yog‘ kislotalari sintezi uchun zarur bo‘lgan moddalarni ko‘rsating.", ["NADFH", "Malonil-KoA", "FADH₂", "Karnitin", "NAD⁺"],
  "Indicate the substances required for fatty acid synthesis.", ["NADPH", "Malonyl-CoA", "FADH₂", "Carnitine", "NAD⁺"], [0, 1],
  "NADFH asosan pentozofosfat yo‘ldan keladi; malonil-KoA zanjirni har safar 2 uglerodga uzaytiradi.", "NADPH comes mainly from the pentose phosphate pathway; malonyl-CoA lengthens the chain by 2 carbons each time."),
 ("t9", 3, "Keton tanachalarini energiya manbai sifatida ishlata oladigan to‘qimalarni belgilang.", ["Bosh miya (uzoq och qolishda)", "Yurak mushagi", "Skelet mushaklari", "Jigar", "Eritrotsitlar"],
  "Mark the tissues that can use ketone bodies as fuel.", ["Brain (during prolonged fasting)", "Heart muscle", "Skeletal muscle", "Liver", "Red blood cells"], [0, 1, 2],
  "Jigarda suksinil-KoA-atsetoatsetat transferaza yo‘q, eritrotsitlarda mitoxondriya yo‘q.", "The liver lacks succinyl-CoA:acetoacetate transferase, and red cells have no mitochondria."),
 ("t9", 2, "Palmitin kislotasi (C16) β-oksidlanishida nechta sikl boradi?", ["7", "8", "16", "6"],
  "How many cycles of β-oxidation does palmitic acid (C16) go through?", ["7", "8", "16", "6"], [0],
  "Har sikl 2 uglerod ajratadi; 7 sikldan keyin 8 ta atsetil-KoA hosil bo‘ladi.", "Each cycle removes 2 carbons; after 7 cycles, 8 acetyl-CoA are formed."),
 ("t9", 3, "Palmitin kislotasi to‘liq oksidlanganda sof necha ATF hosil bo‘ladi (zamonaviy P/O bo‘yicha)?", ["106", "129", "38", "36"],
  "How much net ATP forms when palmitic acid is fully oxidized (by modern P/O values)?", ["106", "129", "38", "36"], [0],
  "108 ATF hosil bo‘ladi, faollashtirishga 2 ta yuqori energiyali bog‘ sarflanadi: 108 − 2 = 106 (eski hisobda 129).", "108 ATP form and 2 high-energy bonds are used for activation: 108 − 2 = 106 (129 in the older count)."),
 ("t9", 3, "Malonil-KoA haqidagi to‘g‘ri fikrlarni belgilang.", ["Karnitin-palmitoiltransferaza I ni ingibirlaydi", "Atsetil-KoA karboksillanishidan hosil bo‘ladi", "β-oksidlanishning mahsuloti", "Keton tanachalaridan biri", "Glyukagon ta’sirida ko‘payadi"],
  "Mark the correct statements about malonyl-CoA.", ["It inhibits carnitine palmitoyltransferase I", "It is formed by carboxylation of acetyl-CoA", "It is a product of β-oxidation", "It is one of the ketone bodies", "It increases under the action of glucagon"], [0, 1],
  "Shu tufayli yog‘ sintezlanayotganda yangi yog‘ kislotalari bir vaqtda oksidlanmaydi; glyukagon malonil-KoA ni kamaytiradi.", "This is why newly made fatty acids are not oxidized at the same time; glucagon lowers malonyl-CoA."),
 ("t9", 2, "Yog‘ to‘qimasida lipolizni kuchaytiradigan gormonlarni belgilang.", ["Adrenalin", "Glyukagon", "Somatotropin", "Insulin", "Oksitotsin"],
  "Mark the hormones that increase lipolysis in adipose tissue.", ["Adrenaline", "Glucagon", "Somatotropin", "Insulin", "Oxytocin"], [0, 1, 2],
  "Insulin gormonga sezgir lipazani susaytiradi va yog‘ to‘planishini kuchaytiradi.", "Insulin suppresses hormone-sensitive lipase and promotes fat storage."),
]

def lit(s):
    return "'" + s.replace("'", "''") + "'"

rows = []
for i, (t, d, uq, uo, eq, eo, ans, ux, ex) in enumerate(Q, 1):
    assert len(uo) == len(eo), (i, uq)
    assert all(0 <= a < len(uo) for a in ans) and len(ans) < len(uo), i
    ordn, tu, te = TOPICS[t]
    pk = f"demo-bkm-{t}-{i}"
    for lang, q, o, x, tn, sn in (("uz", uq, uo, ux, tu, "Biokimyo"), ("en", eq, eo, ex, te, "Biochemistry")):
        h = hashlib.sha1((lang + "|" + q + "|" + "|".join(o)).encode()).hexdigest()
        rows.append(f"({lit(lang)}, 2, 'biokimyo', {lit(sn)}, {lit(t)}, {lit(tn)}, {ordn}, {lit(q)}, {lit(json.dumps(o, ensure_ascii=False))}::jsonb, "
                    f"'{{{','.join(map(str, ans))}}}'::smallint[], {lit(x)}, {d}, true, {lit(pk)}, 'demo', {lit(h)}, '{ADMIN}')")
print("insert into public.bt_questions (lang, course, subject, subject_name, topic, topic_name, topic_ord, q, opts, ans, expl, diff, demo, pair_key, src, hash, created_by) values\n"
      + ",\n".join(rows) + "\non conflict (hash) do nothing;")
from collections import Counter
print("-- jami:", len(Q), "juft; javoblar soni:", dict(Counter(len(x[6]) for x in Q)), "qiyinlik:", dict(Counter(x[1] for x in Q)), file=sys.stderr)
