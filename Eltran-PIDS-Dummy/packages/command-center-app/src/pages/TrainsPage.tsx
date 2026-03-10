import { useState, useEffect, useCallback } from 'react';
import { Train, Plus, Trash2, RefreshCcw, Wifi, Clock, Pencil, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

export default function TrainsPage({ token }: { token: string }) {
    const [trains, setTrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const { toast, showToast, closeToast } = useToast();

    const [form, setForm] = useState({ name: '', ka_number: '', ip_address: '', status: 'Active' });

    const fetchTrains = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/trains`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) {
                setTrains(d.trains || []);
            }
        } catch { } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchTrains(); }, [fetchTrains]);

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/trains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: form.name.trim(), ka_number: form.ka_number, ip_address: form.ip_address })
            });
            const d = await res.json();
            if (d.success) {
                await fetchTrains();
                setForm({ name: '', ka_number: '', ip_address: '', status: 'Active' });
                setShowForm(false);
                showToast('Kereta berhasil ditambahkan', true);
            }
            else showToast(d.error || 'Gagal menambahkan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/trains/${encodeURIComponent(deleteTarget.name)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { await fetchTrains(); showToast(`"${deleteTarget.name}" berhasil dihapus`, true); }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); }
        finally { setSaving(false); setDeleteTarget(null); }
    };

    return (
        <div className="space-y-8">
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Kereta"
                message={`Apakah Anda yakin ingin menghapus kereta "${deleteTarget?.name}"? Data ini akan dihapus secara permanen.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={saving}
            />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight mb-2">Manajemen Kereta</h2>
                    <p className="text-slate-500 text-base font-medium">{trains.length} kereta terdaftar dalam sistem pids</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchTrains} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={20} /></button>
                    <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                        {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Kereta</>}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 overflow-hidden">
                        <h3 className="text-slate-400 font-black text-xs uppercase tracking-widest">Tambah Kereta Baru</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Nama Kereta</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="e.g. ARGO WILIS" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Kode Kereta (KA)</label>
                                <input value={form.ka_number} onChange={e => setForm({ ...form, ka_number: e.target.value.toUpperCase() })} placeholder="e.g. KA-001" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">IP Address</label>
                                <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} placeholder="e.g. 192.168.1.10" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                            </div>
                        </div>
                        <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="px-8 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-black rounded-2xl text-base transition-all flex items-center gap-2 active:scale-95 shadow-md">
                            {saving ? 'Menyimpan...' : <><CheckCircle2 size={20} />Simpan Kereta</>}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] gap-0 px-8 py-5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <span>Nama & Kode Kereta</span>
                    <span>IP Address</span>
                    <span>Status</span>
                    <span>Last Update</span>
                    <span></span>
                </div>
                {loading ? <div className="p-8 text-center text-slate-500 text-sm font-medium">Memuat data...</div> : trains.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-4">
                        <Train size={48} className="mx-auto opacity-20" />
                        <p className="font-bold">Belum ada kereta terdaftar.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {trains.map((train, i) => (
                            <motion.div key={train.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] gap-0 px-8 py-6 hover:bg-slate-50 transition-colors group items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        <Train size={22} className="text-[#1d2d6a]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#1d2d6a] font-black text-base">{train.name}</span>
                                            {train.ka_number && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md">{train.ka_number}</span>}
                                        </div>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-tight">Layanan PIDS Aktif</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 font-mono font-bold text-sm">
                                    <Wifi size={14} className="text-green-500" />
                                    {train.ip_address || '-'}
                                </div>
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${train.status === 'Active' ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${train.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                        {train.status?.toUpperCase() || 'OFFLINE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                    <Clock size={14} />
                                    {train.last_update ? new Date(train.last_update).toLocaleTimeString('id-ID') : '-'}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setDeleteTarget(train)}
                                        className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
