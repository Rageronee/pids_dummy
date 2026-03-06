import { useState, useEffect, useRef } from 'react';
import { MapPin, Mountain, Gauge, Thermometer, ChevronLeft, ChevronRight, Video, Clock, RefreshCcw, Train, X, Zap, Settings, LogOut, ChevronDown, Info } from 'lucide-react';
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
    const [toastMsg, setToastMsg] = useState<{ title: string, message: string; id?: number } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showNotification = (title: string, message: string) => {
        setToastMsg({ title, message, id: Date.now() });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 5000);
    };

    // Synced State from Master
    const [stations, setStations] = useState<string[]>([]);
    const [masterSyncedServiceName, setMasterSyncedServiceName] = useState('');
    const [masterSyncedNumber, setMasterSyncedNumber] = useState('');
    const [masterSyncedLedSpeed, setMasterSyncedLedSpeed] = useState(60);
    const [data, setData] = useState<PidsState | null>(null);

    const [trainNames, setTrainNames] = useState<string[]>([]);
    const [routes, setRoutes] = useState<any>({});
    const [trainNameIndex, setTrainNameIndex] = useState(-1);
    const [trainSearchQuery, setTrainSearchQuery] = useState('');
    const [jumlahKereta, setJumlahKereta] = useState(10);
    const [selectedGerbong, setSelectedGerbong] = useState(1);

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
                        setRoutes(dbData.data.routes || {});
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
                        if (stateData.jumlahKereta !== undefined) {
                            setJumlahKereta(stateData.jumlahKereta);
                            setMasterSyncedNumber(`${stateData.jumlahKereta} Kereta`);
                        }
                        if (stateData.ledSpeed !== undefined) setMasterSyncedLedSpeed(stateData.ledSpeed);
                        if (stateData.stations && Array.isArray(stateData.stations)) {
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
            if (parsed.jumlahKereta !== undefined) {
                setJumlahKereta(parsed.jumlahKereta);
                setMasterSyncedNumber(`${parsed.jumlahKereta} Kereta`);
            }
            if (parsed.ledSpeed !== undefined) setMasterSyncedLedSpeed(parsed.ledSpeed);
            if (parsed.stations && Array.isArray(parsed.stations)) {
                setStations(parsed.stations);
            }
            if (parsed.displayMode === 'tv') setShowTVPreview(true);
            if (parsed.displayMode === 'pids') setShowTVPreview(false);
        });

        // Real-time DB updates (routes/trains changed by Command Center)
        socket.on('db:update', (dbUpdate: any) => {
            if (dbUpdate.trainNames) setTrainNames(dbUpdate.trainNames);
            if (dbUpdate.routes) setRoutes(dbUpdate.routes);
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
    }, [masterSyncedServiceName, trainNames]);

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
        if (trainNameIndex < 0 || trainNameIndex >= trainNames.length) return;

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
        const val = selectedGerbong;
        sendData({ trainNumber: `Gerbong ${val}` });
        showNotification('Configuration Saved', `Unit configuration set to Gerbong ${val}`);
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
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight">PIDS Selector</h1>
                    <p className="text-[9px] font-bold text-blue-200/40 mt-0.5">Control & Monitoring System</p>
                </div>

                {/* Status Items */}
                <div className="flex flex-col gap-8 mb-auto">
                    {/* Active Train */}
                    <div className="flex items-center gap-5">
                        <div className="bg-[#ee6f1f] p-3 rounded-xl flex-shrink-0 shadow-[0_4px_12px_rgba(238,111,31,0.3)]">
                            <Train size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/40 mb-0.5">Active Service</span>
                            <span className="text-lg font-black text-white leading-none uppercase">{masterSyncedServiceName || 'LAYANAN TIDAK AKTIF'}</span>
                        </div>
                    </div>

                    {/* Unit Number */}
                    <div className="flex items-center gap-5">
                        <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5">
                            <Train size={24} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/40 mb-0.5">Unit Number</span>
                            <span className="text-lg font-black text-white leading-none">KA-{masterSyncedNumber || '01 (DEFAULT)'}</span>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-5">
                            <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5">
                                <MapPin size={24} className="text-white" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-blue-200/60 mb-0.5">Destination</span>
                                <span className="text-lg font-black text-white leading-none">{stations[stations.length - 1]}</span>
                            </div>
                        </div>

                        {/* Next Stations Timeline */}
                        {stations.length > 0 && (
                            <div className="ml-6 flex flex-col gap-6 border-l-2 border-white/5 pl-7 py-2">
                                {[1, 2, 3].map((offset) => {
                                    const targetIdx = (currentIndex + offset) % stations.length;
                                    const stName = stations[targetIdx];

                                    // Stop if we loop back to current or reach the final destination
                                    if (targetIdx === currentIndex) return null;
                                    // If this is the destination, we already show it above
                                    if (targetIdx === stations.length - 1) return null;

                                    // Mock times for visual representation
                                    const arrivalTime = new Date(currentTime.getTime() + (offset * 15 * 60000));
                                    const jamSampai = arrivalTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':');
                                    const etaMins = offset * 15;

                                    return (
                                        <div key={offset} className="flex flex-col gap-1 relative">
                                            {/* Line Marker */}
                                            <div className="absolute -left-[33px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white/20 bg-[#1d2d6a] shadow-[0_0_0_4px_rgba(29,45,106,1)]" />

                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white/90">{stName}</span>
                                                    <span className="text-[10px] font-medium text-blue-200/30">ETA: {etaMins} mins</span>
                                                </div>

                                                {offset === 1 ? (
                                                    <div className="bg-[#ee6f1f]/10 text-[#ee6f1f] px-2 py-0.5 rounded-full text-[10px] font-black border border-[#ee6f1f]/20">
                                                        {jamSampai}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-blue-200/30">{jamSampai}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="flex flex-col gap-2 mt-12">
                    <button
                        onClick={() => setShowLedSettings(true)}
                        className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showLedSettings ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                        <Settings size={20} className={showLedSettings ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} />
                        <span className="font-bold text-sm">LED Settings</span>
                    </button>

                    <button
                        onClick={handleToggleTV}
                        className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showTVPreview ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                        <Video size={20} className={showTVPreview ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} />
                        <span className="font-bold text-sm">Monitor TV</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] border border-white/5 active:scale-95 group mt-4"
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
                            <h1 className="text-lg font-black text-[#1d2d6a] tracking-tight leading-none mb-1">Selector Console</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">Control Interface</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400">Active session</span>
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
                        <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight mb-6 flex items-center gap-3">
                            <Settings className="text-[#ee6f1f]" size={24} /> Service Configuration
                        </h2>
                        <div className="flex items-end gap-12">
                            {/* Service Config */}
                            <div className="flex-1 flex gap-4 items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center justify-between pl-1">
                                        <label className="text-[11px] font-black text-[#1d2d6a]">Service Configuration</label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            <input
                                                type="text"
                                                placeholder="Cari..."
                                                value={trainSearchQuery}
                                                onChange={(e) => setTrainSearchQuery(e.target.value)}
                                                className="text-[10px] font-bold bg-transparent border-none focus:ring-0 w-24 text-[#ee6f1f] placeholder-slate-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={trainNameIndex}
                                            onChange={(e) => setTrainNameIndex(parseInt(e.target.value))}
                                            className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-5 py-3.5 text-base font-bold text-[#1d2d6a] shadow-sm focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12"
                                        >
                                            <option value={-1} disabled>--- Pilih Service ---</option>
                                            {trainNames
                                                .map((name, idx) => ({ name, idx }))
                                                .filter(t => t.name.toUpperCase().includes(trainSearchQuery.toUpperCase()))
                                                .map((t) => (
                                                    <option key={t.name} value={t.idx}>{t.name}</option>
                                                ))
                                            }
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                            <ChevronDown size={20} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSetName}
                                    className="h-[52px] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95"
                                >
                                    Set
                                </button>
                            </div>

                            {/* Unit Config */}
                            <div className="flex-1 flex gap-4 items-end">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-[#1d2d6a] pl-1">Unit Configuration</label>
                                    <div className="relative">
                                        <select
                                            value={selectedGerbong}
                                            onChange={(e) => setSelectedGerbong(parseInt(e.target.value))}
                                            className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-5 py-3.5 text-base font-bold text-[#1d2d6a] shadow-sm focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition-all cursor-pointer truncate pr-12"
                                        >
                                            {(() => {
                                                const maxWagons = jumlahKereta > 0 ? jumlahKereta : 10;
                                                return [...Array(maxWagons)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>Gerbong {i + 1}</option>
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
                                    className="h-[52px] px-8 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-xl font-black shadow-[0_4px_14px_rgba(238,111,31,0.3)] transition-all active:scale-95"
                                >
                                    Set
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-8"></div>

                    {/* Section: Station Control */}
                    <div>
                        <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight mb-6 flex items-center gap-3">
                            <MapPin className="text-[#ee6f1f]" size={24} /> Station Control
                        </h2>

                        <div className="flex gap-6 h-[400px]">
                            <div className="flex-[2] bg-white rounded-3xl border border-slate-200 flex flex-col p-8 relative overflow-hidden group">

                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">Current Station</span>
                                    <div className="bg-[#1d2d6a]/5 text-[#1d2d6a] rounded-xl p-3 shadow-sm">
                                        <MapPin size={24} />
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 justify-center relative z-10 pl-2">
                                    <p className="text-[11px] font-bold text-slate-400 mb-2">Departing From</p>
                                    <div className="h-24">
                                        <AnimatePresence mode="wait">
                                            <motion.h3
                                                key={currentIndex}
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -10, opacity: 0 }}
                                                className="text-6xl font-black text-[#1d2d6a] tracking-tighter"
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
                                        className="flex-1 h-16 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 drop-shadow-sm text-lg"
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

                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 mb-4">Upcoming Stop</span>

                                <div className="flex flex-col items-center justify-center relative z-10">
                                    <div className="h-16 mb-2 flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            <motion.h4
                                                key={currentIndex}
                                                initial={{ y: 5, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -5, opacity: 0 }}
                                                className="text-4xl font-black text-[#1d2d6a] tracking-tighter truncate text-center"
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
                                            <p className="text-[10px] font-bold text-white/40">Visualizer & Velocity Control</p>
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
                                                        <span className="text-[10px] font-black text-slate-500">LED System Standby / Powered Off</span>
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
                                                <p className="text-[10px] font-bold text-slate-400">Select matrix panel model</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setLedType('indoor')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl font-black text-[10px] transition-all border-2 ${ledType === 'indoor' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                                >
                                                    P2.5 Indoor
                                                </button>
                                                <button
                                                    onClick={() => setLedType('p10_32_16')}
                                                    className={`flex-1 py-3 px-4 rounded-2xl font-black text-[10px] transition-all border-2 ${ledType === 'p10_32_16' ? 'border-[#ee6f1f] bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
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
                                                <p className="text-[10px] font-bold text-slate-400">Adjustment for matrix modules</p>
                                            </div>
                                            <div className="text-2xl font-black text-[#ee6f1f] bg-white px-5 py-1.5 rounded-2xl shadow-sm border border-slate-100 font-mono">
                                                {masterSyncedLedSpeed}<span className="text-[10px] ml-1 opacity-40">MS</span>
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
                                            <div className="flex justify-between text-[8px] font-black text-slate-300 mt-3">
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
                                        <p className="font-bold">Changes are broadcasted in real-time to all connected LED units and passenger displays.</p>
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

                            <AnimatePresence mode="wait">
                                {data?.tvStandby !== false ? (
                                    /* === STANDBY MODE: Show PIDS Data === */
                                    <motion.div
                                        key="standby-pids"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute inset-0 flex flex-col overflow-hidden"
                                    >
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
                                                <div className="text-xl font-medium text-white/90">
                                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 mr-16">
                                                <img
                                                    src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                                                    alt="KAI Logo"
                                                    className="h-9 drop-shadow-md brightness-0 invert"
                                                />
                                                <div className="flex flex-col text-white font-bold leading-none drop-shadow-md">
                                                    <span className="text-sm">Monitor</span>
                                                    <span className="text-sm">PIDS</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Center Visuals */}
                                        <div className="flex-1 flex flex-col justify-center items-center px-12 relative z-20 -mt-8">
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="text-center w-full max-w-5xl"
                                            >
                                                <h3 className="text-[1.5vw] font-bold text-white/80 mb-2 drop-shadow-md">
                                                    {tvDisplayMode === 'current' ? 'Current Station' : 'NEXT STATION'}
                                                </h3>
                                                <h3 className="text-[8vw] font-black text-white tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] mb-6">
                                                    {tvDisplayMode === 'current' ? currentStation : nextStation}
                                                </h3>
                                                <div className="flex items-center justify-center font-sans">
                                                    <div className="bg-[#0a1536] px-12 py-3.5 flex flex-col items-center justify-center rounded-l-md w-80 h-[140px] shadow-lg border-r border-white/20">
                                                        <span className="text-[13px] font-medium text-white/90 mb-1">Service</span>
                                                        <span className="text-[32px] font-bold text-white drop-shadow-sm leading-tight text-center">{masterSyncedServiceName}</span>
                                                    </div>
                                                    <div className="bg-[#cc500c] px-12 py-3.5 flex flex-col items-center justify-center rounded-r-md w-80 h-[140px] shadow-lg border-l border-[#d95d19]">
                                                        <span className="text-[13px] font-medium text-white/90 mb-1">Train No</span>
                                                        <span className="text-[32px] font-bold text-white drop-shadow-sm leading-tight text-center">KA-{masterSyncedNumber}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Bottom Telemetry Bar */}
                                        <div className="h-[160px] bg-gradient-to-b from-transparent via-[#0d1c47]/80 to-[#0a1536] relative z-20 flex items-end justify-between px-24 pb-10">
                                            <div className="flex items-center gap-6 w-1/3 justify-start">
                                                <Gauge size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={2} />
                                                <div className="flex flex-col">
                                                    <span className="text-[35px] font-medium text-white/90 mb-0.5">Speed</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[44px] leading-none font-bold text-white tracking-tight">{speed}</span>
                                                        <span className="text-2xl font-bold text-white/90">km/h</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 w-1/3 justify-center">
                                                <Mountain size={60} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} />
                                                <div className="flex flex-col">
                                                    <span className="text-[35px] font-medium text-white/90 mb-0.5">Altitude</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[44px] leading-none font-bold text-white tracking-tight">{altitude}</span>
                                                        <span className="text-2xl font-bold text-white/90">m</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 w-1/3 justify-end">
                                                <Thermometer size={56} className="text-[#ee6f1f] drop-shadow-sm" strokeWidth={1.5} />
                                                <div className="flex flex-col">
                                                    <span className="text-[35px] font-medium text-white/90 mb-0.5">Temp</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[44px] leading-none font-bold text-white tracking-tight">{temp}</span>
                                                        <span className="text-2xl font-bold text-white/90">°C</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* === VIDEO MODE: Play Active Video === */
                                    <motion.div
                                        key="video-display"
                                        initial={{ opacity: 0, scale: 1.05 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-black"
                                    >
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
                                                            <p className="text-white/40 text-sm font-bold">Tidak Ada Video Aktif</p>
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
                                                        autoPlay={data?.isPlaying ?? false}
                                                        loop
                                                        muted={false}
                                                        className="w-full h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)]"
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
                                                        <span className="text-[10px] font-black">
                                                            {data?.isPlaying ? 'Now Playing' : 'Paused'}: {activeFile}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Toast Notification */}
                <AnimatePresence>
                    {toastMsg && (
                        <motion.div
                            key={toastMsg.id}
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="fixed bottom-10 right-10 z-[70] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 min-w-[350px] max-w-[420px]"
                        >
                            {/* Status Left Border */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#1d2d6a]" />

                            <div className="relative p-5 pl-7 pb-6">
                                {/* Close Icon (X) */}
                                <button
                                    onClick={() => setToastMsg(null)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>

                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#ee6f1f]">
                                        <Info size={24} className="text-white" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col pr-6">
                                        <span className="font-semibold text-lg leading-tight mb-2 text-[#1d2d6a]">
                                            {toastMsg.title}
                                        </span>
                                        <span className="text-slate-600 font-medium text-[15px] leading-relaxed mb-5">
                                            {toastMsg.message}
                                        </span>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-5 items-center mt-2">
                                            <button
                                                onClick={() => setToastMsg(null)}
                                                className="text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors"
                                            >
                                                Tutup
                                            </button>
                                            <button
                                                onClick={() => setToastMsg(null)}
                                                className="text-[#1d2d6a] font-bold text-sm hover:text-blue-800 transition-colors"
                                            >
                                                Lihat Detail
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="h-1.5 w-full bg-orange-100 absolute bottom-0 left-0">
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 5, ease: "linear" }}
                                    className="h-full bg-[#ee6f1f]"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default App;
