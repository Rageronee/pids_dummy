import { useState, useEffect, useCallback } from 'react';
import { Train, Plus, Trash2, RefreshCcw, Wifi, Clock, Pencil, X, CheckCircle2, User, Phone, MapPin, Building2, Layout, FileText, Settings, Activity, Info, Save, ArrowUp, ArrowDown } from 'lucide-react';
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

    const [stations, setStations] = useState<any[]>([]);
    const [form, setForm] = useState({ 
        name: '', ka_number: '', ip_address: '', status: 'Active',
        origin_station_id: '', destination_station_id: '', notes: '',
        pic_name: '', pic_contact: '', media: '',
        gerbongs: [] as any[],
        route_stations: [] as any[]
    });
    const [stationSearch, setStationSearch] = useState('');

    const fetchTrains = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/trains`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setTrains(d.trains || []);
        } catch { } finally { setLoading(false); }
    }, [token]);

    const fetchStations = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/stations`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setStations(d.stations || []);
        } catch { }
    }, [token]);

    useEffect(() => { 
        fetchTrains(); 
        fetchStations();
    }, [fetchTrains, fetchStations]);

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/trains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                    name: form.name.trim(), 
                    ka_number: form.ka_number, 
                    ip_address: form.ip_address,
                    origin_station_id: form.origin_station_id,
                    destination_station_id: form.destination_station_id,
                    notes: form.notes,
                    pic_name: form.pic_name,
                    pic_contact: form.pic_contact,
                    media: form.media
                })
            });
            const d = await res.json();
            if (d.success) {
                // Save route if intermediate stations are present
                if (form.route_stations.length > 0) {
                    await fetch(`${API}/api/admin/routes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ name: form.name.trim(), stations: form.route_stations })
                    });
                }

                // Save gerbongs
                if (form.gerbongs.length > 0) {
                    await fetch(`${API}/api/admin/trains/${encodeURIComponent(form.name.trim())}/gerbongs`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ gerbongs: form.gerbongs })
                    });
                }
                await fetchTrains();
                setForm({ 
                    name: '', ka_number: '', ip_address: '', status: 'Active',
                    origin_station_id: '', destination_station_id: '', notes: '',
                    pic_name: '', pic_contact: '', media: '',
                    gerbongs: [],
                    route_stations: []
                });
                setShowForm(false);
                showToast('Kereta, Rute & Gerbong berhasil dikonfigurasi', true);
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

    const addStationToRoute = (stationName: string) => {
        if (form.route_stations.find((s: any) => s.name === stationName)) return;
        setForm({ ...form, route_stations: [...form.route_stations, { name: stationName, notes: 'intermediate' }] });
        setStationSearch('');
    };

    const filteredSuggestions = (() => {
        const queryStr = stationSearch.trim().toLowerCase();
        if (!queryStr) return [];
        return stations.filter(s => s.name.toLowerCase().includes(queryStr) || s.city.toLowerCase().includes(queryStr)).slice(0, 10);
    })();

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
                    <h2 className="text-3xl font-bold text-[#1d2d6a] tracking-tight mb-2">Manajemen Kereta</h2>
                    <p className="text-slate-500 text-base font-medium">{trains.length} kereta terdaftar dalam sistem pids</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchTrains} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] hover:border-[#1d2d6a] transition-all active:scale-95"><RefreshCcw size={20} /></button>
                    <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 h-11 px-6 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                        {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Kereta</>}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-[#1d2d6a] font-bold text-lg flex items-center gap-2"><Plus size={20} className="text-[#ee6f1f]" /> Registrasi Kereta & Gerbong</h3>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">Konfigurasi Armada</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Train Info & Intermediate Stations */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Identitas utama</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama Kereta</label>
                                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="e.g. ARGO WILIS" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Train Code (KA)</label>
                                            <input value={form.ka_number} onChange={e => setForm({ ...form, ka_number: e.target.value.toUpperCase() })} placeholder="e.g. 1A" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Origin Station</label>
                                            <select value={form.origin_station_id} onChange={e => setForm({ ...form, origin_station_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all">
                                                <option value="">Select Station</option>
                                                {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Destination Station</label>
                                            <select value={form.destination_station_id} onChange={e => setForm({ ...form, destination_station_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all">
                                                <option value="">Select Station</option>
                                                {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Route Stations (Intermediate)</h4>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><MapPin size={16} /></div>
                                        <input value={stationSearch} onChange={e => setStationSearch(e.target.value)} placeholder="Search intermediate station..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        {filteredSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                                                {filteredSuggestions.map((s, idx) => (
                                                    <button key={idx} onClick={() => addStationToRoute(s.name)} className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                        <div><div className="text-[#1d2d6a] font-semibold text-sm">{s.name}</div><div className="text-slate-400 text-[10px] font-semibold uppercase">{s.city}</div></div>
                                                        <Plus size={16} className="text-slate-300 group-hover:text-[#ee6f1f]" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[100px] space-y-2">
                                        {form.route_stations.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-slate-300 py-6 italic text-xs">No intermediate stations selected</div>
                                        ) : (
                                            form.route_stations.map((s, idx) => (
                                                <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-2 shadow-xs">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center text-[10px] font-semibold text-slate-400">{idx + 1}</div>
                                                            <span className="text-[#1d2d6a] font-semibold text-xs">{s.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => {
                                                                const nr = [...form.route_stations];
                                                                if (idx > 0) [nr[idx], nr[idx-1]] = [nr[idx-1], nr[idx]];
                                                                setForm({ ...form, route_stations: nr });
                                                            }} className="p-1.5 text-slate-300 hover:text-slate-500"><ArrowUp size={14}/></button>
                                                            <button onClick={() => {
                                                                const nr = [...form.route_stations];
                                                                if (idx < nr.length - 1) [nr[idx], nr[idx+1]] = [nr[idx+1], nr[idx]];
                                                                setForm({ ...form, route_stations: nr });
                                                            }} className="p-1.5 text-slate-300 hover:text-slate-500"><ArrowDown size={14}/></button>
                                                            <button onClick={() => setForm({ ...form, route_stations: form.route_stations.filter((_, i) => i !== idx) })} className="p-1.5 text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        value={s.notes || ''} 
                                                        onChange={e => {
                                                            const nr = [...form.route_stations];
                                                            nr[idx].notes = e.target.value;
                                                            setForm({ ...form, route_stations: nr });
                                                        }}
                                                        placeholder="Station notes (e.g. Stop, Pass)" 
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[#1d2d6a] font-medium text-[10px] focus:outline-none focus:border-[#ee6f1f]" 
                                                    />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[#1d2d6a] text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-wider">Operational & PIC</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIC Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <input value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIC Contact</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <input value={form.pic_contact} onChange={e => setForm({ ...form, pic_contact: e.target.value })} placeholder="Phone Number" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">IP Address</label>
                                            <div className="relative">
                                                <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} placeholder="e.g. 192.168.1.10" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notes</label>
                                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Operational Notes" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Media / Attachment (URL)</label>
                                        <div className="relative">
                                            <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input value={form.media} onChange={e => setForm({ ...form, media: e.target.value })} placeholder="URL Gambar/Media Kereta" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Gerbong List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                                    <h4 className="font-semibold text-[#1d2d6a] text-xs uppercase tracking-wider flex items-center gap-2"><Layout size={14} /> Daftar Gerbong</h4>
                                    <button onClick={() => setForm({ ...form, gerbongs: [...form.gerbongs, { nama_gerbong: '', no_urut: form.gerbongs.length + 1, media: '', log_maintenance: '', log_operasional: '' }] })} className="text-[10px] font-semibold text-[#ee6f1f] hover:text-[#d45d15] flex items-center gap-1 uppercase tracking-widest"><Plus size={12} /> Tambah Gerbong</button>
                                </div>

                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {form.gerbongs.length === 0 ? (
                                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                            <Layout size={32} className="text-slate-200 mx-auto mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada gerbong terdaftar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {form.gerbongs.map((g, idx) => (
                                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 relative group">
                                                    <button onClick={() => setForm({ ...form, gerbongs: form.gerbongs.filter((_, i) => i !== idx) })} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 bg-[#1d2d6a] text-white rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0">{idx + 1}</div>
                                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] font-semibold text-slate-400 uppercase">Nama Gerbong</label>
                                                                <input value={g.nama_gerbong} onChange={e => {
                                                                    const ng = [...form.gerbongs];
                                                                    ng[idx].nama_gerbong = e.target.value.toUpperCase();
                                                                    setForm({ ...form, gerbongs: ng });
                                                                }} placeholder="e.g. EKSEKUTIF 1" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[#1d2d6a] font-semibold text-xs" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] font-semibold text-slate-400 uppercase">No. Urut</label>
                                                                <input type="number" value={g.no_urut} onChange={e => {
                                                                    const ng = [...form.gerbongs];
                                                                    ng[idx].no_urut = Number(e.target.value);
                                                                    setForm({ ...form, gerbongs: ng });
                                                                }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[#1d2d6a] font-semibold text-xs" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-semibold text-slate-400 uppercase flex items-center gap-1"><Settings size={10} /> Maintenance Log</label>
                                                            <input value={g.log_maintenance} onChange={e => {
                                                                const ng = [...form.gerbongs];
                                                                ng[idx].log_maintenance = e.target.value;
                                                                setForm({ ...form, gerbongs: ng });
                                                            }} placeholder="Status Terakhir" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[#1d2d6a] font-semibold text-[10px]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-semibold text-slate-400 uppercase flex items-center gap-1"><Activity size={10} /> Ops Log</label>
                                                            <input value={g.log_operasional} onChange={e => {
                                                                const ng = [...form.gerbongs];
                                                                ng[idx].log_operasional = e.target.value;
                                                                setForm({ ...form, gerbongs: ng });
                                                            }} placeholder="Riwayat Perjalanan" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[#1d2d6a] font-semibold text-[10px]" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-semibold text-slate-400 uppercase flex items-center gap-1"><Info size={10} /> MediaURL</label>
                                                        <input value={g.media} onChange={e => {
                                                            const ng = [...form.gerbongs];
                                                            ng[idx].media = e.target.value;
                                                            setForm({ ...form, gerbongs: ng });
                                                        }} placeholder="URL Gambar Gerbong" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[#1d2d6a] font-semibold text-[10px]" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowForm(false)} className="h-11 px-8 bg-slate-100 text-slate-500 font-semibold rounded-2xl text-sm transition-all active:scale-95">Batal</button>
                            <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="h-11 px-12 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-semibold rounded-2xl text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg group">
                                {saving ? 'Menyimpan...' : <><Save size={20} className="group-hover:scale-110 transition-transform" />Simpan Konfigurasi Armada</>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] gap-0 px-8 py-5 bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
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
                                            <span className="text-[#1d2d6a] font-semibold text-base">{train.name}</span>
                                            {train.ka_number && <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">{train.ka_number}</span>}
                                        </div>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-tight">Layanan PIDS Aktif</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 font-mono font-bold text-sm">
                                    <Wifi size={14} className="text-green-500" />
                                    {train.ip_address || '-'}
                                </div>
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${train.status === 'Active' ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
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
