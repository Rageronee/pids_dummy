import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Clock,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  Save,
  Navigation,
  Map as MapIcon,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { usePidsData } from "../hooks/usePidsData";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";


interface Route {
  id?: number;
  name: string;
  stations: Array<{ id: string; name: string; media?: string }>;
  geojson?: string;
  train_name?: string;
  train_class?: string;
  direction?: string;
}

const getTrainNumbersForService = (serviceName: string) => {
  const name = serviceName.toUpperCase();
  if (name.includes("MALABAR")) {
    return [
      { num: "67", dir: "GO" },
      { num: "68", dir: "BACK" },
      { num: "69", dir: "GO" },
      { num: "70", dir: "BACK" }
    ];
  } else if (name.includes("PROGO")) {
    return [
      { num: "257B", dir: "GO" },
      { num: "258B", dir: "BACK" }
    ];
  } else if (name.includes("PARAHYANGAN") || name.includes("ARGO")) {
    return [
      { num: "39", dir: "GO" },
      { num: "40", dir: "BACK" }
    ];
  } else {
    return [
      { num: "GO", dir: "GO" },
      { num: "BACK", dir: "BACK" }
    ];
  }
};

const getStationTime = (s: any, trainNum: string | null) => {
  if (!s) return "";
  if (typeof s === "string") return "";

  let rawTime = "";
  if (trainNum) {
    const cleanNum = trainNum.toLowerCase();
    const trainKeys = [`schedule_ka${cleanNum}`, `schedule_${cleanNum}`];
    for (const key of trainKeys) {
      if (s[key] && typeof s[key] === "string" && s[key].trim() !== "" && s[key].trim() !== "-") {
        rawTime = s[key].trim();
        break;
      }
    }
  }

  if (!rawTime) {
    const fallbackKeys = ["arrival_time", "arrival", "departure_time", "departure"];
    for (const key of fallbackKeys) {
      if (s[key] && typeof s[key] === "string" && s[key].trim() !== "" && s[key].trim() !== "-") {
        rawTime = s[key].trim();
        break;
      }
    }
  }

  if (rawTime) {
    const parts = rawTime.split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return rawTime;
  }

  return "";
};

