import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Pencil, CheckCircle2, ChevronRight, X, AlertCircle, Search, ArrowUp, ArrowDown, FileJson } from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';

export default function RoutesPage({ token }: { token: string }) {
    const [routes, setRoutes] = useState<Record<string, any>>({});
    const [masterStations, setMasterStations] = useState<any[]>([]);
    const [dbStations, setDbStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newRouteName, setNewRouteName] = useState('');
    const [selectedStations, setSelectedStations] = useState<Array<{ name: string; time: string }>>([]);
    const [stationSearch, setStationSearch] = useState('');
    const [currentRouteGeojson, setCurrentRouteGeojson] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
        fetchRoutes();
        fetchMasterStations();
        fetchDbStations();
    }, [fetchRoutes, fetchMasterStations, fetchDbStations]);

    const resetForm = () => {
        setNewRouteName('');
        setSelectedStations([]);
        setCurrentRouteGeojson(null);
        setIsEditing(false);
        setStationSearch('');
    };

    const handleSave = async (autoName?: string, autoStations?: any[]) => {
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

    const handleEdit = (route: any) => {
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelForm = () => { setShowForm(false); resetForm(); };

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

    const handleImportGeoJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const geojson = JSON.parse(event.target?.result as string);

                // 1. Extract Route Name
                let routeName = '';
                const routeFeature = geojson.features.find((f: any) => f.geometry.type === 'LineString');
                if (routeFeature && routeFeature.properties?.name) {
                    routeName = routeFeature.properties.name.replace('Malabar: ', '').replace('Argo Wilis: ', '').trim();
                }

                // 2. Extract Stations
                const extractedStations = geojson.features
                    .filter((f: any) => f.geometry.type === 'Point' && f.properties?.name)
                    .map((f: any) => {
                        const name = f.properties.name.toUpperCase();
                        // Try matching with schedule if available
                        const time = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
                        return { name, time };
                    });

                if (extractedStations.length === 0) {
                    showToast('Tidak ada stasiun ditemukan dalam GeoJSON', false);
                    return;
                }

                // Match with existing station objects to get IDs (using dbStations as the source)
                const mappedStations = extractedStations.map((ext: any) => {
                    const match = dbStations.find(s => s.name?.toUpperCase() === ext.name);
                    // If a match is found, use its properties, otherwise just use the extracted name and time
                    return match ? { name: match.name, time: ext.time } : { name: ext.name, time: ext.time };
                });

                // Auto populate form
                resetForm();
                setNewRouteName(routeName);
                setSelectedStations(mappedStations);

                // Automatically save after a short delay to ensure state or just pass values directly
                showToast(`Mengimpor rute ${routeName}...`, true);
                setTimeout(() => {
                    handleSave(routeName, mappedStations);
                }, 500);

            } catch (err) {
                showToast('File GeoJSON tidak valid', false);
                console.error(err);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addStationToRoute = (stationName: string) => {
        if (selectedStations.find(s => s.name === stationName)) return;

        let foundTime = '';
        // Try to find time in current route's geojson first
        if (currentRouteGeojson?.features) {
            const f = currentRouteGeojson.features.find((feat: any) => feat.properties?.name?.toUpperCase() === stationName.toUpperCase());
            if (f?.properties) foundTime = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
        }

        // If not found, try master stations
        if (!foundTime) {
            const f = masterStations.find(feat => feat.properties.name.toUpperCase() === stationName.toUpperCase());
            if (f?.properties) foundTime = f.properties.schedule_ka68 || f.properties.schedule_ka67 || f.properties.time || '';
        }

        setSelectedStations([...selectedStations, { name: stationName, time: foundTime }]);
        setStationSearch('');
    };

    const updateStationTime = (index: number, time: string) => {
        const next = [...selectedStations];
        next[index].time = time;
        setSelectedStations(next);
    };

    const removeStationFromRoute = (index: number) => {
        const next = [...selectedStations];
        next.splice(index, 1);
        setSelectedStations(next);
    };

    const moveStation = (index: number, direction: 'up' | 'down') => {
        const next = [...selectedStations];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        setSelectedStations(next);
    };

    const filteredSuggestions = (() => {
        const queryStr = stationSearch.trim().toLowerCase();
        if (!queryStr) return [];

        // Search in master geojson
        const fromMaster = masterStations
            .filter(f => (f.properties?.name || '').toLowerCase().includes(queryStr) || (f.properties?.city || '').toLowerCase().includes(queryStr))
            .map(f => ({ name: f.properties?.name || 'Unknown', city: f.properties?.city || 'Master' }));

        // Search in db stations
        const fromDb = dbStations
            .filter(s => (s.name || '').toLowerCase().includes(queryStr) || (s.city || '').toLowerCase().includes(queryStr))
            .map(s => ({ name: s.name || 'Unknown', city: s.city || 'DB' }));

        // Combine and dedup
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
            <ConfirmModal isOpen={!!deleteTarget} title="Hapus Rute" message={`Apakah Anda yakin ingin menutup rute "${deleteTarget}"? Aksi ini tidak dapat dibatalkan.`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight mb-2">Manajemen Rute & Stasiun</h2>
                    <p className="text-slate-500 text-base font-medium">{routeList.length} rute terdaftar</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportGeoJSON}
                        accept=".geojson,application/json"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#1D2D6A] hover:bg-[#1D2D6A]/80 text-white rounded-2xl transition-all font-black text-base border border-slate-600 shadow-sm"
                    >
                        <FileJson size={18} />
                        <span>Import GeoJSON</span>
                    </button>
                    <button onClick={() => {
                        if (isEditing) cancelForm();
                        else {
                            const next = !showForm;
                            setShowForm(next);
                            if (next) {
                                resetForm();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }
                    }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200' : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'}`}>
                        {showForm ? <><X size={18} />Batal</> : <><Plus size={18} />Tambah Rute</>}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 overflow-hidden">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
                        <h3 className="text-slate-400 font-black text-sm">{isEditing ? 'Edit Rute' : 'Rute Baru'}</h3>
                        <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nama rute (e.g. GAJAYANA)" maxLength={60} disabled={isEditing}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[#1d2d6a] placeholder-slate-400 font-bold text-base focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all disabled:opacity-60" />

                        <div className="relative">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
                            <input value={stationSearch} onChange={e => setStationSearch(e.target.value)} placeholder="Cari stasiun (e.g. BANDUNG)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-[#1d2d6a] placeholder-slate-400 font-bold text-base focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all" />

                            <AnimatePresence>
                                {filteredSuggestions.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {filteredSuggestions.map((s, idx) => (
                                            <button key={`${s.name}-${idx}`} onClick={() => addStationToRoute(s.name)}
                                                className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                <div>
                                                    <div className="text-[#1d2d6a] font-black text-base">{s.name}</div>
                                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wide">{s.city}</div>
                                                </div>
                                                <Plus size={18} className="text-slate-300 group-hover:text-[#ee6f1f]" />
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button onClick={() => handleSave()} disabled={saving} className="w-full px-8 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)] disabled:shadow-none">
                            {saving ? 'Menyimpan...' : <><CheckCircle2 size={20} />{isEditing ? 'Perbarui Rute' : 'Simpan Rute'}</>}
                        </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 overflow-hidden flex flex-col min-h-[400px]">
                        <h3 className="text-slate-400 font-black text-sm mb-6">Urutan Stasiun ({selectedStations.length})</h3>
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {selectedStations.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-60">
                                    <MapPin size={40} />
                                    <p className="text-sm font-bold">Belum ada stasiun dipilih</p>
                                </div>
                            ) : (
                                selectedStations.map((s, idx) => (
                                    <motion.div key={idx} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                        className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">{idx + 1}</div>
                                            <div className="flex flex-col">
                                                <span className="text-[#1d2d6a] font-black text-sm">{s.name}</span>
                                                <input type="time" value={s.time} onChange={e => updateStationTime(idx, e.target.value)}
                                                    className="mt-1.5 bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-[#ee6f1f] focus:ring-2 focus:ring-orange-500/20 w-32" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveStation(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-0"><ArrowUp size={16} /></button>
                                            <button onClick={() => moveStation(idx, 'down')} disabled={idx === selectedStations.length - 1} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-0"><ArrowDown size={16} /></button>
                                            <button onClick={() => removeStationFromRoute(idx)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><X size={16} /></button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>}
            </AnimatePresence>

            {loading ? <div className="p-8 text-center text-slate-500 font-medium">Memuat rute...</div> : (
                <div className="grid grid-cols-1 gap-4">
                    {routeList.map((route: any, i) => (
                        <motion.div key={route.name} onClick={() => handleEdit(route)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 group hover:shadow-md transition-all cursor-pointer active:scale-[0.99] active:bg-slate-50">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-[#1d2d6a]"><MapPin size={22} /></div>
                                        <h3 className="text-[#1d2d6a] font-black text-xl">{route.name}</h3>
                                        <span className="text-slate-400 text-xs font-bold tracking-wide">{route.stations?.length || 0} Stasiun</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {route.stations?.map((s: any, j: number) => {
                                            const name = typeof s === 'string' ? s : s.name;
                                            const time = typeof s === 'string' ? '' : s.time;
                                            return (
                                                <span key={j} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-bold tracking-tight">
                                                    {j > 0 && <ChevronRight size={12} className="text-slate-300" />}
                                                    {name} {time && <span className="text-[#ee6f1f] ml-1.5 font-black">{time}</span>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(route); }} className="p-3 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"><Pencil size={18} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(route.name); }} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-transparent hover:border-red-200"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
