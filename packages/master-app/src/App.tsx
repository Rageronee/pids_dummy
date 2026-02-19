

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    LocateFixed,
    Video,
    Settings,
    ChevronLeft,
    ChevronRight,
    Wifi,
    Clock,
    Train,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TRAIN_NAMES = ['ARGO WILIS', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN'];
const TRAIN_NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

function App() {
    const [trainNameIndex, setTrainNameIndex] = useState(0);
    const [trainNumberIndex, setTrainNumberIndex] = useState(0);
    const [activeTrainName, setActiveTrainName] = useState('ARGO WILIS');
    const [activeTrainNumber, setActiveTrainNumber] = useState('01');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSetName = () => {
        setIsSaving(true);
        // Simulate API/IPC call
        setTimeout(() => {
            setActiveTrainName(TRAIN_NAMES[trainNameIndex]);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 800);
    };

    const handleSetNumber = () => {
        setIsSaving(true);
        setTimeout(() => {
            setActiveTrainNumber(TRAIN_NUMBERS[trainNumberIndex]);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 800);
    };

    const cycleValue = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, max: number, delta: number) => {
        setter((current + delta + max) % max);
    };

    return (
        <div className="flex h-screen w-full bg-[#f0f2f5] text-slate-900 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-[#1d2d6a] flex flex-col shadow-2xl z-20">
                <div className="p-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-3 rounded-2xl shadow-lg flex justify-center"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-10" />
                    </motion.div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'gps', icon: LocateFixed, label: 'GPS Status' },
                        { id: 'cctv', icon: Video, label: 'CCTV' },
                        { id: 'settings', icon: Settings, label: 'System Settings' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 ${activeTab === item.id
                                    ? 'bg-[#ee6f1f] text-white shadow-lg translate-x-1'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <item.icon size={22} />
                            <span className="font-semibold">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-6">
                    <div className="bg-blue-900/50 rounded-2xl p-4 border border-blue-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
                            <Wifi size={14} className="animate-pulse" /> System Online
                        </div>
                        <div className="text-white font-mono text-sm">V1.2.0-STABLE</div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Status Bar */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 20, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 font-bold"
                        >
                            <CheckCircle2 size={20} /> Data Sync Successful
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <Train className="text-[#1d2d6a]" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#1d2d6a] uppercase tracking-tight">KAI Master Controller</h1>
                            <p className="text-slate-400 text-xs font-bold tracking-widest">{activeTab.toUpperCase()} VIEW</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right border-r border-slate-200 pr-8">
                            <div className="text-lg font-black text-[#1d2d6a]">{activeTrainName}</div>
                            <div className="text-xs font-bold text-[#ee6f1f]">K1-90-{activeTrainNumber}</div>
                        </div>
                        <div className="flex items-center gap-3 text-[#1d2d6a]">
                            <Clock size={20} />
                            <span className="text-2xl font-black font-mono">
                                {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-10 bg-gradient-to-br from-slate-50 to-slate-200">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' ? (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-10"
                            >
                                {/* Control Cards */}
                                <div className="grid grid-cols-2 gap-10">
                                    {/* Selector: Train Name */}
                                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-white hover:shadow-2xl transition-shadow group">
                                        <div className="bg-[#1d2d6a] p-5 flex items-center justify-between">
                                            <button
                                                onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, TRAIN_NAMES.length, -1)}
                                                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                                            >
                                                <ChevronLeft size={28} />
                                            </button>
                                            <span className="text-white font-black tracking-[0.2em] text-sm uppercase">Select Train Name</span>
                                            <button
                                                onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, TRAIN_NAMES.length, 1)}
                                                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                                            >
                                                <ChevronRight size={28} />
                                            </button>
                                        </div>
                                        <div className="p-10 flex flex-col items-center gap-8 bg-gradient-to-b from-white to-slate-50">
                                            <motion.div
                                                key={trainNameIndex}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-5xl font-black text-[#1d2d6a] h-16 flex items-center justify-center text-center px-4"
                                            >
                                                {TRAIN_NAMES[trainNameIndex]}
                                            </motion.div>
                                            <button
                                                onClick={handleSetName}
                                                disabled={isSaving}
                                                className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3 ${isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-orange-200'
                                                    }`}
                                            >
                                                {isSaving ? <RefreshCcw className="animate-spin" size={24} /> : 'Apply Name Configuration'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Selector: Train Number */}
                                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-white hover:shadow-2xl transition-shadow group">
                                        <div className="bg-[#1d2d6a] p-5 flex items-center justify-between">
                                            <button
                                                onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, TRAIN_NUMBERS.length, -1)}
                                                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                                            >
                                                <ChevronLeft size={28} />
                                            </button>
                                            <span className="text-white font-black tracking-[0.2em] text-sm uppercase">Select Train Number</span>
                                            <button
                                                onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, TRAIN_NUMBERS.length, 1)}
                                                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                                            >
                                                <ChevronRight size={28} />
                                            </button>
                                        </div>
                                        <div className="p-10 flex flex-col items-center gap-8 bg-gradient-to-b from-white to-slate-50">
                                            <motion.div
                                                key={trainNumberIndex}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-7xl font-black text-[#ee6f1f] h-16 flex items-center justify-center font-mono"
                                            >
                                                {TRAIN_NUMBERS[trainNumberIndex]}
                                            </motion.div>
                                            <button
                                                onClick={handleSetNumber}
                                                disabled={isSaving}
                                                className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3 ${isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1d2d6a] text-white hover:bg-[#15204d] shadow-blue-200'
                                                    }`}
                                            >
                                                {isSaving ? <RefreshCcw className="animate-spin" size={24} /> : 'Apply Number Configuration'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* System Info Grid */}
                                <div className="grid grid-cols-3 gap-8">
                                    {[
                                        { label: 'Active IP Address', value: '192.168.100.101', icon: Wifi },
                                        { label: 'Network Relay', value: 'KAI-MODEM-01', icon: Terminal },
                                        { label: 'Uptime', value: '14:22:05', icon: Clock }
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white shadow-sm flex items-center gap-5">
                                            <div className="bg-blue-100 p-3 rounded-xl text-[#1d2d6a]">
                                                <stat.icon size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                                <div className="text-sm font-black text-[#1d2d6a]">{stat.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="under-construction"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-slate-400 gap-6"
                            >
                                <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 border border-white">
                                    <div className="bg-orange-100 p-6 rounded-full text-[#ee6f1f]">
                                        <AlertCircle size={64} className="animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-2xl font-black text-[#1d2d6a] mb-2 uppercase tracking-tight">{activeTab} View</h2>
                                        <p className="font-semibold text-slate-400">This module is currently being optimized.</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('dashboard')}
                                        className="mt-4 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-[#1d2d6a] font-black rounded-xl transition-all"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// Missing component from standard lubide-react for the mock
function RefreshCcw(props: any) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Video {...props} /></motion.div>;
}

function Terminal(props: any) {
    return <LocateFixed {...props} />;
}

export default App;
