/**
 * ServiceConfig — Train service and unit configuration (memoized for RPi5).
 */
/**
 * Ringkasan: selector-app\src\components\ServiceConfig.tsx
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronDown } from 'lucide-react';

interface ServiceConfigProps {
    trainNames: string[];
    routes: any;
    coachCount: number;
    onSetService: (name: string, routeData: any, stations: string[]) => void;
    onSetGerbong: (gerbong: number) => void;
    initialTrainNameIndex: number;
}

const ServiceConfig = React.memo(function ServiceConfig({
    trainNames, routes, coachCount, onSetService, onSetGerbong, initialTrainNameIndex
}: ServiceConfigProps) {
    const [trainNameIndex, setTrainNameIndex] = useState(initialTrainNameIndex);
    const [trainSearchQuery, setTrainSearchQuery] = useState('');
    const [selectedGerbong, setSelectedGerbong] = useState(1);
    const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
    const serviceDropdownRef = useRef<HTMLDivElement>(null);

    // Sync external index when master updates
    useEffect(() => { setTrainNameIndex(initialTrainNameIndex); }, [initialTrainNameIndex]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) setServiceDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSetName = useCallback(() => {
        if (trainNameIndex < 0 || trainNameIndex >= trainNames.length) return;
        const newName = trainNames[trainNameIndex];
        const routeData = routes[newName];
        const newStations = routeData?.stations || [];
        onSetService(newName, routeData, newStations);
    }, [trainNameIndex, trainNames, routes, onSetService]);

    const handleSetNumber = useCallback(() => {
        onSetGerbong(selectedGerbong);
    }, [selectedGerbong, onSetGerbong]);

    const maxWagons = coachCount > 0 ? coachCount : 10;
    const filtered = trainNames.map((name, idx) => ({ name, idx })).filter(t => t.name.toUpperCase().includes(trainSearchQuery.toUpperCase()));

    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-10 h-full">
            <div className="flex flex-col gap-3">
                <h2 className="text-3xl font-bold text-[#1d2d6a] tracking-tight flex items-center gap-4">
                    <Settings className="text-[#ee6f1f] animate-[spin_10s_linear_infinite]" size={36} /> Service Configuration
                </h2>
                <p className="text-sm font-bold text-slate-400">Configure train service route and carriage number for the master display</p>
            </div>

            <div className="flex flex-col gap-10 flex-1">
                {/* Service Selection */}
                <div className="flex flex-col gap-5">
                    <label className="text-sm font-bold text-[#1d2d6a]/60 pl-1 uppercase tracking-[0.2em]">Select Route / Train Name</label>
                    <div className="flex gap-6">
                        <div className="relative flex-1" ref={serviceDropdownRef}>
                            <div
                                className={`w-full bg-slate-50 border-4 rounded-[2rem] px-8 py-6 shadow-sm transition-all cursor-pointer flex items-center group relative overflow-hidden ${serviceDropdownOpen ? 'border-[#ee6f1f] bg-white ring-8 ring-orange-500/10' : 'border-slate-100 hover:border-[#1d2d6a]/20 hover:bg-white hover:shadow-md'}`}
                                onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                            >
                                {/* Interactive Trigger (Ping Effect) */}
                                {!serviceDropdownOpen && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ee6f1f] rounded-full animate-ping opacity-20 pointer-events-none" />
                                )}

                                <input
                                    type="text"
                                    placeholder={trainNameIndex >= 0 && trainNames[trainNameIndex] ? trainNames[trainNameIndex] : '--- PILIH SERVICE ---'}
                                    value={trainSearchQuery}
                                    onChange={(e) => { setTrainSearchQuery(e.target.value); if (!serviceDropdownOpen) setServiceDropdownOpen(true); }}
                                    onFocus={() => setServiceDropdownOpen(true)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-2xl font-bold text-[#1d2d6a] placeholder-[#1d2d6a]/30 p-0 uppercase"
                                />
                                <div className={`p-3 rounded-2xl transition-all ${serviceDropdownOpen ? 'bg-[#ee6f1f] text-white rotate-180' : 'bg-slate-100 text-[#1d2d6a] group-hover:bg-[#1d2d6a] group-hover:text-white'}`}>
                                    <ChevronDown size={28} strokeWidth={3} />
                                </div>
                            </div>

                            {serviceDropdownOpen && (
                                <div className="absolute z-[100] top-full left-0 right-0 mt-3 bg-white border-4 border-[#1d2d6a]/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-[350px] overflow-y-auto custom-scrollbar overflow-hidden">
                                    {filtered.length === 0 ? (
                                        <div className="px-8 py-6 text-lg font-bold text-slate-400 text-center">Tidak ada layanan ditemukan</div>
                                    ) : filtered.map((t) => (
                                        <div
                                            key={t.name}
                                            onClick={() => { setTrainNameIndex(t.idx); setTrainSearchQuery(''); setServiceDropdownOpen(false); }}
                                            className={`px-8 py-6 text-xl font-bold cursor-pointer transition-all flex items-center justify-between border-b border-slate-50 last:border-none ${trainNameIndex === t.idx ? 'bg-[#ee6f1f] text-white' : 'text-[#1d2d6a] hover:bg-slate-50'}`}
                                        >
                                            {t.name}
                                            {trainNameIndex === t.idx && <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={handleSetName} className="h-auto px-10 bg-[#1d2d6a] hover:bg-[#152353] text-white rounded-[2rem] font-bold text-xl shadow-lg transition-all active:scale-95 shrink-0 uppercase tracking-tight border-b-4 border-blue-900">Apply Route</button>
                    </div>
                </div>

                {/* Unit Selection */}
                <div className="flex flex-col gap-5 mt-auto">
                    <label className="text-sm font-bold text-[#1d2d6a]/60 pl-1 uppercase tracking-[0.2em]">Select Carriage Number</label>
                    <div className="flex gap-6">
                        <div className="relative flex-1 group">
                            <select
                                value={selectedGerbong}
                                onChange={(e) => setSelectedGerbong(parseInt(e.target.value))}
                                className="w-full appearance-none bg-slate-50 border-4 border-slate-100 rounded-[2rem] px-8 py-6 text-2xl font-bold text-[#1d2d6a] shadow-sm hover:border-[#1d2d6a]/20 focus:border-[#ee6f1f] focus:ring-8 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-20 uppercase"
                            >
                                {[...Array(maxWagons)].map((_, i) => (<option key={i + 1} value={i + 1}>Gerbong {i + 1}</option>))}
                            </select>
                            <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none transition-all">
                                <div className="p-3 bg-slate-100 rounded-2xl text-[#1d2d6a] group-hover:bg-[#1d2d6a] group-hover:text-white transition-colors">
                                    <ChevronDown size={28} strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSetNumber} className="h-auto px-10 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-[2rem] font-bold text-xl shadow-lg transition-all active:scale-95 shrink-0 uppercase tracking-tight border-b-4 border-orange-700">Set Unit</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ServiceConfig;

