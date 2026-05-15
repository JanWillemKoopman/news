"""
Gecureerde lijst van publieke Telegram-kanalen voor Oekraïne-oorlog OSINT.
Toegankelijk via https://t.me/s/SLUG zonder API-key.

reliability: high/medium/low — inschatting op basis van track record
side: UA (Oekraïns), RU (Russisch), neutral (westerse OSINT)
focus: welk type informatie het kanaal primair brengt
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
    },
    {
        "slug": "truexanew",
        "name": "Труха Украина",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "actueel frontnieuws",
    },
    {
        "slug": "UAWeapons",
        "name": "Ukraine Weapons Tracker",
        "lang": "en",
        "side": "UA",
        "reliability": "high",
        "focus": "wapensystemen, technologie",
    },
    {
        "slug": "wartranslated",
        "name": "War Translated",
        "lang": "en",
        "side": "neutral",
        "reliability": "high",
        "focus": "vertalingen frontlijnberichten",
    },
    {
        "slug": "UkraineNow",
        "name": "Ukraine Now",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "actueel nieuws",
    },
    {
        "slug": "OSINTua",
        "name": "OSINT Ukraine",
        "lang": "en",
        "side": "neutral",
        "reliability": "high",
        "focus": "open source intelligence",
    },

    # --- Russische milbloggers (voor cross-referentie) ---
    {
        "slug": "rybar",
        "name": "Рыбарь",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "tactische analyse, frontlijn",
    },
    {
        "slug": "wargonzo",
        "name": "War Gonzo",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "frontlijnverslaggeving",
    },
    {
        "slug": "grey_zone",
        "name": "Серая Зона",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "tactisch, loopgraven",
    },
    {
        "slug": "two_majors",
        "name": "Два Майора",
        "lang": "ru",
        "side": "RU",
        "reliability": "medium",
        "focus": "frontlijn, logistiek",
    },
    {
        "slug": "operativnoZSU",
        "name": "Оперативний ЗСУ",
        "lang": "uk",
        "side": "UA",
        "reliability": "medium",
        "focus": "operationele ZSU-updates",
    },
    {
        "slug": "Slavyangrad",
        "name": "Slavyangrad",
        "lang": "ru",
        "side": "RU",
        "reliability": "low",
        "focus": "Russisch narratief",
    },
]

# Kanalen die we altijd meenemen, zelfs als ze minder tactisch zijn
PRIORITY_CHANNELS = {"DeepStateUA", "rybar", "UAWeapons", "wartranslated"}
