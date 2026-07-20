# Hoofdstuk 4 — Causaal denken voor analisten

> **Deel I — Het fundament: waarom Media Mix Modeling?**
> Moeilijkheidsgraad: Gemiddeld · Voorkennis: hoofdstuk 1, 2 en 3

---

## Waar dit hoofdstuk over gaat

Je kunt alle statistiek van dit boek foutloos beheersen en toch een waardeloos model bouwen. Dat klinkt tegenstrijdig, maar het is de meest onderschatte waarheid in dit vak. Een regressie geeft altijd een uitkomst, ongeacht of die uitkomst ergens op slaat. De computer rekent gehoorzaam een verband uit tussen televisie-inzet en omzet, met een keurig betrouwbaarheidsinterval erbij — en heeft geen flauw benul of dat verband ook maar iets met de werkelijkheid te maken heeft.

Dit hoofdstuk gaat over het denkraam dat dat verschil maakt: **causaal denken**. Het is de belangrijkste gereedschapskist uit dit hele boek, belangrijker dan adstock, belangrijker dan Bayesiaanse statistiek, belangrijker dan PyMC. Waarom? Omdat Media Mix Modeling in de kern niets anders is dan **toegepaste causale inferentie op observationele data**. Je probeert oorzaak en gevolg te ontrafelen uit cijfers die je niet zelf hebt kunnen sturen — er is geen laboratorium, geen controlegroep, alleen de rommelige werkelijkheid van drie jaar bedrijfsdata.

We bouwen dit hoofdstuk op als een gereedschapskist die je telkens weer opent. Je leert het verschil zien tussen een verband dat toeval is en een verband dat oorzakelijk is. Je leert een eenvoudige tekening maken — een causaal diagram — die in twee seconden duidelijk maakt welke variabelen een model nodig heeft en welke niet. Je leert waarom "meer data erin gooien" soms een model juist slechter maakt. En je eindigt met een checklist die je bij ieder toekomstig project weer pakt.

**Na dit hoofdstuk kun je:**

- met concrete marketingvoorbeelden uitleggen waarom correlatie geen causaliteit is;
- een confounder, een mediator en een collider herkennen in een marketingsituatie;
- een eenvoudig causaal diagram tekenen en gebruiken om modelkeuzes te onderbouwen;
- beoordelen welke variabelen in een MMM thuishoren en welke je juist moet weglaten.

---

## 4.1 Correlatie is geen causaliteit — maar wat dan wel?

### Het klassieke voorbeeld, en waarom het blijft werken

Je kent de klassieker vast al: in de zomer stijgt zowel de ijsverkoop als het aantal verdrinkingen. Zet je die twee cijfers naast elkaar, dan zie je een messcherp verband. Betekent dat dat ijs verdrinkingen veroorzaakt? Natuurlijk niet. Een derde factor — warm weer — drijft beide cijfers omhoog. Meer hitte betekent meer mensen die ijs kopen én meer mensen die gaan zwemmen, met als onvermijdelijk gevolg meer verdrinkingen.

Dit voorbeeld is een cliché geworden, en juist daardoor onderschat je het gevaar ervan. Iedereen kent het ijsverkoop-verhaal en niemand trapt er meer in. Maar in marketingdata duikt precies hetzelfde mechanisme voortdurend op, alleen minder doorzichtig verpakt. Neem dit voorbeeld.

### De Sinterklaas-valkuil

Stel, je kijkt naar de omzet en de televisie-inzet van een cadeauwinkel over het hele jaar. In november en de eerste helft van december zie je twee dingen tegelijk gebeuren: de omzet schiet omhoog, en de televisiecampagne draait op volle toeren. Een simpele regressie ziet dit verband en concludeert: televisie heeft een enorm effect.

Klopt dat? Deels misschien — maar je kunt het onmogelijk zeker weten zonder verder te kijken. Sinterklaas en Kerstmis zorgen namelijk hoe dan ook voor een omzetpiek, campagne of niet. En het is geen toeval dat de marketingafdeling juist in die weken de televisiebudgetten verhoogt — dat doet iedereen, want dat is precies wanneer de vraag toch al op zijn hoogtepunt is. Het seizoen drijft zowel de omzet als de mediabudgetten omgekeerd naar elkaar toe. Zonder daarvoor te corrigeren, schrijf je een deel van het seizoenseffect abusievelijk toe aan televisie.

