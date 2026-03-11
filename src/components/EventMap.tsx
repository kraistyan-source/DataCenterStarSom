import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '@/contexts/AppContext';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const markerIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 16px; height: 16px;
    background: hsl(48 96% 53%);
    border: 2px solid hsl(48 96% 70%);
    box-shadow: 0 0 12px hsl(48 96% 53% / 0.6);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedIcon = new L.DivIcon({
  className: '',
  html: `<div class="marker-pulse" style="
    width: 20px; height: 20px;
    background: hsl(48 96% 53%);
    border: 3px solid hsl(0 0% 100%);
    box-shadow: 0 0 20px hsl(48 96% 53% / 0.8);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// São Bento do Sul center
const DEFAULT_CENTER: [number, number] = [-26.2505, -49.3786];
const DEFAULT_ZOOM = 10;

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController() {
  const { presentationMode, presentationCity, venues } = useApp();
  const map = useMap();

  useEffect(() => {
    if (presentationMode && presentationCity) {
      const cityVenues = venues.filter(v => v.city === presentationCity);
      if (cityVenues.length > 0) {
        const bounds = L.latLngBounds(cityVenues.map(v => [v.lat, v.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
      }
    }
  }, [presentationMode, presentationCity, venues, map]);

  return null;
}

interface EventMapProps {
  onMapClick: (lat: number, lng: number) => void;
}

export default function EventMap({ onMapClick }: EventMapProps) {
  const { venues, selectedVenueId, setSelectedVenueId, filters, addingMarker, presentationMode, presentationCity } = useApp();

  const filteredVenues = venues.filter(v => {
    if (presentationMode && presentationCity && v.city !== presentationCity) return false;
    if (filters.city && v.city !== filters.city) return false;
    if (filters.venueType && v.venueType !== filters.venueType) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!v.name.toLowerCase().includes(s) && !v.city.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      zoomControl={true}
      style={{ cursor: addingMarker ? 'crosshair' : 'grab' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController />
      {addingMarker && <MapClickHandler onMapClick={onMapClick} />}
      {filteredVenues.map(venue => (
        <Marker
          key={venue.id}
          position={[venue.lat, venue.lng]}
          icon={selectedVenueId === venue.id ? selectedIcon : orchidIcon}
          eventHandlers={{
            click: () => setSelectedVenueId(venue.id),
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}>
              <strong>{venue.name}</strong><br />
              <span style={{ color: '#9090A0' }}>{venue.city}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
