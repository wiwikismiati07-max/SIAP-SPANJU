import React, { useState, useEffect } from 'react';
import { Database, Key, Globe, CheckCircle2, AlertCircle, Save, X, RefreshCw, Trash2, ExternalLink, Activity, Info } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [url, setUrl] = useState('https://ltfwkunozemldjivnqfq.supabase.co');
  const [key, setKey] = useState('sb_publishable_CXRMrPZk7aIhJMdomAqZig_DdhECr-9');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isUnhealthy?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url || 'https://ltfwkunozemldjivnqfq.supabase.co');
      setKey(config.key || 'sb_publishable_CXRMrPZk7aIhJMdomAqZig_DdhECr-9');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!url.trim() || !key.trim()) {
      setTestResult({ success: false, message: 'Harap isi URL dan API Key terlebih dahulu.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(url.trim(), key.trim());
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Harap isi URL dan API Key Supabase.');
      return;
    }

    saveSupabaseConfig(url.trim(), key.trim());
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleReset = () => {
    if (confirm('Hapus pengaturan koneksi kustom dan reset ke konfigurasi bawaan?')) {
      clearSupabaseConfig();
      setUrl('https://ltfwkunozemldjivnqfq.supabase.co');
      setKey('sb_publishable_CXRMrPZk7aIhJMdomAqZig_DdhECr-9');
      setTestResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Database size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black leading-none">Koneksi Database Supabase</h3>
              <p className="text-xs text-emerald-100/80 font-medium mt-1">Project SMPN7APL</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Important Notice Regarding Unhealthy Status */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <Activity size={15} className="text-amber-600 shrink-0" />
              PENTING: Status Database Supabase Anda Saat Ini
            </p>
            <p className="leading-relaxed">
              Berdasarkan dashboard Supabase Anda, status proyek <strong>SMPN7APL</strong> terdeteksi <strong>"Unhealthy"</strong>. Ketika status <em>Unhealthy</em> atau <em>Paused</em>, server database Supabase tidak merespons request (menyebabkan error <em>TypeError: Failed to fetch</em>).
            </p>
            <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200 space-y-1 font-medium text-[11px]">
              <p className="font-bold text-slate-800">Langkah Memperbaiki di Dashboard Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Buka dashboard Supabase pada proyek <strong>SMPN7APL</strong>.</li>
                <li>Klik tombol <strong>"Restart Project"</strong> atau <strong>"Restore/Unpause"</strong>.</li>
                <li>Tunggu 1-2 menit hingga status berubah dari <span className="text-amber-700 font-bold">Unhealthy</span> menjadi <span className="text-emerald-700 font-bold">Active / Healthy</span> (titik hijau).</li>
                <li>Jika diminta Anon Key format JWT, salin key dari menu <strong>Project Settings → API → anon / public (JWT)</strong>.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
              Project URL Supabase
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="url"
                required
                placeholder="https://ltfwkunozemldjivnqfq.supabase.co"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 font-bold text-xs sm:text-sm text-slate-700 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
              Public / Anon API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <textarea
                required
                rows={3}
                placeholder="sb_publishable_... atau eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => {
                  setKey(e.target.value);
                  setTestResult(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 font-mono text-xs text-slate-700 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-bold ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p>{testResult.message}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url || !key}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {testing ? 'Menguji Koneksi...' : 'Tes Koneksi'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors flex items-center gap-1"
            >
              <Trash2 size={13} /> Reset Bawaan
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Simpan & Hubungkan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
