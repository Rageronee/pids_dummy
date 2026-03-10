import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Pencil, CheckCircle2, ChevronRight, X, Search, ArrowUp, ArrowDown, FileJson, Building2, MapPinned, Save, RefreshCw } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

export default function RoutesPage({ token }: { token: string }) {
    const [activeTab, setActiveTab] = useState<'routes' | 'stations'>('routes');
    const [routes, setRoutes] = useState<Record<string, any>>({});
    const [masterStations, setMasterStations] = useState<any[]>([]);
    const [dbStations, setDbStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showStationForm, setShowStationForm] = useState(false);

    // Route Form State
    const [newRouteName, setNewRouteName] = useState('');
    const [selectedStations, setSelectedStations] = useState<Array<{ name: string; time: string }>>([]);
    const [stationSearch, setStationSearch] = useState('');
    const [currentRouteGeojson, setCurrentRouteGeojson] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Station Form State
    const [stationForm, setStationForm] = useState({
        id: '', name: '', city: '', kode_kota: '', ip_address: '', latitude: 0, longitude: 0
    });
    const [editingStationId, setEditingStationId] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const { toast, showToast, closeToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchRoutes = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/routes`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setRoutes(d.routes);
        } catch { } finally { setLoading(false); }
    }, [token]);

    const fetchMasterStations = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/stations-master`);
            const d = await res.json();
            if (d.success) setMasterStations(d.data.features || []);
        } catch { }
    }, []);

    const fetchDbStations = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/stations`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) setDbStations(d.stations || []);
        } catch { }
    }, [token]);

    useEffect(() => {
        setLoading(true);
        const load = async () => {
            await Promise.all([fetchRoutes(), fetchMasterStations(), fetchDbStations()]);
            setLoading(false);
        };
        load();
    }, [fetchRoutes, fetchMasterStations, fetchDbStations]);

    const resetForm = () => {
        setNewRouteName('');
        setSelectedStations([]);
        setCurrentRouteGeojson(null);
        setIsEditing(false);
        setStationSearch('');
    };

    const resetStationForm = () => {
        setStationForm({ id: '', name: '', city: '', kode_kota: '', ip_address: '', latitude: 0, longitude: 0 });
        setEditingStationId(null);
        setShowStationForm(false);
    };

    const handleSaveRoute = async (autoName?: string, autoStations?: any[]) => {
        const nameToSave = autoName || newRouteName;
        const stationsToSave = autoStations || selectedStations;

        if (!nameToSave.trim() || stationsToSave.length < 2) {
            showToast('Nama rute dan minimal 2 stasiun diperlukan', false);
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/routes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: nameToSave.trim(), stations: stationsToSave })
            });
            const d = await res.json();
            if (d.success) {
                await fetchRoutes();
                setShowForm(false);
                resetForm();
                showToast(autoName ? 'Rute berhasil diimpor & disimpan' : (isEditing ? 'Rute berhasil diperbarui' : 'Rute berhasil disimpan'), true);
            }
            else showToast(d.error || 'Gagal menyimpan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleSaveStation = async () => {
        if (!stationForm.id || !stationForm.name || !stationForm.city) {
            showToast('ID, Nama, dan Kota wajib diisi', false);
            return;
        }
        setSaving(true);
        try {
            const endpoint = editingStationId
                ? `${API}/api/admin/stations/${editingStationId}`
                : `${API}/api/admin/stations`;
            const res = await fetch(endpoint, {
                method: editingStationId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(stationForm)
            });
            const d = await res.json();
            if (d.success) {
                await fetchDbStations();
                resetStationForm();
                showToast(`Stasiun ${stationForm.name} berhasil disimpan`, true);
            } else showToast(d.error || 'Gagal menyimpan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleEditRoute = (route: any) => {
        setNewRouteName(route.name);
        let geojsonObj: any = null;
        try { if (route.geojson) geojsonObj = JSON.parse(route.geojson); } catch (e) { console.error("Parse GeoJSON error:", e); }
        setCurrentRouteGeojson(geojsonObj);

        const stations = (route.stations || []).map((s: any) => {
            const sName = typeof s === 'string' ? s : s.name;
            let sTime = typeof s === 'string' ? '' : (s.time || '');

            if (geojsonObj?.features) {
                const f = geojsonObj.features.find((f: any) => f.properties?.name?.toUpperCase() === sName.toUpperCase());
                if (f?.properties) {
                    const geoTime = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time;
                    if (geoTime) sTime = geoTime;
                }
            }
            return { name: sName, time: sTime };
        });

        setSelectedStations(stations);
        setIsEditing(true);
        setShowForm(true);
        setActiveTab('routes');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditStation = (s: any) => {
        setStationForm({
            id: s.id, name: s.name, city: s.city,
            kode_kota: s.kode_kota || '', ip_address: s.ip_address || '',
            latitude: Number(s.latitude) || 0, longitude: Number(s.longitude) || 0
        });
        setEditingStationId(s.id);
        setShowStationForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const endpoint = deleteTarget.type === 'route'
                ? `${API}/api/admin/routes/${encodeURIComponent(deleteTarget.id)}`
                : `${API}/api/admin/stations/${deleteTarget.id}`;
            const res = await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) {
                if (deleteTarget.type === 'route') await fetchRoutes();
                else await fetchDbStations();
                showToast(`${deleteTarget.type === 'route' ? 'Rute' : 'Stasiun'} dihapus`, true);
            }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    const handleImportGeoJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const geojson = JSON.parse(event.target?.result as string);
                let routeName = '';
                const routeFeature = geojson.features.find((f: any) => f.geometry.type === 'LineString');
                if (routeFeature && routeFeature.properties?.name) {
                    routeName = routeFeature.properties.name.replace('Malabar: ', '').replace('Argo Wilis: ', '').trim();
                }

                const extractedStations = geojson.features
                    .filter((f: any) => f.geometry.type === 'Point' && f.properties?.name)
                    .map((f: any) => {
                        const name = f.properties.name.toUpperCase();
                        const time = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
                        return { name, time };
                    });

                if (extractedStations.length === 0) {
                    showToast('Tidak ada stasiun ditemukan dalam GeoJSON', false);
                    return;
                }

                const mappedStations = extractedStations.map((ext: any) => {
                    const match = dbStations.find(s => s.name?.toUpperCase() === ext.name);
                    return match ? { name: match.name, time: ext.time } : { name: ext.name, time: ext.time };
                });

                resetForm();
                setNewRouteName(routeName);
                setSelectedStations(mappedStations);
                showToast(`Mengimpor rute ${routeName}...`, true);
                setTimeout(() => handleSaveRoute(routeName, mappedStations), 500);

            } catch (err) {
                showToast('File GeoJSON tidak valid', false);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addStationToRoute = (stationName: string) => {
        if (selectedStations.find(s => s.name === stationName)) return;
        let foundTime = '';
        if (currentRouteGeojson?.features) {
            const f = currentRouteGeojson.features.find((feat: any) => feat.properties?.name?.toUpperCase() === stationName.toUpperCase());
            if (f?.properties) foundTime = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
        }
        if (!foundTime) {
            const f = masterStations.find(feat => feat.properties.name.toUpperCase() === stationName.toUpperCase());
            if (f?.properties) foundTime = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
        }
        setSelectedStations([...selectedStations, { name: stationName, time: foundTime }]);
        setStationSearch('');
    };

    const filteredSuggestions = (() => {
        const queryStr = stationSearch.trim().toLowerCase();
        if (!queryStr) return [];
        const fromMaster = masterStations
            .filter(f => (f.properties?.name || '').toLowerCase().includes(queryStr) || (f.properties?.city || '').toLowerCase().includes(queryStr))
            .map(f => ({ name: f.properties?.name || 'Unknown', city: f.properties?.city || 'Master' }));
        const fromDb = dbStations
            .filter(s => (s.name || '').toLowerCase().includes(queryStr) || (s.city || '').toLowerCase().includes(queryStr))
            .map(s => ({ name: s.name || 'Unknown', city: s.city || 'DB' }));
        const combined = [...fromMaster, ...fromDb];
        const seen = new Set();
        return combined.filter(s => {
            if (seen.has(s.name.toUpperCase())) return false;
            seen.add(s.name.toUpperCase());
            return true;
        }).slice(0, 10);
    })();

    const routeList = Object.values(routes);

    return (
        <div className="space-y-8">
            <ConfirmModal isOpen={!!deleteTarget} title={`Hapus ${deleteTarget?.type === 'route' ? 'Rute' : 'Stasiun'}`} message={`Hapus ${deleteTarget?.id}? Aksi ini bersifat permanen.`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight mb-2">Manajemen Rute & Stasiun</h2>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-sm font-medium">{routeList.length} rute</span>
                        <span className="text-slate-300 mx-2">•</span>
                        <span className="text-slate-500 text-sm font-medium">{dbStations.length} stasiun</span>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner self-start md:self-auto">
                    <button onClick={() => { setActiveTab('routes'); setShowForm(false); setShowStationForm(false); }} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'routes' ? 'bg-white text-[#1d2d6a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Manajemen Rute</button>
                    <button onClick={() => { setActiveTab('stations'); setShowForm(false); setShowStationForm(false); }} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'stations' ? 'bg-white text-[#1d2d6a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Manajemen Stasiun</button>
                </div>
            </div>

            {activeTab === 'routes' ? (
                <div className="space-y-8">
                    <div className="flex justify-end gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleImportGeoJSON} accept=".geojson,application/json" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-[#1D2D6A] hover:bg-[#1D2D6A]/80 text-white rounded-2xl transition-all font-black text-base border border-slate-600 shadow-sm"><FileJson size={18} />Import GeoJSON</button>
                        <button onClick={() => { if (isEditing) setShowForm(false); else setShowForm(!showForm); if (!showForm) resetForm(); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                            {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Rute</>}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showForm && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 overflow-hidden">
                                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
                                    <div className="flex items-center gap-3 text-[#1d2d6a] pb-4 border-b border-slate-100 mb-2">
                                        <MapPinned size={24} className="text-[#ee6f1f]" />
                                        <h3 className="font-black text-lg">{isEditing ? 'Edit Konfigurasi Rute' : 'Rute Baru'}</h3>
                                    </div>
                                    <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nama rute (e.g. GAJAYANA)" maxLength={60} disabled={isEditing} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all disabled:opacity-60" />
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
                                        <input value={stationSearch} onChange={e => setStationSearch(e.target.value)} placeholder="Cari stasiun (e.g. BANDUNG)..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                        <AnimatePresence>
                                            {filteredSuggestions.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {filteredSuggestions.map((s, idx) => (
                                                        <button key={idx} onClick={() => addStationToRoute(s.name)} className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                            <div><div className="text-[#1d2d6a] font-black text-base">{s.name}</div><div className="text-slate-400 text-xs font-bold uppercase tracking-wide">{s.city}</div></div>
                                                            <Plus size={18} className="text-slate-300 group-hover:text-[#ee6f1f]" />
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button onClick={() => handleSaveRoute()} disabled={saving} className="w-full px-8 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-black rounded-2xl text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md">
                                        {saving ? 'Menyimpan...' : <><CheckCircle2 size={20} />{isEditing ? 'Perbarui Rute' : 'Simpan Rute'}</>}
                                    </button>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 overflow-hidden flex flex-col min-h-[400px]">
                                    <h3 className="text-slate-400 font-black text-sm mb-6">Urutan Stasiun ({selectedStations.length})</h3>
                                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                        {selectedStations.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-60"><MapPin size={40} /><p className="text-sm font-bold">Belum ada stasiun dipilih</p></div> :
                                            selectedStations.map((s, idx) => (
                                                <motion.div key={idx} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">{idx + 1}</div>
                                                        <div className="flex flex-col"><span className="text-[#1d2d6a] font-black text-sm">{s.name}</span><input type="time" value={s.time} onChange={e => { const n = [...selectedStations]; n[idx].time = e.target.value; setSelectedStations(n); }} className="mt-1.5 bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-[#ee6f1f] focus:ring-2 focus:ring-orange-500/20 w-32" /></div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { const n = [...selectedStations];[n[idx], n[idx - 1]] = [n[idx - 1], n[idx]]; setSelectedStations(n); }} disabled={idx === 0} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-0"><ArrowUp size={16} /></button>
                                                        <button onClick={() => { const n = [...selectedStations];[n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; setSelectedStations(n); }} disabled={idx === selectedStations.length - 1} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-0"><ArrowDown size={16} /></button>
                                                        <button onClick={() => { const n = [...selectedStations]; n.splice(idx, 1); setSelectedStations(n); }} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><X size={16} /></button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? <div className="p-8 text-center text-slate-400 font-medium">Memuat rute...</div> : (
                        <div className="grid grid-cols-1 gap-4">
                            {routeList.map((route: any, i) => (
                                <motion.div key={route.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 group hover:shadow-md transition-all">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-[#1d2d6a] font-black"><MapPin size={22} /></div>
                                                <h3 className="text-[#1d2d6a] font-black text-xl">{route.name}</h3>
                                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{route.stations?.length || 0} stasiun</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {route.stations?.map((s: any, idx: number) => (
                                                    <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                                                        {idx > 0 && <ChevronRight size={10} className="text-slate-300" />}
                                                        {typeof s === 'string' ? s : s.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 self-end lg:self-center">
                                            <button onClick={() => handleEditRoute(route)} className="p-3 text-slate-400 hover:text-[#1d2d6a] hover:bg-slate-50 rounded-xl transition-all"><Pencil size={20} /></button>
                                            <button onClick={() => setDeleteTarget({ type: 'route', id: route.name })} className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex justify-end gap-3">
                        <button onClick={fetchDbStations} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 hover:text-[#1d2d6a] transition-all"><RefreshCw size={20} /></button>
                        <button onClick={() => { if (editingStationId) resetStationForm(); else setShowStationForm(!showStationForm); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${showStationForm ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                            {showStationForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Stasiun</>}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showStationForm && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 overflow-hidden">
                                <div className="flex items-center gap-3 text-[#1d2d6a] pb-4 border-b border-slate-100 mb-2">
                                    <Building2 size={24} className="text-[#ee6f1f]" />
                                    <h3 className="font-black text-lg">{editingStationId ? `Edit Stasiun ${stationForm.name}` : 'Registrasi Stasiun Baru'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">ID Stasiun</label>
                                        <input value={stationForm.id} onChange={e => setStationForm({ ...stationForm, id: e.target.value.toUpperCase() })} placeholder="e.g. BD" disabled={!!editingStationId} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Nama Stasiun</label>
                                        <input value={stationForm.name} onChange={e => setStationForm({ ...stationForm, name: e.target.value.toUpperCase() })} placeholder="e.g. BANDUNG" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Kota</label>
                                        <input value={stationForm.city} onChange={e => setStationForm({ ...stationForm, city: e.target.value.toUpperCase() })} placeholder="e.g. BANDUNG" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Kode Kota</label>
                                        <input value={stationForm.kode_kota} onChange={e => setStationForm({ ...stationForm, kode_kota: e.target.value.toUpperCase() })} placeholder="e.g. BDG" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">IP Address</label>
                                        <input value={stationForm.ip_address} onChange={e => setStationForm({ ...stationForm, ip_address: e.target.value })} placeholder="e.g. 192.168.1.10" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Latitude</label>
                                        <input type="number" step="0.0001" value={stationForm.latitude} onChange={e => setStationForm({ ...stationForm, latitude: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Longitude</label>
                                        <input type="number" step="0.0001" value={stationForm.longitude} onChange={e => setStationForm({ ...stationForm, longitude: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-[#1d2d6a] font-bold text-base focus:outline-none focus:border-[#ee6f1f] transition-all" />
                                    </div>
                                    <div className="md:col-span-1 pt-6">
                                        <button onClick={handleSaveStation} disabled={saving} className="w-full h-14 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md">
                                            {saving ? 'Menyimpan...' : <><Save size={18} />Simpan Stasiun</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[#1d2d6a] font-black text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-5"># ID</th>
                                        <th className="px-6 py-5">Nama Stasiun</th>
                                        <th className="px-6 py-5">Kota</th>
                                        <th className="px-6 py-5">Kode Kota</th>
                                        <th className="px-6 py-5">IP Server</th>
                                        <th className="px-6 py-5 text-right w-[120px]">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dbStations.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{s.id}</td>
                                            <td className="px-6 py-4 font-black text-sm text-[#1d2d6a]">{s.name}</td>
                                            <td className="px-6 py-4 text-slate-500 font-bold text-sm">{s.city}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{s.kode_kota || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{s.ip_address || '-'}</td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleEditStation(s)} className="p-2 text-slate-400 hover:text-[#1d2d6a] rounded-lg transition-colors"><Pencil size={16} /></button>
                                                    <button onClick={() => setDeleteTarget({ type: 'station', id: s.id })} className="p-2 text-red-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {dbStations.length === 0 && !loading && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada stasiun dalam database.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
