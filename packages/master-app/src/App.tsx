
import { useState, useEffect } from 'react';
import { usePidsData } from './hooks/usePidsData';
import { LayoutDashboard, Clock, AlertCircle, MapPin, Video, Database, Train, Activity, Compass, ScrollText, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginScreen } from './components/LoginScreen';
import { MasterConsolePanel } from './components/MasterConsolePanel';
import type { AuthUser, LogEntry } from '@eltran/pids-core';

const API_URL = 'http://localhost:3001';

// --- Monitor CCTV Component ---
const MonitorCCTV = ({ data: _data }: { data: any }) => {
    const cameras = [
        { id: 'CAM-01', location: 'GERBONG 05 - DEPAN', url: "https://img.harianjogja.com/posts/2024/03/26/1169359/kereta-api-ekonomi-generasi-baru.jpg" },
        { id: 'CAM-02', location: 'GERBONG 05 - BELAKANG', url: "https://image.fortuneidn.com/post/20250821/upload_e179f189ddfbf16b0482c14a7295b474_2940c5af-a990-4232-ad05-4c52dd5d0431.jpg" },
        { id: 'CAM-03', location: 'AREA BORDES - KIRI', url: "https://awsimages.detik.net.id/visual/2022/12/25/kereta-panoramic-kini-bisa-dicoba-oleh-masyarakat-umum-setelah-soft-launching-yang-dilakukan-pt-kereta-api-indonesia-pada-24-d-2_169.jpeg?w=1200" },
        { id: 'CAM-04', location: 'AREA BORDES - KANAN', url: "https://asset.kompas.com/crops/RRMwhqmwIwdwA3xhcoXZY6wdHjE=/0x0:999x666/1200x800/data/photo/2022/07/15/62d0ce5c7389a.jpeg" }
    ];
    const [currentCamIndex, setCurrentCamIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setCurrentCamIndex((prev) => (prev + 1) % cameras.length), 5000);
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { clearInterval(interval); clearInterval(clockTimer); };
    }, []);
    return (
        <div className="relative h-full w-full overflow-hidden rounded-[3rem] shadow-2xl border border-white/10 bg-black">
            <AnimatePresence mode="wait">
                <motion.div key={currentCamIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cameras[currentCamIndex].url})` }}>
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                </motion.div>
            </AnimatePresence>
            <motion.div animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-white/10 h-px z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/90 p-3 rounded-xl shadow-2xl"><img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-6" /></div>
                    <div className="flex flex-col text-white"><span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60 leading-none mb-1">Security System</span><span className="text-xl font-black italic tracking-tighter uppercase leading-none">CCTV MONITOR</span></div>
                </div>
                <div className="bg-black/60 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-end">
                    <div className="text-3xl font-black text-white font-mono tracking-tighter tabular-nums leading-none mb-1">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>
            <div className="absolute top-1/2 left-8 -translate-y-1/2 z-20"><div className="text-white/20 font-mono text-[80px] font-black leading-none select-none">{cameras[currentCamIndex].id}</div></div>
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-20">
                <div className="bg-black/80 backdrop-blur-3xl px-10 py-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center gap-6">
                    <div className="bg-blue-600 p-4 rounded-2xl shadow-lg"><Activity size={24} className="text-white" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase leading-none mb-2">Current Location</span><span className="text-2xl font-black text-white tracking-widest uppercase italic">{cameras[currentCamIndex].location}</span></div>
                </div>
            </div>
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
        </div>
    );
};

const MonitorGPS = ({ route }: { route: any }) => (
    <div className="relative h-full w-full overflow-hidden rounded-[3rem] shadow-2xl border border-white/10 bg-[#0a0f1e] flex flex-col">
        <div className="absolute inset-0 opacity-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1d2d6a_0%,transparent_50%)]" /></div>
        <div className="relative z-20 p-10 flex justify-between items-start">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" /><span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Live Tracking System</span></div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter">{route?.name ? <>{route.name.split(" ")[0]} <span className="text-orange-500">{route.name.split(" ").slice(1).join(" ")}</span></> : <span className="text-white/20">NO ROUTE ACTIVE</span>}</h3>
            </div>
        </div>
        <div className="relative flex-1 flex flex-col justify-center items-center px-20">
            <div className="w-full relative py-20">
                <svg className="w-full" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                    {route?.path && (<><path d={route.path} fill="none" stroke="#1d2d6a" strokeWidth="12" strokeLinecap="round" className="opacity-20 blur-md" /><path d={route.path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                        <motion.g initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} style={{ offsetPath: `path('${route.path}')` }}>
                            <circle r="8" fill="#ee6f1f" stroke="white" strokeWidth="2" /><circle r="4" fill="white" className="animate-pulse" />
                        </motion.g></>)}
                    {route?.nodes?.map((stn: any, i: number) => (
                        <g key={i} style={{ transform: `translate(${stn.pos.split(" ").slice(1).map((v: string) => v + "px").join(", ")})` }}>
                            <circle r="5" fill="#0a0f1e" stroke="#ee6f1f" strokeWidth="2" />
                            <text y="-15" textAnchor="middle" fill="white" className="text-[8px] font-black tracking-widest opacity-30 italic">{stn.label}</text>
                            <text y="25" textAnchor="middle" fill="white" className="text-[10px] font-black tracking-tighter uppercase">{stn.name}</text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
        <div className="bg-white/5 border-t border-white/5 p-8 flex justify-between items-center backdrop-blur-xl">
            <div className="flex gap-16">
                <div className="flex flex-col"><span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Current Coordinates</span><span className="text-xl font-black text-white font-mono tracking-tighter">-6.9147, 107.6098</span></div>
                <div className="flex flex-col border-l border-white/10 pl-16"><span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Speed (GPS)</span><div className="flex items-baseline gap-1"><span className="text-xl font-black text-orange-500 font-mono tracking-tighter animate-pulse">98.4</span><span className="text-[10px] font-black text-orange-500/50">km/h</span></div></div>
            </div>
            <div className="flex items-center gap-4 bg-orange-500/10 px-6 py-3 rounded-2xl border border-orange-500/20">
                <Compass size={18} className="text-orange-500" />
                <div className="flex flex-col"><span className="text-[8px] font-black text-orange-500/50 uppercase tracking-widest leading-none">Destination</span><span className="text-sm font-black text-white tracking-tighter italic">{route?.stations ? route.stations[route.stations.length - 1] : 'TERMINAL'}</span></div>
            </div>
        </div>
    </div>
);

// --- Log Viewer Component ---
const LogViewer = ({ token }: { token: string }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const ACTION_LABELS: Record<string, { label: string; color: string }> = {
        LOGIN: { label: 'Login', color: 'text-green-600 bg-green-50 border-green-100' },
        LOGIN_FAILED: { label: 'Login Gagal', color: 'text-red-600 bg-red-50 border-red-100' },
        LOGOUT: { label: 'Logout', color: 'text-slate-600 bg-slate-50 border-slate-200' },
        STATE_UPDATE: { label: 'Update State', color: 'text-blue-600 bg-blue-50 border-blue-100' },
        DISPLAY_MODE: { label: 'Mode Display', color: 'text-purple-600 bg-purple-50 border-purple-100' },
        LED_CONFIG: { label: 'LED Config', color: 'text-orange-600 bg-orange-50 border-orange-100' },
        ADMIN_CRUD: { label: 'Admin CRUD', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
        SYSTEM: { label: 'Sistem', color: 'text-slate-500 bg-slate-50 border-slate-200' },
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const filtered = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);
    const filterOptions = ['ALL', 'LOGIN', 'LOGIN_FAILED', 'STATE_UPDATE', 'LED_CONFIG', 'ADMIN_CRUD', 'SYSTEM'];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-[#1d2d6a] uppercase tracking-tight flex items-center gap-3">
                        <ScrollText className="text-[#ee6f1f]" />Log Aktivitas Sistem
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map(opt => (
                            <button key={opt} onClick={() => setFilter(opt)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${filter === opt ? 'bg-[#1d2d6a] text-white border-[#1d2d6a]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {opt === 'ALL' ? 'Semua' : ACTION_LABELS[opt]?.label || opt}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <div className="text-center py-16 text-slate-400 font-medium">Memuat log...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-medium">Belum ada log yang tercatat.</div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[#1d2d6a] font-black uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-4 border-b border-slate-200">Waktu</th>
                                    <th className="p-4 border-b border-slate-200">Aksi</th>
                                    <th className="p-4 border-b border-slate-200">Pengguna</th>
                                    <th className="p-4 border-b border-slate-200">Role</th>
                                    <th className="p-4 border-b border-slate-200">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.slice(0, 100).map(log => {
                                    const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-600 bg-slate-50 border-slate-200' };
                                    const dt = new Date(log.timestamp);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                                <div>{dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                <div className="font-bold text-slate-700">{dt.toLocaleTimeString('id-ID', { hour12: false })}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${meta.color}`}>{meta.label}</span>
                                            </td>
                                            <td className="p-4 font-bold text-[#1d2d6a]">{log.user}</td>
                                            <td className="p-4 text-slate-500 text-xs font-medium">{log.role}</td>
                                            <td className="p-4 text-slate-600 text-xs">{log.details}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length > 100 && <div className="p-4 text-center text-slate-400 text-xs font-medium border-t border-slate-100">Menampilkan 100 dari {filtered.length} entri log. Gunakan Command Center untuk melihat semua.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

