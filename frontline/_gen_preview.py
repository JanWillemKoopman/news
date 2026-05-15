#!/usr/bin/env python3
"""Genereert een preview index.html met voorbeelddata."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from jinja2 import Environment, FileSystemLoader
from channels import CHANNELS, CHANNEL_LOOKUP

env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')))
template = env.get_template('bulletin.html')

mock_data = {
    "samenvatting": (
        "Russische troepen intensiveren de druk langs de Pokrovsk-as met dagelijkse infanterieaanvallen "
        "vanuit noordoostelijke richting, waarbij Myrnohrad als operatieve basis dient. "
        "Oekraiense drones treffen munitiedepots en logistieke knooppunten achter de Russische frontlijn, "
        "terwijl intensivering van elektronische oorlogsvoering communicatie op beide flanken bemoeilijkt. "
        "Aan de Chasiv Yar-sector blijft de situatie gespannen met gevechten in de kanaalzone."
    ),
    "sectoren": [
        {
            "naam": "Pokrovsk",
            "samenvatting": "Zware infanterieaanvallen vanuit het noordoosten; Oekraiense linies houden stand maar staan onder continue druk.",
            "details": [
                "Russische eenheden van de 155e Mariniersdivisie actief ten noorden van Myrnohrad",
                "Oekraiense 47e Tankbrigade houdt versterkte posities bij Novoekonomichne",
                "Artillerievuur van beide kanten, gemiddeld 400 granaten per dag gerapporteerd",
                "FPV-droneaanvallen op Russische logistieke voertuigen langs N-15",
            ],
            "ua_claim": "Alle aanvallen afgeslagen; vijand leed verliezen van meer dan 60 man. Frontlijn onveranderd.",
            "ua_source": "DeepStateUA",
            "ru_claim": "Succesvolle opmars van 1,5 km breed front; drie nederzettingen ingenomen na hevig gevecht.",
            "ru_source": "rybar",
            "sources_used": ["DeepStateUA", "rybar", "wartranslated", "UAWeapons"],
            "betrouwbaarheid": "tegenstrijdig",
        },
        {
            "naam": "Chasiv Yar",
            "samenvatting": "Gevechten in de kanaalzone concentreren zich op het Bakhmutka-kanaalgebied; Russische eenheden proberen brughoofden te vormen.",
            "details": [
                "Beschietingen van het Bakhmutka-kanaal met thermobarische wapens gemeld",
                "FPV-droneaanvallen op beide zijden van de kanaalzone",
                "Oekraiense eenheden houden westelijke oever; Rusland controleert oostelijk deel",
                "Satellietbeelden tonen nieuwe loopgravenposities 300m ten westen van kanaal",
            ],
            "ua_claim": "Frontlijn stabiel; vijand is niet doorgebroken; kanaal fungeert als effectieve barriere.",
            "ua_source": "operativnoZSU",
            "ru_claim": "Oekraiense posities aan de kanaalzone gedeeltelijk bereikt; gevechten gaande voor bruggenhoofd.",
            "ru_source": "wargonzo",
            "sources_used": ["rybar", "wargonzo", "UAWeapons", "OSINTua"],
            "betrouwbaarheid": "laag",
        },
        {
            "naam": "Kupiansk",
            "samenvatting": "Relatief rustig; Russische verkenningsactiviteiten langs Oskil-rivier nemen toe.",
            "details": [
                "Verkenningsdroneactiviteit boven Oskil-rivier stijgt",
                "Kleine Russische eenheden proberen bruggenhoofd bij Kindrashivka",
                "Oekraiense artillerie actief als reactie op verkenningsactiviteiten",
            ],
            "ua_claim": "Situatie onder controle; vijandelijke activiteiten gemonitord en gepareerd.",
            "ua_source": "DeepStateUA",
            "ru_claim": None,
            "ru_source": None,
            "sources_used": ["DeepStateUA", "two_majors"],
            "betrouwbaarheid": "middel",
        },
        {
            "naam": "Zaporizka Front",
            "samenvatting": "Stabiele situatie met incidenteel contact; geen grootschalige aanvallen gemeld.",
            "details": [
                "Artillerievuur rondom Robotyne zonder grondwinst van betekenis",
                "Oekraiense UAV-activiteit hoog boven Russische logistieke routes",
                "Nachtelijke droneaanvallen op Russische munitiedepots nabij Tokmak",
            ],
            "ua_claim": "Actieve droneoperaties beschadigen Russische logistiek aanzienlijk.",
            "ua_source": "UAWeapons",
            "ru_claim": "Alle aanvallen afgeslagen; luchtafweer effectief.",
            "ru_source": "grey_zone",
            "sources_used": ["UAWeapons", "grey_zone", "DeepStateUA"],
            "betrouwbaarheid": "middel",
        },
    ],
    "technologie_ew": [
        "Russische Krasukha-4 EW-systemen gesignaleerd 40km achter frontlijn bij Donetsk; effect op GPS-geleide munitie merkbaar (bron: UAWeapons)",
        "Oekraine zet FPV-drones in met antijam-module die weerstand biedt tegen Russische jamming op 900 MHz-band (bron: wartranslated)",
        "Nieuwe Lancet-3M modificatie met verlengd bereik van +10km gedocumenteerd op satellietbeelden (bron: UAWeapons)",
        "Oekraiense Magura V5-zeedrones actief in oostelijke Zwarte Zee; drie waarnemingen bevestigd (bron: OSINTua)",
    ],
    "menselijke_factor": (
        "Brieven van Oekraiense soldaten aan de Pokrovsk-as beschrijven extreme vermoeidheid na weken "
        "zonder rotatie. Een infanterist van de 110e Brigade schrijft over onregelmatige artillerie-aanvoer "
        "en personeelstekort. Aan Russische zijde rapporteren gevangenen lage moraal bij gemobiliseerde "
        "eenheden, bestaande uit jonge rekruten zonder militaire ervaring die slecht zijn uitgerust. "
        "Grijze-zone-verslagen spreken van soldaten die loopgraven ingedreven worden. "
        "Het natte weer vertraagt troepenbeweging over het open veld en bemoeilijkt luchtoperaties."
    ),
    "signalen": [
        "Drie onafhankelijke bronnen (DeepStateUA, rybar, wartranslated) melden simultaan munitietekort voor Oekraiense 155mm-artillerie langs de volledige Donbas-frontlijn",
        "Toenemend FPV-dronegebruik door beide partijen langs vijf sectoren suggereert structurele verschuiving in infanterietactieken",
        "Russische aanvalspauzes van 48-72 uur voor intensivering zijn herkenbaar patroon in Pokrovsk-sector de afgelopen drie weken",
        "Twee Russische en twee Oekraiense bronnen melden onafhankelijk luchtafweer-tekorten in de Kupiansk-sector",
    ],
    "bronnenkritiek": [
        "Rybar meldt consequent 3-5x meer terreinwinst dan DeepState-kaarten bevestigen; waarschijnlijk systematische overdrijving voor intern Russisch publiek (bron: rybar vs DeepStateUA)",
        "Oekraiense bronnen zwijgen volledig over de situatie bij Kurakhove -- afwezigheid van berichtgeving wijst mogelijk op terugtrekking (bron: DeepStateUA, operativnoZSU)",
        "War Gonzo-video is geolocated 8km achter de werkelijke frontlijn -- mogelijke staging voor propagandadoeleinden (bron: wargonzo, geverifieerd via OSINTua)",
    ],
}

html = template.render(
    date="2026-05-15",
    generated_at="15-05-2026 08:00",
    message_count=94,
    channel_count=11,
    data=mock_data,
    channels_list=CHANNELS,
    channel_lookup=CHANNEL_LOOKUP,
)

out = os.path.join(os.path.dirname(__file__), "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Preview geschreven: {out} ({len(html)} tekens)")
