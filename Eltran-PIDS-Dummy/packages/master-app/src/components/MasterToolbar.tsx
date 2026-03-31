/**
 * MasterToolbar — Fixed bottom toolbar for MasterConsolePanel.
 */
import { MapPin, Settings, MonitorPlay, RefreshCw, Save } from 'lucide-react';

interface MasterToolbarProps {
    jumlahKereta: number;
    innerRadius: number;
    outerRadius: number;
    sendData: (updates: any) => Promise<void>;
    showToast: (msg: string, ok?: boolean) => void;
}

export function MasterToolbar({ jumlahKereta, innerRadius, outerRadius, sendData, showToast }: MasterToolbarProps) {
    return (
        <div className="fixed bottom-0 left-0 lg:left-80 right-0 z-[60] bg-[#1d2d6a]/95 backdrop-blur-xl border-t border-[#152355] shadow-[0_-15px_60px_rgba(0,0,0,0.25)] px-8 py-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col text-center md:text-left">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">Global Action Toolbar</span>
                <span className="text-xl font-bold text-white">Console PIDS</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full md:w-auto">
                <button onClick={() => showToast('Memeriksa status GPS')} className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.25rem] bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-sm font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <MapPin size={22} className="text-slate-200" /> Cek GPS
                </button>
                <button onClick={() => showToast('Menyesuaikan warna tema LED')} className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.25rem] bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-sm font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <Settings size={22} className="text-slate-200" /> Warna
                </button>
                <button onClick={() => showToast('Beralih ke tampilan Outdoor')} className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.25rem] bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-sm font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <MonitorPlay size={22} className="text-slate-200" /> Outdoor
                </button>
                <button onClick={() => showToast('Arah perjalanan dibalik')} className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.25rem] bg-[#152355] hover:bg-[#111c44] border border-[#2a3b7a] text-sm font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#2a3b7a] flex-1 md:flex-none">
                    <RefreshCw size={22} className="text-slate-200" /> Arah
                </button>

                <div className="w-full md:w-px md:h-10 bg-[#2a3b7a] mx-2 hidden md:block" />

                <button
                    onClick={async () => {
                        await sendData({
                            jumlahKereta,
                            geofencingInnerRadius: innerRadius,
                            geofencingOuterRadius: outerRadius
                        });
                        showToast('Konfigurasi baru berhasil disimpan');
                    }}
                    className="flex items-center justify-center gap-3 px-10 py-4 rounded-[1.25rem] bg-[#ee6f1f] hover:bg-[#f87a2c] text-sm font-bold text-white transition-all shadow-xl hover:shadow-[0_12px_24px_rgba(238,111,31,0.3)] focus:outline-none focus:ring-2 focus:ring-[#ee6f1f]/50 active:scale-95 w-full md:w-auto"
                >
                    <Save size={22} /> Simpan Konfigurasi
                </button>
            </div>
        </div>
    );
}