> **[Figuur 4.1 — De Sinterklaas-valkuil]** *Twee lijnen door het jaar heen: omzet en TV-inzet, beide met een duidelijke piek in november-december. Een pijl van "seizoen" naar beide lijnen laat zien waar de werkelijke aansturing vandaan komt.*

### Het contrafeitelijke raamwerk

Om hier scherp doorheen te prikken, heb je een precies begrip nodig van wat "causaal effect" eigenlijk betekent. De definitie is verrassend simpel, en je gebruikte hem al even in hoofdstuk 3: het causale effect van een handeling is het verschil tussen wat er gebeurde, en wat er gebeurd zou zijn als je die handeling niet had uitgevoerd. Die tweede, niet-gebeurde situatie heet het **contrafeit** — de wereld die niet is uitgekomen.

Dit raamwerk dwingt je tot een discipline die correlatie mist. Een correlatie zegt: "deze twee dingen bewegen samen." Een causale claim zegt: "als ik aan het ene draai, verandert het andere — en al het overige blijft gelijk." Dat laatste stukje, "al het overige blijft gelijk", is precies waar het meestal misgaat. In de praktijk verandert er nooit maar één ding tegelijk. Het seizoen verandert mee, de prijs verandert mee, de concurrent verandert mee. De hele kunst van causaal denken is: hoe filter je uit die chaos het stukje eruit dat echt van je marketinginzet afkomstig is?

Het antwoord op die vraag begint bij het herkennen van de stoorzender die verantwoordelijk is voor de meeste valse verbanden: de confounder.

---

## 4.2 Confounders: de verborgen derde factor

### Wat een confounder is

Een **confounder** is een variabele die zowel je marketinginzet beïnvloedt als je omzet — en die daardoor een vals verband tussen die twee kan veroorzaken. Het seizoen in het Sinterklaas-voorbeeld is de schoolvoorbeeld-confounder: het stuurt de televisie-inzet aan (marketeers plannen campagnes rond de piek) én het stuurt de omzet aan (mensen kopen sowieso meer cadeaus in december).

Je herkent een confounder aan een simpel patroon: er lopen twee pijlen vanuit dezelfde bron — één naar je marketinginzet, één naar je omzet. Zolang die twee pijlen bestaan, kun je het effect van marketing niet zuiver aflezen uit de ruwe cijfers. Je moet corrigeren voor wat die derde factor doet.

### Confounders die je in bijna elk project tegenkomt

De meest voorkomende confounders in MMM-projecten zijn zo herkenbaar dat je ze bijna uit je hoofd kunt leren:

- **Seizoen.** Stuurt zowel de mediabudgetten (meer inzet in het hoogseizoen) als de omzet (meer vraag in het hoogseizoen) aan.
- **Promoties.** Een kortingsactie gaat vaak samen met extra mediabudget om die actie onder de aandacht te brengen — en drijft de omzet zelfstandig omhoog.
- **Productlanceringen.** Een nieuw product krijgt zowel een marketingcampagne als aandacht van klanten die toch al op zoek waren naar iets nieuws.
- **Economische omstandigheden.** Bij consumentenvertrouwen stuurt de bedrijfsstrategie soms het budget bij (meer adverteren in goede tijden) terwijl de economie zelf de omzet beweegt.
- **Concurrentiedruk.** Reageert een concurrent met een grote actie, dan verhoog je misschien je eigen budget — terwijl die concurrentie-actie je omzet ook los daarvan raakt.

Zie je het patroon? Steeds hetzelfde verhaal: iets in de wereld beïnvloedt zowel hoeveel je uitgeeft aan marketing, als hoeveel je verkoopt — los van marketing.

### Waarom budgetten met seizoen mee-ademen

Er schuilt een diepere reden achter dit patroon, en die is het waard om even bij stil te staan. Marketeers zijn geen willekeurige budgetverdelers. Ze zijn slim, en ze plannen hun geld daar waar de kans op resultaat het grootst is. Dat betekent bijna per definitie: meer budget wanneer de vraag toch al hoog is. Dit is geen fout van de marketeer — het is uitstekend vakmanschap. Maar het betekent wel dat je ruwe data een ingebakken vertekening bevat, precies doordat de mensen die het budget bepalen hun werk goed doen.

Dit inzicht is de kern van waarom je nooit zomaar televisie-inzet tegen omzet mag afzetten zonder te corrigeren. De data ligt niet toevallig zo — hij ligt zo omdat iemand slim heeft gepland.

### Wat je hiermee doet

