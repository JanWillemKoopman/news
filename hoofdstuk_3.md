# Hoofdstuk 3 — Het attributieprobleem en incrementaliteit

> **Deel I — Het fundament: waarom Media Mix Modeling?**
> Moeilijkheidsgraad: Beginner–Gemiddeld · Voorkennis: hoofdstuk 1 en 2

---

## Waar dit hoofdstuk over gaat

Er is één misverstand dat meer verkeerde marketingbeslissingen veroorzaakt dan alle andere bij elkaar. Het klinkt zo: *"Meta rapporteert een ROAS van 8, dus elke euro die we daar inleggen, levert acht euro op."* Klinkt logisch. Het is bijna altijd onjuist.

In dit hoofdstuk leer je precies waarom. Je ontdekt het verschil tussen wat een advertentieplatform *claimt* en wat je marketing *werkelijk oplevert*. Dat verschil heeft een naam — **incrementaliteit** — en het is het belangrijkste begrip uit dit hele boek. Vrijwel elke lastige discussie die je ooit met een klant zult voeren, komt hierop neer. En vrijwel elk goed argument voor Media Mix Modeling begint hier.

We bouwen het op in vier stappen. Eerst kijken we hoe attributie conversies toewijst en waarom dat een rekentruc is en geen meting. Daarna leggen we het onderliggende mechanisme bloot: waarom platforms structureel te veel eer opstrijken. Vervolgens introduceren we het begrip incrementaliteit als het antwoord op de enige vraag die er echt toe doet. En we sluiten af met wat de praktijk ons heeft geleerd, en met de brug naar het model dat dit probleem aanpakt.

**Na dit hoofdstuk kun je:**

- uitleggen wat het verschil is tussen gerapporteerde, geattribueerde en incrementele conversies;
- herkennen waarom advertentieplatforms hun eigen effect stelselmatig overschatten;
- beargumenteren waarom vooral branded search en retargeting vaak te veel eer krijgen;
- de begrippen baseline, contrafeit en incrementele omzet correct hanteren in een klantgesprek.

---

## 3.1 Attributie: hoe platforms conversies claimen

### Wat attributie is

Stel, iemand koopt vandaag een paar hardloopschoenen in je webshop. Voordat die aankoop plaatsvond, had deze klant contact met je merk. Misschien zag die een videoadvertentie op YouTube, klikte een paar dagen later op een Instagram-post, zocht daarna je merk op via Google, en kocht uiteindelijk na een e-mail met een kortingscode. Vier contactmomenten, één aankoop.

De vraag van **attributie** (*attribution*, in het Nederlands: toewijzing) is: welk contactmoment krijgt de eer voor deze conversie? Attributie is niets anders dan een **verdeelregel** die de conversie opknipt en over die contactmomenten uitsmeert. Elk platform en elk analysepakket doet dat op zijn eigen manier.

### De verdeelregels op een rij

Er bestaan verschillende attributiemodellen. Je hoeft ze niet allemaal uit je hoofd te kennen, maar je moet het idee erachter doorzien. Hier zijn de meest voorkomende:

| Model | Verdeelregel | Wie krijgt de eer |
|---|---|---|
| **Last-click** | Alles naar het laatste contact | De Google-zoekopdracht vlak voor aankoop |
| **First-click** | Alles naar het eerste contact | De YouTube-video die het begon |
| **Lineair** | Gelijk verdeeld | Elk van de vier contacten krijgt 25% |
| **Time-decay** | Meer naar recente contacten | De e-mail en de zoekopdracht tellen zwaarder |
| **Position-based** | Meeste naar eerste en laatste | First en last elk 40%, de rest deelt 20% |
| **Data-driven** | Een algoritme bepaalt de gewichten | Wisselend, ondoorzichtig |

Kijk goed naar deze tabel. Elk model komt tot een *ander* antwoord op dezelfde vraag, met precies dezelfde data. Last-click geeft alle eer aan Google; first-click geeft alle eer aan YouTube. Toch is er in werkelijkheid maar één klant geweest, die één keer heeft gekocht.

### De blinde vlek die alle modellen delen

Hier komt de kern. Al deze modellen verdelen conversies over de contactmomenten. Maar geen enkel model stelt de vraag die er werkelijk toe doet:

> *Zou deze klant ook gekocht hebben zonder dat contactmoment?*

