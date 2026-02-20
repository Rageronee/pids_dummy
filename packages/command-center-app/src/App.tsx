import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Train, MapPin, Users, ScrollText,
    LogOut, Plus, Trash2, Eye, EyeOff, Lock, User as UserIcon,
    AlertCircle, CheckCircle2, Activity, Clock, Shield,
    ChevronRight, RefreshCcw, X, Server, Wifi
} from 'lucide-react';

const API = 'http://localhost:3001';

// ============================================================
// TYPES
// ============================================================
interface AuthUser { id: string; username: string; role: string; nama: string; }
interface LogEntry { id: string; timestamp: string; action: string; user: string; role: string; details: string; }

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onLogin }: { onLogin: (user: AuthUser, token: string) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const d = await res.json();
            if (!d.success) { setError(d.error || 'Login gagal'); return; }
            if (d.user.role !== 'Admin') { setError('Akses ditolak. Command Center hanya untuk Admin.'); return; }
            sessionStorage.setItem('cc_token', d.token);
            sessionStorage.setItem('cc_user', JSON.stringify(d.user));
            onLogin(d.user, d.token);
        } catch { setError('Tidak bisa terhubung ke server. Pastikan Master App aktif.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#1d2d6a08 1px,transparent 1px),linear-gradient(90deg,#1d2d6a08 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1d2d6a25_0%,transparent_65%)]" />
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-[#0d1526]/95 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                    <div className="bg-gradient-to-br from-[#1d2d6a] to-[#0d1a4a] p-10 text-center relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI" className="h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight mb-1">PIDS Command Center</h1>
                        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full mt-2">
                            <Shield size={12} className="text-[#ee6f1f]" />
                            <p className="text-[#ee6f1f] text-[10px] font-black uppercase tracking-[0.3em]">Admin Access Only</p>
                        </div>
                    </div>
                    <div className="p-10">
                        <form onSubmit={submit} className="space-y-5">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"><UserIcon size={18} /></div>
                                <input type="text" placeholder="Username Admin" value={username} onChange={e => setUsername(e.target.value)} disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-[#ee6f1f]/60 transition-all" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"><Lock size={18} /></div>
                                <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-[#ee6f1f]/60 transition-all" />
                                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <AnimatePresence>
                                {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-red-400 text-xs font-medium">{error}</p>
                                </motion.div>}
                            </AnimatePresence>
                            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                                className="w-full py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-white/10 disabled:text-white/30 text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifikasi...</> : <><Shield size={18} />Masuk Command Center</>}
                            </motion.button>
                        </form>
                        <p className="text-center text-white/20 text-[10px] font-bold uppercase tracking-widest mt-8">Demo: admin / admin123</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
function DashboardPage({ token }: { token: string }) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/status`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setStatus(d.status);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetch_(); const t = setInterval(fetch_, 5000); return () => clearInterval(t); }, [fetch_]);

    const ACTION_COLOR: Record<string, string> = {
        LOGIN: 'text-green-400', LOGIN_FAILED: 'text-red-400', LOGOUT: 'text-slate-400',
        STATE_UPDATE: 'text-blue-400', DISPLAY_MODE: 'text-purple-400',
        LED_CONFIG: 'text-orange-400', ADMIN_CRUD: 'text-indigo-400', SYSTEM: 'text-slate-500',
    };

    const cards = loading ? [] : [
        { label: 'Active Route', value: status?.currentState?.stationName || '-', sub: `No. ${status?.currentState?.trainNumber || '-'}`, icon: Train, color: 'bg-blue-500' },
        { label: 'Active Sessions', value: status?.activeSessions ?? 0, sub: 'Login aktif', icon: Users, color: 'bg-green-500' },
        { label: 'Total Log Entries', value: status?.totalLogs ?? 0, sub: 'Semua aktivitas', icon: ScrollText, color: 'bg-orange-500' },
        { label: 'Server Uptime', value: status ? `${Math.floor(status.uptime / 60)}m` : '-', sub: 'Sejak start', icon: Server, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">Dashboard Overview</h2>
                <p className="text-white/30 text-sm font-medium">Status sistem PIDS secara real-time</p>
            </div>
            <div className="grid grid-cols-4 gap-6">
                {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse" />) : cards.map((c, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="bg-white/5 border border-white/8 rounded-3xl p-6 flex flex-col gap-4 hover:bg-white/8 transition-colors">
                        <div className={`w-10 h-10 ${c.color} rounded-2xl flex items-center justify-center`}><c.icon size={20} className="text-white" /></div>
                        <div>
                            <div className="text-3xl font-black text-white tracking-tight">{String(c.value)}</div>
                            <div className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{c.label}</div>
                            <div className="text-white/25 text-[10px] font-medium mt-0.5">{c.sub}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Latest log */}
            {status?.lastLog && (
                <div className="bg-white/5 border border-white/8 rounded-3xl p-6">
                    <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} /> Log Terakhir</h3>
                    <div className="flex items-start gap-4">
                        <div className={`text-sm font-black ${ACTION_COLOR[status.lastLog.action] || 'text-white/40'}`}>{status.lastLog.action}</div>
                        <div className="text-white/40 text-sm">{status.lastLog.details}</div>
                        <div className="ml-auto text-white/25 text-xs font-mono whitespace-nowrap">{new Date(status.lastLog.timestamp).toLocaleTimeString('id-ID')}</div>
                    </div>
                </div>
            )}

            {/* Connection status */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { name: 'Master API Server', port: '3001', ok: !!status },
                    { name: 'Selector App', port: '5174', ok: true },
                    { name: 'LED Display App', port: '5175', ok: true },
                ].map((unit, i) => (
                    <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${unit.ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        <div>
                            <div className="text-white font-bold text-sm">{unit.name}</div>
                            <div className="text-white/30 text-xs font-mono">:{unit.port}</div>
                        </div>
                        <Wifi size={16} className={`ml-auto ${unit.ok ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// TRAINS PAGE
// ============================================================
function TrainsPage({ token }: { token: string }) {
    const [trains, setTrains] = useState<string[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const fetchTrains = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/trains`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setTrains(d.trains);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchTrains(); }, [fetchTrains]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        try {
            const res = await fetch(`${API}/api/admin/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newName.trim() }) });
            const d = await res.json();
            if (d.success) { setTrains(d.trains); setNewName(''); showToast('Kereta berhasil ditambahkan', true); }
            else showToast(d.error || 'Gagal menambahkan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setAdding(false); }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Hapus kereta "${name}"?`)) return;
        try {
            const res = await fetch(`${API}/api/admin/trains/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { setTrains(d.trains); showToast(`"${name}" dihapus`, true); }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-1">Manajemen Kereta</h2>
                    <p className="text-white/30 text-sm">{trains.length} kereta terdaftar dalam sistem</p>
                </div>
                <button onClick={fetchTrains} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all"><RefreshCcw size={16} /></button>
            </div>

            {/* Add new */}
            <div className="bg-white/5 border border-white/8 rounded-3xl p-6 flex gap-4">
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Nama kereta baru (e.g. GAJAYANA)" maxLength={50}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 font-medium text-sm focus:outline-none focus:border-[#ee6f1f]/60 transition-all uppercase" />
                <button onClick={handleAdd} disabled={adding || !newName.trim()}
                    className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-white/10 disabled:text-white/20 text-white font-black rounded-2xl text-sm uppercase tracking-wide transition-all flex items-center gap-2 active:scale-95">
                    <Plus size={18} />{adding ? 'Menambahkan...' : 'Tambah'}
                </button>
            </div>

            {/* List */}
            <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
                {loading ? <div className="p-8 text-center text-white/30 text-sm">Memuat data...</div> : trains.length === 0 ? (
                    <div className="p-8 text-center text-white/30 text-sm">Belum ada kereta terdaftar.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {trains.map((name, i) => (
                            <motion.div key={name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors group">
                                <div className="w-8 h-8 bg-[#1d2d6a] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Train size={15} className="text-blue-300" />
                                </div>
                                <span className="text-white font-bold flex-1 tracking-wide">{name}</span>
                                <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">#{String(i + 1).padStart(2, '0')}</span>
                                <button onClick={() => handleDelete(name)}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95">
                                    <Trash2 size={15} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
// ROUTES PAGE
// ============================================================
function RoutesPage({ token }: { token: string }) {
    const [routes, setRoutes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newRouteName, setNewRouteName] = useState('');
    const [newStations, setNewStations] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const fetchRoutes = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/routes`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setRoutes(d.routes);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

    const handleSave = async () => {
        const stationsArr = newStations.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (!newRouteName.trim() || stationsArr.length < 2) { showToast('Nama rute dan minimal 2 stasiun diperlukan', false); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newRouteName.trim(), stations: stationsArr }) });
            const d = await res.json();
            if (d.success) { await fetchRoutes(); setShowForm(false); setNewRouteName(''); setNewStations(''); showToast('Rute berhasil disimpan', true); }
            else showToast(d.error || 'Gagal menyimpan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Hapus rute "${name}"?`)) return;
        try {
            const res = await fetch(`${API}/api/admin/routes/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { await fetchRoutes(); showToast(`Rute "${name}" dihapus`, true); }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); }
    };

    const routeList = Object.values(routes);

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-1">Manajemen Rute & Stasiun</h2>
                    <p className="text-white/30 text-sm">{routeList.length} rute terdaftar</p>
                </div>
                <button onClick={() => setShowForm(v => !v)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 ${showForm ? 'bg-white/10 text-white/60' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15]'}`}>
                    {showForm ? <><X size={16} />Batal</> : <><Plus size={16} />Tambah Rute</>}
                </button>
            </div>

            {/* Add form */}
            <AnimatePresence>
                {showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white/5 border border-[#ee6f1f]/20 rounded-3xl p-6 space-y-4 overflow-hidden">
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Rute Baru</h3>
                    <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nama rute (e.g. GAJAYANA)" maxLength={60}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 font-medium text-sm focus:outline-none focus:border-[#ee6f1f]/60 transition-all uppercase" />
                    <textarea value={newStations} onChange={e => setNewStations(e.target.value)} rows={3} placeholder="Stasiun dipisah koma: MALANG, BLITAR, KEDIRI, MADIUN, YOGYAKARTA, BANDUNG"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 font-medium text-sm focus:outline-none focus:border-[#ee6f1f]/60 transition-all resize-none" />
                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-white/10 text-white font-black rounded-2xl text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center gap-2">
                            {saving ? 'Menyimpan...' : <><CheckCircle2 size={16} />Simpan Rute</>}
                        </button>
                        <p className="text-white/25 text-xs self-center flex-1">SVG path rute akan digenerate otomatis</p>
                    </div>
                </motion.div>}
            </AnimatePresence>

            {/* Routes list */}
            {loading ? <div className="p-8 text-center text-white/30">Memuat rute...</div> : (
                <div className="grid grid-cols-1 gap-4">
                    {routeList.map((route: any, i) => (
                        <motion.div key={route.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white/5 border border-white/8 rounded-3xl p-6 group hover:bg-white/8 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 bg-[#1d2d6a] rounded-xl flex items-center justify-center"><MapPin size={15} className="text-blue-300" /></div>
                                        <h3 className="text-white font-black tracking-wide">{route.name}</h3>
                                        <span className="text-white/25 text-[10px] font-bold">{route.stations?.length || 0} STASIUN</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {route.stations?.map((s: string, j: number) => (
                                            <span key={j} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg text-white/60 text-[11px] font-bold">
                                                {j > 0 && <ChevronRight size={10} className="text-white/20" />}{s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(route.name)} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex-shrink-0 active:scale-95">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
// USERS PAGE
// ============================================================
function UsersPage({ token }: { token: string }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { if (d.success) setUsers(d.users); }).catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">Manajemen Pengguna</h2>
                <p className="text-white/30 text-sm">Daftar pengguna terdaftar dalam sistem PIDS</p>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
                <div className="grid grid-cols-4 gap-0 px-6 py-3 bg-white/5 border-b border-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest">
                    <span>ID</span><span>Nama</span><span>Username</span><span>Role</span>
                </div>
                {loading ? <div className="p-8 text-center text-white/30 text-sm">Memuat pengguna...</div> : users.map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                        className="grid grid-cols-4 gap-0 px-6 py-5 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
                        <span className="text-white/30 font-mono text-sm">{u.id}</span>
                        <span className="text-white font-bold">{u.nama}</span>
                        <span className="text-white/60 font-mono text-sm">{u.username}</span>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-black uppercase w-fit ${u.role === 'Admin' ? 'bg-[#ee6f1f]/20 text-[#ee6f1f]' : 'bg-blue-500/20 text-blue-400'}`}>
                            <Shield size={10} />{u.role}
                        </span>
                    </motion.div>
                ))}
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5 text-white/30 text-xs font-medium">
                <strong className="text-white/50">Catatan:</strong> Manajemen pengguna (tambah/hapus/edit) pada implementasi produksi memerlukan endpoint tambahan dan UI form yang terpisah. Pada dummy ini, user dikelola melalui seed data di api.js.
            </div>
        </div>
    );
}

// ============================================================
// LOGS PAGE
// ============================================================
function LogsPage({ token }: { token: string }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const ACTION_META: Record<string, { label: string; color: string }> = {
        LOGIN: { label: 'Login', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
        LOGIN_FAILED: { label: 'Login Gagal', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
        LOGOUT: { label: 'Logout', color: 'text-slate-400 bg-white/5 border-white/10' },
        STATE_UPDATE: { label: 'Update State', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        DISPLAY_MODE: { label: 'Mode Display', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
        LED_CONFIG: { label: 'LED Config', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
        ADMIN_CRUD: { label: 'Admin CRUD', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
        SYSTEM: { label: 'Sistem', color: 'text-slate-500 bg-white/5 border-white/8' },
    };

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setLogs(d.logs);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchLogs(); const t = setInterval(fetchLogs, 5000); return () => clearInterval(t); }, [fetchLogs]);

    const filterOptions = ['ALL', ...Object.keys(ACTION_META)];
    const filtered = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-1">Log Sistem</h2>
                    <p className="text-white/30 text-sm">{logs.length} entri total · Auto-refresh setiap 5 detik</p>
                </div>
                <button onClick={fetchLogs} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all"><RefreshCcw size={16} /></button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {filterOptions.map(opt => (
                    <button key={opt} onClick={() => setFilter(opt)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${filter === opt ? 'bg-[#ee6f1f] text-white border-[#ee6f1f]' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'}`}>
                        {opt === 'ALL' ? 'Semua' : ACTION_META[opt]?.label || opt}
                        {opt !== 'ALL' && <span className="ml-2 text-white/40">{logs.filter(l => l.action === opt).length}</span>}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? <div className="p-8 text-center text-white/30">Memuat log...</div> : filtered.length === 0 ? (
                <div className="p-8 text-center text-white/30">Tidak ada log untuk filter ini.</div>
            ) : (
                <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
                    <div className="grid grid-cols-[140px_120px_100px_80px_1fr] gap-0 px-6 py-3 bg-white/5 border-b border-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest">
                        <span>Waktu</span><span>Aksi</span><span>Pengguna</span><span>Role</span><span>Keterangan</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                        {filtered.map((log, i) => {
                            const meta = ACTION_META[log.action] || { label: log.action, color: 'text-white/40 bg-white/5 border-white/8' };
                            const dt = new Date(log.timestamp);
                            return (
                                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                    className="grid grid-cols-[140px_120px_100px_80px_1fr] gap-0 px-6 py-3.5 hover:bg-white/5 transition-colors items-start">
                                    <div className="font-mono text-[11px]">
                                        <div className="text-white/50">{dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                                        <div className="text-white/30">{dt.toLocaleTimeString('id-ID', { hour12: false })}</div>
                                    </div>
                                    <div><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${meta.color}`}>{meta.label}</span></div>
                                    <span className="text-white/70 text-sm font-bold self-center">{log.user}</span>
                                    <span className="text-white/30 text-xs font-medium self-center">{log.role}</span>
                                    <span className="text-white/50 text-xs self-center leading-relaxed">{log.details}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                    <div className="px-6 py-3 bg-white/3 border-t border-white/5 text-white/20 text-[10px] font-medium">
                        Menampilkan {filtered.length} entri {filter !== 'ALL' && `(filter: ${ACTION_META[filter]?.label || filter})`}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// SIDEBAR NAV
// ============================================================
const NAV = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'trains', icon: Train, label: 'Kereta' },
    { id: 'routes', icon: MapPin, label: 'Rute & Stasiun' },
    { id: 'users', icon: Users, label: 'Pengguna' },
    { id: 'logs', icon: ScrollText, label: 'Log Sistem' },
];

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [authToken, setAuthToken] = useState('');
    const [activePage, setActivePage] = useState('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const token = sessionStorage.getItem('cc_token');
        const userStr = sessionStorage.getItem('cc_user');
        if (token && userStr) {
            fetch(`${API}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    if (d.success && d.user.role === 'Admin') { setAuthToken(token); setAuthUser(JSON.parse(userStr)); }
                    else { sessionStorage.removeItem('cc_token'); sessionStorage.removeItem('cc_user'); }
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr)); });
        }
    }, []);

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const handleLogin = (user: AuthUser, token: string) => { setAuthUser(user); setAuthToken(token); };

    const handleLogout = async () => {
        try { await fetch(`${API}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch { }
        sessionStorage.removeItem('cc_token');
        sessionStorage.removeItem('cc_user');
        setAuthUser(null);
        setAuthToken('');
    };

    if (!authUser) return <LoginPage onLogin={handleLogin} />;

    const pages: Record<string, React.ReactNode> = {
        dashboard: <DashboardPage token={authToken} />,
        trains: <TrainsPage token={authToken} />,
        routes: <RoutesPage token={authToken} />,
        users: <UsersPage token={authToken} />,
        logs: <LogsPage token={authToken} />,
    };

    return (
        <div className="flex h-screen w-full bg-[#070c18] text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0a0f1e] border-r border-white/5 flex flex-col">
                {/* Logo */}
                <div className="p-8">
                    <div className="bg-[#1d2d6a] p-4 rounded-2xl flex items-center gap-3 border border-[#253d90]">
                        <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg" alt="KAI" className="h-6" />
                        </div>
                        <div>
                            <div className="text-white font-black text-sm tracking-tight leading-none">Command Center</div>
                            <div className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">PIDS Admin</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-1">
                    {NAV.map(item => (
                        <button key={item.id} onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activePage === item.id ? 'bg-[#ee6f1f] text-white shadow-lg shadow-orange-900/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                            <item.icon size={20} strokeWidth={2.5} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Bottom: user + time + logout */}
                <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-white/20 text-xs font-mono">
                        <Clock size={12} />
                        {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#ee6f1f] rounded-xl flex items-center justify-center flex-shrink-0">
                                <Shield size={14} className="text-white" />
                            </div>
                            <div>
                                <div className="text-white font-black text-sm leading-none mb-0.5">{authUser.nama}</div>
                                <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{authUser.role}</div>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/15 hover:text-red-400 transition-all font-bold text-sm border border-white/5">
                        <LogOut size={16} />Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto p-10 bg-[#070c18]">
                <AnimatePresence mode="wait">
                    <motion.div key={activePage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        {pages[activePage]}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
