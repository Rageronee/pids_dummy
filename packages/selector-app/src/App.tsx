import { RefreshCcw, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function App() {
    const [station, setStation] = useState('GAMBIR');
    const [nextStation, setNextStation] = useState('BANDUNG');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const stations = ['GAMBIR', 'BEKASI', 'CIREBON', 'PURWOKERTO', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'];
    const [index, setIndex] = useState(0);

    const handleNext = () => {
        const nextIdx = (index + 1) % stations.length;
        setIndex(nextIdx);
        setStation(stations[index]);
        setNextStation(stations[nextIdx]);
    };

    const handlePrev = () => {
        const prevIdx = (index - 1 + stations.length) % stations.length;
        setIndex(prevIdx);
        setStation(stations[index]);
        setNextStation(stations[prevIdx]);
    };

    return (
        <div className="flex h-screen w-full flex-col bg-[#f0f2f5] text-slate-900 p-8 font-sans overflow-hidden select-none">
            {/* Controller Header */}
            <header className="flex items-center justify-between bg-white px-8 py-4 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] mb-6 border border-slate-200/50">
                <div className="flex items-center gap-6">
                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100/80">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI" className="h-5" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black tracking-[0.3em] text-[#1d2d6a]/40 uppercase leading-none block mb-1">Station Management Terminal</span>
                        <div className="text-xl font-black text-[#1d2d6a] tabular-nums tracking-tighter">
                            {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black border border-green-100 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Linked
                    </div>
                </div>
            </header>

            {/* Display "Screen" */}
            <div className="bg-[#1a2551] rounded-[2.5rem] p-16 shadow-[0_30px_70px_rgba(26,37,81,0.2)] relative overflow-hidden flex-[1.4] flex flex-col justify-center gap-10 border-[8px] border-slate-900">

                {/* Subtle pattern or glass reflection */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] pointer-events-none"></div>

                <div className="flex items-start gap-8 relative z-10">
                    <div className="w-1.5 h-24 bg-gradient-to-b from-[#ee6f1f] to-[#ea580c] rounded-full shadow-[0_0_15px_rgba(238,111,31,0.5)]"></div>

                    <motion.div
                        key={station}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2.5 text-[#ee6f1f] text-[10px] font-black uppercase tracking-[0.4em] opacity-80">
                            <MapPin size={14} strokeWidth={3} /> Active Station
                        </div>
                        <div className="text-5xl font-black tracking-tighter text-white uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] leading-none">{station}</div>
                    </motion.div>
                </div>

                <div className="h-px bg-white/10 w-48 relative z-10 ml-10 my-2"></div>

                <motion.div
                    key={nextStation}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col gap-2 relative z-10 ml-10"
                >
                    <div className="flex items-center gap-2.5 text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">
                        <RefreshCcw size={14} strokeWidth={3} /> Next Destination
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white/40 uppercase italic leading-none">{nextStation}</div>
                </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-8 mt-6 h-32">
                <button
                    onClick={handlePrev}
                    className="bg-white hover:bg-slate-50 border-b-4 border-slate-200 text-[#1d2d6a] rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all active:translate-y-1 active:border-b-0 shadow-xl shadow-slate-200/40 group"
                >
                    <div className="bg-slate-100 p-2.5 rounded-full group-hover:bg-slate-200 transition-all">
                        <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Previous</span>
                </button>
                <button
                    onClick={handleNext}
                    className="bg-gradient-to-br from-[#ee6f1f] to-[#ea580c] hover:brightness-110 border-b-4 border-orange-800 text-white rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all active:translate-y-1 active:border-b-0 shadow-xl shadow-orange-900/20 group"
                >
                    <div className="bg-white/20 p-2.5 rounded-full group-hover:scale-110 transition-all">
                        <ChevronRight size={28} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/90">Confirm Next</span>
                </button>
            </div>

            {/* Bottom Footer Info */}
            <footer className="mt-8 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-200/50 px-3 py-1.5 rounded-lg text-[#1d2d6a] font-black">
                        PIDS-SEL-01
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span>Nominal</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="opacity-50">Manual Mode</span>
                    <span className="bg-[#1d2d6a] text-white px-3 py-1 rounded-lg font-black text-[9px]">CONTROL UNIT</span>
                </div>
            </footer>
        </div>
    );
}

export default App;
