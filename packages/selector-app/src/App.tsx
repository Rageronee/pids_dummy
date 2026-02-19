import { useState, useEffect } from 'react';
import { MapPin, Wifi, Activity, Mountain, Gauge, Navigation, Thermometer, Wind, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATIONS = ['GAMBIR', 'BEKASI', 'CIREBON', 'PURWOKERTO', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'];

function App() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Telemetry State
    const [speed, setSpeed] = useState(0);
    const [altitude, setAltitude] = useState(700);
    const [temp, setTemp] = useState(24);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // Simulate Telemetry
            setSpeed(prev => {
                const change = (Math.random() - 0.5) * 5;
                const newSpeed = Math.max(0, Math.min(120, prev + change));
                return Math.round(newSpeed);
            });

            setAltitude(prev => {
                const change = (Math.random() - 0.5) * 2;
                return Math.round(prev + change);
            });

            setTemp(prev => {
                const change = (Math.random() - 0.5) * 0.2;
                return Math.round((prev + change) * 10) / 10;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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
            </header>

            {/* Main Hybrid Content */}
            <main className="flex-1 flex p-8 gap-8 overflow-hidden">
                {/* Left Section: Selection Control (Interactive) */}
                <div className="flex-[2] flex flex-col gap-6">
                    <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ee6f1f] to-[#1d2d6a]" />

                        <div className="mb-8 flex items-center gap-3 px-5 py-2 rounded-full bg-blue-50 text-[#1d2d6a] w-fit border border-blue-100">
                            <Navigation size={18} className="text-[#ee6f1f]" />
                            <span className="text-xs font-black uppercase tracking-widest">Active Station Context</span>
                        </div>

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
                            onClick={handleNext}
                            className="flex-[2] bg-[#ee6f1f] hover:brightness-110 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 border-b-8 border-[#c2520c] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-4 group"
                        >
                            <span className="uppercase tracking-widest text-2xl italic">Select {nextStation}</span>
                            <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Right Section: TV Monitor View (Passive) */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* TV Frame */}
                    <div className="flex-[1.5] bg-[#1d2d6a] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col border-[12px] border-slate-800">
                        {/* Mock Train Image (Using generate_image placeholder concept) */}
                        <div className="absolute inset-0 opacity-40">
                            <img
                                src="https://images.unsplash.com/photo-1474487022159-5a4ce599d030?q=80&w=1000&auto=format&fit=crop"
                                alt="Train"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1d2d6a] via-transparent to-transparent" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-auto">
                                <div className="bg-orange-500 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    Live Monitor
                                </div>
                                <Wifi size={20} className="text-blue-400" />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">Informasi Perjalanan</div>
                                    <div className="text-4xl font-black uppercase tracking-tight leading-none italic">EKSEKUTIF • TURANGGA</div>
                                </div>
                                <div className="h-1 lg:h-2 bg-white/10 rounded-full relative overflow-hidden">
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-[#ee6f1f]"
                                        initial={{ width: "20%" }}
                                        animate={{ width: "75%" }}
                                        transition={{ duration: 3 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="flex-1 grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                            <Gauge size={24} className="text-[#ee6f1f] mb-3" />
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kecepatan</div>
                            <div className="text-4xl font-black text-[#1d2d6a] font-mono tabular-nums">{speed}</div>
                            <div className="text-[10px] font-bold text-slate-300">KM/JAM</div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                            <Mountain size={24} className="text-blue-500 mb-3" />
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ketinggian</div>
                            <div className="text-4xl font-black text-[#1d2d6a] font-mono tabular-nums">{altitude}</div>
                            <div className="text-[10px] font-bold text-slate-300">MDPL</div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                            <Thermometer size={24} className="text-orange-400 mb-3" />
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temperature</div>
                            <div className="text-3xl font-black text-[#1d2d6a] font-mono tabular-nums">{temp.toFixed(1)}°</div>
                            <div className="text-[10px] font-bold text-slate-300">CELSIUS</div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                            <Wind size={24} className="text-green-500 mb-3" />
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Air Quality</div>
                            <div className="text-2xl font-black text-green-600">GOOD</div>
                            <div className="text-[10px] font-bold text-slate-300">NOMINAL</div>
                        </div>
                    </div>
                </div>
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
