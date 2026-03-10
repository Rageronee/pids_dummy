import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Train, MapPin, Users, ScrollText,
    LogOut, Clock, Shield, Building2, Calendar
} from 'lucide-react';
import { API } from './config';

// Lazy-loaded pages for code splitting (faster initial load on server)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TrainsPage = lazy(() => import('./pages/TrainsPage'));
const RoutesPage = lazy(() => import('./pages/RoutesPage'));
const StationsPage = lazy(() => import('./pages/StationsPage'));
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage')); // Login system page

interface AuthUser { id: string; username: string; role: string; nama: string; }

const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trains', label: 'Manajemen Kereta', icon: Train },
    { id: 'routes', label: 'Manajemen Rute', icon: MapPin },
    { id: 'schedules', label: 'Jadwal Kereta', icon: Calendar },
    { id: 'users', label: 'Akun Operator', icon: Users },
    { id: 'logs', label: 'System Logs', icon: ScrollText },
];

function PageLoader() {
    return <div className="flex items-center justify-center h-64 text-slate-400 font-bold text-base animate-pulse">Memuat halaman...</div>;
}

export default function App() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState('');
    const [activePage, setActivePage] = useState('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Restore session
    useEffect(() => {
        const token = sessionStorage.getItem('cc_token');
        const userStr = sessionStorage.getItem('cc_user');
        if (token && userStr) {
            fetch(`${API}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if (d.success && d.user.role === 'Admin') { setAuthToken(token); setAuthUser(JSON.parse(userStr)); }
                    else { sessionStorage.removeItem('cc_token'); sessionStorage.removeItem('cc_user'); }
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr ?? '')); });
        }
    }, []);

    // Clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const handleLogin = (user: AuthUser, token: string) => { setAuthUser(user); setAuthToken(token); };

    const handleLogout = async () => {
        try { await fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch { }
        sessionStorage.removeItem('cc_token');
        sessionStorage.removeItem('cc_user');
        setAuthUser(null); setAuthToken('');
    };

    if (!authUser) return <Suspense fallback={<PageLoader />}><LoginPage onLogin={handleLogin} /></Suspense>;

    const pages: Record<string, React.ReactNode> = {
        dashboard: <DashboardPage token={authToken} />,
        trains: <TrainsPage token={authToken} />,
        routes: <RoutesPage token={authToken} />,
        schedules: <SchedulesPage token={authToken} />,
        users: <UsersPage token={authToken} />,
        logs: <LogsPage token={authToken} />,
    };

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 bg-[#1d2d6a] border-r border-blue-900 flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] relative z-10">
                <div className="p-8 pb-10">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI Logo" className="h-10 w-auto mb-6 brightness-0 invert" />
                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Command Center</h1>
                    <p className="text-xs font-bold text-blue-200/40 mt-1 font-mono">Control Panel</p>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {NAV.map(item => (
                        <button key={item.id} onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-base ${activePage === item.id ? 'bg-[#ee6f1f] text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                            <item.icon size={22} strokeWidth={2.5} />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-white/5 bg-black/10">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-xs border border-white/5 active:scale-95 group">
                        <LogOut size={18} className="text-white/20 group-hover:text-red-400 transition-colors" />
                        <span>Logout dari Sistem</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col relative bg-slate-50/50">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Shield className="text-[#1d2d6a]" size={20} /></div>
                        <div>
                            <h1 className="text-xl font-black text-[#1d2d6a] tracking-tight leading-none mb-1.5">Command Center</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">{NAV.find(n => n.id === activePage)?.label}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <span className="text-xs font-bold text-slate-400">Active session</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 text-[#1d2d6a]">
                            <div className="bg-slate-50 p-2.5 rounded-xl text-slate-400"><Clock size={20} /></div>
                            <span className="text-3xl font-black font-mono tracking-tighter opacity-90">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-10 overflow-auto">
                    <AnimatePresence mode="wait">
                        <motion.div key={activePage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                            <Suspense fallback={<PageLoader />}>{pages[activePage]}</Suspense>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
