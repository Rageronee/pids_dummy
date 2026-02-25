import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Train, Settings, Save, RefreshCw, Volume2,
    MapPin, MonitorPlay, Mic, Play, Pause,
    ChevronDown, ChevronRight, RadioTower, Video, Satellite, Info,
    ListVideo, Disc
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
                <div className="p-6 xl:w-1/3 bg-slate-50 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col">
                    <div className="flex items-center gap-3 mb-5 shrink-0">
                        <div className="bg-[#1d2d6a] p-2.5 rounded-xl text-white shadow-md"><Train size={24} /></div>
                        <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Status Perjalanan</h3>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        {/* Identitas */}
                        <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">No KA / Nama</span>
                                <span className="text-xs font-black text-[#1d2d6a]">KA {activeTrainNumber} - {activeTrainName}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Relasi</span>
                                <span className="text-xs font-black text-[#1d2d6a]">BD - SGU</span>
                            </div>
                        </div>

                        {/* Berangkat & Tiba */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Berangkat</span>
                                <span className="text-xs font-black text-[#1d2d6a]">BD 19:00</span>
                            </div>
                            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tiba</span>
                                <span className="text-xs font-black text-[#1d2d6a]">SGU 07:31</span>
                            </div>
                        </div>

                        {/* POI Info Terdekat */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">POI Terdekat</span>
                                    <span className="text-sm font-black text-emerald-600">BUMIWALIYA</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Jarak ke POI</span>
                                    <span className="text-xs font-black text-rose-500">&lt; 10 km (2518 m)</span>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100" />

                            <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Status Aktual</span>
                                    <span className="text-sm font-black text-[#1d2d6a]">Menuju ke CIPEUNDEUY</span>
                                </div>
                                <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-0.5">ETA</span>
                                    <span className="text-xs font-black text-blue-700">23:04</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 xl:w-2/3 bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shadow-inner"><Satellite size={24} /></div>
                            <h3 className="font-black text-[#1d2d6a] uppercase tracking-widest text-sm">Telemetri Satelit (GPS)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm hidden sm:flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> GPS 3D FIX
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Longitude <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">108.086736</div>
                            <div className="text-[9px] text-slate-400 mt-1">Garis Bujur Timur</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Latitude <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">-7.07608</div>
                            <div className="text-[9px] text-slate-400 mt-1">Garis Lintang Selatan</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-blue-100/50 group-hover:bg-blue-200/50 transition-colors" />
                            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1 relative z-10">Kecepatan</div>
                            <div className="text-2xl font-mono font-black text-blue-600 leading-none relative z-10">41.8<span className="text-[10px] font-sans tracking-widest ml-1 text-blue-500">km/h</span></div>
                            <div className="text-[9px] text-blue-400 mt-1 relative z-10">Realtime Speed</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Haluan (Dir) <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">141.88&deg;</div>
                            <div className="text-[9px] text-slate-400 mt-1">Arah Orientasi KA</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Ketinggian <Info size={12} /></div>
                            <div className="text-lg font-mono font-black text-[#1d2d6a]">125 <span className="text-[10px] text-slate-500 tracking-wider">MDPL</span></div>
                            <div className="text-[9px] text-slate-400 mt-1">Elevasi Permukaan</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm col-span-1 hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex justify-between">Tanggal<Info size={12} /></div>
                            <div className="text-[13px] font-mono font-black text-[#1d2d6a]">31/3/2017</div>
                            <div className="text-[9px] text-slate-400 mt-1">Waktu Sistem Server</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">Radius Luar <Info size={12} /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input type="number" defaultValue={750} className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-lg font-mono font-black text-[#1d2d6a] focus:outline-none focus:border-blue-400 shadow-sm" />
                                <span className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">METER</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between">Radius Dalam <Info size={12} /></div>
                            <div className="flex items-end gap-2 mt-2">
                                <input type="number" defaultValue={250} className="w-16 bg-white border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 text-lg font-mono font-black text-[#ee6f1f] focus:outline-none focus:border-blue-400 shadow-sm" />
                                <span className="text-[10px] text-[#ee6f1f] font-bold tracking-wider mb-2">METER</span>
                            </div>
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
                <div className="bg-white p-5 lg:p-6 mt-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
                    {/* Header Controls: Global IP & Controls */}
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        {/* Global IP & Settings */}
                        <div className="flex flex-wrap items-center gap-4 flex-1">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Global IP</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 shadow-sm">
                                    <input type="text" defaultValue="192" className="w-[28px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="168" className="w-[28px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="1" className="w-[20px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <span className="text-slate-300">.</span>
                                    <input type="text" defaultValue="48" className="w-[24px] text-[11px] font-mono font-black text-[#1d2d6a] bg-transparent text-center focus:outline-none" />
                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                    <select className="text-[10px] font-bold text-blue-600 bg-transparent cursor-pointer focus:outline-none" defaultValue="auto">
                                        <option value="auto">Auto</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 hidden sm:block" />

                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Jumlah Kereta</span>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                                    <Train size={14} className="text-slate-400" />
                                    <select className="text-xs font-black text-[#1d2d6a] bg-transparent cursor-pointer focus:outline-none min-w-[70px]" defaultValue="5">
                                        {[...Array(15)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1} Kereta</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-200 hidden sm:block" />

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a]" defaultChecked /> IN
                                </label>
                                <label className="flex items-center gap-2 text-xs font-black text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded text-[#1d2d6a]" defaultChecked /> OUT
                                </label>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-3 p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer px-3 py-2 hover:bg-slate-50 rounded-md transition-colors">
                                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300" /> No KA
                            </label>
                            <div className="w-px h-5 bg-slate-200" />
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer px-3 py-2 hover:bg-slate-50 rounded-md transition-colors">
                                <input type="checkbox" className="w-4 h-4 rounded text-[#ee6f1f] border-slate-300" defaultChecked /> 9x16
                            </label>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x">
                        {['LOK', '1', '2', '3', '4', '5'].map((item, i) => (
                            <div key={item} className="flex flex-col shrink-0 min-w-[140px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:border-[#1d2d6a]/40 hover:shadow-md transition-all snap-start">
                                <div className={`flex items-center justify-center h-10 ${i === 0 ? 'bg-slate-100 border-b border-slate-200' : 'bg-[#1d2d6a] text-white border-b border-[#152355]'}`}>
                                    <span className="text-sm font-black uppercase tracking-widest">{item}</span>
                                </div>
                                <div className="p-3 bg-slate-50 flex flex-col gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i === 0 ? 'ID' : 'Kereta'}</span>
                                        {i === 0 ? (
                                            <div className="text-xs font-black text-slate-500 h-[28px] flex items-center justify-center bg-slate-100/50 rounded border border-slate-200">LOKOMOTIF</div>
                                        ) : (
                                            <input type="text" defaultValue={`K1016${i}`} className="text-xs font-black text-[#1d2d6a] bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full text-center shadow-sm transition-all" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">IP Node</span>
                                            {i !== 0 && (
                                                <select className="text-[8px] font-black text-blue-500 bg-transparent border-none appearance-none cursor-pointer focus:outline-none" defaultValue="auto">
                                                    <option value="auto">AUTO</option>
                                                    <option value="custom">CUSTOM</option>
                                                </select>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 shadow-sm transition-all">
                                            {i === 0 ? (
                                                <div className="flex items-center gap-1 w-full justify-center">
                                                    <span className="text-[10px] font-mono font-bold text-slate-300">.</span>
                                                    <input type="number" defaultValue={10} className="text-xs font-mono font-black text-emerald-600 bg-transparent focus:outline-none w-full text-center" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-0.5 w-full justify-center">
                                                    <input type="text" defaultValue="192" className="w-[24px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[8px]">.</span>
                                                    <input type="text" defaultValue="168" className="w-[24px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[8px]">.</span>
                                                    <input type="text" defaultValue="1" className="w-[12px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                    <span className="text-slate-300 text-[8px]">.</span>
                                                    <input type="text" defaultValue={50 + i} className="w-[18px] text-[10px] font-mono font-black text-blue-600 bg-transparent text-center focus:outline-none" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">File Aktif:</span>
                        <span className="text-sm font-black text-[#1d2d6a]">Rute_Utama_Bandung_Surabaya.json</span>
                    </div>
                    <button className="text-xs font-black uppercase tracking-widest text-[#1d2d6a] bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
                        <RefreshCw size={14} className="text-blue-500" /> Import File
                    </button>
                </div>
                <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
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
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden group">

                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
                            <h4 className="flex items-center gap-2 text-xs font-black text-[#1d2d6a] uppercase tracking-widest">
                                <Video size={16} className="text-blue-500" /> Manajemen TV / Video
                            </h4>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all text-slate-600 shadow-sm">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked /> Standby
                                </label>
                            </div>
                        </div>

                        {/* Playlist Box */}
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 overflow-auto space-y-1.5 shadow-inner min-h-[140px]">
                            {/* Playlist Item 1: Active */}
                            <div className="text-xs font-bold text-blue-700 bg-blue-100/50 p-2.5 rounded-lg flex items-center justify-between gap-3 border border-blue-200 shadow-sm">
                                <div className="flex items-center gap-3 w-full overflow-hidden">
                                    <div className="bg-blue-600 text-white rounded-full p-1 border border-blue-500 shadow-sm shrink-0"><Play size={10} className="ml-[1px]" /></div>
                                    <span className="truncate w-full font-black">Company_Profile_Eltran.mp4</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-blue-500 shrink-0">02:15 / 05:30</span>
                            </div>
                            {/* Playlist Item 2 */}
                            <div className="text-xs font-medium text-slate-600 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all">
                                <div className="flex items-center gap-3 w-full overflow-hidden">
                                    <div className="p-1 shrink-0 text-slate-400"><ListVideo size={14} /></div>
                                    <span className="truncate w-full font-bold">Safety_Briefing_KAI.mp4</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">03:45</span>
                            </div>
                            {/* Playlist Item 3 */}
                            <div className="text-xs font-medium text-slate-600 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-all">
                                <div className="flex items-center gap-3 w-full overflow-hidden">
                                    <div className="p-1 shrink-0 text-slate-400"><Disc size={14} /></div>
                                    <span className="truncate w-full font-bold">Wonderful_Indonesia_Tour.avi</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">12:20</span>
                            </div>
                        </div>

                        {/* Playback Controls & Progress */}
                        <div className="flex flex-col gap-4 mt-auto border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-black text-blue-500">02:15</span>
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden cursor-pointer relative shadow-inner">
                                    <div className="absolute top-0 left-0 bottom-0 bg-blue-500 w-[41%]" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400">-03:15</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 relative min-h-[50px]">
                                {/* Left Side Tools */}
                                <div className="flex items-center gap-2">
                                    <button className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-xl transition-all"><Volume2 size={18} /></button>
                                </div>

                                {/* Center Play Controls */}
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100 shadow-inner">
                                    <button className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><ChevronDown size={20} className="rotate-90" /></button>
                                    <button className="text-white bg-[#1d2d6a] hover:bg-[#152355] p-3.5 mx-2 rounded-full shadow-lg transition-all active:scale-90 hover:scale-105"><Pause size={20} fill="currentColor" /></button>
                                    <button className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><ChevronDown size={20} className="-rotate-90" /></button>
                                </div>

                                {/* Right Side Tools */}
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-500 hover:text-[#1d2d6a] bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 transition-all shadow-sm">
                                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-[#1d2d6a] focus:ring-[#1d2d6a]" /> DVD
                                    </label>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200 transition-all shadow-sm">
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionAccordion>

            {/* FIXED BOTTOM TOOLBAR */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-15px_40px_rgba(0,0,0,0.04)] px-6 py-4 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-center md:text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Action Toolbar</span>
                    <span className="text-sm font-black text-[#1d2d6a] uppercase tracking-wider">Console PIDS</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                    <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-[#1d2d6a] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-100 flex-1 md:flex-none">
                        <MapPin size={16} className="text-blue-500" /> Cek GPS
                    </button>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-[#1d2d6a] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-100 flex-1 md:flex-none">
                        <Settings size={16} className="text-slate-400" /> Warna
                    </button>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-[#1d2d6a] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-100 flex-1 md:flex-none">
                        <MonitorPlay size={16} className="text-green-500" /> Outdoor
                    </button>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-[#1d2d6a] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-100 flex-1 md:flex-none">
                        <RefreshCw size={16} className="text-[#ee6f1f]" /> Arah
                    </button>

                    <div className="w-full md:w-px md:h-8 bg-slate-200 mx-1 hidden md:block" />

                    <button className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#ee6f1f] hover:bg-[#f87a2c] text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-95 w-full md:w-auto">
                        <Save size={16} /> Simpan Konfig
                    </button>
                </div>
            </div>

        </div>
    );
}