Neem het "data-driven" model, dat vaak wordt gepresenteerd als de slimme, moderne oplossing. Het gebruikt geavanceerde statistiek om de gewichten te bepalen. Maar ook dit model verdeelt slechts — het meet geen oorzaak. Het beschrijft welke *routes* klanten aflegden voordat ze kochten. Het vertelt je niet welke contactmomenten die aankoop hebben *veroorzaakt*.

Dat onderscheid — route versus oorzaak — is subtiel maar allesbepalend. De volgende paragraaf laat zien waarom.

---

## 3.2 Het fundamentele probleem: adverteren aan wie tóch al koopt

### De paraplu-verkoper

Beeld je een straatverkoper in die alleen paraplu's aanbiedt op het moment dat het begint te regenen. Zijn verkoopcijfers zijn uitstekend. Bijna iedereen aan wie hij een paraplu aanbiedt, koopt er een. Als je zijn "conversieratio" zou meten, zou je concluderen: deze verkoper is briljant, hij overtuigt vrijwel iedereen.

Maar bedenk wat er werkelijk gebeurt. Het regent. De mensen die hij aanspreekt, wilden *sowieso* al een paraplu. De verkoper heeft de vraag niet gecreëerd — hij is er alleen op het juiste moment gaan staan. Zijn hoge conversieratio meet niet zijn overtuigingskracht, maar zijn talent om op te duiken precies wanneer de behoefte er al is.

Dit is, in één beeld, het fundamentele probleem van digitale attributie.

### Hoe platforms de regen opzoeken

Advertentieplatforms zijn buitengewoon goed geworden in het opzoeken van "de regen". Hun hele verdienmodel draait erom advertenties te tonen aan mensen die waarschijnlijk gaan kopen. Dat is precies wat je als adverteerder wilt — maar het maakt de meting bedrieglijk.

Denk aan iemand die op Google zoekt naar "Nike Pegasus kopen". Die persoon heeft de koopbeslissing praktisch al genomen. De merknaam en het product staan in de zoekopdracht. Toont Nike nu een advertentie boven aan de zoekresultaten, dan klikt deze persoon daar mogelijk op en koopt. De attributie noteert netjes: *conversie dankzij deze advertentie*. Maar zou deze koper zonder die advertentie zijn afgehaakt? Vrijwel zeker niet. Die had gewoon op het organische resultaat eronder geklikt, of het product elders gehaald.

Dit mechanisme heeft een naam: **selectiebias** (*selection bias*). De advertentie wordt getoond aan een selectie mensen die tóch al zou kopen. Het platform claimt vervolgens de conversie die er ook zonder de advertentie was geweest. In de statistiek noemen we dit ook wel **activity bias**: je meet activiteit die samenvalt met de aankoop, niet activiteit die de aankoop veroorzaakt.

> **[Figuur 3.1 — De paraplu-illustratie]** *Twee tijdlijnen naast elkaar. Boven: de koopintentie stijgt vanzelf (het "gaat regenen"), en de advertentie verschijnt precies op de piek. Onder: dezelfde aankoop vindt plaats, met en zonder advertentie. Het verschil tussen beide lijnen — nagenoeg nul — is het werkelijke effect van de advertentie.*

### De twee klassieke overschatters

Twee soorten marketing worden door dit mechanisme bijna altijd overschat. Je zult ze in elk traject tegenkomen, dus leer ze herkennen.

**Branded search.** Dit zijn de zoekadvertenties op je eigen merknaam — iemand die "Coolblue wasmachine" zoekt, krijgt een Coolblue-advertentie bovenaan. De klant kende het merk al en zocht het bewust op. De advertentie oogst deze bestaande vraag; ze creëert die niet. In attributiecijfers scoort branded search fantastisch, met torenhoge ROAS-getallen. In werkelijkheid vangt het grotendeels verkeer op dat toch wel bij je was uitgekomen.

**Retargeting.** Dit zijn de advertenties die je achtervolgen nadat je een webshop hebt bezocht — je bekeek een jas, en dagenlang zie je die jas overal terug. Retargeting richt zich per definitie op mensen die al interesse toonden. Een deel van hen zou sowieso teruggekomen zijn. De advertentie strijkt de eer op voor aankopen die al in de maak waren.

In beide gevallen geldt dezelfde waarschuwing. Een hoge geattribueerde ROAS betekent níet automatisch een hoge incrementele opbrengst. Vaak betekent het juist het tegenovergestelde: de allerhoogste ROAS-cijfers komen vaak van de kanalen die het minst toevoegen, omdat ze het dichtst op de al-bijna-koper zitten.

