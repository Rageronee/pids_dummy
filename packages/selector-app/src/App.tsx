import { useState, useEffect } from 'react';
import { MapPin, Activity, Mountain, Gauge, Navigation, Thermometer, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATIONS = ['GAMBIR', 'BEKASI', 'CIREBON', 'PURWOKERTO', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'];

function App() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Telemetry State
    const [speed, setSpeed] = useState(0);
    const [altitude, setAltitude] = useState(700);
    const [temp, setTemp] = useState(24);
    const [showTVPreview, setShowTVPreview] = useState(false);

    // Shared State Sync
    const SHARED_FILE_NAME = 'eltran-pids-state.json';
    const getFs = () => {
        if (window.require) {
            const fs = window.require('fs');
            const os = window.require('os');
            const path = window.require('path');
            const filePath = path.join(os.tmpdir(), SHARED_FILE_NAME);
            return { fs, filePath };
        }
        return null;
    };

    const sendData = (newData: any) => {
        const fsObj = getFs();
        if (!fsObj) return;
        const { fs, filePath } = fsObj;
        try {
            let currentData = {};
            if (fs.existsSync(filePath)) {
                currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
            const updated = { ...currentData, ...newData };
            fs.writeFileSync(filePath, JSON.stringify(updated));
        } catch (e) {
            console.error('Error writing PIDS state:', e);
        }
    };

    // Initial State Sync
    useEffect(() => {
        const fsObj = getFs();
        if (fsObj) {
            const { fs, filePath } = fsObj;
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const parsed = JSON.parse(content);
                    if (parsed.stationName) {
                        const idx = STATIONS.indexOf(parsed.stationName);
                        if (idx !== -1) setCurrentIndex(idx);
                    }
                    if (parsed.displayMode === 'tv') {
                        setShowTVPreview(true);
                    }
                } catch (e) {
                    console.error('Error reading initial state:', e);
                }
            }
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // Simulate Telemetry
            const newSpeed = Math.round(Math.max(0, Math.min(120, speed + (Math.random() - 0.5) * 5)));
            setSpeed(newSpeed);
            setAltitude(prev => Math.round(prev + (Math.random() - 0.5) * 2));
            setTemp(prev => Math.round((prev + (Math.random() - 0.5) * 0.2) * 10) / 10);

            // Sync simulation data to shared state
            sendData({ speed: newSpeed, altitude, temperature: temp });
        }, 1000);
        return () => clearInterval(timer);
    }, [speed, altitude, temp]);

    const handleSelectStation = () => {
        setShowTVPreview(false);
        sendData({
            stationName: STATIONS[currentIndex],
            nextStation: STATIONS[(currentIndex + 1) % STATIONS.length],
            displayMode: 'pids'
        });
    };

    const handleToggleTV = () => {
        const newState = !showTVPreview;
        setShowTVPreview(newState);
        sendData({ displayMode: newState ? 'tv' : 'pids' });
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + STATIONS.length) % STATIONS.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % STATIONS.length);
    };

    const currentStation = STATIONS[currentIndex];
    const nextStation = STATIONS[(currentIndex + 1) % STATIONS.length];

    return (
        <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none">
            {/* Header */}
            <header className="bg-white px-8 py-4 shadow-sm border-b border-slate-200 flex justify-between items-center z-10">
                <div className="flex items-center gap-6">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-8 w-auto"
                    />
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                        <h1 className="text-lg font-black text-[#1d2d6a] tracking-tight">PIDS SELECTOR</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control & Monitoring System</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* TV Monitor Toggle Button - Top Right */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleToggleTV}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showTVPreview
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-[#1d2d6a] text-white shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        <Video size={18} className={showTVPreview ? 'animate-pulse' : ''} />
                    </motion.button>

                    <div className="h-8 w-px bg-slate-200" />

                    <div className="flex items-center gap-8 font-mono">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-[#1d2d6a] leading-none">
                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-8 overflow-hidden relative">
                {/* Selection Control Container */}
                <div className="h-full flex flex-col gap-6">
                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ee6f1f] to-[#1d2d6a]" />

                        <div className="mb-8 flex items-center gap-3 px-5 py-2 rounded-full bg-blue-50 text-[#1d2d6a] w-fit border border-blue-100">
                            <Navigation size={18} className="text-[#ee6f1f]" />
                            <span className="text-xs font-black uppercase tracking-widest">Active Station Context</span>
                        </div>

                        <div className="flex justify-between items-start">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStation}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-2"
                                >
                                    <h2 className="text-8xl font-black text-[#1d2d6a] tracking-tighter uppercase leading-none">
                                        {currentStation}
                                    </h2>
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <MapPin size={20} />
                                        <span className="text-xl font-medium tracking-widest uppercase">DAERAH OPERASI 1 • JAKARTA</span>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coming Up Next</div>
                                <div className="text-2xl font-black text-[#ee6f1f] uppercase">{nextStation}</div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                                <Activity size={16} />
                                <span className="text-xs font-black uppercase">On Track</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-6 h-28">
                        <button
                            onClick={handlePrev}
                            className="flex-1 bg-white hover:bg-slate-50 text-[#1d2d6a] font-black rounded-2xl shadow-lg border-b-8 border-slate-200 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-4 group"
                        >
                            <ChevronLeft size={32} className="group-hover:-translate-x-2 transition-transform" />
                            <span className="uppercase tracking-widest text-lg">Previous</span>
                        </button>
                        <button
                            onClick={() => { handleNext(); handleSelectStation(); }}
                            className="flex-[2] bg-[#ee6f1f] hover:brightness-110 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 border-b-8 border-[#c2520c] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-4 group"
                        >
                            <span className="uppercase tracking-widest text-2xl italic">Select {nextStation}</span>
                            <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Fullscreen TV Monitor Modal */}
                <AnimatePresence>
                    {showTVPreview && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden"
                        >
                            {/* The "Footage" Full-Bleed Photo */}
                            <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
                                <img
                                    src="https://res.klook.com/image/upload/fl_lossy.progressive,q_60/Mobile/City/dkjlntyqcbcqwqlbmaf8.jpg"
                                    alt="Station Footage"
                                    className="w-full h-full object-cover opacity-60"
                                />
                                {/* Overlay Gradients */}
                                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/90 via-black/40 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                {/* Scanning Line Effect */}
                                <motion.div
                                    animate={{ y: ["0%", "100%", "0%"] }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-white/5 h-px z-10 pointer-events-none"
                                />
                            </div>

                            {/* Top Layer: Station Info & Close */}
                            <div className="relative z-20 p-12 flex justify-between items-start">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                                        <span className="text-white text-xs font-black uppercase tracking-[0.4em]">Live System Feed</span>
                                    </div>
                                    <h2 className="text-white text-7xl font-black italic tracking-tighter uppercase drop-shadow-2xl">
                                        {currentStation}
                                    </h2>
                                    <div className="text-orange-500 text-sm font-bold uppercase tracking-[0.22em] mt-1 drop-shadow-lg">
                                        Node Monitoring Zone • Sector 04-A
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleToggleTV}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white p-6 rounded-full border border-white/20 shadow-2xl transition-all"
                                >
                                    <Video size={32} className="rotate-180" />
                                </motion.button>
                            </div>

                            {/* Bottom Layer: Cinematic Dashboard */}
                            <div className="mt-auto relative z-20 p-12 grid grid-cols-12 gap-8 items-end">
                                {/* Left: Speed & Elevation */}
                                <div className="col-span-5 flex gap-8">
                                    <div className="bg-black/60 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 flex-1 shadow-2xl group transition-all hover:bg-black/70">
                                        <div className="flex items-center gap-3 mb-4 opacity-60">
                                            <Gauge size={20} className="text-orange-500" />
                                            <span className="text-xs font-black text-white uppercase tracking-widest leading-none">Velocity</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-9xl font-black text-white font-mono tabular-nums tracking-tighter leading-none">{speed}</span>
                                            <span className="text-xl font-black text-white/30 uppercase tracking-widest italic">km/h</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/60 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 flex-1 shadow-2xl group transition-all hover:bg-black/70">
                                        <div className="flex items-center gap-3 mb-4 opacity-60">
                                            <Mountain size={20} className="text-blue-400" />
                                            <span className="text-xs font-black text-white uppercase tracking-widest leading-none">Elevation</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-9xl font-black text-white font-mono tabular-nums tracking-tighter leading-none">{altitude}</span>
                                            <span className="text-xl font-black text-white/30 uppercase tracking-widest italic">mdpl</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Small Telemetry (Temperature) */}
                                <div className="col-span-3 pb-4">
                                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex items-center justify-between mb-4 shadow-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-500/20 rounded-2xl">
                                                <Thermometer size={24} className="text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Cabin Temp</div>
                                                <div className="text-3xl font-black text-white font-mono leading-none">{temp.toFixed(1)}<span className="text-lg opacity-40">°C</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Time & Date (Large) */}
                                <div className="col-span-4 flex flex-col items-end">
                                    <div className="bg-white/10 backdrop-blur-xl px-12 py-8 rounded-[3rem] border border-white/20 shadow-2xl flex flex-col items-end group hover:bg-white/15 transition-all">
                                        <div className="text-7xl font-black text-white font-mono tracking-tighter leading-none mb-2 tabular-nums">
                                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-px w-12 bg-orange-500" />
                                            <span className="text-2xl font-black text-white/60 tracking-widest uppercase">
                                                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer News Bar */}
            <div className="h-10 bg-[#1d2d6a] flex items-center px-8 overflow-hidden">
                <div className="flex-1 whitespace-nowrap">
                    <motion.div
                        animate={{ x: [1000, -2000] }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        className="text-xs font-black uppercase tracking-widest text-white/80"
                    >
                        Selamat Datang di Kereta Api Turangga • Perjalanan Aman, Nyaman, dan Tepat Waktu adalah Prioritas Kami • Jaga Selalu Kebersihan Di Dalam Rangkaian Kereta
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default App;