Gelukkig is de oplossing, in elk geval in beginsel, recht-toe-recht-aan: **neem de confounder op als controlevariabele in je model.** Zet seizoen, promoties en de andere bekende verdachten mee in de vergelijking, en het model kan het effect van televisie schatten *terwijl* het rekening houdt met wat het seizoen doet. Zo geef je het seizoen zijn eigen eer, in plaats van die stiekem aan televisie toe te schrijven.

Deze oplossing klinkt eenvoudiger dan ze is. Welke confounders moet je precies meenemen? Zijn er confounders die je over het hoofd ziet omdat je de data niet hebt? En is elke variabele die je tegenkomt eigenlijk wel een confounder — of speelt er iets anders? Om die vragen te beantwoorden, heb je een instrument nodig dat je aannames zichtbaar maakt. Dat instrument is het causale diagram.

---

## 4.3 Causale diagrammen tekenen en lezen

### Een taal voor je aannames

Een **causaal diagram** (*Directed Acyclic Graph*, afgekort DAG) is niets meer dan een tekening met bolletjes en pijlen. Elk bolletje is een variabele — omzet, televisie-inzet, seizoen, prijs. Elke pijl betekent "beïnvloedt". Meer heb je niet nodig om te beginnen.

Het nut van zo'n tekening zit hem niet in de wiskunde erachter — die laten we in dit boek grotendeels buiten beschouwing. Het nut zit in de discipline die het tekenen zelf afdwingt. Zodra je probeert op te schrijven wat wat beïnvloedt, kom je vragen tegen die je anders zou overslaan. Beïnvloedt prijs de omzet rechtstreeks, of loopt dat via promoties? Is seizoen een oorzaak van televisie-inzet, of andersom? Een DAG dwingt je om dit soort vragen hardop te stellen, samen met de marketeers die het antwoord kennen.

### Een DAG tekenen voor een eenvoudige situatie

Laten we het stap voor stap opbouwen voor een simpele, veelvoorkomende MMM-situatie: een retailer met televisie-inzet, seizoen en omzet.

**Stap 1.** Teken drie bolletjes: *Seizoen*, *TV-inzet*, *Omzet*.

**Stap 2.** Stel de vraag: beïnvloedt seizoen de TV-inzet? Ja — marketeers plannen meer budget in het hoogseizoen. Teken een pijl van *Seizoen* naar *TV-inzet*.

**Stap 3.** Stel de vraag: beïnvloedt seizoen de omzet, los van televisie? Ja — meer vraag in het hoogseizoen, ook zonder reclame. Teken een pijl van *Seizoen* naar *Omzet*.

**Stap 4.** Stel de vraag: beïnvloedt televisie de omzet? Dat is precies wat je wilt meten — teken een pijl van *TV-inzet* naar *Omzet*.

> **[Figuur 4.2 — Een eenvoudige DAG]** *Drie bolletjes: Seizoen, TV-inzet, Omzet. Twee pijlen vanuit Seizoen (naar TV-inzet en naar Omzet), en één pijl van TV-inzet naar Omzet. Seizoen is hier zichtbaar de confounder: het bolletje met twee uitgaande pijlen.*

Deze simpele tekening vertelt je precies wat je in paragraaf 4.2 al concludeerde: seizoen is een confounder, en je moet ervoor corrigeren om het zuivere effect van televisie op omzet te vinden. Maar het mooie is dat deze manier van werken ook overeind blijft bij ingewikkelder situaties, met tien kanalen, prijs, promoties en concurrentie. De tekening groeit mee, en blijft je vertellen wat je moet doen.

### De basisregel: welke paden blokkeer je?

Voor de praktijk heb je maar één vuistregel nodig, en die volstaat voor verreweg de meeste MMM-situaties: **corrigeer voor elke variabele die een pijl uitstuurt naar zowel je marketinginzet als je omzet.** Dat blokkeert het vervuilende pad dat via de confounder loopt, en laat het zuivere pad — de pijl die je daadwerkelijk wilt meten — ongemoeid.

Deze regel klinkt bijna te simpel, en dat is precies waarom hij zo bruikbaar is. Je hoeft geen zware wiskunde te beheersen om hem toe te passen; je hoeft alleen je diagram eerlijk te tekenen en de pijlen te tellen. Maar let op: deze regel heeft een addertje onder het gras. Niet elke variabele die je tegenkomt, moet je op deze manier behandelen. Er zijn twee andere soorten variabelen waarbij deze regel je juist de verkeerde kant op stuurt — en die zijn minstens zo belangrijk om te herkennen.

