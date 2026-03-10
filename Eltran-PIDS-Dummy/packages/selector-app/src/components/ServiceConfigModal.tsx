import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Train } from 'lucide-react';

interface ServiceConfigProps {
    show: boolean;
    onClose: () => void;
    trainNames: string[];
    routes: any;
    jumlahKereta: number;
    onSetConfig: (name: string, routeData: any, newStations: string[], gerbong: number) => void;
    onSetGerbong: (gerbong: number) => void;
    initialTrainNameIndex: number;
}

const ServiceConfigModal = React.memo(function ServiceConfigModal({
    show, onClose, trainNames, routes, jumlahKereta, onSetConfig, onSetGerbong, initialTrainNameIndex
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

    const handleApply = useCallback(() => {
        // Apply Service/Route + Unit/Gerbong in one atomic update
        if (trainNameIndex >= 0 && trainNameIndex < trainNames.length) {
            const newName = trainNames[trainNameIndex];
            const routeData = routes[newName];
            const newStations = routeData?.stations || [];
            onSetConfig(newName, routeData, newStations, selectedGerbong);
        } else {
            // Fallback if no service selected but we still want to set gerbong
            onSetGerbong(selectedGerbong);
        }

        onClose();
    }, [trainNameIndex, trainNames, routes, selectedGerbong, onSetConfig, onSetGerbong, onClose]);

    const maxWagons = jumlahKereta > 0 ? jumlahKereta : 10;
    const filtered = trainNames.map((name, idx) => ({ name, idx })).filter(t => t.name.toUpperCase().includes(trainSearchQuery.toUpperCase()));

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 line-clamp-none">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-visible flex flex-col">
                    <div className="bg-[#1d2d6a] px-8 py-5 text-white flex justify-between items-center shrink-0 rounded-t-[2rem]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl"><Train className="text-[#ee6f1f]" size={28} /></div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Service Configuration</h2>
                                <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Select Train Route and Unit Size</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"><X size={24} strokeWidth={2.5} /></button>
                    </div>

                    <div className="p-8 flex flex-col gap-8 bg-[#f8fafc]">
                        {/* Service Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-black text-[#1d2d6a] pl-1 uppercase tracking-wider">Select Route / Train Name</label>
                            <div className="relative flex-1" ref={serviceDropdownRef}>
                                <div className={`w-full bg-white border-2 rounded-xl px-5 py-4 shadow-sm transition-all cursor-pointer flex items-center ${serviceDropdownOpen ? 'border-[#ee6f1f] ring-4 ring-orange-500/10' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}>
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
                        </div>

                        {/* Unit Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-black text-[#1d2d6a] pl-1 uppercase tracking-wider">Select Carriage Number</label>
                            <div className="relative flex-1">
                                <select value={selectedGerbong} onChange={(e) => setSelectedGerbong(parseInt(e.target.value))} className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-5 py-4 text-base font-bold text-[#1d2d6a] shadow-sm hover:border-slate-300 focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12">
                                    {[...Array(maxWagons)].map((_, i) => (<option key={i + 1} value={i + 1}>Gerbong {i + 1}</option>))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400"><ChevronDown size={20} strokeWidth={2.5} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Apply Button Container */}
                    <div className="p-8 pt-0 bg-[#f8fafc] rounded-b-[2rem]">
                        <button onClick={handleApply} className="w-full py-5 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-2xl font-black text-xl shadow-[0_8px_20px_rgba(238,111,31,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                            Apply Configuration
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default ServiceConfigModal;
