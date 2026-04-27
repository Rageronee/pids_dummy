/** /command-center-app/src/pages/StationsPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: StationsPage */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  MapPin,
  Building2,
  User,
  Phone,
  Globe,
  Info,
  Save,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronRight,
  ArrowRight,
  Monitor,
  Mail,
  Globe2,
  MapPinned,
  PhoneCall,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Station {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  ip_address?: string;
  pic_name?: string;
  pic_contact?: string;
  alamat?: string;
  provinsi?: string;
  email?: string;
  fixed_line?: string;
  kode_pos?: string;
  media?: string;
  status?: string;
  division?: string;
}

export default function StationsPage({
  token,
  setHeaderTitle,
}: {
  token: string;
  setHeaderTitle: (node: React.ReactNode) => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Stations");
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapIsReady, setMapIsReady] = useState(false);

  const { toast, showToast, closeToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Station>>({ id: "", name: "", city: "" });

  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const mapDetailContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; setMapIsReady(false); } return; }
    if (mapRef.current) return;
    try {
      const lat = Number(selectedStation?.latitude) || -6.1751;
      const lon = Number(selectedStation?.longitude) || 106.8272;
      mapRef.current = new maplibregl.Map({
        container: node,
        style: document.documentElement.classList.contains("dark")
          ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [lon, lat],
        zoom: 15,
        attributionControl: false,
      });
      mapRef.current.on("load", () => { setMapIsReady(true); });
    } catch (e) { console.error(e); }
  }, [selectedStation]);

  useEffect(() => {
    if (!mapRef.current || !mapIsReady || !selectedStation) return;
    const lat = Number(selectedStation.latitude);
    const lon = Number(selectedStation.longitude);
    if (markerRef.current) markerRef.current.remove();
    const el = document.createElement("div");
    el.className = "w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse";
    markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(mapRef.current);
    mapRef.current.flyTo({ center: [lon, lat], zoom: 15 });
  }, [selectedStation, mapIsReady]);

  const fetchStations = useCallback(async (isLoadMore = false) => {
    setLoading(!isLoadMore);
    try {
      const query = new URLSearchParams({ limit: LIMIT.toString(), offset: (isLoadMore ? offset + LIMIT : 0).toString(), search: searchQuery, division: activeFilter });
      const res = await fetch(`${API}/api/stations?${query}`);
      const data = await res.json();
      if (data.success) {
        const enhanced = data.stations.map((s: any) => {
          const isJava =
            s.provinsi?.toLowerCase().includes("jawa") ||
            s.province?.toLowerCase().includes("jawa") ||
            s.city?.toLowerCase().includes("jakarta") ||
            s.city?.toLowerCase().includes("bandung") ||
            s.city?.toLowerCase().includes("surabaya") ||
            s.city?.toLowerCase().includes("semarang") ||
            s.city?.toLowerCase().includes("malang") ||
            s.city?.toLowerCase().includes("jogja") ||
            s.city?.toLowerCase().includes("solo") ||
            s.city?.toLowerCase().includes("cirebon") ||
            s.city?.toLowerCase().includes("madiun") ||
            s.city?.toLowerCase().includes("jember") ||
            s.city?.toLowerCase().includes("kediri") ||
            s.city?.toLowerCase().includes("cilacap") ||
            s.city?.toLowerCase().includes("purwokerto");
          return { ...s, status: "ONLINE", division: isJava ? "Java Division" : "Sumatra Division" };
        });
        setStations(prev => isLoadMore ? [...prev, ...enhanced] : enhanced);
        setTotal(data.total);
        setOffset(isLoadMore ? offset + LIMIT : 0);
      }
    } catch (e) { } finally { setLoading(false); }
  }, [offset, searchQuery, activeFilter]);

  useEffect(() => { fetchStations(false); }, [activeFilter, searchQuery]);

  useEffect(() => {
    setHeaderTitle(
      <div className="flex items-center gap-3 text-xl font-bold uppercase">
        {selectedStation ? (
          <div className="flex items-center gap-2 tracking-tight">
            <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-colors">STATIONS</button>
            <ChevronRight size={18} strokeWidth={4} className="text-slate-300" />
            <span className="text-[#1d2d6a] dark:text-white font-bold">{selectedStation.name}</span>
          </div>
        ) : <span className="text-[#1d2d6a] dark:text-white font-bold">STATION MANAGEMENT</span>}
      </div>
    );
    return () => setHeaderTitle(null);
  }, [selectedStation, setHeaderTitle]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(editingId ? `${API}/api/admin/stations/${editingId}` : `${API}/api/admin/stations`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if ((await res.json()).success) {
        fetchStations();
        setShowForm(false);
        setEditingId(null);
        showToast(`Stasiun disimpan`, true);
        if (selectedStation) setSelectedStation({ ...selectedStation, ...form } as Station);
      }
    } catch (e) { } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/stations/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if ((await res.json()).success) { fetchStations(); setDeleteTarget(null); setSelectedStation(null); showToast(`Stasiun dihapus`, true); }
    } catch { showToast("Koneksi gagal", false); } finally { setSaving(false); }
  };

  const filterOptions = ["All Stations", "Java Division", "Sumatra Division"];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      <AnimatePresence mode="wait">
        {selectedStation ? (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto">
            {/* 1. Hero Image Section - Sharp & Scrolls with content */}
            <div className="relative w-full h-[400px] shrink-0 bg-slate-900 overflow-hidden">
              <img
                src={selectedStation.media ? `${API}/media/station/${selectedStation.media}` : `https://images.unsplash.com/photo-1612527670286-1912f78763f2?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
                className="w-full h-full object-cover transition-opacity duration-500"
                alt={selectedStation.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1612527670286-1912f78763f2?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
                  (e.target as HTMLImageElement).onerror = null;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
              <div className="absolute top-6 left-6">
                <button onClick={() => setSelectedStation(null)} className="p-3 bg-slate-900/40 backdrop-blur-md border border-white/20 text-white hover:bg-[#ee6f1f] transition-all rounded-xl"><X size={20} /></button>
              </div>
              <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#ee6f1f] px-4 py-2 rounded-2xl w-fit shadow-xl"><Globe2 size={16} className="text-white" /><span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">{selectedStation.division}</span></div>
                  <h2 className="text-7xl font-bold text-white tracking-tighter leading-none">{selectedStation.name}</h2>
                  <div className="flex items-center gap-3 text-white/70 font-bold text-xl mt-2"><MapPin className="text-[#ee6f1f]" size={20} /><span>{selectedStation.city}, {selectedStation.provinsi || "JAWA"}</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm(selectedStation); setEditingId(selectedStation.id); setShowForm(true); }} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-2xl transition-all shadow-xl"><Pencil size={20} /></button>
                  <button onClick={() => setDeleteTarget(selectedStation)} className="p-4 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 text-white rounded-2xl transition-all shadow-xl"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>

            {/* 2. Unified Content Area - Industrial Flat Look */}
            <div className="p-10 lg:p-16 space-y-16 max-w-[1600px]">
              {/* Global Status Bar */}
              <div className="flex gap-16 border-b dark:border-slate-800 pb-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Integrated Node ID</span>
                  <p className="text-4xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-tighter">{selectedStation.id}</p>
                </div>
                <div className="space-y-1 border-l dark:border-slate-800 pl-16">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Network IP Address</span>
                  <p className="text-4xl font-bold text-[#ee6f1f] font-mono tracking-tighter">{selectedStation.ip_address || "192.168.1.xxx"}</p>
                </div>
              </div>

              {/* Grid Info Blocks - Everything unified here */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-16">
                {/* Administrative */}
                <div className="space-y-8">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3"><Building2 size={16} /> Administrative</h4>
                  <div className="space-y-6">
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Provinsi</span><span className="text-base font-medium text-slate-800 dark:text-slate-200 uppercase">{selectedStation.provinsi || "N/A"}</span></div>
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Mailing Address</span><p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic pr-4">"{selectedStation.alamat || selectedStation.city}"</p></div>
                  </div>
                </div>

                {/* Operational Communication */}
                <div className="space-y-8">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3"><Monitor size={16} /> Communication</h4>
                  <div className="space-y-6">
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Email Operational</span><span className="text-base font-medium text-[#1d2d6a] dark:text-white lowercase">{selectedStation.email || "stasiun@kai.id"}</span></div>
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Fixed Line</span><span className="text-base font-medium text-[#1d2d6a] dark:text-white">{selectedStation.fixed_line || "(021) 123-456"}</span></div>
                  </div>
                </div>

                {/* Authority - Integrated instead of separate */}
                <div className="space-y-8">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3"><User size={16} /> Station Authority</h4>
                  <div className="space-y-6">
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Assigned PIC</span><span className="text-base font-medium text-[#1d2d6a] dark:text-white uppercase">{selectedStation.pic_name || "NOT ASSIGNED"}</span></div>
                    <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em]">Secure Line</span><span className="text-base font-medium text-blue-600 dark:text-blue-400 font-mono">{selectedStation.pic_contact || "N/A"}</span></div>
                    <button className="text-[10px] font-medium uppercase text-[#ee6f1f] border border-[#ee6f1f] px-4 py-2 hover:bg-[#ee6f1f] hover:text-white transition-all w-fit">Contact Authority</button>
                  </div>
                </div>
              </div>

              {/* Geographic Map Section */}
              <div className="space-y-8 pt-10 border-t dark:border-slate-800">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3"><MapPinned size={16} /> Geographic Positioning</h4>
                  <div className="flex gap-4 font-mono text-[11px] font-bold text-[#1d2d6a] dark:text-[#ee6f1f]">
                    <span>LAT: {selectedStation.latitude?.toFixed(6)}</span>
                    <span>LNG: {selectedStation.longitude?.toFixed(6)}</span>
                  </div>
                </div>
                <div className="h-96 border dark:border-slate-800 relative transition-all duration-700 rounded-3xl overflow-hidden">
                  <div ref={mapDetailContainerRef} className="absolute inset-0" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
              <div>
                <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2 uppercase">STATIONS</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Network Infrastructure Nodes
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="relative group w-80 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#ee6f1f]" size={18} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find node by name..." className="w-full bg-white dark:bg-slate-950 px-14 py-4 text-sm font-bold text-[#1d2d6a] dark:text-white focus:outline-none transition-all" /></div>
                <button onClick={() => setShowForm(true)} className="px-8 bg-[#ee6f1f] text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-3 transition-all"><Plus size={16} strokeWidth={4} /> Add Node</button>
              </div>
            </div>

            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4 shrink-0 w-fit">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setActiveFilter(opt)}
                  className={`h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-[0.1em] transition-all ${activeFilter === opt ? "bg-[#ee6f1f] text-white shadow-lg shadow-orange-500/20" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 p-2">
              {stations.map((s, i) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedStation(s)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col overflow-hidden"
                >
                  <div className="relative h-64 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={s.media ? `${API}/media/station/${s.media}` : `https://images.unsplash.com/photo-1612527670286-1912f78763f2?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt={s.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1612527670286-1912f78763f2?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
                        (e.target as HTMLImageElement).onerror = null;
                      }}
                    />
                    <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] leading-none">{s.division || "JAVA DIVISION"}</span>
                    </div>
                    <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] leading-none">{s.id}</span>
                    </div>
                  </div>

                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h3 className="text-2xl font-bold text-[#1d2d6a] dark:text-white tracking-tight leading-tight">{s.name}</h3>
                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-500/20">
                        <div className="w-2 h-2 bg-[#ee6f1f] rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-[#1d2d6a] dark:text-blue-400 uppercase tracking-[0.2em]">ONLINE</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 mb-6 font-medium uppercase text-[10px] tracking-[0.2em]">
                      <MapPin size={14} className="text-[#ee6f1f]" />
                      <span>{s.city}, Indonesia</span>
                    </div>

                    <div className="relative mb-1">
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-800 w-full" />
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] leading-none">Category</span>
                        <p className="text-sm font-medium text-[#1d2d6a] dark:text-white tracking-tight uppercase">Railway Hub</p>
                      </div>

                      <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] leading-none">ID</span>
                        <p className="text-sm font-medium text-[#1d2d6a] dark:text-white tracking-tight uppercase">{s.id}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ee6f1f] hover:bg-[#d45d15] rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">
                        Lihat Detail
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {stations.length < total && (
              <div className="flex justify-center pt-8 pb-12">
                <button
                  onClick={() => fetchStations(true)}
                  disabled={loading}
                  className="flex items-center gap-3 px-12 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Syncing Nodes...
                    </>
                  ) : (
                    <>
                      <LayoutGrid size={16} />
                      Load More Infrastructure
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={!!deleteTarget} title="Confirm Station Deletion" message={`Are you sure you want to remove ${deleteTarget?.name}? Data cannot be restored.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
      <ToastNotification toast={toast} onClose={closeToast} />
    </div>
  );
}
