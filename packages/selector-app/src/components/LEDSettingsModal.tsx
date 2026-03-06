/**
 * LEDSettingsModal — LED configuration modal (memoized for RPi5).
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Clock } from 'lucide-react';
import { P10Matrix } from '@eltran/shared';
import type { PidsState } from '@eltran/pids-core';

interface LEDSettingsProps {
    show: boolean;
    onClose: () => void;
    data: PidsState | null;
    currentStation: string;
    stations: string[];
    masterSyncedNumber: string;
    masterSyncedLedSpeed: number;
    onSetLedSpeed: (speed: number) => void;
    ledType: 'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16';
    onSetLedType: (type: 'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16') => void;
}

const LEDSettingsModal = React.memo(function LEDSettingsModal({
    show, onClose, data, currentStation, stations,
    masterSyncedNumber, masterSyncedLedSpeed, onSetLedSpeed,
    ledType, onSetLedType
}: LEDSettingsProps) {
    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden">
                    <div className="bg-[#1d2d6a] p-8 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 p-3 rounded-2xl"><Zap className="text-[#ee6f1f]" /></div>
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter">LED <span className="text-[#ee6f1f]">Configuration</span></h2>
                                <p className="text-[10px] font-bold text-white/40">Visualizer & Velocity Control</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Preview */}
                        <div className="space-y-4 text-center pb-2">
                            <div className="flex justify-center scale-100 py-4 h-32 items-center">
                                {data?.ledActive !== false ? (
                                    <P10Matrix text={`~ POSISI SAAT INI: ${currentStation} ~ TUJUAN AKHIR STASIUN ${stations[stations.length - 1]} ~ BERHENTI DI: ${stations.join(', ')}`} fixedText={data?.showTrainNumber ? `${masterSyncedNumber} ` : ''} color="#ee6f1f" speed={masterSyncedLedSpeed} columns={ledType.includes('96') ? 96 : 128} />
                                ) : (
                                    <div className="w-full max-w-2xl h-16 bg-black flex items-center justify-center rounded-lg border border-slate-800 shadow-inner">
                                        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] font-black text-slate-500">LED System Standby / Powered Off</span></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* LED Type */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-4">
                            <div><h4 className="text-base font-black text-[#1d2d6a] tracking-tight">Display Type</h4><p className="text-[10px] font-bold text-slate-400">Select matrix panel model</p></div>
                            <div className="flex gap-3">
                                <button onClick={() => onSetLedType('indoor')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-[10px] transition-all border-2 ${ledType === 'indoor' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>P2.5 Indoor</button>
                                <button onClick={() => onSetLedType('p10_32_16')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-[10px] transition-all border-2 ${ledType === 'p10_32_16' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>P10 Outdoor</button>
                            </div>
                        </div>

                        {/* Speed Control */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                                <div><h4 className="text-base font-black text-[#1d2d6a] tracking-tight">Scrolling Velocity</h4><p className="text-[10px] font-bold text-slate-400">Adjustment for matrix modules</p></div>
                                <div className="text-2xl font-black text-[#ee6f1f] bg-white px-5 py-1.5 rounded-2xl shadow-sm border border-slate-100 font-mono">{masterSyncedLedSpeed}<span className="text-[10px] ml-1 opacity-40">MS</span></div>
                            </div>
                            <div className="relative pt-1">
                                <input type="range" min="10" max="200" step="5" value={masterSyncedLedSpeed} onChange={(e) => onSetLedSpeed(parseInt(e.target.value))} className="w-full h-3 bg-slate-200 rounded-xl appearance-none cursor-pointer accent-[#ee6f1f]" />
                                <div className="flex justify-between text-[8px] font-black text-slate-300 mt-3"><span>Hyper Fast (10ms)</span><span>Standard (60ms)</span><span>Slow (200ms)</span></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-400 text-[9px] leading-relaxed pt-2">
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Clock size={14} /></div>
                            <p className="font-bold">Changes are broadcasted in real-time to all connected LED units and passenger displays.</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default LEDSettingsModal;
