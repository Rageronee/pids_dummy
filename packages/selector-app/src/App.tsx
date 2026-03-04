import { useState, useEffect, useRef } from 'react';
import { MapPin, Activity, Mountain, Gauge, Thermometer, ChevronLeft, ChevronRight, Video, Clock, RefreshCcw, Train, X, Zap, Settings, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { P10Matrix } from '@eltran/shared';
import { LoginScreen } from './components/LoginScreen';
import { io, Socket } from 'socket.io-client';
import type { AuthUser, PidsState } from '@eltran/pids-core';


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
    const [ledType, setLedType] = useState<'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16'>('indoor');
    const [tvDisplayMode, setTvDisplayMode] = useState<'current' | 'next'>('current');
    const [toastMsg, setToastMsg] = useState<{ title: string, message: string } | null>(null);

    const showNotification = (title: string, message: string) => {
        setToastMsg({ title, message });
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Synced State from Master
    const [stations, setStations] = useState(['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI']);
    const [masterSyncedServiceName, setMasterSyncedServiceName] = useState('ARGO BROMO ANGGREK');
    const [masterSyncedNumber, setMasterSyncedNumber] = useState('KA 1');
    const [masterSyncedLedSpeed, setMasterSyncedLedSpeed] = useState(60);
    const [data, setData] = useState<PidsState | null>(null);

    const [trainNames, setTrainNames] = useState<string[]>(['ARGO WILIS', 'ARGO BROMO ANGGREK', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN']);
    const [trainNumbers, setTrainNumbers] = useState<string[]>(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15']);
    const [gerbongCounts, setGerbongCounts] = useState<Record<string, number>>({});
    const [routes, setRoutes] = useState<any>({
        'ARGO WILIS': { name: 'ARGO WILIS', stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'] },
        'ARGO BROMO ANGGREK': { name: 'ARGO BROMO ANGGREK', stations: ['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI'] }
    });
    const [trainNameIndex, setTrainNameIndex] = useState(0);
    const [trainNumberIndex, setTrainNumberIndex] = useState(4); // Default to KA-05

    const socketRef = useRef<Socket | null>(null);
    const API_URL = 'http://localhost:3001';

    // Socket.IO connection for real-time sync
    useEffect(() => {
        // Initial DB fetch
        const fetchDb = async () => {
            try {
                const res = await fetch(`${API_URL}/api/db`);
                if (res.ok) {
                    const dbData = await res.json();
                    if (dbData.success && dbData.data && dbData.data.trainNames) {
                        setTrainNames(dbData.data.trainNames);
                        setTrainNumbers(dbData.data.trainNumbers || []);
                        setRoutes(dbData.data.routes || {});
                        if (dbData.data.gerbongCounts) setGerbongCounts(dbData.data.gerbongCounts);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch DB from master API:', e);
            }
        };
        fetchDb();

        // Initial State fetch
        const fetchState = async () => {
            try {
                const res = await fetch(`${API_URL}/api/state`);
                if (res.ok) {
                    const stateData = await res.json();
                    if (stateData) {
                        setData(stateData);
                        if (stateData.serviceName) setMasterSyncedServiceName(stateData.serviceName);
                        if (stateData.trainNumber) setMasterSyncedNumber(stateData.trainNumber);
                        if (stateData.ledSpeed !== undefined) setMasterSyncedLedSpeed(stateData.ledSpeed);
                        if (stateData.stations && Array.isArray(stateData.stations) && stateData.stations.length > 0) {
                            setStations(stateData.stations);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch State from master API:', e);
            }
        };
        fetchState();

        // Connect Socket.IO
        const socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => console.log('[Socket.IO] Selector connected'));

        // Real-time state updates (replaces polling)
        socket.on('state:update', (parsed: any) => {
            setData(parsed);
            if (parsed.serviceName) setMasterSyncedServiceName(parsed.serviceName);
            if (parsed.trainNumber) setMasterSyncedNumber(parsed.trainNumber);
            if (parsed.ledSpeed !== undefined) setMasterSyncedLedSpeed(parsed.ledSpeed);
            if (parsed.stations && Array.isArray(parsed.stations) && parsed.stations.length > 0) {
                setStations(parsed.stations);
            }
            if (parsed.displayMode === 'tv') setShowTVPreview(true);
            if (parsed.displayMode === 'pids') setShowTVPreview(false);
        });

        // Real-time DB updates (routes/trains changed by Command Center)
        socket.on('db:update', (dbUpdate: any) => {
            if (dbUpdate.trainNames) setTrainNames(dbUpdate.trainNames);
            if (dbUpdate.routes) setRoutes(dbUpdate.routes);
            if (dbUpdate.gerbongCounts) setGerbongCounts(dbUpdate.gerbongCounts);
        });

        return () => { socket.disconnect(); socketRef.current = null; };
    }, []);

    // Auth handlers
    const handleLogin = (user: AuthUser, token: string) => {
        setAuthUser(user);
        setAuthToken(token);
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
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
            fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if (d.success) { setAuthToken(token); setAuthUser(JSON.parse(userStr)); }
                    else { sessionStorage.removeItem('pids_token'); sessionStorage.removeItem('pids_user'); }
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr)); });
        }
    }, []);

    const sendData = async (newData: any) => {
        try {
            await fetch(`${API_URL}/api/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                body: JSON.stringify(newData)
            });
        } catch (e) {
            console.error('Error posting PIDS state:', e);
        }
    };

    // Auto-sync selector indices with master state
    useEffect(() => {
        const nameIdx = trainNames.indexOf(masterSyncedServiceName);
        if (nameIdx !== -1) setTrainNameIndex(nameIdx);

        const numIdx = trainNumbers.indexOf(masterSyncedNumber);
        if (numIdx !== -1) setTrainNumberIndex(numIdx);
    }, [masterSyncedServiceName, masterSyncedNumber, trainNames, trainNumbers]);

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

    useEffect(() => {
        const toggleTimer = setInterval(() => {
            setTvDisplayMode(prev => prev === 'current' ? 'next' : 'current');
        }, 15000);
        return () => clearInterval(toggleTimer);
    }, []);

    const handleSelectStation = () => {
        setShowTVPreview(false);
        sendData({
            currentStation: stations[currentIndex],
            nextStation: stations[(currentIndex + 1) % stations.length],
            isSyncing: true
        });
        showNotification('Sync Completed', 'Station display status updated.');
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
        const newStations = routeData?.stations || [];

        // Update local stations immediately so carousel refreshes
        if (newStations.length > 0) {
            setStations(newStations);
            setCurrentIndex(0);
        }

        sendData({
            serviceName: newName,
            stations: newStations,
            activeRoute: routeData
        });
        showNotification('Configuration Saved', `Service name set to ${newName}`);
    };

    const handleSetNumber = () => {
        const newNumber = trainNumbers[trainNumberIndex];
        sendData({ trainNumber: newNumber });
        showNotification('Configuration Saved', `Unit number set to ${newNumber}`);
    };

    const handleSetLedSpeed = (speedValue: number) => {
        setMasterSyncedLedSpeed(speedValue);
        sendData({ ledSpeed: speedValue });
        showNotification('Configuration Saved', `LED scroll speed set to ${speedValue}ms`);
    };


    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + stations.length) % stations.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % stations.length);
    };

    const currentStation = stations[currentIndex] || 'INITIALIZING SYNC...';
    const nextStation = stations[(currentIndex + 1) % stations.length] || '---';

    if (!authUser) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none">
            {/* Sidebar (Left) */}
            <aside className="w-[300px] bg-[#1d2d6a] border-r border-blue-900 flex flex-col py-10 px-8 relative z-10 shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)]">
                {/* Branding */}
                <div className="mb-14">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-8 w-auto mb-4 brightness-0 invert"
                    />
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight">PIDS SELECTOR</h1>
                    <p className="text-[9px] font-bold text-blue-200/40 uppercase tracking-widest mt-0.5">Control & Monitoring System</p>
                </div>

                {/* Status Items */}
                <div className="flex flex-col gap-8 mb-auto">
                    {/* Active Train */}
                    <div className="flex items-center gap-5">
                        <div className="bg-[#ee6f1f] p-3 rounded-xl flex-shrink-0 shadow-[0_4px_12px_rgba(238,111,31,0.3)]">
                            <Train size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/40 uppercase tracking-widest mb-0.5">Active Service</span>
                            <span className="text-lg font-black text-white leading-none uppercase">{masterSyncedServiceName}</span>
                        </div>
                    </div>

                    {/* Unit Number */}
                    <div className="flex items-center gap-5">
                        <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5">
                            <Train size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/40 uppercase tracking-widest mb-0.5">Unit Number</span>
                            <span className="text-lg font-black text-white leading-none uppercase">KA-{masterSyncedNumber}</span>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-5">
                        <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5">
                            <MapPin size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/40 uppercase tracking-widest mb-0.5">Destination</span>
                            <span className="text-lg font-black text-white leading-none uppercase">{stations[stations.length - 1]}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="flex flex-col gap-2 mt-12">
                    <button
                        onClick={() => setShowLedSettings(true)}
                        className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showLedSettings ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                        <Settings size={20} className={showLedSettings ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} />
                        <span className="font-bold text-sm tracking-wide uppercase">LED Settings</span>
                    </button>

                    <button
                        onClick={handleToggleTV}
                        className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showTVPreview ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                        <Video size={20} className={showTVPreview ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} />
                        <span className="font-bold text-sm tracking-wide uppercase">Monitor TV</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 active:scale-95 group mt-4"
                    >
                        <LogOut size={16} className="text-white/20 group-hover:text-red-400 transition-colors" />
                        <span>Logout dari Sistem</span>
                    </button>
                </div>

            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                {/* Standardized Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Zap className="text-[#1d2d6a]" size={20} /></div>
                        <div>
                            <h1 className="text-lg font-black text-[#1d2d6a] uppercase tracking-tight leading-none mb-1">Selector Console</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Interface</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active session</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 text-[#1d2d6a]">
                            <div className="bg-slate-50 p-2 rounded-lg text-slate-400"><Clock size={18} /></div>
                            <span className="text-2xl font-black font-mono tracking-tighter opacity-90">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</span>
                        </div>
                    </div>
                </header>

                {/* Selection Control Container */}
                <div className="flex-1 min-h-0 relative overflow-y-auto p-8 pr-10 pb-10">
                    {/* Section: Train Configuration */}
                    <div className="mb-10">
                        <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight uppercase mb-6 flex items-center gap-3">
                            <Activity className="text-[#ee6f1f]" size={24} /> Service Configuration
                        </h2>
                        <div className="flex items-end gap-12">
                            {/* Service Config */}
                            <div className="flex-1 flex gap-4 items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-[#1d2d6a] uppercase tracking-widest pl-1">Service Configuration</label>
                                    <div className="relative">
                                        <select
                                            value={trainNameIndex}
                                            onChange={(e) => setTrainNameIndex(parseInt(e.target.value))}
                                            className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-5 py-3.5 text-base font-bold text-[#1d2d6a] shadow-sm focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12"
                                        >
                                            {trainNames.map((name, idx) => (
                                                <option key={name} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                            <ChevronDown size={20} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSetName}
                                    className="h-[52px] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black tracking-widest uppercase shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95"
                                >
                                    Set
                                </button>
                            </div>

                            {/* Unit Config */}
                            <div className="flex-1 flex gap-4 items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-[#1d2d6a] uppercase tracking-widest pl-1">Unit Configuration</label>
                                    <div className="relative">
                                        <select
                                            value={trainNumberIndex}
                                            onChange={(e) => setTrainNumberIndex(parseInt(e.target.value))}
                                            className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-5 py-3.5 text-base font-bold text-[#1d2d6a] shadow-sm focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12"
                                        >
                                            {(() => {
                                                const currentTrainName = trainNames[trainNameIndex] || masterSyncedServiceName;
                                                const maxWagons = gerbongCounts[currentTrainName] || 15;
                                                const availableNumbers = trainNumbers.slice(0, maxWagons);
                                                return availableNumbers.map((num, idx) => (
                                                    <option key={num} value={idx}>{num.replace('KA-', '')}</option>
                                                ));
                                            })()}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                            <ChevronDown size={20} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSetNumber}
                                    className="h-[52px] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black tracking-widest uppercase shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95"
                                >
                                    Set
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-8"></div>

                    {/* Section: Station Control */}
                    <div>
                        <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight uppercase mb-6 flex items-center gap-3">
                            <MapPin className="text-[#ee6f1f]" size={24} /> Station Control
                        </h2>

                        <div className="flex gap-6 h-[400px]">
                            <div className="flex-[2] bg-white rounded-3xl border border-slate-200 flex flex-col p-8 relative overflow-hidden group">

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">CURRENT STATION</span>
                                    <div className="bg-[#1d2d6a]/5 text-[#1d2d6a] rounded-xl p-3 shadow-sm">
                                        <MapPin size={24} />
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 justify-center relative z-10 pl-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Departing From</p>
                                    <div className="h-24">
                                        <AnimatePresence mode="wait">
                                            <motion.h3
                                                key={currentIndex}
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -10, opacity: 0 }}
                                                className="text-6xl font-black text-[#1d2d6a] uppercase tracking-tighter"
                                            >
                                                {currentStation}
                                            </motion.h3>
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-4 mt-auto relative z-10">
                                    <button
                                        onClick={handlePrev}
                                        className="w-16 h-16 rounded-2xl bg-[#ee6f1f] hover:bg-[#d86116] text-white flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
                                    >
                                        <ChevronLeft size={32} />
                                    </button>
                                    <button
                                        onClick={handleSelectStation}
                                        className="flex-1 h-16 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-2xl font-black tracking-wider uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 drop-shadow-sm text-lg"
                                    >
                                        <RefreshCcw size={22} /> SYNC DISPLAY STATUS
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="w-16 h-16 rounded-2xl bg-[#ee6f1f] hover:bg-[#d86116] text-white flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center p-8 relative overflow-hidden group">

                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 mb-4">UPCOMING STOP</span>

                                <div className="flex flex-col items-center justify-center relative z-10">
                                    <div className="h-16 mb-2 flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            <motion.h4
                                                key={currentIndex}
                                                initial={{ y: 5, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -5, opacity: 0 }}
                                                className="text-4xl font-black text-[#1d2d6a] uppercase tracking-tighter truncate text-center"
                                                title={nextStation}
                                            >
                                                {nextStation}
                                            </motion.h4>
                                        </AnimatePresence>
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-slate-500 font-bold text-sm border border-slate-200 w-max">
                                        <Clock size={16} />
                                        <span>Status: {data?.status || 'STANDBY'}</span>
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

                                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {/* Preview Section */}
                                    <div className="space-y-4 text-center pb-2">
                                        <div className="flex justify-center scale-100 py-4 h-32 items-center">
                                            {data?.ledActive !== false ? (
                                                <P10Matrix
                                                    text={`~ POSISI SAAT INI: ${currentStation} ~ TUJUAN AKHIR STASIUN ${(stations || [])[(stations || []).length - 1]} ~ BERHENTI DI: ${(stations || []).join(', ')}`}
                                                    fixedText={data?.showTrainNumber ? `${masterSyncedNumber} ` : ''}
                                                    color="#ee6f1f"
                                                    speed={masterSyncedLedSpeed}
                                                    columns={ledType.includes('96') ? 96 : 128}
                                                />
                                            ) : (
                                                <div className="w-full max-w-2xl h-16 bg-black flex items-center justify-center rounded-lg border border-slate-800 shadow-inner">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LED SYSTEM STANDBY / POWERED OFF</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {/* LED Type Selection */}
                                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-4">
                                            <div>
                                                <h4 className="text-base font-black text-[#1d2d6a] tracking-tight">Display Type</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select matrix panel model</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setLedType('indoor')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${ledType === 'indoor' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                                >
                                                    P2.5 Indoor
                                                </button>
                                                <button
                                                    onClick={() => setLedType('p10_32_16')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${ledType === 'p10_32_16' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                                >
                                                    P10 Outdoor
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Speed Control */}
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="text-base font-black text-[#1d2d6a] tracking-tight">Scrolling Velocity</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjustment for matrix modules</p>
                                            </div>
                                            <div className="text-2xl font-black text-[#ee6f1f] bg-white px-5 py-1.5 rounded-2xl shadow-sm border border-slate-100 font-mono">
                                                {masterSyncedLedSpeed}<span className="text-[10px] ml-1 opacity-40 uppercase">MS</span>
                                            </div>
                                        </div>

                                        <div className="relative pt-1">
                                            <input
                                                type="range"
                                                min="10"
                                                max="200"
                                                step="5"
                                                value={masterSyncedLedSpeed}
                                                onChange={(e) => handleSetLedSpeed(parseInt(e.target.value))}
                                                className="w-full h-3 bg-slate-200 rounded-xl appearance-none cursor-pointer accent-[#ee6f1f]"
                                            />
                                            <div className="flex justify-between text-[8px] font-black text-slate-300 mt-3 uppercase tracking-[0.2em]">
                                                <span>Hyper Fast (10ms)</span>
                                                <span>Standard (60ms)</span>
                                                <span>Slow (200ms)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-slate-400 text-[9px] leading-relaxed pt-2">
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
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden font-sans select-none"
                        >
                            {/* Subtle Close Button - always visible */}
                            <button
                                onClick={handleToggleTV}
                                className="absolute top-6 right-6 p-3 bg-black/30 hover:bg-black/60 rounded-full text-white/50 hover:text-white backdrop-blur-sm transition-all z-50 group"
                                title="Close Monitor"
                            >
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            {data?.tvStandby ? (
                                /* === STANDBY MODE: Show PIDS Data === */
                                <>
                                    {/* Background Image Content */}
                                    <motion.div
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
                                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                        style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/9/96/Tugu_Malang.jpg')" }}
                                    />
                                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                                    {/* Top UI Layer */}
                                    <div className="relative z-20 flex justify-between items-start pt-10 px-14">
                                        <div className="flex flex-col text-white drop-shadow-md">
                                            <div className="text-5xl font-bold tracking-tight mb-1">
                                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')}
                                            </div>
                                            <div className="text-xl font-medium tracking-wide uppercase text-white/90">
                                                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 mr-16">
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                                                alt="KAI Logo"
                                                className="h-9 drop-shadow-md brightness-0 invert"
                                            />
                                            <div className="flex flex-col text-white font-bold leading-none tracking-wide drop-shadow-md">
                                                <span className="text-sm">MONITOR</span>
                                                <span className="text-sm">PIDS</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center Visuals */}
                                    <div className="flex-1 flex flex-col justify-center items-center px-12 relative z-20 -mt-8">
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-center w-full max-w-5xl"
                                        >
                                            <h3 className="text-[1.5vw] font-bold text-white/80 tracking-widest uppercase mb-2 drop-shadow-md">
                                                {tvDisplayMode === 'current' ? 'CURRENT STATION' : 'NEXT STATION'}
                                            </h3>
                                            <h3 className="text-[8vw] font-black text-white tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] uppercase mb-6">
                                                {tvDisplayMode === 'current' ? currentStation : nextStation}
                                            </h3>
                                            <div className="flex items-center justify-center font-sans tracking-wide">
                                                <div className="bg-[#0a1536] px-12 py-3.5 flex flex-col items-center justify-center rounded-l-md w-80 h-[140px] shadow-lg border-r border-white/20">
                                                    <span className="text-[13px] font-medium text-white/90 uppercase tracking-[0.15em] mb-1">SERVICE</span>
                                                    <span className="text-[32px] font-bold text-white uppercase drop-shadow-sm leading-tight text-center">{masterSyncedServiceName}</span>
                                                </div>
                                                <div className="bg-[#cc500c] px-12 py-3.5 flex flex-col items-center justify-center rounded-r-md w-80 h-[140px] shadow-lg border-l border-[#d95d19]">
                                                    <span className="text-[13px] font-medium text-white/90 uppercase tracking-[0.15em] mb-1">TRAIN NO</span>
                                                    <span className="text-[32px] font-bold text-white uppercase drop-shadow-sm leading-tight text-center">KA-{masterSyncedNumber}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Bottom Telemetry Bar */}
                                    <div className="h-[160px] bg-gradient-to-b from-transparent via-[#0d1c47]/80 to-[#0a1536] relative z-20 flex items-end justify-between px-24 pb-10">
                                        <div className="flex items-center gap-6 w-1/3 justify-start">
                                            <Gauge size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={2} />
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-white/90 uppercase tracking-widest mb-0.5">SPEED</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[44px] leading-none font-bold text-white tracking-tight">{speed}</span>
                                                    <span className="text-2xl font-bold text-white/90">km/h</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 w-1/3 justify-center">
                                            <Mountain size={60} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} />
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-white/90 uppercase tracking-widest mb-0.5">ALTITUDE</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[44px] leading-none font-bold text-white tracking-tight">{altitude}</span>
                                                    <span className="text-2xl font-bold text-white/90">m</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 w-1/3 justify-end">
                                            <Thermometer size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} />
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-white/90 uppercase tracking-widest mb-0.5">TEMP</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[44px] leading-none font-bold text-white tracking-tight">{temp}</span>
                                                    <span className="text-2xl font-bold text-white/90">°C</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* === VIDEO MODE: Play Active Video === */
                                <>
                                    {(() => {
                                        const playlist = data?.videoPlaylist || [];
                                        const activeIdx = data?.activeVideoIndex ?? 0;
                                        const activeFile = playlist[activeIdx];
                                        const videoUrl = activeFile ? `${API_URL}/media/video/${encodeURIComponent(activeFile)}` : null;

                                        if (!videoUrl || playlist.length === 0) {
                                            return (
                                                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                        <Video size={40} className="text-white/20" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Tidak Ada Video Aktif</p>
                                                        <p className="text-white/20 text-xs mt-1">Tambahkan video ke playlist dari Master Console</p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="flex-1 flex items-center justify-center w-full h-full bg-black">
                                                <video
                                                    key={videoUrl}
                                                    src={videoUrl}
                                                    autoPlay={data?.isPlaying ?? true}
                                                    loop
                                                    muted={false}
                                                    className="w-full h-full object-contain"
                                                    style={{ maxWidth: '100vw', maxHeight: '100vh' }}
                                                    ref={(el) => {
                                                        if (el) {
                                                            if (data?.isPlaying !== undefined) {
                                                                if (data.isPlaying && el.paused) el.play().catch(() => { });
                                                                if (!data.isPlaying && !el.paused) el.pause();
                                                            }
                                                            el.volume = (data?.volume ?? 50) / 100;
                                                            if (Math.abs(el.currentTime - ((data?.playbackProgress || 0) / 100) * (el.duration || 1)) > 2) {
                                                                el.currentTime = ((data?.playbackProgress || 0) / 100) * (el.duration || 1);
                                                            }
                                                        }
                                                    }}
                                                />
                                                {/* Video Info Overlay */}
                                                <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 z-30">
                                                    <div className={`w-2 h-2 rounded-full ${data?.isPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {data?.isPlaying ? 'Now Playing' : 'Paused'}: {activeFile}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Toast Notification */}
                <AnimatePresence>
                    {toastMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#1d2d6a] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-blue-900/50 min-w-[320px]"
                        >
                            <div className="bg-[#ee6f1f] p-2 rounded-full">
                                <CheckCircle2 size={24} className="text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-sm uppercase tracking-widest">{toastMsg.title}</span>
                                <span className="text-blue-200/80 text-xs font-medium">{toastMsg.message}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default App;
