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
import { Train, Clock, Settings, ChevronsUp, ChevronsDown, RefreshCcw, Navigation, Route, ChevronRight, ChevronDown } from 'lucide-react';
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
    const [kaDropdownOpen, setKaDropdownOpen] = useState(false);
    const kaDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const idx = trainNames.indexOf(masterSyncedServiceName);
        if (idx !== -1) setTrainNameIndex(idx);
    }, [masterSyncedServiceName, trainNames]);

    // Close KA dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (kaDropdownRef.current && !kaDropdownRef.current.contains(e.target as Node)) {
                setKaDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    // Direction for Malabar (KA 67 / KA 68)
    const [activeKa, setActiveKa] = useState<'ka67' | 'ka68'>('ka68');

    const getScheduledTime = useCallback((stationName: any) => {
        const name = typeof stationName === 'object' && stationName !== null ? stationName.name : stationName;
        const nameStr = String(name ?? '');
        const activeRoute = data?.activeRoute as any;
        if (!activeRoute?.features || !nameStr) return null;
        const stationFeature = activeRoute.features.find((f: any) =>
            f.geometry.type === 'Point' && String(f.properties.name ?? '').toUpperCase() === nameStr.toUpperCase()
        );
        if (!stationFeature) return null;
        return stationFeature.properties[`schedule_${activeKa}`];
    }, [data?.activeRoute, activeKa]);

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

    const handleSetConfig = useCallback((serviceName: string, routeData: any, newStations: string[], gerbong: number) => {
        if (newStations.length > 0) { setStations(newStations); setCurrentIndex(0); }
        sendData({
            serviceName,
            stations: newStations,
            activeRoute: routeData,
            trainNumber: `Gerbong ${gerbong}`
        });
        showNotification('Configuration Saved', `Service set to ${serviceName}, Unit to Gerbong ${gerbong}`);
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

    const getStationName = (s: any) => typeof s === 'object' && s !== null ? s.name : s;
    const currentStation = getStationName(stations[currentIndex]) || 'INITIALIZING SYNC...';
    const nextStation = getStationName(stations[(currentIndex + 1) % stations.length]) || '---';

    // ---- Auth guard ----
    if (!authUser) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-[#f4f7f9] text-slate-900 font-sans overflow-hidden select-none">
            {/* ========== TOP BAR ========== */}
            <header className="h-[90px] bg-[#1d2d6a] text-white flex items-center px-6 shadow-md shrink-0 justify-between">
                {/* Service Configuration Button*/}
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setShowServiceModal(true)}
                        className="flex items-center gap-4 text-left group transition-all active:scale-95"
                    >
                        <div className="w-[56px] h-[56px] bg-white rounded-[14px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                            <Train className="text-[#1d2d6a]" size={32} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-200/80 tracking-[0.25em] uppercase">Service Config</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold uppercase tracking-tight group-hover:text-blue-100 transition-colors truncate">{masterSyncedServiceName || 'NOT SET'}</h1>
                                <ChevronRight className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" size={24} />
                            </div>
                        </div>
                    </button>

                    {/* Direction Dropdown for Malabar */}
                    {(masterSyncedServiceName?.toUpperCase().includes('MALABAR')) && (
                        <div className="relative min-w-[200px]" ref={kaDropdownRef}>
                            <button
                                onClick={() => setKaDropdownOpen(!kaDropdownOpen)}
                                className={`w-full bg-white/10 border-2 rounded-xl px-4 py-2 shadow-lg transition-all flex items-center justify-between group ${kaDropdownOpen ? 'border-[#ee6f1f] bg-white/20' : 'border-white/10 hover:border-white/20'}`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-bold text-blue-200/60 tracking-widest uppercase">Select Direction</span>
                                    <span className="text-sm font-bold text-white uppercase tracking-tight">
                                        {activeKa === 'ka68' ? 'KA 68 (BD-ML)' : 'KA 67 (ML-BD)'}
                                    </span>
                                </div>
                                <ChevronDown size={18} strokeWidth={2.5} className={`text-blue-200/60 transition-transform ${kaDropdownOpen ? 'rotate-180 text-[#ee6f1f]' : ''}`} />
                            </button>

                            {kaDropdownOpen && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1">
                                    <button 
                                        onClick={() => { setActiveKa('ka68'); setKaDropdownOpen(false); }}
                                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${activeKa === 'ka68' ? 'bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'text-[#1d2d6a] hover:bg-slate-50'}`}
                                    >
                                        KA 68 (BD-ML)
                                    </button>
                                    <button 
                                        onClick={() => { setActiveKa('ka67'); setKaDropdownOpen(false); }}
                                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${activeKa === 'ka67' ? 'bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'text-[#1d2d6a] hover:bg-slate-50'}`}
                                    >
                                        KA 67 (ML-BD)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mb-0.5">Category</span>
                        <span className="text-2xl font-bold tracking-tight uppercase leading-none">{masterSyncedServiceName ? 'REGULAR' : '---'}</span>
                    </div>

                    <div className="w-px h-10 bg-white/20 mx-2" />

                    <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mb-0.5">Unit</span>
                        <span className="text-2xl font-bold tracking-widest uppercase leading-none">{masterSyncedNumber || '---'}</span>
                    </div>

                    {/* Destination Section - Flex Optimized */}
                    <div className="flex items-center gap-4 bg-[#ee6f1f] py-2 px-6 rounded-2xl shadow-lg border border-white/20 max-w-[350px] flex-1">
                        <div className="flex flex-col items-end min-w-0 flex-1">
                            <span className="text-2xl font-bold text-white tracking-tight uppercase truncate w-full text-right">
                                {stations.length > 0 ? getStationName(stations[stations.length - 1]) : '---'}
                            </span>
                        </div>
                        <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0">
                            <Navigation size={24} className="text-white rotate-45" />
                        </div>
                    </div>
                </div>
            </header>

            {/* ========== MAIN CONTENT ========== */}
            <div className="flex gap-4 p-4 flex-1 min-h-0">

                {/* LEFT COLUMN - Information Display (65%) */}
                <div className="flex-[0.65] flex flex-col gap-6">
                    {/* CURRENT STATION */}
                    <div className="bg-gradient-to-r from-[#1d2d6a] to-[#2a3f8c] rounded-[24px] shadow-sm p-6 border border-slate-200 flex flex-col">
                        <div className="flex items-center gap-3 text-[#ffffff] font-bold text-xl tracking-widest uppercase mb-3">
                            <Navigation size={18} className="text-[#ee6f1f]" /> CURRENT POSITION
                        </div>
                        <h2 className="text-5xl font-bold text-white tracking-tight uppercase leading-[1.1] line-clamp-2 break-words">{currentStation}</h2>
                    </div>

                    {/* ITINERARY */}
                    <div className="bg-white rounded-[24px] shadow-sm py-5 px-6 border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center gap-3 text-slate-400 font-bold text-sm tracking-widest uppercase mb-3 shrink-0">
                            <Route size={18} /> DETAILED ROUTES
                        </div>

                        <div className="relative pl-[30px] pr-2 mt-2 flex-1 flex flex-col justify-start">
                            {/* Vertical Line */}
                            <div className="absolute left-[61px] top-[40px] bottom-6 w-[4px] bg-slate-100 rounded-full" />

                            {/* Next Stop */}
                            <div className="flex items-center gap-6 mb-4 relative z-10 w-full shrink-0">
                                <div className="w-[68px] h-[68px] bg-white border-[3px] border-[#1d2d6a] rounded-[22px] flex items-center justify-center flex-shrink-0 shadow-sm relative z-10 mt-2">
                                    <Train className="text-[#1d2d6a]" size={36} />
                                </div>
                                <div className="flex-1 bg-[white] rounded-3xl p-5 border-[2px] border-[#1d2d6a] shadow-md flex justify-between items-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                    <div className="flex flex-col relative z-10 text-slate-400">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Next Station</span>
                                        <span className="text-3xl text-slate-700 font-bold tracking-tight uppercase shrink-0 min-w-0 pr-4">{nextStation}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end relative z-10 shrink-0">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">ETA</span>
                                        <span className="text-3xl font-bold text-slate-600">
                                            {getScheduledTime(nextStation) || (stations.length > 0 ? new Date(currentTime.getTime() + 15 * 60000).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace('.', ':') : '--:--')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming Stops Generator */}
                            {stations.length > 2 && (() => {
                                const renderUpcoming = [];
                                // i = 1 is the Next Station already featured above, so we start from i = 2
                                for (let i = 2; i < Math.min(stations.length, 5); i++) {
                                    const upcomingStationObj = stations[(currentIndex + i) % stations.length];
                                    const upcomingStationName = getStationName(upcomingStationObj);
                                    if (upcomingStationObj !== stations[stations.length - 1] && upcomingStationObj !== stations[currentIndex]) {
                                        renderUpcoming.push(
                                            <div key={`upcoming-${i}`} className="flex items-center gap-6 relative z-10 w-full mb-3 shrink-0">
                                                <div className="w-[68px] flex justify-center relative z-10">
                                                    <div className="w-[20px] h-[20px] bg-slate-300 rounded-full border-[5px] border-white shadow-sm mt-3" />
                                                </div>
                                                <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex justify-between items-center transition-all hover:border-slate-300 hover:scale-[1.01] hover:shadow-md">                                                     <div className="flex flex-col">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">UPCOMING STATION</span>
                                                    <span className="text-lg font-semibold text-slate-700 uppercase tracking-tight">{upcomingStationName}</span>
                                                </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">ETA</span>
                                                        <span className="text-xl font-semibold text-slate-600">
                                                            {getScheduledTime(upcomingStationName) || new Date(currentTime.getTime() + (15 * i) * 60000).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
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
                    <div className="flex gap-3 h-[80px] shrink-0">
                        {/* SETTINGS BUTTON */}
                        <button
                            onClick={() => setShowSystemSettings(true)}
                            className="w-[80px] h-[80px] bg-white border border-slate-200 text-[#1d2d6a] hover:bg-slate-50 rounded-[24px] shadow-sm flex items-center justify-center transition-all active:scale-95 group shrink-0"
                        >
                            <Settings size={32} className="text-[#1d2d6a] group-hover:text-[#1d2d6a] group-hover:rotate-90 transition-all duration-500" />
                        </button>

                        {/* TIMESTAMP STATUS */}
                        <div className="flex-1 bg-white rounded-[24px] shadow-sm flex items-center px-6 border border-slate-200 gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 text-[#ee6f1f] flex items-center justify-center shrink-0">
                                <Clock size={26} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col border-r border-slate-100 pr-6">
                                <span className="text-[#1d2d6a] font-bold text-3xl tracking-tighter leading-none">
                                    {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                                </span>
                            </div>
                            <div className="flex flex-col flex-1 justify-center text-right">
                                <span className="text-[#1d2d6a] font-semibold text-3xl tracking-tighter uppercase leading-none">
                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - Action Controls (35%) */}
                <div className="flex-[0.35] flex flex-col gap-6">
                    <button onClick={handlePrev} className="flex-1 bg-[#ee6f1f] hover:bg-[#ee6f1f] text-white rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-all active:scale-95 group overflow-hidden">
                        <ChevronsUp size={72} className="transition-transform group-hover:-translate-y-2 stroke-[3]" />
                        <span className="text-3xl font-bold uppercase tracking-tight text-white">Previous Station</span>
                    </button>

                    <button onClick={handleNext} className="flex-1 bg-[#ee6f1f] hover:bg-[#ee6f1f] text-white rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-all active:scale-95 group overflow-hidden">
                        <span className="text-3xl font-bold uppercase tracking-tight">Next Station</span>
                        <ChevronsDown size={72} className="transition-transform group-hover:translate-y-2 stroke-[3]" />
                    </button>

                    <div className="flex mt-2 h-[80px]">
                        <button onClick={handleSelectStation} className="flex-1 bg-[#1d2d6a] hover:bg-[#152353] text-white rounded-[24px] font-bold tracking-wide shadow-md flex items-center justify-center gap-4 transition-transform active:scale-95 text-2xl border border-blue-900 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                            <RefreshCcw size={32} className="group-hover:rotate-180 transition-transform duration-500" /> SYNC DATA TO DISPLAY
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
                    onSetConfig={handleSetConfig}
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
                />

                <TVMonitor show={showTVPreview} onClose={handleToggleTV} data={data} currentStation={currentStation} nextStation={nextStation} masterSyncedServiceName={masterSyncedServiceName} masterSyncedNumber={masterSyncedNumber} speed={speed} altitude={altitude} temp={temp} />
                <SelectorToast toast={toastMsg} onClose={() => setToastMsg(null)} />
            </div>
        </div>
    );
}

export default App;