---

## 3.3 Incrementaliteit: de enige vraag die telt

### Denken in contrafeiten

We hebben nu het probleem scherp. Tijd voor de oplossing — of in elk geval voor de juiste vraag. Die vraag luidt:

> *Hoeveel extra omzet heeft deze marketinginzet veroorzaakt, vergeleken met de situatie waarin we haar niet hadden gedaan?*

Dat "vergeleken met de situatie waarin we haar niet hadden gedaan" is de sleutel. Het heeft een naam: het **contrafeit** (*counterfactual*). Het contrafeit is de wereld die niet is gebeurd — de wereld waarin je die advertentie níet had getoond, dat budget níet had uitgegeven, die campagne níet had gevoerd.

Het effect van je marketing is het verschil tussen twee werelden: de wereld met de inzet, en de contrafeitelijke wereld zonder. Dat verschil noemen we de **incrementaliteit** (*incrementality*), oftewel de incrementele opbrengst. Het is de omzet die er zonder jouw inzet niet geweest zou zijn.

### Baseline en incrementeel

Om dit hanteerbaar te maken, splitsen we de totale omzet in twee delen.

Het eerste deel is de **baseline**: de omzet die er ook geweest zou zijn zonder enige media-inzet. Die ontstaat uit je merkkracht, je distributie, je vaste klanten, gewoontegedrag en de onderliggende vraag in de markt. De baseline is geen nul. Voor de meeste gevestigde merken is die zelfs behoorlijk groot.

Het tweede deel is de **incrementele omzet**: het extra volume dat je marketing daar bovenop heeft gecreëerd. Dít is wat je meet, wat je optimaliseert, en waarvoor je uiteindelijk betaalt.

> **[Figuur 3.2 — Baseline en incrementeel]** *Een omzetgrafiek over de tijd. De onderste band is de baseline (de omzet zonder marketing). De gekleurde band daarbovenop is de incrementele bijdrage van de media. Alleen die bovenste band is beïnvloedbaar met je budget.*

Zie je waarom "conversies" zonder contrafeit betekenisloos zijn? Een platform dat 10.000 conversies claimt, vertelt je niet hoeveel van die 10.000 er ook zonder de advertenties waren geweest. Misschien is de incrementele bijdrage 8.000. Misschien 2.000. Misschien, bij puur branded search, bijna nul. Het conversiegetal alleen kan het verschil niet zien — en jij kunt op dat getal dus geen budgetbeslissing baseren.

### Waarom dit alles verandert

Zodra je in incrementaliteit gaat denken, verandert je hele kijk op marketingmeting. Je stopt met vragen "hoeveel conversies claimt dit kanaal?" en begint te vragen "hoeveel conversies zou ik verliezen als ik dit kanaal uitzette?". Dat is een compleet andere vraag, met vaak een compleet ander antwoord.

Neem opnieuw branded search. Zet je het uit, dan verlies je waarschijnlijk weinig omzet: de meeste klanten vinden je organisch alsnog. De incrementele waarde is laag, ook al is de geattribueerde ROAS hoog. Zet je daarentegen een merkcampagne op televisie uit, dan zie je het effect misschien niet meteen in een dashboard — maar over maanden zakt je baseline langzaam weg. De incrementele waarde is hoog, ook al is de geattribueerde ROAS laag of zelfs onmeetbaar.

Precies deze omkering maakt incrementaliteit zo belangrijk. En precies daarom heb je een meetmethode nodig die de baseline expliciet schat en het contrafeit benadert. Maar eerst: hoe weten we zo zeker dat het probleem echt bestaat? Daarvoor kijken we naar de praktijk.

---

## 3.4 Bewijs uit de praktijk: wat lift-studies ons leerden

### Het experiment dat het liet zien

Theorie is één ding. Overtuigend bewijs is iets anders. Gelukkig hebben grote adverteerders het contrafeit soms echt gemeten, door middel van experimenten. Je zet een kanaal uit voor een deel van je publiek of je markt, en je vergelijkt wat er gebeurt met een vergelijkbare groep waar het kanaal aan blijft. Het verschil is de incrementaliteit, rechtstreeks gemeten. Zulke experimenten heten **lift-studies**.

