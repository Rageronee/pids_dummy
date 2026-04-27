/** /selector-app/src/App.tsx — untuk mengubah: komponen PIDS selector LED 5inch; fungsi utama: App Selector */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Train,
  Clock,
  Settings,
  ChevronsUp,
  ChevronsDown,
  RefreshCcw,
  Navigation,
  Route,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { LoginScreen } from "@eltran/shared";
import { useSelectorSync } from "./hooks/useSelectorSync";
import SystemSettingsModal from "./components/SystemSettingsModal";
import ServiceConfigModal from "./components/ServiceConfigModal.tsx";
import SelectorToast from "./components/SelectorToast";

function App() {
  const sync = useSelectorSync();
  const {
    authUser,
    handleLogin,
    handleLogout,
    data,
    stations,
    setStations,
    masterSyncedServiceName,
    masterSyncedNumber,
    masterSyncedLedSpeed,
    setMasterSyncedLedSpeed,
    coachCount,
    trainNames,
    routes,
    sendData,
  } = sync;

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("selector_theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("selector_theme", isDark ? "dark" : "light");
  }, [isDark]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [ledType, setLedType] = useState<
    "indoor" | "outdoor" | "p10_32_16" | "p25_32_16"
  >("indoor");
  const [toastMsg, setToastMsg] = useState<{
    title: string;
    message: string;
    id?: number;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [trainNameIndex, setTrainNameIndex] = useState(-1);
  const [kaDropdownOpen, setKaDropdownOpen] = useState(false);
  const kaDropdownRef = useRef<HTMLDivElement>(null);
  const [trainCategory, setTrainCategory] = useState<
    "EKSEKUTIF" | "EKONOMI PREMIUM"
  >("EKSEKUTIF");
  const [selectedGerbong, setSelectedGerbong] = useState(1);

  useEffect(() => {
    const idx = trainNames.indexOf(masterSyncedServiceName);
    if (idx !== -1) setTrainNameIndex(idx);
  }, [masterSyncedServiceName, trainNames]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        kaDropdownRef.current &&
        !kaDropdownRef.current.contains(e.target as Node)
      ) {
        setKaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (currentIndex >= stations.length) setCurrentIndex(0);
  }, [stations, currentIndex]);
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const [activeKa, setActiveKa] = useState<string>("ka67");

  const getScheduledTime = useCallback(
    (stationName: any) => {
      const name =
        typeof stationName === "object" && stationName !== null
          ? stationName.name
          : stationName;
      const nameStr = String(name ?? "").trim();
      let activeRoute = data?.activeRoute as any;

      if (
        !activeRoute?.features &&
        masterSyncedServiceName &&
        routes?.[masterSyncedServiceName]
      ) {
        activeRoute = routes[masterSyncedServiceName];
      }

      if (!activeRoute?.features || !nameStr) return null;

      const stationFeature = activeRoute.features.find(
        (f: any) =>
          f.geometry?.type === "Point" &&
          String(f.properties?.name ?? "")
            .toUpperCase()
            .trim() === nameStr.toUpperCase(),
      );
      if (!stationFeature) return null;

      const expectedKey = `schedule_${activeKa.toLowerCase()}`;
      const key = Object.keys(stationFeature.properties || {}).find(
        (k) => k.toLowerCase() === expectedKey,
      );
      if (!key) return null;
      const raw = String(stationFeature.properties[key] ?? "");
      const parts = raw.split(":");
      return parts.length >= 2
        ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
        : raw;
    },
    [data?.activeRoute, activeKa, masterSyncedServiceName, routes],
  );

  const getTrainId = useCallback((ka: string) => ka.replace(/\D/g, ""), []);

  const getSmallestKa = useCallback((route: any) => {
    const geo = route?.features ? route : route?.geojson;
    const directions = geo?.features?.find(
      (f: any) => f.geometry?.type === "LineString",
    )?.properties?.available_directions;
    if (directions && directions.length > 0) {
      const sorted = [...directions].sort((a, b) =>
        a.num.localeCompare(b.num, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      return sorted[0].num;
    }
    return null;
  }, []);

  const showNotification = useCallback((title: string, message: string) => {
    setToastMsg({ title, message, id: Date.now() });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 5000);
  }, []);
  const handlePrev = useCallback(
    () =>
      setCurrentIndex((prev) => (prev - 1 + stations.length) % stations.length),
    [stations.length],
  );
  const handleNext = useCallback(
    () => setCurrentIndex((prev) => (prev + 1) % stations.length),
    [stations.length],
  );

  const handleSelectStation = useCallback(() => {
    sendData({
      currentStation: stations[currentIndex],
      nextStation: stations[(currentIndex + 1) % stations.length],
      isSyncing: true,
    });
    showNotification("Sync Completed", "Station display status updated.");
  }, [stations, currentIndex, sendData, showNotification]);



  const handleSetConfig = useCallback(
    (
      serviceName: string,
      routeData: any,
      newStations: string[],
      gerbong: number,
    ) => {
      if (newStations.length > 0) {
        setStations(newStations);
        setCurrentIndex(0);
      }
      setSelectedGerbong(gerbong);
      const minKa = getSmallestKa(routeData);
      const resolvedKa = minKa ? `ka${minKa}` : activeKa;
      if (minKa) setActiveKa(resolvedKa);

      sendData({
        serviceName,
        stations: newStations,
        activeRoute: routeData,
        trainNumber: `${getTrainId(resolvedKa)} Gerbong ${gerbong}`,
      });
      showNotification(
        "Configuration Saved",
        `Service set to ${serviceName}, Unit to Gerbong ${gerbong}`,
      );
    },
    [
      sendData,
      setStations,
      showNotification,
      getSmallestKa,
      activeKa,
      getTrainId,
    ],
  );

  const handleSetGerbong = useCallback(
    (gerbong: number) => {
      setSelectedGerbong(gerbong);
      sendData({ trainNumber: `${getTrainId(activeKa)} Gerbong ${gerbong}` });
      showNotification(
        "Configuration Saved",
        `Unit configuration set to Gerbong ${gerbong}`,
      );
    },
    [sendData, showNotification, getTrainId, activeKa],
  );

  const handleSetLedSpeed = useCallback(
    (speedValue: number) => {
      setMasterSyncedLedSpeed(speedValue);
      sendData({ ledSpeed: speedValue });
      showNotification(
        "Configuration Saved",
        `LED scroll speed set to ${speedValue}ms`,
      );
    },
    [sendData, setMasterSyncedLedSpeed, showNotification],
  );

  const getStationName = (s: any) =>
    typeof s === "object" && s !== null ? s.name : s;
  const currentStation =
    getStationName(stations[currentIndex]) || "INITIALIZING SYNC...";
  const nextStation =
    getStationName(stations[(currentIndex + 1) % stations.length]) || "---";
  const activeRouteAny = data?.activeRoute as any;
  const geojson = activeRouteAny?.features
    ? activeRouteAny
    : activeRouteAny?.geojson;
  const availableDirections: { num: string; label: string }[] =
    geojson?.features?.find((f: any) => f.geometry?.type === "LineString")
      ?.properties?.available_directions || [];
  const formatDirLabel = (label: string) => {
    const cityMap: Record<string, string> = { BANDUNG: "BD", MALANG: "ML" };
    return label.replace(
      /\(([^)]+?)\s*->?\s*([^)]+?)\)/,
      (_: string, from: string, to: string) => {
        const f = from.trim().toUpperCase();
        const t = to.trim().toUpperCase();
        const abbr = (s: string) =>
          cityMap[s] || s.substring(0, 2).toUpperCase();
        return `(${abbr(f)}-${abbr(t)})`;
      },
    );
  };

  const handleChangeDirection = useCallback(
    (newKa: string) => {
      setActiveKa(newKa);
      setKaDropdownOpen(false);

      if (stations.length < 2) return;

      const rawStations = [...stations]; // CRITICAL: Use spread to avoid in-place mutation of state
      let newStations = rawStations;

      let needsReverse = false;
      const activeRoute = data?.activeRoute || routes?.[masterSyncedServiceName];
      const routeFeatures = activeRoute?.features || activeRoute?.geojson?.features;

      // Robust direction detection: Use GeoJSON origin markers if available
      let dynamicOriginName = null;
      if (routeFeatures) {
        const originFeature = routeFeatures.find(
          (f: any) =>
            f.properties?.[`is_origin_${newKa.toLowerCase()}`] === true,
        );
        if (originFeature) {
          dynamicOriginName = String(originFeature.properties.name || "")
            .toUpperCase()
            .trim();
        }
      }

      if (dynamicOriginName && newStations.length > 0) {
        const firstSn = getStationName(newStations[0]);
        const firstStr = String(firstSn || "").toUpperCase().trim();
        
        // If the current first station is NOT the origin of the new direction, we need to reverse
        if (firstStr !== dynamicOriginName) {
          needsReverse = true;
        }
      } else if (newStations.length >= 2) {
        // Fallback to name-based detection
        const firstSn = getStationName(newStations[0]);
        const lastSn = getStationName(newStations[newStations.length - 1]);

        const firstStr = String(firstSn || "").toUpperCase().trim();
        const lastStr = String(lastSn || "").toUpperCase().trim();

        const isCurrentlyMlToBd = firstStr.includes("MALANG") || lastStr.includes("BANDUNG");
        const isCurrentlyBdToMl = firstStr.includes("BANDUNG") || lastStr.includes("MALANG");

        const targetIsBdToMl = ["ka68", "ka70"].includes(newKa.toLowerCase());
        const targetIsMlToBd = ["ka67", "ka69"].includes(newKa.toLowerCase());

        if (targetIsBdToMl && isCurrentlyMlToBd) needsReverse = true;
        if (targetIsMlToBd && isCurrentlyBdToMl) needsReverse = true;
      }

      if (needsReverse) {
        newStations.reverse();
      }

      setStations(newStations);
      setCurrentIndex(0);
      sendData({
        stations: newStations,
        activeRoute: {
          ...(data?.activeRoute || {}),
          stations: newStations,
        },
        currentStation: newStations[0],
        nextStation: newStations[Math.min(1, newStations.length - 1)],
        current_station_index: 0,
        trainNumber: `${getTrainId(newKa)} Gerbong ${selectedGerbong}`,
        isSyncing: true,
      });
      showNotification(
        "Direction Changed",
        `Route direction set for ${newKa.toUpperCase()} sync.`,
      );
    },
    [
      stations,
      setStations,
      sendData,
      showNotification,
      data?.activeRoute,
      getTrainId,
      selectedGerbong,
    ],
  );
  if (!authUser) {
    return <LoginScreen onLogin={handleLogin} title="PIDS Selector App" isDark={isDark} />;
  }

  return (
    <div className={`flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden select-none ${isDark ? "dark" : ""}`}>
      <header className="h-[90px] bg-gradient-to-r from-[#1d2d6a] to-[#2a3f8c] text-white flex items-center px-6 shadow-lg border-b border-white/10 shrink-0 justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowServiceModal(true)}
            className="flex items-center gap-4 text-left group transition-all active:scale-95"
          >
            <div className="w-[56px] h-[56px] bg-white/10 rounded-[14px] flex items-center justify-center shadow-sm border border-white/10 group-hover:scale-110 transition-transform duration-500">
              <Train className="text-white" size={32} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-100/80 tracking-[0.25em] uppercase">
                  Service Config
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold uppercase tracking-tight text-white group-hover:text-blue-100 transition-colors truncate">
                  {masterSyncedServiceName || "NOT SET"}
                </h1>
                <ChevronRight
                  className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all"
                  size={24}
                />
              </div>
            </div>
          </button>

          {masterSyncedServiceName?.toUpperCase().includes("MALABAR") && (
            <div className="relative min-w-[200px]" ref={kaDropdownRef}>
              <button
                onClick={() => setKaDropdownOpen(!kaDropdownOpen)}
                className={`flex items-center gap-4 text-left group transition-all active:scale-95 ${kaDropdownOpen ? "opacity-90" : ""}`}
              >
                <div
                  className={`w-[56px] h-[56px] rounded-[14px] flex items-center justify-center shadow-sm transition-all duration-500 ${kaDropdownOpen ? "bg-white/20 text-white scale-110" : "bg-white/10 border border-white/10 group-hover:bg-white/20"}`}
                >
                  <Route
                    className="text-white"
                    size={32}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-100/60 tracking-[0.25em] uppercase">
                      Select Direction
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white uppercase tracking-tight truncate">
                      {availableDirections.length > 0
                        ? formatDirLabel(
                            availableDirections.find(
                              (d) => `ka${d.num}` === activeKa,
                            )?.label ?? activeKa,
                          )
                        : activeKa.toUpperCase()}
                    </span>
                    <ChevronDown
                      size={24}
                      strokeWidth={2.5}
                      className={`text-white/40 group-hover:text-white transition-transform ${kaDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
              </button>

              {kaDropdownOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border-2 border-white/10 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1">
                  {availableDirections.length > 0 ? (
                    availableDirections.map((dir) => (
                      <button
                        key={dir.num}
                        onClick={() => handleChangeDirection(`ka${dir.num}`)}
                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${
                          activeKa === `ka${dir.num}`
                            ? "bg-[#ee6f1f] text-white"
                            : "text-[#1d2d6a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {formatDirLabel(dir.label)}
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => handleChangeDirection("ka68")}
                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${activeKa === "ka68" ? "bg-[#ee6f1f] text-white" : "text-[#1d2d6a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                      >
                        KA 68 (BD-ML)
                      </button>
                      <button
                        onClick={() => handleChangeDirection("ka67")}
                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${activeKa === "ka67" ? "bg-[#ee6f1f] text-white" : "text-[#1d2d6a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                      >
                        KA 67 (ML-BD)
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() =>
              setTrainCategory((prev) =>
                prev === "EKSEKUTIF" ? "EKONOMI PREMIUM" : "EKSEKUTIF",
              )
            }
            className="hidden lg:flex flex-col items-end text-right hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-white/40 group-hover:text-white/70 tracking-[0.2em] uppercase mb-0.5 transition-colors">
              Category
            </span>
            <span className="text-2xl font-bold tracking-tight uppercase leading-none text-white group-hover:text-white transition-colors">
              {masterSyncedServiceName ? trainCategory : "---"}
            </span>
          </button>

          <div className="w-px h-10 bg-white/20 mx-2" />

          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mb-0.5">
              Unit
            </span>
            <span className="text-2xl font-bold tracking-widest uppercase leading-none">
              {masterSyncedNumber
                ? masterSyncedNumber.replace(/^\d+\s+/, "").toUpperCase()
                : "---"}
            </span>
          </div>

          <div className="flex items-center gap-4 bg-[#ee6f1f] py-2 px-6 rounded-2xl shadow-lg border border-white/20 max-w-[350px] flex-1">
            <div className="flex flex-col items-end min-w-0 flex-1">
              <span className="text-2xl font-bold text-white tracking-tight uppercase truncate w-full text-right">
                {["ka68", "ka70"].includes(activeKa) ? "MALANG" : "BANDUNG"}
              </span>
            </div>
            <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0">
              <Navigation size={24} className="text-white rotate-45" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex gap-4 p-4 flex-1 min-h-0">
        <div className="flex-[0.65] flex flex-col gap-6">
          <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900/60 dark:to-slate-800/60 backdrop-blur-sm rounded-[24px] shadow-sm p-6 border border-slate-200 dark:border-slate-800/50 flex flex-col transition-colors">
            <div className="flex items-center gap-3 text-[#1d2d6a] dark:text-white font-bold text-xl tracking-widest uppercase mb-3">
              <Navigation size={18} className="text-[#ee6f1f]" /> CURRENT
              POSITION
            </div>
            <div className="flex items-center gap-6">
              <Train
                className="text-[#1d2d6a] dark:text-white/100 shrink-0"
                size={64}
                strokeWidth={1.5}
              />
              <h2 className="text-5xl font-bold text-[#1d2d6a] dark:text-white tracking-tight uppercase leading-[1.1] line-clamp-2 break-words">
                {currentStation}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[24px] shadow-sm py-5 px-6 border border-slate-200 dark:border-slate-800/50 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-bold text-sm tracking-widest uppercase mb-3 shrink-0">
              <Route size={18} /> DETAILED ROUTES
            </div>

            <div className="relative pl-0 pr-2 mt-2 flex-1 flex flex-col justify-start overflow-y-auto scrollbar-hide">
              <div className="relative w-full">
                <div className="absolute left-[22px] top-[40px] bottom-[20px] w-[4px] bg-slate-100 dark:bg-slate-800 rounded-full z-0" />

                <div className="flex items-center gap-4 mb-4 relative z-10 w-full shrink-0">
                  <div className="w-[48px] flex justify-center relative z-10">
                    <div className="w-[24px] h-[24px] bg-[#cbd5e1] dark:bg-slate-700 rounded-full border-[6px] border-white dark:border-slate-900 shadow-sm" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl p-5 border-[2px] border-slate-100 dark:border-slate-700 flex justify-between items-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex flex-col relative z-10 text-slate-400">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                        Next Station
                      </span>
                      <span className="text-3xl text-slate-700 dark:text-white font-bold tracking-tight uppercase shrink-0 min-w-0 pr-4">
                        {nextStation}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end relative z-10 shrink-0">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">
                        ETA
                      </span>
                      <span className="text-3xl font-bold text-slate-600">
                        {getScheduledTime(nextStation) ||
                          (stations.length > 0
                            ? new Date(currentTime.getTime() + 15 * 60000)
                                .toLocaleTimeString("id-ID", {
                                  hour12: false,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                                .replace(".", ":")
                            : "--:--")}
                      </span>
                    </div>
                  </div>
                </div>

                {stations.length > 2 &&
                  (() => {
                    const renderUpcoming = [];
                    for (let i = 2; i < stations.length; i++) {
                      const upcomingStationObj =
                        stations[(currentIndex + i) % stations.length];
                      const upcomingStationName =
                        getStationName(upcomingStationObj);
                      if (upcomingStationObj === stations[currentIndex]) break;

                      renderUpcoming.push(
                        <div
                          key={`upcoming-${i}`}
                          className="flex items-center gap-4 relative z-10 w-full mb-3 shrink-0"
                        >
                          <div className="w-[48px] flex justify-center relative z-10">
                            <div className="w-[20px] h-[20px] bg-slate-300 dark:bg-slate-700 rounded-full border-[5px] border-white dark:border-slate-900 shadow-sm mt-3" />
                          </div>
                          <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 shadow-sm flex justify-between items-center transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:scale-[1.01] hover:shadow-md">
                            <div className="flex flex-col">
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
                                UPCOMING STATION
                              </span>
                              <span className="text-lg font-semibold text-slate-700 dark:text-white uppercase tracking-tight">
                                {upcomingStationName}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">
                                ETA
                              </span>
                              <span className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                {getScheduledTime(upcomingStationName) ||
                                  new Date(
                                    currentTime.getTime() + 15 * i * 60000,
                                  )
                                    .toLocaleTimeString("id-ID", {
                                      hour12: false,
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                    .replace(".", ":")}
                              </span>
                            </div>
                          </div>
                        </div>,
                      );
                    }
                    return renderUpcoming;
                  })()}
              </div>
            </div>
          </div>

          <div className="flex gap-3 h-[80px] shrink-0">
            <button
              onClick={() => setShowSystemSettings(true)}
              className="w-[80px] h-[80px] bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 text-[#1d2d6a] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[24px] shadow-sm flex items-center justify-center transition-all active:scale-95 group shrink-0"
            >
              <Settings
                size={32}
                className="text-[#1d2d6a] dark:text-white group-hover:rotate-90 transition-all duration-500"
              />
            </button>

            <div className="flex-1 bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[24px] shadow-sm flex items-center px-6 border border-slate-200 dark:border-slate-800/50 gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/30 text-[#ee6f1f] flex items-center justify-center shrink-0">
                <Clock size={26} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col border-r border-slate-100 dark:border-slate-800 pr-6">
                <span className="text-[#1d2d6a] dark:text-white font-bold text-3xl tracking-tighter leading-none">
                  {currentTime.toLocaleTimeString("id-ID", { hour12: false })}
                </span>
              </div>
              <div className="flex flex-col flex-1 justify-center text-right">
                <span className="text-[#1d2d6a] dark:text-white font-semibold text-3xl tracking-tighter uppercase leading-none">
                  {currentTime.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[0.35] flex flex-col gap-6">
          <button
            onClick={handlePrev}
            className="flex-1 bg-[#ee6f1f] hover:bg-[#ee6f1f] text-white rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-all active:scale-95 group overflow-hidden"
          >
            <ChevronsUp
              size={72}
              className="transition-transform group-hover:-translate-y-2 stroke-[3]"
            />
            <span className="text-3xl font-bold uppercase tracking-tight text-white">
              Previous Station
            </span>
          </button>

          <button
            onClick={handleNext}
            className="flex-1 bg-[#ee6f1f] hover:bg-[#ee6f1f] text-white rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-all active:scale-95 group overflow-hidden"
          >
            <span className="text-3xl font-bold uppercase tracking-tight">
              Next Station
            </span>
            <ChevronsDown
              size={72}
              className="transition-transform group-hover:translate-y-2 stroke-[3]"
            />
          </button>

          <div className="flex mt-2 h-[80px]">
            <button
              onClick={handleSelectStation}
              className="flex-1 bg-[#1d2d6a] hover:bg-[#152353] text-white rounded-[24px] font-bold tracking-wide shadow-md flex items-center justify-center gap-4 transition-transform active:scale-95 text-2xl border border-blue-900 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              <RefreshCcw
                size={32}
                className="group-hover:rotate-180 transition-transform duration-500"
              />{" "}
              SYNC DATA TO DISPLAY
            </button>
          </div>
        </div>

        <ServiceConfigModal
          show={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          trainNames={trainNames}
          routes={routes}
          coachCount={coachCount}
          onSetConfig={handleSetConfig}
          onSetGerbong={handleSetGerbong}
          initialTrainNameIndex={trainNameIndex}
          selectedGerbong={selectedGerbong}
          setSelectedGerbong={setSelectedGerbong}
        />

        <SystemSettingsModal
          show={showSystemSettings}
          onClose={() => setShowSystemSettings(false)}
          data={data}
          currentStation={currentStation}
          stations={stations}
          masterSyncedNumber={masterSyncedNumber}
          masterSyncedLedSpeed={masterSyncedLedSpeed}
          onSetLedSpeed={handleSetLedSpeed}
          ledType={ledType}
          onSetLedType={setLedType}
          handleLogout={handleLogout}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        <SelectorToast toast={toastMsg} onClose={() => setToastMsg(null)} />
      </div>
    </div>
  );
}

export default App;
