import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Wifi, Navigation } from 'lucide-react';

const STATIONS = ['GAMBIR', 'BEKASI', 'CIREBON', 'PURWOKERTO', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'];

function App() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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
            <header className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-4">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-8 w-auto"
                    />
                    <div className="h-8 w-px bg-slate-200" />
                    <h1 className="text-lg font-bold text-[#1d2d6a] tracking-tight">PIDS Selector</h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                        <Wifi size={14} className="text-green-600" />
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Online</span>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-[#1d2d6a] tabular-nums leading-none">
                            {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                        </div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Centered Layout */}
            <main className="flex-1 flex flex-col justify-center items-center p-8 gap-8 relative">
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-50" />
                </div>

                {/* Active Station Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(29,45,106,0.1)] border border-slate-100 p-12 w-full max-w-4xl relative z-10 flex flex-col items-center text-center">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ee6f1f] to-[#1d2d6a] rounded-t-[2rem]" />

                    <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-[#1d2d6a] text-xs font-bold uppercase tracking-widest border border-blue-100">
                        <MapPin size={14} /> Active Station
                    </div>

                    <h2 className="text-6xl md:text-7xl font-black text-[#1d2d6a] tracking-tight uppercase mb-2">
                        {currentStation}
                    </h2>

                    <p className="text-slate-400 font-medium text-lg uppercase tracking-widest">
                        Station ID: {currentStation.substring(0, 3)} • DAOP 1
                    </p>

                    {/* Next Station Indicator inside card */}
                    <div className="mt-12 w-full bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-slate-500">
                            <Navigation size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Next Stop</span>
                        </div>
                        <span className="text-lg font-bold text-[#1d2d6a]">{nextStation}</span>
                    </div>
                </div>

                {/* Controls - Standard Bottom Bar Style */}
                <div className="flex items-center gap-6 w-full max-w-4xl">
                    <button
                        onClick={handlePrev}
                        className="flex-1 bg-white hover:bg-slate-50 text-[#1d2d6a] font-bold py-6 rounded-2xl shadow-lg border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 group"
                    >
                        <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        <span className="uppercase tracking-widest text-sm">Previous</span>
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex-[2] bg-[#ee6f1f] hover:brightness-110 text-white font-bold py-6 rounded-2xl shadow-lg shadow-orange-500/20 border-b-4 border-[#c2520c] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="uppercase tracking-widest text-lg">Select Next Station</span>
                        <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white/50 backdrop-blur-sm px-6 py-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200">
                <span>System Status: Nominal</span>
                <span>PIDS v2.4.1 (Light)</span>
            </footer>
        </div>
    );
}

export default App;
