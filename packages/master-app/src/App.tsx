
import React, { useState, useEffect } from 'react';
import { usePidsData } from './hooks/usePidsData';
import { LayoutDashboard, Megaphone, Radio, Train, Clock, Activity, Settings, AlertCircle, Play, Pause, CheckCircle2, ChevronLeft, ChevronRight, Wifi, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNextDepartures, stations } from './data/mockDb';

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

    // Use the hook for broadcating
    const { data, sendData } = usePidsData();

    // Simulation State
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState('BD'); // Default: Bandung

    // Clock Tick
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Simulation Tick
    useEffect(() => {
        if (!isSimulationMode) return;

        const interval = setInterval(() => {
            const nextTrains = getNextDepartures(selectedStationId);

            if (nextTrains.length > 0) {
                const nextTrain = nextTrains[0];

                // Only update if changed to avoid spamming writes
                if (data.trainNumber !== nextTrain.trainNumber || data.status !== 'ON SCHEDULE') {
                    sendData({
                        stationName: nextTrain.trainName,
                        trainNumber: nextTrain.trainNumber,
                        nextStation: nextTrain.destination,
                        status: 'ON SCHEDULE',
                        // checking next train buffer
                    });
                }
            } else {
                if (data.status !== 'NO SERVICE') {
                    sendData({
                        stationName: '---',
                        trainNumber: '---',
                        nextStation: '---',
                        status: 'NO SERVICE'
                    });
                }
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [isSimulationMode, selectedStationId, data, sendData]);

    const handleSetName = () => {
        setIsSaving(true);
        setTimeout(() => {
            const newName = TRAIN_NAMES[trainNameIndex];
            setActiveTrainName(newName);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Broadcast change
            sendData({ stationName: newName });
        }, 800);
    };

    const handleSetNumber = () => {
        setIsSaving(true);
        setTimeout(() => {
            const newNumber = TRAIN_NUMBERS[trainNumberIndex];
            setActiveTrainNumber(newNumber);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Broadcast change
            sendData({ trainNumber: newNumber });
        }, 800);
    };

    const cycleValue = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, max: number, delta: number) => {
        setter((current + delta + max) % max);
    };

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-[#1d2d6a] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-20">
                <div className="p-8">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl shadow-sm flex justify-center border border-white/10"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-8" />
                    </motion.div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5">
                    <ul className="space-y-2">
                        {[
                            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                            { id: 'announcements', icon: Megaphone, label: 'Announcements' },
                            { id: 'schedule', icon: Clock, label: 'Train Schedule' },
                            { id: 'media', icon: Radio, label: 'Media & Ads' },
                            { id: 'settings', icon: Settings, label: 'Settings' }
                        ].map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold ${activeTab === item.id
                                        ? 'bg-white text-[#1d2d6a] shadow-lg shadow-blue-900/20 scale-105'
                                        : 'text-blue-100 hover:bg-white/10 hover:translate-x-1'
                                        }`}
                                >
                                    <item.icon size={22} strokeWidth={2.5} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-6">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                            <Wifi size={12} className="animate-pulse" /> System Online
                        </div>
                        <div className="text-white/40 font-mono text-[11px] font-medium uppercase tracking-tight">KAI-MASTER-V1.2.0</div>
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
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border border-green-400/50"
                        >
                            <CheckCircle2 size={18} />
                            <span className="font-bold text-sm">Action Successfully Synced</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <Train className="text-[#1d2d6a]" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-[#1d2d6a] uppercase tracking-tight leading-none mb-1">Master Controller</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active session</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right border-r border-slate-100 pr-8">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Unit</div>
                            <div className="text-base font-black text-[#1d2d6a] tracking-tight">{activeTrainName} <span className="text-[#ee6f1f] ml-1">K1-90-{activeTrainNumber}</span></div>
                        </div>
                        <div className="flex items-center gap-3 text-[#1d2d6a]">
                            <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                                <Clock size={18} />
                            </div>
                            <span className="text-2xl font-black font-mono tracking-tighter opacity-90">
                                {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-10 bg-[#f8fafc]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' ? (
                            <motion.div
                                key="dashboard"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-6xl mx-auto space-y-10"
                            >
                                {/* Control Cards */}
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Selector: Train Name */}
                                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
                                        <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                                            <button
                                                onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, TRAIN_NAMES.length, -1)}
                                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all active:scale-90"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <span className="text-[#1d2d6a]/40 font-black tracking-[0.2em] text-[10px] uppercase">Service Name Configuration</span>
                                            <button
                                                onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, TRAIN_NAMES.length, 1)}
                                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all active:scale-90"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>
                                        <div className="p-10 flex flex-col items-center gap-8">
                                            <motion.div
                                                key={trainNameIndex}
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-4xl font-black text-[#1d2d6a] h-16 flex items-center justify-center text-center tracking-tight"
                                            >
                                                {TRAIN_NAMES[trainNameIndex]}
                                            </motion.div>
                                            <button
                                                onClick={handleSetName}
                                                disabled={isSaving}
                                                className={`w-full py-4 rounded-2xl font-black text-sm shadow-md uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3 ${isSaving ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-orange-900/10'
                                                    }`}
                                            >
                                                {isSaving ? <RefreshCcw size={20} /> : 'Sync Train Name'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Selector: Train Number */}
                                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
                                        <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                                            <button
                                                onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, TRAIN_NUMBERS.length, -1)}
                                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all active:scale-90"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <span className="text-[#1d2d6a]/40 font-black tracking-[0.2em] text-[10px] uppercase">Unit Number Configuration</span>
                                            <button
                                                onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, TRAIN_NUMBERS.length, 1)}
                                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all active:scale-90"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>
                                        <div className="p-10 flex flex-col items-center gap-8">
                                            <motion.div
                                                key={trainNumberIndex}
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-6xl font-black text-[#ee6f1f] h-16 flex items-center justify-center font-mono tracking-tighter"
                                            >
                                                {TRAIN_NUMBERS[trainNumberIndex]}
                                            </motion.div>
                                            <button
                                                onClick={handleSetNumber}
                                                disabled={isSaving}
                                                className={`w-full py-4 rounded-2xl font-black text-sm shadow-md uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3 ${isSaving ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1d2d6a] text-white hover:bg-[#15204d] shadow-blue-900/10'
                                                    }`}
                                            >
                                                {isSaving ? <RefreshCcw size={20} /> : 'Sync Unit Number'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Simulation Control Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Activity size={120} className="text-blue-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">PIDS Simulation</h3>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${isSimulationMode ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    {isSimulationMode ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                                                </div>
                                                <div>
                                                    <p className={`text-2xl font-black ${isSimulationMode ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {isSimulationMode ? 'RUNNING' : 'PAUSED'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-3 relative z-10">
                                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                                                <span className="text-xs font-bold text-slate-400 ml-2">STATION</span>
                                                <select
                                                    value={selectedStationId}
                                                    onChange={(e) => setSelectedStationId(e.target.value)}
                                                    className="bg-white border-none text-sm font-bold text-[#1d2d6a] py-1 px-3 rounded-lg focus:ring-0 cursor-pointer shadow-sm"
                                                >
                                                    {stations.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => setIsSimulationMode(!isSimulationMode)}
                                                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${isSimulationMode
                                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                    : 'bg-[#1d2d6a] text-white hover:bg-blue-900'
                                                    }`}
                                            >
                                                {isSimulationMode ? 'STOP SIMULATION' : 'START SIMULATION'}
                                            </button>
                                        </div>
                                    </motion.div>

                                    {/* Manual Control Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className={`bg-gradient-to-br from-[#ee6f1f] to-[#d85c10] p-6 rounded-3xl shadow-lg shadow-orange-200 text-white relative overflow-hidden ${isSimulationMode ? 'opacity-50 pointer-events-none grayscale' : ''}`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-20">
                                            <Megaphone size={120} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-orange-100 uppercase tracking-wider mb-1">Manual Override</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                                    <Settings size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-3xl font-black tracking-tight">CONTROL</p>
                                                    <p className="text-sm font-medium text-orange-100">Set Display Manually</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('announcements')}
                                            className="mt-6 w-full py-3 bg-white text-[#ee6f1f] rounded-xl text-sm font-bold shadow-lg hover:bg-orange-50 transition-colors"
                                        >
                                            Configure Display
                                        </button>
                                    </motion.div>

                                    {/* Status Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Activity size={120} className="text-blue-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">System Status</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 p-2 rounded-xl text-green-600">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-3xl font-black text-[#1d2d6a] tracking-tight">ONLINE</p>
                                                    <p className="text-sm font-medium text-slate-400">All Systems Normal</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                                                <p className="text-xs text-slate-400 font-bold mb-1">LED P10</p>
                                                <div className="flex justify-center items-center gap-1 text-green-500">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-xs font-black">ACTIVE</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                                                <p className="text-xs text-slate-400 font-bold mb-1">DATA SYNC</p>
                                                <div className="flex justify-center items-center gap-1 text-blue-500">
                                                    <Activity size={10} className="animate-spin" />
                                                    <span className="text-xs font-black">SYNCING</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        ) : activeTab === 'settings' ? (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-w-4xl mx-auto space-y-8"
                            >
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                    <h2 className="text-xl font-black text-[#1d2d6a] mb-8 uppercase tracking-tight flex items-center gap-3">
                                        <Settings className="text-[#ee6f1f]" />
                                        Display Configuration
                                    </h2>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">LED Scroll Speed</label>
                                                <span className="text-2xl font-black text-[#1d2d6a] bg-slate-100 px-4 py-1 rounded-lg tabular-nums">
                                                    {data?.ledSpeed || 60} <span className="text-xs text-slate-400 font-medium">ms</span>
                                                </span>
                                            </div>
                                            <div className="relative pt-1">
                                                <input
                                                    type="range"
                                                    min="10"
                                                    max="200"
                                                    step="5"
                                                    value={data?.ledSpeed || 60}
                                                    onChange={(e) => sendData({ ledSpeed: Number(e.target.value) })}
                                                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ee6f1f]"
                                                />
                                                <div className="flex justify-between text-xs font-bold text-slate-300 mt-2 uppercase tracking-wider">
                                                    <span>Fast (10ms)</span>
                                                    <span>Slow (200ms)</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                                                Adjusts the update interval for the running text on the LED display.
                                                Lower values mean faster scrolling speed. Changes are applied immediately.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="under-construction"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-slate-400 gap-6"
                            >
                                <div className="bg-white p-12 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 border border-slate-100 max-w-md w-full">
                                    <div className="bg-orange-50 p-6 rounded-3xl text-[#ee6f1f]">
                                        <AlertCircle size={48} />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-black text-[#1d2d6a] mb-2 uppercase tracking-tight">Access Restricted</h2>
                                        <p className="text-sm font-medium text-slate-400 leading-relaxed">This module (<span className="text-[#1d2d6a]">{activeTab}</span>) is currently under maintenance or being optimized for your experience.</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('dashboard')}
                                        className="w-full mt-4 px-8 py-4 bg-slate-900 hover:bg-black text-white text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div >
            </main >
        </div >
    );
}



export default App;
