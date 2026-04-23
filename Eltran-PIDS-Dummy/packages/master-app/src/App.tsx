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
  Maximize,
  Settings,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginScreen } from "@eltran/shared";
import { MasterConsolePanel } from "./components/MasterConsolePanel";
import MapComponent from "./components/MapComponent";
import SettingsPage from "./pages/SettingsPage";

import type { AuthUser, LogEntry } from "@eltran/pids-core";

import "maplibre-gl/dist/maplibre-gl.css";

const API_URL = "http://localhost:3001";

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
      className="relative h-full w-full overflow-hidden rounded-[3rem] shadow-2xl border border-white/10 bg-slate-900 group"
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
          <div className="absolute inset-0 bg-slate-900/10 mix-blend-overlay" />
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
            className="bg-slate-900/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110 shadow-lg"
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
          className="bg-slate-900/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110"
        >
          <ChevronLeft size={36} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleNextCam}
          className="bg-slate-900/50 hover:bg-[#ee6f1f] text-white p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110"
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
                className="absolute bottom-full right-0 mb-4 w-[400px] bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 p-2"
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
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                        currentCamIndex === idx
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
            className={`bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border shadow-xl flex items-center gap-4 transition-all duration-300 ${
              isDropdownOpen
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

const MonitorGPS = ({ route }: { route: any }) => {
  const [gerbongData, setGerbongData] = useState<any[]>([]);
  const [selectedKereta] = useState<number>(1);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  // Fetch per-gerbong GPS when selectedKereta changes
  useEffect(() => {
    if (!selectedKereta) return;
    const fetchGerbong = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gps/gerbong/${selectedKereta}`);
        const d = await res.json();
        if (d.success) setGerbongData(d.gerbong);
      } catch {}
    };
    fetchGerbong();
    const interval = setInterval(fetchGerbong, 10000);
    return () => clearInterval(interval);
  }, [selectedKereta]);

  const trainMarkers = useMemo(() => {
    return gerbongData.map((g, idx) => ({
      id: `G-${g.gerbong_id}`,
      name: `Gerbong ${idx + 1}`,
      location: [g.longitude, g.latitude] as [number, number],
      heading: (g as any).heading || 0,
      status: "Normal",
      speed: g.speed || 0,
      eta: "--:--"
    }));
  }, [gerbongData]);

  useEffect(() => {
    if (trainMarkers.length > 0 && !focusLocation) {
       setFocusLocation(trainMarkers[0].location);
    }
  }, [trainMarkers]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.5rem] border border-slate-200 dark:border-slate-800/50 shadow-sm overflow-hidden flex-1 relative group min-h-[450px]">
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-[#1d2d6a] dark:text-white uppercase tracking-wide">
              Peta Lokasi Armada
            </span>
          </div>
        </div>

        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
          <MapComponent 
            trains={trainMarkers}
            focusCoord={focusLocation}
            onTrainClick={(_, loc) => setFocusLocation(loc)}
          />
        </div>

        <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
          <div className="bg-[#1d2d6a] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 transition-all hover:scale-105 pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest">
                Active Units
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
                {route?.name || "-"}
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
      color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800",
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
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
                className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border transition-all ${filter === opt ? "bg-[#1d2d6a] dark:bg-slate-950 text-white border-[#1d2d6a] dark:border-slate-800" : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[#1d2d6a] dark:text-slate-200 font-semibold text-[11px]">
                <tr>
                   <th className="p-4 border-b border-slate-200 dark:border-slate-800">Waktu</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-800">Aksi</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-800">Pengguna</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-800">Role</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-800">Keterangan</th>
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
  const [activeTab, setActiveTab] = useState("pids");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>("");

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("master_theme");
    return saved ? saved === "dark" : true;
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
  const activeTrainName = data.serviceName || "Belum Dikonfigurasi";
  const activeTrainNumber = data.trainNumber || "-";
  const activeRoute = data.activeRoute || {
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
      } catch {}
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
    } catch {}
    sessionStorage.removeItem("pids_token");
    sessionStorage.removeItem("pids_user");
    setAuthUser(null);
    setAuthToken("");
    setActiveTab("pids");
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
    { id: "logs", icon: ScrollText, label: "Log Aktivitas" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className={`flex h-screen w-full bg-[#f8fafc] dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans overflow-hidden ${isDark ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside className="w-80 bg-[#1d2d6a] dark:bg-slate-900 border-r border-blue-900 dark:border-slate-800 flex flex-col shadow-[8px_0_40px_-10px_rgba(0,0,0,0.2)] z-20">

        <div className="p-10 pb-6">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
            alt="KAI Logo"
            className="h-12 w-auto mb-6 brightness-0 invert"
          />
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            PIDS Master
          </h1>
          <p className="text-[15px] font-bold text-blue-200/40 mt-1">
            Kereta Makan
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl transition-all duration-300 font-bold text-lg ${activeTab === item.id ? "bg-[#ee6f1f] text-white shadow-[0_12px_24px_rgba(238,111,31,0.3)] scale-[1.02]" : "text-white/60 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 hover:bg-white/5 dark:hover:bg-white/5"}`}
                >
                  <item.icon size={28} strokeWidth={2.5} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-6 space-y-3 mt-auto border-t border-white/5 bg-slate-950/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-[10px] border border-white/5 active:scale-95 group"
          >
            <LogOut
              size={16}
              className="text-white/20 group-hover:text-red-400 transition-colors"
            />
            <span>Logout dari Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10 shrink-0">

          <div className="flex items-center gap-5">
            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              {(() => {
                const Icon =
                  NAV_ITEMS.find((n) => n.id === activeTab)?.icon || Train;
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
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-10">
            {/* Active Unit Badge Style */}

            <div className="flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-10">
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  Active Unit
                </div>
                <div className="text-base font-bold text-[#1d2d6a] dark:text-white tracking-tight">
                  {activeTrainName}{" "}
                  <span className="text-[#ee6f1f] ml-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded font-mono text-md border border-orange-100 dark:border-orange-900/30">
                    KA {activeTrainNumber?.split(" Gerbong")[0]}
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
                {currentTime.toLocaleTimeString("id-ID", { hour12: false })}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-10 bg-[#f8fafc] dark:bg-slate-900">
          <AnimatePresence mode="wait">
            {activeTab === "pids" ? (
              <motion.div
                key="pids"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <MasterConsolePanel
                  route={activeRoute}
                  data={data}
                  sendData={sendData}
                />
              </motion.div>
            ) : activeTab === "stampformasi" ? (
              <motion.div
                key="stampformasi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-6xl mx-auto space-y-10"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white mb-8 tracking-tight flex items-center gap-3">
                    <Database className="text-[#ee6f1f]" />
                    Stampformasi
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
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
                          const trainNumbers = [
                            "K1 0 18 01",
                            "K1 0 18 02",
                            "K1 0 18 03",
                            "K1 0 18 04",
                            "MP 0 19 01",
                            "K3 0 19 05",
                            "K3 0 19 06",
                            "K3 0 19 07",
                            "K3 0 19 08",
                            "P 0 18 01"
                          ];
                          
                          return trainNumbers.map((trainNumber, idx) => {
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
                                  {activeTrainName}
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
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${idx < 8 ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800"}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${idx < 8 ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                                    {idx < 8 ? "Aktif" : "Non-Aktif"}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold border border-green-100 dark:border-green-900/50">
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

                {/* Detail State per Gerbong - Revamped Layout */}
                <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800/50">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-2xl text-[#ee6f1f]">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white tracking-tight">
                          Detail State per Gerbong
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Monitoring real-time telemetri rangkaian aktif
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Dummy refresh action
                        const btn = document.getElementById("refresh-state-btn");
                        if (btn) {
                          btn.classList.add("animate-spin");
                          setTimeout(() => btn.classList.remove("animate-spin"), 1000);
                        }
                      }}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1d2d6a] dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <RefreshCw id="refresh-state-btn" size={16} />
                      Refresh Data
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
                    {(() => {
                       const trainNumbers = [
                         "K1 0 18 01",
                         "K1 0 18 02",
                         "K1 0 18 03",
                         "K1 0 18 04",
                         "MP 0 19 01",
                         "K3 0 19 05",
                         "K3 0 19 06",
                         "K3 0 19 07",
                         "K3 0 19 08",
                         "P 0 18 01"
                       ];
                       
                       return Array.from({ length: 10 }).map((_, i) => {
                         const trainNumber = trainNumbers[i];
                         const isAktif = i < 8;
                         return (
                           <motion.div
                             key={i}
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: i * 0.03 }}
                             className={`relative group bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg ${isAktif ? 'hover:border-orange-200 dark:hover:border-orange-900/30' : 'opacity-60 grayscale'}`}
                           >
                             <div className="flex items-center gap-3 mb-3">
                               <div className={`w-2 h-2 rounded-full ${isAktif ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                               <div className="flex-1 overflow-hidden">
                                 <div className="text-[#1d2d6a] dark:text-white font-bold text-xs truncate group-hover:text-[#ee6f1f]">
                                   {trainNumber}
                                 </div>
                                 <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                   Unit {String(i + 1).padStart(2, "0")}
                                 </div>
                               </div>
                               <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider ${isAktif ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                 {isAktif ? "ON" : "OFF"}
                               </div>
                             </div>
                             
                             <div className="space-y-2">
                               <div className="grid grid-cols-2 gap-2">
                                 <div className="bg-white dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                   <div className="text-[8px] text-slate-400 font-bold uppercase">SPD</div>
                                   <div className="text-[10px] font-black text-[#ee6f1f]">
                                     {isAktif ? (75 + Math.random() * 5).toFixed(1) : "0.0"}
                                   </div>
                                 </div>
                                 <div className="bg-white dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                   <div className="text-[8px] text-slate-400 font-bold uppercase">TMP</div>
                                   <div className="text-[10px] font-black text-[#1d2d6a] dark:text-white">
                                     {isAktif ? (22 + Math.random() * 2).toFixed(1) : "28.5"}
                                   </div>
                                 </div>
                               </div>
                               
                               <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/30 rounded-lg px-2 py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">AUD</span>
                                    <span className="text-[8px] font-black text-[#1d2d6a] dark:text-slate-300">{isAktif ? 'RDY' : '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">VID</span>
                                    <span className="text-[8px] font-black text-[#1d2d6a] dark:text-slate-300">{isAktif ? 'ACT' : '-'}</span>
                                  </div>
                               </div>
                             </div>
                           </motion.div>
                         );
                       });
                    })()}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === "tv" ? (
              <motion.div
                key="tv"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full max-w-6xl mx-auto"
              >
                <MonitorCCTV data={data} />
              </motion.div>
            ) : activeTab === "gps" ? (
              <motion.div
                key="gps"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full max-w-6xl mx-auto"
              >
                <MonitorGPS route={activeRoute} />
              </motion.div>
            ) : activeTab === "logs" ? (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <LogViewer token={authToken} />
              </motion.div>
            ) : activeTab === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
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
                <div className="bg-white dark:bg-slate-900 p-12 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 border border-slate-100 dark:border-slate-800 max-w-md w-full">
                  <div className="bg-orange-50 p-6 rounded-3xl text-[#ee6f1f]">
                    <AlertCircle size={48} />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-[#1d2d6a] mb-2 tracking-tight">
                      Access Restricted
                    </h2>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">
                      Module <span className="text-[#1d2d6a]">{activeTab}</span>{" "}
                      sedang dalam pemeliharaan.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("pids")}
                    className="w-full mt-4 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95"
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
