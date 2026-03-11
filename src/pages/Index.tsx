import { useState } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/Sidebar';
import EventMap from '@/components/EventMap';
import VenuePanel from '@/components/VenuePanel';
import AddVenueDialog from '@/components/AddVenueDialog';
import FullscreenViewer from '@/components/FullscreenViewer';
import PresentationMode from '@/components/PresentationMode';

function AppContent() {
  const { selectedVenueId, addingMarker, settingHomeBase } = useApp();
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    if (addingMarker) {
      setNewMarker({ lat, lng });
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 relative">
        {addingMarker && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-4 py-2">
            Clique no mapa para posicionar o marcador
          </div>
        )}
        <EventMap onMapClick={handleMapClick} />
        {selectedVenueId && <VenuePanel />}
      </div>
      {newMarker && (
        <AddVenueDialog lat={newMarker.lat} lng={newMarker.lng} onClose={() => setNewMarker(null)} />
      )}
      <FullscreenViewer />
      <PresentationMode />
    </div>
  );
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
