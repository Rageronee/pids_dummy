/** /command-center-app/src/pages/SchedulesPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: SchedulesPage */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Trash2,
  RefreshCcw,
  ChevronRight,
  MapPinned,
  Plus,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Info,
  Paperclip,
  Activity,
  ArrowUp,
  ArrowLeft,
  Route as RouteIcon,
} from "lucide-react";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";
import { usePidsData } from "../hooks/usePidsData";

const STATUS_COLOR: Record<string, string> = {
  ON_TIME: "text-green-600 bg-green-500/10 border-green-500/20",
  DELAYED: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  CANCELLED: "text-red-500 bg-red-500/10 border-red-500/20",
};

export default function SchedulesPage({ token }: { token: string }) {
  const { data: pidsState } = usePidsData();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, closeToast } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrollPos > 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [trainsetOptions, setTrainsetOptions] = useState<any[]>([]);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [stationOptions, setStationOptions] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedTrainsetId, setSelectedTrainsetId] = useState<string>("");
  const [form, setForm] = useState({
    train_name: "", // Service Name (e.g. ARGO WILIS)
    train_number: "", // Train Number (e.g. 1A)
    dep_station: "",
    dep_city_code: "",
    arr_station: "",
    arr_city_code: "",
    dep_sched: "",
    dep_real: "",
    dep_diff: "0",
    dep_status: "Tepat Waktu",
    arr_sched: "",
    arr_real: "",
    arr_diff: "0",
    arr_status: "Tepat Waktu",
    notes: "",
    media: "",
  });

  const handleEdit = (sched: any) => {
    setEditingId(sched.id);
    setForm({
      train_name: sched.train_name,
      train_number: sched.train_number || sched.ka_number || "",
      dep_station: sched.stasiun_keberangkatan,
      dep_city_code: sched.kode_kota_keberangkatan,
      arr_station: sched.stasiun_tujuan,
      arr_city_code: sched.kode_kota_tujuan,
      dep_sched: sched.waktu_keberangkatan_penjadwalan || "",
      dep_real: sched.waktu_keberangkatan_realisasi || "",
      dep_diff: String(sched.selisih_waktu_keberangkatan || "0"),
      dep_status: sched.status_keberangkatan || "Tepat Waktu",
      arr_sched: sched.waktu_kedatangan_penjadwalan || "",
      arr_real: sched.waktu_kedatangan_realisasi || "",
      arr_diff: String(sched.selisih_waktu_kedatangan || "0"),
      arr_status: sched.status_kedatangan || "Tepat Waktu",
      notes: sched.catatan || "",
      media: sched.media || "",
    });
    setSelectedSchedule(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const LIMIT = 10;

  const fetchSchedules = useCallback(
    async (isLoadMore = false, overrideSearch?: string) => {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const currentOffset = isLoadMore ? offset + LIMIT : 0;
        const search = overrideSearch !== undefined ? overrideSearch : searchQuery;
        const query = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: currentOffset.toString(),
          search: search,
        });

        const res = await fetch(`${API}/api/schedules?${query}`);
        const d = await res.json();
        if (d.success) {
          if (isLoadMore) setSchedules((prev) => [...prev, ...d.schedules]);
          else setSchedules(d.schedules);
          setTotal(d.total);
          setOffset(currentOffset);
        }
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [offset, searchQuery],
  );

  const fetchData = useCallback(async () => {
    try {
      const [tr, st, rt] = await Promise.all([
        fetch(`${API}/api/admin/trainsets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/stations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/routes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [trD, stD, rtD] = await Promise.all([tr.json(), st.json(), rt.json()]);
      if (trD.success) setTrainsetOptions(trD.trainsets || []);
      if (stD.success) setStationOptions(stD.stations || []);
      if (rtD.success && rtD.routes) {
        const routeList = Object.values(rtD.routes) as any[];
        setRouteOptions(routeList);
      }
    } catch { }
  }, [token]);

  useEffect(() => {
    fetchSchedules(false);
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchedules(false, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSave = async () => {
    if (!form.train_name || !form.dep_station || !form.arr_station) {
      showToast("Mohon lengkapi data wajib (Nama, Keberangkatan, Tujuan)", false);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        trainset_id: selectedTrainsetId ? parseInt(selectedTrainsetId) : null,
        train_name: form.train_name,
        train_number: form.train_number,
        stasiun_keberangkatan: form.dep_station,
        kode_kota_keberangkatan: form.dep_city_code,
        stasiun_tujuan: form.arr_station,
        kode_kota_tujuan: form.arr_city_code,
        waktu_keberangkatan_penjadwalan: form.dep_sched,
        waktu_keberangkatan_realisasi: form.dep_real,
        selisih_waktu_keberangkatan: form.dep_diff,
        status_keberangkatan: form.dep_status,
        waktu_kedatangan_penjadwalan: form.arr_sched,
        waktu_kedatangan_realisasi: form.arr_real,
        selisih_waktu_kedatangan: form.arr_diff,
        status_kedatangan: form.arr_status,
        catatan: form.notes,
        media: form.media,
        route_id: selectedRouteId ? parseInt(selectedRouteId) : null,
        stops: [],
      };

      const url = editingId ? `${API}/api/admin/schedules/${editingId}` : `${API}/api/admin/schedules`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        showToast(editingId ? "Jadwal berhasil diperbarui" : "Jadwal berhasil disimpan", true);
        fetchSchedules(false);
        setShowForm(false);
        setEditingId(null);
        setSelectedTrainsetId("");
        setForm({
          train_name: "",
          train_number: "",
          dep_station: "",
          dep_city_code: "",
          arr_station: "",
          arr_city_code: "",
          dep_sched: "",
          dep_real: "",
          dep_diff: "0",
          dep_status: "Tepat Waktu",
          arr_sched: "",
          arr_real: "",
          arr_diff: "0",
          arr_status: "Tepat Waktu",
          notes: "",
          media: "",
        });
      } else showToast(d.error || "Gagal", false);
    } catch {
      showToast("Koneksi gagal", false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/schedules/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Jadwal ${deleteTarget.train_name} dihapus`, true);
        fetchSchedules(false);
      } else showToast(d.error || "Gagal", false);
    } catch {
      showToast("Koneksi gagal", false);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Jadwal"
        message={`Hapus jadwal ${deleteTarget?.train_name}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={saving}
      />

      {selectedSchedule ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedSchedule(null)}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider pr-2">Kembali</span>
              </button>
              <div>
                <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight leading-none uppercase">
                  {selectedSchedule.display_train_name || selectedSchedule.train_name}
                </h2>
                <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-[0.2em]">
                  Service Number: {selectedSchedule.display_train_number || selectedSchedule.train_number || "-"} | Rangkaian: {selectedSchedule.trainset_name || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(selectedSchedule)}
                className="px-6 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2"
              >
                <Clock size={18} /> Edit Jadwal
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Activity size={12} className="text-[#ee6f1f]" /> Status Perjalanan
                  </span>
                  <div className="pt-1">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_COLOR[selectedSchedule.status] || "text-slate-400"}`}>
                      {selectedSchedule.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Clock size={12} className="text-[#ee6f1f]" /> Keberangkatan
                  </span>
                  <p className="text-xl font-bold dark:text-white font-mono leading-none pt-1">
                    {selectedSchedule.waktu_keberangkatan_penjadwalan}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#ee6f1f]" /> Kedatangan
                  </span>
                  <p className="text-xl font-bold text-[#ee6f1f] font-mono leading-none pt-1">
                    {selectedSchedule.waktu_kedatangan_penjadwalan}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Info size={12} className="text-[#ee6f1f]" /> Internal Notes
                  </span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-400 italic truncate pt-1">
                    {selectedSchedule.catatan ? `"${selectedSchedule.catatan}"` : "Tidak ada catatan"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.1em] text-sm">Route Checkpoints</h3>
                <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-800">
                  {selectedSchedule.stops?.length || 0} Stations
                </span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {selectedSchedule.stops && selectedSchedule.stops.length > 0 ? (
                  selectedSchedule.stops.map((stop: any, idx: number) => (
                    <div key={idx} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-5">
                        <span className="text-slate-300 dark:text-slate-700 font-mono font-bold text-xl">
                          {String((stop.sequence_order ?? idx) + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="font-bold text-[#1d2d6a] dark:text-white uppercase text-base leading-tight">{stop.station_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase">{stop.station_code}</p>
                        </div>
                      </div>
                      <div className="flex gap-8 items-center">
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Arrival</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
                            {stop.arrival_time || stop.departure_time || "--:--"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Departure</p>
                          <p className="text-sm font-semibold text-[#ee6f1f] font-mono">
                            {stop.departure_time || stop.arrival_time || "--:--"}
                          </p>
                        </div>
                        <div className={`w-24 px-3 py-1 rounded-lg text-center text-[10px] font-semibold border ${stop.stop_status === "ARRIVED" ? "bg-green-50 dark:bg-green-900/30 text-green-600 border-green-100 dark:border-green-900/50" :
                          stop.stop_status === "SCHEDULED" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-100 dark:border-blue-900/50" :
                            "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700"
                          }`}>
                          {stop.stop_status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <MapPin size={48} className="mx-auto text-slate-200" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Direct Point-to-Point Route</p>
                    <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Origin</p>
                        <p className="font-bold dark:text-white">{selectedSchedule.stasiun_keberangkatan}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Destination</p>
                        <p className="font-bold dark:text-white">{selectedSchedule.stasiun_tujuan}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2 uppercase">
                Penjadwalan Kereta
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Monitoring & Manajemen {total} Jadwal Aktif
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari KA / Rute..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold text-[#1d2d6a] dark:text-white focus:outline-none focus:border-[#ee6f1f] shadow-sm transition-all"
                />
              </div>
              <button
                onClick={() => {
                  if (showForm) setEditingId(null);
                  setShowForm(!showForm);
                }}
                className={`flex items-center gap-2 h-11 px-6 rounded-2xl font-bold text-sm transition-all active:scale-95 shrink-0 ${showForm ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" : "bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md"}`}
              >
                {showForm ? (
                  <><X size={18} /> Batal</>
                ) : (
                  <><Plus size={18} /> Tambah Jadwal</>
                )}
              </button>
              <button
                onClick={() => fetchSchedules(false)}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-[#1d2d6a] dark:hover:text-white hover:border-[#1d2d6a] dark:hover:border-slate-700 transition-all"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 overflow-hidden transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-[#1d2d6a] dark:text-white font-bold text-lg flex items-center gap-2">
                    {editingId ? <Clock size={20} className="text-[#ee6f1f]" /> : <Plus size={20} className="text-[#ee6f1f]" />}
                    {editingId ? "Update Jadwal Kereta" : "Tambah Jadwal Kereta"}
                  </h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">Pilih Armada</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Pilih Rangkaian (Trainset)</label>
                          <select
                            value={selectedTrainsetId}
                            onChange={(e) => setSelectedTrainsetId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                          >
                            <option value="">Pilih Armada Fisik</option>
                            {trainsetOptions.map((t) => <option key={t.id} value={String(t.id)}>{t.name} ({t.gerbongs?.length || 0} Unit)</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Nama Layanan / KA</label>
                          <input
                            value={form.train_name}
                            onChange={(e) => setForm({ ...form, train_name: e.target.value.toUpperCase() })}
                            placeholder="e.g. ARGO WILIS"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 mt-4">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1.5">
                          <RouteIcon size={10} className="text-[#ee6f1f]" /> Pilih Rute
                        </label>
                        <select
                          value={selectedRouteId}
                          onChange={(e) => {
                            const routeId = e.target.value;
                            setSelectedRouteId(routeId);
                            const route = routeOptions.find((r: any) => String(r.id) === routeId);
                            if (route && route.stations?.length >= 2) {
                              const firstStation = route.stations[0];
                              const lastStation = route.stations[route.stations.length - 1];
                              setForm((prev) => ({
                                ...prev,
                                dep_station: firstStation?.name || prev.dep_station,
                                arr_station: lastStation?.name || prev.arr_station,
                              }));
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                        >
                          <option value="">Tanpa Rute (Manual)</option>
                          {routeOptions.map((r: any) => (
                            <option key={r.id || r.name} value={String(r.id)}>
                              {r.name} ({r.stations?.length || 0} stasiun)
                            </option>
                          ))}
                        </select>
                        {selectedRouteId && (() => {
                          const route = routeOptions.find((r: any) => String(r.id) === selectedRouteId);
                          if (!route || !route.stations?.length) return null;
                          return (
                            <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2">Route Checkpoints</p>
                              <div className="flex flex-wrap gap-1.5">
                                {route.stations.map((s: any, idx: number) => (
                                  <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${idx === 0 ? "bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800" :
                                    idx === route.stations.length - 1 ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800" :
                                      "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600"
                                    }`}>{s.name}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">Waktu & Media</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Media / Lampiran (URL)</label>
                        <div className="relative">
                          <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={14} />
                          <input
                            value={form.media}
                            onChange={(e) => setForm({ ...form, media: e.target.value })}
                            placeholder="URL Gambar/Dokumen"
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                        <h4 className="font-semibold text-[#1d2d6a] dark:text-white text-sm uppercase tracking-[0.1em]">Keberangkatan</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Stasiun</label>
                          <select
                            value={form.dep_station}
                            onChange={(e) => {
                              const s = stationOptions.find((sx) => sx.id === e.target.value);
                              setForm({ ...form, dep_station: s?.name || e.target.value, dep_city_code: s?.kode_kota || "" });
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                          >
                            <option value="">Pilih Stasiun</option>
                            {stationOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Kode Kota</label>
                          <input value={form.dep_city_code} readOnly className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-slate-300 font-semibold text-sm opacity-70 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#ee6f1f] uppercase tracking-[0.1em] flex items-center gap-1"><Clock size={10} /> Penjadwalan</label>
                          <input type="time" value={form.dep_sched} onChange={(e) => setForm({ ...form, dep_sched: e.target.value })} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1"><Activity size={10} /> Realisasi</label>
                          <input type="time" value={form.dep_real} onChange={(e) => setForm({ ...form, dep_real: e.target.value })} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                        <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm uppercase tracking-[0.1em]">Kedatangan</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Stasiun</label>
                          <select
                            value={form.arr_station}
                            onChange={(e) => {
                              const s = stationOptions.find((sx) => sx.id === e.target.value);
                              setForm({ ...form, arr_station: s?.name || e.target.value, arr_city_code: s?.kode_kota || "" });
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                          >
                            <option value="">Pilih Stasiun</option>
                            {stationOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Kode Kota</label>
                          <input value={form.arr_city_code} readOnly className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-slate-300 font-semibold text-sm opacity-70 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#ee6f1f] uppercase tracking-[0.1em] flex items-center gap-1"><Clock size={10} /> Penjadwalan</label>
                          <input type="time" value={form.arr_sched} onChange={(e) => setForm({ ...form, arr_sched: e.target.value })} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1"><Activity size={10} /> Realisasi</label>
                          <input type="time" value={form.arr_real} onChange={(e) => setForm({ ...form, arr_real: e.target.value })} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm shadow-sm focus:border-[#ee6f1f] outline-none transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">Catatan</h4>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Masukkan catatan tambahan..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-[#1d2d6a] dark:text-white font-bold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-12 px-10 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-all flex items-center gap-3 active:scale-95 shadow-lg"
                >
                  {saving ? "Menyimpan..." : <><CheckCircle2 size={24} /> Simpan Penjadwalan</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat jadwal...</div>
          ) : (
            <div className="space-y-4">
              {schedules.map((sched, i) => {
                const isActive = pidsState.serviceName === (sched.display_train_name || sched.train_name);
                return (
                  <motion.div
                    key={sched.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-white dark:bg-slate-950 border ${isActive ? "border-slate-200/30 hover:border-[#ee6f1f]" : "border-slate-200 dark:border-slate-800"} shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all group`}
                  >
                    <div className="flex items-center gap-4 px-6 py-5 cursor-pointer" onClick={() => setSelectedSchedule(sched)}>
                      <div className={`w-12 h-12 ${isActive ? "bg-orange-50 dark:bg-orange-950/30" : "bg-[#f8fafc] dark:bg-slate-800"} border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm`}>
                        <Train size={20} className={isActive ? "text-[#ee6f1f]" : "text-[#1d2d6a] dark:text-blue-400"} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-[#1d2d6a] dark:text-white font-bold text-base uppercase">{sched.display_train_name || sched.train_name}</h3>
                          {isActive && <span className="bg-[#ee6f1f] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-[0.2em] animate-pulse">LIVE ACTIVE</span>}
                          <span className="text-slate-400 text-[10px] font-bold">{sched.display_train_number || sched.train_number || "-"} | {sched.trainset_name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{sched.schedule_date}</span>
                          <span className={`px-2 py-0.5 rounded-lg border ${STATUS_COLOR[sched.status] || ""}`}>{sched.status?.replace("_", " ")}</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 transition-transform group-hover:translate-x-1" />
                      <div className="flex gap-2 ml-4">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(sched); }} className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500"><Clock size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(sched); }} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {schedules.length < total && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => fetchSchedules(true)}
                disabled={loadingMore}
                className="px-12 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-[#1d2d6a] dark:text-slate-300 font-bold rounded-2xl hover:border-[#ee6f1f] hover:text-[#ee6f1f] transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-3"
              >
                {loadingMore ? <RefreshCcw size={20} className="animate-spin" /> : <ChevronRight size={20} className="rotate-90" />}
                {loadingMore ? "Memuat Lebih Banyak..." : "Muat Jadwal Lainnya"}
              </button>
            </div>
          )}
        </>
      )}

      <ToastNotification toast={toast} onClose={closeToast} />

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-10 right-10 z-[100] w-14 h-14 bg-[#ee6f1f] text-white rounded-2xl shadow-[0_20px_50px_rgba(238,111,31,0.3)] flex items-center justify-center hover:bg-[#d45d15] active:scale-90 transition-all group border-4 border-white dark:border-slate-900"
            title="Scroll to Top"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
