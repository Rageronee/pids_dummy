import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Pencil, CheckCircle2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal } from '../components/SharedUI';

export default function RoutesPage({ token }: { token: string }) {
    const [routes, setRoutes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newRouteName, setNewRouteName] = useState('');
    const [newStations, setNewStations] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const { toast, showToast, closeToast } = useToast();

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
                setShowForm(false); setIsEditing(false); setNewRouteName(''); setNewStations('');
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

    const cancelForm = () => { setShowForm(false); setIsEditing(false); setNewRouteName(''); setNewStations(''); };

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
            <ConfirmModal isOpen={!!deleteTarget} title="Hapus Rute" message={`Apakah Anda yakin ingin menutup rute "${deleteTarget}"? Aksi ini tidak dapat dibatalkan.`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Manajemen Rute & Stasiun</h2>
                    <p className="text-slate-500 text-sm font-medium">{routeList.length} rute terdaftar</p>
                </div>
                <button onClick={isEditing ? cancelForm : () => setShowForm(v => !v)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                    {showForm ? <><X size={16} />Batal</> : <><Plus size={16} />Tambah Rute</>}
                </button>
            </div>

            <AnimatePresence>
                {showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 overflow-hidden mb-8">
                    <h3 className="text-slate-400 font-black text-xs">{isEditing ? 'Edit Rute' : 'Rute Baru'}</h3>
                    <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nama rute (e.g. GAJAYANA)" maxLength={60} disabled={isEditing}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all disabled:opacity-60" />
                    <textarea value={newStations} onChange={e => setNewStations(e.target.value)} rows={3} placeholder="Stasiun dipisah koma: MALANG, BLITAR, KEDIRI, MADIUN, YOGYAKARTA, BANDUNG"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all resize-none" />
                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)] disabled:shadow-none hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)]">
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
                                        <h3 className="text-[#1d2d6a] font-black text-lg">{route.name}</h3>
                                        <span className="text-slate-400 text-[10px] font-bold">{route.stations?.length || 0} Stasiun</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {route.stations?.map((s: string, j: number) => (
                                            <span key={j} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-[11px] font-bold tracking-tight">
                                                {j > 0 && <ChevronRight size={10} className="text-slate-300" />} {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleEdit(route)} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"><Pencil size={16} /></button>
                                    <button onClick={() => setDeleteTarget(route.name)} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200"><Trash2 size={16} /></button>
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
