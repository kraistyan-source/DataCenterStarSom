import { useState } from 'react';
import { Cloud, CloudUpload, CloudDownload, Download, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadToCloud, downloadFromCloud, type SyncProgress } from '@/lib/cloud-sync';
import { exportDatabase, importDatabase } from '@/lib/db';
import { useApp } from '@/contexts/AppContext';
import { Progress } from '@/components/ui/progress';

export default function SyncPanel() {
  const { refresh } = useApp();
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [importing, setImporting] = useState(false);

  const handleUpload = async () => {
    if (progress?.status === 'uploading') return;
    try {
      await uploadToCloud(setProgress);
    } catch { /* handled in progress */ }
  };

  const handleDownload = async () => {
    if (progress?.status === 'downloading') return;
    try {
      await downloadFromCloud(setProgress);
      await refresh();
    } catch { /* handled in progress */ }
  };

  const handleExportJson = async () => {
    const json = await exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      await importDatabase(text);
      await refresh();
    } catch {
      alert('Erro ao importar');
    }
    setImporting(false);
    e.target.value = '';
  };

  const isBusy = progress?.status === 'uploading' || progress?.status === 'downloading';
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[1500] bg-background flex flex-col pb-14 md:relative md:inset-auto md:z-auto md:pb-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          Backup & Sincronização
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Progress */}
        {progress && progress.status !== 'idle' && (
          <div className="border border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              {progress.status === 'uploading' || progress.status === 'downloading' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : progress.status === 'done' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="text-xs text-foreground">{progress.message}</span>
            </div>
            {isBusy && <Progress value={pct} className="h-2" />}
          </div>
        )}

        {/* Cloud sync */}
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Nuvem</h3>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            Envie seus dados para a nuvem para acessar no celular, ou restaure dados da nuvem neste dispositivo.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUpload}
              disabled={isBusy}
              className="flex flex-col items-center gap-2 p-4 border border-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <CloudUpload className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-wider">Enviar</span>
              <span className="text-[9px] text-muted-foreground font-body">PC → Nuvem</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isBusy}
              className="flex flex-col items-center gap-2 p-4 border border-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <CloudDownload className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-wider">Restaurar</span>
              <span className="text-[9px] text-muted-foreground font-body">Nuvem → Dispositivo</span>
            </button>
          </div>
        </div>

        {/* JSON export/import */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Arquivo Local</h3>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            Exporte ou importe um arquivo JSON com todos os dados (sem mídia).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJson}
              className="flex flex-col items-center gap-2 p-4 border border-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-wider">Exportar JSON</span>
            </button>
            <label className="flex flex-col items-center gap-2 p-4 border border-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Upload className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-wider">
                {importing ? 'Importando…' : 'Importar JSON'}
              </span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
