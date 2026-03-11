import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '@/contexts/AppContext';
import { VENUE_TYPE_COLORS } from '@/lib/db';
import type { Venue } from '@/lib/db';
import { distanceKm } from '@/lib/distance';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getMarkerIcon(venueType: string, isSelected: boolean) {
  const color = VENUE_TYPE_COLORS[venueType] || VENUE_TYPE_COLORS['Outro'];
  const size = isSelected ? 20 : 14;
  const border = isSelected ? `3px solid hsl(0 0% 100%)` : `2px solid hsl(${color.split(' ')[0]} ${color.split(' ')[1]} 75%)`;
  const pulse = isSelected ? 'marker-pulse' : '';

  return new L.DivIcon({
    className: '',
    html: `<div class="${pulse}" style="
      width: ${size}px; height: ${size}px;
      background: hsl(${color});
      border: ${border};
      border-radius: 50%;
      box-shadow: 0 0 ${isSelected ? 20 : 8}px hsl(${color} / ${isSelected ? 0.8 : 0.5});
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// São Bento do Sul center
const DEFAULT_CENTER: [number, number] = [-26.2505, -49.3786];
const DEFAULT_ZOOM = 10;
const LABEL_MIN_ZOOM = 11;

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

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map, onZoomChange]);
  return null;
}

interface VenueMarkerProps {
  venue: Venue;
  isSelected: boolean;
  showLabel: boolean;
  onClick: () => void;
}

function VenueMarker({ venue, isSelected, showLabel, onClick }: VenueMarkerProps) {
  const icon = useMemo(() => getMarkerIcon(venue.venueType, isSelected), [venue.venueType, isSelected]);

  return (
    <Marker
      position={[venue.lat, venue.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      {showLabel && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -12]}
          className="venue-label-tooltip"
        >
          {venue.name}
        </Tooltip>
      )}
      <Popup>
        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}>
          <strong>{venue.name}</strong><br />
          <span style={{ color: '#9090A0' }}>{venue.city} · {venue.venueType}</span>
        </div>
      </Popup>
    </Marker>
  );
}

interface EventMapProps {
  onMapClick: (lat: number, lng: number) => void;
}

export default function EventMap({ onMapClick }: EventMapProps) {
  const { venues, selectedVenueId, setSelectedVenueId, filters, addingMarker, presentationMode, presentationCity } = useApp();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

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

  const showLabels = zoom >= LABEL_MIN_ZOOM;

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
      <ZoomTracker onZoomChange={setZoom} />
      {addingMarker && <MapClickHandler onMapClick={onMapClick} />}
      {filteredVenues.map(venue => (
        <VenueMarker
          key={venue.id}
          venue={venue}
          isSelected={selectedVenueId === venue.id}
          showLabel={showLabels}
          onClick={() => setSelectedVenueId(venue.id)}
        />
      ))}
    </MapContainer>
  );
}
