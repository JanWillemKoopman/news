# Hoofdstuk 1 — Wat is Media Mix Modeling?

> **Deel I — Het fundament: waarom Media Mix Modeling?**
> Moeilijkheidsgraad: Beginner · Geschatte studietijd: 2–3 uur · Voorkennis: geen

---

## Waar dit hoofdstuk over gaat

Stel je voor: je zit voor het eerst aan tafel bij een marketingdirecteur. Ze schuift een spreadsheet naar je toe met de mediabudgetten van vorig jaar — televisie, online video, zoekmachine-advertenties, social media, een sponsorcontract — bij elkaar ruim acht miljoen euro. Dan stelt ze de vraag waar dit hele boek over gaat:

> *"Wat heeft dit ons nou eigenlijk opgeleverd? En hoe moet ik het budget volgend jaar verdelen?"*

Het eerlijke antwoord van de meeste organisaties op deze vraag is: *we weten het niet precies.* Niet omdat er te weinig data is — er is juist méér marketingdata dan ooit — maar omdat de vraag fundamenteel moeilijk is. Verkoop ontstaat uit tientallen oorzaken tegelijk, en het uit elkaar trekken van die oorzaken is een van de lastigste problemen in de toegepaste data-analyse.

**Media Mix Modeling (MMM)** — in het Nederlands soms *marketingmixmodellering* genoemd, al gebruikt vrijwel iedereen in de praktijk de Engelse term — is de methode die dit probleem aanpakt. Dit hoofdstuk legt uit wat MMM is, wat het oplevert, wat het uitdrukkelijk *niet* is, en hoe het zich verhoudt tot de twee andere grote meetmethoden: attributie en experimenten.

**Na dit hoofdstuk kun je:**

- MMM in één minuut uitleggen aan een CMO én aan een data scientist — op het juiste niveau voor elk;
- het verschil benoemen tussen MMM, attributie en experimenten, en uitleggen waarom ze elkaar aanvullen;
- de belangrijkste outputs van een MMM-project noemen en herkennen: contributie, ROI, saturatiecurves en budgetoptimalisatie;
- de grenzen van MMM aangeven: welke vragen het model wél en niet kan beantwoorden.

Dit hoofdstuk introduceert bewust nog geen statistiek en geen code. Eerst moet het *waarom* en het *wat* volledig helder zijn; het *hoe* volgt in de rest van het boek.

---

## 1.1 De kernvraag van marketing: wat levert mijn geld op?

### Het toewijzingsprobleem

Nederlandse adverteerders geven jaarlijks miljarden euro's uit aan media. Voor een individueel bedrijf is het marketingbudget vaak een van de grootste beïnvloedbare kostenposten — en tegelijk de post waarvan het rendement het slechtst bekend is. De uitspraak die aan warenhuispionier John Wanamaker wordt toegeschreven, is ruim een eeuw oud maar nog altijd pijnlijk actueel:

> *"Half the money I spend on advertising is wasted; the trouble is I don't know which half."*

Waarom is dit zo moeilijk? Omdat verkoop nooit één oorzaak heeft. Kijk naar een willekeurige week omzet van een middelgrote webwinkel. Die omzet is het gecombineerde resultaat van, onder andere:

- de **media-inzet** van die week én van de weken ervoor (een TV-commercial werkt na);
- de **prijs** en eventuele **promoties** — een kortingsactie kan meer doen dan een maand adverteren;
- het **seizoen** — tuinmeubelen verkopen in mei, niet in november;
- **feestdagen en events** — Black Friday, Sinterklaas, een WK-finale;
- het **weer** — een hittegolf verkoopt airco's, een natte zomer regenkleding;
- de **economie** — consumentenvertrouwen, inflatie, koopkracht;
- de **concurrentie** — hun prijzen, hun campagnes, hun voorraadproblemen;
- de **merkkracht** die in eerdere jaren is opgebouwd;
- en simpelweg **gewoontegedrag**: klanten die toch wel gekocht zouden hebben.

Al deze factoren werken *tegelijk*, en erger nog: ze bewegen vaak *samen*. Het mediabudget gaat omhoog in het hoogseizoen. Promoties worden gepland rondom feestdagen. De campagne start precies wanneer de vraag toch al piekt — want dat is, heel begrijpelijk, wanneer de marketeer wil adverteren.

Dit noemen we het **toewijzingsprobleem** (*attribution problem* in brede zin): hoe verdeel je de waargenomen omzet over de vele oorzaken die er tegelijk aan hebben bijgedragen?

### De taart-analogie

Een analogie die dit tastbaar maakt en die we in dit boek vaker zullen gebruiken:

> Stel, je bakt een taart met tien ingrediënten en hij smaakt fantastisch. Achteraf vraagt iemand: *hoeveel van de smaak kwam door de vanille?* Je kunt de taart niet terugdraaien en opnieuw bakken zonder vanille. Je kunt hem ook niet ontleden in "vanillesmaak" en "restsmaak". En het antwoord "de vanille was 8% van het gewicht" zegt niets over de bijdrage aan de smaak — een snufje zout kan meer verschil maken dan een kilo bloem.

Marketing heeft precies dit probleem. De omzet is de taart. De kanalen, de prijs, het seizoen en het merk zijn de ingrediënten. En de vraag "wat deed TV?" is de vanillevraag: je kunt het jaar niet overdoen zonder TV om het verschil te proeven.

