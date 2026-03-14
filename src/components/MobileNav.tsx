import { Map, List, Cloud, Settings } from 'lucide-react';

export type MobileTab = 'map' | 'venues' | 'sync' | 'settings';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs = [
    { key: 'map' as const, label: 'Mapa', icon: Map },
    { key: 'venues' as const, label: 'Locais', icon: List },
    { key: 'sync' as const, label: 'Backup', icon: Cloud },
    { key: 'settings' as const, label: 'Config', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[2000] bg-card border-t border-border flex safe-area-bottom">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
            activeTab === t.key
              ? 'text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <t.icon className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
