import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import { io } from 'socket.io-client';
import { API } from '../config';

interface LogEntry { id: string; timestamp: string; action: string; user: string; role: string; details: string; }

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

export default function LogsPage({ token }: { token: string }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setLogs(d.logs);
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        fetchLogs();
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
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Log Sistem</h2>
                    <p className="text-slate-500 text-sm font-medium">{logs.length} entri total</p>
                </div>
                <button onClick={fetchLogs} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={16} /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
                {filterOptions.map(opt => (
                    <button key={opt} onClick={() => setFilter(opt)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${filter === opt ? 'bg-[#ee6f1f] text-white border-[#ee6f1f]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                        {opt === 'ALL' ? 'Semua' : ACTION_META[opt]?.label || opt}
                    </button>
                ))}
            </div>
            {loading ? <div className="p-8 text-center text-slate-500">Memuat log...</div> : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">Tidak ada log.</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-[140px_120px_110px_80px_1fr] gap-0 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black">
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
                                    <div><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black border mt-0.5 ${meta.color}`}>{meta.label}</span></div>
                                    <span className="text-[#1d2d6a] text-sm font-black self-center">{log.user}</span>
                                    <span className="text-slate-400 text-xs font-bold self-center">{log.role}</span>
                                    <span className="text-slate-600 text-sm font-medium self-center pr-6">{log.details}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
