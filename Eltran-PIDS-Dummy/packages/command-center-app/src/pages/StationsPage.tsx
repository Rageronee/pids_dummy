import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Plus, Search, MapPin, Building2, User, Phone, Globe, 
    Info, Save, Pencil, Trash2, X, MapPinned, FileJson, 
    RefreshCw, CheckCircle2, LayoutGrid, List, ChevronRight,
    ArrowRight, Monitor, Clock, AlertCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../config';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Station {
    id: string;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    ip_address?: string;
    nama_pic?: string;
    kontak_pic?: string;
    kode_kota?: string;
    alamat?: string;
    provinsi?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
    kelurahan_desa?: string;
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

export default function StationsPage({ token, setHeader }: { token: string, setHeader: (node: React.ReactNode) => void }) {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connected, setConnected] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Stations');
    
    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Station>>({
        id: '', name: '', city: '', 
        latitude: -6.9147, longitude: 107.6098,
        nama_pic: '', kontak_pic: '', ip_address: '',
        alamat: '', provinsi: '', kabupaten_kota: '',
        kecamatan: '', kelurahan_desa: '', kode_pos: '',
        poi: '', media: ''
    });

    const [toast, setToast] = useState<Toast | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);

    const fetchStations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/stations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Add some mock data for the UI demonstration as per reference image
                const enhancedStations = data.stations.map((s: any) => ({
                    ...s,
                    status: Math.random() > 0.3 ? 'ONLINE' : 'UPDATING',
                    displays_active: Math.floor(Math.random() * 40) + 10,
                    next_sync: Math.random() > 0.5 ? `${Math.floor(Math.random() * 10)}m ${Math.floor(Math.random() * 60)}s` : 'Syncing...',
                    division: s.city?.toLowerCase().includes('java') || s.provinsi?.toLowerCase().includes('jawa') ? 'Java Division' : 'Sumatra Division'
                }));
                setStations(enhancedStations);
            }
        } catch (err) {
            console.error("Fetch stations error:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStations();
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
            fetchStations();
        });
        return () => {
            socket.disconnect();
        };
    }, [fetchStations]);

    useEffect(() => {
        setHeader(
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${connected ? 'text-green-600' : 'text-red-600'}`}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-[#ee6f1f] animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
                    </div>
                )}
            </div>
        );
        return () => setHeader(null);
    }, [connected, loading, setHeader]);

    const showToast = (message: string, success = true) => {
        setToast({ message, type: success ? 'success' : 'error' });
        setTimeout(() => setToast(null), 3000);
    };

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
                    nama_pic: '', kontak_pic: '', ip_address: '',
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

    const filteredStations = stations.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             s.id.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (activeFilter === 'All Stations') return matchesSearch;
        if (activeFilter === 'Maintenance Required') return matchesSearch && s.status === 'UPDATING';
        return matchesSearch && s.division === activeFilter;
    });

    const filterOptions = ['All Stations', 'Java Division', 'Sumatra Division', 'Maintenance Required'];

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#1d2d6a] tracking-tight mb-2">Station Overview</h1>
                    <p className="text-slate-500 font-bold text-lg">Manage {stations.length} integrated stations across all divisions</p>
                </div>
            </div>

            {/* Filter Chips - Horizontal Row */}
            <div className="flex overflow-x-auto custom-scrollbar pb-2 -mb-2 gap-3 scroll-smooth no-scrollbar">
                {filterOptions.map(opt => (
                    <button
                        key={opt}
                        onClick={() => setActiveFilter(opt)}
                        className={`px-6 py-3 rounded-full font-black text-sm transition-all border-2 shrink-0 ${
                            activeFilter === opt 
                            ? 'bg-[#1d2d6a] text-white border-[#1d2d6a] shadow-lg' 
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
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 text-[#1d2d6a]' : 'text-slate-300 hover:text-slate-500'}`}
                        >
                            <List size={22} />
                        </button>
                    </div>
                </div>

                <button 
                    onClick={() => { setShowForm(true); setEditingId(null); }}
                    className="flex items-center gap-3 px-10 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(238,111,31,0.3)] transition-all active:scale-95 shrink-0"
                >
                    <Plus size={24} strokeWidth={3} />
                    Add Station
                </button>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#ee6f1f] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">Loading stations data...</p>
                    </motion.div>
                ) : filteredStations.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <Building2 size={64} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-xl font-black text-[#1d2d6a]">No stations found</h3>
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
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 group"
                            >
                                {/* Station Image & Status Badge */}
                                <div className="relative h-64 overflow-hidden">
                                    <img 
                                        src={station.media || `https://images.unsplash.com/photo-1474487056235-9d690a61429d?q=80&w=1000&auto=format&fit=crop`} 
                                        alt={station.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
                                        <div className={`w-2 h-2 rounded-full ${station.status === 'ONLINE' ? 'bg-green-400 shadow-[0_0_8px_rgba(72,187,120,0.8)]' : 'bg-orange-400 shadow-[0_0_8px_rgba(237,137,54,0.8)]'}`} />
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{station.status}</span>
                                    </div>
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingId(station.id); setForm(station); setShowForm(true); }}
                                            className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-[#1d2d6a] hover:bg-white shadow-lg transition-all"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(station); }}
                                            className="p-2.5 bg-red-500/90 backdrop-blur-sm rounded-xl text-white hover:bg-red-500 shadow-lg transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-2xl font-black text-[#1d2d6a] tracking-tight">{station.name}</h3>
                                            <p className="text-slate-400 font-bold text-sm">{station.city}, {station.provinsi || 'DAOP 1'}</p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Displays</span>
                                            <span className="text-xl font-black text-[#1d2d6a]">{station.displays_active} Active</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Next Sync</span>
                                            <span className="text-xl font-black text-[#1d2d6a]">{station.next_sync}</span>
                                        </div>
                                    </div>

                                    <button 
                                        className="w-full py-4 px-6 bg-white border-2 border-slate-100 rounded-2xl text-[#1d2d6a] font-black hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        Manage Displays
                                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
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
                                    <th className="px-8 py-6 font-black text-sm uppercase tracking-wider">Station Name</th>
                                    <th className="px-8 py-6 font-black text-sm uppercase tracking-wider">ID / Code</th>
                                    <th className="px-8 py-6 font-black text-sm uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-6 font-black text-sm uppercase tracking-wider">Displays</th>
                                    <th className="px-8 py-6 font-black text-sm uppercase tracking-wider text-right">Actions</th>
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
                                                    <div className="font-black text-[#1d2d6a]">{station.name}</div>
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
                                                <span className={`text-xs font-black ${station.status === 'ONLINE' ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {station.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-[#1d2d6a] font-bold">
                                                <Monitor size={14} className="text-slate-300" />
                                                {station.displays_active}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingId(station.id); setForm(station); setShowForm(true); }} className="p-2 text-slate-400 hover:text-[#1d2d6a] hover:bg-slate-100 rounded-xl transition-all"><Pencil size={18} /></button>
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

            {/* Station Form Modal (same rich UI as previously refined) */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10 pointer-events-none">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setShowForm(false)}
                            className="absolute inset-0 bg-[#0a122a]/80 backdrop-blur-xl pointer-events-auto"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-6xl max-h-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                        >
                            {/* Modal Header */}
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-3xl font-black text-[#1d2d6a] tracking-tight">{editingId ? 'Edit Station Details' : 'Register New Station'}</h2>
                                    <p className="text-slate-400 font-bold mt-1">Configure comprehensive data and location markers</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-4 bg-slate-50 rounded-[1.5rem] text-slate-400 hover:text-slate-600 transition-all active:scale-95">
                                    <X size={28} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    {/* Left Column: Details */}
                                    <div className="space-y-12">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Building2 size={14} className="text-[#ee6f1f]" /> Basic Identity
                                            </h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">Station ID</label>
                                                    <input value={form.id} disabled={!!editingId} onChange={e => setForm({...form, id: e.target.value.toUpperCase()})} placeholder="e.g. BD" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">City Code</label>
                                                    <input value={form.kode_kota} onChange={e => setForm({...form, kode_kota: e.target.value.toUpperCase()})} placeholder="e.g. BDG" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">Station Name</label>
                                                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} placeholder="e.g. BANDUNG" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-black text-lg focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <User size={14} className="text-[#ee6f1f]" /> Responsibility (PIC)
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">PIC Name</label>
                                                    <input value={form.nama_pic} onChange={e => setForm({...form, nama_pic: e.target.value})} placeholder="Full name" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">PIC Contact</label>
                                                    <input value={form.kontak_pic} onChange={e => setForm({...form, kontak_pic: e.target.value})} placeholder="Phone number" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin size={14} className="text-[#ee6f1f]" /> Local Address
                                            </h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">Address Line</label>
                                                    <textarea value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} placeholder="St. Address..." rows={2} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all resize-none" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">Province</label>
                                                    <input value={form.provinsi} onChange={e => setForm({...form, provinsi: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">City / Regency</label>
                                                    <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Map & Media */}
                                    <div className="space-y-12">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <MapPinned size={14} className="text-[#ee6f1f]" /> Geo Location
                                            </h4>
                                            <div className="relative rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-inner min-h-[400px]">
                                                <div ref={mapContainerRef} className="absolute inset-0" />
                                                <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl pointer-events-none">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coordinates</span>
                                                    <span className="font-mono text-sm font-black text-[#1d2d6a]">
                                                        {form.latitude?.toFixed(6)}, {form.longitude?.toFixed(6)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Latitude</label>
                                                    <input type="number" step="0.000001" value={form.latitude} onChange={e => setForm({...form, latitude: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[#1d2d6a] font-bold text-xs" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Longitude</label>
                                                    <input type="number" step="0.000001" value={form.longitude} onChange={e => setForm({...form, longitude: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[#1d2d6a] font-bold text-xs" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Globe size={14} className="text-[#ee6f1f]" /> Digital & Media
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">IP Server Address</label>
                                                    <input value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})} placeholder="e.g. 192.168.1.10" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-black text-[#1d2d6a] ml-1">Station Image URL</label>
                                                    <input value={form.media} onChange={e => setForm({...form, media: e.target.value})} placeholder="https://..." className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-[#1d2d6a] font-bold focus:bg-white focus:border-[#ee6f1f] transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
                                <button onClick={() => setShowForm(false)} className="px-8 py-4 font-black text-[#1d2d6a] hover:bg-white rounded-2xl transition-all">Cancel</button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-12 py-4 bg-[#1d2d6a] hover:bg-[#14204d] disabled:bg-slate-300 text-white rounded-2xl font-black shadow-xl shadow-blue-900/10 flex items-center gap-3 transition-all active:scale-95"
                                >
                                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                                    {editingId ? 'Update Station' : 'Complete Registration'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
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
                            <h3 className="text-2xl font-black text-[#1d2d6a] mb-2">Delete Station?</h3>
                            <p className="text-slate-500 font-bold mb-8">Are you sure you want to delete <span className="text-[#ee6f1f]">{deleteTarget.name}</span>? This action cannot be undone.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setDeleteTarget(null)} className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                                <button onClick={handleDelete} className="px-6 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">Delete Now</button>
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
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 text-white font-black overflow-hidden ${toast.type === 'success' ? 'bg-[#1d2d6a] border-b-4 border-green-400' : 'bg-red-500 border-b-4 border-white/20'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

