/**
 * MasterToolbar — Fixed bottom toolbar for MasterConsolePanel.
 */
import { MapPin, Settings, MonitorPlay, RefreshCw, Save } from 'lucide-react';

interface MasterToolbarProps {
    jumlahKereta: number;
    sendData: (updates: any) => Promise<void>;
    showToast: (msg: string, ok?: boolean) => void;
}

export function MasterToolbar({ jumlahKereta, sendData, showToast }: MasterToolbarProps) {
    return (
        <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-[60] bg-[#1d2d6a]/95 backdrop-blur-xl border-t border-[#152355] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] px-6 py-4 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col text-center md:text-left">
                <span className="text-[10px] font-black text-blue-300">Global Action Toolbar</span>
                <span className="text-sm font-black text-white">Console PIDS</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                <button onClick={() => showToast('Memeriksa status GPS')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <MapPin size={16} className="text-slate-200" /> Cek GPS
                </button>
                <button onClick={() => showToast('Menyesuaikan warna tema LED')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <Settings size={16} className="text-slate-200" /> Warna
                </button>
                <button onClick={() => showToast('Beralih ke tampilan Outdoor')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <MonitorPlay size={16} className="text-slate-200" /> Outdoor
                </button>
                <button onClick={() => showToast('Arah perjalanan dibalik')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-xs font-black text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <RefreshCw size={16} className="text-slate-200" /> Arah
                </button>

                <div className="w-full md:w-px md:h-8 bg-[#2a3b7a] mx-1 hidden md:block" />

                <button onClick={async () => { await sendData({ jumlahKereta }); showToast('Konfigurasi baru berhasil disimpan'); }} className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#ee6f1f] hover:bg-[#f87a2c] text-xs font-black text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#ee6f1f]/50 active:scale-95 w-full md:w-auto">
                    <Save size={16} /> Simpan Konfig
                </button>
            </div>
        </div>
    );
}
