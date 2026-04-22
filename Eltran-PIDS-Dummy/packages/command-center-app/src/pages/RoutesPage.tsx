/** /command-center-app/src/pages/RoutesPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: RoutesPage */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import {
  MapPin,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  FileJson,
  MapPinned,
  Save,
  Navigation,
  Map as MapIcon,
  Train,
  Users,
  Clock,
  AlertCircle,
  ExternalLink,
  MoreVertical,
  LayoutGrid,
  List,
  Lock,
  Unlock,
  RefreshCw,
  Check,
  Layers,
  Minus,
  Moon,
  Target,
} from "lucide-react";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";
import maplibregl from "maplibre-gl";

interface Route {
  name: string;
  stations: any[];
  geojson?: string;
  status?: "ON TRACK" | "DELAYED";
  type?: "Intercity" | "Commuter" | "Lokal";
  train_number?: string;
  units?: number;
  distance?: number;
  occupancy?: number;
  scheduled_time?: string;
  delay?: string;
  is_active?: boolean;
  current_station_index?: number;
}

export default function RoutesPage({
  token,
  setHeader,
}: {
  token: string;
  setHeader: (node: React.ReactNode) => void;
}) {
  const [routes, setRoutes] = useState<Record<string, Route>>({});
  const [masterStations, setMasterStations] = useState<any[]>([]);
  const [dbStations, setDbStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [selectedStations, setSelectedStations] = useState<
    Array<{
      name: string;
      time: string;
      platform?: string;
      status?: string;
      type?: string;
    }>
  >([]);
  const [stationSearch, setStationSearch] = useState("");
  const [currentRouteGeojson, setCurrentRouteGeojson] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { toast, showToast, closeToast } = useToast();
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const stationsListRef = useRef<HTMLDivElement>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapIsReady, setMapIsReady] = useState(false);
  const lastZoomedRouteId = useRef<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
      if (mapRef.current) mapRef.current.resize();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMapFullscreen = useCallback(() => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch((err) => {
        showToast(`Gagal fullscreen: ${err.message}`, false);
      });
    } else {
      document.exitFullscreen();
    }
  }, [showToast]);
  const isNameMatch = (a: string | any, b: string | null | undefined) => {
    if (!a || !b) return false;
    const sA = typeof a === "string" ? a : a.name || "";
    const clean = (s: string) =>
      s
        .toString()
        .toUpperCase()
        .replace(/\(.*\)/g, "")
        .replace(/[^A-Z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const cA = clean(sA);
    const cB = clean(b);
    return cA === cB || cA.includes(cB) || cB.includes(cA);
  };

  const scrollToCurrentStation = useCallback(() => {
    const route = selectedRouteId ? routes[selectedRouteId] : null;
    if (!route || !stationsListRef.current) return;

    const currentIdx = route.current_station_index || 0;
    const stationElement = stationsListRef.current.querySelector(
      `[data-station-index="${currentIdx}"]`,
    );

    if (stationElement) {
      stationElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedRouteId, routes]);

  const fetchRoutes = useCallback(async () => {
    try {
      const [rResp, sResp] = await Promise.all([
        fetch(`${API}/api/admin/routes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/state`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const d = await rResp.json();
      const sData = await sResp.json();

      if (d.success && d.routes) {
        const keys = Object.keys(d.routes);
        const enhancedRoutes: Record<string, Route> = {};
        const currentStationName = sData.currentStation || "";
        const serviceName = sData.serviceName || "";

        if (currentStationName) {
          console.log(
            `[PIDS Sync] Received current station: "${currentStationName}"`,
          );
        }

        keys.forEach((key, idx) => {
          const r = d.routes[key];
          const stations =
            sData.serviceName === r.name &&
            sData.stations &&
            Array.isArray(sData.stations) &&
            sData.stations.length > 0
              ? sData.stations
              : r.stations || [];

          let foundIndex = r.current_station_index;
          if (currentStationName) {
            const mappedIndex = stations.findIndex((s: any) =>
              isNameMatch(s, currentStationName),
            );
            if (mappedIndex !== -1) {
              if (foundIndex !== mappedIndex) {
                console.log(
                  `[PIDS Sync] Index mismatch fix for ${key}: DB index ${foundIndex} -> Calculated ${mappedIndex}`,
                );
              }
              foundIndex = mappedIndex;
            }
          }

          const conventionalNum = (idx + 1).toString().padStart(2, "0");
          enhancedRoutes[key] = {
            ...r,
            id: key,
            name: r.name || key,
            stations: stations,
            is_active: r.is_active === true, // Strict boolean from backend
            current_station_index: foundIndex !== undefined ? foundIndex : 0,
            current_station:
              currentStationName && r.is_active
                ? currentStationName
                : r.current_station || "",
            status: r.status || "ON TRACK",
            train_number:
              r.train_number ||
              (serviceName === r.name ? sData.trainNumber : "") ||
              `KA ${conventionalNum}`,
          };
        });
        setRoutes(enhancedRoutes);
        if (!selectedRouteId && keys.length > 0) {
          setSelectedRouteId(keys[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedRouteId]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedRouteId && routes[selectedRouteId]) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToCurrentStation();
      }, 300);
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [selectedRouteId, routes, scrollToCurrentStation]);

  const fetchMasterStations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stations-master`);
      const d = await res.json();
      if (d.success) setMasterStations(d.data.features || []);
    } catch {}
  }, []);

  const fetchDbStations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setDbStations(d.stations || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      await Promise.all([
        fetchRoutes(),
        fetchMasterStations(),
        fetchDbStations(),
      ]);
      setLoading(false);
    };
    load();
  }, [fetchRoutes, fetchMasterStations, fetchDbStations]);
  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      if (mapRef.current) {
        console.log("[Map] Container unmounted, removing map");
        mapRef.current.remove();
        mapRef.current = null;
        setMapIsReady(false);
      }
      return;
    }
    if (mapRef.current) return;

    console.log("[Map] Container mounted, initializing...");
    try {
      const map = new maplibregl.Map({
        container: node,
        style: document.documentElement.classList.contains("dark") 
          ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [106.8272, -6.1751],
        zoom: 12,
        pitch: 45,
        attributionControl: false,
        trackResize: true,
        antialias: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        console.log("[Map] Style loaded");
        setMapIsReady(true);
        setTimeout(() => map.resize(), 50);
      });

      map.on("error", (e) => {
        console.error("[Map] Error:", e);
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
      console.error("[Map] Init crash:", e);
    }
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapIsReady || !selectedRouteId) return;

    const route = routes[selectedRouteId];
    if (!route?.geojson) return;

    try {
      const geojson = JSON.parse(route.geojson);
      if (map.getSource("route")) {
        (map.getSource("route") as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource("route", { type: "geojson", data: geojson });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ee6f1f", "line-width": 4 },
        });
      }
      if (markerRef.current) {
        markerRef.current.remove();
      }

      const currentIdx = route.current_station_index || 0;
      const currentStationFeature = geojson.features.find(
        (f: any) =>
          f.geometry.type === "Point" &&
          f.properties?.name?.toUpperCase() ===
            route.stations[currentIdx]?.name?.toUpperCase(),
      );

      if (currentStationFeature) {
        const el = document.createElement("div");
        el.className =
          "w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse relative z-50";
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(currentStationFeature.geometry.coordinates)
          .addTo(map);
      }
      const bounds = new maplibregl.LngLatBounds();
      let hasAny = false;
      geojson.features.forEach((f: any) => {
        if (f.geometry.type === "Point") {
          bounds.extend(f.geometry.coordinates);
          hasAny = true;
        } else if (f.geometry.type === "LineString") {
          f.geometry.coordinates.forEach((c: any) => {
            bounds.extend(c);
            hasAny = true;
          });
        }
      });

      if (hasAny && lastZoomedRouteId.current !== selectedRouteId) {
        map.fitBounds(bounds, { padding: 50, duration: 1500 });
        lastZoomedRouteId.current = selectedRouteId;
      }
    } catch (e) {
      console.error("[Map] Logic error:", e);
    }
  }, [selectedRouteId, routes, mapIsReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapIsReady) return;

    const actualStyle =
      mapStyle === "streets"
        ? (document.documentElement.classList.contains("dark") ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json")
        : "https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_key";

    map.setStyle(actualStyle);
  }, [mapStyle, mapIsReady]);

  useEffect(() => {
    const socket = io(API, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socket.on("connect", () => {
      console.log("[Socket.IO] Routes page connected");
      setConnected(true);
    });
    socket.on("disconnect", () => {
      setConnected(false);
    });
    socket.on("db:update", () => {
      console.log(
        "[Socket.IO] Database update received, re-fetching routes...",
      );
      fetchRoutes();
    });
    socket.on("state:update", () => {
      console.log("[Socket.IO] State update received, re-fetching routes...");
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
    setNewRouteName("");
    setSelectedStations([]);
    setCurrentRouteGeojson(null);
    setIsEditing(false);
    setStationSearch("");
  }, []);

  const handleSaveRoute = useCallback(
    async (autoName?: string, autoStations?: any[]) => {
      const nameToSave = autoName || newRouteName;
      const stationsToSave = autoStations || selectedStations;

      if (!nameToSave.trim() || stationsToSave.length < 2) {
        showToast("Nama rute dan minimal 2 stasiun diperlukan", false);
        return;
      }

      const existing = routes[nameToSave];
      if (existing?.is_active) {
        showToast(
          "Rute ini sedang berjalan dan tidak dapat dimodifikasi!",
          false,
        );
        return;
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
            name: nameToSave.trim(),
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
      routes,
      token,
      fetchRoutes,
      resetForm,
      isEditing,
      showToast,
    ],
  );

  const handleEditRoute = useCallback(
    (route: any) => {
      if (route.is_active) {
        showToast("Akses Ditolak: Rute sedang aktif!", false);
        return;
      }
      setNewRouteName(route.name);
      let geojsonObj: any = null;
      try {
        if (route.geojson) geojsonObj = JSON.parse(route.geojson);
      } catch (e) {
        console.error("Parse GeoJSON error:", e);
      }
      setCurrentRouteGeojson(geojsonObj);

      const stations = (route.stations || []).map((s: any) => {
        const sName = typeof s === "string" ? s : s.name;
        let sTime = typeof s === "string" ? "" : s.time || "";

        if (geojsonObj?.features) {
          const f = geojsonObj.features.find(
            (f: any) =>
              f.properties?.name?.toUpperCase() === sName.toUpperCase(),
          );
          if (f?.properties) {
            const geoTime =
              f.properties.schedule_ka68 ||
              f.properties.schedule_ka67 ||
              f.properties.time;
            if (geoTime) sTime = geoTime;
          }
        }
        return { name: sName, time: sTime };
      });

      setSelectedStations(stations);
      setIsEditing(true);
      setShowForm(true);
    },
    [showToast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (routes[deleteTarget.id]?.is_active) {
      showToast("Gagal: Rute sedang aktif!", false);
      setDeleteTarget(null);
      return;
    }
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
  }, [deleteTarget, routes, token, fetchRoutes, showToast]);

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
              const time =
                f.properties.schedule_ka68 ||
                f.properties.schedule_ka67 ||
                f.properties.time ||
                "";
              return { name, time };
            });

          if (extractedStations.length === 0) {
            showToast("Tidak ada stasiun ditemukan dalam GeoJSON", false);
            return;
          }

          const mappedStations = extractedStations.map((ext: any) => {
            const match = dbStations.find(
              (s) => s.name?.toUpperCase() === ext.name,
            );
            return match
              ? { name: match.name, time: ext.time }
              : { name: ext.name, time: ext.time };
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
      const sName = String(
        typeof station === "object" ? station.name || "" : station,
      ).trim();
      if (
        !sName ||
        selectedStations.find(
          (s) => String(s.name).toUpperCase() === sName.toUpperCase(),
        )
      )
        return;

      let foundTime = "";
      if (currentRouteGeojson?.features) {
        const f = currentRouteGeojson.features.find(
          (feat: any) =>
            String(feat.properties?.name || "").toUpperCase() ===
            sName.toUpperCase(),
        );
        if (f?.properties)
          foundTime =
            f.properties.schedule_ka68 ||
            f.properties.schedule_ka67 ||
            f.properties.time ||
            "";
      }
      if (!foundTime && masterStations?.length > 0) {
        const f = masterStations.find(
          (feat: any) =>
            String(feat.properties?.name || "").toUpperCase() ===
            sName.toUpperCase(),
        );
        if (f?.properties)
          foundTime =
            f.properties.schedule_ka68 ||
            f.properties.schedule_ka67 ||
            f.properties.time ||
            "";
      }
      setSelectedStations([
        ...selectedStations,
        { name: sName, time: foundTime, platform: "1", status: "On Track" },
      ]);
      setStationSearch("");
    },
    [selectedStations, currentRouteGeojson, masterStations],
  );

  const routeList = Object.values(routes)
    .filter((r) => {
      if (activeCategory === "All Routes") return true;
      const rType =
        r.type ||
        (r.name.toLowerCase().includes("malabar") ? "Intercity" : "Intercity"); // Default to Intercity if missing
      return rType === activeCategory;
    })
    .filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.train_number?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const totalPages = Math.ceil(routeList.length / itemsPerPage);
  const paginatedRoutes = routeList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const selectedRoute = selectedRouteId ? routes[selectedRouteId] : null;

  useEffect(() => {
    setHeader(
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-6">
          {loading && (
            <div className="flex items-center gap-2 text-[#ee6f1f] animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#1d2d6a] dark:text-white outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all w-96 shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              if (isEditing) setShowForm(false);
              else setShowForm(true);
              if (!showForm) resetForm();
            }}
            className="flex items-center gap-2 h-10 px-6 bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95"
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
    routeList.length,
    resetForm,
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
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors">
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Hapus Rute`}
        message={`Hapus rute ${deleteTarget?.id}? Aksi ini bersifat permanen.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={saving}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[120%] flex flex-col gap-4 overflow-y-auto p-10 pr-6 custom-scrollbar pb-20 border-r border-slate-200 dark:border-slate-800">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2 shrink-0 w-fit">
            {["All Routes", "Intercity", "Commuter", "Lokal"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-10 px-6 rounded-lg font-semibold text-xs transition-all ${activeCategory === cat ? "bg-[#1d2d6a] dark:bg-slate-950 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {loading ? (
              <div className="p-20 text-center text-slate-400 font-semibold animate-pulse">
                Memuat rute...
              </div>
            ) : (
              routeList.map((route, i) => (
                <motion.div
                  key={route.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedRouteId(route.name)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${
                    selectedRouteId === route.name
                      ? "bg-white dark:bg-slate-800 border-[#1d2d6a] shadow-lg"
                      : "bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${
                          route.status === "ON TRACK"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30"
                        }`}
                      >
                        {route.status}
                      </span>
                      {route.is_active && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-md text-[9px] font-semibold uppercase tracking-wider">
                          <Lock size={10} /> Running
                        </span>
                      )}
                      <span className="text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                        {route.train_number}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-[#1d2d6a] dark:text-white font-semibold text-sm flex items-center gap-1.5 justify-end">
                        <Clock size={14} className="text-[#ee6f1f]" />
                        {route.scheduled_time}{" "}
                        {route.status === "DELAYED" ? "Delayed" : ""}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500 text-[9px] font-bold mt-0.5">
                        Delay: {route.delay}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-[#1d2d6a] dark:text-white tracking-tight truncate">
                      {route.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[11px] mt-0.5 truncate">
                      {route.stations?.[0]?.name || "Origin"}
                      <ChevronRight size={12} className="shrink-0" />
                      {route.stations?.[route.stations.length - 1]?.name ||
                        "Destination"}
                    </div>
                  </div>

                  <div className="flex border-t border-slate-100 dark:border-slate-700 pt-4 mt-1 flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        Trip Progress
                      </span>
                      {(() => {
                        const totalStations = route.stations?.length || 0;
                        const currentIdx = route.current_station_index || 0;
                        const progress =
                          totalStations > 1
                            ? Math.round(
                                (currentIdx / (totalStations - 1)) * 100,
                              )
                            : 0;
                        return (
                          <span className="text-[10px] font-bold text-[#1d2d6a] dark:text-white">
                            {progress}%
                          </span>
                        );
                      })()}
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      {(() => {
                        const totalStations = route.stations?.length || 0;
                        const currentIdx = route.current_station_index || 0;
                        const progress =
                          totalStations > 1
                            ? Math.round(
                                (currentIdx / (totalStations - 1)) * 100,
                              )
                            : 0;
                        return (
                          <div
                            className={`h-full transition-all duration-1000 rounded-full ${
                              route.status === "DELAYED"
                                ? "bg-amber-500"
                                : "bg-[#ee6f1f]"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Train size={10} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                          {route.units}U
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <MapPinned size={10} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                          {route.distance}K
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Users size={10} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                          {route.occupancy}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {route.is_active ? (
                      <div
                        title="Rute sedang berjalan (Terkunci)"
                        className="p-1.5 bg-slate-50 dark:bg-slate-700 text-slate-300 dark:text-slate-600 rounded-md cursor-not-allowed"
                      >
                        <Lock size={12} />
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </motion.div>
              ))
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
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === i + 1
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

        <div className="w-[65%] flex flex-col bg-white dark:bg-slate-900 overflow-hidden h-full relative">
          {selectedRoute ? (
            <>
              <div
                ref={mapWrapperRef}
                className={`relative shrink-0 overflow-hidden transition-all duration-500 ease-in-out ${isMapFullscreen ? "fixed inset-0 z-[1000]" : "h-44 border-b border-slate-100 dark:border-slate-800"}`}
              >
                <div
                  ref={mapContainerRef}
                  className="absolute inset-0 bg-slate-100 dark:bg-slate-950"
                />

                {!isMapFullscreen && (
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none z-10" />
                )}

                {!isMapFullscreen && (
                  <div className="absolute bottom-5 left-6 pointer-events-none z-20">
                    <h4 className="text-lg font-semibold text-white">
                      {selectedRoute.name}{" "}
                      <span className="opacity-50 text-sm ml-1">
                        ({selectedRoute.train_number})
                      </span>
                    </h4>
                  </div>
                )}

                {isMapFullscreen ? (
                  <div className="absolute top-8 right-8 flex flex-col gap-3 z-[1100]">
                    <button
                      onClick={toggleMapFullscreen}
                      className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl text-[#1d2d6a] dark:text-white hover:bg-white dark:hover:bg-slate-800 shadow-2xl transition-all active:scale-90 border border-white/20 dark:border-slate-800"
                      title="Close Fullscreen"
                    >
                      <X size={24} strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden">
                      <button
                        onClick={() => mapRef.current?.zoomIn()}
                        className="p-4 text-[#1d2d6a] dark:text-white hover:bg-orange-50 hover:text-[#ee6f1f] transition-all active:scale-90 border-b border-slate-100 dark:border-slate-800"
                        title="Zoom In"
                      >
                        <Plus size={20} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => mapRef.current?.zoomOut()}
                        className="p-4 text-[#1d2d6a] dark:text-white hover:bg-orange-50 hover:text-[#ee6f1f] transition-all active:scale-90 border-b border-slate-100 dark:border-slate-800"
                        title="Zoom Out"
                      >
                        <Minus size={20} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() =>
                          setMapStyle((prev) =>
                            prev === "streets" ? "satellite" : "streets",
                          )
                        }
                        className={`p-4 transition-all active:scale-90 border-b border-slate-100 dark:border-slate-800 ${mapStyle === "satellite" ? "text-[#ee6f1f] bg-orange-50" : "text-[#1d2d6a] dark:text-white hover:bg-orange-50 hover:text-[#ee6f1f]"}`}
                        title="Toggle Map Style"
                      >
                        <Moon size={20} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => {
                          const map = mapRef.current;
                          if (!map || !selectedRoute?.geojson) return;
                          try {
                            const geojson =
                              typeof selectedRoute.geojson === "string"
                                ? JSON.parse(selectedRoute.geojson)
                                : selectedRoute.geojson;
                            const features =
                              geojson.features ||
                              (geojson.type === "FeatureCollection"
                                ? []
                                : [geojson]);
                            const lineString = features.find(
                              (f: any) =>
                                f.geometry?.type === "LineString" ||
                                f.type === "LineString",
                            );
                            const coords =
                              lineString?.geometry?.coordinates ||
                              lineString?.coordinates;
                            if (coords && coords.length > 0) {
                              const bounds = coords.reduce(
                                (acc: any, coord: any) => {
                                  return acc.extend(coord);
                                },
                                new maplibregl.LngLatBounds(
                                  coords[0],
                                  coords[0],
                                ),
                              );
                              map.fitBounds(bounds, {
                                padding: 80,
                                duration: 2000,
                              });
                            }
                          } catch (e) {
                            console.error("Fit bounds failed:", e);
                          }
                        }}
                        className="p-4 text-[#1d2d6a] dark:text-white hover:bg-orange-50 hover:text-[#ee6f1f] transition-all active:scale-90"
                        title="Pusatkan Peta"
                      >
                        <Target size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={toggleMapFullscreen}
                    title="Fullscreen Map"
                    className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 transition-all z-20 pointer-events-auto"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}

                {isMapFullscreen && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute bottom-10 left-10 right-10 p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 z-[1100] flex items-center justify-between gap-10"
                  >
                    <div className="flex items-center gap-5 border-r border-slate-100 dark:border-slate-800 pr-10 shrink-0">
                      <div className="p-4 bg-orange-50 dark:bg-slate-800 text-[#ee6f1f] rounded-3xl shadow-inner">
                        <Train size={32} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black text-[#1d2d6a] dark:text-white tracking-tight">
                            {selectedRoute.name}
                          </h3>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${selectedRoute.status === "ON TRACK" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                          >
                            {selectedRoute.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Train No.{" "}
                            <span className="text-[#1d2d6a] dark:text-white ml-1">
                              {selectedRoute.train_number}
                            </span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Type{" "}
                            <span className="text-[#1d2d6a] dark:text-white ml-1">
                              {(selectedRoute.type as any) ===
                              "FeatureCollection"
                                ? "Intercity"
                                : selectedRoute.type || "Intercity"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-end px-1">
                        <div className="flex items-center gap-4">
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Departed from
                            </div>
                            <div className="text-sm font-bold text-[#1d2d6a] dark:text-white">
                              {(() => {
                                const curr =
                                  selectedRoute.current_station_index || 0;
                                if (curr === 0)
                                  return (
                                    selectedRoute.stations[0]?.name || "Origin"
                                  );
                                return (
                                  selectedRoute.stations[curr - 1]?.name ||
                                  "Origin"
                                );
                              })()}
                            </div>
                          </div>
                          <ChevronRight
                            className="text-slate-300 dark:text-slate-700 mt-4"
                            size={16}
                          />
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-black text-[#ee6f1f] uppercase tracking-[0.2em]">
                              Arriving Next
                            </div>
                            <div className="text-base font-black text-[#1d2d6a] dark:text-white flex items-center gap-2">
                              {selectedRoute.stations[
                                selectedRoute.current_station_index || 0
                              ]?.name || "Unknown"}
                              <div className="w-1.5 h-1.5 rounded-full bg-[#ee6f1f] animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                            Trip Progress
                          </span>
                          <span className="text-lg font-black text-[#1d2d6a] dark:text-white">
                            {(() => {
                              const total = selectedRoute.stations?.length || 0;
                              const curr =
                                selectedRoute.current_station_index || 0;
                              const progress =
                                total > 1
                                  ? Math.round(
                                      (Math.max(0, curr) / (total - 1)) * 100,
                                    )
                                  : 0;
                              return Math.min(100, progress);
                            })()}
                            %
                          </span>
                        </div>
                      </div>

                      <div className="relative pt-2">
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(() => {
                                const total =
                                  selectedRoute.stations?.length || 0;
                                const curr =
                                  selectedRoute.current_station_index || 0;
                                const progress =
                                  total > 1
                                    ? Math.round(
                                        (Math.max(0, curr) / (total - 1)) * 100,
                                      )
                                    : 0;
                                return Math.min(100, progress);
                              })()}%`,
                            }}
                            className="h-full bg-gradient-to-r from-[#ee6f1f] to-[#fbc02d] rounded-full shadow-[0_0_15px_rgba(238,111,31,0.4)] relative"
                          >
                            <div className="absolute top-0 bottom-0 right-0 w-4 bg-white/20 skew-x-[20deg] translate-x-2" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 pl-10 border-l border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Speed
                          </span>
                          <div className="text-sm font-black text-[#1d2d6a] dark:text-white flex items-baseline gap-1">
                            {selectedRoute.status === "ON TRACK" ? "74" : "0"}
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              km/h
                            </span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Est. Arrival
                          </span>
                          <div className="text-sm font-black text-[#ee6f1f]">
                            14:45
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Suhu
                          </span>
                          <div className="flex items-center gap-1.5 text-sm font-black text-[#1d2d6a] dark:text-white">
                            28°C
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Distance
                          </span>
                          <div className="text-sm font-black text-[#1d2d6a] dark:text-white">
                            {selectedRoute.distance}{" "}
                            <span className="text-[10px] text-slate-400 ml-0.5">
                              KM
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex-1 flex flex-col pt-8 pl-8 pr-0 pb-0 overflow-hidden">
                <div className="flex items-center justify-between mb-6 pr-8">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Route Schedule
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedRoute.is_active && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-[10px] font-semibold border border-amber-100 dark:border-amber-900">
                        <AlertCircle size={12} /> Modifikasi Terkunci
                      </span>
                    )}
                    <button
                      onClick={scrollToCurrentStation}
                      className="px-2.5 py-1 bg-[#ee6f1f] text-white text-[9px] font-bold rounded-md shadow-sm hover:bg-[#d45d15] transition-all uppercase tracking-tighter flex items-center gap-1 active:scale-95"
                    >
                      <Navigation size={10} /> Cek Posisi
                    </button>
                  </div>
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

                        const currentIdx =
                          selectedRoute.current_station_index || 0;
                        const isPassed = idx < currentIdx;
                        const isCurrent = idx === currentIdx;

                        const sName = typeof s === "string" ? s : s.name;
                        const sTime =
                          typeof s === "string" ? "--:--" : s.time || "--:--";
                        const sPlatform =
                          typeof s === "string" ? "1" : s.platform || "1";

                        return (
                          <div
                            key={idx}
                            data-station-index={idx}
                            className="relative pb-5 last:pb-2"
                          >
                            {!isLast && (
                              <div
                                className={`absolute left-[31px] top-[40px] bottom-[-20px] w-0.5 z-0 ${
                                  isPassed ? "bg-slate-200 dark:bg-slate-800" : "bg-slate-100 dark:bg-slate-800"
                                }`}
                              />
                            )}

                            <div
                              className={`relative z-10 flex items-center p-5 bg-white rounded-[24px] border transition-all duration-300 shadow-sm ${
                                isCurrent
                                  ? "border-orange-200 shadow-orange-500/10 ring-1 ring-orange-200/50"
                                  : "border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              <div className="mr-5 flex flex-col items-center justify-center shrink-0">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 ${
                                    isCurrent
                                      ? "bg-[#ee6f1f] border-[#ee6f1f] shadow-[0_0_12px_rgba(238,111,31,0.4)] scale-110"
                                      : isPassed
                                        ? "bg-white border-slate-300"
                                        : "bg-white border-slate-200"
                                  }`}
                                >
                                  {isPassed && (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
                                        isCurrent
                                          ? "text-[#ee6f1f]"
                                          : isPassed
                                            ? "text-slate-300"
                                            : "text-slate-400"
                                      }`}
                                    >
                                      {isFirst
                                        ? "Origin"
                                        : isLast
                                          ? "Terminus"
                                          : "Station"}
                                    </span>
                                    {isCurrent && (
                                      <div className="w-1 h-1 rounded-full bg-[#ee6f1f] animate-pulse" />
                                    )}
                                  </div>
                                  <h5
                                    className={`text-base font-bold leading-tight truncate ${isPassed ? "text-slate-400" : "text-[#1d2d6a]"}`}
                                  >
                                    {sName}
                                  </h5>

                                  {(isPassed || isCurrent) && (
                                    <div className="flex justify-start mt-2">
                                      <span
                                        className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded ${
                                          isPassed
                                            ? "bg-slate-50 text-slate-300"
                                            : "bg-orange-50 text-[#ee6f1f]"
                                        }`}
                                      >
                                        {isPassed
                                          ? "Departed"
                                          : "Arriving Next"}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col items-end shrink-0 ml-4">
                                  <div
                                    className={`text-sm font-bold tracking-tight ${isCurrent ? "text-[#ee6f1f]" : isPassed ? "text-slate-400" : "text-[#1d2d6a]"}`}
                                  >
                                    {sTime}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Layers
                                      size={10}
                                      className="text-slate-300"
                                    />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">
                                      PF {sPlatform}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  {selectedRoute.stations &&
                    selectedRoute.stations.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-100 shrink-0 pr-8 pb-8">
                        {(() => {
                          const totalStations = selectedRoute.stations.length;
                          const currentIdx =
                            selectedRoute.current_station_index || 0;
                          const progressPercent =
                            totalStations > 1
                              ? Math.round(
                                  (currentIdx / (totalStations - 1)) * 100,
                                )
                              : 0;
                          return (
                            <>
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Trip Progress
                                </div>
                                <div className="text-xs font-bold text-[#1d2d6a]">
                                  {progressPercent}% Completed
                                </div>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#ee6f1f] to-[#fcd34d] rounded-full transition-all duration-1000"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Navigation size={32} className="text-slate-200" />
              </div>
              <h4 className="text-base font-semibold text-[#1d2d6a]">
                Select a Route
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-1 max-w-[200px]">
                Click any route card on the left to monitor live status
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
                  <p className="text-slate-400 font-medium text-[11px] uppercase tracking-widest mt-0.5">
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
                      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider ml-1">
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
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider ml-1">
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
                          className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-[#1d2d6a] font-medium focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/5 transition-all outline-none shadow-sm"
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
                                  onClick={() => addStationToRoute(s.name)}
                                  className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                >
                                  <div>
                                    <div className="text-[#1d2d6a] font-semibold text-xs">
                                      {s.name}
                                    </div>
                                    <div className="text-slate-400 text-[9px] font-medium uppercase">
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
                    <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <LayoutGrid size={12} className="text-[#ee6f1f]" /> Stops
                      Sequence ({selectedStations.length})
                    </h4>
                    <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedStations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200">
                          <MapPin size={32} className="mb-2 opacity-50" />
                          <p className="text-[10px] font-bold">
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
                              <input
                                type="time"
                                value={s.time}
                                onChange={(e) => {
                                  const n = [...selectedStations];
                                  n[idx].time = e.target.value;
                                  setSelectedStations(n);
                                }}
                                className="mt-0.5 text-[#ee6f1f] text-[10px] font-semibold bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                              />
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
                  className="h-11 px-6 font-semibold text-sm text-slate-400 hover:text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveRoute()}
                  disabled={saving}
                  className="h-11 px-10 bg-[#1d2d6a] hover:bg-[#16224f] disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
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

      <ToastNotification toast={toast} onClose={closeToast} />
    </div>
  );
}