export default function RoutesPage({
  token,
  setHeader,
  setPage,
}: {
  token: string;
  setHeader: (node: React.ReactNode) => void;
  setPage: (page: string) => void;
}) {
  const [routes, setRoutes] = useState<Record<string, Route>>({});
  const [dbStations, setDbStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState("GO");
  const [selectedKaNum, setSelectedKaNum] = useState<string | null>(null);

  const activeKaNum = useMemo(() => {
    if (!selectedRouteId) return null;
    const kas = getTrainNumbersForService(selectedRouteId);
    const matched = kas.find(k => k.num === selectedKaNum && k.dir === selectedDirection);
    if (matched) return matched.num;
    const firstMatchingDir = kas.find(k => k.dir === selectedDirection);
    return firstMatchingDir ? firstMatchingDir.num : (kas[0]?.num || null);
  }, [selectedRouteId, selectedDirection, selectedKaNum]);

  const [formDirection, setFormDirection] = useState("GO");
  const [searchQuery, setSearchQuery] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [selectedStations, setSelectedStations] = useState<
    Array<{
      id: string;
      name: string;
    }>
  >([]);
  const [stationSearch, setStationSearch] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { toast, showToast, closeToast } = useToast();
  const stationsListRef = useRef<HTMLDivElement>(null);
  const { data } = usePidsData();
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  interface UnifiedRoute {
    train_name: string;
    train_class?: string;
    directions: Record<string, Route>;
  }

  const unifiedRoutes = useMemo(() => {
    return Object.values(routes).reduce<Record<string, UnifiedRoute>>((acc, r) => {
      const baseName = r.train_name || r.name.replace(/_(GO|BACK)$/i, "");
      if (!acc[baseName]) {
        acc[baseName] = {
          train_name: baseName,
          train_class: r.train_class || "Intercity",
          directions: {},
        };
      }
      const dirKey = r.direction || (r.name.endsWith("_BACK") ? "BACK" : "GO");
      acc[baseName].directions[dirKey] = r;
      return acc;
    }, {});
  }, [routes]);

  useEffect(() => {
    setHasAutoScrolled(false);
  }, [selectedRouteId]);

  const handleRefocus = useCallback(() => {
    if (stationsListRef.current) {
      const activeEl = stationsListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  useEffect(() => {
    if (selectedRouteId && !hasAutoScrolled && stationsListRef.current) {
      setTimeout(() => {
        handleRefocus();
        setHasAutoScrolled(true);
      }, 500);
    }
  }, [selectedRouteId, hasAutoScrolled, handleRefocus]);

  useEffect(() => {
    if (selectedRouteId && unifiedRoutes[selectedRouteId]) {
      const dirs = Object.keys(unifiedRoutes[selectedRouteId].directions);
      if (dirs.length > 0 && !dirs.includes(selectedDirection)) {
        setSelectedDirection(dirs[0]);
      }
    }
  }, [selectedRouteId, unifiedRoutes, selectedDirection]);

  const fetchRoutes = useCallback(async () => {
    try {
      const rResp = await fetch(`${API}/api/admin/routes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const d = await rResp.json();

      if (d.success && d.routes) {
        const keys = Object.keys(d.routes);
        const enhancedRoutes: Record<string, Route> = {};

        keys.forEach((key) => {
          const r = d.routes[key];

          enhancedRoutes[key] = {
            ...r,
            id: key,
            name: r.name || key,
            stations: r.stations || [],
          };
        });
        setRoutes(enhancedRoutes);
        if (!selectedRouteId && keys.length > 0) {
          const firstKey = keys[0];
          const firstRoute = enhancedRoutes[firstKey];
          const firstBaseName = firstRoute.train_name || firstRoute.name.replace(/_(GO|BACK)$/i, "");
          setSelectedRouteId(firstBaseName);
        }
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedRouteId]);


  const fetchDbStations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/stations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setDbStations(d.stations || []);
    } catch { }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      await Promise.all([
        fetchRoutes(),
        fetchDbStations(),
      ]);
      setLoading(false);
    };
    load();
  }, [fetchRoutes, fetchDbStations]);




  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const resetForm = useCallback(() => {
    setNewRouteName("");
    setSelectedStations([]);
    setIsEditing(false);
    setStationSearch("");
  }, []);

  const handleSaveRoute = useCallback(
    async (autoName?: string, autoStations?: any[]) => {
      const baseName = autoName || newRouteName;
      const stationsToSave = autoStations || selectedStations;

      if (!baseName.trim() || stationsToSave.length < 2) {
        showToast("Nama rute dan minimal 2 stasiun diperlukan", false);
        return;
      }

      let finalName = baseName.trim().toUpperCase();
      if (!finalName.endsWith("_GO") && !finalName.endsWith("_BACK")) {
        finalName = `${finalName}_${formDirection}`;
      }

      setSaving(true);
      try {
        const res = await fetch(`${API}/api/admin/routes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: finalName,
            stations: stationsToSave,
          }),
        });
        const d = await res.json();
        if (d.success) {
          await fetchRoutes();
          setShowForm(false);
          resetForm();
          showToast(
            autoName
              ? "Rute berhasil diimpor & disimpan"
              : isEditing
                ? "Rute berhasil diperbarui"
                : "Rute berhasil disimpan",
            true,
          );
        } else showToast(d.error || "Gagal menyimpan", false);
      } catch {
        showToast("Koneksi gagal", false);
      } finally {
        setSaving(false);
      }
    },
    [
      newRouteName,
      selectedStations,
      formDirection,
      token,
      fetchRoutes,
      resetForm,
      isEditing,
      showToast,
    ],
  );

  const handleEditRoute = useCallback(
    (route: any) => {
      const baseName = route.train_name || route.name.replace(/_(GO|BACK)$/i, "");
      setNewRouteName(baseName);

      const dir = route.direction || (route.name.endsWith("_BACK") ? "BACK" : "GO");
      setFormDirection(dir);

      const stations = (route.stations || []).map((s: any) => {
        return {
          id: s.id || s.name,
          name: s.name,
        };
      });

      setSelectedStations(stations);
      setIsEditing(true);
      setShowForm(true);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/admin/routes/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await res.json();
      if (d.success) {
        await fetchRoutes();
        showToast(`Rute dihapus`, true);
      } else showToast(d.error || "Gagal menghapus", false);
    } catch {
      showToast("Koneksi gagal", false);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, token, fetchRoutes, showToast]);

  const handleImportGeoJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".geojson,application/json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const geojson = JSON.parse(event.target?.result as string);
          let routeName = "";
          const routeFeature = geojson.features.find(
            (f: any) => f.geometry.type === "LineString",
          );
          if (routeFeature && routeFeature.properties?.name) {
            routeName = routeFeature.properties.name
              .replace("Malabar: ", "")
              .replace("Argo Wilis: ", "")
              .trim();
          }

          const extractedStations = geojson.features
            .filter(
              (f: any) => f.geometry.type === "Point" && f.properties?.name,
            )
            .map((f: any) => {
              const name = f.properties.name.toUpperCase();
              return { name };
            });

          if (extractedStations.length === 0) {
            showToast("Tidak ada stasiun ditemukan dalam GeoJSON", false);
            return;
          }

          const mappedStations = extractedStations.map((ext: any) => {
            const match = dbStations.find(
              (s) => s.name?.toUpperCase() === ext.name || s.id === ext.name
            );
            return {
              id: match?.id || ext.name,
              name: match?.name || ext.name,
            };
          });

          resetForm();
          setNewRouteName(routeName);
          setSelectedStations(mappedStations);
          showToast(`Mengimpor rute ${routeName}...`, true);
          setTimeout(() => handleSaveRoute(routeName, mappedStations), 500);
        } catch (err) {
          showToast("File GeoJSON tidak valid", false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dbStations, resetForm, handleSaveRoute, showToast]);

  const addStationToRoute = useCallback(
    (station: any) => {
      if (!station?.id) return;
      if (selectedStations.find((s) => s.id === station.id)) return;

      setSelectedStations([
        ...selectedStations,
        {
          id: station.id,
          name: station.name,
        },
      ]);
      setStationSearch("");
    },
    [selectedStations],
  );

  const unifiedRouteList = Object.values(unifiedRoutes)
    .filter((ur: any) => {
      if (activeCategory === "All Routes") return true;
      return ur.train_class === activeCategory;
    })
    .filter((ur) =>
      ur.train_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalPages = Math.ceil(unifiedRouteList.length / itemsPerPage);
  const paginatedRoutes = unifiedRouteList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const selectedUnifiedRoute = selectedRouteId ? unifiedRoutes[selectedRouteId] : null;
  const selectedRoute = selectedUnifiedRoute ? selectedUnifiedRoute.directions[selectedDirection] || Object.values(selectedUnifiedRoute.directions)[0] : null;

  useEffect(() => {
    setHeader(
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-6">
          {loading && (
            <div className="flex items-center gap-2 text-[#ee6f1f] animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Syncing...
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-6">
          <div className="relative group">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-[#ee6f1f] transition-colors"
              size={14}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari rute atau nomor KA..."
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#1d2d6a] dark:text-white outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all w-96 shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              if (isEditing) setShowForm(false);
              else setShowForm(true);
              if (!showForm) resetForm();
            }}
            className="flex items-center gap-2 h-10 px-6 bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95"
          >
            <Plus size={14} strokeWidth={3} />
            Tambah Rute
          </button>
        </div>
      </div>,
    );
    return () => setHeader(null);
  }, [
    searchQuery,
    isEditing,
    showForm,
    setHeader,
    unifiedRouteList.length,
    resetForm,
    loading,
  ]);
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const filteredSuggestions =
    stationSearch.length > 2
      ? dbStations.filter((s) =>
        s.name.toLowerCase().includes(stationSearch.toLowerCase()),
      )
      : [];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Hapus Rute`}
        message={`Hapus rute ${deleteTarget?.id}? Aksi ini bersifat permanen.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={saving}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[800px] shrink-0 flex flex-col gap-4 overflow-y-auto p-10 pt-4 pr-6 custom-scrollbar pb-20 border-r border-slate-200 dark:border-slate-800">
            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2 shrink-0 w-fit">
              {["All Routes", "Intercity", "Commuter", "Lokal"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`h-10 px-6 rounded-lg font-bold text-xs transition-all ${activeCategory === cat ? "bg-[#ee6f1f] dark:bg-ee6f1f text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {loading ? (
                <div className="p-20 text-center text-slate-400 font-bold animate-pulse">
                  Memuat rute...
                </div>
              ) : (
                paginatedRoutes.map((ur, i) => {
                  const activeDir = selectedDirection || "GO";
                  const route = ur.directions[activeDir] || Object.values(ur.directions)[0];
                  const stopsCount = route?.stations?.length || 0;

                  return (
                    <motion.div
                      key={ur.train_name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedRouteId(ur.train_name)}
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${selectedRouteId === ur.train_name
                        ? "bg-white dark:bg-slate-800 border-slate-200 hover:border-[#ee6f1f] dark:border-slate-700 dark:hover:border-[#ee6f1f] shadow-lg"
                        : "bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 shadow-sm"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em]">
                            {ur.train_class || "Intercity"} Route
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-0.5">
                            {stopsCount} Stops
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-[#1d2d6a] dark:text-white tracking-tight truncate">
                            {ur.train_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[11px] mt-0.5 truncate">
                            {(ur.directions.GO || Object.values(ur.directions)[0])?.stations?.[0]?.name || "Origin"}
                            <ChevronRight size={12} className="shrink-0" />
                            {(ur.directions.GO || Object.values(ur.directions)[0])?.stations?.[(ur.directions.GO || Object.values(ur.directions)[0]).stations.length - 1]?.name || "Destination"}
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0 bg-slate-50 dark:bg-slate-900/50 p-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-inner">
                          {getTrainNumbersForService(ur.train_name).map((ka) => {
                            const isKaSelected = selectedRouteId === ur.train_name && activeKaNum === ka.num;
                            return (
                              <button
                                key={ka.num}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRouteId(ur.train_name);
                                  setSelectedDirection(ka.dir);
                                  setSelectedKaNum(ka.num);
                                }}
                                className={`h-6 px-2 rounded-md font-bold text-[9px] transition-all tracking-wider ${isKaSelected ? "bg-[#ee6f1f] text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                              >
                                KA {ka.num}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoute(route);
                          }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-[#1d2d6a] dark:text-slate-400 dark:hover:text-white rounded-md transition-all"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: route.name });
                          }}
                          className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-300 hover:text-red-500 rounded-md transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-[#1d2d6a] disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                        ? "bg-[#1d2d6a] dark:bg-slate-700 text-white shadow-md"
                        : "bg-white dark:bg-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-[#1d2d6a] disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden h-full relative">
            {selectedRoute ? (
              <>


                <div className="flex-1 flex flex-col pt-6 pl-8 pr-0 pb-0 overflow-hidden">
                  <div className="mb-6 pr-8">
                    <div className="flex items-center justify-between mb-3.5">
                      <div>
                        <h3 className="text-lg font-bold text-[#1d2d6a] dark:text-white">
                          {selectedUnifiedRoute?.train_name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                          {selectedUnifiedRoute?.train_class || "Intercity"} • {selectedRoute.stations?.length || 0} Stops
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleRefocus}
                          className="px-2.5 py-1 bg-orange-100 text-[#ee6f1f] dark:bg-orange-900/30 dark:text-orange-400 text-[11px] font-bold rounded-md shadow-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all uppercase tracking-tighter flex items-center gap-1 active:scale-95"
                        >
                          <Navigation size={12} /> Cek Lokasi
                        </button>
                        <button
                          onClick={() => setPage("dashboard")}
                          className="px-2.5 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[11px] font-bold rounded-md shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all uppercase tracking-tighter flex items-center gap-1 active:scale-95"
                        >
                          <MapIcon size={12} /> Lihat Peta
                        </button>
                      </div>
                    </div>

                    {selectedUnifiedRoute && (
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
                        {getTrainNumbersForService(selectedUnifiedRoute.train_name).map((ka) => (
                          <button
                            key={ka.num}
                            onClick={() => {
                              setSelectedDirection(ka.dir);
                              setSelectedKaNum(ka.num);
                            }}
                            className={`h-7 px-3 rounded-md font-bold text-[10px] transition-all uppercase tracking-wider ${activeKaNum === ka.num ? "bg-[#ee6f1f] text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                          >
                            KA {ka.num}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden relative flex flex-col">
                    <div
                      ref={stationsListRef}
                      className="flex-1 overflow-y-auto pr-6 thin-scrollbar relative"
                    >
                      {(selectedRoute.stations || []).map(
                        (s: any, idx: number) => {
                          const stations = selectedRoute.stations || [];
                          const isFirst = idx === 0;
                          const isLast = idx === stations.length - 1;
                          const sName = typeof s === "string" ? s : s.name;
                          const currentStationName = (data?.currentStation || "").toUpperCase();

                          // Handle if currentStation is JSON string
                          let finalCurrentName = currentStationName;
                          if (currentStationName.startsWith("{")) {
                            try {
                              const parsed = JSON.parse(currentStationName);
                              finalCurrentName = (parsed.name || "").toUpperCase();
                            } catch (e) { }
                          }

                          const isCurrent = sName.toUpperCase() === finalCurrentName;

                          const stationsArr = selectedRoute.stations || [];
                          const currentIndex = stationsArr.findIndex((st: any) => {
                            const name = (typeof st === "string" ? st : st.name).toUpperCase();
                            return name === finalCurrentName;
                          });

                          const isPassed = currentIndex !== -1 && idx < currentIndex;

                          return (
                            <div
                              key={idx}
                              data-station-index={idx}
                              data-active={isCurrent}
                              className={`relative pb-5 last:pb-2 transition-opacity duration-500 ${isPassed ? "opacity-40 grayscale-[0.5]" : "opacity-100"}`}
                            >
                              {!isLast && (
                                <div
                                  className={`absolute left-[31px] top-[40px] bottom-[-20px] w-0.5 z-0 ${isPassed ? "bg-orange-200 dark:bg-orange-900/30" : "bg-slate-100 dark:bg-slate-800"}`}
                                />
                              )}

                              <div
                                className={`relative z-10 flex items-center p-5 rounded-[24px] border transition-all duration-300 shadow-sm ${isCurrent ? "bg-orange-50 dark:bg-orange-900/20 border-[#ee6f1f] shadow-orange-100 dark:shadow-none" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"}`}
                              >
                                <div className="mr-5 flex flex-col items-center justify-center shrink-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isCurrent ? "bg-[#ee6f1f] text-white" : "bg-[#1d2d6a]/5 dark:bg-slate-700 text-[#1d2d6a] dark:text-slate-300"}`}>
                                    {String(idx + 1).padStart(2, "0")}
                                  </div>
                                </div>

                                <div className="flex-1 flex justify-between items-center min-w-0 gap-4">
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400"
                                      >
                                        {isFirst
                                          ? "Origin"
                                          : isLast
                                            ? "Terminus"
                                            : `Checkpoint ${idx}`}
                                      </span>
                                    </div>
                                    <h5
                                      className="text-base font-semibold leading-tight truncate text-[#1d2d6a] dark:text-white flex items-center gap-2"
                                    >
                                      <MapPin size={14} className="text-[#ee6f1f] shrink-0" />
                                      {sName}
                                    </h5>
                                  </div>

                                  {getStationTime(s, activeKaNum) && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
                                      <Clock size={12} className="text-[#ee6f1f]" />
                                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {getStationTime(s, activeKaNum)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>


                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Navigation size={32} className="text-slate-200" />
                </div>
                <h4 className="text-base font-bold text-[#1d2d6a]">
                  Select a Route
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-1 max-w-[200px]">
                  Click any route card on the left to view station sequence
                </p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 md:p-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowForm(false)}
                className="absolute inset-0 bg-[#0a122a]/90 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-[#1d2d6a] tracking-tight">
                      {isEditing ? "Modify Route" : "Create Route"}
                    </h2>
                    <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-0.5">
                      Route Configuration
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-[0.1em] ml-1">
                          Route Designation
                        </label>
                        <input
                          value={newRouteName}
                          onChange={(e) =>
                            setNewRouteName(e.target.value.toUpperCase())
                          }
                          placeholder="e.g. ARGO WILIS"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1d2d6a] font-semibold focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-[0.1em] ml-1">
                          Direction
                        </label>
                        <select
                          value={formDirection}
                          onChange={(e) => setFormDirection(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1d2d6a] font-semibold focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm"
                        >
                          <option value="GO">GO (Pergi)</option>
                          <option value="BACK">BACK (Pulang)</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-[0.1em] ml-1">
                          Search & Add Stations
                        </label>
                        <div className="relative">
                          <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                            size={16}
                          />
                          <input
                            value={stationSearch}
                            onChange={(e) => setStationSearch(e.target.value)}
                            placeholder="Type station name..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-[#1d2d6a] font-semibold focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm"
                          />
                          <AnimatePresence>
                            {filteredSuggestions.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute z-[70] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-[240px] overflow-y-auto custom-scrollbar"
                              >
                                {filteredSuggestions.map((s, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => addStationToRoute(s)}
                                    className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                  >
                                    <div>
                                      <div className="text-[#1d2d6a] font-semibold text-xs">
                                        {s.name}
                                      </div>
                                      <div className="text-slate-400 text-[10px] font-semibold uppercase">
                                        {s.city}
                                      </div>
                                    </div>
                                    <Plus
                                      size={14}
                                      className="text-slate-200 group-hover:text-[#ee6f1f] transition-colors"
                                    />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[300px]">
                      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <LayoutGrid size={12} className="text-[#ee6f1f]" /> Stops
                        Sequence ({selectedStations.length})
                      </h4>
                      <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedStations.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-200">
                            <MapPin size={32} className="mb-2 opacity-50" />
                            <p className="text-[10px] font-semibold">
                              Timeline is empty
                            </p>
                          </div>
                        ) : (
                          selectedStations.map((s, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 group transition-all hover:bg-slate-100/50"
                            >
                              <div className="w-6 h-6 rounded-md bg-[#1d2d6a] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-[#1d2d6a] truncate">
                                  {s.name}
                                </div>

                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    const n = [...selectedStations];
                                    [n[idx], n[idx - 1]] = [n[idx - 1], n[idx]];
                                    setSelectedStations(n);
                                  }}
                                  disabled={idx === 0}
                                  className="p-1 hover:bg-white text-slate-300 disabled:opacity-0 rounded-md transition-all"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    const n = [...selectedStations];
                                    [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
                                    setSelectedStations(n);
                                  }}
                                  disabled={idx === selectedStations.length - 1}
                                  className="p-1 hover:bg-white text-slate-300 disabled:opacity-0 rounded-md transition-all"
                                >
                                  <ArrowDown size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    const n = [...selectedStations];
                                    n.splice(idx, 1);
                                    setSelectedStations(n);
                                  }}
                                  className="p-1 hover:bg-red-100 text-red-300 hover:text-red-500 rounded-md transition-all"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-5 border-t border-slate-100 flex justify-end items-center gap-3 bg-white shrink-0">
                  <button
                    onClick={() => setShowForm(false)}
                    className="h-11 px-6 font-bold text-sm text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveRoute()}
                    disabled={saving}
                    className="h-11 px-10 bg-[#1d2d6a] hover:bg-[#16224f] disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
                  >
                    {saving ? (
                      "Processing..."
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
      <ToastNotification toast={toast} onClose={closeToast} />
    </div>
  );
}