Toch is die vraag niet hopeloos. Er is één belangrijke uitweg, en die vormt de kern van alles wat volgt: **variatie in de tijd**. Een bakker bakt niet één taart, maar honderden — en niet elke keer met precies dezelfde hoeveelheid vanille. Wie systematisch bijhoudt hoe de smaak meebeweegt met de receptvariaties, kan wél iets leren over de bijdrage van elk ingrediënt. Een adverteerder "bakt" iedere week een nieuwe week omzet, telkens met een net iets andere mix van media-inzet, prijzen en omstandigheden. In die honderden weken variatie zit informatie verborgen over wat elk kanaal bijdraagt. MMM is de methode die deze informatie eruit haalt.

### Marketing effectiveness: het vakgebied

De discipline die zich met deze vraag bezighoudt heet **marketing effectiveness** — in het Nederlands: *marketingeffectiviteit*, het meten van het daadwerkelijke effect van marketinginspanningen op bedrijfsresultaten. Let op het woord *daadwerkelijk*. Het gaat niet om de vraag hoeveel mensen een advertentie hebben *gezien* (bereik), hoeveel er *geklikt* hebben (respons), of hoe *mooi* de campagne was (creativiteit). Het gaat om de vraag: **hoeveel extra omzet, marge of klanten heeft deze inzet veroorzaakt — vergeleken met de situatie waarin we het niet hadden gedaan?**

Dat woord "veroorzaakt" is zwaar beladen. Het betekent dat marketing effectiveness in de kern een vraag is over *oorzaak en gevolg* — over **causaliteit**. In hoofdstuk 4 gaan we daar diep op in. Voor nu is één inzicht genoeg: de meeste getallen die in marketingdashboards voorbijkomen, beantwoorden deze causale vraag *niet*. Ze meten activiteit (impressies, clicks, sessies) of ze verdelen conversies volgens een rekenregel (attributie). Het gat tussen "wat het dashboard zegt" en "wat de marketing veroorzaakte" is het bestaansrecht van dit boek.

### Waarom de vraag urgenter is dan ooit

Je zou kunnen denken: dit probleem is honderd jaar oud, waarom zou een bedrijf er nú in investeren? Drie redenen, die we in hoofdstuk 2 en 3 uitwerken maar hier alvast benoemen:

1. **De druk op budgetten neemt toe.** CFO's vragen om verantwoording; "we hebben veel bereik gehad" volstaat niet meer als rapportage voor miljoenenbudgetten.
2. **De digitale meetbelofte is gebroken.** Vijftien jaar lang leek het alsof online tracking het probleem had opgelost: elke click meetbaar, elke conversie herleidbaar. Privacywetgeving, cookie-afbouw en de beperkingen van platformmeting hebben laten zien dat die belofte grotendeels een illusie was.
3. **De methoden en het gereedschap zijn volwassen geworden.** Wat in de jaren negentig maandenlang specialistenwerk was, is dankzij moderne Bayesiaanse software (waaronder PyMC, het gereedschap van dit boek) en open-sourceframeworks binnen bereik van goed opgeleide data-analisten gekomen. Precies daar mikt dit boek op.

---

## 1.2 Media Mix Modeling in één alinea, één pagina en één hoofdstuk

Een MMM-specialist heeft één ongewone kerncompetentie: hetzelfde concept kunnen uitleggen op drie totaal verschillende niveaus. Aan de CMO in de lift, aan de marketingmanager in een workshop, en aan een collega-analist die het model gaat reviewen. In dit subhoofdstuk bouwen we die drie uitlegniveaus expliciet op. Leer ze alle drie — je gaat ze alle drie nodig hebben, soms binnen één vergadering.

### Niveau 1: de elevator pitch (één alinea)

> **Media Mix Modeling is een statistische methode die uit je historische verkoop- en mediadata berekent wat elk marketingkanaal daadwerkelijk heeft bijgedragen aan je omzet.** Het model kijkt hoe je omzet in de afgelopen jaren week voor week meebewoog met je inzet per kanaal — en corrigeert daarbij voor alles wat óók invloed had: seizoen, prijs, promoties, economie. Het resultaat: per kanaal een rendement, inzicht in waar extra budget nog wat oplevert en waar het verzadigd is, en een onderbouwd advies over hoe je het budget beter kunt verdelen.

Merk op wat deze pitch *niet* bevat: geen "Bayesiaans", geen "regressie", geen "adstock". De pitch beantwoordt de vraag van de luisteraar (*wat heb ik eraan?*), niet de vraag van de bouwer (*hoe werkt het?*).

### Niveau 2: de managementsamenvatting (één pagina)

Op dit niveau leg je uit hoe het model *conceptueel* werkt, zonder wiskunde. De onderdelen:

