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
        const enhanced = data.stations.map((s: any) => ({ ...s, status: "ONLINE", division: s.provinsi?.toLowerCase().includes("jawa") ? "Java Division" : "Sumatra Division" }));
        setStations(prev => isLoadMore ? [...prev, ...enhanced] : enhanced);
        setTotal(data.total);
        setOffset(isLoadMore ? offset + LIMIT : 0);
      }
    } catch (e) {} finally { setLoading(false); }
  }, [offset, searchQuery, activeFilter]);

  useEffect(() => { fetchStations(false); }, [activeFilter, searchQuery]);

  useEffect(() => {
    setHeaderTitle(
      <div className="flex items-center gap-3 text-xl font-black uppercase">
        {selectedStation ? (
          <div className="flex items-center gap-2 tracking-tight">
            <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-colors">STATIONS</button>
            <ChevronRight size={18} strokeWidth={4} className="text-slate-300" />
            <span className="text-[#1d2d6a] dark:text-white font-black">{selectedStation.name}</span>
          </div>
        ) : <span className="text-[#1d2d6a] dark:text-white font-black">STATION MANAGEMENT</span>}
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
        if (selectedStation) setSelectedStation({...selectedStation, ...form} as Station);
      }
    } catch (e) {} finally { setSaving(false); }
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
                src={selectedStation.media ? `${API}/media/station/${selectedStation.media}` : `${API}/media/station/station_fallback.png`}
                className="w-full h-full object-cover transition-opacity duration-500"
                alt={selectedStation.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1474487543417-981ceee1c818?auto=format&fit=crop&q=80&w=2000`;
                  (e.target as HTMLImageElement).onerror = null;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
              <div className="absolute top-6 left-6">
                <button onClick={() => setSelectedStation(null)} className="p-3 bg-slate-900/40 backdrop-blur-md border border-white/20 text-white hover:bg-[#ee6f1f] transition-all rounded-xl"><X size={20}/></button>
              </div>
              <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#ee6f1f] px-4 py-2 rounded-2xl w-fit shadow-xl"><Globe2 size={16} className="text-white"/><span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedStation.division}</span></div>
                  <h2 className="text-7xl font-black text-white tracking-tighter leading-none">{selectedStation.name}</h2>
                  <div className="flex items-center gap-3 text-white/70 font-bold text-xl mt-2"><MapPin className="text-[#ee6f1f]" size={20}/><span>{selectedStation.city}, {selectedStation.provinsi || "JAWA"}</span></div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => { setForm(selectedStation); setEditingId(selectedStation.id); setShowForm(true); }} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-2xl transition-all shadow-xl"><Pencil size={20}/></button>
                   <button onClick={() => setDeleteTarget(selectedStation)} className="p-4 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 text-white rounded-2xl transition-all shadow-xl"><Trash2 size={20}/></button>
                </div>
              </div>
            </div>

            {/* 2. Unified Content Area - Industrial Flat Look */}
            <div className="p-10 lg:p-16 space-y-16 max-w-[1600px]">
               {/* Global Status Bar */}
               <div className="flex gap-16 border-b dark:border-slate-800 pb-10">
                  <div className="space-y-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Node ID</span>
                     <p className="text-4xl font-black text-[#1d2d6a] dark:text-white uppercase tracking-tighter">{selectedStation.id}</p>
                  </div>
                  <div className="space-y-1 border-l dark:border-slate-800 pl-16">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Network IP Address</span>
                     <p className="text-4xl font-black text-[#ee6f1f] font-mono tracking-tighter">{selectedStation.ip_address || "192.168.1.xxx"}</p>
                  </div>
               </div>

               {/* Grid Info Blocks - Everything unified here */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-16">
                  {/* Administrative */}
                  <div className="space-y-8">
                     <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3"><Building2 size={16}/> Administrative</h4>
                     <div className="space-y-6">
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Provinsi</span><span className="text-base font-black text-slate-800 dark:text-slate-200 uppercase">{selectedStation.provinsi || "N/A"}</span></div>
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mailing Address</span><p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic pr-4">"{selectedStation.alamat || selectedStation.city}"</p></div>
                     </div>
                  </div>

                  {/* Operational Communication */}
                  <div className="space-y-8">
                     <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3"><Monitor size={16}/> Communication</h4>
                     <div className="space-y-6">
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Operational</span><span className="text-base font-black text-[#1d2d6a] dark:text-white lowercase">{selectedStation.email || "stasiun@kai.id"}</span></div>
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fixed Line</span><span className="text-base font-black text-[#1d2d6a] dark:text-white">{selectedStation.fixed_line || "(021) 123-456"}</span></div>
                     </div>
                  </div>

                  {/* Authority - Integrated instead of separate */}
                  <div className="space-y-8">
                     <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3"><User size={16}/> Station Authority</h4>
                     <div className="space-y-6">
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assigned PIC</span><span className="text-base font-black text-[#1d2d6a] dark:text-white uppercase">{selectedStation.pic_name || "NOT ASSIGNED"}</span></div>
                        <div className="flex flex-col space-y-1.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secure Line</span><span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">{selectedStation.pic_contact || "N/A"}</span></div>
                        <button className="text-[9px] font-black uppercase text-[#ee6f1f] border border-[#ee6f1f] px-4 py-2 hover:bg-[#ee6f1f] hover:text-white transition-all w-fit">Contact Authority</button>
                     </div>
                  </div>
               </div>

               {/* Geographic Map Section */}
               <div className="space-y-8 pt-10 border-t dark:border-slate-800">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3"><MapPinned size={16}/> Geographic Positioning</h4>
                    <div className="flex gap-4 font-mono text-[11px] font-black text-[#1d2d6a] dark:text-[#ee6f1f]">
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
              <div><h1 className="text-4xl font-black text-[#1d2d6a] dark:text-white tracking-tighter leading-none">STATIONS</h1><p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Network Infrastructure Nodes</p></div>
              <div className="flex gap-4">
                 <div className="relative group w-80 shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#ee6f1f]" size={18}/><input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Find node by name..." className="w-full bg-white dark:bg-slate-950 px-14 py-4 text-sm font-bold text-[#1d2d6a] dark:text-white focus:outline-none transition-all"/></div>
                 <button onClick={()=>setShowForm(true)} className="px-8 bg-[#ee6f1f] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-3 transition-all"><Plus size={16} strokeWidth={4}/> Add Node</button>
              </div>
            </div>

            <div className="flex gap-2 px-2 overflow-x-auto no-scrollbar border-b dark:border-slate-800 pb-1">
              {filterOptions.map(opt=><button key={opt} onClick={()=>setActiveFilter(opt)} className={`px-6 py-3 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${activeFilter===opt?"text-[#ee6f1f] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-[#ee6f1f]":"text-slate-400 hover:text-slate-600"}`}>{opt}</button>)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 p-2">
              {stations.map((s,i)=>(
                <motion.div key={s.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.02}} onClick={()=>setSelectedStation(s)} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 shadow-xl hover:border-[#ee6f1f]/30 transition-all cursor-pointer group flex flex-col hover:-translate-y-1">
                  <div className="relative h-56 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                    <img 
                      src={s.media ? `${API}/media/station/${s.media}` : `https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={s.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1568992687345-26948fad841e?auto=format&fit=crop&q=80&w=800`;
                        (e.target as HTMLImageElement).onerror = null;
                      }}
                    />
                    <div className="absolute top-4 left-4 bg-[#ee6f1f] px-4 py-1.5 rounded-lg border border-white/20 text-[9px] font-black text-white uppercase tracking-widest shadow-lg">{s.division || "Java Division"}</div>
                    <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-950/95 px-4 py-1.5 rounded-lg text-[10px] font-black text-[#1d2d6a] dark:text-[#ee6f1f] shadow-2xl border border-slate-100 dark:border-slate-800 uppercase tracking-tighter">{s.id}</div>
                  </div>
                  <div className="p-6 space-y-2 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-[#1d2d6a] dark:text-white leading-none tracking-tighter transition-colors group-hover:text-[#ee6f1f]">{s.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><MapPin size={10} className="text-[#ee6f1f]"/>{s.city}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={!!deleteTarget} title="Confirm Station Deletion" message={`Are you sure you want to remove ${deleteTarget?.name}? Data cannot be restored.`} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={saving}/>
      <ToastNotification toast={toast} onClose={closeToast}/>
    </div>
  );
}