---

## 4.4 Mediators en colliders: wanneer corrigeren juist fout is

### De verleiding van "hoe meer data, hoe beter"

Er heerst een hardnekkig misverstand, vooral bij mensen met een machine-learning-achtergrond: gooi alles wat je hebt in het model, en laat het algoritme zelf maar uitzoeken wat ertoe doet. Voor puur voorspellende taken kan dat een verdedigbare aanpak zijn. Voor causale vragen — en dat is precies wat MMM stelt — is deze aanpak ronduit gevaarlijk. Sommige variabelen moet je juist buiten het model houden, omdat opnemen ervan het effect dat je wilt meten actief verbergt of vervormt.

Om te begrijpen waarom, moet je twee typen variabelen leren onderscheiden van de confounder: de mediator en de collider.

### De mediator: de tussenschakel die je niet moet wegcorrigeren

Een **mediator** is een variabele die op het pad ligt *tussen* je marketinginzet en je omzet — een tussenstation waar het effect doorheen loopt. Denk aan websiteverkeer. Een display-campagne trekt mensen naar je website; die bezoekers kopen vervolgens iets. Het pad ziet er zo uit:

*Display-inzet → Websiteverkeer → Omzet*

Stel nu dat je, in je enthousiasme om "alle relevante variabelen" mee te nemen, websiteverkeer als controlevariabele in je model zet naast display-inzet. Wat gebeurt er? Het model gaat op zoek naar het effect van display *dat niet via websiteverkeer loopt*. Maar bij display is er nauwelijks een ander pad — het hele effect loopt juist via die website. Je corrigeert het effect dat je wilde meten straal weg, en het model concludeert: display doet bijna niets. Niet omdat het niks doet, maar omdat je het enige kanaal waarlangs het werkt hebt afgesloten.

Dit is precies het omgekeerde advies van de confounder-regel uit 4.3. Bij een confounder corrigeer je wél; bij een mediator corrigeer je juist niet. Het onderscheid zit in de richting van de pijlen: een confounder stuurt pijlen uit naar zowel de inzet als de omzet; een mediator ontvangt een pijl van de inzet en stuurt zelf een pijl door naar de omzet. Die richting maakt het hele verschil.

> **[Figuur 4.3 — Confounder versus mediator]** *Twee kleine diagrammen naast elkaar. Links de confounder: een pijl die uitwaaiert naar zowel inzet als omzet (wél corrigeren). Rechts de mediator: een keten van inzet naar tussenvariabele naar omzet (niet corrigeren).*

### De collider: de variabele die schijnverbanden creëert als je erop let

De derde en meest verraderlijke variabele is de **collider**: een variabele die pijlen *ontvangt* van twee andere variabelen, in plaats van ze uit te sturen. Op het eerste gezicht lijkt een collider onschuldig — hij beïnvloedt niets. Maar zodra je conditioneert op een collider (hem als controlevariabele opneemt, of je data ernaar filtert), creëer je een kunstmatig verband tussen de twee variabelen die er naartoe wijzen, zelfs als die in werkelijkheid niets met elkaar te maken hebben.

Een voorbeeld dat dit tastbaar maakt: stel, zowel televisie-inzet als een prijsverlaging beïnvloeden onafhankelijk van elkaar of een product "in de aandacht" komt bij analisten binnen het bedrijf — dat "in de aandacht komen" is de collider. Filter je nu je data zodanig dat je alleen naar de weken kijkt waarin het product "in de aandacht" stond, dan ontstaat er plotseling een schijnverband tussen televisie-inzet en prijsverlaging, ook al hadden die in werkelijkheid niets met elkaar te maken. De reden: als je weet dat het product in de aandacht kwam, en je weet dat er geen prijsverlaging was, dan moet de televisie-inzet wel hoog zijn geweest om diezelfde aandacht te verklaren — en omgekeerd. Deze wisselwerking is puur een gevolg van je selectie, niet van de werkelijkheid.

Colliders zijn lastiger te herkennen dan confounders, en ze komen minder vaak expliciet voor in een MMM. Waar je ze wél tegenkomt, is vaak subtieler: wanneer je bijvoorbeeld alleen kijkt naar weken waarin een campagne "succesvol" werd genoemd, of naar klanten die een bepaalde combinatie van kenmerken hebben. Onthoud de vuistregel: **filter of corrigeer nooit voor een variabele zonder eerst te controleren of hij misschien pijlen ontvangt in plaats van uitstuurt.**

