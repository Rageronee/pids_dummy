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
  const [trainsets, setTrainsets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedTrainset, setSelectedTrainset] = useState<any | null>(null);
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
    if (selectedTrainset) {
      if (!selectedTrainset.gerbongs) {
        fetch(`${API}/api/admin/trainsets/${encodeURIComponent(selectedTrainset.name)}/gerbongs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              setSelectedTrainset((prev: any) => ({ ...prev, gerbongs: d.coaches }));
            }
          });
      }
    }
  }, [selectedTrainset?.name, token]);

  const [form, setForm] = useState({
    name: "",
    ka_number: "",
    ip_address: "",
    status: "Active",
    notes: "",
    pic_name: "",
    pic_contact: "",
    media: "",
    gerbongs: [] as any[],
  });
  const [stationSearch, setStationSearch] = useState("");

  const fetchTrainsets = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/trainsets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setTrainsets(d.trainsets || []);
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
    } catch { }
  }, [token]);

  useEffect(() => {
    fetchTrainsets();
    fetchStations();
  }, [fetchTrainsets, fetchStations]);

  const handleEdit = (set: any) => {
    setEditingId(set.id);
    setForm({
      name: set.name,
      ka_number: "", // Not used in physical trainset
      ip_address: "", // Move to individual coaches if needed, or keep for master
      status: "Active",
      notes: set.description || "",
      pic_name: "",
      pic_contact: "",
      media: "",
      gerbongs: set.gerbongs || [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/trainsets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId,
          name: form.name.trim(),
          description: form.notes,
        }),
      });
      const d = await res.json();
      if (d.success) {
        const setId = d.trainset.id;

        if (form.gerbongs.length > 0) {
          await fetch(`${API}/api/admin/trainsets/${setId}/gerbongs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              coaches: form.gerbongs.map((g, idx) => ({
                id: g.id || undefined,
                name: g.nama_gerbong || g.name,
                sequence_number: idx + 1,
              })),
            }),
          });
        }
        await fetchTrainsets();
        setForm({
          name: "",
          ka_number: "",
          ip_address: "",
          status: "Active",
          notes: "",
          pic_name: "",
          pic_contact: "",
          media: "",
          gerbongs: [],
        });
        setShowForm(false);
        setEditingId(null);
        showToast(editingId ? "Rangkaian berhasil diperbarui" : "Rangkaian berhasil ditambahkan", true);
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
      const res = await fetch(`${API}/api/admin/trainsets/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        await fetchTrainsets();
        showToast(`"${deleteTarget.name}" berhasil dihapus`, true);
      } else showToast(d.error || "Gagal menghapus", false);
    } catch {
      showToast("Koneksi gagal", false);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

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
              {editingId ? "Edit Konfigurasi" : "Registrasi Rangkaian"}
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

  if (selectedTrainset) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedTrainset(null)}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#1d2d6a] dark:hover:text-white transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight uppercase">
              Detail Rangkaian
            </h2>
            <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-[0.2em]">
              Viewing {selectedTrainset.name} Statistics
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
                        {selectedTrainset.name}
                      </h3>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 uppercase">
                        {selectedTrainset.ka_number || "NO CODE"}
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
                    <span className="text-3xl font-bold text-[#1d2d6a] dark:text-white">{selectedTrainset.gerbongs?.length || 0}</span>
                    <span className="text-xs font-bold text-slate-400 mb-1.5 uppercase">Gerbong</span>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">IP Address</p>
                  <div className="flex items-center gap-2 text-[#1d2d6a] dark:text-white font-mono font-bold text-lg">
                    <Wifi size={18} className="text-[#ee6f1f]" />
                    {selectedTrainset.ip_address || "NOT SET"}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">PIC Status</p>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
                    <User size={16} className="text-blue-500" />
                    {selectedTrainset.pic_name || "Unassigned"}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Notes / Maintenance Logs
                </h4>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-400 italic">
                  {selectedTrainset.notes ? `"${selectedTrainset.notes}"` : "No notes or maintenance logs currently assigned to this fleet."}
                </p>
              </div>
            </div>

            <div className="w-full lg:w-96 space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                  Coach Breakdown
                  <span className="text-[#ee6f1f]">LIVE</span>
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedTrainset.gerbongs?.map((g: any, idx: number) => (
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
                onClick={() => handleEdit(selectedTrainset)}
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
            Manajemen Rangkaian (Trainsets)
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {trainsets.length} kereta terdaftar dalam sistem PIDS
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={fetchTrainsets}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 hover:text-[#1d2d6a] dark:hover:text-[#ee6f1f] hover:border-[#1d2d6a] dark:hover:border-slate-700 transition-all active:scale-95"
          >
            <RefreshCcw size={20} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-[#ee6f1f] text-white hover:bg-[#d45d15] font-bold text-sm transition-all active:scale-95 shadow-md"
          >
            <Plus size={18} />
            Tambah Rangkaian
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-bold">
            Memuat data...
          </div>
        ) : trainsets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-600 space-y-4">
            <Train size={48} className="mx-auto opacity-20" />
            <p className="font-bold">Belum ada kereta terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
            {trainsets.map((set: any, i: number) => (
              <motion.div
                key={set.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedTrainset(set)}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_80px] gap-0 px-8 py-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group items-center cursor-pointer ${selectedTrainset?.name === set.name ? "bg-slate-50 dark:bg-slate-800 ring-2 ring-inset ring-[#ee6f1f]" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Train size={22} className="text-[#1d2d6a] dark:text-[#ee6f1f]" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1d2d6a] dark:text-white font-semibold text-base">
                        {set.name}
                      </span>
                      {set.ka_number && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {set.ka_number}
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
                  {set.ip_address || "-"}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${set.status === "Active" ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-900/50" : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${set.status === "Active" ? "bg-green-500 dark:bg-green-400 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`}
                    />
                    {set.status?.toUpperCase() || "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  <Clock size={14} />
                  {set.last_update
                    ? new Date(set.last_update).toLocaleTimeString("id-ID")
                    : "-"}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(set)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(set)}
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
