import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Train, MapPin, Users, ScrollText,
    LogOut, Plus, Trash2, Eye, EyeOff, Lock, User as UserIcon,
    AlertCircle, CheckCircle2, Activity, Clock, Shield,
    ChevronRight, RefreshCcw, X, Server, Wifi
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API = 'http://localhost:3001';

// ============================================================
// COMPONENTS
// ============================================================
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, loading }: {
    isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onCancel} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.05] text-center">
                        <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-100 shadow-sm">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-[#1d2d6a] mb-2">{title}</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{message}</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={onConfirm} disabled={loading}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-95 shadow-[0_8px_20px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2">
                                {loading ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                            <button onClick={onCancel} disabled={loading}
                                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-2xl text-sm uppercase tracking-widest transition-all">
                                Batal
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

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
        if (!username || !password) {
            setError('Username dan password wajib diisi.');
            return;
        }
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const d = await res.json();
            if (!d.success) { setError(d.error || 'Login gagal.'); return; }
            if (d.user.role !== 'Admin') { setError('Akses ditolak. Command Center hanya untuk Admin.'); return; }
            sessionStorage.setItem('cc_token', d.token);
            sessionStorage.setItem('cc_user', JSON.stringify(d.user));
            onLogin(d.user, d.token);
        } catch { setError('Tidak bisa terhubung ke server. Pastikan Master App aktif.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-white font-sans">
            {/* Background Image with blur and overlay */}
            <div
                className="absolute inset-0 z-0 scale-105"
                style={{
                    backgroundImage: "url('https://ik.trn.asia/uploads/2022/11/1669271102786.jpeg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(3px) brightness(1.1)'
                }}
            />
            <div className="absolute inset-0 z-0 bg-white/60 backdrop-blur-sm" />

            <div className="relative z-10 flex w-full items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-[440px] rounded-[2rem] bg-white/95 backdrop-blur-xl p-10 py-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.03] flex flex-col items-center"
                >
                    {/* Branding */}
                    <div className="mb-10 flex flex-col items-center text-center">
                        <div className="relative mb-5">
                            <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-150" />
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                                alt="KAI Logo"
                                className="relative h-16 drop-shadow-xl"
                            />
                        </div>
                        <h1 className="text-3xl leading-tight font-black tracking-tight text-[#1d2d6a] drop-shadow-sm">
                            PIDS Command Center
                        </h1>
                        <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-[#1d2d6a] uppercase opacity-90">
                            Passenger Information Display System
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="flex w-full flex-col space-y-7">
                        {/* Username Input */}
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="relative w-full">
                            <input
                                type={showPass ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-0 top-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex w-full items-center gap-2 text-red-500 text-xs font-semibold pt-1"
                                >
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-8 w-full rounded-full bg-[#ee6f1f] py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)] transition-all hover:bg-[#d45d15] hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)] active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                        >
                            {loading ? 'Memproses...' : 'Masuk Ke Sistem'}
                        </button>

                        {/* Hint Info */}
                        <p className="text-center w-full text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-6">
                            Demo: admin / admin123
                        </p>
                    </form>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 w-full text-center z-10">
                <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500/70">
                    © 2025 PT ELTRAN INDONESIA - PIDS V1.2.0
                </p>
            </div>
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

    useEffect(() => {
        fetch_();
        // Connect Socket.IO for real-time dashboard updates
        const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
        socket.on('state:update', () => fetch_());
        socket.on('connect', () => console.log('[Socket.IO] Command Center dashboard connected'));
        return () => { socket.disconnect(); };
    }, [fetch_]);

    const ACTION_COLOR: Record<string, string> = {
        LOGIN: 'text-green-400', LOGIN_FAILED: 'text-red-400', LOGOUT: 'text-slate-400',
        STATE_UPDATE: 'text-blue-400', DISPLAY_MODE: 'text-purple-400',
        LED_CONFIG: 'text-orange-400', ADMIN_CRUD: 'text-indigo-400', SYSTEM: 'text-slate-500',
    };

    const cards = loading ? [] : [
        { label: 'Active Route', value: status?.currentState?.serviceName || '-', sub: `No. ${status?.currentState?.trainNumber || '-'}`, icon: Train, color: 'bg-blue-500' },
        { label: 'Active Sessions', value: status?.activeSessions ?? 0, sub: 'Login aktif', icon: Users, color: 'bg-green-500' },
        { label: 'Total Log Entries', value: status?.totalLogs ?? 0, sub: 'Semua aktivitas', icon: ScrollText, color: 'bg-orange-500' },
        { label: 'Server Uptime', value: status ? `${Math.floor(status.uptime / 60)}m` : '-', sub: 'Sejak start', icon: Server, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1 uppercase">Dashboard Overview</h2>
                <p className="text-slate-500 text-sm font-medium">Status sistem PIDS secara real-time</p>
            </div>
            <div className="grid grid-cols-4 gap-6">
                {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-[2rem] animate-pulse" />) : cards.map((c, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 ${c.color} rounded-2xl flex items-center justify-center shadow-sm`}><c.icon size={24} className="text-white" /></div>
                        <div>
                            <div className="text-3xl font-black text-[#1d2d6a] tracking-tight">{String(c.value)}</div>
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{c.label}</div>
                            <div className="text-slate-400/80 text-[10px] font-medium mt-0.5">{c.sub}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Latest log */}
            {status?.lastLog && (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={16} className="text-[#ee6f1f]" /> Log Terakhir</h3>
                    <div className="flex items-start gap-4">
                        <div className={`text-sm font-black ${ACTION_COLOR[status.lastLog.action] || 'text-slate-400'}`}>{status.lastLog.action}</div>
                        <div className="text-slate-600 text-sm font-medium flex-1">{status.lastLog.details}</div>
                        <div className="text-slate-400 text-xs font-mono font-medium whitespace-nowrap">{new Date(status.lastLog.timestamp).toLocaleTimeString('id-ID')}</div>
                    </div>
                </div>
            )}

            {/* Connection status */}
            <div className="grid grid-cols-3 gap-6">
                {[
                    { name: 'Master API Server', port: '3001', ok: !!status },
                    { name: 'Selector App', port: '5174', ok: true },
                    { name: 'LED Display App', port: '5175', ok: true },
                ].map((unit, i) => (
                    <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${unit.ok ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`} />
                        <div>
                            <div className="text-[#1d2d6a] font-bold text-sm tracking-wide">{unit.name}</div>
                            <div className="text-slate-400 text-xs font-mono font-medium mt-0.5">Port: {unit.port}</div>
                        </div>
                        <Wifi size={20} className={`ml-auto ${unit.ok ? 'text-green-500' : 'text-red-500'}`} />
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
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newName.trim() }) });
            const d = await res.json();
            if (d.success) { setTrains(d.trains); setNewName(''); showToast('Kereta berhasil ditambahkan', true); }
            else showToast(d.error || 'Gagal menambahkan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/trains/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { setTrains(d.trains); showToast(`"${deleteTarget}" berhasil dihapus`, true); }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); }
        finally { setSaving(false); setDeleteTarget(null); }
    };

    return (
        <div className="space-y-8">
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Layanan"
                message={`Apakah Anda yakin ingin menghapus layanan "${deleteTarget}"? Semua preferensi terkait layanan ini akan hilang.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={saving}
            />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1 uppercase">Manajemen Layanan (Service)</h2>
                    <p className="text-slate-500 text-sm font-medium">{trains.length} layanan terdaftar dalam sistem pids</p>
                </div>
                <button onClick={fetchTrains} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={16} /></button>
            </div>

            {/* Add new */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex gap-4 shadow-sm">
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Nama layanan baru (e.g. GAJAYANA)" maxLength={50}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all uppercase" />
                <button onClick={handleAdd} disabled={saving || !newName.trim()}
                    className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm uppercase tracking-wide transition-all flex items-center gap-2 active:scale-95 shadow-[0_8px_20px_rgba(238,111,31,0.25)] hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)] disabled:shadow-none">
                    {saving ? 'Menyimpan...' : <><Plus size={18} />Tambah</>}
                </button>
            </div>

            {/* List */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {loading ? <div className="p-8 text-center text-slate-500 text-sm font-medium">Memuat data...</div> : trains.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm font-medium">Belum ada kereta terdaftar.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {trains.map((name, i) => (
                            <motion.div key={name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                                <div className="w-10 h-10 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Train size={18} className="text-[#1d2d6a]" />
                                </div>
                                <span className="text-[#1d2d6a] font-black flex-1 tracking-wide text-base">{name}</span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">#{String(i + 1).padStart(2, '0')}</span>
                                <button onClick={() => setDeleteTarget(name)}
                                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200">
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-[#1d2d6a] text-white shadow-[0_8px_24px_rgba(29,45,106,0.25)]' : 'bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.25)]'}`}>
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
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
            if (d.success) {
                await fetchRoutes();
                setShowForm(false);
                setIsEditing(false);
                setNewRouteName('');
                setNewStations('');
                showToast(isEditing ? 'Rute berhasil diperbarui' : 'Rute berhasil disimpan', true);
            }
            else showToast(d.error || 'Gagal menyimpan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleEdit = (route: any) => {
        setNewRouteName(route.name);
        setNewStations(route.stations.join(', '));
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setNewRouteName('');
        setNewStations('');
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/routes/${encodeURIComponent(deleteTarget)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { await fetchRoutes(); showToast(`Rute "${deleteTarget}" dihapus`, true); }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    const routeList = Object.values(routes);

    return (
        <div className="space-y-8">
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Rute"
                message={`Apakah Anda yakin ingin menghapus rute "${deleteTarget}"? Aksi ini tidak dapat dibatalkan.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={saving}
            />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1 uppercase">Manajemen Rute & Stasiun</h2>
                    <p className="text-slate-500 text-sm font-medium">{routeList.length} rute terdaftar</p>
                </div>
                <button onClick={isEditing ? cancelForm : () => setShowForm(v => !v)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                    {showForm ? <><X size={16} />Batal</> : <><Plus size={16} />Tambah Rute</>}
                </button>
            </div>

            <AnimatePresence>
                {showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 overflow-hidden mb-8">
                    <h3 className="text-slate-400 font-black text-xs uppercase tracking-widest">{isEditing ? 'Edit Rute' : 'Rute Baru'}</h3>
                    <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nama rute (e.g. GAJAYANA)" maxLength={60} disabled={isEditing}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all uppercase disabled:opacity-60" />
                    <textarea value={newStations} onChange={e => setNewStations(e.target.value)} rows={3} placeholder="Stasiun dipisah koma: MALANG, BLITAR, KEDIRI, MADIUN, YOGYAKARTA, BANDUNG"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all resize-none uppercase" />
                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)] disabled:shadow-none hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)]">
                            {saving ? 'Menyimpan...' : <><CheckCircle2 size={18} />{isEditing ? 'Perbarui Rute' : 'Simpan Rute'}</>}
                        </button>
                    </div>
                </motion.div>}
            </AnimatePresence>

            {loading ? <div className="p-8 text-center text-slate-500 font-medium">Memuat rute...</div> : (
                <div className="grid grid-cols-1 gap-4">
                    {routeList.map((route: any, i) => (
                        <motion.div key={route.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 group hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-[#1d2d6a]"><MapPin size={18} /></div>
                                        <h3 className="text-[#1d2d6a] font-black tracking-wide text-lg">{route.name}</h3>
                                        <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">{route.stations?.length || 0} STASIUN</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {route.stations?.map((s: string, j: number) => (
                                            <span key={j} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-[11px] font-bold uppercase tracking-tight">
                                                {j > 0 && <ChevronRight size={10} className="text-slate-300" />} {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleEdit(route)}
                                        className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200">
                                        <Plus size={16} className="rotate-45" /> {/* Edit icon hack using Plus Lucide if Edit not imported, oh wait it has Lucide icons. Let's use generic one or import Edit */}
                                    </button>
                                    <button onClick={() => setDeleteTarget(route.name)}
                                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-[#1d2d6a] text-white shadow-[0_8px_24px_rgba(29,45,106,0.25)]' : 'bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.25)]'}`}>
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
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newNama, setNewNama] = useState('');
    const [newRole, setNewRole] = useState<'Admin' | 'Operator'>('Operator');

    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setUsers(d.users);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleAddUser = async () => {
        if (!newUsername || !newPassword || !newNama) { showToast('Semua field harus diisi', false); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ username: newUsername, password: newPassword, nama: newNama, role: newRole })
            });
            const d = await res.json();
            if (d.success) {
                showToast(`User ${newNama} berhasil dibuat`, true); fetchUsers(); setShowForm(false);
                setNewUsername(''); setNewPassword(''); setNewNama('');
            } else { showToast(d.error || 'Gagal membuat user', false); }
        } catch { showToast('Gagal terhubung ke server', false); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/users/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { showToast(`User "${deleteTarget.nama}" berhasil dihapus`, true); fetchUsers(); }
            else { showToast(d.error || 'Gagal menghapus user', false); }
        } catch { showToast('Gagal terhubung ke server', false); }
        finally { setSaving(false); setDeleteTarget(null); }
    };
    return (
        <div className="space-y-8">
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Pengguna"
                message={`Anda yakin ingin menghapus "${deleteTarget?.nama}"? Password dan data akses akan dihapus permanen.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={saving}
            />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1 uppercase">Manajemen Pengguna</h2>
                    <p className="text-slate-500 text-sm font-medium">{users.length} pengguna terdaftar dalam sistem PIDS</p>
                </div>
                <button onClick={() => setShowForm(v => !v)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                    {showForm ? <><X size={16} />Batal</> : <><Plus size={16} />Tambah User</>}
                </button>
            </div>

            <AnimatePresence>
                {showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 overflow-hidden mb-8">
                    <h3 className="text-slate-400 font-black text-xs uppercase tracking-widest">User Baru</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input value={newNama} onChange={e => setNewNama(e.target.value)} placeholder="Nama Lengkap"
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />
                        <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username"
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />
                        <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" type="password"
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />
                        <select value={newRole} onChange={e => setNewRole(e.target.value as 'Admin' | 'Operator')}
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all">
                            <option value="Operator">Operator</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button onClick={handleAddUser} disabled={saving}
                        className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm uppercase tracking-wide transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)] disabled:shadow-none">
                        {saving ? 'Menyimpan...' : <><CheckCircle2 size={18} />Simpan User</>}
                    </button>
                </motion.div>}
            </AnimatePresence>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[80px_1fr_1fr_100px_60px] gap-0 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <span>ID</span><span>Nama</span><span>Username</span><span>Role</span><span></span>
                </div>
                {loading ? <div className="p-8 text-center text-slate-500 text-sm font-medium">Memuat pengguna...</div> : users.map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                        className="grid grid-cols-[80px_1fr_1fr_100px_60px] gap-0 px-6 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center group">
                        <span className="text-slate-400 font-mono text-sm">{u.id}</span>
                        <span className="text-[#1d2d6a] font-black">{u.nama}</span>
                        <span className="text-slate-500 font-mono text-sm font-medium">{u.username}</span>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-black uppercase w-fit ${u.role === 'Admin' ? 'bg-[#ee6f1f]/10 text-[#ee6f1f]' : 'bg-blue-500/10 text-blue-500'}`}>
                            <Shield size={12} />{u.role}
                        </span>
                        <button onClick={() => setDeleteTarget({ id: u.id, nama: u.nama })}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200">
                            <Trash2 size={14} />
                        </button>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold z-50 ${toast.ok ? 'bg-[#1d2d6a] text-white shadow-[0_8px_24px_rgba(29,45,106,0.3)]' : 'bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.3)]'}`}>
                    {toast.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{toast.msg}
                </motion.div>}
            </AnimatePresence>
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
        LOGIN: { label: 'Login', color: 'text-green-600 bg-green-500/10 border-green-500/20' },
        LOGIN_FAILED: { label: 'Login Gagal', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
        LOGOUT: { label: 'Logout', color: 'text-slate-500 bg-slate-100 border-slate-200' },
        STATE_UPDATE: { label: 'Update State', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
        DISPLAY_MODE: { label: 'Mode Display', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
        LED_CONFIG: { label: 'LED Config', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
        ADMIN_CRUD: { label: 'Admin CRUD', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
        SYSTEM: { label: 'Sistem', color: 'text-slate-500 bg-slate-100 border-slate-200' },
    };

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setLogs(d.logs);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        fetchLogs();
        // Socket.IO for real-time log updates
        const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
        socket.on('state:update', () => fetchLogs());
        socket.on('db:update', () => fetchLogs());
        return () => { socket.disconnect(); };
    }, [fetchLogs]);

    const filterOptions = ['ALL', ...Object.keys(ACTION_META)];
    const filtered = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1 uppercase">Log Sistem</h2>
                    <p className="text-slate-500 text-sm font-medium">{logs.length} entri total · Real-time via Socket.IO</p>
                </div>
                <button onClick={fetchLogs} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={16} /></button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {filterOptions.map(opt => (
                    <button key={opt} onClick={() => setFilter(opt)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${filter === opt ? 'bg-[#ee6f1f] text-white border-[#ee6f1f] shadow-[0_4px_12px_rgba(238,111,31,0.25)]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-[#1d2d6a] shadow-sm hover:shadow-md'}`}>
                        {opt === 'ALL' ? 'Semua' : ACTION_META[opt]?.label || opt}
                        {opt !== 'ALL' && <span className={`ml-2 ${filter === opt ? 'text-white/60' : 'text-slate-400'}`}>{logs.filter(l => l.action === opt).length}</span>}
                    </button>
                ))}
            </div>

            {loading ? <div className="p-8 text-center text-slate-500 font-medium">Memuat log...</div> : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200 shadow-sm">Tidak ada log untuk filter ini.</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-[140px_120px_110px_80px_1fr] gap-0 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <span>Waktu</span><span>Aksi</span><span>Pengguna</span><span>Role</span><span>Keterangan</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                        {filtered.map((log, i) => {
                            const meta = ACTION_META[log.action] || { label: log.action, color: 'text-slate-400 bg-slate-50 border-slate-200' };
                            const dt = new Date(log.timestamp);
                            return (
                                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                    className="grid grid-cols-[140px_120px_110px_80px_1fr] gap-0 px-6 py-3.5 hover:bg-slate-50 transition-colors items-start">
                                    <div className="font-mono text-[11px] font-medium pt-1">
                                        <div className="text-slate-500">{dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                                        <div className="text-slate-400">{dt.toLocaleTimeString('id-ID', { hour12: false })}</div>
                                    </div>
                                    <div><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border mt-0.5 ${meta.color}`}>{meta.label}</span></div>
                                    <span className="text-[#1d2d6a] text-sm font-black tracking-tight self-center">{log.user}</span>
                                    <span className="text-slate-400 text-xs font-bold uppercase self-center">{log.role}</span>
                                    <span className="text-slate-600 text-sm font-medium self-center leading-relaxed pr-6">{log.details}</span>
                                </motion.div>
                            );
                        })}
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trains', label: 'Layanan Kereta', icon: Train },
    { id: 'routes', label: 'Manajemen Rute', icon: MapPin },
    { id: 'users', label: 'Akun Operator', icon: Users },
    { id: 'logs', label: 'System Logs', icon: ScrollText },
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
                }).catch(() => { setAuthToken(token); setAuthUser(JSON.parse(userStr ?? '')); });
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
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
            <aside className="w-72 bg-[#1d2d6a] border-r border-blue-900 flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] relative z-10">
                <div className="p-8 pb-10">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                        alt="KAI Logo"
                        className="h-8 w-auto mb-4 brightness-0 invert"
                    />
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight uppercase">Command Center</h1>
                    <p className="text-[9px] font-bold text-blue-200/40 uppercase tracking-widest mt-0.5 font-mono">Control Panel V1.0</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {NAV.map(item => (
                        <button key={item.id} onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activePage === item.id ? 'bg-[#ee6f1f] text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                            <item.icon size={20} strokeWidth={2.5} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5 bg-black/10">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 active:scale-95 group">
                        <LogOut size={16} className="text-white/20 group-hover:text-red-400 transition-colors" />
                        <span>Logout dari Sistem</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto flex flex-col relative bg-slate-50/50">
                {/* Standardized Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Shield className="text-[#1d2d6a]" size={20} /></div>
                        <div>
                            <h1 className="text-lg font-black text-[#1d2d6a] uppercase tracking-tight leading-none mb-1">Command Center</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{NAV.find(n => n.id === activePage)?.label}</span>
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

                <div className="flex-1 p-10 overflow-auto">
                    <AnimatePresence mode="wait">
                        <motion.div key={activePage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                            {pages[activePage]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
