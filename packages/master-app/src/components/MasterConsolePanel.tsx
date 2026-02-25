import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Navigation, Train, Settings, Send, Save, RefreshCw, Volume2,
    MapPin, MonitorPlay, ListVideo, Mic, Disc, Maximize, Play, Pause,
    ChevronDown, ChevronRight, Speaker, RadioTower, Video, Satellite, Info
} from 'lucide-react';

// Reusable Accordion Component
function SectionAccordion({
    title, icon: Icon, defaultOpen = false, children, summary
}: {
    title: string; icon: any; defaultOpen?: boolean; children: React.ReactNode; summary?: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-slate-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-6 py-5 lg:px-8 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 text-[#1d2d6a] p-2.5 rounded-xl border border-slate-200 shadow-inner">
                        <Icon size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm lg:text-base font-black text-[#1d2d6a] uppercase tracking-wider">{title}</span>
                        {!isOpen && summary && (
                            <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest hidden sm:block">{summary}</div>
                        )}
                    </div>
                </div>
                <div className={`p-2 rounded-full transition-transform duration-300 ${isOpen ? 'bg-slate-100 rotate-180' : 'bg-transparent rotate-0'}`}>
                    <ChevronDown size={20} className="text-slate-400" />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2 lg:px-8 lg:pb-8 border-t border-slate-100 bg-slate-50/50">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const NAV_DATA = [
    { name: "BUMIWALIYA", type: "ANTARA", lng: "108.070918", lat: "-7.058636", eta: "11h02m", status: "", next: "CIPEUNDEUY" },
    { name: "CIPEUNDEUY", type: "ANTARA", lng: "108.101101", lat: "-7.093671", eta: "10h42m", status: "BERHENTI", next: "CIRAHAYU" },
    { name: "CIRAHAYU", type: "ANTARA", lng: "108.118015", lat: "-7.134352", eta: "10h29m", status: "", next: "CIAWI" },
    { name: "CIAWI", type: "ANTARA", lng: "108.145597", lat: "-7.157336", eta: "10h21m", status: "", next: "RAJAPOLAH" },
    { name: "RAJAPOLAH", type: "ANTARA", lng: "108.191212", lat: "-7.219572", eta: "10h11m", status: "", next: "INDIHIANG" },
    { name: "INDIHIANG", type: "ANTARA", lng: "108.200866", lat: "-7.286719", eta: "10h03m", status: "", next: "TASIKMALAYA" },
    { name: "TASIKMALAYA", type: "ANTARA", lng: "108.223987", lat: "-7.322173", eta: "09h45m", status: "BERHENTI", next: "AWIPARI" },
    { name: "AWIPARI", type: "ANTARA", lng: "108.2739", lat: "-7.353214", eta: "09h33m", status: "", next: "MANONJAYA" },
    { name: "MANONJAYA", type: "ANTARA", lng: "108.301533", lat: "-7.352557", eta: "09h35m", status: "", next: "CIAMIS" },
    { name: "CIAMIS", type: "ANTARA", lng: "108.355974", lat: "-7.329194", eta: "09h23m", status: "", next: "BOJONG" },
    { name: "BOJONG", type: "ANTARA", lng: "108.429231", lat: "-7.346821", eta: "09h14m", status: "", next: "KARANGPUCUNG" },
    { name: "KARANGPUCUNG", type: "ANTARA", lng: "108.493974", lat: "-7.352676", eta: "09h05m", status: "", next: "BANJAR" },
    { name: "BANJAR", type: "ANTARA", lng: "108.54225", lat: "-7.375799", eta: "08h43m", status: "BERHENTI", next: "LANGEN" },
    { name: "LANGEN", type: "ANTARA", lng: "108.636473", lat: "-7.360249", eta: "08h32m", status: "", next: "MELUWUNG" },
    { name: "MELUWUNG", type: "ANTARA", lng: "108.699579", lat: "-7.394573", eta: "08h25m", status: "", next: "CIPARI" },
    { name: "CIPARI", type: "ANTARA", lng: "108.761616", lat: "-7.440424", eta: "08h18m", status: "", next: "SIDAREJA" }
];

export function MasterConsolePanel({ route: _route, data }: { route: any, data: any }) {

    const activeTrainName = data?.serviceName || 'ARGO WILIS';
    const activeTrainNumber = data?.trainNumber || '05';

    return (
        <div className="flex flex-col gap-6 w-full max-w-full pb-32">

            {/* INFO RANGKAIAN & TELEMETRI HEADER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                <div className="p-6 xl:w-1/3 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-[#1d2d6a] p-2.5 rounded-xl text-white shadow-md"><Train size={24} /></div>
                        <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Status Perjalanan</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No KA / Nama</span>
                            <span className="text-sm font-black text-[#1d2d6a]">KA {activeTrainNumber} - {activeTrainName}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relasi</span>
                            <span className="text-sm font-black text-[#1d2d6a]">BD - SGU</span>
                        </div>
                        <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Audio Default</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[#ee6f1f] text-xs font-black uppercase">AKTIF</span>
                                <div className="w-2 h-2 rounded-full bg-[#ee6f1f] animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 xl:w-2/3 bg-white">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shadow-inner"><Satellite size={24} /></div>
                            <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Telemetri Satelit (GPS)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm flex items-center gap-2 hidden sm:flex">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> GPS 3D FIX
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Longitude <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">108.086736</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Koordinat garis bujur</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Latitude <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">-7.07608</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Koordinat garis lintang</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-blue-100/50 group-hover:bg-blue-200/50 transition-colors" />
                            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1 relative z-10">Kecepatan</div>
                            <div className="text-2xl font-mono font-black text-blue-600 leading-none relative z-10">41.8<span className="text-[10px] font-sans tracking-widest ml-1 text-blue-500">km/h</span></div>
                            <div className="text-[9px] text-blue-400 font-bold uppercase mt-1 leading-tight relative z-10">Aktual gerak</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Haluan (Dir) <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">141.88&deg;</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Derajat pergerakan</div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Ketinggian <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">125 <span className="text-[10px] text-slate-500 tracking-wider">MDPL</span></div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">M. atas permukaan laut</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm col-span-1 hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Tanggal/Waktu <Info size={12} /></div>
                            <div className="text-[13px] font-mono font-black text-[#1d2d6a]">14:29:15 31/3/2017</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Sistem terkunci</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Radius Luar <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">750 <span className="text-[10px] text-slate-500 tracking-wider">Meter</span></div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Target geofencing awal</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Radius Dalam <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#ee6f1f]">250 <span className="text-[10px] text-[#ee6f1f] tracking-wider">Meter</span></div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">Target geofencing akhir</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. KONFIGURASI ASET & JARINGAN */}
            <SectionAccordion
                title="1. Konfigurasi Aset & Jaringan"
                icon={Settings}
                defaultOpen={true}
                summary="13 Kereta Tersambung • IP Global: 192.168.1.48"
            >
                <div className="bg-white p-6 mt-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-8 items-stretch">
                    {/* Visualizer */}
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {['LOK', '1', '2', '3', '4', '5'].map((item, i) => (
                            <div key={item} className={`flex flex-col gap-2 min-w-[90px] shrink-0 ${i === 0 ? 'opacity-50' : ''}`}>
                                <div className={`h-12 border-2 rounded-t-xl rounded-b-sm flex items-center justify-center relative ${i === 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-[#1d2d6a] shadow-sm'}`}>
                                    <div className="absolute top-[2px] w-full flex justify-between px-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                                    </div>
                                    <span className={`text-sm font-black ${i === 0 ? 'text-slate-400' : 'text-[#1d2d6a]'}`}>{item}</span>
                                </div>
                                <div className="text-center space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">K1016</div>
                                    <div className="text-[9px] font-mono font-bold text-slate-500 border-t border-slate-200 pt-1">IP {i === 1 ? '.48' : i === 0 ? '.10' : '...'}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Setting Area */}
                    <div className="w-full xl:w-[320px] bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col gap-4 shrink-0 justify-center">
                        <div className="flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Global IP</span>
                            <span className="text-sm font-black font-mono text-[#1d2d6a]">192.168.1.48</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center justify-center gap-2 text-xs font-black text-slate-600 bg-white py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors uppercase tracking-widest shadow-sm">
                                <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a]" defaultChecked /> In
                            </label>
                            <label className="flex items-center justify-center gap-2 text-xs font-black text-slate-600 bg-white py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors uppercase tracking-widest shadow-sm">
                                <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a]" defaultChecked /> Out
                            </label>
                        </div>
                    </div>
                </div>
            </SectionAccordion>

            {/* 2. RUTE & CHECKPOINT NAVIGASI */}
            <SectionAccordion
                title="2. Rute & Checkpoint Navigasi"
                icon={MapPin}
                defaultOpen={true}
                summary="Detail 16 POI Navigasi • Target Utama CIPEUNDEUY"
            >
                <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-[#1d2d6a] text-white">
                                <tr>
                                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest border-b border-[#152355]">Nama Stasiun</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355]">Ket</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] text-right">Longitude</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] text-right">Latitude</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] text-center">TTA</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b border-[#152355] text-center">Status</th>
                                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest border-b border-[#152355]">Next Stasiun</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {NAV_DATA.map((item, idx) => {
                                    const isBerhenti = item.status === 'BERHENTI';
                                    return (
                                        <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isBerhenti ? 'bg-orange-50/50' : 'bg-white'}`}>
                                            <td className={`py-3 px-6 font-black flex items-center gap-2 ${isBerhenti ? 'text-[#ee6f1f]' : 'text-slate-700'}`}>
                                                {isBerhenti && <ChevronRight size={16} className="text-[#ee6f1f]" />}
                                                {item.name}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500 text-xs">{item.type}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lng}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs text-right">{item.lat}</td>
                                            <td className="py-3 px-4 font-mono font-black text-[#1d2d6a] text-center text-xs">{item.eta}</td>
                                            <td className="py-3 px-4 text-center">
                                                {item.status ? (
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded tracking-widest uppercase shadow-sm ${isBerhenti ? 'bg-[#1d2d6a] text-white' : 'bg-slate-200 text-slate-500'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider">{item.next}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </SectionAccordion>

            {/* 3. SISTEM MEDIA & PENYIARAN */}
            <SectionAccordion
                title="3. Sistem Media & Penyiaran"
                icon={RadioTower}
                defaultOpen={true}
                summary="Audio Line-In • Layar DVD Standby"
            >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">

                    {/* Audio Broadcast */}
                    <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                            <Mic size={14} className="text-[#ee6f1f]" /> Audio Announcer
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                                <label className="text-[10px] font-bold uppercase tracking-widest">Sumber Output</label>
                                <select className="w-full text-sm font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all cursor-pointer">
                                    <option>Line In / Default Audio</option>
                                    <option>Internal Storage</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-[1px]">
                                <label className="flex items-center justify-center gap-3 text-sm font-black text-slate-600 uppercase tracking-wider cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 w-full transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a] focus:ring-[#1d2d6a]" /> Enable Broadcast
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col focus-within:text-[#ee6f1f] text-slate-400 transition-colors">
                            <label className="text-[10px] font-bold uppercase tracking-widest">Teks Informasi Darurat/Manual</label>
                            <textarea
                                className="w-full h-full min-h-[80px] text-sm font-medium text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#ee6f1f] focus:bg-white transition-all resize-none"
                                placeholder="Ketik pesan darurat/info..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button className="text-xs font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-xl transition-all shadow-sm">
                                Reset
                            </button>
                            <button className="text-xs font-black uppercase tracking-widest text-white bg-[#1d2d6a] hover:bg-[#152355] py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all">
                                <Volume2 size={14} /> Mainkan
                            </button>
                        </div>
                    </div>

                    {/* Video Layar */}
                    <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] text-white h-full flex flex-col">
                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-700 pb-2">
                            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <Video size={14} className="text-blue-400" /> Manajemen TV / Video
                            </h4>
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 transition-all">
                                <input type="checkbox" className="w-3 h-3 rounded bg-slate-800 border-slate-500 text-blue-500" /> Enable DVD
                            </label>
                        </div>

                        <div className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl p-2 overflow-auto space-y-1 shadow-inner h-32">
                            <div className="text-xs font-bold text-white bg-blue-600/20 p-2.5 rounded-lg flex items-center gap-3 border border-blue-500/30">
                                <Play size={10} className="text-blue-400 shrink-0" />
                                <span className="truncate w-full">Jessie J - Flashlight.mp4</span>
                            </div>
                            <div className="text-xs font-medium text-slate-400 p-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-800 cursor-pointer">
                                <div className="w-3 shrink-0" />
                                <span className="truncate w-full">Wonderful Indonesia.avi</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <button className="text-[10px] font-black uppercase text-slate-300 bg-slate-700 hover:bg-slate-600 p-2 rounded-lg border border-slate-600 transition-colors"><Pause size={12} /></button>
                                <button className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors">+ File</button>
                            </div>

                            <div className="flex-1 max-w-[120px] bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700/50 hidden sm:block">
                                <div className="bg-blue-500 h-full w-[45%]" />
                            </div>

                            <button className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors flex items-center gap-2">
                                <Maximize size={12} /> Full
                            </button>
                        </div>
                    </div>
                </div>
            </SectionAccordion>

            {/* FIXED BOTTOM TOOLBAR */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-[60] bg-[#1d2d6a]/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-6 py-4 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-center md:text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Action Toolbar</span>
                    <span className="text-sm font-black text-[#1d2d6a] uppercase tracking-wider">Console PIDS</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-widest text-[#1d2d6a] transition-all active:scale-95 flex-1 md:flex-none">
                        <MapPin size={16} className="text-blue-500" /> Cek GPS
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-widest text-[#1d2d6a] transition-all active:scale-95 flex-1 md:flex-none">
                        <Settings size={16} className="text-[#1d2d6a]" /> Warna
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-widest text-[#1d2d6a] transition-all active:scale-95 flex-1 md:flex-none">
                        <MonitorPlay size={16} className="text-green-500" /> Outdoor
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-widest text-[#1d2d6a] transition-all active:scale-95 flex-1 md:flex-none">
                        <RefreshCw size={16} className="text-[#ee6f1f]" /> Arah
                    </button>
                    <button className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#ee6f1f] hover:bg-[#d56119] shadow-[0_4px_12px_rgba(238,111,31,0.3)] text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 border border-[#ff8b42]/30 w-full md:w-auto md:ml-4">
                        <Save size={16} /> Simpan Konfig
                    </button>
                </div>
            </div>

        </div>
    );
}
