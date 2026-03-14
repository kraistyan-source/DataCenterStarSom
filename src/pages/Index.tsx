import { useState } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from '@/components/Sidebar';
import EventMap from '@/components/EventMap';
import VenuePanel from '@/components/VenuePanel';
import AddVenueDialog from '@/components/AddVenueDialog';
import FullscreenViewer from '@/components/FullscreenViewer';
import PresentationMode from '@/components/PresentationMode';
import RecentPhotosStrip from '@/components/RecentPhotosStrip';
import MobileNav, { type MobileTab } from '@/components/MobileNav';
import MobileVenueList from '@/components/MobileVenueList';
import SyncPanel from '@/components/SyncPanel';

function AppContent() {
  const { selectedVenueId, addingMarker, settingHomeBase } = useApp();
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const isMobile = useIsMobile();

  const handleMapClick = (lat: number, lng: number) => {
    if (addingMarker) {
      setNewMarker({ lat, lng });
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden">
        {/* Map always visible as background */}
        <div className="flex-1 relative">
          {addingMarker && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-4 py-2">
              Toque no mapa para posicionar
            </div>
          )}
          {settingHomeBase && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-4 py-2">
              Toque no mapa para definir empresa
            </div>
          )}
          <EventMap onMapClick={handleMapClick} />
        </div>

        {/* Overlays based on tab */}
        {mobileTab === 'venues' && <MobileVenueList />}
        {mobileTab === 'sync' && <SyncPanel />}
        {mobileTab === 'settings' && (
          <div className="fixed inset-0 z-[1500] bg-background flex flex-col pb-14">
            <Sidebar />
          </div>
        )}

        {/* Venue panel as bottom sheet */}
        {selectedVenueId && <VenuePanel />}

        {/* Bottom nav */}
        <MobileNav activeTab={mobileTab} onTabChange={(tab) => {
          setMobileTab(tab);
        }} />

        {newMarker && (
          <AddVenueDialog lat={newMarker.lat} lng={newMarker.lng} onClose={() => setNewMarker(null)} />
        )}
        <FullscreenViewer />
        <PresentationMode />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 relative">
        {addingMarker && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-4 py-2">
            Clique no mapa para posicionar o marcador
          </div>
        )}
        {settingHomeBase && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-4 py-2">
            Clique no mapa para definir o local da sua empresa
          </div>
        )}
        <RecentPhotosStrip />
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