function App() {
    const [activeTab, setActiveTab] = useState('pids');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState<string>('');

    const { data } = usePidsData();
    const activeTrainName = data.serviceName || 'ARGO WILIS';
    const activeTrainNumber = data.trainNumber || '05';
    const activeRoute = data.activeRoute || {
        name: 'ARGO WILIS',
        stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
        path: "M 80 220 C 150 220, 180 180, 220 180 S 350 220, 400 220 S 480 180, 520 180 S 580 220, 620 220 S 720 150, 750 150",
        nodes: [
            { pos: "M 80 220", label: "BD", name: "BANDUNG" },
            { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
            { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
            { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
            { pos: "M 620 220", label: "MN", name: "MADIUN" },
            { pos: "M 750 150", label: "SGU", name: "SURABAYA GUBENG" }
        ],
    };

    // Check persisted session on mount
    useEffect(() => {
        const token = sessionStorage.getItem('pids_token');
        const userStr = sessionStorage.getItem('pids_user');
        if (token && userStr) {
            try {
                // Verify token with server
                fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(d => {
                        if (d.success) {
                            setAuthToken(token);
                            setAuthUser(JSON.parse(userStr));
                        } else {
                            sessionStorage.removeItem('pids_token');
                            sessionStorage.removeItem('pids_user');
                        }
                    }).catch(() => {
                        // Server not yet up, trust local session
                        setAuthToken(token);
                        setAuthUser(JSON.parse(userStr));
                    });
            } catch { }
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


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
        setActiveTab('pids');
    };

    // Auth guard
    if (!authUser) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    const NAV_ITEMS = [
        { id: 'pids', icon: LayoutDashboard, label: 'PIDS' },
        { id: 'stampformasi', icon: Database, label: 'STAMPFORMASI' },
        { id: 'tv', icon: Video, label: 'CCTV' },
        { id: 'gps', icon: MapPin, label: 'GPS MAP' },
        { id: 'logs', icon: ScrollText, label: 'Log Aktivitas' },
    ];

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-[#1d2d6a] flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] z-20">
                <div className="px-10 py-12 mb-4">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-8 w-auto mb-4 brightness-0 invert"
                    />
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight">PIDS MASTER</h1>
                    <p className="text-[9px] font-bold text-blue-200/40 uppercase tracking-widest mt-0.5">Central Processing System</p>
                </div>

                {/* User info */}
                <div className="px-6 pb-6">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                        <div className="bg-[#ee6f1f] p-2 rounded-xl shadow-[0_4px_12px_rgba(238,111,31,0.3)]">
                            <Shield size={16} className="text-white" />
                        </div>
                        <div>
                            <div className="text-white font-black text-sm leading-none mb-0.5">{authUser.nama}</div>
                            <div className="text-blue-200/40 text-[10px] font-bold uppercase tracking-widest">{authUser.role}</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5">
                    <ul className="space-y-2">
                        {NAV_ITEMS.map((item) => (
                            <li key={item.id}>
                                <button onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold ${activeTab === item.id ? 'bg-[#ee6f1f] text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)] scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                                    <item.icon size={22} strokeWidth={2.5} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-6 space-y-3 mt-auto border-t border-white/5 bg-black/5">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 active:scale-95 group">
                        <LogOut size={16} className="text-white/20 group-hover:text-red-400 transition-colors" />
                        <span>Logout dari Sistem</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Train className="text-[#1d2d6a]" size={20} /></div>
                        <div>
                            <h1 className="text-lg font-black text-[#1d2d6a] uppercase tracking-tight leading-none mb-1">Master Controller</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
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
                            <div className="bg-slate-50 p-2 rounded-lg text-slate-400"><Clock size={18} /></div>
                            <span className="text-2xl font-black font-mono tracking-tighter opacity-90">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-10 bg-[#f8fafc]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'pids' ? (
                            <motion.div key="pids" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="max-w-7xl mx-auto">
                                <MasterConsolePanel route={activeRoute} data={data} />
                            </motion.div>
                        ) : activeTab === 'stampformasi' ? (
                            <motion.div key="stampformasi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="max-w-6xl mx-auto space-y-10">
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                    <h2 className="text-xl font-black text-[#1d2d6a] mb-8 uppercase tracking-tight flex items-center gap-3">
                                        <Database className="text-[#ee6f1f]" />Stampformasi
                                    </h2>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-[#1d2d6a] font-black uppercase tracking-wider">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200">No Rangkaian</th>
                                                    <th className="p-4 border-b border-slate-200">No Aset</th>
                                                    <th className="p-4 border-b border-slate-200">Nama Layanan (Service)</th>
                                                    <th className="p-4 border-b border-slate-200">IP Address</th>
                                                    <th className="p-4 border-b border-slate-200">Last Report</th>
                                                    <th className="p-4 border-b border-slate-200 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {(data.stations || activeRoute?.stations || []).map((_station: string, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-bold text-slate-700">K1-{String(idx + 1).padStart(2, '0')}</td>
                                                        <td className="p-4 font-mono text-slate-500">K1{String(idx + 1).padStart(2, '0')}{String(800 + idx)}</td>
                                                        <td className="p-4 font-bold text-[#1d2d6a]">{activeTrainName}</td>
                                                        <td className="p-4 font-mono text-slate-500">192.168.1.{100 + idx}</td>
                                                        <td className="p-4 font-mono text-slate-500">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-wide border border-green-100">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        ) : activeTab === 'tv' ? (
                            <motion.div key="tv" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="h-full w-full max-w-6xl mx-auto">
                                <MonitorCCTV data={data} />
                            </motion.div>
                        ) : activeTab === 'gps' ? (
                            <motion.div key="gps" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="h-full w-full max-w-6xl mx-auto">
                                <MonitorGPS route={activeRoute} />
                            </motion.div>
                        ) : activeTab === 'logs' ? (
                            <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                <LogViewer token={authToken} />
                            </motion.div>
                        ) : (
                            <motion.div key="under-construction" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
                                <div className="bg-white p-12 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 border border-slate-100 max-w-md w-full">
                                    <div className="bg-orange-50 p-6 rounded-3xl text-[#ee6f1f]"><AlertCircle size={48} /></div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-black text-[#1d2d6a] mb-2 uppercase tracking-tight">Access Restricted</h2>
                                        <p className="text-sm font-medium text-slate-400 leading-relaxed">Module <span className="text-[#1d2d6a]">{activeTab}</span> sedang dalam pemeliharaan.</p>
                                    </div>
                                    <button onClick={() => setActiveTab('pids')} className="w-full mt-4 px-8 py-4 bg-slate-900 hover:bg-black text-white text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95">Return to Dashboard</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

export default App;