### De praktische beslisregel

Zet je deze drie soorten variabelen naast elkaar, dan ontstaat een heldere beslisregel die je bij elke nieuwe variabele kunt toepassen:

| Type variabele | Herkenning | Actie |
|---|---|---|
| **Confounder** | Stuurt pijlen naar zowel inzet als omzet | Wél opnemen |
| **Mediator** | Ontvangt pijl van inzet, stuurt door naar omzet | Niet opnemen |
| **Collider** | Ontvangt pijlen van twee andere variabelen | Niet opnemen, niet op filteren |

Deze tabel is precies waarom "gooi alle data erin" een van de meest gemaakte fouten in MMM is. Meer variabelen is niet automatisch beter — het hangt volledig af van waar die variabele in je causale structuur staat.

---

## 4.5 De hiërarchie van bewijs: van anekdote tot experiment

### Niet elk bewijs weegt even zwaar

Nu je weet hoe je confounders, mediators en colliders herkent, is het goed om een stap terug te doen en te kijken waar MMM staat in het bredere landschap van bewijsvoering. Niet elke manier om een causale claim te onderbouwen is even sterk. Er bestaat een min of meer natuurlijke rangorde, van zwak naar sterk:

1. **Anekdote.** "Toen we die ene campagne draaiden, steeg de omzet." Eén waarneming, geen controle voor iets anders dat er tegelijkertijd gebeurde. De zwakste vorm van bewijs, maar ook de meest gehoorde in vergaderkamers.
2. **Correlatie.** "Onze omzet en ons budget stijgen al jaren samen." Iets meer body, maar precies het probleem uit 4.1 — je weet niet of het toeval is, omgekeerde causaliteit, of een confounder.
3. **Observationeel model (MMM).** Een model dat systematisch corrigeert voor bekende confounders en gebruikmaakt van variatie in de tijd. Sterker dan correlatie, omdat het expliciet aannames maakt en toetst — maar nog steeds afhankelijk van de vraag of je de juiste confounders te pakken hebt.
4. **Natuurlijk experiment.** Een gebeurtenis buiten je controle die toevallig lijkt op een gerandomiseerd experiment — bijvoorbeeld een regionale storing die de campagne in een deel van het land onbedoeld stillegde. Sterk bewijs, maar zeldzaam en niet naar wens te plannen.
5. **Gerandomiseerd experiment.** Je bepaalt zelf, willekeurig, wie wel en wie geen marketinginzet krijgt. Dit is de gouden standaard, omdat randomisatie in één klap alle mogelijke confounders wegneemt — bekende én onbekende.

### Waar MMM staat, en waarom dat oké is

MMM bevindt zich op trede drie: sterker dan een losse correlatie, maar zwakker dan een experiment. Dat is geen zwaktebod — het is een eerlijke plaatsbepaling. De reden dat je zelden puur met experimenten werkt, is praktisch: je kunt niet elk kanaal permanent uitzetten in de helft van je markt om het effect te meten. MMM is het instrument dat het dichtst bij de experimentele zuiverheid komt terwijl het toch werkt met de data die een bedrijf al heeft.

Het goede nieuws: deze twee benaderingen sluiten elkaar niet uit. Wanneer je een MMM kunt combineren met een experiment — ook al is dat er maar één, voor één kanaal — dan kun je de uitkomst van dat experiment gebruiken om je model te ijken en te toetsen. Die combinatie van model en experiment vormt samen een sterker bewijs dan elk van beide afzonderlijk. Je leert deze techniek, **kalibratie** genoemd, verderop in dit boek uitgebreid kennen.

---

## 4.6 Identificatie: wanneer kún je een effect eigenlijk schatten?

### Het probleem van kanalen die synchroon bewegen

Er is nog een laatste, dieper probleem dat je moet begrijpen voordat je aan een model begint, en het heeft niets te maken met welke variabelen je wel of niet opneemt. Het gaat over de vraag of er in je data überhaupt genoeg informatie zit om een effect te schatten.

Stel je voor: een adverteerder zet elke campagne tegelijk in op televisie én op online video. Altijd samen aan, altijd samen uit, altijd in dezelfde verhouding. Wat er ook met de omzet gebeurt, je kunt onmogelijk zien of dat door televisie kwam of door online video — de twee bewegen als één blok. Ze zijn, in vaktaal, **niet identificeerbaar**: geen enkele hoeveelheid data of rekenkracht kan ze uit elkaar trekken, simpelweg omdat de informatie om ze te scheiden nooit heeft bestaan.