Het bekendste voorbeeld is een grootschalig experiment dat een grote online marktplaats jaren geleden uitvoerde met zijn branded search. Het bedrijf zette de advertenties op de eigen merknaam volledig uit in een deel van de Amerikaanse markten en liet ze elders aan staan. Het idee erachter: als branded search echt zoveel omzet oplevert als de attributie beweerde, dan zou die omzet nu moeten instorten in de markten zonder advertenties.

Dat gebeurde niet. De omzet bleef vrijwel gelijk. Klanten die het merk zochten en de betaalde advertentie niet vonden, klikten simpelweg op het organische resultaat eronder en kochten alsnog. De incrementele waarde van de betaalde branded search bleek dicht bij nul te liggen — terwijl de attributie er jarenlang een prachtig rendement aan had toegeschreven. Het bedrijf had, in feite, betaald voor verkeer dat het gratis kreeg.

### De les, en de nuance

Deze en vergelijkbare studies bevestigen het beeld uit de vorige paragrafen. Het gat tussen geattribueerde en incrementele waarde is niet klein, en niet theoretisch. Het kan het verschil zijn tussen "dit kanaal is onze topper" en "dit kanaal voegt vrijwel niets toe".

Maar pas op met te grote stappen. Eén ding moet je hierbij scherp houden: **resultaten zijn contextafhankelijk.** Dat branded search voor deze marktplaats nauwelijks incrementeel was, betekent niet dat branded search *altijd* waardeloos is. Voor een klein, onbekend merk kan een concurrent die op jouw naam biedt reële schade aanrichten, en dan is verdedigende branded search wél incrementeel. De les is niet "zet branded search uit". De les is: *geloof geen enkel geattribueerd getal zonder je af te vragen wat het contrafeit is.*

Deze nuance is belangrijk in klantgesprekken. Je gebruikt dit bewijs niet om een kanaal af te schieten, maar om uit te leggen waarom je verder moet kijken dan het dashboard. Het onderbouwt de behoefte aan een methode die de incrementaliteit systematisch schat — voor álle kanalen, niet alleen voor het kanaal dat je toevallig een keer hebt uitgezet.

---

## 3.5 Waarom walled gardens het probleem verergeren

### Meten binnen de eigen muren

Tot nu toe hebben we het over één kanaal tegelijk gehad. In werkelijkheid werk je met een handvol grote platforms tegelijk: Google, Meta, en vaak nog TikTok, Amazon of andere. Deze platforms worden **walled gardens** genoemd — ommuurde tuinen. Elk platform is een gesloten wereld die de data over zijn eigen advertenties binnen de eigen muren houdt en zijn eigen prestaties meet en rapporteert.

Dat brengt een probleem met zich mee dat bovenop de selectiebias komt. Elk platform beoordeelt zijn eigen huiswerk. Meta meet het effect van Meta-advertenties, met Meta's definities en Meta's attributievensters. Google doet hetzelfde voor Google. Geen van beide heeft er belang bij om zijn eigen bijdrage laag in te schatten. Dit is geen samenzwering — het is een structureel gevolg van hoe de markt is ingericht. Maar je moet het meewegen bij elk cijfer dat uit zo'n platform komt.

### Het optelprobleem

Het duidelijkste symptoom zie je zodra je de cijfers van de verschillende platforms bij elkaar optelt. Stel, één klant ziet een advertentie op Meta én zoekt daarna via Google. Beide platforms zien "hun" contactmoment vlak voor de aankoop. Beide claimen de conversie. Dezelfde ene verkoop wordt nu twee keer geteld — één keer door Meta, één keer door Google.

Doe je dit voor alle platforms samen, dan gebeurt er iets opvallends. De som van alle geclaimde conversies overstijgt vaak ruim de werkelijke omzet. We noemen dit **dubbeltelling** (*double counting*). In de praktijk zie je regelmatig dat de platforms samen 130%, 150% of nog meer van de daadwerkelijke verkoop opeisen. Wiskundig is dat onmogelijk als beschrijving van de werkelijkheid — er is immers maar 100% omzet te verdelen. Toch staat het zo in de dashboards.

> **[Figuur 3.3 — Dubbeltelling]** *Links: een taart van de werkelijke omzet (100%). Rechts: de opgetelde claims van vier platforms, samen goed voor 150%. Het overschot van 50% bestaat uit conversies die meer dan één keer worden geclaimd.*

