'use client'

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Globe, Mail, Pencil, Phone } from 'lucide-react'

import { Button, Card, LoadingDots, Money, StatusBadge } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { categorieVoorWeergave } from '@/lib/bruiloft/options'
import { useMediaQuery } from '@/lib/bruiloft/useMediaQuery'
import type { ID, Vendor } from '@/lib/bruiloft/types'
import { getCategorieIcoon } from './categorieIcoon'

interface VendorsMapProps {
  vendors: Vendor[]
  categorieen: string[]
  kanBewerken: boolean
  onBewerk: (vendor: Vendor) => void
  onGeocoded: (id: ID, latitude: number, longitude: number) => void
  // Geselecteerde leverancier is "opgetild" naar de pagina, zodat een klik op
  // een rij in de tabel/lijst hieronder ook de bijbehorende marker op de
  // kaart aanvinkt (en andersom).
  selectedId: ID | null
  onSelectedIdChange: (id: ID | null) => void
}

type Coords = { latitude: number; longitude: number }

const NEDERLAND_CENTER: [number, number] = [52.1326, 5.2913]
const NOMINATIM_INTERVAL_MS = 1100 // Nominatim-gebruiksbeleid: max. 1 verzoek/seconde.

function buildMarkerIcon(categorie: string, naam: string, geselecteerd: boolean): L.DivIcon {
  const Icoon = getCategorieIcoon(categorie)
  const html = renderToStaticMarkup(
    <div
      role="img"
      aria-label={naam}
      className="vendor-marker-icon"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '9999px',
        background: geselecteerd ? '#e11d48' : '#ffffff',
        border: geselecteerd ? '2px solid #e11d48' : '1px solid #d4d4d8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}
    >
      <Icoon size={16} color={geselecteerd ? '#ffffff' : '#52525b'} />
    </div>
  )
  return L.divIcon({
    html,
    className: 'vendor-marker-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

// Past de kaartweergave automatisch aan zodra er (nieuwe) coördinaten zijn —
// los onderdeel omdat useMap() alleen binnen <MapContainer> werkt.
function FitBounds({ punten }: { punten: [number, number][] }) {
  const map = useMap()
  const sleutel = punten.map((p) => p.join(',')).join('|')
  React.useEffect(() => {
    if (punten.length === 0) return
    if (punten.length === 1) {
      map.setView(punten[0], 13)
      return
    }
    map.fitBounds(L.latLngBounds(punten), { padding: [32, 32], maxZoom: 14 })
    // sleutel vat punten samen tot een stabiele dependency (arrays zijn anders elke render nieuw).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sleutel])
  return null
}

// Zoomt/pant zachtjes naar de geselecteerde leverancier — ook als de selectie
// van buiten de kaart komt (klik op een rij in de tabel/lijst eronder).
function PanToSelected({ positie }: { positie: [number, number] | null }) {
  const map = useMap()
  const sleutel = positie ? positie.join(',') : ''
  React.useEffect(() => {
    if (!positie) return
    map.flyTo(positie, Math.max(map.getZoom(), 12), { duration: 0.5 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sleutel])
  return null
}

function VendorDetailPaneel({
  vendor,
  categorieen,
  kanBewerken,
  onBewerk,
}: {
  vendor: Vendor
  categorieen: string[]
  kanBewerken: boolean
  onBewerk: (vendor: Vendor) => void
}) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {capFirst(categorieVoorWeergave(vendor.type, categorieen))}
        </p>
        <h3 className="mt-0.5 text-base font-medium text-foreground">{vendor.naam}</h3>
      </div>

      <StatusBadge kind="leverancier" value={vendor.status} className="self-start" />

      <p className="text-sm text-muted-foreground">{vendor.adres}</p>

      {vendor.geoffreerdBedrag > 0 ? (
        <p className="text-sm text-foreground">
          Offerteprijs: <Money bedrag={vendor.geoffreerdBedrag} />
        </p>
      ) : null}

      {vendor.telefoon || vendor.email || vendor.website ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          {vendor.telefoon ? (
            <a href={`tel:${vendor.telefoon}`} className="flex items-center gap-2 text-foreground hover:text-rose-600">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {vendor.telefoon}
            </a>
          ) : null}
          {vendor.email ? (
            <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-foreground hover:text-rose-600">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {vendor.email}
            </a>
          ) : null}
          {vendor.website ? (
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 truncate text-foreground hover:text-rose-600"
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{vendor.website}</span>
            </a>
          ) : null}
        </div>
      ) : null}

      {kanBewerken ? (
        <Button variant="outline" size="sm" className="mt-auto" onClick={() => onBewerk(vendor)}>
          <Pencil className="h-4 w-4" /> Bewerken
        </Button>
      ) : null}
    </div>
  )
}

// Kaartweergave van leveranciers, als aanvulling naast de bestaande lijst/tabel
// — alleen op desktop (useMediaQuery i.p.v. puur CSS verbergen, zodat er op
// mobiel ook geen kaarttegels/geocoding-verkeer geladen wordt). Adressen
// worden één voor één gegeocodeerd via /api/geocode (gratis, Nominatim) en
// daarna persistent opgeslagen zodat dit maar één keer per leverancier hoeft.
export function VendorsMap({
  vendors,
  categorieen,
  kanBewerken,
  onBewerk,
  onGeocoded,
  selectedId,
  onSelectedIdChange,
}: VendorsMapProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [live, setLive] = React.useState<Record<ID, Coords | null>>({})
  const [bezigMetGeocoden, setBezigMetGeocoden] = React.useState(false)
  const geprobeerd = React.useRef<Set<ID>>(new Set())

  const metAdres = React.useMemo(() => vendors.filter((v) => v.adres.trim().length > 0), [vendors])

  const teGeocodenSleutel = React.useMemo(
    () =>
      metAdres
        .filter((v) => v.latitude == null && v.longitude == null)
        .map((v) => `${v.id}:${v.adres}`)
        .join('|'),
    [metAdres]
  )

  React.useEffect(() => {
    if (!isDesktop) return
    const wachtrij = metAdres.filter(
      (v) => v.latitude == null && v.longitude == null && !geprobeerd.current.has(v.id)
    )
    if (wachtrij.length === 0) return

    let geannuleerd = false
    const wacht = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const run = async () => {
      setBezigMetGeocoden(true)
      for (const vendor of wachtrij) {
        if (geannuleerd) break
        geprobeerd.current.add(vendor.id)
        try {
          const res = await fetch(`/api/geocode?adres=${encodeURIComponent(vendor.adres)}`)
          const data = (await res.json()) as { latitude: number | null; longitude: number | null }
          if (geannuleerd) break
          if (res.ok && data.latitude != null && data.longitude != null) {
            setLive((prev) => ({ ...prev, [vendor.id]: { latitude: data.latitude!, longitude: data.longitude! } }))
            onGeocoded(vendor.id, data.latitude, data.longitude)
          } else {
            setLive((prev) => ({ ...prev, [vendor.id]: null }))
          }
        } catch {
          if (!geannuleerd) setLive((prev) => ({ ...prev, [vendor.id]: null }))
        }
        if (!geannuleerd) await wacht(NOMINATIM_INTERVAL_MS)
      }
      if (!geannuleerd) setBezigMetGeocoden(false)
    }

    run()
    return () => {
      geannuleerd = true
    }
    // teGeocodenSleutel vat de wachtrij samen (metAdres is elke render een nieuwe array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, teGeocodenSleutel])

  const gegeocodeerd = React.useMemo(() => {
    return metAdres
      .map((v) => {
        const override = live[v.id]
        const latitude = override !== undefined ? override?.latitude ?? null : v.latitude ?? null
        const longitude = override !== undefined ? override?.longitude ?? null : v.longitude ?? null
        return latitude != null && longitude != null ? { vendor: v, latitude, longitude } : null
      })
      .filter((x): x is { vendor: Vendor; latitude: number; longitude: number } => x !== null)
  }, [metAdres, live])

  if (!isDesktop) return null

  const selectedPunt = gegeocodeerd.find((g) => g.vendor.id === selectedId)
  const selected = selectedPunt?.vendor ?? null

  if (metAdres.length === 0) {
    return (
      <Card className="mb-5 flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
        <p className="text-sm text-foreground">Nog geen leveranciers met een adres</p>
        <p className="text-sm text-muted-foreground">
          Voeg een adres toe bij een leverancier om ze op de kaart te zien.
        </p>
      </Card>
    )
  }

  return (
    <Card className="isolate mb-5 overflow-hidden">
      <style>{`
        .vendor-marker-wrapper { background: transparent; border: none; }
        .vendor-marker-icon { transition: transform 150ms ease-out; }
        .leaflet-marker-icon:hover .vendor-marker-icon { transform: scale(1.1); }
        .leaflet-marker-icon:focus-visible { outline: 2px solid #e11d48; outline-offset: 2px; border-radius: 9999px; }
      `}</style>
      <div className="flex h-[26rem]">
        <div className="relative min-w-0 flex-1">
          <MapContainer
            center={NEDERLAND_CENTER}
            zoom={7}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />
            <FitBounds punten={gegeocodeerd.map((g) => [g.latitude, g.longitude])} />
            <PanToSelected positie={selectedPunt ? [selectedPunt.latitude, selectedPunt.longitude] : null} />
            {gegeocodeerd.map(({ vendor, latitude, longitude }) => (
              <Marker
                key={vendor.id}
                position={[latitude, longitude]}
                icon={buildMarkerIcon(
                  categorieVoorWeergave(vendor.type, categorieen),
                  vendor.naam,
                  vendor.id === selectedId
                )}
                eventHandlers={{ click: () => onSelectedIdChange(vendor.id) }}
              />
            ))}
          </MapContainer>
          {bezigMetGeocoden ? (
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <LoadingDots /> Adressen zoeken…
            </div>
          ) : null}
        </div>
        <div className={cn('w-72 shrink-0 overflow-y-auto border-l border-border')}>
          {selected ? (
            <VendorDetailPaneel vendor={selected} categorieen={categorieen} kanBewerken={kanBewerken} onBewerk={onBewerk} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Klik op een leverancier op de kaart voor meer informatie.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
