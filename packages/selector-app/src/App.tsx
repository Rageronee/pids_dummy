import { Terminal, RefreshCcw, ChevronLeft, ChevronRight, MapPin, Wifi } from 'lucide-react';
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
        <div className="flex h-screen w-full flex-col bg-[#f0f2f5] text-slate-800 p-6 font-sans overflow-hidden">
            {/* Controller Header */}
            <header className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm mb-6 border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI" className="h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-black tracking-widest text-[#1d2d6a] uppercase opacity-40">Station Controller</span>
                        <div className="text-lg font-black text-[#1d2d6a] tabular-nums">
                            {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black border border-green-100 uppercase">
                        <Wifi size={12} className="animate-pulse" /> Linked
                    </div>
                </div>
            </header>

            {/* Display "Screen" */}
            <div className="bg-[#1d2d6a] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-center gap-10 border-8 border-slate-800">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#ee6f1f]"></div>

                <motion.div
                    key={station}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2"
                >
                    <div className="flex items-center gap-2 text-[#ee6f1f] text-xs font-black uppercase tracking-[0.3em] opacity-80">
                        <MapPin size={14} /> Active Station
                    </div>
                    <div className="text-6xl font-black tracking-tight text-white uppercase drop-shadow-lg">{station}</div>
                </motion.div>

                <div className="h-px bg-white/10 w-full"></div>

                <motion.div
                    key={nextStation}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2"
                >
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-[0.3em] opacity-80">
                        <RefreshCcw size={14} /> Next Arrival
                    </div>
                    <div className="text-6xl font-black tracking-tight text-white/50 uppercase italic">{nextStation}</div>
                </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-6 mt-6 h-32">
                <button
                    onClick={handlePrev}
                    className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-[#1d2d6a] rounded-3xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg group"
                >
                    <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Previous</span>
                </button>
                <button
                    onClick={handleNext}
                    className="bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-3xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-orange-200 group"
                >
                    <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-80">Next Station</span>
                </button>
            </div>

            {/* Bottom Footer Info */}
            <footer className="mt-8 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                <div className="flex items-center gap-2">
                    <Terminal size={12} /> Node: SEL-01
                </div>
                <span>CRC Check: Valid</span>
                <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-500">Manual Override</span>
            </footer>
        </div>
    );
}

export default App;