### Waarom dit MMM noodzakelijk maakt

Zie je waar dit naartoe gaat? Zolang elk platform binnen zijn eigen muren meet, ontbreekt er iets essentieels: een onafhankelijke scheidsrechter die van bovenaf naar het geheel kijkt. Iemand die niet gebonden is aan één platform, geen belang heeft bij welk kanaal wint, en de bijdragen dwingt om samen op te tellen tot precies de omzet die er werkelijk is.

Dat is exact wat Media Mix Modeling doet. Het kijkt naar de totale omzet, van bovenaf, over alle kanalen tegelijk. Het kent geen platform-belang. En doordat het één gezamenlijk model bouwt voor de hele omzet, kunnen de bijdragen per definitie niet optellen tot meer dan er werkelijk is verkocht. In een wereld van ommuurde tuinen die elk hun eigen succes claimen, is dat overkoepelende, onafhankelijke perspectief geen luxe. Het is de enige manier om een eerlijk totaalbeeld te krijgen.

---

## 3.6 Van attributieprobleem naar MMM: de brug

### Wat MMM anders doet

We hebben het probleem nu van alle kanten bekeken. Rest de vraag: hoe pakt MMM de incrementaliteit dan concreet aan? Zonder al in de techniek te duiken, kun je de aanpak in drie principes vatten.

**Ten eerste benut MMM variatie in de tijd.** In plaats van individuele klanten te volgen, kijkt het model hoe de totale omzet week na week meebeweegt met je media-inzet. Ging de omzet omhoog in en na de weken met veel televisie, ook nadat je rekening houdt met alle andere factoren? Dan is dat bewijs voor een televisie-effect. De schommelingen in je inzet, over honderd weken of meer, vormen als het ware een reeks natuurlijke experimentjes.

**Ten tweede modelleert MMM de baseline expliciet.** Het model schat apart wat de omzet zou zijn geweest zonder media — inclusief seizoen, trend, prijs en promoties. Alles wat een kanaal aan effect claimt, moet het bovenop die baseline verdienen. Zo dwing je het model om onderscheid te maken tussen omzet die er tóch was (baseline) en omzet die de media veroorzaakte (incrementeel). Precies het onderscheid dat attributie mist.

**Ten derde neemt MMM controlevariabelen mee.** Door factoren als prijs, promoties, weer en economie in het model op te nemen, voorkom je dat de media de eer krijgen voor iets wat eigenlijk door het seizoen of een prijsverlaging kwam. Welke variabelen je wel en niet meeneemt, is een vak apart — en het onderwerp van het volgende hoofdstuk.

### Wees ook eerlijk over de grenzen

Nu een waarschuwing die je nooit mag overslaan, hoe overtuigend het bovenstaande ook klinkt. MMM lost het incrementaliteitsprobleem niet *perfect* op. Het benadert het contrafeit, maar het meet het niet rechtstreeks zoals een experiment dat doet. Het model steunt op aannames: dat je de juiste controlevariabelen hebt meegenomen, dat er genoeg variatie in je media-inzet zit, dat de structuur van het model klopt. Als die aannames niet houden, kunnen de schattingen scheef zijn.

Daarom presenteer je MMM nooit als de absolute waarheid. Je presenteert het als de best beschikbare, onafhankelijke schatting van de incrementaliteit — een schatting die eerlijk is over haar eigen onzekerheid, en die je waar mogelijk verankert in echte experimenten. Die combinatie, van model en experiment, is het sterkste wat de meetwereld te bieden heeft.

### Waar we nu staan

Je begrijpt nu de diepste reden waarom MMM bestaat. Attributie beschrijft routes maar meet geen oorzaken. Platforms overschatten hun eigen effect door selectiebias en dubbeltelling. En de enige vraag die er werkelijk toe doet — wat had je verkocht zónder deze inzet? — vereist een methode die de baseline schat en het contrafeit benadert.

Die methode steunt op één cruciale vaardigheid die we nog niet hebben uitgewerkt: het vermogen om oorzaak en gevolg uit elkaar te houden in data die niet uit een experiment komt. Wanneer mag je uit een verband concluderen dat het ene het andere veroorzaakt? Welke variabelen moet je meenemen, en welke juist niet? Dat is de kern van het **causaal denken**, en daarmee gaan we in hoofdstuk 4 verder — het laatste fundamenthoofdstuk voordat we ons op de marketing zelf storten.
