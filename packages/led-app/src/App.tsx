import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

function App() {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    // Create a stable 16x64 grid
    const rows = 16;
    const cols = 64;
    const totalDots = rows * cols;

    // Simulate active dots
    const activeDots = useMemo(() => {
        const dots = new Array(totalDots).fill(false);
        for (let i = 0; i < totalDots; i++) {
            if (Math.random() > 0.99) dots[i] = true;
        }
        return dots;
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#050505] p-10 font-mono overflow-hidden">
            <div className="flex flex-col items-center gap-12 w-full max-w-7xl">

                <div className="flex items-center justify-between w-full border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI" className="h-4" />
                        </div>
                        <div className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-black">Indoor LED Display Unit 01</div>
                    </div>
                    <div className="text-red-600/50 tabular-nums font-black text-xs px-3 py-1 rounded bg-red-950/20 border border-red-900/20">{currentTime}</div>
                </div>

                <div className="relative p-8 bg-[#111] rounded-3xl border-8 border-[#222] shadow-[0_0_100px_rgba(220,38,38,0.15)] flex flex-col items-center gap-10">
                    {/* The Dot Matrix Glass Overlay */}
                    <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-white/5 to-transparent rounded-[1.5rem]"></div>

                    <div className="grid grid-cols-[repeat(64,minmax(0,1fr))] gap-[2px] p-2 bg-black rounded-lg border-4 border-black box-content">
                        {activeDots.map((isActive, i) => (
                            <motion.div
                                key={i}
                                initial={isActive ? { opacity: 0.5 } : {}}
                                animate={isActive ? { opacity: [0.8, 1, 0.8] } : {}}
                                transition={isActive ? { repeat: Infinity, duration: 2, delay: Math.random() * 2 } : {}}
                                className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-600 shadow-[0_0_10px_#dc2626]' : 'bg-[#111]'}`}
                            ></motion.div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-red-600 text-6xl font-black tracking-[0.2em] uppercase text-center drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                        >
                            ARGO WILIS
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ delay: 0.5 }}
                            className="text-red-500 text-xl font-bold tracking-widest uppercase"
                        >
                            Bandung — Surabaya Gubeng
                        </motion.div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Hardware Hub Active
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
