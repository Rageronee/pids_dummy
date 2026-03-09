/**
 * SystemSettingsModal — LED & Service configuration modal (memoized for RPi5).
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Clock, Settings as SettingsIcon, Video, LogOut } from 'lucide-react';
import { P10Matrix } from '@eltran/shared';
import type { PidsState } from '@eltran/pids-core';

interface SystemSettingsProps {
    show: boolean;
    onClose: () => void;
    data: PidsState | null;
    currentStation: string;
    stations: string[];

    // LED Props
    masterSyncedNumber: string;
    masterSyncedLedSpeed: number;
    onSetLedSpeed: (speed: number) => void;
    ledType: 'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16';
    onSetLedType: (type: 'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16') => void;

    // Utility Props
    showTVPreview: boolean;
    handleToggleTV: () => void;
    handleLogout: () => void;
    onUpdateDisplayPreferences: (prefs: Partial<PidsState>) => void;
}

const SystemSettingsModal = React.memo(function SystemSettingsModal({
    show, onClose, data, currentStation, stations,
    masterSyncedNumber, masterSyncedLedSpeed, onSetLedSpeed,
    ledType, onSetLedType,
    showTVPreview, handleToggleTV, handleLogout,
    onUpdateDisplayPreferences
}: SystemSettingsProps) {
    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#f4f7f9] w-full h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#1d2d6a] px-10 py-6 text-white flex justify-between items-center shrink-0 shadow-lg relative z-20">
                        <div className="flex items-center gap-6">
                            <div className="bg-white/10 p-4 rounded-[22px]"><SettingsIcon className="text-[#ee6f1f]" size={36} /></div>
                            <div>
                                <h2 className="text-4xl font-black italic tracking-tighter">System <span className="text-[#ee6f1f]">Settings</span></h2>
                                <p className="text-sm font-bold text-white/40 tracking-widest uppercase mt-1">Configuration & Control Center</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center">
                            <button onClick={handleToggleTV} className={`flex items-center gap-2 px-6 py-4 rounded-[20px] transition-colors font-black tracking-wider uppercase text-xs ${showTVPreview ? 'bg-white text-[#1d2d6a]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                <Video size={20} strokeWidth={2.5} /> {showTVPreview ? 'TV Active' : 'Enable TV'}
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-4 rounded-[20px] bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-black tracking-wider uppercase text-xs">
                                <LogOut size={20} strokeWidth={2.5} /> Logout
                            </button>
                            <div className="w-px h-8 bg-white/20 mx-2" />
                            <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white/20 rounded-[20px] transition-colors"><X size={28} strokeWidth={2.5} /></button>
                        </div>
                    </div>

                    <div className="p-10 flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center w-full">
                        <div className="w-full max-w-2xl flex flex-col gap-8 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight flex items-center gap-3">
                                    <Zap className="text-[#ee6f1f]" size={24} /> Display Controls
                                </h2>
                                <p className="text-xs font-bold text-slate-400">Manage LED brightness, speed, and format</p>
                            </div>

                            {/* Preview */}
                            <div className="space-y-4 text-center">
                                <div className="flex justify-center scale-100 py-4 h-32 items-center bg-slate-50 rounded-[1.5rem] border border-slate-100 overflow-hidden">
                                    {data?.ledActive !== false ? (
                                        <P10Matrix
                                            text={`~ POSISI SAAT INI: ${currentStation} ~ TUJUAN AKHIR STASIUN ${stations[stations.length - 1]} ~ BERHENTI DI: ${stations.join(', ')}`}
                                            fixedText={data?.showTrainNumber ? `${masterSyncedNumber.replace(/\D/g, '').padStart(2, '0')} ` : ''}
                                            color="#ee6f1f"
                                            speed={masterSyncedLedSpeed}
                                            columns={ledType.includes('96') ? 96 : 128}
                                        />
                                    ) : (
                                        <div className="w-full max-w-sm h-16 bg-black flex items-center justify-center rounded-lg border border-slate-800 shadow-inner">
                                            <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] font-black text-slate-500">LED System Standby</span></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col gap-6 pt-4 border-t border-slate-100 flex-1">
                                {/* LED Type */}
                                <div className="flex flex-col gap-3">
                                    <div><h4 className="text-sm font-black text-[#1d2d6a] tracking-tight">Display Type</h4></div>
                                    <div className="flex gap-3">
                                        <button onClick={() => onSetLedType('indoor')} className={`flex-1 py-3 px-4 rounded-xl font-black text-xs transition-all border-2 ${ledType === 'indoor' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'}`}>P2.5 Indoor</button>
                                        <button onClick={() => onSetLedType('p10_32_16')} className={`flex-1 py-3 px-4 rounded-xl font-black text-xs transition-all border-2 ${ledType === 'p10_32_16' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'}`}>P10 Outdoor</button>
                                    </div>
                                </div>

                                {/* Velocity */}
                                <div className="flex flex-col gap-3 mt-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-black text-[#1d2d6a] tracking-tight">Scrolling Velocity</h4>
                                        <div className="text-lg font-black text-[#ee6f1f] bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 font-mono">{masterSyncedLedSpeed}<span className="text-[10px] ml-1 opacity-60">MS</span></div>
                                    </div>
                                    <div className="relative pt-2">
                                        <input type="range" min="10" max="200" step="5" value={masterSyncedLedSpeed} onChange={(e) => onSetLedSpeed(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-xl appearance-none cursor-pointer accent-[#ee6f1f]" />
                                        <div className="flex justify-between text-[10px] font-black text-slate-400 mt-2"><span>Fast</span><span>Standard</span><span>Slow</span></div>
                                    </div>
                                </div>

                                {/* LED Content Toggles */}
                                <div className="flex flex-col gap-4 mt-2">
                                    <h4 className="text-sm font-black text-[#1d2d6a] tracking-tight">Display Preferences</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => onUpdateDisplayPreferences({ showTrainNumber: !data?.showTrainNumber })}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data?.showTrainNumber ? 'border-[#ee6f1f] bg-orange-50' : 'border-slate-100 bg-white'}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${data?.showTrainNumber ? 'text-[#ee6f1f]' : 'text-slate-400'}`}>Unit ID</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${data?.showTrainNumber ? 'bg-[#ee6f1f]' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${data?.showTrainNumber ? 'right-1' : 'left-1'}`} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => onUpdateDisplayPreferences({ showTelemetry: !data?.showTelemetry })}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data?.showTelemetry ? 'border-[#ee6f1f] bg-orange-50' : 'border-slate-100 bg-white'}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${data?.showTelemetry ? 'text-[#ee6f1f]' : 'text-slate-400'}`}>Telemetry</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${data?.showTelemetry ? 'bg-[#ee6f1f]' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${data?.showTelemetry ? 'right-1' : 'left-1'}`} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => onUpdateDisplayPreferences({ showClock: !data?.showClock })}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data?.showClock ? 'border-[#ee6f1f] bg-orange-50' : 'border-slate-100 bg-white'}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${data?.showClock ? 'text-[#ee6f1f]' : 'text-slate-400'}`}>Real-time Clock</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${data?.showClock ? 'bg-[#ee6f1f]' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${data?.showClock ? 'right-1' : 'left-1'}`} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-slate-400 text-[10px] leading-relaxed mt-auto pt-4 border-t border-slate-100">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-500 shrink-0"><Clock size={16} /></div>
                                <p className="font-bold">Changes are broadcasted in real-time to all connected units and panels.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default SystemSettingsModal;
