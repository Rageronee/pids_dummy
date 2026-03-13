import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
    MapPin, Plus, Trash2, Pencil, CheckCircle2, ChevronRight, ChevronLeft,
    X, Search, ArrowUp, ArrowDown, FileJson, MapPinned,
    Save, Navigation, Map as MapIcon, Train, Users, Clock,
    AlertCircle, ExternalLink, MoreVertical, LayoutGrid, List,
    Lock, Unlock, RefreshCw
} from 'lucide-react';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Route {
    name: string;
    stations: any[];
    geojson?: string;
    status?: 'ON TRACK' | 'DELAYED';
    type?: 'Intercity' | 'Commuter' | 'Lokal';
    train_number?: string;
    units?: number;
    distance?: number;
    occupancy?: number;
    scheduled_time?: string;
    delay?: string;
    is_active?: boolean;
}

export default function RoutesPage({ token, setHeader }: { token: string, setHeader: (node: React.ReactNode) => void }) {
    const [routes, setRoutes] = useState<Record<string, Route>>({});
    const [masterStations, setMasterStations] = useState<any[]>([]);
    const [dbStations, setDbStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All Routes');
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Route Form State
    const [newRouteName, setNewRouteName] = useState('');
    const [selectedStations, setSelectedStations] = useState<Array<{ name: string; time: string; platform?: string; status?: string; type?: string }>>([]);
    const [stationSearch, setStationSearch] = useState('');
    const [currentRouteGeojson, setCurrentRouteGeojson] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [saving, setSaving] = useState(false);
    const [connected, setConnected] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const { toast, showToast, closeToast } = useToast();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    const fetchRoutes = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/routes`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.success) {
                const enhancedRoutes: Record<string, Route> = {};
                const keys = Object.keys(d.routes);
                keys.forEach((key, idx) => {
                    const r = d.routes[key];
                    // Logic for conventional train numbers vs PLB
                    const isPLB = idx % 5 === 0;
                    const conventionalNum = `${Math.floor(Math.random() * 200) + 1}`;

                    enhancedRoutes[key] = {
                        ...r,
                        status: idx % 3 === 1 ? 'DELAYED' : 'ON TRACK',
                        type: idx % 4 === 3 ? 'Commuter' : (idx % 4 === 2 ? 'Lokal' : 'Intercity'),
                        is_active: idx % 3 === 0,
                        train_number: r.kereta_code || (isPLB ? `PLB ${conventionalNum}A` : `KA ${conventionalNum}`),
                        units: Math.floor(Math.random() * 10) + 5,
                        distance: 600 + Math.floor(Math.random() * 200),
                        occupancy: 80 + Math.floor(Math.random() * 20),
                        scheduled_time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:00`,
                        delay: idx % 3 === 1 ? `${Math.floor(Math.random() * 20) + 5}m Delay` : '0m'
                    };
                });
                setRoutes(enhancedRoutes);
                if (!selectedRouteId && keys.length > 0) {
                    setSelectedRouteId(keys[0]);
                }
            }
        } catch { } finally { setLoading(false); }
    }, [token, selectedRouteId]);

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

    // Map initialization
    useEffect(() => {
        if (!selectedRouteId || !mapContainerRef.current) return;

        const darkStyle: maplibregl.StyleSpecification = {
            version: 8,
            sources: {
                'carto-voyager': {
                    type: 'raster',
                    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}@2x.png'],
                    tileSize: 256,
                    attribution: '&copy; CARTO'
                }
            },
            layers: [{ id: 'carto-layer', type: 'raster', source: 'carto-voyager', minzoom: 0, maxzoom: 19 }]
        };

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: darkStyle,
            center: [107.6191, -6.9175],
            zoom: 6,
            attributionControl: false
        });

        const route = routes[selectedRouteId];
        if (route?.geojson && mapRef.current) {
            try {
                const geojson = JSON.parse(route.geojson);
                const onMapLoad = () => {
                    if (!mapRef.current) return;
                    if (mapRef.current.getSource('route')) {
                        (mapRef.current.getSource('route') as maplibregl.GeoJSONSource).setData(geojson);
                    } else {
                        mapRef.current.addSource('route', { type: 'geojson', data: geojson });
                        mapRef.current.addLayer({
                            id: 'route-line', type: 'line', source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#ee6f1f', 'line-width': 4 }
                        });
                    }

                    const bounds = new maplibregl.LngLatBounds();
                    let hasPoints = false;
                    geojson.features.forEach((f: any) => {
                        if (f.geometry.type === 'Point') {
                            bounds.extend(f.geometry.coordinates);
                            hasPoints = true;
                        } else if (f.geometry.type === 'LineString') {
                            f.geometry.coordinates.forEach((c: any) => {
                                bounds.extend(c);
                                hasPoints = true;
                            });
                        }
                    });
                    if (hasPoints) {
                        mapRef.current.fitBounds(bounds, { padding: 40, duration: 1000 });
                    }
                };

                if (mapRef.current.loaded()) onMapLoad();
                else mapRef.current.on('load', onMapLoad);
            } catch (e) { console.error("Map GeoJSON error:", e); }
        }

        return () => { mapRef.current?.remove(); mapRef.current = null; };
    }, [selectedRouteId, routes]);

    useEffect(() => {
        const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
        socket.on('connect', () => {
            console.log('[Socket.IO] Routes page connected');
            setConnected(true);
        });
        socket.on('disconnect', () => {
            setConnected(false);
        });
        socket.on('db:update', () => {
            console.log('[Socket.IO] Database update received, re-fetching routes...');
            fetchRoutes();
        });
        return () => {
            socket.disconnect();
        };
    }, [fetchRoutes]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, searchQuery]);

    const resetForm = useCallback(() => {
        setNewRouteName('');
        setSelectedStations([]);
        setCurrentRouteGeojson(null);
        setIsEditing(false);
        setStationSearch('');
    }, []);

    const handleSaveRoute = useCallback(async (autoName?: string, autoStations?: any[]) => {
        const nameToSave = autoName || newRouteName;
        const stationsToSave = autoStations || selectedStations;

        if (!nameToSave.trim() || stationsToSave.length < 2) {
            showToast('Nama rute dan minimal 2 stasiun diperlukan', false);
            return;
        }

        const existing = routes[nameToSave];
        if (existing?.is_active) {
            showToast('Rute ini sedang berjalan dan tidak dapat dimodifikasi!', false);
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
    }, [newRouteName, selectedStations, routes, token, fetchRoutes, resetForm, isEditing, showToast]);

    const handleEditRoute = useCallback((route: any) => {
        if (route.is_active) {
            showToast('Akses Ditolak: Rute sedang aktif!', false);
            return;
        }
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
    }, [showToast]);

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        if (routes[deleteTarget.id]?.is_active) {
            showToast('Gagal: Rute sedang aktif!', false);
            setDeleteTarget(null);
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/routes/${encodeURIComponent(deleteTarget.id)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.success) {
                await fetchRoutes();
                showToast(`Rute dihapus`, true);
            }
            else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    }, [deleteTarget, routes, token, fetchRoutes, showToast]);

    const handleImportGeoJSON = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.geojson,application/json';
        input.onchange = (e: any) => {
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
                } catch (err) { showToast('File GeoJSON tidak valid', false); }
            };
            reader.readAsText(file);
        };
        input.click();
    }, [dbStations, resetForm, handleSaveRoute, showToast]);

    const addStationToRoute = useCallback((stationName: string) => {
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
        setSelectedStations([...selectedStations, { name: stationName, time: foundTime, platform: '1', status: 'On Track' }]);
        setStationSearch('');
    }, [selectedStations, currentRouteGeojson, masterStations]);

    const routeList = Object.values(routes)
        .filter(r => activeCategory === 'All Routes' || r.type === activeCategory)
        .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.train_number?.toLowerCase().includes(searchQuery.toLowerCase()));

    const totalPages = Math.ceil(routeList.length / itemsPerPage);
    const paginatedRoutes = routeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const selectedRoute = selectedRouteId ? routes[selectedRouteId] : null;

    useEffect(() => {
        setHeader(
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
                    {loading && (
                        <div className="flex items-center gap-2 text-[#ee6f1f] animate-pulse">
                            <RefreshCw size={12} className="animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#ee6f1f] transition-colors" size={14} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari rute atau nomor KA..."
                            className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-black text-[#1d2d6a] outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all w-96 shadow-sm"
                        />
                    </div>
                    <button onClick={() => { if (isEditing) setShowForm(false); else setShowForm(true); if (!showForm) resetForm(); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-xl font-black text-xs transition-all shadow-md active:scale-95">
                        <Plus size={14} strokeWidth={3} />Tambah Rute
                    </button>
                </div>
            </div>
        );
        return () => setHeader(null);
    }, [searchQuery, isEditing, showForm, setHeader, routeList.length, resetForm]);
    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, searchQuery]);

    const filteredSuggestions = stationSearch.length > 2
        ? dbStations.filter(s => s.name.toLowerCase().includes(stationSearch.toLowerCase()))
        : [];

    return (
        <div className="flex flex-col h-full">
            <ConfirmModal
                isOpen={!!deleteTarget} title={`Hapus Rute`}
                message={`Hapus rute ${deleteTarget?.id}? Aksi ini bersifat permanen.`}
                onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={saving}
            />


            <div className="flex-1 flex overflow-hidden">
                {/* Left Column: Route List */}
                <div className="w-[120%] flex flex-col gap-4 overflow-y-auto p-10 pr-6 custom-scrollbar pb-20">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-2 shrink-0 w-fit">
                        {['All Routes', 'Intercity', 'Commuter', 'Lokal'].map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-lg font-black text-xs transition-all ${activeCategory === cat ? 'bg-[#1d2d6a] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                    <AnimatePresence>
                        {loading ? <div className="p-20 text-center text-slate-400 font-black animate-pulse">Memuat rute...</div> : (
                            routeList.map((route, i) => (
                                <motion.div
                                    key={route.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => setSelectedRouteId(route.name)}
                                    className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${selectedRouteId === route.name
                                        ? 'bg-white border-[#1d2d6a] shadow-lg'
                                        : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${route.status === 'ON TRACK' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {route.status}
                                            </span>
                                            {route.is_active && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                    <Lock size={10} /> Running
                                                </span>
                                            )}
                                            <span className="text-slate-400 font-black text-[9px] uppercase tracking-wider">{route.train_number}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[#1d2d6a] font-black text-sm flex items-center gap-1.5 justify-end">
                                                <Clock size={14} className="text-[#ee6f1f]" />
                                                {route.scheduled_time} {route.status === 'DELAYED' ? 'Delayed' : ''}
                                            </div>
                                            <div className="text-slate-400 text-[9px] font-bold mt-0.5">Delay: {route.delay}</div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="text-lg font-black text-[#1d2d6a] tracking-tight truncate">{route.name}</h3>
                                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] mt-0.5 truncate">
                                            {route.stations?.[0]?.name || 'Origin'}
                                            <ChevronRight size={12} className="shrink-0" />
                                            {route.stations?.[route.stations.length - 1]?.name || 'Destination'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                <Train size={14} />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">Unit</div>
                                                <div className="text-xs font-black text-[#1d2d6a] truncate">{route.units}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                <MapPinned size={14} />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">Dist</div>
                                                <div className="text-xs font-black text-[#1d2d6a] truncate">{route.distance} Km</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                <Users size={14} />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">Occ</div>
                                                <div className="text-xs font-black text-[#1d2d6a] truncate">{route.occupancy}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {route.is_active ? (
                                            <div title="Rute sedang berjalan (Terkunci)" className="p-1.5 bg-slate-50 text-slate-300 rounded-md cursor-not-allowed"><Lock size={12} /></div>
                                        ) : (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditRoute(route); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-[#1d2d6a] rounded-md transition-all"><Pencil size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: route.name }); }} className="p-1.5 bg-red-50 text-red-300 hover:text-red-500 rounded-md transition-all"><Trash2 size={12} /></button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#1d2d6a] disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1
                                            ? 'bg-[#1d2d6a] text-white shadow-md'
                                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#1d2d6a] disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: Detail Panel */}
                <div className="w-[65%] flex flex-col bg-white border-l border-slate-200 overflow-hidden h-full">
                    {selectedRoute ? (
                        <>
                            <div className="relative h-44 border-b border-slate-100 shrink-0 overflow-hidden">
                                <div ref={mapContainerRef} className="absolute inset-0" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                                <div className="absolute bottom-5 left-6 pointer-events-none">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="text-[9px] font-black text-[#ee6f1f] uppercase tracking-widest">Live Route Monitor</div>
                                        {selectedRoute.is_active && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black flex items-center gap-1 uppercase tracking-tighter"><Lock size={8} /> Operational</span>}
                                    </div>
                                    <h4 className="text-lg font-black text-white">{selectedRoute.name} <span className="opacity-50 text-sm ml-1">({selectedRoute.train_number})</span></h4>
                                </div>
                                <button className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 transition-all">
                                    <ExternalLink size={14} />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col p-8 overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Schedule</h4>
                                    <div className="flex items-center gap-2">
                                        {selectedRoute.is_active && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black border border-amber-100">
                                                <AlertCircle size={12} /> Modifikasi Terkunci
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 bg-slate-100 text-[#1d2d6a] text-[9px] font-black rounded-md border border-slate-200 uppercase tracking-tighter">Real-time Feed</span>
                                    </div>
                                </div>

                                {/* Timeline Container - Internal Scroll after 3 items */}
                                <div className="flex-1 overflow-hidden relative">
                                    <div className="flex-1 overflow-y-auto pr-4 thin-scrollbar max-h-[340px] relative">
                                        {/* Timeline Line */}
                                        <div className="absolute left-[3.25rem] top-6 bottom-6 w-0.5 bg-slate-100 z-0" />

                                        {(selectedRoute.stations || []).map((s: any, idx: number) => {
                                            const isFirst = idx === 0;
                                            const isLast = idx === (selectedRoute.stations?.length || 0) - 1;
                                            const isActive = idx === 1;
                                            const sName = typeof s === 'string' ? s : s.name;
                                            const sTime = typeof s === 'string' ? '--:--' : (s.time || '--:--');

                                            return (
                                                <div key={idx} className="relative z-10 flex gap-6 pb-10 group last:pb-4">
                                                    <div className="w-16 pt-0.5 text-right shrink-0">
                                                        <div className={`text-xs font-black ${isActive ? 'text-[#ee6f1f]' : 'text-[#1d2d6a]'}`}>{sTime}</div>
                                                        <div className="text-[8px] font-bold text-slate-300 uppercase leading-none mt-0.5">{isFirst ? 'Start' : isLast ? 'End' : 'Arr'}</div>
                                                    </div>
                                                    <div className="relative flex justify-center mt-1 shrink-0">
                                                        {isActive ? (
                                                            <div className="w-4 h-4 rounded-full bg-white border-[3px] border-[#ee6f1f] shadow-[0_0_8px_rgba(238,111,31,0.4)] z-10" />
                                                        ) : (
                                                            <div className={`w-3 h-3 rounded-full border-2 z-10 ${idx < 1 ? 'bg-[#1d2d6a] border-[#1d2d6a]' : 'bg-white border-slate-200'
                                                                }`} />
                                                        )}
                                                    </div>
                                                    <div className={`flex-1 min-w-0 ${isActive ? 'bg-orange-50/50 border border-orange-100 p-4 rounded-xl -mt-2' : ''}`}>
                                                        <div className="flex flex-col">
                                                            {isActive && <span className="text-[8px] font-black text-[#ee6f1f] uppercase tracking-widest mb-1.5">Next Station</span>}
                                                            <h5 className={`text-sm font-black truncate ${isActive ? 'text-[#1d2d6a]' : 'text-slate-600'} ${isLast ? 'text-slate-400' : ''}`}>
                                                                {sName}
                                                            </h5>
                                                            <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                                                                Plt {idx + 1} • {idx < 1 ? 'Departed' : idx === 1 ? 'In Transit' : 'Upcoming'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Gradient to show more stations exist */}
                                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none opacity-50" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Navigation size={32} className="text-slate-200" /></div>
                            <h4 className="text-base font-black text-[#1d2d6a]">Select a Route</h4>
                            <p className="text-xs font-bold text-slate-400 mt-1 max-w-[200px]">Click any route card on the left to monitor live status</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 md:p-12">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#0a122a]/90 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-[#1d2d6a] tracking-tight">{isEditing ? 'Modify Route' : 'Create Route'}</h2>
                                    <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-0.5">Route Configuration</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all active:scale-95"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Route Designation</label>
                                            <input value={newRouteName} onChange={e => setNewRouteName(e.target.value.toUpperCase())} placeholder="e.g. ARGO WILIS" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1d2d6a] font-black focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search & Add Stations</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <input value={stationSearch} onChange={e => setStationSearch(e.target.value)} placeholder="Type station name..." className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-[#1d2d6a] font-bold focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm" />
                                                <AnimatePresence>
                                                    {filteredSuggestions.length > 0 && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute z-[70] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-[240px] overflow-y-auto custom-scrollbar">
                                                            {filteredSuggestions.map((s, idx) => (
                                                                <button key={idx} onClick={() => addStationToRoute(s.name)} className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                                    <div><div className="text-[#1d2d6a] font-black text-xs">{s.name}</div><div className="text-slate-400 text-[9px] font-bold uppercase">{s.city}</div></div>
                                                                    <Plus size={14} className="text-slate-200 group-hover:text-[#ee6f1f] transition-colors" />
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[300px]">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <LayoutGrid size={12} className="text-[#ee6f1f]" /> Stops Sequence ({selectedStations.length})
                                        </h4>
                                        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                            {selectedStations.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-200">
                                                    <MapPin size={32} className="mb-2 opacity-50" />
                                                    <p className="text-[10px] font-bold">Timeline is empty</p>
                                                </div>
                                            ) : (
                                                selectedStations.map((s, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 group transition-all hover:bg-slate-100/50">
                                                        <div className="w-6 h-6 rounded-md bg-[#1d2d6a] text-white flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-black text-[#1d2d6a] truncate">{s.name}</div>
                                                            <input type="time" value={s.time} onChange={e => { const n = [...selectedStations]; n[idx].time = e.target.value; setSelectedStations(n); }} className="mt-0.5 text-[#ee6f1f] text-[10px] font-black bg-transparent border-none p-0 focus:ring-0 cursor-pointer" />
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { const n = [...selectedStations];[n[idx], n[idx - 1]] = [n[idx - 1], n[idx]]; setSelectedStations(n); }} disabled={idx === 0} className="p-1 hover:bg-white text-slate-300 disabled:opacity-0 rounded-md transition-all"><ArrowUp size={12} /></button>
                                                            <button onClick={() => { const n = [...selectedStations];[n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; setSelectedStations(n); }} disabled={idx === selectedStations.length - 1} className="p-1 hover:bg-white text-slate-300 disabled:opacity-0 rounded-md transition-all"><ArrowDown size={12} /></button>
                                                            <button onClick={() => { const n = [...selectedStations]; n.splice(idx, 1); setSelectedStations(n); }} className="p-1 hover:bg-red-100 text-red-300 hover:text-red-500 rounded-md transition-all"><X size={12} /></button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
                                <button onClick={() => setShowForm(false)} className="px-6 py-2.5 font-black text-xs text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                                <button onClick={() => handleSaveRoute()} disabled={saving} className="px-10 py-2.5 bg-[#1d2d6a] hover:bg-[#16224f] disabled:bg-slate-300 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2">
                                    {saving ? 'Processing...' : <><Save size={16} />Save Changes</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ToastNotification toast={toast} onClose={closeToast} />
        </div>
    );
}
