/**
 * TVMonitor — Fullscreen TV display (PIDS standby + Video mode).
 * Wrapped in React.memo to prevent re-renders from unrelated state changes (RPi5).
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Gauge, Mountain, Thermometer } from 'lucide-react';
import type { PidsState } from '@eltran/pids-core';

const API_URL = 'http://localhost:3001';

interface TVMonitorProps {
    show: boolean;
    onClose: () => void;
    data: PidsState | null;
    currentStation: string;
    nextStation: string;
    masterSyncedServiceName: string;
    masterSyncedNumber: string;
    speed: number;
    altitude: number;
    temp: number;
}

const TVMonitor = React.memo(function TVMonitor({
    show, onClose, data, currentStation, nextStation,
    masterSyncedServiceName, masterSyncedNumber, speed, altitude, temp
}: TVMonitorProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tvDisplayMode, setTvDisplayMode] = useState<'current' | 'next'>('current');

    useEffect(() => {
        if (!show) return;
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, [show]);

    useEffect(() => {
        if (!show) return;
        const t = setInterval(() => setTvDisplayMode(prev => prev === 'current' ? 'next' : 'current'), 15000);
        return () => clearInterval(t);
    }, [show]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden font-sans select-none">
                <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-black/30 hover:bg-black/60 rounded-full text-white/50 hover:text-white backdrop-blur-sm transition-all z-50 group" title="Close Monitor">
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <AnimatePresence mode="wait">
                    {data?.tvStandby !== false ? (
                        <motion.div key="standby-pids" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 flex flex-col overflow-hidden">
                            <motion.div initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }} className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/9/96/Tugu_Malang.jpg')" }} />
                            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                            <div className="relative z-20 flex justify-between items-start pt-10 px-14">
                                <div className="flex flex-col text-white drop-shadow-md">
                                    <div className="text-5xl font-bold tracking-tight mb-1">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')}</div>
                                    <div className="text-xl font-medium text-white/90">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                                <div className="flex items-center gap-3 mt-1 mr-16">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-9 drop-shadow-md brightness-0 invert" />
                                    <div className="flex flex-col text-white font-bold leading-none drop-shadow-md"><span className="text-sm">Monitor</span><span className="text-sm">PIDS</span></div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center items-center px-12 relative z-20 -mt-8">
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full max-w-5xl">
                                    <h3 className="text-[1.5vw] font-bold text-white/80 mb-2 drop-shadow-md">{tvDisplayMode === 'current' ? 'Current Station' : 'NEXT STATION'}</h3>
                                    <h3 className="text-[8vw] font-bold text-white tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] mb-6">{tvDisplayMode === 'current' ? currentStation : nextStation}</h3>
                                    <div className="flex items-center justify-center font-sans">
                                        <div className="bg-[#0a1536] px-12 py-3.5 flex flex-col items-center justify-center rounded-l-md w-80 h-[140px] shadow-lg border-r border-white/20">
                                            <span className="text-[13px] font-medium text-white/90 mb-1">Service</span>
                                            <span className="text-[32px] font-bold text-white drop-shadow-sm leading-tight text-center">{masterSyncedServiceName}</span>
                                        </div>
                                        <div className="bg-[#cc500c] px-12 py-3.5 flex flex-col items-center justify-center rounded-r-md w-80 h-[140px] shadow-lg border-l border-[#d95d19]">
                                            <span className="text-[13px] font-medium text-white/90 mb-1">Train No</span>
                                            <span className="text-[32px] font-bold text-white drop-shadow-sm leading-tight text-center">KA-{masterSyncedNumber}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="h-[160px] bg-gradient-to-b from-transparent via-[#0d1c47]/80 to-[#0a1536] relative z-20 flex items-end justify-between px-24 pb-10">
                                <div className="flex items-center gap-6 w-1/3 justify-start"><Gauge size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={2} /><div className="flex flex-col"><span className="text-[35px] font-medium text-white/90 mb-0.5">Speed</span><div className="flex items-baseline gap-2"><span className="text-[44px] leading-none font-bold text-white tracking-tight">{speed}</span><span className="text-2xl font-bold text-white/90">km/h</span></div></div></div>
                                <div className="flex items-center gap-6 w-1/3 justify-center"><Mountain size={60} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} /><div className="flex flex-col"><span className="text-[35px] font-medium text-white/90 mb-0.5">Altitude</span><div className="flex items-baseline gap-2"><span className="text-[44px] leading-none font-bold text-white tracking-tight">{altitude}</span><span className="text-2xl font-bold text-white/90">m</span></div></div></div>
                                <div className="flex items-center gap-6 w-1/3 justify-end"><Thermometer size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} /><div className="flex flex-col"><span className="text-[35px] font-medium text-white/90 mb-0.5">Temp</span><div className="flex items-baseline gap-2"><span className="text-[44px] leading-none font-bold text-white tracking-tight">{temp}</span><span className="text-2xl font-bold text-white/90">°C</span></div></div></div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="video-display" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                            {(() => {
                                const playlist = data?.videoPlaylist || [];
                                const activeIdx = data?.activeVideoIndex ?? 0;
                                const activeFile = playlist[activeIdx];
                                const videoUrl = activeFile ? `${API_URL}/media/video/${encodeURIComponent(activeFile)}` : null;
                                if (!videoUrl || playlist.length === 0) {
                                    return (<div className="flex-1 flex flex-col items-center justify-center gap-6"><div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Video size={40} className="text-white/20" /></div><div className="text-center"><p className="text-white/40 text-sm font-bold">Tidak Ada Video Aktif</p><p className="text-white/20 text-xs mt-1">Tambahkan video ke playlist dari Master Console</p></div></div>);
                                }
                                return (
                                    <div className="flex-1 flex items-center justify-center w-full h-full bg-black">
                                        <video key={videoUrl} src={videoUrl} autoPlay={data?.isPlaying ?? false} loop muted={data?.muteVideo ?? false} className="w-full h-full object-contain" ref={(el) => { if (el) { if (data?.isPlaying !== undefined) { if (data.isPlaying && el.paused) el.play().catch(() => { }); if (!data.isPlaying && !el.paused) el.pause(); } el.volume = (data?.volume ?? 50) / 100; } }} />
                                        <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 z-30">
                                            <div className={`w-2 h-2 rounded-full ${data?.isPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} /><span className="text-[10px] font-bold">{data?.isPlaying ? 'Now Playing' : 'Paused'}: {activeFile}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
});

export default TVMonitor;
