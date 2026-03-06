import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, X } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

export default function StationsPage({ token }: { token: string }) {
    const [stations, setStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const { toast, showToast, closeToast } = useToast();
    const [search, setSearch] = useState('');

    const [form, setForm] = useState({ id: '', name: '', city: '', latitude: '', longitude: '', ip_address: '', nama_pic: '', kontak_pic: '', kode_kota: '', alamat: '', provinsi: '', kabupaten_kota: '', kecamatan: '', kelurahan_desa: '', kode_pos: '' });
    const resetForm = () => setForm({ id: '', name: '', city: '', latitude: '', longitude: '', ip_address: '', nama_pic: '', kontak_pic: '', kode_kota: '', alamat: '', provinsi: '', kabupaten_kota: '', kecamatan: '', kelurahan_desa: '', kode_pos: '' });

    const fetchStations = useCallback(async () => {
        try { const res = await fetch(`${API}/api/stations`); const d = await res.json(); if (d.success) setStations(d.stations); } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchStations(); }, [fetchStations]);

    const handleAdd = async () => {
        if (!form.id.trim() || !form.name.trim() || !form.city.trim()) { showToast('ID, Nama, dan Kota wajib diisi', false); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/stations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, latitude: parseFloat(form.latitude) || 0, longitude: parseFloat(form.longitude) || 0 }) });
            const d = await res.json();
            if (d.success) { showToast('Stasiun berhasil ditambahkan', true); fetchStations(); setShowForm(false); resetForm(); }
            else showToast(d.error || 'Gagal', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return; setSaving(true);
        try { const res = await fetch(`${API}/api/admin/stations/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const d = await res.json(); if (d.success) { showToast(`Stasiun "${deleteTarget.name}" dihapus`, true); fetchStations(); } else showToast(d.error || 'Gagal', false); } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    const filtered = search ? stations.filter(s => s.name.includes(search.toUpperCase()) || s.city.includes(search.toUpperCase()) || s.id.includes(search.toUpperCase())) : stations;
    const FORM_FIELDS = [
        { key: 'id', label: 'Kode Stasiun', placeholder: 'e.g. BD' }, { key: 'name', label: 'Nama Stasiun', placeholder: 'e.g. BANDUNG' },
        { key: 'city', label: 'Kota', placeholder: 'e.g. BANDUNG' }, { key: 'latitude', label: 'Latitude', placeholder: '-6.9125' },
        { key: 'longitude', label: 'Longitude', placeholder: '107.6036' }, { key: 'ip_address', label: 'IP Address', placeholder: '192.168.5.x' },
        { key: 'nama_pic', label: 'Nama PIC', placeholder: 'Nama PJ' }, { key: 'kontak_pic', label: 'Kontak PIC', placeholder: '08xxx' },
        { key: 'kode_kota', label: 'Kode Kota', placeholder: 'BDG' }, { key: 'alamat', label: 'Alamat', placeholder: 'Jl. Stasiun No.1' },
        { key: 'provinsi', label: 'Provinsi', placeholder: 'Jawa Barat' }, { key: 'kabupaten_kota', label: 'Kab/Kota', placeholder: 'Kota Bandung' },
        { key: 'kecamatan', label: 'Kecamatan', placeholder: 'Regol' }, { key: 'kelurahan_desa', label: 'Kel/Desa', placeholder: 'Kebon Kalapa' },
        { key: 'kode_pos', label: 'Kode Pos', placeholder: '40253' },
    ];

    return (
        <div className="space-y-8">
            <ConfirmModal isOpen={!!deleteTarget} title="Hapus Stasiun" message={`Yakin ingin menghapus stasiun "${deleteTarget?.name}"?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
            <div className="flex items-end justify-between">
                <div><h2 className="text-2xl font-black text-[#1d2d6a] tracking-tight mb-1">Manajemen Stasiun</h2><p className="text-slate-500 text-sm font-medium">{stations.length} stasiun terdaftar</p></div>
                <div className="flex gap-3">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari stasiun..." className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-[#1d2d6a] placeholder-slate-400 focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all w-52 shadow-sm" />
                    <button onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                        {showForm ? <><X size={16} />Batal</> : <><Plus size={16} />Tambah Stasiun</>}
                    </button>
                </div>
            </div>
            <AnimatePresence>{showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 overflow-hidden">
                <h3 className="text-slate-400 font-black text-xs">Stasiun Baru</h3>
                <div className="grid grid-cols-3 gap-4">
                    {FORM_FIELDS.map(f => (<input key={f.key} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} title={f.label} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] placeholder-slate-400 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />))}
                </div>
                <button onClick={handleAdd} disabled={saving} className="px-6 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-black rounded-2xl text-sm transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)]">
                    {saving ? 'Menyimpan...' : <><CheckCircle2 size={18} />Simpan Stasiun</>}
                </button>
            </motion.div>}</AnimatePresence>
            {loading ? <div className="p-8 text-center text-slate-500">Memuat stasiun...</div> : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-[70px_1fr_1fr_120px_1fr_100px_60px] gap-0 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black"><span>Kode</span><span>Nama</span><span>Kota</span><span>Kode Pos</span><span>PIC</span><span>Koordinat</span><span></span></div>
                    <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                        {filtered.map((s, i) => (
                            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }} className="grid grid-cols-[70px_1fr_1fr_120px_1fr_100px_60px] gap-0 px-6 py-4 hover:bg-slate-50 transition-colors items-center group">
                                <span className="text-[#ee6f1f] font-mono font-black text-sm">{s.id}</span>
                                <span className="text-[#1d2d6a] font-black text-sm">{s.name}</span>
                                <span className="text-slate-500 text-sm">{s.city}</span>
                                <span className="text-slate-400 font-mono text-xs">{s.kode_pos || '-'}</span>
                                <span className="text-slate-500 text-sm">{s.nama_pic || '-'}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{s.latitude ? `${s.latitude.toFixed(2)},${s.longitude.toFixed(2)}` : '-'}</span>
                                <button onClick={() => setDeleteTarget(s)} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95"><Trash2 size={14} /></button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
