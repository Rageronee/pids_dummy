/** /command-center-app/src/pages/TrainsPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: TrainsPage */

import { useState, useEffect, useCallback } from "react";
import {
  Train,
  Plus,
  Trash2,
  RefreshCcw,
  Wifi,
  Clock,
  Pencil,
  X,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Building2,
  Layout,
  FileText,
  Settings,
  Activity,
  Info,
  Save,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";

export default function TrainsPage({ token }: { token: string }) {
  const [trains, setTrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedTrain, setSelectedTrain] = useState<any | null>(null);
  const { toast, showToast, closeToast } = useToast();
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

  const [stations, setStations] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTrain) {
      if (!selectedTrain.gerbongs) {
        fetch(`${API}/api/admin/trains/${encodeURIComponent(selectedTrain.name)}/gerbongs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              setSelectedTrain((prev: any) => ({ ...prev, gerbongs: d.coaches }));
            }
          });
      }
      
      fetch(`${API}/api/routes/${encodeURIComponent(selectedTrain.name)}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setSelectedTrain((prev: any) => ({ ...prev, route: d.data }));
          }
        });
    }
  }, [selectedTrain?.name, token]);

  const [form, setForm] = useState({
    name: "",
    ka_number: "",
    ip_address: "",
    status: "Active",
    origin_station_id: "",
    destination_station_id: "",
    notes: "",
    pic_name: "",
    pic_contact: "",
    media: "",
    gerbongs: [] as any[],
    route_stations: [] as any[],
  });
  const [stationSearch, setStationSearch] = useState("");

  const fetchTrains = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/trains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setTrains(d.trains || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/stations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setStations(d.stations || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchTrains();
    fetchStations();
  }, [fetchTrains, fetchStations]);

  const handleEdit = (train: any) => {
    setEditingId(train.name);
    setForm({
      name: train.name,
      ka_number: train.ka_number || "",
      ip_address: train.ip_address || "",
      status: train.status || "Active",
      origin_station_id: train.origin_station_id || "",
      destination_station_id: train.destination_station_id || "",
      notes: train.notes || "",
      pic_name: train.pic_name || "",
      pic_contact: train.pic_contact || "",
      media: train.media || "",
      gerbongs: train.gerbongs || [],
      route_stations: train.route_stations || [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `${API}/api/admin/trains/${encodeURIComponent(editingId)}`
        : `${API}/api/admin/trains`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          ka_number: form.ka_number,
          ip_address: form.ip_address,
          origin_station_id: form.origin_station_id,
          destination_station_id: form.destination_station_id,
          notes: form.notes,
          pic_name: form.pic_name,
          pic_contact: form.pic_contact,
          media: form.media,
        }),
      });
      const d = await res.json();
      if (d.success) {
        const targetName = form.name.trim();

        if (form.route_stations.length > 0) {
          await fetch(`${API}/api/admin/routes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: targetName,
              stations: form.route_stations,
            }),
          });
        }
        if (form.gerbongs.length > 0) {
          await fetch(
            `${API}/api/admin/trains/${encodeURIComponent(targetName)}/gerbongs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ gerbongs: form.gerbongs }),
            },
          );
        }
        await fetchTrains();
        setForm({
          name: "",
          ka_number: "",
          ip_address: "",
          status: "Active",
          origin_station_id: "",
          destination_station_id: "",
          notes: "",
          pic_name: "",
          pic_contact: "",
          media: "",
          gerbongs: [],
          route_stations: [],
        });
        setShowForm(false);
        setEditingId(null);
        showToast(editingId ? "Kereta berhasil diperbarui" : "Kereta berhasil ditambahkan", true);
      } else showToast(d.error || "Gagal menyimpan", false);
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
      const res = await fetch(
        `${API}/api/admin/trains/${encodeURIComponent(deleteTarget.name)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await res.json();
      if (d.success) {
        await fetchTrains();
        showToast(`"${deleteTarget.name}" berhasil dihapus`, true);
      } else showToast(d.error || "Gagal menghapus", false);
    } catch {
      showToast("Koneksi gagal", false);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const addStationToRoute = (stationName: string) => {
    if (form.route_stations.find((s: any) => s.name === stationName)) return;
    setForm({
      ...form,
      route_stations: [
        ...form.route_stations,
        { name: stationName, notes: "intermediate" },
      ],
    });
    setStationSearch("");
  };

  const filteredSuggestions = (() => {
    const queryStr = stationSearch.trim().toLowerCase();
    if (!queryStr) return [];
    return stations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(queryStr) ||
          s.city.toLowerCase().includes(queryStr),
      )
      .slice(0, 10);
  })();

  if (showForm) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
            }}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight uppercase">
              {editingId ? "Edit Konfigurasi" : "Registrasi Armada"}
            </h2>
            <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-[0.2em]">
              {editingId ? `Updating ${editingId}` : "Menambahkan Armada Baru ke Sistem"}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 transition-colors"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-[#1d2d6a] dark:text-white font-bold text-lg flex items-center gap-2">
              <Settings size={20} className="text-[#ee6f1f]" /> Parameter Teknis & Gerbong
            </h3>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-lg">
              Mission Critical
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">
                  Identitas utama
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      Nama Kereta
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. ARGO WILIS"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      Train Code (KA)
                    </label>
                    <input
                      value={form.ka_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ka_number: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. 1A"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      Origin Station
                    </label>
                    <select
                      value={form.origin_station_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          origin_station_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                    >
                      <option value="" className="dark:bg-slate-900">Select Station</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id} className="dark:bg-slate-900">
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      Destination Station
                    </label>
                    <select
                      value={form.destination_station_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          destination_station_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] appearance-none transition-all"
                    >
                      <option value="" className="dark:bg-slate-900">Select Station</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id} className="dark:bg-slate-900">
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">
                  Route Stations (Intermediate)
                </h4>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <MapPin size={16} />
                  </div>
                  <input
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    placeholder="Search intermediate station..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-[#1d2d6a] dark:text-white font-bold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                  />
                  {filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[200px] overflow-y-auto transition-colors">
                      {filteredSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => addStationToRoute(s.name)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <div className="text-[#1d2d6a] dark:text-white font-semibold text-sm">
                              {s.name}
                            </div>
                            <div className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase">
                              {s.city}
                            </div>
                          </div>
                          <Plus
                            size={16}
                            className="text-slate-300 dark:text-slate-600 group-hover:text-[#ee6f1f]"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[100px] space-y-2 transition-colors">
                  {form.route_stations.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 py-6 italic text-xs">
                      No intermediate stations selected
                    </div>
                  ) : (
                    form.route_stations.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-xs transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              {idx + 1}
                            </div>
                            <span className="text-[#1d2d6a] dark:text-white font-semibold text-xs">
                              {s.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                const nr = [...form.route_stations];
                                if (idx > 0)
                                  [nr[idx], nr[idx - 1]] = [
                                    nr[idx - 1],
                                    nr[idx],
                                  ];
                                setForm({ ...form, route_stations: nr });
                              }}
                              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const nr = [...form.route_stations];
                                if (idx < nr.length - 1)
                                  [nr[idx], nr[idx + 1]] = [
                                    nr[idx + 1],
                                    nr[idx],
                                  ];
                                setForm({ ...form, route_stations: nr });
                              }}
                              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              onClick={() =>
                                setForm({
                                  ...form,
                                  route_stations: form.route_stations.filter(
                                    (_, i) => i !== idx,
                                  ),
                                })
                              }
                              className="p-1.5 text-red-300 dark:text-red-900 hover:text-red-500 dark:hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <input
                          value={s.notes || ""}
                          onChange={(e) => {
                            const nr = [...form.route_stations];
                            nr[idx].notes = e.target.value;
                            setForm({ ...form, route_stations: nr });
                          }}
                          placeholder="Station notes (e.g. Stop, Pass)"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[#1d2d6a] dark:text-white font-semibold text-[10px] focus:outline-none focus:border-[#ee6f1f] transition-all"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-[#1d2d6a] dark:text-white text-sm flex items-center gap-2 border-l-4 border-[#ee6f1f] pl-3 uppercase tracking-[0.1em]">
                  Operational & PIC
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      PIC Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                        size={14}
                      />
                      <input
                        value={form.pic_name}
                        onChange={(e) =>
                          setForm({ ...form, pic_name: e.target.value })
                        }
                        placeholder="Full Name"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      PIC Contact
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                        size={14}
                      />
                      <input
                        value={form.pic_contact}
                        onChange={(e) =>
                          setForm({ ...form, pic_contact: e.target.value })
                        }
                        placeholder="Phone Number"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      IP Address
                    </label>
                    <div className="relative">
                      <Wifi
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                        size={14}
                      />
                      <input
                        value={form.ip_address}
                        onChange={(e) =>
                          setForm({ ...form, ip_address: e.target.value })
                        }
                        placeholder="e.g. 192.168.1.10"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                      Notes
                    </label>
                    <input
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      placeholder="Operational Notes"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                    Media / Attachment (URL)
                  </label>
                  <div className="relative">
                    <Info
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                      size={14}
                    />
                    <input
                      value={form.media}
                      onChange={(e) =>
                        setForm({ ...form, media: e.target.value })
                      }
                      placeholder="URL Gambar/Media Kereta"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[#1d2d6a] dark:text-white font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-l-4 border-[#ee6f1f] pl-3">
                <h4 className="font-bold text-[#1d2d6a] dark:text-white text-xs uppercase tracking-[0.1em] flex items-center gap-2">
                  <Layout size={14} /> Daftar Gerbong
                </h4>
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      gerbongs: [
                        ...form.gerbongs,
                        {
                          nama_gerbong: "",
                          no_urut: form.gerbongs.length + 1,
                          media: "",
                          log_maintenance: "",
                          log_operasional: "",
                        },
                      ],
                    })
                  }
                  className="text-[10px] font-bold text-[#ee6f1f] hover:text-[#d45d15] flex items-center gap-1 uppercase tracking-[0.2em]"
                >
                  <Plus size={12} /> Tambah Gerbong
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {form.gerbongs.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center transition-colors">
                    <Layout
                      size={32}
                      className="text-slate-200 dark:text-slate-800 mx-auto mb-2"
                    />
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase">
                      Belum ada gerbong terdaftar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.gerbongs.map((g, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4 relative group transition-colors"
                      >
                        <button
                          onClick={() =>
                            setForm({
                              ...form,
                              gerbongs: form.gerbongs.filter(
                                (_, i) => i !== idx,
                              ),
                            })
                          }
                          className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex gap-4">
                          <div className="w-10 h-10 bg-[#1d2d6a] dark:bg-[#020617] text-white rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                                Nama Gerbong
                              </label>
                              <input
                                value={g.nama_gerbong}
                                onChange={(e) => {
                                  const ng = [...form.gerbongs];
                                  ng[idx].nama_gerbong =
                                    e.target.value.toUpperCase();
                                  setForm({ ...form, gerbongs: ng });
                                }}
                                placeholder="e.g. EKSEKUTIF 1"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[#1d2d6a] dark:text-white font-semibold text-xs transition-colors"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                                No. Urut
                              </label>
                              <input
                                type="number"
                                value={g.no_urut}
                                onChange={(e) => {
                                  const ng = [...form.gerbongs];
                                  ng[idx].no_urut = Number(e.target.value);
                                  setForm({ ...form, gerbongs: ng });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[#1d2d6a] dark:text-white font-semibold text-xs transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50 dark:border-slate-800 transition-colors">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                              <Settings size={10} /> Maintenance Log
                            </label>
                            <input
                              value={g.log_maintenance}
                              onChange={(e) => {
                                const ng = [...form.gerbongs];
                                ng[idx].log_maintenance = e.target.value;
                                setForm({ ...form, gerbongs: ng });
                              }}
                              placeholder="Status Terakhir"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[#1d2d6a] dark:text-white font-semibold text-[10px] transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                              <Activity size={10} /> Ops Log
                            </label>
                            <input
                              value={g.log_operasional}
                              onChange={(e) => {
                                const ng = [...form.gerbongs];
                                ng[idx].log_operasional = e.target.value;
                                setForm({ ...form, gerbongs: ng });
                              }}
                              placeholder="Riwayat Perjalanan"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[#1d2d6a] dark:text-white font-semibold text-[10px] transition-colors"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                            <Info size={10} /> MediaURL
                          </label>
                          <input
                            value={g.media}
                            onChange={(e) => {
                              const ng = [...form.gerbongs];
                              ng[idx].media = e.target.value;
                              setForm({ ...form, gerbongs: ng });
                            }}
                            placeholder="URL Gambar Gerbong"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[#1d2d6a] dark:text-white font-semibold text-[10px] transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="h-11 px-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl text-sm transition-all active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
              className="h-11 px-12 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg group"
            >
              {saving ? (
                "Menyimpan..."
              ) : (
                <>
                  <Save size={20} className="group-hover:scale-110 transition-transform" />
                  Simpan Konfigurasi Armada
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (selectedTrain) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedTrain(null)}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight uppercase">
              Detail Armada
            </h2>
            <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-[0.2em]">
              Viewing {selectedTrain.name} Statistics
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden"
        >
          <div className="p-8 flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#1d2d6a] dark:bg-slate-950 rounded-[2rem] flex items-center justify-center shadow-lg">
                    <Train size={40} className="text-white dark:text-[#ee6f1f]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-3xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-tight">
                        {selectedTrain.name}
                      </h3>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 uppercase">
                        {selectedTrain.ka_number || "NO CODE"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Fleet Operational Overview
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Inventory</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-[#1d2d6a] dark:text-white">{selectedTrain.gerbongs?.length || 0}</span>
                    <span className="text-xs font-bold text-slate-400 mb-1.5 uppercase">Gerbong</span>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">IP Address</p>
                  <div className="flex items-center gap-2 text-[#1d2d6a] dark:text-white font-mono font-bold text-lg">
                    <Wifi size={18} className="text-[#ee6f1f]" />
                    {selectedTrain.ip_address || "NOT SET"}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">PIC Status</p>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
                    <User size={16} className="text-blue-500" />
                    {selectedTrain.pic_name || "Unassigned"}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                <h4 className="text-[10px] font-bold text-[#ee6f1f] uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                  Route Configuration
                  <span className="text-[10px] font-bold text-slate-400">MISSION CRITICAL</span>
                </h4>
                {selectedTrain.route ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Origin</p>
                        <p className="text-xs font-bold text-[#1d2d6a] dark:text-white">{selectedTrain.route.stations?.[0]?.name || "N/A"}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                      <div className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Destination</p>
                        <p className="text-xs font-bold text-[#ee6f1f]">{selectedTrain.route.stations?.[selectedTrain.route.stations.length - 1]?.name || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {selectedTrain.route.stations?.map((s: any, idx: number) => (
                        <div key={idx} className="flex-shrink-0 px-3 py-1.5 bg-white/50 dark:bg-slate-950/50 rounded-lg border border-slate-200/50 dark:border-slate-800/50 text-[10px] font-bold text-slate-500">
                          {s.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-400 italic">
                    {selectedTrain.notes ? `"${selectedTrain.notes}"` : "No active route or maintenance logs currently assigned to this fleet."}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full lg:w-96 space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                  Coach Breakdown
                  <span className="text-[#ee6f1f]">LIVE</span>
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedTrain.gerbongs?.map((g: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-bold text-[#1d2d6a] dark:text-white">{g.nama_gerbong || g.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Online</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleEdit(selectedTrain)}
                className="w-full h-14 bg-[#ee6f1f] text-white rounded-2xl font-bold uppercase tracking-[0.1em] text-sm shadow-lg hover:bg-[#d45d15] transition-all flex items-center justify-center gap-2"
              >
                <Settings size={20} />
                Modify Fleet Configuration
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2 uppercase">
            Manajemen Kereta
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {trains.length} kereta terdaftar dalam sistem PIDS
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={fetchTrains}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 hover:text-[#1d2d6a] dark:hover:text-[#ee6f1f] hover:border-[#1d2d6a] dark:hover:border-slate-700 transition-all active:scale-95"
          >
            <RefreshCcw size={20} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-[#ee6f1f] text-white hover:bg-[#d45d15] font-bold text-sm transition-all active:scale-95 shadow-md"
          >
            <Plus size={18} />
            Tambah Kereta
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-bold">
            Memuat data...
          </div>
        ) : trains.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-600 space-y-4">
            <Train size={48} className="mx-auto opacity-20" />
            <p className="font-bold">Belum ada kereta terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
            {trains.map((train, i) => (
              <motion.div
                key={train.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedTrain(train)}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] gap-0 px-8 py-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group items-center cursor-pointer ${selectedTrain?.name === train.name ? "bg-slate-50 dark:bg-slate-800 ring-2 ring-inset ring-[#ee6f1f]" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Train size={22} className="text-[#1d2d6a] dark:text-[#ee6f1f]" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1d2d6a] dark:text-white font-semibold text-base">
                        {train.name}
                      </span>
                      {train.ka_number && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {train.ka_number}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-[0.2em] leading-tight">
                      Layanan PIDS Aktif
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono font-semibold text-sm">
                  <Wifi size={14} className="text-green-500 dark:text-green-400" />
                  {train.ip_address || "-"}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${train.status === "Active" ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-900/50" : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${train.status === "Active" ? "bg-green-500 dark:bg-green-400 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`}
                    />
                    {train.status?.toUpperCase() || "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  <Clock size={14} />
                  {train.last_update
                    ? new Date(train.last_update).toLocaleTimeString("id-ID")
                    : "-"}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(train)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(train)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                  >
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
