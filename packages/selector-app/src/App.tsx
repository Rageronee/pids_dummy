/**
 * Selector App — Thin Shell
 *
 * Optimized for Raspberry Pi 5 (4GB RAM):
 * - All IO/sync logic extracted to useSelectorSync hook
 * - All UI sections are React.memo'd components
 * - A change in telemetry won't re-render the station carousel
 * - A change in toast won't re-render the TV monitor
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Train, Clock, Video, Settings, LogOut, Zap } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { useSelectorSync } from './hooks/useSelectorSync';
import TVMonitor from './components/TVMonitor';
import LEDSettingsModal from './components/LEDSettingsModal';
import StationControl from './components/StationControl';
import ServiceConfig from './components/ServiceConfig';
import SelectorToast from './components/SelectorToast';

function App() {
    const sync = useSelectorSync();
    const {
        authUser, handleLogin, handleLogout,
        data, stations, setStations,
        masterSyncedServiceName, masterSyncedNumber,
        masterSyncedLedSpeed, setMasterSyncedLedSpeed,
        jumlahKereta, trainNames, routes,
        speed, altitude, temp, sendData,
    } = sync;

    // Local UI state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showTVPreview, setShowTVPreview] = useState(false);
    const [showLedSettings, setShowLedSettings] = useState(false);
    const [ledType, setLedType] = useState<'indoor' | 'outdoor' | 'p10_32_16' | 'p25_32_16'>('indoor');
    const [toastMsg, setToastMsg] = useState<{ title: string; message: string; id?: number } | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync train name index with master
    const [trainNameIndex, setTrainNameIndex] = useState(-1);
    useEffect(() => {
        const idx = trainNames.indexOf(masterSyncedServiceName);
        if (idx !== -1) setTrainNameIndex(idx);
    }, [masterSyncedServiceName, trainNames]);

    // TV display mode sync
    useEffect(() => {
        if (data?.displayMode === 'tv') setShowTVPreview(true);
        if (data?.displayMode === 'pids') setShowTVPreview(false);
    }, [data?.displayMode]);

    // Prevent index OOB when stations change
    useEffect(() => {
        if (currentIndex >= stations.length) setCurrentIndex(0);
    }, [stations, currentIndex]);

    // Clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const showNotification = useCallback((title: string, message: string) => {
        setToastMsg({ title, message, id: Date.now() });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 5000);
    }, []);

    // ---- Handlers (stable references via useCallback) ----
    const handlePrev = useCallback(() => setCurrentIndex(prev => (prev - 1 + stations.length) % stations.length), [stations.length]);
    const handleNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % stations.length), [stations.length]);

    const handleSelectStation = useCallback(() => {
        setShowTVPreview(false);
        sendData({
            currentStation: stations[currentIndex],
            nextStation: stations[(currentIndex + 1) % stations.length],
            isSyncing: true
        });
        showNotification('Sync Completed', 'Station display status updated.');
    }, [stations, currentIndex, sendData, showNotification]);

    const handleToggleTV = useCallback(() => {
        setShowTVPreview(prev => {
            const newState = !prev;
            sendData({ displayMode: newState ? 'tv' : 'pids' });
            return newState;
        });
    }, [sendData]);

    const handleSetService = useCallback((name: string, routeData: any, newStations: string[]) => {
        if (newStations.length > 0) { setStations(newStations); setCurrentIndex(0); }
        sendData({ serviceName: name, stations: newStations, activeRoute: routeData });
        showNotification('Configuration Saved', `Service name set to ${name}`);
    }, [sendData, setStations, showNotification]);

    const handleSetGerbong = useCallback((gerbong: number) => {
        sendData({ trainNumber: `Gerbong ${gerbong}` });
        showNotification('Configuration Saved', `Unit configuration set to Gerbong ${gerbong}`);
    }, [sendData, showNotification]);

    const handleSetLedSpeed = useCallback((speedValue: number) => {
        setMasterSyncedLedSpeed(speedValue);
        sendData({ ledSpeed: speedValue });
        showNotification('Configuration Saved', `LED scroll speed set to ${speedValue}ms`);
    }, [sendData, setMasterSyncedLedSpeed, showNotification]);

    const currentStation = stations[currentIndex] || 'INITIALIZING SYNC...';
    const nextStation = stations[(currentIndex + 1) % stations.length] || '---';

    // ---- Auth guard ----
    if (!authUser) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none">
            {/* ========== SIDEBAR ========== */}
            <aside className="w-[300px] bg-[#1d2d6a] border-r border-blue-900 flex flex-col py-10 px-8 relative z-10 shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)]">
                <div className="mb-14">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-8 w-auto mb-4 brightness-0 invert" />
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight">PIDS Selector</h1>
                    <p className="text-[9px] font-bold text-blue-200/40 mt-0.5">Control & Monitoring System</p>
                </div>

                <div className="flex flex-col gap-8 mb-auto">
                    {/* Active Service */}
                    <div className="flex items-center gap-5">
                        <div className="bg-[#ee6f1f] p-3 rounded-xl flex-shrink-0 shadow-[0_4px_12px_rgba(238,111,31,0.3)]"><Train size={24} className="text-white" strokeWidth={2} /></div>
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-200/40 mb-0.5">Active Service</span><span className="text-lg font-black text-white leading-none uppercase">{masterSyncedServiceName || 'LAYANAN TIDAK AKTIF'}</span></div>
                    </div>
                    {/* Unit Number */}
                    <div className="flex items-center gap-5">
                        <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5"><Train size={24} className="text-white" strokeWidth={2} /></div>
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-200/40 mb-0.5">Unit Number</span><span className="text-lg font-black text-white leading-none">KA-{masterSyncedNumber || '01 (DEFAULT)'}</span></div>
                    </div>
                    {/* Destination + Timeline */}
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-5">
                            <div className="bg-white/10 p-3 rounded-xl flex-shrink-0 border border-white/5"><MapPin size={24} className="text-white" strokeWidth={2} /></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-200/60 mb-0.5">Destination</span><span className="text-lg font-black text-white leading-none">{stations[stations.length - 1]}</span></div>
                        </div>
                        {stations.length > 0 && (
                            <div className="ml-6 flex flex-col gap-6 border-l-2 border-white/5 pl-7 py-2">
                                {[1, 2, 3].map(offset => {
                                    const targetIdx = (currentIndex + offset) % stations.length;
                                    if (targetIdx === currentIndex || targetIdx === stations.length - 1) return null;
                                    const arrivalTime = new Date(currentTime.getTime() + offset * 15 * 60000);
                                    const jamSampai = arrivalTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':');
                                    return (
                                        <div key={offset} className="flex flex-col gap-1 relative">
                                            <div className="absolute -left-[33px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white/20 bg-[#1d2d6a] shadow-[0_0_0_4px_rgba(29,45,106,1)]" />
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col"><span className="text-sm font-bold text-white/90">{stations[targetIdx]}</span><span className="text-[10px] font-medium text-blue-200/30">ETA: {offset * 15} mins</span></div>
                                                {offset === 1 ? (<div className="bg-[#ee6f1f]/10 text-[#ee6f1f] px-2 py-0.5 rounded-full text-[10px] font-black border border-[#ee6f1f]/20">{jamSampai}</div>) : (<span className="text-[11px] font-bold text-blue-200/30">{jamSampai}</span>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Nav */}
                <div className="flex flex-col gap-2 mt-12">
                    <button onClick={() => setShowLedSettings(true)} className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showLedSettings ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                        <Settings size={20} className={showLedSettings ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} /><span className="font-bold text-sm">LED Settings</span>
                    </button>
                    <button onClick={handleToggleTV} className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors w-full text-left group ${showTVPreview ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                        <Video size={20} className={showTVPreview ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} /><span className="font-bold text-sm">Monitor TV</span>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] border border-white/5 active:scale-95 group mt-4">
                        <LogOut size={16} className="text-white/20 group-hover:text-red-400 transition-colors" /><span>Logout dari Sistem</span>
                    </button>
                </div>
            </aside>

            {/* ========== MAIN ========== */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Zap className="text-[#1d2d6a]" size={20} /></div>
                        <div><h1 className="text-lg font-black text-[#1d2d6a] tracking-tight leading-none mb-1">Selector Console</h1><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">Control Interface</span><div className="w-1 h-1 rounded-full bg-slate-300" /><span className="text-[10px] font-bold text-slate-400">Active session</span></div></div>
                    </div>
                    <div className="flex items-center gap-6"><div className="flex items-center gap-3 text-[#1d2d6a]"><div className="bg-slate-50 p-2 rounded-lg text-slate-400"><Clock size={18} /></div><span className="text-2xl font-black font-mono tracking-tighter opacity-90">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</span></div></div>
                </header>

                <div className="flex-1 min-h-0 relative overflow-y-auto p-8 pr-10 pb-10">
                    <ServiceConfig trainNames={trainNames} routes={routes} jumlahKereta={jumlahKereta} onSetService={handleSetService} onSetGerbong={handleSetGerbong} initialTrainNameIndex={trainNameIndex} />
                    <div className="w-full h-px bg-slate-200 my-8" />
                    <StationControl stations={stations} currentIndex={currentIndex} onPrev={handlePrev} onNext={handleNext} onSync={handleSelectStation} data={data} />
                </div>

                {/* Modals */}
                <LEDSettingsModal show={showLedSettings} onClose={() => setShowLedSettings(false)} data={data} currentStation={currentStation} stations={stations} masterSyncedNumber={masterSyncedNumber} masterSyncedLedSpeed={masterSyncedLedSpeed} onSetLedSpeed={handleSetLedSpeed} ledType={ledType} onSetLedType={setLedType} />
                <TVMonitor show={showTVPreview} onClose={handleToggleTV} data={data} currentStation={currentStation} nextStation={nextStation} masterSyncedServiceName={masterSyncedServiceName} masterSyncedNumber={masterSyncedNumber} speed={speed} altitude={altitude} temp={temp} />
                <SelectorToast toast={toastMsg} onClose={() => setToastMsg(null)} />
            </main>
        </div>
    );
}

export default App;
