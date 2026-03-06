import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Trash2, RefreshCcw, ChevronRight, MapPinned } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

const STATUS_COLOR: Record<string, string> = {
    ON_TIME: 'text-green-600 bg-green-500/10 border-green-500/20',
    DELAYED: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
    CANCELLED: 'text-red-500 bg-red-500/10 border-red-500/20',
};

export default function SchedulesPage({ token }: { token: string }) {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const { toast, showToast, closeToast } = useToast();
    const [expanded, setExpanded] = useState<number | null>(null);

    const fetchSchedules = useCallback(async () => {
        try { const res = await fetch(`${API}/api/schedules`); const d = await res.json(); if (d.success) setSchedules(d.schedules); } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    const confirmDelete = async () => {
        if (!deleteTarget) return; setSaving(true);
        try { const res = await fetch(`${API}/api/admin/schedules/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const d = await res.json(); if (d.success) { showToast(`Jadwal ${deleteTarget.train_name} dihapus`, true); fetchSchedules(); } else showToast(d.error || 'Gagal', false); } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    return (
        <div className="space-y-8">
            <ConfirmModal isOpen={!!deleteTarget} title="Hapus Jadwal" message={`Hapus jadwal ${deleteTarget?.train_name}?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
            <div className="flex items-end justify-between">
                <div><h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Jadwal Kereta</h2><p className="text-slate-500 text-sm font-medium">{schedules.length} jadwal aktif</p></div>
                <button onClick={fetchSchedules} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={16} /></button>
            </div>
            {loading ? <div className="p-8 text-center text-slate-500">Memuat jadwal...</div> : (
                <div className="space-y-4">
                    {schedules.map((sched, i) => (
                        <motion.div key={sched.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
                            <div className="flex items-center gap-4 px-6 py-5 cursor-pointer" onClick={() => setExpanded(expanded === sched.id ? null : sched.id)}>
                                <div className="w-12 h-12 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm"><Train size={20} className="text-[#1d2d6a]" /></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1"><h3 className="text-[#1d2d6a] font-black text-base">{sched.train_name}</h3><span className="text-slate-400 text-[10px] font-bold">{sched.ka_number || '-'}</span></div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-500 font-medium">{sched.schedule_date}</span>
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${STATUS_COLOR[sched.status] || 'text-slate-400 bg-slate-50 border-slate-200'}`}>{sched.status?.replace('_', ' ')}</span>
                                        <span className="text-slate-400 font-bold">{sched.stops?.length || 0} pemberhentian</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className={`text-slate-300 transition-transform ${expanded === sched.id ? 'rotate-90' : ''}`} />
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(sched); }} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95"><Trash2 size={14} /></button>
                            </div>
                            <AnimatePresence>
                                {expanded === sched.id && sched.stops && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 overflow-hidden">
                                        <div className="grid grid-cols-[40px_1fr_100px_100px_50px_130px] gap-0 px-6 py-3 bg-slate-50/50 text-slate-400 text-[9px] font-black"><span>#</span><span>Stasiun</span><span>Datang</span><span>Berangkat</span><span>Peron</span><span>Status</span></div>
                                        {sched.stops.map((stop: any, j: number) => (
                                            <div key={j} className="grid grid-cols-[40px_1fr_100px_100px_50px_130px] gap-0 px-6 py-3 border-t border-slate-50 hover:bg-slate-50/50 items-center text-sm">
                                                <span className="text-slate-300 font-mono font-bold text-xs">{String(stop.sequence_order).padStart(2, '0')}</span>
                                                <div className="flex items-center gap-2"><MapPinned size={14} className="text-[#ee6f1f]" /><span className="text-[#1d2d6a] font-black text-sm">{stop.station_name}</span><span className="text-slate-400 font-mono text-[10px]">{stop.station_code}</span></div>
                                                <span className="text-slate-600 font-mono font-medium">{stop.arrival_time || '-'}</span>
                                                <span className="text-slate-600 font-mono font-medium">{stop.departure_time || '-'}</span>
                                                <span className="text-slate-400 font-mono text-xs text-center">{stop.platform}</span>
                                                <span className={`text-[10px] font-bold ${stop.stop_status === 'SCHEDULED' ? 'text-blue-500' : stop.stop_status === 'ARRIVED' ? 'text-green-500' : 'text-slate-400'}`}>{stop.stop_status}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
