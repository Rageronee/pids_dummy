import { useState, useEffect } from 'react';
import { MapPin, Activity, Mountain, Gauge, Compass, Thermometer, ChevronLeft, ChevronRight, Video, Clock, RefreshCcw, Train, Wifi, CheckCircle2, X, Zap, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { P10Matrix } from './components/P10Matrix';
import { LoginScreen } from './components/LoginScreen';
import type { AuthUser } from '@eltran/pids-core';


function App() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState<string>('');

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Telemetry State
    const [speed, setSpeed] = useState(0);
    const [altitude, setAltitude] = useState(700);
    const [temp, setTemp] = useState(24);
    const [showTVPreview, setShowTVPreview] = useState(false);
    const [showLedSettings, setShowLedSettings] = useState(false);

    const [isPinging, setIsPinging] = useState(false);
    const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Synced State from Master
    const [stations, setStations] = useState(['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI']);
    const [masterSyncedName, setMasterSyncedName] = useState('ARGO BROMO ANGGREK');
    const [masterSyncedNumber, setMasterSyncedNumber] = useState('KA 1');
    const [masterSyncedLedSpeed, setMasterSyncedLedSpeed] = useState(60);

    // Identity Control State (Local to Selector for choosing)
    const [trainNames, setTrainNames] = useState<string[]>(['ARGO WILIS', 'ARGO BROMO ANGGREK', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN']);
    const [trainNumbers, setTrainNumbers] = useState<string[]>(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
    const [routes, setRoutes] = useState<any>({
        'ARGO WILIS': { name: 'ARGO WILIS', stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'] },
        'ARGO BROMO ANGGREK': { name: 'ARGO BROMO ANGGREK', stations: ['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI'] }
    });
    const [trainNameIndex, setTrainNameIndex] = useState(0);
    const [trainNumberIndex, setTrainNumberIndex] = useState(4); // Default to KA-05

    useEffect(() => {
        const fetchDb = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/db');
                if (res.ok) {
                    const dbData = await res.json();
                    if (dbData.success && dbData.data && dbData.data.trainNames) {
                        setTrainNames(dbData.data.trainNames);
                        setTrainNumbers(dbData.data.trainNumbers || []);
                        setRoutes(dbData.data.routes || {});
                    }
                }
            } catch (e) {
                console.error('Failed to fetch DB from master API:', e);
            }
        };
        fetchDb();
    }, []);

    // Shared State Sync
    const API_URL = 'http://localhost:3001/api/state';

    // Auth handlers
    const handleLogin = (user: AuthUser, token: string) => {
        setAuthUser(user);
        setAuthToken(token);
    };

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:3001/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
        } catch { }
        sessionStorage.removeItem('pids_token');
        sessionStorage.removeItem('pids_user');
        setAuthUser(null);
        setAuthToken('');
    };

    // Check persisted session
    useEffect(() => {
        const token = sessionStorage.getItem('pids_token');
        const userStr = sessionStorage.getItem('pids_user');
        if (token && userStr) {
            fetch('http://localhost:3001/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if (d.success) { setAuthToken(token); setAuthUser(JSON.parse(userStr)); }
                    else { sessionStorage.removeItem('pids_token'); sessionStorage.removeItem('pids_user'); }
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr)); });
        }
    }, []);

    const sendData = async (newData: any) => {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                body: JSON.stringify(newData)
            });
        } catch (e) {
            console.error('Error posting PIDS state:', e);
        }
    };

    // Continuous Polling for State Sync
    useEffect(() => {
        const checkSync = async () => {
            try {
                const res = await fetch(API_URL);
                if (res.ok) {
                    const parsed = await res.json();
                    if (parsed.stationName) setMasterSyncedName(parsed.stationName);
                    if (parsed.trainNumber) setMasterSyncedNumber(parsed.trainNumber);
                    if (parsed.ledSpeed !== undefined) setMasterSyncedLedSpeed(parsed.ledSpeed);

                    // Only update stations if they changed and aren't empty
                    if (parsed.stations && Array.isArray(parsed.stations) && parsed.stations.length > 0) {
                        if (JSON.stringify(parsed.stations) !== JSON.stringify(stations)) {
                            setStations(parsed.stations);
                        }
                    }

                    // Sync TV Preview state if master requests it
                    if (parsed.displayMode === 'tv' && !showTVPreview) setShowTVPreview(true);
                    if (parsed.displayMode === 'pids' && showTVPreview) setShowTVPreview(false);
                }
            } catch (e) { }
        };

        const interval = setInterval(checkSync, 1000);
        return () => clearInterval(interval);
    }, [showTVPreview, stations]);

    // Auto-sync selector indices with master state
    useEffect(() => {
        const nameIdx = trainNames.indexOf(masterSyncedName);
        if (nameIdx !== -1) setTrainNameIndex(nameIdx);

        const numIdx = trainNumbers.indexOf(masterSyncedNumber);
        if (numIdx !== -1) setTrainNumberIndex(numIdx);
    }, [masterSyncedName, masterSyncedNumber, trainNames, trainNumbers]);

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
            stationName: stations[currentIndex],
            nextStation: stations[(currentIndex + 1) % stations.length],
            isSyncing: true
        });
    };

    const handleToggleTV = () => {
        const newState = !showTVPreview;
        setShowTVPreview(newState);
        sendData({ displayMode: newState ? 'tv' : 'pids' });
    };

    // Prevent index out of bounds when stations change
    useEffect(() => {
        if (currentIndex >= stations.length) {
            setCurrentIndex(0);
        }
    }, [stations]);

    const handleSetName = () => {
        const newName = trainNames[trainNameIndex];
        const routeData = routes[newName];
        sendData({
            stationName: newName,
            stations: routeData?.stations || [],
            activeRoute: routeData
        });
    };

    const handleSetNumber = () => {
        const newNumber = trainNumbers[trainNumberIndex];
        sendData({ trainNumber: newNumber });
    };

    const handleSetLedSpeed = (speedValue: number) => {
        setMasterSyncedLedSpeed(speedValue);
        sendData({ ledSpeed: speedValue });
    };

    const cycleValue = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, max: number, delta: number) => {
        if (max === 0) return;
        setter((current + delta + max) % max);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + stations.length) % stations.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % stations.length);
    };

    const handlePing = () => {
        setIsPinging(true);
        setPingStatus('idle');

        // Simulate a network ping to the controller
        setTimeout(() => {
            setIsPinging(false);
            setPingStatus('success');
            setTimeout(() => setPingStatus('idle'), 3000);
        }, 1200);
    };

    const currentStation = stations[currentIndex] || 'INITIALIZING SYNC...';
    const nextStation = stations[(currentIndex + 1) % stations.length] || '---';

    if (!authUser) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none">
            {/* ... Header ... */}
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

                <div className="flex items-center gap-8">
                    <button
                        onClick={handlePing}
                        disabled={isPinging}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPinging ? 'bg-slate-100 text-slate-400' :
                            pingStatus === 'success' ? 'bg-green-100 text-green-600 border border-green-200' :
                                'bg-slate-50 text-[#1d2d6a] hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        {isPinging ? (
                            <RefreshCcw size={14} className="animate-spin" />
                        ) : pingStatus === 'success' ? (
                            <CheckCircle2 size={14} />
                        ) : (
                            <Wifi size={14} />
                        )}
                        {isPinging ? 'Pinging Controller...' : pingStatus === 'success' ? 'Connection OK' : 'Ping Controller'}
                    </button>

                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Clock size={16} className="text-blue-500" />
                        <span className="font-mono font-black text-[#1d2d6a] tracking-tight">
                            {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
                        <LogOut size={14} />Logout
                    </button>
                    <button
                        onClick={handleToggleTV}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${showTVPreview
                            ? 'bg-[#ee6f1f] text-white shadow-lg shadow-orange-900/20'
                            : 'bg-[#1d2d6a] text-white hover:bg-blue-900 shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        <Video size={16} />
                        {showTVPreview ? 'Close Preview' : 'Monitor TV'}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-8 overflow-hidden relative">
                {/* Selection Control Container */}
                <div className="h-full flex flex-col gap-6">
                    {/* Top Status Bar */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                            <div className="bg-blue-50 p-4 rounded-2xl">
                                <Train size={24} className="text-[#1d2d6a]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Active Train</p>
                                <p className="text-xl font-black text-[#1d2d6a] tracking-tighter italic">{masterSyncedName}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                            <div className="bg-orange-50 p-4 rounded-2xl">
                                <Activity size={24} className="text-[#ee6f1f]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Unit Number</p>
                                <p className="text-xl font-black text-[#1d2d6a] tracking-tighter">KA-{masterSyncedNumber}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                            <div className="bg-green-50 p-4 rounded-2xl">
                                <Compass size={24} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Destination</p>
                                <p className="text-xl font-black text-[#1d2d6a] tracking-tighter italic">{stations[stations.length - 1]}</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Interface */}
                    <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
                        {/* Identity & Stations Panel */}
                        <div className="col-span-2 flex flex-col gap-6">

                            {/* Control Cards (Name & Number) */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Selector: Train Name */}
                                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100 group">
                                    <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                                        <button
                                            onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, trainNames.length, -1)}
                                            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="text-[#1d2d6a]/40 font-black tracking-[0.2em] text-[10px] uppercase">Service Configuration</span>
                                        <button
                                            onClick={() => cycleValue(setTrainNameIndex, trainNameIndex, trainNames.length, 1)}
                                            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                    <div className="p-4 flex items-center justify-between gap-4">
                                        <div className="text-xl font-black text-[#1d2d6a] tracking-tight truncate flex-1 text-center">
                                            {trainNames[trainNameIndex]}
                                        </div>
                                        <button
                                            onClick={handleSetName}
                                            className="px-4 py-2 rounded-xl text-xs font-black shadow-md uppercase tracking-wide transition-all active:scale-95 bg-[#ee6f1f] text-white hover:bg-[#d45d15]"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>

                                {/* Selector: Train Number */}
                                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100 group">
                                    <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                                        <button
                                            onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, trainNumbers.length, -1)}
                                            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="text-[#1d2d6a]/40 font-black tracking-[0.2em] text-[10px] uppercase">Unit Configuration</span>
                                        <button
                                            onClick={() => cycleValue(setTrainNumberIndex, trainNumberIndex, trainNumbers.length, 1)}
                                            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-[#1d2d6a] transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                    <div className="p-4 flex items-center justify-between gap-4">
                                        <div className="text-2xl font-black text-[#ee6f1f] font-mono tracking-tighter truncate flex-1 text-center">
                                            {trainNumbers[trainNumberIndex]}
                                        </div>
                                        <button
                                            onClick={handleSetNumber}
                                            className="px-4 py-2 rounded-xl text-xs font-black shadow-md uppercase tracking-wide transition-all active:scale-95 bg-[#1d2d6a] text-white hover:bg-[#15204d]"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Station Selector Card */}
                            <div className="flex-1 bg-[#1d2d6a] rounded-[2.5rem] shadow-2xl relative overflow-hidden group flex flex-col min-h-0">
                                {/* Decorative Elements */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,transparent_50%)]" />
                                <div className="absolute top-0 right-0 p-8">
                                    <MapPin size={120} className="text-white opacity-5 -rotate-12 translate-x-12 -translate-y-8" />
                                </div>

                                <div className="relative flex-1 flex flex-col p-12">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-blue-300/60 font-black tracking-[0.4em] text-xs uppercase mb-2">Station Selector</p>
                                            <h2 className="text-4xl font-black text-white italic tracking-tighter">Current <span className="text-[#ee6f1f]">Position</span></h2>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">
                                                {currentIndex + 1} OF {stations.length} STATIONS
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentIndex}
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -20, opacity: 0 }}
                                                className="text-center"
                                            >
                                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.6em] mb-4">Departing From</div>
                                                <h3 className="text-8xl font-black text-white tracking-tighter italic uppercase drop-shadow-2xl">
                                                    {currentStation}
                                                </h3>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between gap-6">
                                        <button
                                            onClick={handlePrev}
                                            className="h-20 w-24 rounded-3xl bg-[#ee6f1f] hover:bg-[#d45d15] text-white shadow-xl flex items-center justify-center transition-all active:scale-95 border-b-4 border-[#c2410c]"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>

                                        <button
                                            onClick={handleSelectStation}
                                            className="flex-1 h-20 bg-white text-[#1d2d6a] rounded-3xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-4 border-b-4 border-slate-200"
                                        >
                                            <RefreshCcw size={24} />
                                            Sync Display Status
                                        </button>

                                        <button
                                            onClick={handleNext}
                                            className="h-20 w-24 rounded-3xl bg-[#ee6f1f] hover:bg-[#d45d15] text-white shadow-xl flex items-center justify-center transition-all active:scale-95 border-b-4 border-[#c2410c]"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Side Telemetry Panel */}
                        <div className="space-y-6 flex flex-col">
                            {/* LED Speed Configuration */}
                            <button
                                onClick={() => setShowLedSettings(true)}
                                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-orange-200 transition-all text-left"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap size={64} className="text-[#ee6f1f]" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">LED Configuration</p>
                                    <h4 className="text-xl font-black text-[#1d2d6a] tracking-tight mb-2">Display Settings</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tap to configure speed & preview</p>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[#ee6f1f] uppercase tracking-widest">Velocity</span>
                                            <span className="text-2xl font-black text-[#1d2d6a] font-mono">{masterSyncedLedSpeed}<span className="text-xs ml-1 opacity-40">MS</span></span>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-2xl text-[#ee6f1f] group-hover:scale-110 transition-transform">
                                            <Settings size={20} />
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Next Station Info */}
                            <div className="bg-[#1d2d6a] p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden h-full">
                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,#ffffff_0%,transparent_60%)]" />
                                <div className="bg-white/10 p-6 rounded-full mb-6 relative z-10">
                                    <MapPin size={48} className="text-white" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Upcoming Stop</p>
                                    <h4 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-6 drop-shadow-sm">
                                        {nextStation}
                                    </h4>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-blue-200 font-bold text-sm border border-white/5">
                                        <Clock size={16} />
                                        <span>Estimated: 12 mins</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LED Configuration Modal */}
                <AnimatePresence>
                    {showLedSettings && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden"
                            >
                                <div className="bg-[#1d2d6a] p-8 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/10 p-3 rounded-2xl">
                                            <Zap className="text-[#ee6f1f]" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black italic tracking-tighter">LED <span className="text-[#ee6f1f]">Configuration</span></h2>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visualizer & Velocity Control</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowLedSettings(false)}
                                        className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-12 space-y-12">
                                    {/* Preview Section */}
                                    <div className="space-y-4 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Live Matrix Preview</p>
                                        <div className="flex justify-center scale-110 py-6">
                                            <P10Matrix
                                                text={`${masterSyncedName} KA-${masterSyncedNumber}   •   NEXT: ${nextStation}   •   ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                color="#ff0000"
                                                speed={masterSyncedLedSpeed}
                                                columns={128}
                                            />
                                        </div>
                                    </div>

                                    {/* Speed Control */}
                                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col gap-8">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="text-lg font-black text-[#1d2d6a] tracking-tight">Scrolling Velocity</h4>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adjustment for P10 Outdoor Modules</p>
                                            </div>
                                            <div className="text-3xl font-black text-[#ee6f1f] bg-white px-6 py-2 rounded-2xl shadow-sm border border-slate-100 font-mono">
                                                {masterSyncedLedSpeed}<span className="text-xs ml-1 opacity-40">MS</span>
                                            </div>
                                        </div>

                                        <div className="relative pt-2">
                                            <input
                                                type="range"
                                                min="10"
                                                max="200"
                                                step="5"
                                                value={masterSyncedLedSpeed}
                                                onChange={(e) => handleSetLedSpeed(parseInt(e.target.value))}
                                                className="w-full h-4 bg-slate-200 rounded-xl appearance-none cursor-pointer accent-[#ee6f1f]"
                                            />
                                            <div className="flex justify-between text-[10px] font-black text-slate-300 mt-4 uppercase tracking-[0.2em]">
                                                <span>Hyper Fast (10ms)</span>
                                                <span>Standard (60ms)</span>
                                                <span>Slow (200ms)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-slate-400 text-[10px] leading-relaxed">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500">
                                            <Clock size={14} />
                                        </div>
                                        <p className="font-bold uppercase tracking-wide">Changes are broadcasted in real-time to all connected LED units and passenger displays.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fullscreen TV Monitor Modal */}
                <AnimatePresence>
                    {showTVPreview && (
                        <motion.div
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden"
                        >
                            {/* Cinematic Overlay Textures */}
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
                                <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                                <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
                            </div>

                            {/* Background Video/Image Content */}
                            <motion.div
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=2000')" }}
                            />

                            {/* UI Content Layer */}
                            <div className="relative z-20 p-12 flex justify-between items-start">
                                {/* Top Left: Time & Date (New Placement) */}
                                <div className="flex flex-col font-mono text-white drop-shadow-2xl">
                                    <div className="text-7xl font-black tracking-tighter leading-none mb-2">
                                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')}
                                    </div>
                                    <div className="text-xl font-bold text-white/60 tracking-[0.3em] uppercase ml-1">
                                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>

                                <button
                                    onClick={handleToggleTV}
                                    className="px-8 py-4 bg-white/10 backdrop-blur-3xl hover:bg-white/20 border border-white/20 rounded-[2rem] text-white flex items-center gap-3 transition-all active:scale-95 group shadow-2xl"
                                >
                                    <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                                    <span className="font-black text-sm uppercase tracking-widest">Close Monitor</span>
                                </button>
                            </div>

                            {/* Center Visuals: Huge Station Name */}
                            <div className="flex-1 flex flex-col justify-center items-center px-24 relative z-20">
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-center"
                                >
                                    <div className="flex items-center justify-center gap-4 mb-6">
                                        <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/40" />
                                        <span className="text-xl font-black text-white/40 uppercase tracking-[1em] ml-4 leading-none">Berhenti Di</span>
                                        <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/40" />
                                    </div>
                                    <h3 className="text-[14vw] font-black text-white italic tracking-tighter leading-none uppercase drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                        {currentStation}
                                    </h3>
                                    <div className="mt-8 flex items-center justify-center gap-8">
                                        <div className="bg-white/10 backdrop-blur-xl px-10 py-4 rounded-full border border-white/20 flex flex-col items-center">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-2 text-center w-full">Service</span>
                                            <span className="text-2xl font-black text-white italic tracking-tighter uppercase">{masterSyncedName}</span>
                                        </div>
                                        <div className="bg-[#ee6f1f] px-10 py-4 rounded-full shadow-2xl flex flex-col items-center">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-2 text-center w-full">Train No</span>
                                            <span className="text-2xl font-black text-white tracking-widest leading-none">KA-{masterSyncedNumber}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bottom cinematic telemetry */}
                            <div className="h-32 bg-white/5 backdrop-blur-3xl border-t border-white/10 relative z-20 flex items-center justify-around px-12 overflow-hidden">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Gauge size={16} className="text-[#ee6f1f]" />
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Speed</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white font-mono tracking-tighter">{speed}</span>
                                        <span className="text-sm font-black text-white/40">km/h</span>
                                    </div>
                                </div>

                                <div className="w-px h-12 bg-white/10" />

                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Mountain size={16} className="text-blue-400" />
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Altitude</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white font-mono tracking-tighter">{altitude}</span>
                                        <span className="text-sm font-black text-white/40">m</span>
                                    </div>
                                </div>

                                <div className="w-px h-12 bg-white/10" />

                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Thermometer size={16} className="text-green-400" />
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Temp</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white font-mono tracking-tighter">{temp}</span>
                                        <span className="text-sm font-black text-white/40">°C</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default App;
