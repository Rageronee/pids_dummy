/**
 * ServiceConfig — Train service and unit configuration (memoized for RPi5).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronDown } from 'lucide-react';

interface ServiceConfigProps {
    trainNames: string[];
    routes: any;
    jumlahKereta: number;
    onSetService: (name: string, routeData: any, stations: string[]) => void;
    onSetGerbong: (gerbong: number) => void;
    initialTrainNameIndex: number;
}

const ServiceConfig = React.memo(function ServiceConfig({
    trainNames, routes, jumlahKereta, onSetService, onSetGerbong, initialTrainNameIndex
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

    const maxWagons = jumlahKereta > 0 ? jumlahKereta : 10;
    const filtered = trainNames.map((name, idx) => ({ name, idx })).filter(t => t.name.toUpperCase().includes(trainSearchQuery.toUpperCase()));

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col gap-8 h-full">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight flex items-center gap-3">
                    <Settings className="text-[#ee6f1f]" size={24} /> Service Configuration
                </h2>
                <p className="text-xs font-bold text-slate-400">Configure train service route and carriage number</p>
            </div>

            <div className="flex flex-col gap-8 flex-1">
                {/* Service Selection */}
                <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-[#1d2d6a] pl-1 uppercase tracking-wider">Select Route / Train Name</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1" ref={serviceDropdownRef}>
                            <div className={`w-full bg-slate-50 border-2 rounded-xl px-5 py-4 shadow-sm transition-all cursor-pointer flex items-center ${serviceDropdownOpen ? 'border-[#ee6f1f] ring-4 ring-orange-500/10' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}>
                                <input type="text" placeholder={trainNameIndex >= 0 && trainNames[trainNameIndex] ? trainNames[trainNameIndex] : '--- Pilih Service ---'} value={trainSearchQuery} onChange={(e) => { setTrainSearchQuery(e.target.value); if (!serviceDropdownOpen) setServiceDropdownOpen(true); }} onFocus={() => setServiceDropdownOpen(true)} className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-base font-bold text-[#1d2d6a] placeholder-slate-400 p-0" />
                                <ChevronDown size={20} strokeWidth={2.5} className={`text-slate-400 transition-transform flex-shrink-0 ${serviceDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {serviceDropdownOpen && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {filtered.length === 0 ? (
                                        <div className="px-5 py-3.5 text-sm font-bold text-slate-400 text-center">Tidak ada layanan ditemukan</div>
                                    ) : filtered.map((t) => (
                                        <div key={t.name} onClick={() => { setTrainNameIndex(t.idx); setTrainSearchQuery(''); setServiceDropdownOpen(false); }} className={`px-5 py-3 text-base font-bold cursor-pointer transition-colors ${trainNameIndex === t.idx ? 'bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'text-[#1d2d6a] hover:bg-slate-50'}`}>{t.name}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={handleSetName} className="h-[auto] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95 shrink-0">Set Route</button>
                    </div>
                </div>

                {/* Unit Selection */}
                <div className="flex flex-col gap-3 mt-auto">
                    <label className="text-xs font-black text-[#1d2d6a] pl-1 uppercase tracking-wider">Select Carriage Number</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <select value={selectedGerbong} onChange={(e) => setSelectedGerbong(parseInt(e.target.value))} className="w-full appearance-none bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-base font-bold text-[#1d2d6a] shadow-sm hover:border-slate-300 focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12">
                                {[...Array(maxWagons)].map((_, i) => (<option key={i + 1} value={i + 1}>Gerbong {i + 1}</option>))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400"><ChevronDown size={20} strokeWidth={2.5} /></div>
                        </div>
                        <button onClick={handleSetNumber} className="h-[auto] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95 shrink-0">Set Unit</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ServiceConfig;
