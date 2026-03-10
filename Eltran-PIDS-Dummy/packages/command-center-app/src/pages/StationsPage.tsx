import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Pencil, CheckCircle2, X, FileJson, Search } from 'lucide-react';
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
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({ id: '', name: '', city: '', latitude: '', longitude: '', ip_address: '', nama_pic: '', kontak_pic: '', kode_kota: '', alamat: '', provinsi: '', kabupaten_kota: '', kecamatan: '', kelurahan_desa: '', kode_pos: '' });
    const [isEditing, setIsEditing] = useState(false);
    const resetForm = () => {
        setForm({ id: '', name: '', city: '', latitude: '', longitude: '', ip_address: '', nama_pic: '', kontak_pic: '', kode_kota: '', alamat: '', provinsi: '', kabupaten_kota: '', kecamatan: '', kelurahan_desa: '', kode_pos: '' });
        setIsEditing(false);
        setShowForm(false);
    };

    const fetchStations = useCallback(async () => {
        try { const res = await fetch(`${API}/api/stations`); const d = await res.json(); if (d.success) setStations(d.stations); } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchStations(); }, [fetchStations]);

    const handleSave = async () => {
        if (!form.id.trim() || !form.name.trim() || !form.city.trim()) { showToast('ID, Nama, dan Kota wajib diisi', false); return; }
        setSaving(true);
        try {
            const url = isEditing ? `${API}/api/admin/stations/${form.id}` : `${API}/api/admin/stations`;
            const method = isEditing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...form, latitude: parseFloat(form.latitude) || 0, longitude: parseFloat(form.longitude) || 0 })
            });
            const d = await res.json();
            if (d.success) {
                showToast(isEditing ? 'Stasiun berhasil diperbarui' : 'Stasiun berhasil ditambahkan', true);
                fetchStations();
                setShowForm(false);
                resetForm();
            }
            else showToast(d.error || 'Gagal', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleEdit = (s: any) => {
        setForm({
            id: s.id || '',
            name: s.name || '',
            city: s.city || '',
            latitude: s.latitude?.toString() || '',
            longitude: s.longitude?.toString() || '',
            ip_address: s.ip_address || '',
            nama_pic: s.nama_pic || '',
            kontak_pic: s.kontak_pic || '',
            kode_kota: s.kode_kota || '',
            alamat: s.alamat || '',
            provinsi: s.provinsi || '',
            kabupaten_kota: s.kabupaten_kota || '',
            kecamatan: s.kecamatan || '',
            kelurahan_desa: s.kelurahan_desa || '',
            kode_pos: s.kode_pos || ''
        });
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return; setSaving(true);
        try { const res = await fetch(`${API}/api/admin/stations/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const d = await res.json(); if (d.success) { showToast(`Stasiun "${deleteTarget.name}" dihapus`, true); fetchStations(); } else showToast(d.error || 'Gagal', false); } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    const handleSeed = async () => {
        if (!confirm('Apakah Anda yakin ingin memetakan stasiun dari data GeoJSON master? Aksi ini akan memperbarui data yang sudah ada.')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/seed-stations`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) { showToast(`${d.count} stasiun berhasil dipetakan`, true); fetchStations(); } else showToast(d.error || 'Gagal', false);
        } catch (err) { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleImportGeoJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const geojson = JSON.parse(event.target?.result as string);
                // const token = localStorage.getItem('pids_admin_token'); // Token is already passed as prop

                showToast('Mengimpor stasiun...', true);

                const response = await fetch(`${API}/api/admin/stations/import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ geojson })
                });

                const result = await response.json();

                if (result.success) {
                    showToast(`Berhasil mengimpor ${result.count} stasiun`, true);
                    fetchStations();
                    if (result.errors) {
                        console.warn('Import completed with some errors:', result.errors);
                    }
                } else {
                    showToast(result.error || 'Gagal mengimpor GeoJSON', false);
                }
            } catch (err) {
                showToast('File GeoJSON tidak valid', false);
                console.error(err);
            }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filtered = search ? stations.filter(s => (s.name || '').toUpperCase().includes(search.toUpperCase()) || (s.city || '').toUpperCase().includes(search.toUpperCase()) || (s.id || '').toUpperCase().includes(search.toUpperCase())) : stations;
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
                <div><h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight mb-2">Manajemen Stasiun</h2><p className="text-slate-500 text-base font-medium">{stations.length} stasiun terdaftar</p></div>
                <div className="flex gap-4">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari stasiun..." className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-base font-medium text-[#1d2d6a] placeholder-slate-400 focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all w-64 shadow-sm" />
                    <button onClick={handleSeed} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-[#1d2d6a] hover:bg-slate-200 rounded-2xl font-black text-base transition-all active:scale-95 border border-slate-200 shadow-sm disabled:opacity-50">
                        Map Stasiun
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportGeoJSON}
                        accept=".geojson,application/json"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl transition-all font-black text-base border border-slate-600 shadow-sm"
                    >
                        <FileJson size={18} />
                        <span>Import GeoJSON</span>
                    </button>
                    <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                        {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Stasiun</>}
                    </button>
                </div>
            </div>
            <AnimatePresence>{showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6 overflow-hidden">
                <h3 className="text-slate-400 font-black text-sm">{isEditing ? 'Edit Stasiun' : 'Stasiun Baru'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {FORM_FIELDS.map(f => (
                        <div key={f.key} className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">{f.label}</label>
                            <input
                                value={(form as any)[f.key]}
                                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                placeholder={f.placeholder}
                                disabled={isEditing && f.key === 'id'}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] placeholder-slate-400 font-bold text-base focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all ${isEditing && f.key === 'id' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                        </div>
                    ))}
                </div>
                <button onClick={handleSave} disabled={saving} className="px-8 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-black rounded-2xl text-base transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)]">
                    {saving ? 'Menyimpan...' : <><CheckCircle2 size={20} />{isEditing ? 'Perbarui Stasiun' : 'Simpan Stasiun'}</>}
                </button>
            </motion.div>}</AnimatePresence>
            {loading ? <div className="p-8 text-center text-slate-500">Memuat stasiun...</div> : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-[80px_1fr_1fr_130px_1fr_110px_100px] gap-0 px-6 py-4 bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-black"><span>Kode</span><span>Nama</span><span>Kota</span><span>Kode Pos</span><span>PIC</span><span>Koordinat</span><span></span></div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {filtered.map((s, i) => (
                            <motion.div key={s.id} onClick={() => handleEdit(s)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                className="grid grid-cols-[80px_1fr_1fr_130px_1fr_110px_100px] gap-0 px-6 py-5 hover:bg-slate-50 transition-colors items-center group cursor-pointer active:scale-[0.99]">
                                <span className="text-[#ee6f1f] font-mono font-black text-base">{s.id}</span>
                                <span className="text-[#1d2d6a] font-black text-base">{s.name}</span>
                                <span className="text-slate-500 text-base">{s.city}</span>
                                <span className="text-slate-400 font-mono text-sm">{s.kode_pos || '-'}</span>
                                <span className="text-slate-500 text-base">{s.nama_pic || '-'}</span>
                                <span className="text-slate-400 font-mono text-xs">{s.latitude ? `${s.latitude.toFixed(2)},${s.longitude.toFixed(2)}` : '-'}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(s); }} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"><Pencil size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95"><Trash2 size={16} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
