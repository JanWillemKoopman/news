"""
Gecureerde lijst van publieke Telegram-kanalen voor Oekraïne-oorlog OSINT.
Toegankelijk via https://t.me/s/SLUG zonder API-key.
"""

CHANNELS = [
    # --- Oekraïense / Westerse OSINT ---
    {
        "slug": "DeepStateUA",
        "name": "DeepState",
        "lang": "uk",
        "side": "UA",
        "reliability": "high",
        "focus": "kaarten, tactische verschuivingen",
        "profile": {
            "volledige_naam": "DeepState UA",
            "wie": "Collectief van Oekraïense OSINT-analisten en cartografen",
            "achtergrond": (
                "DeepState is een analytisch project dat de frontlijn real-time bijhoudt "
                "via satellietbeelden, geolocated video's en veldrapporten. Ze publiceren "
                "interactieve kaarten op deepstatemap.live en zijn een van de meest "
                "geciteerde tactische trackingsystemen in westers mediagebruik."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Pro-Oekraïens, maar doorgaans feitelijk-analytisch in kaartupdates",
            "sterk_in": "Nauwkeurige kaartwijzigingen, bevestigde terreinverschuivingen",
            "zwak_in": "Soms vertraagd publiceren om verifiëring; minder nieuws over eigen verliezen",
            "url": "https://t.me/s/DeepStateUA",
        },
    },
    {
        "slug": "truexanew",
        "name": "Труха Украина",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "actueel frontnieuws",
        "profile": {
            "volledige_naam": "Труха⚡Украина",
            "wie": "Anoniem Oekraïens kanaal",
            "achtergrond": (
                "Een van de grootste Oekraïense Telegram-kanalen met meer dan 4 miljoen "
                "abonnees. Publiceert snel breaking news, maar verificatie is soms "
                "ondergeschikt aan snelheid. Veel gebruikt door gewone Oekraïners voor "
                "actuele berichten over aanvallen en frontbewegingen."
            ),
            "opgericht": "2020",
            "anoniem": True,
            "bias": "Pro-Oekraïens, emotioneel taalgebruik, soms geneigd tot overdrijving",
            "sterk_in": "Snelheid, brede dekking van aanvallen op burgerdoelen",
            "zwak_in": "Onvoldoende verificatie, soms foutieve eerste meldingen",
            "url": "https://t.me/s/truexanew",
        },
    },
    {
        "slug": "UAWeapons",
        "name": "Ukraine Weapons Tracker",
        "lang": "en",
        "side": "UA",
        "reliability": "high",
        "focus": "wapensystemen, technologie",
        "profile": {
            "volledige_naam": "Ukraine Weapons Tracker",
            "wie": "Onafhankelijk OSINT-team, primair westerse analisten",
            "achtergrond": (
                "Gespecialiseerd in het documenteren en verifiëren van wapensystemen die "
                "in het conflict worden ingezet. Publiceert uitsluitend beeldgestaafd: "
                "elk wapensysteem wordt geïdentificeerd via video of foto. "
                "Sterk geciteerd door internationale defensie-analisten en journalisten."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Neutraal t.a.v. documentatie; focus op feiten niet narratief",
            "sterk_in": "Identificatie wapensystemen, betrouwbare geolocatie van videobewijzen",
            "zwak_in": "Geen tactische analyse, puur documentair",
            "url": "https://t.me/s/UAWeapons",
        },
    },
    {
        "slug": "wartranslated",
        "name": "War Translated",
        "lang": "en",
        "side": "neutral",
        "reliability": "high",
        "focus": "vertalingen frontlijnberichten",
        "profile": {
            "volledige_naam": "War Translated",
            "wie": "Meertalig vertalerscollectief (Oekraïens, Russisch → Engels)",
            "achtergrond": (
                "Vertaalt en cureert berichten van Oekraïense soldaten, militaire blogs "
                "en officiele kanalen voor een Engelstalig publiek. Brengt de menselijke "
                "kant van het conflict: dagboekfragmenten, brieven, veldobservaties. "
                "Unieke waarde zit in het doorgeven van de 'stem van de loopgraaf'."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Licht pro-Oekraïens in selectie, maar transparant over bronkeuze",
            "sterk_in": "Menselijke factor, primaire bronnen van soldaten zelf",
            "zwak_in": "Geen tactische analyse, selectief in keuze van te vertalen content",
            "url": "https://t.me/s/wartranslated",
        },
    },
    {
        "slug": "UkraineNow",
        "name": "Ukraine Now",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "actueel nieuws",
        "profile": {
            "volledige_naam": "Ukraine Now",
            "wie": "Oekraïens nieuwskanaal, commercieel/mediagelieerd",
            "achtergrond": (
                "Breed Oekraïens nieuwskanaal met snelle updates over aanvallen, "
                "politieke ontwikkelingen en frontnieuws. Minder analytisch diepgaand "
                "dan DeepState, maar nuttig voor actueel nieuws en burgerperspectief."
            ),
            "opgericht": "2022",
            "anoniem": False,
            "bias": "Pro-Oekraïens, officieuze toon",
            "sterk_in": "Breedte van dekking, snel op luchtaanvallen",
            "zwak_in": "Beperkte tactische diepgang",
            "url": "https://t.me/s/UkraineNow",
        },
    },
    {
        "slug": "OSINTua",
        "name": "OSINT Ukraine",
        "lang": "en",
        "side": "neutral",
        "reliability": "high",
        "focus": "open source intelligence",
        "profile": {
            "volledige_naam": "OSINT Ukraine",
            "wie": "Internationaal OSINT-collectief",
            "achtergrond": (
                "Aggregeert en verifieert open-bronsinformatie over het conflict. "
                "Publiceert geolocated beelden, satellietanalyses en cross-referenties "
                "van claims van beide kanten. Methodologisch streng."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Methodologisch neutraal, feitengericht",
            "sterk_in": "Verificatie, geolocatie, satellietanalyse",
            "zwak_in": "Kleine output, niet dagelijks actief",
            "url": "https://t.me/s/OSINTua",
        },
    },

    # --- Russische milbloggers (voor cross-referentie) ---
    {
        "slug": "rybar",
        "name": "Рыбарь",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "tactische analyse, frontlijn",
        "profile": {
            "volledige_naam": "Рыбарь (Rybar)",
            "wie": "Mikhail Zvinchuk, voormalig FSB-officier en mediamedewerker Russisch MoD",
            "achtergrond": (
                "Verreweg het invloedrijkste Russische militaire Telegram-kanaal met "
                "meer dan 1,3 miljoen abonnees. Opgericht door Mikhail Zvinchuk, die "
                "eerder voor de FSB werkte. Staat bekend om gedetailleerde tactische "
                "kaarten en militaire analyses. Ondanks pro-Kremlin positie geldt Rybar "
                "als relatief betrouwbaar voor tactische data — hij publiceerde ook "
                "kritiek op de Russische legerleiding. Heeft toegang tot officieuze "
                "Russische militaire bronnen."
            ),
            "opgericht": "2019",
            "anoniem": False,
            "bias": "Pro-Russisch staatsbelang, maar soms openhartig over Russische tekortkomingen",
            "sterk_in": "Russisch perspectief op tactiek, kaarten, militaire analyse",
            "zwak_in": "Minimaliseert Russische verliezen, overdrijft Oekraïense",
            "url": "https://t.me/s/rybar",
        },
    },
    {
        "slug": "wargonzo",
        "name": "War Gonzo",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "frontlijnverslaggeving",
        "profile": {
            "volledige_naam": "War Gonzo (Война с Гонзо)",
            "wie": "Semyon Pegov, Russisch oorlogsverslaggever",
            "achtergrond": (
                "Semyon Pegov is een van de bekendste Russische oorlogsjournalisten, "
                "actief aan het front sinds de Donbas-oorlog van 2014-2015. Bekend om "
                "ingelijfde frontlijnreportages met video-materiaal. Ontving Russische "
                "staatsprijzen. Zijn verslaggeving geeft een direct beeld van Russische "
                "frontomstandigheden, maar is doordrenkt van nationalistisch narratief."
            ),
            "opgericht": "2014",
            "anoniem": False,
            "bias": "Sterk pro-Russisch, emotioneel-nationalistisch taalgebruik",
            "sterk_in": "Authentieke frontbeelden, soldatenperspectief Russische zijde",
            "zwak_in": "Geen kritische analyse, propaganda-elementen",
            "url": "https://t.me/s/wargonzo",
        },
    },
    {
        "slug": "grey_zone",
        "name": "Серая Зона",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "tactisch, loopgraven",
        "profile": {
            "volledige_naam": "Серая Зона (Grey Zone)",
            "wie": "Anoniem Russisch kanaal, historisch gelieerd aan Wagner-netwerk",
            "achtergrond": (
                "Actief frontlijnkanaal dat gedetailleerde tactische updates publiceert, "
                "inclusief verliesrapporten die de officiële Russische lijn soms "
                "tegenspreken. In de Wagner-periode (2022-2023) gold het als een van "
                "de centrale Prigozhin-gelieerde kanalen. Na de Wagner-opstand veranderde "
                "de toon. Brengt soms eerlijker nieuws over Russische situatie dan "
                "officiële kanalen."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Pro-Russisch, maar bereid eigen verliezen te erkennen",
            "sterk_in": "Frontlijndetails, eerlijker over Russische situatie dan MoD",
            "zwak_in": "Onzekere bronidentiteit, anoniem",
            "url": "https://t.me/s/grey_zone",
        },
    },
    {
        "slug": "two_majors",
        "name": "Два Майора",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "frontlijn, logistiek",
        "profile": {
            "volledige_naam": "Два Майора (Two Majors)",
            "wie": "Twee anonieme personen die beweren (voormalig) Russische militaire officieren te zijn",
            "achtergrond": (
                "Anoniem kanaal dat claimt te worden gerund door twee Russische "
                "majoors met actieve of voormalige militaire achtergrond. Publiceert "
                "tactische samenvattingen en logistieke analyses. Wordt binnen Russische "
                "militaire OSINT-gemeenschap als relatief betrouwbaar beschouwd voor "
                "operationele details. Identiteit niet onafhankelijk geverifieerd."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Pro-Russisch, maar analytisch van toon",
            "sterk_in": "Logistieke analyses, operationele samenvattingen",
            "zwak_in": "Onverifieerbare identiteit, selectieve informatiedeling",
            "url": "https://t.me/s/two_majors",
        },
    },
    {
        "slug": "operativnoZSU",
        "name": "Оперативний ЗСУ",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "operationele ZSU-updates",
        "profile": {
            "volledige_naam": "Оперативний ЗСУ (Operatief ZSU)",
            "wie": "Oekraïens kanaal gelieerd aan ZSU-netwerk (Zbrojni Syly Ukrayiny)",
            "achtergrond": (
                "Publiceert operationele updates van de Oekraïense Strijdkrachten (ZSU). "
                "Mengt officiële mededelingen met informele frontberichten. Nuttig als "
                "indicatie van wat de Oekraïense militaire structuur naar buiten brengt, "
                "maar onderhevig aan institutionele selectiviteit."
            ),
            "opgericht": "2022",
            "anoniem": True,
            "bias": "Pro-Oekraïens, institutionele invalshoek",
            "sterk_in": "Officieuze ZSU-positie, eenheidsupdates",
            "zwak_in": "Institutionele filtering, beperkte zelfkritiek",
            "url": "https://t.me/s/operativnoZSU",
        },
    },
    {
        "slug": "Slavyangrad",
        "name": "Slavyangrad",
        "lang": "ru",
        "side": "RU",
        "reliability": "low",
        "focus": "Russisch narratief",
        "profile": {
            "volledige_naam": "Slavyangrad",
            "wie": "Pro-Russisch propagandakanaal",
            "achtergrond": (
                "Sterk pro-Russisch kanaal met laag informatief gehalte en hoge "
                "propagandadichtheid. Herhaalt voornamelijk het officiële Russische "
                "narratief. Opgenomen voor volledigheid van het propagandaspectrum, "
                "maar berichten vereisen hoge mate van kritisch onderscheid. "
                "Weinig onafhankelijke tactische waarde."
            ),
            "opgericht": "Onbekend",
            "anoniem": True,
            "bias": "Uitgesproken pro-Russisch propaganda",
            "sterk_in": "Inzicht in Russisch propagandanarrativ",
            "zwak_in": "Lage feitelijke betrouwbaarheid, misleidend taalgebruik",
            "url": "https://t.me/s/Slavyangrad",
        },
    },
]

PRIORITY_CHANNELS = {"DeepStateUA", "rybar", "UAWeapons", "wartranslated"}

# Lookup: slug → channel dict (voor snelle toegang in template)
CHANNEL_LOOKUP = {ch["slug"]: ch for ch in CHANNELS}
