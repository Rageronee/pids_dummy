import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Search, MapPin, Building2, User, Phone, Globe,
    Info, Save, Pencil, Trash2, X, MapPinned, FileJson,
    RefreshCw, CheckCircle2, LayoutGrid, List, ChevronRight,
    ArrowRight, Monitor, Clock, AlertCircle, Settings, Wifi,
    Share2, Mail, PhoneCall, MessageSquare, ExternalLink, Image, FileText, Briefcase
} from 'lucide-react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../config';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, ToastNotification } from '../components/SharedUI';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Station {
    id: string;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    ip_address?: string;
    pic_name?: string;
    pic_contact?: string;
    kode_kota?: string;
    alamat?: string;
    provinsi?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
    kelurahan_desa?: string;
    kelurahan?: string;
    email?: string;
    fixed_line?: string;
    address?: string;
    kode_pos?: string;
    poi?: string;
    media?: string;
    status?: string; // ONLINE, UPDATING, OFFLINE
    displays_active?: number;
    next_sync?: string;
    division?: string; // Java, Sumatra, etc.
}

interface Toast {
    message: string;
    type: 'success' | 'error';
}

export default function StationsPage({ token, setHeader, setHeaderTitle }: {
    token: string,
    setHeader: (node: React.ReactNode) => void,
    setHeaderTitle: (node: React.ReactNode) => void
}) {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connected, setConnected] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Stations');

    // Map refs and state
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [mapIsReady, setMapIsReady] = useState(false);

    const { toast, showToast, closeToast } = useToast();

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Station>>({
        id: '', name: '', city: '',
        latitude: -6.9147, longitude: 107.6098,
        pic_name: '', pic_contact: '', ip_address: '',
        alamat: '', provinsi: '', kabupaten_kota: '',
        kecamatan: '', kelurahan_desa: '', kode_pos: '',
        poi: '', media: ''
    });

    const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);

    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const LIMIT = 9;

    const StationSkeleton = () => (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden h-full">
            <div className="flex flex-col gap-6 h-full">
                <div className="w-full aspect-[16/10] bg-slate-100 rounded-[1.5rem] relative overflow-hidden">
                    <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-20 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                            <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                            />
                        </div>
                        <div className="w-12 h-6 bg-slate-50 rounded-lg" />
                    </div>
                    <div className="w-3/4 h-8 bg-slate-100 rounded-xl relative overflow-hidden">
                        <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="w-full h-4 bg-slate-50 rounded-lg" />
                        <div className="w-2/3 h-4 bg-slate-50 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
    const [loadingMore, setLoadingMore] = useState(false);
    const fetchStationsRef = useRef<any>(null);

    // Map Container Callback Ref (for Station Details)
    const mapDetailContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMapIsReady(false);
            }
            return;
        }

        if (mapRef.current) return;

        try {
            const lat = Number(selectedStation?.latitude) || -6.1751;
            const lon = Number(selectedStation?.longitude) || 106.8272;

            const map = new maplibregl.Map({
                container: node,
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [lon, lat],
                zoom: 15,
                pitch: 45,
                attributionControl: false,
                trackResize: true,
                antialias: true
            });

            mapRef.current = map;

            map.on('load', () => {
                setMapIsReady(true);
                setTimeout(() => map.resize(), 50);
            });

            const ro = new ResizeObserver(() => {
                if (mapRef.current) mapRef.current.resize();
            });
            ro.observe(node);

            const originalRemove = map.remove.bind(map);
            map.remove = () => {
                ro.disconnect();
                originalRemove();
            };

        } catch (e) {
            console.error('[Map] Init error:', e);
        }
    }, []);

    // Sync Map with Selected Station
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapIsReady || !selectedStation) return;

        const lat = Number(selectedStation.latitude) || -6.176770;
        const lon = Number(selectedStation.longitude) || 106.830616;

        try {
            // Update Marker
            if (markerRef.current) {
                markerRef.current.remove();
            }

            const el = document.createElement('div');
            el.className = 'w-6 h-6 bg-[#ee6f1f] rounded-full border-4 border-white shadow-[0_0_20px_rgba(238,111,31,0.6)] animate-pulse relative z-50';

            markerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([lon, lat])
                .addTo(map);

            // Center Map
            map.flyTo({
                center: [lon, lat],
                zoom: 15,
                duration: 2000,
                essential: true
            });
        } catch (e) {
            console.error('[Map] Sync error:', e);
        }
    }, [selectedStation, mapIsReady]);

    const fetchStations = useCallback(async (isLoadMore = false, overrideSearch?: string) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const currentOffset = isLoadMore ? offset + LIMIT : 0;
            const search = overrideSearch !== undefined ? overrideSearch : searchQuery;

            const query = new URLSearchParams({
                limit: LIMIT.toString(),
                offset: currentOffset.toString(),
                search: search,
                division: activeFilter
            });

            const res = await fetch(`${API}/api/stations?${query}`);
            const data = await res.json();

            if (data.success) {
                const javaCities = ['malang', 'bandung', 'surakarta', 'solo', 'yogya', 'semarang', 'cirebon', 'jakarta', 'blitar', 'kediri', 'nganjuk', 'madiun', 'ngawi', 'sragen', 'klaten', 'purworejo', 'kebumen', 'cilacap', 'banjar', 'ciamis', 'tasikmalaya', 'garut'];

                const enhancedStations = data.stations.map((s: any) => {
                    const isJava = javaCities.some(city => s.city?.toLowerCase().includes(city) || s.name?.toLowerCase().includes(city)) ||
                        s.provinsi?.toLowerCase().includes('jawa') ||
                        s.provinsi?.toLowerCase().includes('dki') ||
                        s.id?.startsWith('JR');

                    return {
                        ...s,
                        status: s.status || (Math.random() > 0.3 ? 'ONLINE' : 'UPDATING'),
                        displays_active: s.displays_active ?? (Math.floor(Math.random() * 40) + 10),
                        next_sync: s.next_sync ?? (Math.random() > 0.5 ? `${Math.floor(Math.random() * 10)}m ${Math.floor(Math.random() * 60)}s` : 'Syncing...'),
                        division: isJava ? 'Java Division' : 'Sumatra Division'
                    };
                });

                if (isLoadMore) {
                    setStations(prev => [...prev, ...enhancedStations]);
                } else {
                    setStations(enhancedStations);
                }
                setTotal(data.total);
                setOffset(currentOffset);
            }
        } catch (err) {
            console.error("Fetch stations error:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [offset, searchQuery, activeFilter]);

    useEffect(() => {
        fetchStationsRef.current = fetchStations;
    }, [fetchStations]);

    useEffect(() => {
        fetchStations(false);
        const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
        socket.on('connect', () => {
            console.log('[Socket.IO] Stations page connected');
            setConnected(true);
        });
        socket.on('disconnect', () => {
            setConnected(false);
        });
        socket.on('db:update', () => {
            console.log('[Socket.IO] Database update received, re-fetching stations...');
            if (fetchStationsRef.current) fetchStationsRef.current(false);
        });
        return () => {
            socket.disconnect();
        };
    }, []); // Removed fetchStations from deps to avoid infinite loops with offset

    useEffect(() => {
        setHeader(
            <div className="flex items-center gap-3">
                {loading && (
                    <div className="flex items-center gap-2 text-[#ee6f1f] animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest">Syncing...</span>
                    </div>
                )}
            </div>
        );
        return () => setHeader(null);
    }, [loading, setHeader]);

    useEffect(() => {
        setHeaderTitle(
            <div className="flex items-center gap-3 text-xl font-black uppercase">
                {selectedStation ? (
                    <div className="flex items-center gap-2 tracking-normal">
                        <button
                            onClick={() => setSelectedStation(null)}
                            className="text-slate-400 hover:text-[#1d2d6a] transition-colors"
                        >
                            MANAJEMEN STASIUN
                        </button>
                        <ChevronRight size={22} strokeWidth={3} className="text-slate-300 mt-0.5" />
                        <span className="text-[#1d2d6a]">{selectedStation.name}</span>
                    </div>
                ) : (
                    <span className="text-[#1d2d6a] tracking-normal uppercase">Manajemen Stasiun</span>
                )}
            </div>
        );
        return () => setHeaderTitle(null);
    }, [selectedStation, setHeaderTitle]);



    const initMap = useCallback(() => {
        if (!mapContainerRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            center: [form.longitude || 107.6098, form.latitude || -6.9147],
            zoom: 12
        });

        markerRef.current = new maplibregl.Marker({ draggable: true })
            .setLngLat([form.longitude || 107.6098, form.latitude || -6.9147])
            .addTo(mapRef.current);

        markerRef.current.on('dragend', () => {
            const lngLat = markerRef.current?.getLngLat();
            if (lngLat) {
                setForm(prev => ({ ...prev, latitude: lngLat.lat, longitude: lngLat.lng }));
            }
        });

        mapRef.current.on('click', (e) => {
            markerRef.current?.setLngLat(e.lngLat);
            setForm(prev => ({ ...prev, latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
        });
    }, [form.latitude, form.longitude]);

    useEffect(() => {
        if (showForm) {
            setTimeout(initMap, 100);
        } else {
            mapRef.current?.remove();
            mapRef.current = null;
        }
    }, [showForm, initMap]);

    const handleSave = async () => {
        if (!form.id || !form.name || !form.city) {
            showToast('ID, Nama, dan Kota wajib diisi', false);
            return;
        }
        setSaving(true);
        try {
            const endpoint = editingId
                ? `${API}/api/admin/stations/${editingId}`
                : `${API}/api/admin/stations`;
            const res = await fetch(endpoint, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            const d = await res.json();
            if (d.success) {
                fetchStations();
                setShowForm(false);
                setEditingId(null);
                setForm({
                    id: '', name: '', city: '', latitude: -6.9147, longitude: 107.6098,
                    pic_name: '', pic_contact: '', ip_address: '',
                    alamat: '', provinsi: '', kabupaten_kota: '',
                    kecamatan: '', kelurahan_desa: '', kode_pos: '',
                    poi: '', media: ''
                });
                showToast(`Stasiun ${form.name} berhasil disimpan`, true);
            } else showToast(d.error || 'Gagal menyimpan', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/stations/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.success) {
                fetchStations();
                showToast(`Stasiun ${deleteTarget.name} dihapus`, true);
            } else showToast(d.error || 'Gagal menghapus', false);
        } catch { showToast('Koneksi gagal', false); } finally { setSaving(false); setDeleteTarget(null); }
    };

    // For Division filtering, we still do it locally on the loaded set for now
    // but the main Search is now server-side.
    const filteredStations = stations;

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setOffset(0);
    };

    // Use effect for search debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(0);
            fetchStations(false, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Use effect for filter changes
    useEffect(() => {
        setOffset(0);
        fetchStations(false);
    }, [activeFilter]);

    const filterOptions = ['All Stations', 'Java Division', 'Sumatra Division'];

    return (
        <div className="space-y-8 pb-20">
            <AnimatePresence mode="wait">
                {selectedStation ? (
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Hero Section - Full Width & Top of Content */}
                        <div className="relative h-[480px] rounded-[1.5rem] overflow-hidden group shadow-2xl shadow-slate-200/50">
                            {/* Hero Actions */}
                            <div className="absolute top-8 left-8 z-20">
                                <button
                                    onClick={() => { setSelectedStation(null); setShowForm(false); setEditingId(null); }}
                                    className="flex items-center gap-2 px-6 py-3 bg-[#ee6f1f] backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-[#ee6f1f]/80 transition-all shadow-xl font-black text-xs uppercase tracking-widest"
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                            </div>
                            <div className="absolute top-8 right-8 z-20 flex gap-3">
                                <button
                                    onClick={() => {
                                        if (showForm) {
                                            setShowForm(false);
                                            setEditingId(null);
                                        } else {
                                            setEditingId(selectedStation.id);
                                            setForm(selectedStation);
                                            setShowForm(true);
                                        }
                                    }}
                                    className={`p-3 backdrop-blur-md border border-white/20 rounded-2xl transition-all shadow-xl ${showForm ? 'bg-white/40 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                    title={showForm ? "Cancel Edit" : "Edit Details"}
                                >
                                    {showForm ? <X size={20} /> : <Pencil size={20} />}
                                </button>
                            </div>
                            <img
                                src={selectedStation.media ? `${API}/media/station/${selectedStation.media}` : `${API}/media/station/station_fallback.png`}
                                alt={selectedStation.name}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                onError={(e: any) => { e.target.src = `${API}/media/station/station_fallback.png` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a122a] via-[#0a122a]/30 to-transparent" />

                            <div className="absolute inset-x-10 bottom-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-100/90 bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl w-fit">
                                        <MapPin size={18} className="text-[#ee6f1f]" />
                                        <span className="text-lg font-bold">{selectedStation.city}, {selectedStation.provinsi || 'Jawa'}</span>
                                    </div>
                                    <h2 className="text-6xl font-black text-white tracking-tighter leading-none">
                                        STASIUN {selectedStation.name}
                                    </h2>
                                    {showForm && (
                                        <div className="flex items-center gap-2 bg-[#ee6f1f]/90 backdrop-blur-md px-4 py-2 rounded-xl w-fit">
                                            <Pencil size={14} className="text-white" />
                                            <span className="text-sm font-black text-white uppercase tracking-widest">Mode Edit</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inline Edit Form - Shown when showForm is true */}
                        <AnimatePresence mode="wait">
                            {showForm ? (
                                <motion.div
                                    key="edit-form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
                                        {/* Section 1: Basic Information */}
                                        <div className="p-6 border-b bg-slate-50/50 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#ee6f1f]/10 rounded-xl flex items-center justify-center text-[#ee6f1f]">
                                                <Info size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-[#1d2d6a] tracking-tight">Informasi Dasar</h3>
                                                <p className="text-xs font-medium text-slate-400">Station identity & contact person</p>
                                            </div>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Station Name</label>
                                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gambir Station" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">City Code</label>
                                                <input value={form.kode_kota} onChange={e => setForm({ ...form, kode_kota: e.target.value.toUpperCase() })} placeholder="E.G. GMR" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300 uppercase" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">PIC Name</label>
                                                <input value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} placeholder="Full name of person in charge" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">PIC Contact</label>
                                                <input value={form.pic_contact} onChange={e => setForm({ ...form, pic_contact: e.target.value })} placeholder="+62 8xx-xxxx-xxxx" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email</label>
                                                <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="station@kai.id" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Fixed Line</label>
                                                <input value={form.fixed_line || ''} onChange={e => setForm({ ...form, fixed_line: e.target.value })} placeholder="(021) 3862222" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">IP Address</label>
                                                <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold font-mono text-[#1d2d6a] focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/5 outline-none transition-all placeholder:text-slate-300" />
                                            </div>
                                        </div>

                                        {/* Section 2: Location & Mapping */}
                                        <div className="p-6 border-y bg-slate-50/50 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#ee6f1f]/10 rounded-xl flex items-center justify-center text-[#ee6f1f]">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-[#1d2d6a] tracking-tight">Location & Mapping</h3>
                                                <p className="text-xs font-medium text-slate-400">Geographic coordinates & address</p>
                                            </div>
                                        </div>
                                        <div className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                <div className="lg:col-span-8 space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Pinpoint Location</label>
                                                    <div className="relative h-[340px] rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner group">
                                                        <div ref={mapContainerRef} className="absolute inset-0" />
                                                        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-600 shadow-lg group-hover:bg-white transition-colors uppercase tracking-widest">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#ee6f1f] animate-pulse" />
                                                                Click map to set coordinates
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="lg:col-span-4 flex flex-col justify-center gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Latitude</label>
                                                        <input type="number" step="0.000001" value={form.latitude} onChange={e => setForm({ ...form, latitude: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Longitude</label>
                                                        <input type="number" step="0.000001" value={form.longitude} onChange={e => setForm({ ...form, longitude: Number(e.target.value) })} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-mono font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all" />
                                                    </div>
                                                    <div className="p-5 bg-blue-50 rounded-2xl flex gap-4 border border-blue-100">
                                                        <div className="w-6 h-6 rounded-full bg-[#1d2d6a] flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                                                            <Info size={12} />
                                                        </div>
                                                        <p className="text-[12px] text-[#1d2d6a] leading-relaxed font-bold">
                                                            Coordinates are used for the PIDS real-time map synchronization across the network.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Full Address</label>
                                                <textarea value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Street name, building number, district, etc." rows={2} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all resize-none" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Province</label>
                                                    <select value={form.provinsi} onChange={e => setForm({ ...form, provinsi: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none appearance-none bg-white cursor-pointer">
                                                        <option value="">Select Province</option>
                                                        <option value="DKI Jakarta">DKI Jakarta</option>
                                                        <option value="Jawa Barat">Jawa Barat</option>
                                                        <option value="Jawa Tengah">Jawa Tengah</option>
                                                        <option value="Jawa Timur">Jawa Timur</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">City / Regency</label>
                                                    <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none appearance-none bg-white cursor-pointer">
                                                        <option value="">Select City</option>
                                                        <option value="Jakarta Pusat">Jakarta Pusat</option>
                                                        <option value="Bandung">Bandung</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">District</label>
                                                    <input value={form.kecamatan} onChange={e => setForm({ ...form, kecamatan: e.target.value })} placeholder="Kecamatan" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Village</label>
                                                    <input value={form.kelurahan_desa} onChange={e => setForm({ ...form, kelurahan_desa: e.target.value })} placeholder="Kelurahan / Desa" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Postal Code</label>
                                                    <input value={form.kode_pos} onChange={e => setForm({ ...form, kode_pos: e.target.value })} placeholder="e.g. 10110" className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#1d2d6a] focus:border-[#ee6f1f] outline-none transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Actions Footer */}
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            onClick={() => { setShowForm(false); setEditingId(null); }}
                                            className="h-14 px-8 rounded-2xl font-black text-sm bg-white border-2 border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-3"
                                        >
                                            <X size={18} />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await handleSave();
                                                // After successful save, update the selectedStation with the new data
                                                if (form.name && form.city) {
                                                    setSelectedStation({ ...selectedStation, ...form } as Station);
                                                }
                                            }}
                                            disabled={saving}
                                            className="h-14 px-12 rounded-2xl font-black text-sm bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-xl shadow-[#ee6f1f]/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none uppercase tracking-widest"
                                        >
                                            {saving ? (
                                                <RefreshCw size={18} className="animate-spin" />
                                            ) : (
                                                <Save size={18} />
                                            )}
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="detail-view"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-8"
                                >
                                    {/* Detail Cards Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Column 1: Administrative */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-1 h-6 bg-[#ee6f1f] rounded-full" />
                                                <h3 className="text-xs font-black text-[#1d2d6a] uppercase tracking-[0.3em]">Administrative</h3>
                                            </div>
                                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-10 group transition-all hover:border-[#ee6f1f]/20 h-full">
                                                <div className="space-y-6">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Station Name</p>
                                                        <p className="text-2xl font-black text-[#1d2d6a] leading-tight transition-colors group-hover:text-[#ee6f1f]">
                                                            {selectedStation.name} {selectedStation.kode_kota ? `(${selectedStation.kode_kota})` : ''}
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City Code</p>
                                                            <p className="text-lg font-black text-[#1d2d6a] uppercase tracking-tighter">
                                                                {selectedStation.kode_kota || 'JKT-C'}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Postal Code</p>
                                                            <p className="text-lg font-black text-[#1d2d6a]">
                                                                {selectedStation.kode_pos || '10110'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-slate-50" />

                                                    <div className="space-y-6">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Province</p>
                                                            <p className="text-lg font-bold text-slate-600">{selectedStation.provinsi || 'DKI Jakarta'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City / Regency</p>
                                                            <p className="text-lg font-bold text-slate-600">{selectedStation.city}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">District</p>
                                                            <p className="text-lg font-bold text-slate-600">{selectedStation.kecamatan || 'Gambir'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Village</p>
                                                            <p className="text-lg font-bold text-slate-600">{selectedStation.kelurahan || 'Gambir'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: PIC & Contact */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-1 h-6 bg-[#ee6f1f] rounded-full" />
                                                <h3 className="text-xs font-black text-[#1d2d6a] uppercase tracking-[0.3em]">PIC & Contact</h3>
                                            </div>
                                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8 h-full">
                                                {/* Manager Card */}
                                                <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100 flex items-center gap-5">
                                                    <div className="w-16 h-16 bg-[#1d2d6a] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1d2d6a]/20">
                                                        <User size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Station Manager</p>
                                                        <p className="text-xl font-black text-[#1d2d6a] tracking-tight">{selectedStation.pic_name || 'Arya Wiguna'}</p>
                                                    </div>
                                                </div>

                                                {/* Contacts */}
                                                <div className="space-y-6 px-2">
                                                    <div className="flex gap-5">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1d2d6a] shrink-0">
                                                            <Phone size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PIC Contact</p>
                                                            <p className="text-lg font-black text-[#1d2d6a]">{selectedStation.pic_contact || '+62 811-2345-6789'}</p>
                                                            <p className="text-[10px] font-medium text-slate-400">Primary Mobile Line</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-5">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1d2d6a] shrink-0">
                                                            <Mail size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Operational Email</p>
                                                            <p className="text-lg font-black text-[#1d2d6a] break-all">{selectedStation.email || `${selectedStation.name.toLowerCase().replace(/\s+/g, '.')}@kai.id`}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-5">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1d2d6a] shrink-0">
                                                            <PhoneCall size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fixed Line</p>
                                                            <p className="text-lg font-black text-[#1d2d6a]">{selectedStation.fixed_line || '(021) 3862222'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl text-[#1d2d6a] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#1d2d6a] hover:text-white hover:border-[#1d2d6a] transition-all active:scale-95 group">
                                                    <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                                                    Message PIC
                                                </button>
                                            </div>
                                        </div>

                                        {/* Column 3: Geographic */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-1 h-6 bg-[#ee6f1f] rounded-full" />
                                                <h3 className="text-xs font-black text-[#1d2d6a] uppercase tracking-[0.3em]">Geographic</h3>
                                            </div>
                                            <div className="bg-white rounded-[2.5rem] p-1 border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden h-full flex flex-col">
                                                {/* Interactive Map Preview */}
                                                <div className="relative h-64 rounded-[2.25rem] m-2 overflow-hidden group">
                                                    <div ref={mapDetailContainerRef} className="absolute inset-0 bg-slate-100" />
                                                    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                                                </div>

                                                <div className="p-8 space-y-8 flex-1">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latitude</p>
                                                            <p className="text-xl font-black text-[#1d2d6a] tracking-tight">{selectedStation.latitude?.toFixed(6) || '-6.176770'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Longitude</p>
                                                            <p className="text-xl font-black text-[#1d2d6a] tracking-tight">{selectedStation.longitude?.toFixed(6) || '106.830616'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                                                        <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                                                            {selectedStation.address || `Jl. Medan Merdeka Timur No.1, RT.5/RW.2, ${selectedStation.city}, Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media & Attachments Section */}
                                    <div className="space-y-6 pt-12">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-6 bg-[#ee6f1f] rounded-full" />
                                                <h3 className="text-xs font-black text-[#1d2d6a] uppercase tracking-[0.3em]">Media & Attachments</h3>
                                            </div>
                                            <button className="text-sm font-black text-[#ee6f1f] flex items-center gap-2 hover:translate-x-1 transition-transform">
                                                <Plus size={18} />
                                                Upload New File
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
                                            {[
                                                { icon: <Image size={24} />, name: "Facade_Vi...", type: "IMAGE • 4.2 MB", color: "text-orange-600 bg-orange-50" },
                                                { icon: <FileText size={24} />, name: "Station_S...", type: "DOCUMENT • 1.8 MB", color: "text-blue-600 bg-blue-50" },
                                                { icon: <MapPinned size={24} />, name: "Floor_Pla...", type: "CAD • 12.5 MB", color: "text-slate-600 bg-slate-50" },
                                                { icon: <Briefcase size={24} />, name: "Staff_List...", type: "SHEET • 0.4 MB", color: "text-green-600 bg-green-50" }
                                            ].map((file, i) => (
                                                <div key={i} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-slate-200/40 hover:border-[#ee6f1f]/30 transition-all cursor-pointer flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${file.color}`}>
                                                        {file.icon}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-black text-[#1d2d6a] truncate">{file.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{file.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-[#1d2d6a] tracking-tight mb-1">Station Overview</h1>
                                <p className="text-slate-500 text-sm font-medium">Manage {total} integrated stations across all divisions</p>
                            </div>
                        </div>

                        {/* Filter Chips - Horizontal Row */}
                        <div className="flex overflow-x-auto custom-scrollbar pb-2 -mb-2 gap-3 scroll-smooth no-scrollbar">
                            {filterOptions.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setActiveFilter(opt)}
                                    className={`px-6 py-3 rounded-full font-semibold text-sm transition-all border-2 shrink-0 ${activeFilter === opt
                                        ? 'bg-[#1d2d6a] text-white border-[#1d2d6a]'
                                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>

                        {/* Search, View, and Add Button Bar */}
                        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                            <div className="flex items-center gap-4 w-full lg:w-auto flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search stations..."
                                        className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-[#1d2d6a] font-bold focus:outline-none focus:border-[#ee6f1f] transition-all shadow-sm"
                                    />
                                </div>
                                <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-100 shadow-sm shrink-0">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-[#1d2d6a]' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        <LayoutGrid size={22} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-3 rounded-xl transition-all ${viewMode === 'table' ? 'bg-slate-100 text-[#1d2d6a]' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        <List size={22} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => { setShowForm(!showForm); setEditingId(null); }}
                                className={`flex items-center gap-2 h-11 px-6 rounded-2xl font-semibold text-sm transition-all active:scale-95 shrink-0 ${showForm
                                    ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                    : 'bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md'
                                    }`}
                            >
                                {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add Station</>}
                            </button>
                        </div>

                        {/* Add/Edit Station Form Section - Inline Implementation */}
                        <AnimatePresence>
                            {showForm && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-slate-50/50 border-y border-slate-100 py-8 md:py-12">
                                        <div className="space-y-8">
                                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                                {/* Section 1: Basic Information */}
                                                <div className="p-4 border-b bg-slate-50/50 flex items-center gap-3">
                                                    <div className="text-[#ee6f1f]">
                                                        <Info size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[#1d2d6a] tracking-tight">1. Basic Information</h3>
                                                </div>
                                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-700 ml-0.5">Station Name</label>
                                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gambir Station" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-700 ml-0.5">City Code</label>
                                                        <input value={form.kode_kota} onChange={e => setForm({ ...form, kode_kota: e.target.value.toUpperCase() })} placeholder="E.G. GMR" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-slate-700 ml-0.5">PIC Name</label>
                                                        <input value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} placeholder="Full name of person in charge" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIC Contact</label>
                                                        <input value={form.pic_contact} onChange={e => setForm({ ...form, pic_contact: e.target.value })} placeholder="+62 8xx-xxxx-xxxx" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300" />
                                                    </div>
                                                </div>

                                                {/* Section 2: Location & Mapping */}
                                                <div className="p-4 border-y bg-slate-50/50 flex items-center gap-3">
                                                    <div className="text-[#ee6f1f]">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[#1d2d6a] tracking-tight">2. Location & Mapping</h3>
                                                </div>
                                                <div className="p-8 space-y-8">
                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                        <div className="lg:col-span-8 space-y-2">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pinpoint Location</label>
                                                            <div className="relative h-[340px] rounded-xl overflow-hidden border border-slate-200 shadow-inner group">
                                                                <div ref={mapContainerRef} className="absolute inset-0" />
                                                                <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-lg group-hover:bg-white transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                                        CLICK MAP TO SET COORDINATES
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="lg:col-span-4 flex flex-col justify-center gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Latitude</label>
                                                                <div className="relative">
                                                                    <input type="number" step="0.000001" value={form.latitude} onChange={e => setForm({ ...form, latitude: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-4 py-3.5 text-sm font-mono focus:border-blue-500 outline-none transition-all" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Longitude</label>
                                                                <div className="relative">
                                                                    <input type="number" step="0.000001" value={form.longitude} onChange={e => setForm({ ...form, longitude: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-4 py-3.5 text-sm font-mono focus:border-blue-500 outline-none transition-all" />
                                                                </div>
                                                            </div>
                                                            <div className="p-5 bg-blue-50 rounded-xl flex gap-4 border border-blue-100">
                                                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                                                                    <Info size={12} />
                                                                </div>
                                                                <p className="text-[12px] text-blue-800 leading-relaxed font-semibold">
                                                                    Coordinates are used for the PIDS real-time map synchronization across the network. Ensure markers are precise.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 pt-4 border-t border-slate-100">
                                                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Full Address</label>
                                                        <textarea value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Street name, building number, district, etc." rows={2} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all resize-none" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Province</label>
                                                            <div className="relative">
                                                                <select value={form.provinsi} onChange={e => setForm({ ...form, provinsi: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none appearance-none bg-slate-50/50 cursor-pointer">
                                                                    <option value="">Select Province</option>
                                                                    <option value="DKI Jakarta">DKI Jakarta</option>
                                                                    <option value="Jawa Barat">Jawa Barat</option>
                                                                    <option value="Jawa Tengah">Jawa Tengah</option>
                                                                    <option value="Jawa Timur">Jawa Timur</option>
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                    <ChevronRight size={16} className="rotate-90" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">City / Regency</label>
                                                            <div className="relative">
                                                                <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none appearance-none bg-slate-50/50 cursor-pointer">
                                                                    <option value="">Select City</option>
                                                                    <option value="Jakarta Pusat">Jakarta Pusat</option>
                                                                    <option value="Bandung">Bandung</option>
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                    <ChevronRight size={16} className="rotate-90" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">District</label>
                                                            <input value={form.kecamatan} onChange={e => setForm({ ...form, kecamatan: e.target.value })} placeholder="Kecamatan" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none bg-slate-50/50" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Village</label>
                                                            <input value={form.kelurahan_desa} onChange={e => setForm({ ...form, kelurahan_desa: e.target.value })} placeholder="Kelurahan / Desa" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none bg-slate-50/50" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Postal Code</label>
                                                            <input value={form.kode_pos} onChange={e => setForm({ ...form, kode_pos: e.target.value })} placeholder="e.g. 10110" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none bg-slate-50/50" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 3: Media & Attachments */}
                                                <div className="p-4 border-y bg-slate-50/50 flex items-center gap-3">
                                                    <div className="text-[#ee6f1f]">
                                                        <Monitor size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[#1d2d6a] tracking-tight">3. Media & Attachments</h3>
                                                </div>
                                                <div className="p-8 space-y-8">
                                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer bg-slate-50/30 group">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-500 transition-colors">
                                                            <Plus size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-lg">Upload Station Media</p>
                                                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Drag and drop station photos, blueprints, or legal documents. Max 10MB per file.</p>
                                                        </div>
                                                        <button className="bg-[#1d2d6a] px-8 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/10">Browse Files</button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-6">
                                                        {form.media && (
                                                            <div className="relative group w-52 h-52">
                                                                <img src={form.media} className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-md group-hover:shadow-lg transition-shadow" alt="Preview" />
                                                                <button onClick={() => setForm({ ...form, media: '' })} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 shadow-xl transition-all hover:scale-110 active:scale-90">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Form Actions Footer */}
                                            <div className="pt-8 flex items-center justify-end gap-4 border-t border-slate-100">
                                                <button onClick={() => setShowForm(false)} className="h-12 px-8 rounded-2xl font-semibold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95">
                                                    Cancel & Discard
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="h-12 px-10 rounded-2xl font-semibold text-sm bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300"
                                                >
                                                    {saving ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={18} />
                                                    )}
                                                    {editingId ? 'Update Station Profile' : 'Register New Station'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content Area */}
                        <AnimatePresence mode="wait">
                            {loading && stations.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[...Array(LIMIT)].map((_, i) => (
                                        <motion.div
                                            key={`skeleton-${i}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <StationSkeleton />
                                        </motion.div>
                                    ))}
                                </div>
                            ) : filteredStations.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <Building2 size={64} className="mx-auto text-slate-200 mb-4" />
                                    <h3 className="text-xl font-semibold text-[#1d2d6a]">No stations found</h3>
                                    <p className="text-slate-400 font-medium">Try adjusting your filters or search query.</p>
                                </motion.div>
                            ) : viewMode === 'grid' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                                >
                                    {filteredStations.map((station, idx) => (
                                        <motion.div
                                            key={station.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 group flex flex-col cursor-pointer hover:border-[#ee6f1f]/30 transition-all hover:-translate-y-1"
                                            onClick={() => setSelectedStation(station)}
                                        >
                                            {/* Station Photo - Top Position */}
                                            <div className="relative h-60 overflow-hidden shrink-0">
                                                <img
                                                    src={station.media ? `${API}/media/station/${station.media}` : `${API}/media/station/station_fallback.png`}
                                                    alt={station.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                    loading="lazy"
                                                    onError={(e: any) => { e.target.src = `${API}/media/station/station_fallback.png` }}
                                                />

                                                {/* Status Badge Overlay */}
                                                <div className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-full border border-white/20">
                                                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${station.status === 'ONLINE' ? 'bg-green-400' : 'bg-orange-400'}`} />
                                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.1em]">{station.status}</span>
                                                </div>

                                                {/* ID Badge Overlay */}
                                                <div className="absolute top-6 right-6 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm">
                                                    <span className="font-mono text-[10px] font-black text-[#1d2d6a] tracking-tighter uppercase">{station.id}</span>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-8 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-2xl font-black text-[#1d2d6a] leading-tight group-hover:text-[#ee6f1f] transition-colors">
                                                        {station.name}
                                                    </h3>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingId(station.id); setForm(station); setShowForm(true); }}
                                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(station); }}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-8">
                                                    <div className="flex items-center gap-3 text-slate-500">
                                                        <div className="p-2 bg-slate-50 rounded-lg">
                                                            <MapPin size={16} className="text-[#ee6f1f]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Location</p>
                                                            <p className="text-sm font-bold text-slate-600">{station.city}, {station.provinsi || 'Jawa'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-slate-500">
                                                        <div className="p-2 bg-slate-50 rounded-lg">
                                                            <Wifi size={16} className="text-[#1d2d6a]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Network IP</p>
                                                            <p className="text-sm font-bold font-mono text-slate-600">{station.ip_address || '192.168.1.1'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* View Details Button - Footer */}
                                                <div className="mt-auto pt-6 border-t border-slate-50">
                                                    <button className="w-full py-4 bg-[#1d2d6a] hover:bg-[#ee6f1f] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#1d2d6a]/20 hover:shadow-[#ee6f1f]/30 flex items-center justify-center gap-3">
                                                        <span className="flex items-center gap-3">
                                                            View Details
                                                            <ChevronRight size={18} />
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                /* Table View Mode */
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden"
                                >
                                    <table className="w-full text-left">
                                        <thead className="bg-[#1d2d6a] text-white">
                                            <tr>
                                                <th className="px-8 py-6 font-semibold text-[10px] uppercase tracking-wider">Station Name</th>
                                                <th className="px-8 py-6 font-semibold text-[10px] uppercase tracking-wider">ID / Code</th>
                                                <th className="px-8 py-6 font-semibold text-[10px] uppercase tracking-wider">Status</th>
                                                <th className="px-8 py-6 font-semibold text-[10px] uppercase tracking-wider">Displays</th>
                                                <th className="px-8 py-6 font-semibold text-[10px] uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredStations.map(station => (
                                                <tr key={station.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0">
                                                                <img src={station.media || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-[#1d2d6a]">{station.name}</div>
                                                                <div className="text-slate-400 text-xs font-bold">{station.city}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-3 py-1 bg-slate-100 rounded-lg font-mono text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                                            {station.id}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${station.status === 'ONLINE' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                            <span className={`text-xs font-semibold ${station.status === 'ONLINE' ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {station.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2 text-[#1d2d6a] font-bold">
                                                            <Clock size={14} className="text-slate-300" />
                                                            {station.next_sync}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setEditingId(station.id); setForm(station); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-400 hover:text-[#1d2d6a] hover:bg-slate-100 rounded-xl transition-all"><Pencil size={18} /></button>
                                                            <button onClick={() => setDeleteTarget(station)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Load More Button */}
                        {stations.length < total && (
                            <div className="flex justify-center pt-8">
                                <button
                                    onClick={() => fetchStations(true)}
                                    disabled={loadingMore}
                                    className="px-12 py-4 bg-white border-2 border-slate-100 text-[#1d2d6a] font-bold rounded-2xl hover:border-[#ee6f1f] hover:text-[#ee6f1f] transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                >
                                    {loadingMore ? (
                                        <RefreshCw size={20} className="animate-spin" />
                                    ) : (
                                        <ArrowRight size={20} />
                                    )}
                                    {loadingMore ? 'Loading More Stations...' : 'Load More Stations'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirm Delete Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-[#0a122a]/90 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
                                <Trash2 size={40} />
                            </div>
                            <h3 className="text-2xl font-semibold text-[#1d2d6a] mb-2">Delete Station?</h3>
                            <p className="text-slate-500 font-bold mb-8">Are you sure you want to delete <span className="text-[#ee6f1f]">{deleteTarget.name}</span>? This action cannot be undone.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setDeleteTarget(null)} className="px-6 py-4 bg-slate-100 text-slate-500 font-semibold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                                <button onClick={handleDelete} className="px-6 py-4 bg-red-500 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">Delete Now</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notifications */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 text-white font-semibold overflow-hidden ${toast.ok ? 'bg-[#1d2d6a] border-b-4 border-green-400' : 'bg-red-500 border-b-4 border-white/20'}`}
                    >
                        {toast.ok ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