Dit klinkt misschien als een uitzonderlijk scenario, maar in de praktijk kom je verzwakte varianten voortdurend tegen. Twee kanalen die bijna altijd samen op- en afschalen. Een budget dat al drie jaar in dezelfde verhouding over de kanalen wordt verdeeld. Een campagne die altijd in dezelfde weken van het jaar draait als een andere. In al deze gevallen ontbreekt niet je model, maar je *data* de informatie die nodig is.

### Zonder variatie, geen les

De kern van dit inzicht kun je in één zin samenvatten: **zonder variatie in je marketinginzet, valt er niets te leren over het effect van die inzet.** Als een kanaal ieder jaar exact hetzelfde budget krijgt, in exact dezelfde weken, dan heeft het model geen enkel aanknopingspunt om het effect van dat kanaal te onderscheiden van de constante baseline. Variatie — schommelingen in de tijd, verschillen tussen regio's, verschillen in intensiteit — is de brandstof waarop elk causaal model draait.

Dit inzicht heeft twee directe gevolgen voor je werk als MMM-specialist. Ten eerste moet je bij het beoordelen van een dataset altijd vragen: hoeveel variatie zit er eigenlijk in de inzet van elk kanaal, en bewegen kanalen onafhankelijk van elkaar? Ten tweede geeft dit je een concreet, waardevol advies richting klanten: wil je een kanaal echt goed kunnen meten, zorg dan voor bewuste variatie in de inzet. Een campagne die nooit varieert, is voor een model even ondoorgrondelijk als een taart die je nooit met een ander recept hebt gebakken.

---

## 4.7 De causale checklist voor ieder MMM-project

Je hebt nu het volledige gereedschap in handen: het onderscheid tussen correlatie en causaliteit, het herkennen van confounders, mediators en colliders, het denken in bewijskracht, en het besef dat variatie een voorwaarde is voor elke schatting. Zet je dit alles samen, dan ontstaat een korte checklist die je bij ieder nieuw project doorloopt, het liefst nog vóórdat je één regel code schrijft.

**Welke confounders zijn er?** Loop de bekende verdachten langs — seizoen, promoties, prijs, lanceringen, economie, concurrentie — en vraag per stuk: stuurt deze zowel de media-inzet als de omzet aan?

**Wat is de causale structuur?** Teken de DAG, al is het maar een schets op een whiteboard. Welke variabelen sturen pijlen naar zowel inzet als omzet? Welke liggen juist tussen inzet en omzet in?

**Waar zit de variatie?** Bekijk voor elk kanaal of de inzet door de tijd heen daadwerkelijk beweegt, en of kanalen onafhankelijk van elkaar bewegen. Waar die variatie ontbreekt, weet je vooraf dat de schatting zwak of onbetrouwbaar zal zijn.

**Welke effecten zijn identificeerbaar?** Wees eerlijk over kanalen die zo sterk samen bewegen dat een model ze onmogelijk uit elkaar kan trekken. Beter om dat vooraf te benoemen dan achteraf een onverklaarbaar resultaat te moeten verdedigen.

**Welke aannames maak ik, en durf ik ze hardop uit te spreken?** Elk model steunt op aannames die je niet volledig kunt bewijzen. De vraag is niet of je aannames maakt — dat doe je altijd — maar of je ze kunt benoemen, verdedigen en, waar mogelijk, toetsen.

Deze vijf vragen keren in dit boek voortdurend terug, in andere vormen en met andere details, tot ze een tweede natuur worden. Onthoud vooral het onderliggende idee: een model is nooit beter dan het causale denken dat eraan voorafging. De rekenkracht van Bayesiaanse statistiek en de flexibiliteit van PyMC, die je vanaf deel IV gaat leren, lossen geen van de problemen op die je in dit hoofdstuk bent tegengekomen. Ze maken je beter in het uitrekenen van een model — niet automatisch in het bouwen van het juíste model. Dat onderscheid maak jij, met het gereedschap dat je nu in handen hebt.

Met het fundament van dit boek compleet — wat MMM is, waar het vandaan komt, waarom incrementaliteit ertoe doet, en hoe je causaal denkt — is het tijd om de blik te verleggen. Voordat je ook maar één model bouwt, moet je het domein begrijpen waarin je gaat werken: marketing zelf. Daarmee begint deel II.
