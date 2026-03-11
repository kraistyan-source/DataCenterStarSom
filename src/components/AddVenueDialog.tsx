import { useState } from 'react';
import { X } from 'lucide-react';
import { addVenue, VENUE_TYPES } from '@/lib/db';
import { useApp } from '@/contexts/AppContext';

interface AddVenueDialogProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function AddVenueDialog({ lat, lng, onClose }: AddVenueDialogProps) {
  const { refresh, setSelectedVenueId, setAddingMarker } = useApp();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [venueType, setVenueType] = useState(VENUE_TYPES[0]);
  const [capacity, setCapacity] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!name || !city) return;
    const venue = await addVenue({ name, city, address, lat, lng, venueType, capacity, notes });
    setAddingMarker(false);
    await refresh();
    setSelectedVenueId(venue.id);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-nocturne/80">
      <div className="bg-card border border-border w-[380px] max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Novo Local</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Nome do Local" value={name} onChange={setName} required />
          <Field label="Cidade" value={city} onChange={setCity} required />
          <Field label="Endereço" value={address} onChange={setAddress} />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tipo de Local</label>
            <select value={venueType} onChange={e => setVenueType(e.target.value)}
              className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary">
              {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Capacidade" value={capacity} onChange={setCapacity} />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Coordenadas</label>
            <p className="text-xs text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary h-20 resize-none font-body" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider py-2.5">
              Salvar Local
            </button>
            <button onClick={onClose} className="flex-1 border border-border text-muted-foreground text-[10px] uppercase tracking-wider py-2.5">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary"
      />
    </div>
  );
}
