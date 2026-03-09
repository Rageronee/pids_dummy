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
import { Train, Clock, Settings, ChevronsUp, ChevronsDown, RefreshCcw, Crosshair, Route } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { useSelectorSync } from './hooks/useSelectorSync';
import TVMonitor from './components/TVMonitor';
import SystemSettingsModal from './components/SystemSettingsModal';
import ServiceConfigModal from './components/ServiceConfigModal.tsx';
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
    const [showSystemSettings, setShowSystemSettings] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
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

    const handleUpdateDisplayPreferences = useCallback((prefs: Partial<typeof data>) => {
        sendData(prefs);
    }, [sendData]);

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
        <div className="flex flex-col h-[100dvh] w-full bg-[#f4f7f9] text-slate-900 font-sans overflow-hidden select-none">
            {/* ========== TOP BAR ========== */}
            <header className="h-[100px] bg-[#1d2d6a] text-white flex items-center px-10 shadow-md shrink-0 justify-between">
                <button onClick={() => setShowServiceModal(true)} className="flex items-center gap-6 text-left group transition-transform active:scale-95">
                    <div className="w-[60px] h-[60px] bg-white rounded-[16px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Train className="text-[#1d2d6a]" size={36} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black uppercase tracking-tight group-hover:text-blue-200 transition-colors duration-300">{masterSyncedServiceName || 'SERVICE NOT SET'}</h1>
                        <p className="text-xs font-bold text-blue-200/60 tracking-widest mt-1 uppercase group-hover:text-blue-100 transition-colors duration-300">EXECUTIVE CLASS • {masterSyncedNumber || 'TRAIN NO. 1'}</p>
                    </div>
                </button>

                <div className="flex items-center gap-12">
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-black text-blue-200/60 tracking-wider group-hover:text-blue-200 transition-colors">SERVICE</span>
                        <span className="text-xl font-black tracking-tight uppercase group-hover:text-white transition-colors">{masterSyncedServiceName ? 'REGULAR' : '---'}</span>
                    </div>
                    <div className="w-px h-10 bg-white/20" />
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-black text-blue-200/60 tracking-wider">UNIT</span>
                        <span className="text-xl font-black tracking-widest uppercase">{masterSyncedNumber || '---'}</span>
                    </div>
                    <div className="w-px h-10 bg-white/20" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-blue-200/60 tracking-wider">DESTINATION</span>
                        <span className="text-2xl font-black text-[#ee6f1f] tracking-tight uppercase">
                            {stations.length > 0 ? stations[stations.length - 1] : '---'}
                        </span>
                    </div>
                </div>
            </header>

            {/* ========== MAIN CONTENT ========== */}
            <div className="flex gap-6 p-6 flex-1 min-h-0">

                {/* LEFT COLUMN - Information Display (65%) */}
                <div className="flex-[0.65] flex flex-col gap-6">
                    {/* CURRENT STATION */}
                    <div className="bg-white rounded-[32px] shadow-sm p-8 border border-slate-200 flex flex-col">
                        <div className="flex items-center gap-3 text-slate-400 font-black text-xs tracking-widest uppercase mb-4">
                            <Crosshair size={18} className="text-[#ee6f1f]" /> NOW PASSING / STOPPED AT
                        </div>
                        <h2 className="text-6xl font-black text-[#1d2d6a] tracking-tight uppercase leading-[1.1] ">{currentStation}</h2>
                    </div>

                    {/* ITINERARY */}
                    <div className="bg-white rounded-[32px] shadow-sm py-6 px-8 border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center gap-3 text-slate-400 font-black text-xs tracking-widest uppercase mb-4 shrink-0">
                            <Route size={18} /> DETAILED ROUTES
                        </div>

                        <div className="relative pl-[30px] pr-2 mt-2 flex-1 flex flex-col justify-start">
                            {/* Vertical Line */}
                            <div className="absolute left-[61px] top-[40px] bottom-6 w-[4px] bg-slate-100 rounded-full" />

                            {/* Next Stop */}
                            <div className="flex items-center gap-6 mb-4 relative z-10 w-full group shrink-0">
                                <div className="w-[68px] h-[68px] bg-white border-[4px] border-[#1d2d6a] rounded-[22px] flex items-center justify-center flex-shrink-0 shadow-sm relative z-10 mt-2">
                                    <Train className="text-[#1d2d6a]" size={36} />
                                </div>
                                <div className="flex-1 bg-gradient-to-r from-[#1d2d6a] to-[#2a3f8c] rounded-3xl p-5 shadow-md flex justify-between items-center relative overflow-hidden">
                                    <div className="flex flex-col relative z-10 text-white">
                                        <span className="text-[#ee6f1f] text-[10px] font-black uppercase tracking-widest mb-1 opacity-90">NEXT STOP</span>
                                        <span className="text-3xl font-black tracking-tight uppercase shrink-0 min-w-0 pr-4">{nextStation}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end relative z-10 shrink-0">
                                        <span className="text-white/60 text-[10px] font-black uppercase tracking-wider block mb-1">ETA</span>
                                        <span className="text-3xl font-black text-white">
                                            {stations.length > 0 ? new Date(currentTime.getTime() + 15 * 60000).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace('.', ':') : '--:--'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming Stops Generator */}
                            {stations.length > 2 && (() => {
                                const renderUpcoming = [];
                                for (let i = 2; i < Math.min(stations.length, 4); i++) {
                                    const upcomingStation = stations[(currentIndex + i) % stations.length];
                                    if (upcomingStation !== stations[stations.length - 1] && upcomingStation !== stations[currentIndex]) {
                                        renderUpcoming.push(
                                            <div key={`upcoming-${i}`} className="flex items-center gap-6 relative z-10 w-full opacity-80 mb-3 transform transition-transform hover:scale-[1.01] hover:opacity-100 shrink-0">
                                                <div className="w-[68px] flex justify-center relative z-10">
                                                    <div className="w-[20px] h-[20px] bg-slate-300 rounded-full border-[5px] border-white shadow-sm mt-3" />
                                                </div>
                                                <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex justify-between items-center transition-colors hover:border-slate-200">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">UPCOMING</span>
                                                        <span className="text-lg font-bold text-slate-700 uppercase tracking-tight">{upcomingStation}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block mb-1">ETA</span>
                                                        <span className="text-xl font-bold text-slate-500">
                                                            {new Date(currentTime.getTime() + (15 * i) * 60000).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        break; // stop generating past the final station or loop
                                    }
                                }
                                return renderUpcoming;
                            })()}
                        </div>
                    </div>

                    {/* STATUS BAR (Bottom Left) */}
                    <div className="flex gap-4 h-[80px] shrink-0">
                        {/* TIMESTAMP STATUS */}
                        <div className="flex-1 bg-white rounded-[24px] shadow-sm flex items-center px-6 border border-slate-200">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mr-4">
                                <Clock size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col flex-1 border-r border-slate-100 mr-4 pr-4">
                                <span className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-0.5">LOCAL TIME</span>
                                <span className="text-[#1d2d6a] font-black text-2xl tracking-tighter leading-none">
                                    {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                                </span>
                            </div>
                            <div className="flex flex-col flex-1 pl-2">
                                <span className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">CURRENT DATE</span>
                                <span className="text-slate-700 font-bold text-sm tracking-tight leading-none pt-1">
                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - Action Controls (35%) */}
                <div className="flex-[0.35] flex flex-col gap-6">
                    <button onClick={handlePrev} className="flex-1 relative bg-white hover:bg-slate-50 border-2 border-[#ff8d4a] text-[#ee6f1f] rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#ee6f1f]/5 to-transparent pointer-events-none" />
                        <ChevronsUp size={72} className="transition-transform group-hover:-translate-y-2 stroke-[2.5]" />
                        <span className="text-3xl font-black uppercase tracking-tight">Previous Station</span>
                        <div className="absolute top-6 left-6 w-3 h-3 bg-[#ee6f1f]/20 rounded-full" />
                        <div className="absolute right-6 top-6 w-3 h-3 bg-[#ee6f1f]/20 rounded-full" />
                    </button>

                    <button onClick={handleNext} className="flex-1 relative bg-gradient-to-b from-[#ee6f1f] to-[#e45a05] hover:from-[#f37c35] hover:to-[#eb6009] text-white rounded-[32px] shadow-lg flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 group overflow-hidden border border-[#f58d52]">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />
                        <span className="text-3xl font-black uppercase tracking-tight relative z-10">Next Station</span>
                        <ChevronsDown size={72} className="relative z-10 transition-transform group-hover:translate-y-2 stroke-[2.5]" />
                        <div className="absolute bottom-6 left-6 w-3 h-3 bg-white/20 rounded-full" />
                        <div className="absolute right-6 bottom-6 w-3 h-3 bg-white/20 rounded-full" />
                    </button>

                    <div className="flex gap-4 mt-2 h-[80px]">
                        <button onClick={handleSelectStation} className="flex-[0.8] bg-[#1d2d6a] hover:bg-[#152353] text-white rounded-[24px] font-black tracking-wide shadow-md flex items-center justify-center gap-4 transition-transform active:scale-95 text-2xl border border-blue-900 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                            <RefreshCcw size={32} className="group-hover:rotate-180 transition-transform duration-500" /> SYNC
                        </button>

                        <button onClick={() => setShowSystemSettings(true)} className="flex-[0.2] bg-white border border-slate-200 text-[#1d2d6a] hover:bg-slate-50 rounded-[24px] shadow-sm flex items-center justify-center transition-transform active:scale-95 group">
                            <Settings size={32} className="text-slate-500 group-hover:text-[#1d2d6a] group-hover:rotate-90 transition-all duration-500" />
                        </button>
                    </div>
                </div>

                {/* Modals */}
                <ServiceConfigModal
                    show={showServiceModal}
                    onClose={() => setShowServiceModal(false)}
                    trainNames={trainNames}
                    routes={routes}
                    jumlahKereta={jumlahKereta}
                    onSetService={handleSetService}
                    onSetGerbong={handleSetGerbong}
                    initialTrainNameIndex={trainNameIndex}
                />

                <SystemSettingsModal
                    show={showSystemSettings}
                    onClose={() => setShowSystemSettings(false)}
                    data={data}
                    currentStation={currentStation}
                    stations={stations}

                    masterSyncedNumber={masterSyncedNumber}
                    masterSyncedLedSpeed={masterSyncedLedSpeed}
                    onSetLedSpeed={handleSetLedSpeed}
                    ledType={ledType}
                    onSetLedType={setLedType}

                    showTVPreview={showTVPreview}
                    handleToggleTV={handleToggleTV}
                    handleLogout={handleLogout}
                    onUpdateDisplayPreferences={handleUpdateDisplayPreferences}
                />

                <TVMonitor show={showTVPreview} onClose={handleToggleTV} data={data} currentStation={currentStation} nextStation={nextStation} masterSyncedServiceName={masterSyncedServiceName} masterSyncedNumber={masterSyncedNumber} speed={speed} altitude={altitude} temp={temp} />
                <SelectorToast toast={toastMsg} onClose={() => setToastMsg(null)} />
            </div>
        </div>
    );
}

export default App;