**De input.** Het model gebruikt geaggregeerde data, meestal op weekniveau, over twee tot drie jaar: de omzet (of een andere doelvariabele), de inzet per mediakanaal (uitgaven, impressies of GRP's), en zogeheten controlevariabelen — factoren die de omzet óók beïnvloeden, zoals prijs, promoties, feestdagen, seizoen en weer. Belangrijk verkoopargument in privacygevoelige tijden: het model heeft **geen persoonsgegevens nodig**. Geen cookies, geen individuele klantprofielen — alleen totalen per week.

**Het principe.** Het model zoekt naar systematische patronen: als de omzet stelselmatig hoger ligt in weken met (en vlak ná) hoge TV-inzet — *ook nadat* we rekening houden met seizoen, prijs en promoties — dan is dat bewijs voor een TV-effect, en de grootte van dat patroon vertelt hoe groot dat effect is. Hetzelfde geldt voor elk ander kanaal.

**De marketingkennis in het model.** Een goed MMM is geen kale regressie maar bevat decennia aan marketingwetenschap in zijn structuur. Twee voorbeelden die je op dit niveau altijd noemt. Ten eerste **carry-over**: reclame werkt na. Wie vandaag een commercial ziet, koopt misschien pas over drie weken; het model verdeelt effecten daarom over de tijd. Ten tweede **verzadiging** (*saturation*): de eerste ton mediabudget levert meer op dan de tiende. Het model schat voor elk kanaal een curve van afnemende meeropbrengst — en juist die curves maken budgetadvies mogelijk.

**De output.** Een decompositie van de omzet ("welk deel kwam van welk kanaal, welk deel was baseline"), een rendement per kanaal mét onzekerheidsmarge, verzadigingscurves, en scenario-analyses: wat gebeurt er naar verwachting met de omzet als we het budget anders verdelen?

**De eerlijke bijsluiter.** Het model meet kanalen op strategisch niveau (niet op het niveau van individuele advertenties), het heeft betekenisvolle variatie in de data nodig, en de uitkomsten zijn schattingen met onzekerheid — geen boekhoudkundige waarheden. Deze bijsluiter hoort er op managementniveau altijd bij; verwachtingen die je hier niet managet, betaal je later terug met rente (hoofdstuk 29).

### Niveau 3: de technische samenvatting (dit boek in vogelvlucht)

Voor de collega-datawetenschapper of de kritische reviewer beschrijf je MMM als volgt. De rest van het boek werkt elk element uit; beschouw dit als de landkaart.

In de kern is een MMM een **regressiemodel op tijdreeksdata** (*time series regression*): de doelvariabele — bijvoorbeeld wekelijkse omzet — wordt verklaard uit mediavariabelen en controlevariabelen. Conceptueel:

```
omzet(week t) = baseline(t)
              + effect_kanaal_1(t) + effect_kanaal_2(t) + ... + effect_kanaal_K(t)
              + effect_controls(t)
              + ruis(t)
```

Drie dingen maken dit tot een *media mix model* in plaats van een gewone regressie:

1. **Mediatransformaties.** De ruwe media-inzet gaat niet rechtstreeks het model in, maar wordt eerst getransformeerd. Een **adstock-transformatie** smeert het effect uit over de tijd (carry-over: het effect van week *t* werkt door in week *t+1*, *t+2*, …, met een afnemend gewicht). Een **saturatietransformatie** — vaak een Hill-functie of vergelijkbare S-curve — maakt het verband niet-lineair, zodat afnemende meeropbrengst wordt gemodelleerd. De parameters van beide transformaties (hoe snel dooft het effect uit? waar begint de verzadiging?) worden uit de data geschat. Dit is de stof van hoofdstuk 17.

2. **Een expliciete baseline.** Het model schat wat de omzet geweest zou zijn zónder media: het structurele niveau, de trend, het seizoenspatroon en de effecten van prijs, promoties en externe factoren. Alles wat media claimt, moet het claimen *bovenop* deze baseline. De kwaliteit van de baseline bepaalt in hoge mate de kwaliteit van de media-schattingen (hoofdstuk 19).

3. **Bayesiaanse schatting.** Moderne MMM's — en alle modellen in dit boek — worden Bayesiaans geschat. Twee redenen. Ten eerste is het probleem *data-arm en parameter-rijk*: met drie jaar weekdata (156 waarnemingen) en tien kanalen plus transformatieparameters plus controls balanceer je op de rand van wat schatbaar is. **Priors** — expliciet gemaakte voorkennis over plausibele parameterwaarden — houden het model in de realistische zone. Ten tweede levert de Bayesiaanse aanpak volledige **onzekerheidskwantificering**: elke output is een kansverdeling, geen puntschatting, zodat je kunt rapporteren *hoe zeker* je van een ROI bent. Waarom dit voor MMM de juiste keuze is, onderbouwen we in deel IV en hoofdstuk 16; de implementatie in PyMC volgt in deel VI.

Ten slotte de epistemologische positionering, want die zal elke goede reviewer bevragen: MMM doet **causale uitspraken op basis van observationele data**. Dat kan alleen onder aannames — de juiste controlevariabelen, voldoende onafhankelijke variatie in de media-inzet, een correcte modelstructuur. Die aannames zijn niet gratis en niet altijd toetsbaar. Een professioneel MMM-traject maakt ze daarom expliciet, toetst wat toetsbaar is (validatie, hoofdstuk 25), en verankert het model waar mogelijk in experimenteel bewijs (kalibratie, hoofdstuk 33).

### Waarom je alle drie de niveaus moet beheersen

Deze drie uitlegniveaus zijn geen drie versies van hetzelfde verhaal voor verschillende "slimheidsniveaus" — het zijn antwoorden op drie verschillende *vragen*. De CMO vraagt *wat heb ik eraan*, de manager vraagt *kan ik erop vertrouwen*, de analist vraagt *klopt het technisch*. De meest voorkomende communicatiefout in dit vak is niveauverwarring: adstock-decaywaarden uitleggen aan een directie, of een reviewer afschepen met de elevator pitch. In hoofdstuk 29 maken we hier een systematiek van; onthoud voor nu de vuistregel: **bepaal eerst welke vraag je gesprekspartner werkelijk stelt, kies dán je niveau.**

---

## 1.3 De outputs van een MMM

Wat krijgt een organisatie concreet terug voor een MMM-traject? In dit subhoofdstuk lopen we de vijf standaard-outputs langs. Voor elke output beschrijven we wat het is, hoe de bijbehorende visualisatie eruitziet en — belangrijker — welke businessvraag ermee beantwoord wordt. Deze vijf outputs vormen samen het "productassortiment" van de MMM-specialist; in deel VII leren we ze berekenen en presenteren.

### Output 1: de decompositie — wie krijgt welke omzet?

De **decompositie** (*sales decomposition* of *contribution breakdown*) is de moeder van alle MMM-outputs: de historische omzet, week voor week opgedeeld naar herkomst. Visueel is dit meestal een gestapelde vlakgrafiek: onderin een brede band voor de **baseline** (omzet die er ook zonder media-inzet geweest zou zijn), daarbovenop gekleurde banden per mediakanaal, plus banden voor promoties en andere verklarende factoren. Opgeteld volgen de banden de werkelijke omzetlijn.

- **Businessvraag:** *"Waar komt onze omzet eigenlijk vandaan?"*
- **Typisch inzicht:** het baseline-aandeel is vrijwel altijd groter dan de klant verwacht — vaak 60 tot 90 procent van de omzet. Dat is geen slecht nieuws (de baseline ís grotendeels opgebouwde merkkracht, distributie en gewoonte), maar het gesprek erover moet je kunnen voeren; we bereiden dat voor in hoofdstuk 26.

Uit de decompositie volgt per kanaal de **contribution**: de totale incrementele omzet die het kanaal over een periode heeft opgeleverd, in euro's.

### Output 2: ROI en ROAS per kanaal — wat was het waard?

Deel de contribution van een kanaal door wat het kanaal kostte en je krijgt een rendementscijfer. Twee termen die je uit elkaar moet houden — en die in de praktijk voortdurend door elkaar worden gebruikt:

- **ROAS** (*return on ad spend*): incrementele omzet gedeeld door mediakosten. Een ROAS van 3 betekent: elke euro media leverde drie euro omzet op.
- **ROI** (*return on investment*): rendement op basis van *marge* in plaats van omzet. Een ROAS van 3 bij een brutomarge van 25% betekent een verlieslatende inzet (0,75 euro marge per euro kosten) — een inzicht dat menig "succesvol" kanaal in een ander licht zet.

De standaardvisualisatie is een staafdiagram met per kanaal het rendement, altijd voorzien van **onzekerheidsintervallen** — de Bayesiaanse aanpak geeft ons die gratis, en ze horen in elke rapportage (waarom en hoe: hoofdstuk 13 en 26).

- **Businessvraag:** *"Welke kanalen verdienen zichzelf terug?"*
- **Let op:** dit is het rendement van de *historische, gemiddelde* inzet. Voor de vraag "waar moet de vólgende euro heen?" is een andere output nodig — de volgende.

### Output 3: saturatiecurves — waar zit nog ruimte?

Voor elk kanaal schat het model een **responscurve** (*response curve* of *saturation curve*): op de x-as de inzet per week, op de y-as de incrementele omzet die daarbij hoort. De curve stijgt eerst stevig en buigt dan af — de wet van de afnemende meeropbrengst in beeld.

Deze curve is strategisch de waardevolste output van het hele traject, want ze onderscheidt twee vragen die zonder model onontwarbaar zijn:

- **Gemiddeld rendement** (output 2): wat leverde het kanaal per bestede euro op? → beoordeelt het *verleden*.
- **Marginaal rendement**: wat levert één euro *extra* op, gegeven het huidige inzetniveau? → stuurt de *toekomst*.

Het klassieke en steeds terugkerende inzicht: **het kanaal met het hoogste gemiddelde rendement is vaak verzadigd** — het zit al ver op het vlakke deel van zijn curve, waar extra budget weinig meer toevoegt. Terwijl een middelmatig scorend kanaal met een steile curve juist de beste bestemming voor de volgende euro kan zijn.

- **Businessvraag:** *"Waar levert extra budget nog wat op, en waar gooien we het op een verzadigde hoop?"*

### Output 4: tijdsdynamiek — hoe lang werkt het door?

Het model schat per kanaal ook het **effectprofiel in de tijd**: hoe snel het effect opbouwt en uitdooft (het adstock-profiel uit 1.2). Gerapporteerd wordt vaak de **halfwaardetijd**: na hoeveel weken is de helft van het effect uitgewerkt? Typisch beeld: zoekmachine-advertenties werken vrijwel direct en zijn snel uitgewerkt; TV en online video hebben een staart van weken.

- **Businessvraag:** *"Hoe snel mag ik effect verwachten — en beoordelen we campagnes niet te vroeg?"* Een merkcampagne afrekenen op de omzet van de campagneweek zelf is een van de meest voorkomende evaluatiefouten; het effectprofiel maakt zichtbaar waarom.

### Output 5: scenario's en budgetoptimalisatie — wat moeten we doen?

De voorgaande outputs kijken terug; deze kijkt vooruit, en hier betaalt het traject zich uit. Omdat het model per kanaal een responscurve heeft, kan het doorrekenen wat er naar verwachting gebeurt onder een ander budgetplan:

- **Scenarioanalyse** (*what-if*): "wat als het totaalbudget 10% krimpt?", "wat als we de helft van display naar online video schuiven?" — per scenario een verwachte omzet, mét onzekerheidsband.
- **Budgetoptimalisatie**: de omgekeerde vraag — welke verdeling van een gegeven budget maximaliseert de verwachte omzet (of marge)? Het onderliggende principe is elegant: schuif budget net zo lang tussen kanalen tot de *laatste euro overal evenveel oplevert* (hoofdstuk 27).

- **Businessvraag:** *"Hoe moet het budget volgend jaar verdeeld worden?"* — de vraag van de marketingdirecteur uit de opening van dit hoofdstuk.

Eén waarschuwing hoort onlosmakelijk bij deze output, en we herhalen haar in dit boek tot ze vervelend wordt: **het model weet alleen iets over inzetniveaus die het in de data heeft gezien.** Adviseert de optimalisatie een verdubbeling van een kanaal dat historisch nooit boven de helft van dat bedrag uitkwam, dan is dat een extrapolatie — een geïnformeerde gok, geen meting. Professioneel advies begrenst zich tot de gekende zone en adviseert daarbuiten stapsgewijs opschalen en hermeten (hoofdstuk 27.4).

### Het samenhangende geheel

Deze vijf outputs vormen een logische keten die je in vrijwel elke eindpresentatie terugziet:

| # | Output | Vraag | Blik |
|---|--------|-------|------|
| 1 | Decompositie & contribution | Waar kwam de omzet vandaan? | Terug |
| 2 | ROI / ROAS per kanaal | Wat was elk kanaal waard? | Terug |
| 3 | Saturatiecurves | Waar zit nog ruimte? | Heden |
| 4 | Effectprofielen in de tijd | Hoe lang werkt het door? | Heden |
| 5 | Scenario's & optimalisatie | Wat moeten we doen? | Vooruit |

Wie deze keten kan presenteren — van "dit is er gebeurd" via "dit betekent het" naar "dit adviseren wij" — heeft het verhaal van een compleet MMM-traject te pakken.

---

## 1.4 Wat MMM níet is

Net zo belangrijk als weten wat MMM is, is weten wat het niet is. De meeste teleurstellingen in MMM-trajecten komen niet voort uit slechte modellen, maar uit verkeerde verwachtingen die nooit zijn gecorrigeerd. Dit subhoofdstuk behandelt de vijf hardnekkigste misverstanden. Leer ze herkennen — je komt ze allemaal tegen, vaak al in het eerste klantgesprek.

### Misverstand 1: "MMM is een betere attributietool"

Nee — het is een *andere categorie* instrument. **Attributie** verdeelt individuele, getrackte conversies over de contactmomenten (*touchpoints*) die eraan voorafgingen: deze order krijgt 40% toegewezen aan de laatste click, 30% aan de eerste, enzovoort. Attributie werkt op *persoonsniveau*, vereist tracking, en beantwoordt de vraag *"via welke route kwam deze klant binnen?"*

MMM werkt op *geaggregeerd niveau* (weektotalen), gebruikt geen tracking, en beantwoordt de vraag *"hoeveel omzet veroorzaakte dit kanaal?"* Dat lijkt op elkaar maar is het niet: een route beschrijven is iets anders dan een oorzaak meten. De klant die via een branded-search-advertentie binnenkwam nadat een TV-commercial hem het merk leerde kennen, wordt door attributie aan search toegewezen — terwijl de *oorzaak* (deels) TV was. In hoofdstuk 3 ontleden we dit verschil grondig; onthoud voor nu dat de vraag "kunnen jullie MMM-attributie voor ons bouwen?" een contradictie bevat die je vriendelijk moet ontrafelen.

### Misverstand 2: "Dan zie ik straks realtime per campagne wat werkt"

MMM is een **strategisch** instrument, geen tactisch dashboard. Twee harde beperkingen:

- **Granulariteit.** Het model meet op het niveau van kanalen of kanaalgroepen — niet op het niveau van individuele campagnes, advertenties of zoekwoorden. Daarvoor bevat drie jaar weekdata simpelweg te weinig informatie. (Wat "te weinig informatie" precies betekent en waarom dat een wiskundige grens is en geen luiheid van de analist: hoofdstuk 12.)
- **Ritme.** Een MMM wordt periodiek herijkt — per kwartaal, soms maandelijks — en niet per dag ververst. Het informeert de budgetverdeling en de jaarplanning, niet de biedstrategie van morgenochtend.

De juiste taakverdeling, die je klanten vaak letterlijk zult voortekenen: **MMM voor de verdeling over kanalen (strategie), platformtools en experimenten voor de optimalisatie binnen kanalen (tactiek).** Beide lagen hebben bestaansrecht; problemen ontstaan wanneer één laag de vragen van de andere probeert te beantwoorden.

### Misverstand 3: "Het model geeft het exacte antwoord"

Een MMM levert **schattingen met onzekerheid**, geen metingen met drie decimalen. "De ROAS van TV is 2,4" is de verkorte weergave van iets als: *"gegeven de data en onze aannames ligt de TV-ROAS zeer waarschijnlijk tussen 1,6 en 3,3, met 2,4 als meest plausibele waarde."* Dat is geen zwakte van de methode maar een eerlijke weergave van wat er uit observationele data te halen valt — en het is méér beslissingsinformatie, niet minder: een smal interval rond 2,4 vraagt om ander beleid dan een breed interval dat ook 0,9 omvat.

De professionele valkuil zit aan twee kanten. Wie de onzekerheid *verzwijgt*, wekt schijnprecisie en wordt afgerekend zodra een volgend model (of een concurrent-bureau) een ander getal vindt. Wie haar *overdrijft*, maakt het model besluiteloos en waardeloos. De middenweg — onzekerheid rapporteren als bruikbare beslissingsinformatie — is een kernvaardigheid die we opbouwen in hoofdstuk 13, 15 en 29.

### Misverstand 4: "Meer data erin = beter model"

De intuïtie "geef het model álle data, dan zoekt het zelf wel uit wat relevant is" is in de machine-learningwereld soms verdedigbaar, in MMM is ze gevaarlijk. Twee redenen, die we hier alvast planten en in hoofdstuk 4 en 12 laten wortelen:

- Sommige variabelen *moeten* erin (factoren die zowel de media-inzet als de omzet beïnvloeden — het seizoen is het klassieke voorbeeld), en sommige variabelen *mogen er juist niet in* (variabelen die zelf een gevolg van de media zijn, zoals websiteverkeer: wie daarvoor "corrigeert", corrigeert het media-effect weg).
- Elke extra variabele kost statistische kracht, en die is met ~156 weekwaarnemingen schaars.

Variabelenselectie in MMM is dus geen datakwestie maar een *causale ontwerpkeuze*. Dat is misschien wel het belangrijkste onderscheid tussen een MMM-specialist en een generieke modelbouwer.

### Misverstand 5: "Het model vervangt het oordeel van de marketeer"

MMM automatiseert het marketingvak niet — het voedt het. Het model weet niets over de kwaliteit van de creatie, de merkstrategie, een aanstaande productlancering of de dynamiek met een concurrent, behalve voor zover die zaken in de historische cijfers zichtbaar waren. De gezonde verhouding: het model levert de kwantitatieve ruggengraat (wat gebeurde er, wat is het waard, waar zit ruimte), de marketeer levert context, strategie en de beslissing zelf. Trajecten waarin het model als orakel wordt neergezet — door de analist óf door de klant — eindigen slecht: bij de eerste contra-intuïtieve uitkomst klapt het vertrouwen om in afwijzing. Trajecten waarin model en marketeer elkaar bevragen, worden elk jaar beter. Hoe je die samenwerking organiseert is de stof van deel VIII.

### De bijsluiter in één tabel

| MMM is… | MMM is niet… |
|---|---|
| een strategisch meetinstrument voor kanaaleffectiviteit | een attributietool of tracking-vervanger |
| gebaseerd op geaggregeerde data (privacy-proof) | een realtime of campagne-niveau dashboard |
| een schatting mét onzekerheidsmarges | een exacte meting |
| een causaal ontwerp dat domeinkennis vereist | een datalake waar je alles in leeggooit |
| beslissingsondersteuning voor de marketeer | een vervanging van de marketeer |

---

## 1.5 MMM, attributie en experimenten: drie lenzen op hetzelfde probleem

MMM is niet de enige methode om marketingeffect te meten, en een goede specialist doet nooit alsof. Er zijn drie families van meetmethoden, elk met een eigen sterkte en een eigen blinde vlek. Dit subhoofdstuk introduceert het denkraam dat je in elk volwassen meetgesprek nodig hebt: **triangulatie** (*measurement triangulation*) — het combineren van meerdere onvolmaakte lenzen tot één betrouwbaarder beeld.

### Lens 1: attributie — bottom-up, gedetailleerd, maar geen causaliteit

**Attributie** volgt individuele gebruikers over hun contactmomenten en verdeelt conversies volgens een regel of algoritme. Sterktes: enorm gedetailleerd (per campagne, advertentie, zoekwoord), snel (dagelijks vers) en operationeel direct bruikbaar. Blinde vlekken: het ziet alleen wat trackbaar is — offline kanalen, offline verkoop en niet-klikgedrag (een gezíene maar niet geklikte advertentie werkt soms wél) vallen buiten beeld, en het tracking-fundament brokkelt af door privacymaatregelen (hoofdstuk 2). En fundamenteler: attributie beschrijft *routes*, geen *oorzaken*. Het kanaal onderaan de funnel — de laatste click vlak voor aankoop — krijgt structureel te veel eer; de kanalen die de vraag creëerden, te weinig (hoofdstuk 3).

### Lens 2: experimenten — de gouden standaard, maar smal en duur

Bij een **experiment** (bijvoorbeeld een *geo-experiment*: media uitzetten in de ene helft van gematchte regio's en aanlaten in de andere) creëer je zélf het contrafeit: de controlegroep laat zien wat er zonder de inzet gebeurd zou zijn. Randomisatie snijdt alle verstorende factoren in één klap weg — daarom is dit de **gouden standaard** voor causale meting. Blinde vlekken: een experiment beantwoordt één smalle vraag per keer ("wat doet kanaal X, op dit inzetniveau, in deze periode?"), kost tijd en geld, en betekent bewust omzet laten liggen in de controlegroep. Alle kanalen permanent via experimenten meten is voor geen enkele organisatie haalbaar.

### Lens 3: MMM — top-down, compleet, maar aannames-afhankelijk

**MMM** kijkt van bovenaf naar het geheel: alle kanalen, on- én offline, in samenhang met prijs, promotie en omgeving, over meerdere jaren. Sterktes: volledigheid, privacy-bestendigheid, en de vertaling naar budgetbeslissingen (de responscurves). Blinde vlek: MMM leunt op observationele data en dus op aannames — de juiste controls, voldoende variatie, een deugdelijke modelstructuur. Waar een experiment zijn causale claim *afdwingt* via randomisatie, moet MMM haar *verdienen* via zorgvuldig ontwerp en validatie.

### Drie lenzen naast elkaar

| | **Attributie** | **Experimenten** | **MMM** |
|---|---|---|---|
| Perspectief | Bottom-up (per gebruiker) | Interventie (test vs. controle) | Top-down (geaggregeerd) |
| Causale kracht | Laag | Hoogst | Middel–hoog (aannames-afhankelijk) |
| Dekking | Alleen trackbaar digitaal | Eén vraag per experiment | Alle kanalen, on- en offline |
| Detailniveau | Advertentie/zoekwoord | De geteste interventie | Kanaal(groep) |
| Snelheid | Realtime | Weken–maanden per test | Kwartaal-ritme |
| Privacy-afhankelijk | Sterk | Beperkt | Nauwelijks |
| Typische rol | Tactiek binnen kanalen | IJkpunten en twistpunten beslechten | Strategie en budgetallocatie |

### Triangulatie: de lenzen laten samenwerken

De pointe van dit overzicht is niet "MMM wint" — de pointe is dat de lenzen elkaars zwaktes afdekken, en dat een volwassen meetpraktijk ze bewust combineert:

- **MMM** levert het strategische totaalbeeld en de budgetverdeling;
- **experimenten** ijken het MMM op de plekken waar de onzekerheid of het wantrouwen het grootst is — een experimentuitkomst kan via de priors zelfs rechtstreeks in het model worden verwerkt (**kalibratie**, hoofdstuk 33: een van de mooiste toepassingen van de Bayesiaanse aanpak);
- **attributie en platformdata** blijven het tactische werkpaard binnen kanalen.

Dit denkraam heeft ook een praktische gespreksfunctie die je vaker zult gebruiken dan je nu denkt. Wanneer het MMM en het platformdashboard elkaar tegenspreken — en dat zúllen ze — is de vraag niet "wie liegt er?", maar: *deze instrumenten meten verschillende dingen door verschillende lenzen; laten we begrijpen waarom ze verschillen.* Dat gesprek constructief kunnen voeren is een kerncompetentie van de MMM-specialist (hoofdstuk 31).

---

## 1.6 Voor wie is dit boek en hoe lees je het

### Voor wie

Dit boek is geschreven voor **data-analisten, marketing-analisten, BI-specialisten en analytics consultants** die zelfstandig MMM-projecten willen leren uitvoeren. We veronderstellen: ervaring met SQL, behoorlijke kennis van Python, basiskennis van Pandas, en statistiek op het niveau van "ik begrijp in grote lijnen wat regressie doet". We veronderstellen *niet*: een graad in statistiek, ervaring met Bayesiaanse methoden, of marketingkennis — alles daarvan bouwen we vanaf de grond op.

De belofte, die we bij het eindproject (hoofdstuk 46) inlossen: wie dit boek doorwerkt — inclusief de oefeningen — kan een compleet MMM-traject zelfstandig uitvoeren: van de eerste klantmeeting via data, model en validatie tot budgetadvies en presentatie, en kan elke gemaakte keuze onderbouwen tegenover klanten, marketeers en senior data scientists.

### De filosofie: eerst begrijpen, dan bouwen

De opbouw van dit boek weerspiegelt één overtuiging: **PyMC-code schrijven is het makkelijkste deel van MMM.** Het moeilijke deel is alles eromheen — de marketing begrijpen, de causale valkuilen zien, de data wantrouwen, de uitkomsten vertalen, het advies verdedigen. Daarom komt de code pas in deel VI, nadat marketing (deel II), data (deel III), statistische intuïtie (deel IV) en modeltheorie (deel V) staan. Wie de volgorde omdraait en bij de code begint, kan binnen een dag een model laten samplen — en heeft dan een instrument gebouwd dat hij niet kan beoordelen, uitleggen of verdedigen. Elke Engelse vakterm wordt bij eerste gebruik geïntroduceerd met een Nederlandse uitleg en een intuïtie; neem de termen zelf actief in je vocabulaire op, want het werkveld spreekt ze dagelijks.

### De delen in vogelvlucht

| Deel | Hoofdstukken | Kern |
|---|---|---|
| I — Fundament | 1–4 | Wat is MMM, waarom nu, incrementaliteit, causaal denken |
| II — Marketing | 5–7 | Funnel, mediaplanning, de kanalenencyclopedie |
| III — Data | 8–11 | Bronnen, kwaliteit, granulariteit, EDA |
| IV — Statistiek | 12–15 | Regressie, Bayesiaanse intuïtie, sampling, validatie-denken |
| V — MMM-theorie | 16–19 | Waarom Bayesiaans, adstock & saturatie, modelspecificatie |
| VI — Implementatie | 20–25 | Python, PyMC, het referentiemodel, priors, diagnostiek, validatie |
| VII — Business | 26–29 | ROI, optimalisatie, forecasting, communicatie |
| VIII — Praktijk | 30–33 | Het project van A tot Z, consultancy, fouten, experimenten |
| IX — Cases | 34–38 | Vijf complete praktijkcases |
| X — Geavanceerd | 39–46 | Geo-MMM, tijdsvariatie, productie, organisatie, synthese |

### Drie leesroutes

**Route 1 — De aankomend specialist (aanbevolen):** alles, in volgorde, mét oefeningen. De hoofdstukken bouwen expliciet op elkaar; de doorlopende oefencasus groeit mee van dataverzoek (deel III) tot productieadvies (deel X). Reken op enkele maanden naast een baan.

**Route 2 — De adviseur/projectleider:** deel I en II volledig, dan 8–9 (datarealiteit), de conceptuele statistiekhoofdstukken 13 en 15 (sla de sampling-techniek over), en vervolgens deel VII en VIII integraal. Je slaat de implementatie over maar begrijpt elke keuze die het bouwteam maakt — en kunt het gesprek met de klant volledig voeren.

**Route 3 — De bouwer met haast:** hoofdstuk 1, 3, 4 (niet onderhandelbaar — juist voor wie haast heeft), dan 12–15, 17, 19, en deel VI integraal; hoofdstuk 7 en de rest als naslag erbij. Deze route levert een werkend model op; plan de overgeslagen delen alsnog in vóór je eerste echte klanttraject.

Elk hoofdstuk is daarnaast zelfstandig leesbaar geschreven, met expliciete verwijzingen waar voorkennis uit andere hoofdstukken nodig is — het boek is behalve leerboek ook naslagwerk.

### De doorlopende casus en de oefeningen

Vanaf deel III werken we met een vaste oefencasus: een (fictieve maar realistische) Nederlandse omnichannel-retailer met acht mediakanalen, drie jaar weekdata, en alle datakwaliteitsellende die je in het echt ook tegenkomt. De praktijkoefeningen aan het eind van elk hoofdstuk zijn geen decoratie: ze vormen samen de training voor het eindproject, en meerdere oefeningen leveren deliverables op (prior-notities, checklists, presentaties) die je in latere hoofdstukken hergebruikt. De aanbevolen werkvorm is die van een consultancyteam: maak de oefeningen alsof een senior reviewer en een klant ze onder ogen krijgen.

---

## Samenvatting

- Marketing heeft een **toewijzingsprobleem**: omzet ontstaat uit vele gelijktijdige, samen bewegende oorzaken, en de bijdrage per oorzaak is niet direct waarneembaar. De uitweg is **variatie in de tijd**: in honderden weken aan schommelende media-inzet en omzet zit informatie over wat elk kanaal bijdraagt.
- **Media Mix Modeling** is de statistische methode die deze informatie eruit haalt: een tijdreeks-regressiemodel op geaggregeerde data, met mediatransformaties voor **carry-over** (adstock) en **verzadiging** (saturatie), een expliciete **baseline**, en — in dit boek — **Bayesiaanse schatting** met priors en volledige onzekerheidskwantificering.
- De vijf standaard-outputs vormen een keten van terugkijken naar vooruitkijken: **decompositie & contribution → ROI/ROAS → saturatiecurves → effectprofielen in de tijd → scenario's & budgetoptimalisatie.** Het onderscheid tussen *gemiddeld* en *marginaal* rendement is daarbij het strategische scharnierpunt.
- MMM is **niet**: een attributietool, een realtime campagne-dashboard, een exacte meting, een datalake-project of een vervanging van de marketeer. Verwachtingen hierover managen begint in het allereerste gesprek.
- Er zijn drie meetlenzen — **attributie** (gedetailleerd, tactisch, causaal zwak), **experimenten** (causaal sterkst, maar smal en duur) en **MMM** (compleet en strategisch, maar aannames-afhankelijk). Volwassen meting is **triangulatie**: MMM voor strategie, experimenten voor ijking, platformdata voor tactiek.
- Dit boek leert eerst begrijpen, dan bouwen: de PyMC-code (deel VI) is bewust het míddelste deel van het boek, niet het begin.

**Kernbegrippen uit dit hoofdstuk** (alle ook in de woordenlijst, appendix D): *media mix modeling, marketing effectiveness, toewijzingsprobleem, incrementaliteit (vooruitblik), baseline, contribution, decompositie, ROI, ROAS, carry-over / adstock, saturatie / responscurve, marginaal vs. gemiddeld rendement, attributie, geo-experiment, triangulatie, prior (vooruitblik), credible interval (vooruitblik).*

---

## Praktijkoefeningen

**Oefening 1.1 — De drie pitches.** Schrijf een uitleg van MMM voor drie doelgroepen: (a) een CMO, maximaal 75 woorden; (b) een marketingmanager, maximaal 250 woorden; (c) een mede-analist, maximaal 400 woorden. Regels: in (a) geen enkele technische term; in (b) maximaal twee (die je uitlegt); in (c) minimaal de begrippen *adstock*, *saturatie*, *baseline* en *prior*, elk correct gebruikt. Leg de drie teksten naast de niveaus uit 1.2 en noteer waar je niveauverwarring beging.

**Oefening 1.2 — Is MMM het juiste instrument?** Beoordeel voor elk van de volgende drie klantvragen of MMM het juiste instrument is. Antwoord per casus met: ja/nee/deels, je redenering (3–5 zinnen), en — indien nee of deels — welk instrument je in plaats daarvan of aanvullend voorstelt.
- (a) Een verzekeraar (jaarlijks mediabudget €6 mln over TV, radio, online video, search en social; vijf jaar weekdata beschikbaar) wil weten hoe het budget over kanalen verdeeld moet worden.
- (b) Een e-commercebedrijf wil weten welke van drie banner-varianten de meeste conversies oplevert.
- (c) Een start-up (acht maanden actief, budget vrijwel volledig naar Meta en Google, sterk groeiende maar korte datahistorie) wil "de ROI van alle marketing" weten.

**Oefening 1.3 — De outputs herkennen.** Zoek (of laat je aanreiken) een publiek voorbeeld van een MMM-rapportage — bijvoorbeeld uit de documentatie van PyMC-Marketing, Meridian of Robyn. Identificeer welke van de vijf outputs uit 1.3 erin voorkomen, welke ontbreken, en of onzekerheid gerapporteerd wordt. Schrijf drie kritische vragen die je als reviewer over de rapportage zou stellen.

**Oefening 1.4 — Het verwachtingsgesprek (rollenspel of schriftelijk).** Een klant opent het kennismakingsgesprek met: *"Mooi, dat MMM — dan kunnen we eindelijk per campagne realtime zien wat werkt, toch?"* Schrijf je antwoord uit (maximaal een halve pagina). Eisen: corrigeer beide misverstanden (granulariteit én ritme) zonder de klant af te schrikken, en eindig met wat MMM *wél* voor deze klant kan betekenen.

---

*Volgende hoofdstuk: **Hoofdstuk 2 — De geschiedenis en renaissance van MMM**, waarin we zien waar het vak vandaan komt, hoe de digitale trackingbelofte opkwam en brak, en waarom juist de privacy-omwenteling MMM terugbracht in het hart van de marketingmeting.*
