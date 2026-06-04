import { useState, useEffect, useRef, useMemo } from "react";
import { usePidsData } from "./hooks/usePidsData";
import {
  LayoutDashboard,
  Clock,
  AlertCircle,
  MapPin,
  Video,
  Database,
  Train,
  Cctv,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Monitor,
  Maximize,
  Settings,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginScreen, API as SHARED_API } from "@eltran/shared";
import { MasterConsolePanel } from "./components/MasterConsolePanel";
import MapComponent from "./components/MapComponent";
import SettingsPage from "./pages/SettingsPage";
import TVMonitor from "./components/TVMonitor";

import type { AuthUser, LogEntry } from "@eltran/pids-core";

import "maplibre-gl/dist/maplibre-gl.css";

const API_URL = SHARED_API;

// --- Monitor CCTV Component ---
const MonitorCCTV = ({ data: _data }: { data: any }) => {
  const numGerbong = _data?.coachCount || 4;
  const sampleImages = [
    "https://img.harianjogja.com/posts/2024/03/26/1169359/kereta-api-ekonomi-generasi-baru.jpg",
    "https://image.fortuneidn.com/post/20250821/upload_e179f189ddfbf16b0482c14a7295b474_2940c5af-a990-4232-ad05-4c52dd5d0431.jpg",
    "https://awsimages.detik.net.id/visual/2022/12/25/kereta-panoramic-kini-bisa-dicoba-oleh-masyarakat-umum-setelah-soft-launching-yang-dilakukan-pt-kereta-api-indonesia-pada-24-d-2_169.jpeg?w=1200",
    "https://asset.kompas.com/crops/RRMwhqmwIwdwA3xhcoXZY6wdHjE=/0x0:999x666/1200x800/data/photo/2022/07/15/62d0ce5c7389a.jpeg",
  ];

  const cameras = Array.from({ length: numGerbong }, (_, i) => ({
    id: `CAM-${String(i + 1).padStart(2, "0")}`,
    location: `GERBONG ${String(i + 1).padStart(2, "0")} - INTERIOR`,
    url: sampleImages[i % sampleImages.length],
    gerbongIndex: i + 1,
  }));

  const [currentCamIndex, setCurrentCamIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(
      () => setCurrentCamIndex((prev) => (prev + 1) % cameras.length),
      5000,
    );
    return () => clearInterval(interval);
  }, [isAutoPlay, cameras.length]);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevCam = () => {
    setCurrentCamIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
    setIsAutoPlay(false);
  };

  const handleNextCam = () => {
    setCurrentCamIndex((prev) => (prev + 1) % cameras.length);
    setIsAutoPlay(false);
  };

  const handleSelectGerbong = (idx: number) => {
    setCurrentCamIndex(idx);
    setIsAutoPlay(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[3rem] shadow-2xl border border-white/10 bg-[#0f172a] group"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCamIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cameras[currentCamIndex].url})` }}
        >
          <div className="absolute inset-0 bg-[#0a0f1e]/10 mix-blend-overlay" />
        </motion.div>
      </AnimatePresence>
      <motion.div
        animate={{ y: ["0%", "100%", "0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-white/10 h-px z-10 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      />
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
        <div className="px-4 py-2 flex flex-col items-start drop-shadow-2xl">
          <div className="text-3xl font-bold text-white font-mono tracking-tighter tabular-nums leading-none mb-1 [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
            {currentTime.toLocaleTimeString("id-ID", { hour12: false })}
          </div>
          <div className="text-[10px] font-semibold text-white/90 [text-shadow:0_1px_5px_rgba(0,0,0,0.8)]">
            {currentTime.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Top Right Fullscreen Button */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={toggleFullscreen}
            className="bg-[#0f172a]/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110 shadow-lg"
            title="Fullscreen"
          >
            <Maximize size={24} />
          </button>
        </div>
      </div>
      {/* Main Bottom Left Overlay Text (Extreme Corner) */}
      <div className="absolute bottom-8 left-10 z-20 pointer-events-none">
        <div className="text-white/40 font-mono text-[40px] font-bold leading-none select-none drop-shadow-2xl">
          {cameras[currentCamIndex].id}
        </div>
      </div>

      {/* Manual Navigation Overlay (appears on hover) */}
      <div className="absolute inset-y-0 left-0 w-32 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handlePrevCam}
          className="bg-[#0f172a]/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110"
        >
          <ChevronLeft size={36} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleNextCam}
          className="bg-[#0f172a]/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110"
        >
          <ChevronRight size={36} />
        </button>
      </div>

      <div
        className="absolute bottom-8 left-8 right-8 flex justify-end items-end z-40"
        ref={dropdownRef}
      >
        <div className="relative">
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-full right-0 mb-4 w-[400px] bg-[#0f172a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 p-2"
              >
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-4 py-2 border-b border-white/5 mb-1">
                  Pilih Lokasi Kamera
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {cameras.map((cam, idx) => (
                    <motion.button
                      key={cam.id}
                      onClick={() => {
                        handleSelectGerbong(idx);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${currentCamIndex === idx
                        ? "bg-[#ee6f1f] text-white shadow-[0_0_15px_rgba(238,111,31,0.3)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg ${currentCamIndex === idx ? "bg-white/20" : "bg-white/5"}`}
                      >
                        <Cctv size={14} />
                      </div>
                      <span className="text-sm font-semibold truncate">
                        {cam.location}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border shadow-xl flex items-center gap-4 transition-all duration-300 ${isDropdownOpen
              ? "border-[#ee6f1f] ring-2 ring-[#ee6f1f]/20"
              : "border-white/10 hover:border-[#ee6f1f]/40"
              }`}
          >
            <div
              className={`p-2.5 rounded-xl transition-colors ${isDropdownOpen ? "bg-[#ee6f1f] text-white" : "bg-[#ee6f1f]/20 text-[#ee6f1f]"}`}
            >
              <Cctv size={20} />
            </div>

            <div className="flex items-center gap-6 min-w-[300px]">
              <span className="text-xl font-semibold text-white truncate px-2">
                {cameras[currentCamIndex].location}
              </span>
              <motion.div
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                className="text-[#ee6f1f]/60"
              >
                <ChevronDown size={22} />
              </motion.div>
            </div>
          </motion.button>
        </div>
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
    </div>
  );
};

const MonitorGPS = ({ route, data: appData }: { route: any; data: any }) => {
  const [gerbongData, setGerbongData] = useState<any[]>([]);
  const [selectedKereta] = useState<number>(1);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!selectedKereta) return;
    const fetchGerbong = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gps/gerbong/${selectedKereta}`);
        const d = await res.json();
        if (d.success) setGerbongData(d.gerbong);
      } catch { }
    };
    fetchGerbong();
    const interval = setInterval(fetchGerbong, 10000);
    return () => clearInterval(interval);
  }, [selectedKereta]);

  const trainMarkers = useMemo(() => {
    const serviceName = (appData?.serviceName || route?.name || "Service").replace(/-G\d+$/i, "").replace(/\s+G\d+$/i, "").trim();
    const trainNum = appData?.trainNumber || "";
    const cleanTrainNum = trainNum.replace(/\s*(Coach|Gerbong|Kereta)\s*\d+/gi, "").replace(/-G\d+$/i, "").trim();

    // 1. If we have per-gerbong data, use it
    if (gerbongData.length > 0) {
      return gerbongData.map((g) => ({
        id: `G-${g.gerbong_id}`,
        name: `${serviceName} ${cleanTrainNum}`,
        location: [g.longitude, g.latitude] as [number, number],
        heading: (g as any).heading || 0,
        status: "Normal",
        speed: g.speed || 0,
        eta: appData?.eta || "--:--"
      }));
    }

    // 2. Fallback to active service simGps if available
    const isValidGps = appData?.simGps &&
      appData.simGps.lng !== 0 &&
      appData.simGps.lat !== 0 &&
      !isNaN(Number(appData.simGps.lng)) &&
      !isNaN(Number(appData.simGps.lat));

    if (isValidGps) {
      return [{
        id: `ARMADA-LIVE`,
        name: `${serviceName} ${cleanTrainNum}`,
        location: [Number(appData.simGps.lng), Number(appData.simGps.lat)] as [number, number],
        heading: appData.simGps.heading || 0,
        status: appData.status || "Beroperasi",
        speed: appData.speed || 0,
        eta: appData.eta || "--:--"
      }];
    }

    return [];
  }, [gerbongData, route, appData]);

  const routeLine = useMemo(() => {
    if (!route || !route.features) {
      if (appData?.activeRoute?.geojson) {
        try {
          const gj = typeof appData.activeRoute.geojson === "string" ? JSON.parse(appData.activeRoute.geojson) : appData.activeRoute.geojson;
          const lineFeature = gj.features?.find((f: any) => f.geometry?.type === "LineString");
          return lineFeature?.geometry?.coordinates;
        } catch { return undefined; }
      }
      return undefined;
    }
    const lineFeature = route.features.find((f: any) => f.geometry?.type === "LineString");
    return lineFeature?.geometry?.coordinates;
  }, [route, appData?.activeRoute]);

  const hasInitialFocusedRef = useRef<boolean>(false);
  const lastRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (trainMarkers.length > 0 && !focusLocation && !hasInitialFocusedRef.current) {
      setFocusLocation(trainMarkers[0].location);
      hasInitialFocusedRef.current = true;
    }
  }, [trainMarkers, focusLocation]);

  useEffect(() => {
    const routeKey = `${route?.name || ''}_${appData?.trainNumber || ''}`;
    // We just track the key, but don't reset focusLocation anymore to prevent auto-scroll jumps
    lastRouteKeyRef.current = routeKey;
  }, [route?.name, appData?.trainNumber]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white dark:bg-[#0f172a]/40 backdrop-blur-sm rounded-[2.5rem] border border-slate-200 dark:border-[#1e293b]/50 shadow-sm overflow-hidden flex-1 relative group min-h-[450px]">
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-[#1e293b] shadow-lg flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-[#1d2d6a] dark:text-white uppercase tracking-wide">
              Peta Lokasi
            </span>
          </div>
        </div>

        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
          <MapComponent
            trains={trainMarkers}
            routeLine={routeLine}
            focusCoord={focusLocation}
            onTrainClick={(_, loc) => setFocusLocation(loc)}
          />
        </div>

        <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
          <div className="bg-[#1d2d6a] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 transition-all hover:scale-105 pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest">
                ACT Units
              </span>
              <span className="text-sm font-bold">
                {gerbongData.length} Rangkaian
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest">
                Service
              </span>
              <span className="text-sm font-bold truncate max-w-[120px]">
                {(route?.name || "-").replace(/-G\d+$/i, "").replace(/\s+G\d+$/i, "").trim()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Log Viewer Component ---
const LogViewer = ({ token }: { token: string }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    LOGIN: {
      label: "Login",
      color: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30",
    },
    LOGIN_FAILED: {
      label: "Login Gagal",
      color: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30",
    },
    LOGOUT: {
      label: "Logout",
      color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-[#1e293b]",
    },
    STATE_UPDATE: {
      label: "Update State",
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30",
    },
    DISPLAY_MODE: {
      label: "Mode Display",
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30",
    },
    LED_CONFIG: {
      label: "LED Config",
      color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30",
    },
    ADMIN_CRUD: {
      label: "Admin CRUD",
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30",
    },
    SYSTEM: {
      label: "Sistem",
      color: "text-slate-500 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50",
    },
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered =
    filter === "ALL" ? logs : logs.filter((l) => l.action === filter);
  const filterOptions = [
    "ALL",
    "LOGIN",
    "LOGIN_FAILED",
    "STATE_UPDATE",
    "LED_CONFIG",
    "ADMIN_CRUD",
    "SYSTEM",
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white dark:bg-[#0f172a]/40 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-[#1e293b]/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white tracking-tight flex items-center gap-3">
            <ScrollText className="text-[#ee6f1f]" />
            Log Aktivitas Sistem
          </h2>
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border transition-all ${filter === opt ? "bg-[#1d2d6a] dark:bg-[#0a0f1e] text-white border-[#1d2d6a] dark:border-[#1e293b]" : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
              >
                {opt === "ALL" ? "Semua" : ACTION_LABELS[opt]?.label || opt}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-normal">
            Memuat log...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-normal">
            Belum ada log yang tercatat.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1e293b]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[#1d2d6a] dark:text-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="p-4 border-b border-slate-200 dark:border-[#1e293b]">Waktu</th>
                  <th className="p-4 border-b border-slate-200 dark:border-[#1e293b]">Aksi</th>
                  <th className="p-4 border-b border-slate-200 dark:border-[#1e293b]">Pengguna</th>
                  <th className="p-4 border-b border-slate-200 dark:border-[#1e293b]">Role</th>
                  <th className="p-4 border-b border-slate-200 dark:border-[#1e293b]">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.slice(0, 100).map((log) => {
                  const meta = ACTION_LABELS[log.action] || {
                    label: log.action,
                    color: "text-slate-600 bg-slate-50 border-slate-200",
                  };
                  const dt = new Date(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div>
                          {dt.toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {dt.toLocaleTimeString("id-ID", { hour12: false })}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[#1d2d6a] dark:text-slate-200">
                        {log.user}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs font-normal">
                        {log.role}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs max-w-xs">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="p-4 text-center text-slate-400 text-xs font-normal border-t border-slate-100">
                Menampilkan 100 dari {filtered.length} entri log. Gunakan
                Command Center untuk melihat semua.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [isTvFullscreen, setIsTvFullscreen] = useState(false);
  const [ACTTab, setACTTab] = useState("pids");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>("");

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("master_theme");
    return saved ? saved === "dark" : false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("master_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const { data, sendData } = usePidsData();
  const ACTTrainName = (data.serviceName || "Belum Dikonfigurasi").replace(/-G\d+$/i, "").replace(/\s+G\d+$/i, "").trim();
  const ACTTrainNumber = (data.trainNumber || "-").replace(/\s*(Coach|Gerbong)\s*\d+/gi, "").replace(/-G\d+$/i, "").trim();
  const ACTRoute = data.activeRoute || {
    name: data.serviceName || "-",
    stations: data.stations || [],
    path: "",
    nodes: [],
  };

  // Check persisted session on mount
  useEffect(() => {
    const token = sessionStorage.getItem("pids_token");
    const userStr = sessionStorage.getItem("pids_user");
    if (token && userStr) {
      try {
        // Verify token with server
        fetch(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              setAuthToken(token);
              setAuthUser(JSON.parse(userStr));
            } else {
              sessionStorage.removeItem("pids_token");
              sessionStorage.removeItem("pids_user");
            }
          })
          .catch(() => {
            // Server not yet up, trust local session
            setAuthToken(token);
            setAuthUser(JSON.parse(userStr));
          });
      } catch { }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (user: AuthUser, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch { }
    sessionStorage.removeItem("pids_token");
    sessionStorage.removeItem("pids_user");
    setAuthUser(null);
    setAuthToken("");
    setACTTab("pids");
  };

  // Auth guard
  if (!authUser) {
    return <LoginScreen onLogin={handleLogin} isDark={isDark} />;
  }

  const NAV_ITEMS = [
    { id: "pids", icon: LayoutDashboard, label: "PIDS" },
    { id: "stampformasi", icon: Database, label: "STAMPFORMASI" },
    { id: "tv", icon: Video, label: "CCTV" },
    { id: "gps", icon: MapPin, label: "GPS MAP" },
    { id: "tvmonitor", icon: Monitor, label: "TV MONITOR" },
    { id: "logs", icon: ScrollText, label: "Log Aktivitas" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className={`flex h-screen w-full bg-[#f8fafc] dark:bg-[#0a0f1e] text-slate-900 dark:text-slate-200 font-sans overflow-hidden ${isDark ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside className="w-80 bg-[#1d2d6a] dark:bg-[#0f172a] border-r border-blue-900 dark:border-slate-800 flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] z-20 shrink-0">

        <div className="p-8 pb-10 flex justify-between items-start">
          <div>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
              alt="KAI Logo"
              className="h-10 w-auto mb-6 brightness-0 invert"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
              PIDS Master
            </h1>
            <p className="font-bold text-white/40 mt-1">
              Kereta Makan
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setACTTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold text-base ${ACTTab === item.id ? "bg-[#ee6f1f] text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)]" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon size={22} strokeWidth={2.5} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-xs border border-white/5 active:scale-95 group"
          >
            <LogOut
              size={18}
              className="text-white/20 group-hover:text-red-400 transition-colors"
            />
            <span>LOGOUT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-[#1e293b] flex items-center justify-between px-6 lg:px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10 shrink-0">

          <div className="flex items-center gap-5">
            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              {(() => {
                const Icon =
                  NAV_ITEMS.find((n) => n.id === ACTTab)?.icon || Train;
                return (
                  <Icon
                    className="text-[#1d2d6a] dark:text-slate-300"
                    size={22}
                    strokeWidth={2.5}
                  />
                );
              })()}
            </div>
            <div>
              <span className="text-xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-normal">
                {NAV_ITEMS.find((n) => n.id === ACTTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-10">
            {/* ACT Unit Badge Style */}

            <div className="flex items-center gap-4 border-r border-slate-100 dark:border-[#1e293b] pr-10">
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  ACT Unit
                </div>
                <div className="text-base font-bold text-[#1d2d6a] dark:text-white tracking-tight">
                  {ACTTrainName}{" "}
                  <span className="text-[#ee6f1f] ml-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded font-mono text-md border border-orange-100 dark:border-orange-900/30">
                    KA {ACTTrainNumber?.split(" Gerbong")[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Clock Style */}
            <div className="flex items-center gap-3 text-[#1d2d6a] dark:text-white">
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-slate-400 border border-slate-100 dark:border-slate-700">
                <Clock size={18} />
              </div>
              <span className="text-3xl font-bold font-mono tracking-tighter opacity-90">
                {currentTime.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":")}
              </span>
            </div>
          </div>
        </header>

        <div className={`flex-1 flex flex-col ${ACTTab === "tvmonitor" ? "overflow-hidden" : "overflow-y-auto"} bg-[#f8fafc] dark:bg-[#0a0f1e] relative`}>
          <AnimatePresence mode="wait">
            {ACTTab === "pids" ? (
              <motion.div
                key="pids"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[1600px] mx-auto p-6 lg:p-10"
              >
                <MasterConsolePanel
                  route={ACTRoute}
                  data={data}
                  sendData={sendData}
                />
              </motion.div>
            ) : ACTTab === "stampformasi" ? (
              <motion.div
                key="stampformasi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[1600px] mx-auto space-y-10 p-6 lg:p-10"
              >
                <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-[#1e293b]">
                  <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white mb-8 tracking-tight flex items-center gap-3">
                    <Database className="text-[#ee6f1f]" />
                    Stampformasi
                  </h2>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[#1d2d6a] dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700">Unit</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700">Serial</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700">Relasi</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700">IP Address</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700">Update</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">PIDS</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(() => {
                          const coachCount = data.coachCount || 4;
                          const trainNumbers = [
                            "K1 0 18 01", "K1 0 18 02", "K1 0 18 03", "K1 0 18 04",
                            "MP 0 19 01", "K3 0 19 05", "K3 0 19 06", "K3 0 19 07",
                            "K3 0 19 08", "P 0 18 01"
                          ];

                          return Array.from({ length: coachCount }).map((_, idx) => {
                            const trainNumber = trainNumbers[idx % trainNumbers.length];
                            return (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">
                                  Gerbong {idx + 1}
                                </td>
                                <td className="p-4 font-bold text-[#1d2d6a] dark:text-white font-mono">
                                  {trainNumber}
                                </td>
                                <td className="p-4 font-bold text-[#1d2d6a] dark:text-white">
                                  {ACTTrainName}
                                </td>
                                <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                                  192.168.1.{100 + idx}
                                </td>
                                <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                                  {currentTime.toLocaleTimeString("id-ID", {
                                    hour12: false,
                                  })}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${idx < coachCount ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-[#1e293b]"}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${idx < coachCount ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                                    {idx < coachCount ? "Aktif" : "Non-Aktif"}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold border border-green-100 dark:border-green-900/50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Online
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detail State per Gerbong - Compact Premium Layout */}
                <div className="bg-white dark:bg-[#0f172a]/40 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-[#1e293b]/50">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                      <div className="text-[#ee6f1f]">
                        <Train size={32} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white tracking-tight">
                          Fleet Telemetry Realtime Status
                        </h2>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const btn = document.getElementById("refresh-state-btn");
                        if (btn) {
                          btn.classList.add("animate-spin");
                          setTimeout(() => btn.classList.remove("animate-spin"), 1000);
                        }
                      }}
                      className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1d2d6a] dark:text-slate-300 px-6 py-3 rounded-2xl text-sm font-black transition-all border border-slate-200 dark:border-slate-700 shadow-sm ACT:scale-95"
                    >
                      <RefreshCw id="refresh-state-btn" size={18} />
                      REFRESH
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-3">
                    {(() => {
                      const coachCount = data.coachCount || 4;
                      const trainNumbers = [
                        "K1 0 18 01", "K1 0 18 02", "K1 0 18 03", "K1 0 18 04",
                        "MP 0 19 01", "K3 0 19 05", "K3 0 19 06", "K3 0 19 07",
                        "K3 0 19 08", "P 0 18 01"
                      ];

                      const rows = Math.ceil(coachCount / 2);
                      const displayIndices = [];
                      for (let r = 0; r < rows; r++) {
                        displayIndices.push(r);
                        if (r + rows < coachCount) displayIndices.push(r + rows);
                      }

                      return displayIndices.map((i) => {
                        const trainNumber = trainNumbers[i % trainNumbers.length];
                        const isAktif = true;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className={`group bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-[#1e293b]/50 rounded-xl p-3 px-4 transition-all hover:shadow-md hover:border-[#ee6f1f]/30 flex items-center gap-5 ${!isAktif && 'opacity-60 grayscale'}`}
                          >
                            <div className="flex items-center gap-3 w-32 shrink-0">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#1d2d6a] dark:text-white border border-slate-200 dark:border-slate-700">
                                  <span className="text-sm font-bold font-mono">{String(i + 1).padStart(2, "0")}</span>
                                </div>
                                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-[#0f172a] ${isAktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Unit</span>
                                <div className="text-[13px] font-bold text-[#1d2d6a] dark:text-white truncate">
                                  {trainNumber}
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 flex items-center gap-8 justify-center px-4 border-x border-slate-100 dark:border-slate-800/50">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Temp</span>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-sm font-bold text-[#1d2d6a] dark:text-white font-mono">
                                    {isAktif ? (22 + Math.random() * 2).toFixed(1) : "28.5"}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">°C</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Net</span>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1 h-1 rounded-full ${isAktif ? 'bg-green-500' : 'bg-slate-300'}`} />
                                  <span className={`text-[9px] font-bold uppercase ${isAktif ? 'text-green-600' : 'text-slate-400'}`}>
                                    {isAktif ? "LAT" : "OFF"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 w-36 shrink-0 justify-end">
                              {['Audio', 'Video', 'PIDS'].map((sys) => (
                                <div key={sys} className="flex flex-col items-center">
                                  <span className="text-[7px] font-bold text-slate-400 uppercase">{sys}</span>
                                  <span className={`text-[9px] font-bold ${isAktif ? 'text-[#1d2d6a] dark:text-slate-300' : 'text-slate-300'}`}>
                                    {isAktif ? 'OK' : '-'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            ) : ACTTab === "tv" ? (
              <motion.div
                key="tv"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full max-w-6xl mx-auto p-10"
              >
                <MonitorCCTV data={data} />
              </motion.div>
            ) : ACTTab === "gps" ? (
              <motion.div
                key="gps"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full max-w-6xl mx-auto p-10"
              >
                <MonitorGPS route={ACTRoute} data={data} />
              </motion.div>
            ) : ACTTab === "tvmonitor" ? (
              <motion.div
                key="tvmonitor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 w-full flex flex-col relative overflow-hidden"
              >
                <TVMonitor
                  show={true}
                  isEmbedded={!isTvFullscreen}
                  onClose={() => setIsTvFullscreen(false)}
                  data={data}
                  currentStation={(() => {
                    const s = data?.currentStation;
                    if (!s || s === "-") return "TIDAK TERIDENTIFIKASI";
                    if (typeof s === "string") {
                      try {
                        if (s.startsWith("{")) {
                          const parsed = JSON.parse(s);
                          return parsed.name || parsed.id || s;
                        }
                      } catch (e) { }
                      return s;
                    }
                    return (s as any).name || (s as any).id || "TIDAK TERIDENTIFIKASI";
                  })()}
                  nextStation={(() => {
                    const s = data?.nextStation;
                    if (!s || s === "-") return "-";
                    if (typeof s === "string") {
                      try {
                        if (s.startsWith("{")) {
                          const parsed = JSON.parse(s);
                          return parsed.name || parsed.id || s;
                        }
                      } catch (e) { }
                      return s;
                    }
                    return (s as any).name || (s as any).id || "-";
                  })()}
                  masterSyncedServiceName={ACTTrainName}
                  masterSyncedNumber={ACTTrainNumber}
                  speed={data?.speed || 0}
                  altitude={data?.altitude || 0}
                  temp={data?.temperature || 24}
                />

                {!isTvFullscreen && (
                  <div className="absolute top-8 right-5 z-50">
                    <button
                      onClick={() => setIsTvFullscreen(true)}
                      className="bg-white/10 hover:bg-[#ee6f1f] text-white px-3 py-2 rounded-lg backdrop-blur-md border border-white/10 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-3 group"
                    >
                      <Maximize size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : ACTTab === "logs" ? (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-10"
              >
                <LogViewer token={authToken} />
              </motion.div>
            ) : ACTTab === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-10"
              >
                <SettingsPage isDark={isDark} setIsDark={setIsDark} />
              </motion.div>
            ) : (
              <motion.div
                key="under-construction"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-slate-400 gap-6"
              >
                <div className="bg-white dark:bg-[#0f172a] p-12 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 border border-slate-100 dark:border-[#1e293b] max-w-md w-full">
                  <div className="bg-orange-50 p-6 rounded-3xl text-[#ee6f1f]">
                    <AlertCircle size={48} />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-[#1d2d6a] mb-2 tracking-tight">
                      Access Restricted
                    </h2>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">
                      Module <span className="text-[#1d2d6a]">{ACTTab}</span>{" "}
                      sedang dalam pemeliharaan.
                    </p>
                  </div>
                  <button
                    onClick={() => setACTTab("pids")}
                    className="w-full mt-4 px-8 py-4 bg-[#0f172a] hover:bg-slate-800 text-white text-sm font-bold rounded-2xl shadow-lg transition-all ACT:scale-95"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
