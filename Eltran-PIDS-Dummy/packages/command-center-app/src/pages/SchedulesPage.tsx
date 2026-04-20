/**
 * Ringkasan: command-center-app\src\pages\SchedulesPage.tsx
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Trash2, RefreshCcw, ChevronRight, MapPinned, Plus, X, CheckCircle2, Clock, MapPin, Info, Paperclip, Activity } from 'lucide-react';
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
    const [showForm, setShowForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const { toast, showToast, closeToast } = useToast();
    const [expanded, setExpanded] = useState<number | null>(null);

    const [trainOptions, setTrainOptions] = useState<any[]>([]);
    const [stationOptions, setStationOptions] = useState<any[]>([]);
    const [form, setForm] = useState({
        train_name: '', train_number: '',
        dep_station: '', dep_city_code: '',
        arr_station: '', arr_city_code: '',
        dep_sched: '', dep_real: '', dep_diff: '0', dep_status: 'Tepat Waktu',
        arr_sched: '', arr_real: '', arr_diff: '0', arr_status: 'Tepat Waktu',
        notes: '', media: ''
    });

    // Pagination & Search States
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const LIMIT = 10;

    const fetchSchedules = useCallback(async (isLoadMore = false, overrideSearch?: string) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const currentOffset = isLoadMore ? offset + LIMIT : 0;
            const search = overrideSearch !== undefined ? overrideSearch : searchQuery;
            const query = new URLSearchParams({
                limit: LIMIT.toString(),
                offset: currentOffset.toString(),
                search: search
            });

            const res = await fetch(`${API}/api/schedules?${query}`);
            const d = await res.json();
            if (d.success) {
                if (isLoadMore) setSchedules(prev => [...prev, ...d.schedules]);
                else setSchedules(d.schedules);
                setTotal(d.total);
                setOffset(currentOffset);
            }
        } catch { } finally { setLoading(false); setLoadingMore(false); }
    }, [offset, searchQuery]);

    const fetchData = useCallback(async () => {
        try {
            const [tr, st] = await Promise.all([
                fetch(`${API}/api/admin/trains`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/admin/stations`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            const [trD, stD] = await Promise.all([tr.json(), st.json()]);
            if (trD.success) setTrainOptions(trD.trains || []);
            if (stD.success) setStationOptions(stD.stations || []);
        } catch { }
    }, [token]);

    useEffect(() => { 
        fetchSchedules(false); 
        fetchData();
    }, []); // fetchSchedules and fetchData don't need to be in deps to avoid loops with offset

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSchedules(false, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSave = async () => {
        if (!form.train_name || !form.dep_station || !form.arr_station) {
            showToast('Mohon lengkapi data wajib (Nama, Keberangkatan, Tujuan)', false);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                train_name: form.train_name,
                train_number: form.train_number,
                stasiun_keberangkatan: form.dep_station,
                kode_kota_keberangkatan: form.dep_city_code,
                stasiun_tujuan: form.arr_station,
                kode_kota_tujuan: form.arr_city_code,
                waktu_keberangkatan_penjadwalan: form.dep_sched,
                waktu_keberangkatan_realisasi: form.dep_real,
                selisih_waktu_keberangkatan: form.dep_diff,
                status_keberangkatan: form.dep_status,
                waktu_kedatangan_penjadwalan: form.arr_sched,
                waktu_kedatangan_realisasi: form.arr_real,
                selisih_waktu_kedatangan: form.arr_diff,
                status_kedatangan: form.arr_status,
                catatan: form.notes,
                media: form.media,
                route_id: null, // Point to point direct entry
                stops: []
            };

            const res = await fetch(`${API}/api/admin/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (d.success) {
                showToast('Jadwal berhasil disimpan', true);
                fetchSchedules(false);
                setShowForm(false);
                setForm({
                    train_name: '', train_number: '', dep_station: '', dep_city_code: '', arr_station: '', arr_city_code: '',
                    dep_sched: '', dep_real: '', dep_diff: '0', dep_status: 'Tepat Waktu',
                    arr_sched: '', arr_real: '', arr_diff: '0', arr_status: 'Tepat Waktu',
                    notes: '', media: ''
                });
            } else showToast(d.error || 'Gagal', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return; setSaving(true);
        try { const res = await fetch(`${API}/api/admin/schedules/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const d = await res.json(); if (d.success) { showToast(`Jadwal ${deleteTarget.train_name} dihapus`, true); fetchSchedules(false); } else showToast(d.error || 'Gagal', false); } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    return (
        <div className="space-y-8">
            <ConfirmModal isOpen={!!deleteTarget} title="Hapus Jadwal" message={`Hapus jadwal ${deleteTarget?.train_name}?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                    <h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight mb-2">Penjadwalan Kereta</h2>
                    <p className="text-slate-500 text-sm font-medium">Monitoring & Manajemen {total} Jadwal Aktif</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari KA / Rute..." 
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 text-sm font-semibold focus:outline-none focus:border-[#ee6f1f] shadow-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setShowForm(!showForm)} 
                        className={`flex items-center gap-2 h-11 px-6 rounded-2xl font-semibold text-sm transition-all active:scale-95 shrink-0 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}
                    >
                        {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Jadwal</>}
                    </button>
                    <button 
                        onClick={() => fetchSchedules(false)} 
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8 overflow-hidden">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Pilih Armada</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama Kereta</label>
                                            <select value={form.train_name} onChange={e => {
                                                const t = trainOptions.find(tx => tx.name === e.target.value);
                                                setForm({ ...form, train_name: e.target.value, train_number: t?.train_number || t?.ka_number || '' });
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all">
                                                <option value="">Pilih Kereta</option>
                                                {trainOptions.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kode KA</label>
                                            <input value={form.train_number} onChange={e => setForm({ ...form, train_number: e.target.value.toUpperCase() })} placeholder="AUTOMATIC" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Waktu & Media</h4>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Media / Lampiran (URL)</label>
                                        <div className="relative">
                                            <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input value={form.media} onChange={e => setForm({ ...form, media: e.target.value })} placeholder="URL Gambar/Dokumen" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                                        <h4 className="font-semibold text-[#1d2d6a] text-sm uppercase tracking-wider">Keberangkatan</h4>
                                        <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">Departure</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stasiun</label>
                                            <select value={form.dep_station} onChange={e => {
                                                const s = stationOptions.find(sx => sx.id === e.target.value);
                                                setForm({ ...form, dep_station: s?.name || e.target.value, dep_city_code: s?.kode_kota || '' });
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all">
                                                <option value="">Pilih Stasiun</option>
                                                {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kode Kota</label>
                                            <input value={form.dep_city_code} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm opacity-70 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-[#ee6f1f] uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Penjadwalan</label>
                                            <input type="time" value={form.dep_sched} onChange={e => setForm({ ...form, dep_sched: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Activity size={10} /> Realisasi</label>
                                            <input type="time" value={form.dep_real} onChange={e => setForm({ ...form, dep_real: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Selisih Waktu (Mnt)</label>
                                            <input type="number" value={form.dep_diff} onChange={e => setForm({ ...form, dep_diff: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                                            <select value={form.dep_status} onChange={e => setForm({ ...form, dep_status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm">
                                                <option>Tepat Waktu</option>
                                                <option>Terlambat</option>
                                                <option>Dibatalkan</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                                        <h4 className="font-semibold text-[#1d2d6a] text-sm uppercase tracking-wider">Kedatangan</h4>
                                        <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">Arrival</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stasiun</label>
                                            <select value={form.arr_station} onChange={e => {
                                                const s = stationOptions.find(sx => sx.id === e.target.value);
                                                setForm({ ...form, arr_station: s?.name || e.target.value, arr_city_code: s?.kode_kota || '' });
                                            }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all">
                                                <option value="">Pilih Stasiun</option>
                                                {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kode Kota</label>
                                            <input value={form.arr_city_code} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm opacity-70 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-[#ee6f1f] uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Penjadwalan</label>
                                            <input type="time" value={form.arr_sched} onChange={e => setForm({ ...form, arr_sched: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Activity size={10} /> Realisasi</label>
                                            <input type="time" value={form.arr_real} onChange={e => setForm({ ...form, arr_real: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Selisih Waktu (Mnt)</label>
                                            <input type="number" value={form.arr_diff} onChange={e => setForm({ ...form, arr_diff: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                                            <select value={form.arr_status} onChange={e => setForm({ ...form, arr_status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm">
                                                <option>Tepat Waktu</option>
                                                <option>Terlambat</option>
                                                <option>Dibatalkan</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Catatan</h4>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Masukkan catatan tambahan..." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                            </div>
                        </div>
                        <button onClick={handleSave} disabled={saving} className="h-12 px-10 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-semibold rounded-2xl text-sm transition-all flex items-center gap-3 active:scale-95 shadow-[0_12px_24px_rgba(238,111,31,0.3)]">
                            {saving ? 'Menyimpan...' : <><CheckCircle2 size={24} />Simpan Penjadwalan</>}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? <div className="p-8 text-center text-slate-500">Memuat jadwal...</div> : (
                <div className="space-y-4">
                    {schedules.map((sched, i) => (
                        <motion.div key={sched.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
                            <div className="flex items-center gap-4 px-6 py-5 cursor-pointer" onClick={() => setExpanded(expanded === sched.id ? null : sched.id)}>
                                <div className="w-12 h-12 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm"><Train size={20} className="text-[#1d2d6a]" /></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1"><h3 className="text-[#1d2d6a] font-bold text-base">{sched.display_train_name || sched.train_name}</h3><span className="text-slate-400 text-[10px] font-bold">{sched.display_train_number || sched.train_number || sched.ka_number || '-'}</span></div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-500 font-medium">{sched.schedule_date}</span>
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${STATUS_COLOR[sched.status] || 'text-slate-400 bg-slate-50 border-slate-200'}`}>{sched.status?.replace('_', ' ')}</span>
                                        <span className="text-slate-400 font-bold">{sched.stops?.length || 0} pemberhentian</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className={`text-slate-300 transition-transform ${expanded === sched.id ? 'rotate-90' : ''}`} />
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(sched); }} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95"><Trash2 size={14} /></button>
                            </div>
                            <AnimatePresence>
                                {expanded === sched.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 overflow-hidden">
                                        {sched.stops && sched.stops.length > 0 ? (
                                            <>
                                                <div className="grid grid-cols-[40px_1fr_100px_100px_50px_130px] gap-0 px-6 py-3 bg-slate-50/50 text-slate-400 text-[9px] font-semibold"><span>#</span><span>Stasiun</span><span>Datang</span><span>Berangkat</span><span>Peron</span><span>Status</span></div>
                                                {sched.stops.map((stop: any, j: number) => (
                                                    <div key={j} className="grid grid-cols-[40px_1fr_100px_100px_50px_130px] gap-0 px-6 py-3 border-t border-slate-50 hover:bg-slate-50/50 items-center text-sm">
                                                        <span className="text-slate-300 font-mono font-bold text-xs">{String(stop.sequence_order).padStart(2, '0')}</span>
                                                        <div className="flex items-center gap-2"><MapPinned size={14} className="text-[#ee6f1f]" /><span className="text-[#1d2d6a] font-semibold text-sm">{stop.station_name}</span><span className="text-slate-400 font-mono text-[10px]">{stop.station_code}</span></div>
                                                        <span className="text-slate-600 font-mono font-medium">{stop.arrival_time || '-'}</span>
                                                        <span className="text-slate-600 font-mono font-medium">{stop.departure_time || '-'}</span>
                                                        <span className="text-slate-400 font-mono text-xs text-center">{stop.platform}</span>
                                                        <span className={`text-[10px] font-bold ${stop.stop_status === 'SCHEDULED' ? 'text-blue-500' : stop.stop_status === 'ARRIVED' ? 'text-green-500' : 'text-slate-400'}`}>{stop.stop_status}</span>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="p-8 space-y-6">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[#ee6f1f] text-[10px] font-semibold uppercase tracking-widest"><Clock size={12}/> Keberangkatan</div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-bold">STASIUN</p>
                                                                <p className="text-[#1d2d6a] font-semibold text-sm">{sched.stasiun_keberangkatan || '-'} ({sched.kode_kota_keberangkatan || '-'})</p>
                                                            </div>
                                                            <div className="text-right space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-bold">PENJADWALAN</p>
                                                                <p className="text-[#ee6f1f] font-semibold text-lg">{sched.waktu_keberangkatan_penjadwalan || '--:--'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[9px] text-slate-400 font-bold pb-1">REALISASI</p>
                                                                <p className="text-[#1d2d6a] font-bold text-sm">{sched.waktu_keberangkatan_realisasi || '-'}</p>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[9px] text-slate-400 font-bold pb-1">SELISIH / STATUS</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[#1d2d6a] font-bold text-xs">{sched.selisih_waktu_keberangkatan}m</span>
                                                                    <span className="text-green-500 font-semibold text-[9px] px-1.5 py-0.5 bg-green-50 rounded border border-green-100">{sched.status_keberangkatan}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[#ee6f1f] text-[10px] font-semibold uppercase tracking-widest"><MapPinned size={12}/> Kedatangan</div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-bold">STASIUN</p>
                                                                <p className="text-[#1d2d6a] font-semibold text-sm">{sched.stasiun_tujuan || '-'} ({sched.kode_kota_tujuan || '-'})</p>
                                                            </div>
                                                            <div className="text-right space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-bold">PENJADWALAN</p>
                                                                <p className="text-[#ee6f1f] font-semibold text-lg">{sched.waktu_kedatangan_penjadwalan || '--:--'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[9px] text-slate-400 font-bold pb-1">REALISASI</p>
                                                                <p className="text-[#1d2d6a] font-bold text-sm">{sched.waktu_kedatangan_realisasi || '-'}</p>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[9px] text-slate-400 font-bold pb-1">SELISIH / STATUS</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[#1d2d6a] font-bold text-xs">{sched.selisih_waktu_kedatangan}m</span>
                                                                    <span className="text-green-500 font-semibold text-[9px] px-1.5 py-0.5 bg-green-50 rounded border border-green-100">{sched.status_kedatangan}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {(sched.catatan || sched.media) && (
                                                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-8">
                                                        {sched.catatan && (
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Catatan</p>
                                                                <p className="text-slate-600 text-sm font-medium leading-relaxed italic">"{sched.catatan}"</p>
                                                            </div>
                                                        )}
                                                        {sched.media && (
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Media / Lampiran</p>
                                                                <a href={sched.media} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#ee6f1f] text-xs font-semibold hover:underline"><Paperclip size={12}/> Lihat Lampiran</a>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Load More Button */}
            {schedules.length < total && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => fetchSchedules(true)}
                        disabled={loadingMore}
                        className="px-12 py-4 bg-white border-2 border-slate-100 text-[#1d2d6a] font-bold rounded-2xl hover:border-[#ee6f1f] hover:text-[#ee6f1f] transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        {loadingMore ? (
                            <RefreshCcw size={20} className="animate-spin" />
                        ) : (
                            <ChevronRight size={20} className="rotate-90" />
                        )}
                        {loadingMore ? 'Memuat Lebih Banyak...' : 'Muat Jadwal Lainnya'}
                    </button>
                </div>
            )}
            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}


