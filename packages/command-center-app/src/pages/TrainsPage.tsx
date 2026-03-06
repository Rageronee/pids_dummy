import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Train, Plus, Trash2, RefreshCcw } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

export default function TrainsPage({ token }: { token: string }) {
    const [trains, setTrains] = useState<string[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const { toast, showToast, closeToast } = useToast();

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
                    <h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Manajemen Layanan (Service)</h2>
                    <p className="text-slate-500 text-sm font-medium">{trains.length} layanan terdaftar dalam sistem pids</p>
                </div>
                <button onClick={fetchTrains} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={16} /></button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex gap-4 shadow-sm">
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Nama layanan baru (e.g. GAJAYANA)" maxLength={50}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />
                <button onClick={handleAdd} disabled={saving || !newName.trim()}
                    className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-sm transition-all flex items-center gap-2 active:scale-95 shadow-[0_8px_20px_rgba(238,111,31,0.25)] hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)] disabled:shadow-none">
                    {saving ? 'Menyimpan...' : <><Plus size={18} />Tambah</>}
                </button>
            </div>

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
                                <span className="text-[#1d2d6a] font-black flex-1 text-base">{name}</span>
                                <span className="text-slate-400 text-[10px] font-bold">#{String(i + 1).padStart(2, '0')}</span>
                                <button onClick={() => setDeleteTarget(name)}
                                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200">
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
