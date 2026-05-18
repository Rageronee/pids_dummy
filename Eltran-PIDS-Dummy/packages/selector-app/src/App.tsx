/** /selector-app/src/App.tsx — untuk mengubah: komponen PIDS selector LED 5inch; fungsi utama: App Selector */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    isVerifying,
  } = sync;

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("selector_theme");
    return saved ? saved === "dark" : false;
  });
  const lastUserActionRef = useRef<number>(0);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("selector_theme", isDark ? "dark" : "light");
  }, [isDark]);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("selector_current_index");
    return saved ? parseInt(saved, 10) : 0;
  });
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
  const [selectedGerbong, setSelectedGerbong] = useState(() => {
    const saved = localStorage.getItem("selector_selected_gerbong");
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    localStorage.setItem("selector_current_index", currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem("selector_selected_gerbong", selectedGerbong.toString());
  }, [selectedGerbong]);

  useEffect(() => {
    const normalizedMaster = masterSyncedServiceName?.toUpperCase();
    const idx = trainNames.findIndex(n => n.toUpperCase() === normalizedMaster);
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
  const [isAutoSync, setIsAutoSync] = useState(() => {
    const saved = localStorage.getItem("selector_auto_sync");
    return saved ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("selector_auto_sync", isAutoSync.toString());
  }, [isAutoSync]);

  const [activeKa, setActiveKa] = useState<string>(() => {
    const saved = localStorage.getItem("selector_active_ka");
    return saved || "";
  });

  useEffect(() => {
    localStorage.setItem("selector_active_ka", activeKa);
  }, [activeKa]);

  useEffect(() => {
    // Only sync from master if auto-sync is ON and user hasn't interacted recently
    if (!isAutoSync) return;
    if (Date.now() - lastUserActionRef.current < 5000) return;

    if (masterSyncedNumber) {
      const kaMatch = masterSyncedNumber.replace(/\s+/g, "").match(/ka(\d+)/i);
      if (kaMatch) {
        const normalized = `ka${kaMatch[1]}`;
        if (activeKa !== normalized) {
          setActiveKa(normalized);
        }
      }
    }
  }, [masterSyncedNumber, isAutoSync]);


  useEffect(() => {
    if (!isAutoSync) return;
    if (Date.now() - lastUserActionRef.current < 10000) return;

    if (data?.currentStation && stations.length > 0) {
      const currentName = String(
        typeof data.currentStation === "object"
          ? (data.currentStation as any).name
          : data.currentStation || ""
      ).toUpperCase().trim();

      const idx = stations.findIndex(s => {
        const sName = String(typeof s === "object" ? (s as any).name : s || "").toUpperCase().trim();
        return sName === currentName;
      });

      if (idx !== -1 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  }, [data?.currentStation, stations, currentIndex]);


  const resolveRouteFeatures = useCallback((routeObj: any) => {
    if (!routeObj) return null;
    if (routeObj.features) return routeObj.features;
    if (routeObj.geojson) {
      try {
        const parsed = typeof routeObj.geojson === "string" ? JSON.parse(routeObj.geojson) : routeObj.geojson;
        return parsed?.features || null;
      } catch { return null; }
    }
    return null;
  }, []);

  const getScheduledTime = useCallback(
    (stationName: any) => {
      const name =
        typeof stationName === "object" && stationName !== null
          ? stationName.name
          : stationName;
      const nameStr = String(name ?? "").trim().toUpperCase();
      if (!nameStr) return null;

      const kaId = activeKa.toLowerCase().replace(/\s+/g, "").replace("ka", "");
      // Remove trailing letters like 'b' in '257b' to match 'schedule_ka257'
      const kaIdNum = kaId.replace(/[a-z]/gi, "");

      const expectedKey = `schedule_ka${kaId}`;
      const expectedKeyNum = `schedule_ka${kaIdNum}`;

      const candidateRoutes = [
        data?.activeRoute,
        routes?.[masterSyncedServiceName],
      ].filter(Boolean);

      for (const route of candidateRoutes) {
        const stationsArr = route?.stations;
        if (Array.isArray(stationsArr)) {
          const stObj = stationsArr.find((s: any) => {
            const sName = String(typeof s === "object" ? s.name : s || "").toUpperCase().trim();
            return sName === nameStr;
          });
          if (stObj && typeof stObj === "object") {
            const key = Object.keys(stObj).find(
              (k) => {
                const normalized = k.toLowerCase().replace(/\s+/g, "");
                return normalized === expectedKey || normalized === expectedKeyNum;
              }
            );
            if (key) {
              const raw = String(stObj[key] ?? "");
              if (raw) {
                const parts = raw.split(":");
                return parts.length >= 2
                  ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
                  : raw;
              }
            }
          }
        }

        const features = resolveRouteFeatures(route);
        if (features) {
          const stationFeature = features.find(
            (f: any) =>
              f.geometry?.type === "Point" &&
              String(f.properties?.name ?? "").toUpperCase().trim() === nameStr,
          );
          if (stationFeature) {
            const props = stationFeature.properties || {};
            const key = Object.keys(props).find(
              (k) => {
                const normalized = k.toLowerCase().replace(/\s+/g, "");
                return normalized === expectedKey || normalized === expectedKeyNum;
              }
            );
            if (key) {
              const raw = String(props[key] ?? "");
              if (raw) {
                const parts = raw.split(":");
                return parts.length >= 2
                  ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
                  : raw;
              }
            }
          }
        }
      }

      return null;
    },
    [data?.activeRoute, activeKa, masterSyncedServiceName, routes, resolveRouteFeatures],
  );

  const getTrainId = useCallback((ka: string) => ka.toUpperCase().replace(/^KA\s*/i, ""), []);

  const getSmallestKa = useCallback((route: any) => {
    const features = resolveRouteFeatures(route);
    const directions = features?.find(
      (f: any) => f.geometry?.type === "LineString",
    )?.properties?.available_directions;
    if (directions && directions.length > 0) {
      const sorted = [...directions].sort((a: any, b: any) =>
        a.num.localeCompare(b.num, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      return sorted[0].num;
    }
    return null;
  }, [resolveRouteFeatures]);

  const showNotification = useCallback((title: string, message: string) => {
    setToastMsg({ title, message, id: Date.now() });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 5000);
  }, []);
  const handlePrev = useCallback(() => {
    lastUserActionRef.current = Date.now();
    setIsAutoSync(false);
    setCurrentIndex((prev) => {
      const nextIdx = (prev - 1 + stations.length) % stations.length;
      sendData({
        currentStation: stations[nextIdx],
        nextStation: stations[(nextIdx + 1) % stations.length],
        isSyncing: true,
      });
      return nextIdx;
    });
  }, [stations, sendData, setIsAutoSync]);

  const handleNext = useCallback(() => {
    lastUserActionRef.current = Date.now();
    setIsAutoSync(false);
    setCurrentIndex((prev) => {
      const nextIdx = (prev + 1) % stations.length;
      sendData({
        currentStation: stations[nextIdx],
        nextStation: stations[(nextIdx + 1) % stations.length],
        isSyncing: true,
      });
      return nextIdx;
    });
  }, [stations, sendData, setIsAutoSync]);

  const handleSelectStation = useCallback(() => {
    setIsAutoSync(false);
    sendData({
      currentStation: stations[currentIndex],
      nextStation: stations[(currentIndex + 1) % stations.length],
      isSyncing: true,
    });
    showNotification("Sync Completed", "Station display status updated.");
  }, [stations, currentIndex, sendData, showNotification, setIsAutoSync]);



  const handleSetConfig = useCallback(
    (
      serviceName: string,
      routeData: any,
      newStations: string[],
      gerbong: number,
    ) => {
      setIsAutoSync(false);
      if (newStations.length > 0) {
        const newIndex = 0;
        setStations(newStations);
        setCurrentIndex(newIndex);
      }
      setSelectedGerbong(gerbong);
      const minKa = getSmallestKa(routeData);
      const resolvedKa = minKa ? `ka${minKa}` : activeKa;
      if (minKa) setActiveKa(resolvedKa);

      sendData({
        serviceName,
        stations: newStations,
        currentStation: getStationName(newStations[0]),
        nextStation: getStationName(newStations[1]),
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
      setIsAutoSync,
    ],
  );

  const handleSetGerbong = useCallback(
    (gerbong: number) => {
      setIsAutoSync(false);
      setSelectedGerbong(gerbong);
      sendData({ trainNumber: `${getTrainId(activeKa)} Gerbong ${gerbong}` });
      showNotification(
        "Configuration Saved",
        `Unit configuration set to Gerbong ${gerbong}`,
      );
    },
    [sendData, showNotification, getTrainId, activeKa, setIsAutoSync],
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
  const isProgo = masterSyncedServiceName?.toUpperCase().includes("PROGO");
  const fallbackRouteKey = isProgo ? "PROGO_GO" : "MALABAR_GO";
  const resolvedFeatures = useMemo(() => {
    return resolveRouteFeatures(activeRouteAny) || resolveRouteFeatures(routes?.[fallbackRouteKey]) || resolveRouteFeatures(routes?.MALABAR_GO) || [];
  }, [activeRouteAny, routes, fallbackRouteKey, resolveRouteFeatures]);

  const availableDirections: { num: string; label: string }[] = useMemo(() => {
    return resolvedFeatures?.find((f: any) => f.geometry?.type === "LineString")
      ?.properties?.available_directions || [];
  }, [resolvedFeatures]);

  // Auto-switch direction when service changes to prevent "stuck" state
  useEffect(() => {
    if (!masterSyncedServiceName) return;

    const currentSvc = masterSyncedServiceName.toUpperCase();
    const activeRouteSvc = (data?.activeRoute as any)?.service_name?.toUpperCase() || "";

    // If service changed and active route is from different service, reset activeKa
    if (activeRouteSvc && currentSvc !== activeRouteSvc) {
      if (availableDirections.length > 0) {
        const firstDir = availableDirections[0];
        setActiveKa(`ka${firstDir.num}`);
      }
    }
  }, [masterSyncedServiceName, availableDirections, data?.activeRoute]);
  const formatDirLabel = (label: string) => {
    const cityMap: Record<string, string> = {
      BANDUNG: "BD",
      MALANG: "ML",
      LEMPUYANGAN: "LPN",
      "PASAR SENEN": "PSE",
      "YOGYAKARTA": "YK",
      "SURABAYA": "SBY",
      "PASARSENEN": "PSE"
    };

    // If it's a direction object, try to construct a nicer label if it's still GO/BACK
    if (label === "GO" || label === "BACK") {
      const dir = availableDirections.find(d => d.label === label);
      if (dir) return `KA ${dir.num}`;
    }

    return label.replace(/^KA\s+/i, "KA ").replace(
      /\(([^)]+?)\s*->?\s*([^)]+?)\)/,
      (_: string, from: string, to: string) => {
        const f = from.trim().toUpperCase();
        const t = to.trim().toUpperCase();
        const abbr = (s: string) =>
          cityMap[s] || s.substring(0, 3).toUpperCase();
        return `(${abbr(f)}-${abbr(t)})`;
      },
    );
  };

  const handleChangeDirection = useCallback(
    (newKa: string) => {
      const normalizedKa = newKa.toLowerCase().replace(/\s+/g, "");
      setActiveKa(normalizedKa);
      setKaDropdownOpen(false);
      lastUserActionRef.current = Date.now(); // Mark user action to prevent auto-sync override
      setIsAutoSync(false);

      if (stations.length < 2) return;

      const num = normalizedKa.replace("ka", "");

      let targetRouteName = "";
      const dirEntry = availableDirections.find(d => {
        const dNum = d.num.toLowerCase();
        const targetNum = num.toLowerCase();
        return dNum === targetNum || targetNum.startsWith(dNum) || dNum.startsWith(targetNum);
      });

      if (dirEntry && (dirEntry as any).routeKey) {
        targetRouteName = (dirEntry as any).routeKey;
      } else {
        // Fallback: Guess service from number if routeKey is missing
        const n = parseInt(num);
        if (n >= 67 && n <= 70) targetRouteName = "MALABAR_GO";
        else if (n >= 257 && n <= 258) targetRouteName = "PROGO_GO";
        else targetRouteName = masterSyncedServiceName;
      }

      let finalRouteData: any = routes?.[targetRouteName] || data?.activeRoute || routes?.[masterSyncedServiceName];
      let newStations = finalRouteData?.stations ? [...finalRouteData.stations] : [...stations];

      // Derive display service name (PROGO or MALABAR)
      const displayService = targetRouteName.toUpperCase().includes("PROGO") ? "PROGO" :
        targetRouteName.toUpperCase().includes("MALABAR") ? "MALABAR" :
          masterSyncedServiceName;

      const features = resolveRouteFeatures(finalRouteData);
      if (features) {
        const kaBase = normalizedKa.replace(/[a-z]/g, "");
        const originFeature = features.find(
          (f: any) =>
            f.properties?.[`is_origin_ka${kaBase}`] === true ||
            f.properties?.[`is_origin_${normalizedKa}`] === true,
        );
        if (originFeature) {
          const originName = String(originFeature.properties.name || "").toUpperCase().trim();
          const firstName = String(getStationName(newStations[0]) || "").toUpperCase().trim();
          if (firstName !== originName) {
            newStations.reverse();
          }
        }
      }

      let newIndex = 0;

      setStations(newStations);
      setCurrentIndex(newIndex);

      sendData({
        serviceName: displayService, // Use derived service name to prevent "PROGO 68"
        stations: newStations,
        currentStation: getStationName(newStations[0]),
        trainNumber: normalizedKa.toUpperCase(),
        activeRoute: finalRouteData,
        isSyncing: true,
      });

      showNotification(
        "Direction Changed",
        `Route direction set for ${normalizedKa.toUpperCase()} (${displayService}) sync.`,
      );
    },
    [
      stations,
      setStations,
      sendData,
      showNotification,
      data?.activeRoute,
      routes,
      masterSyncedServiceName,
      resolveRouteFeatures,
      availableDirections,
      setIsAutoSync
    ],
  );
  if (isVerifying) {
    return (
      <div className={`flex h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950 ${isDark ? "dark" : ""}`}>
        <div className="text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase text-sm">Memverifikasi Sesi...</div>
      </div>
    );
  }

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
                  {(masterSyncedServiceName || "NOT SET").replace(/^KA\s+/i, "")}
                </h1>
                <ChevronRight
                  className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all"
                  size={24}
                />
              </div>
            </div>
          </button>

          {(masterSyncedServiceName?.toUpperCase().includes("MALABAR") || masterSyncedServiceName?.toUpperCase().includes("PROGO")) && (
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
                      {activeKa ? (
                        availableDirections.length > 0
                          ? formatDirLabel(
                            availableDirections.find(
                              (d) => {
                                const dNum = d.num.toLowerCase();
                                const actKa = activeKa.toLowerCase().replace("ka", "");
                                return dNum === actKa || actKa.startsWith(dNum);
                              }
                            )?.label ?? activeKa,
                          )
                          : activeKa.toUpperCase()
                      ) : "--- PILIH SERVICE ---"}
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
                        className={`w-full text-left px-5 py-3 text-sm font-bold uppercase transition-colors ${activeKa.toLowerCase() === `ka${dir.num.toLowerCase()}` ||
                            activeKa.toLowerCase() === `ka${dir.num.toLowerCase()}b`
                            ? "bg-[#ee6f1f] text-white"
                            : "text-[#1d2d6a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        {formatDirLabel(dir.label)}
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-3 text-xs font-semibold text-slate-400 italic">
                      No directions available
                    </div>
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
                {getStationName(stations[stations.length - 1]) || "---"}
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
          <div className="bg-white dark:bg-gradient-to-r dark:bg-slate-900/40 backdrop-blur-sm rounded-[24px] shadow-sm p-6 border border-slate-200 dark:border-slate-800/50 flex flex-col transition-colors">
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
                      <span className="text-3xl text-slate-700 dark:text-white font-bold tracking-tight uppercase shrink-0 min-w-0 pr-4 line-clamp-2 break-words">
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
                    return stations.slice(2).map((_, i: number) => {
                      const idxInFull = (currentIndex + i + 2) % stations.length;
                      const actualStation = stations[idxInFull];
                      const upcomingStationName = getStationName(actualStation);

                      if (actualStation === stations[currentIndex]) return null;

                      return (
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
                              <span className="text-lg font-semibold text-slate-700 dark:text-white uppercase tracking-tight line-clamp-1 break-words">
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
                                    currentTime.getTime() + 15 * (i + 2) * 60000,
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
                        </div>
                      );
                    });
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
              SYNC DISPLAY
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
          isAutoSync={isAutoSync}
          setIsAutoSync={setIsAutoSync}
        />

        <SelectorToast toast={toastMsg} onClose={() => setToastMsg(null)} />
      </div>
    </div>
  );
}

export default App;
