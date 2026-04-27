/** /command-center-app/src/pages/DashboardPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: DashboardPage */

import React, { useState, useEffect, useMemo } from "react";
import { Train, ArrowRight, LocateFixed, Clock, CheckCircle2, ChevronRight, Activity, Zap, Radio, MapPin, Gauge, Navigation, Volume2, ShieldCheck, Thermometer, Wifi, Users } from "lucide-react";
import MapComponent from "../components/MapComponent";
import { usePidsData } from "../hooks/usePidsData";

import { API } from "../config";

const DashboardPage: React.FC<{ setPage?: (page: string) => void }> = ({
  setPage,
}) => {
  const { data: pidsState } = usePidsData();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);
  const [focusedTrain, setFocusedTrain] = useState<string | null>(null);

  const getStationName = (s: any): string => {
    if (!s || s === "-") return "-";
    if (typeof s === "string") {
      const trimmed = s.trim();
      try {
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          return parsed.name || parsed.NAME || parsed.station_name || parsed.station || s;
        }
      } catch (e) { }
      return s;
    }
    if (typeof s === "object") {
      return s.name || s.NAME || s.station_name || s.station || s.id || "-";
    }
    return String(s);
  };

  const fetchData = async () => {
    try {
      const [schedRes, stnRes] = await Promise.all([
        fetch(`${API}/api/schedules`),
        fetch(`${API}/api/stations`)
      ]);
      const schedData = await schedRes.json();
      const stnData = await stnRes.json();

      if (schedData.success) {
        setSchedules(schedData.schedules);
      }
      if (stnData.success) {
        setStations(stnData.stations);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const lastLocRef = React.useRef<[number, number] | null>(null);

  const activeFleet = useMemo(() => {
    if (!pidsState.serviceName || pidsState.serviceName === "Belum Dikonfigurasi") {
      return [];
    }

    const currentServiceName = pidsState.serviceName.toUpperCase();
    const currentTrainNumber = (pidsState.trainNumber || "").toUpperCase().replace("KA ", "").trim();

    const activeSched = schedules.find(s => {
      const sName = (s.display_service_name || s.service_name || s.train_name || "").toUpperCase();
      const sNum = (s.display_train_number || s.train_number || s.ka_number || "").toUpperCase().trim();
      
      const cleanMatch = (a: string, b: string) => {
        if (!a || !b) return false;
        return a.includes(b) || b.includes(a);
      };

      return cleanMatch(sName, currentServiceName) && 
             (!currentTrainNumber || cleanMatch(sNum, currentTrainNumber));
    });

    const currentStnName = getStationName(pidsState.currentStation).toUpperCase();
    const stnInfo = stations.find(s => s.name.toUpperCase() === currentStnName || s.id.toUpperCase() === currentStnName);

    // Prioritize high-accuracy simGps if available and valid, otherwise snap to station coordinates
    let location: [number, number];

    const isValidGps = pidsState.simGps &&
      pidsState.simGps.lng !== 0 &&
      pidsState.simGps.lat !== 0 &&
      !isNaN(Number(pidsState.simGps.lng)) &&
      !isNaN(Number(pidsState.simGps.lat));

    if (isValidGps) {
      location = [Number(pidsState.simGps!.lng), Number(pidsState.simGps!.lat)];
      lastLocRef.current = location;
    } else if (stnInfo && stnInfo.longitude && stnInfo.latitude) {
      location = [Number(stnInfo.longitude), Number(stnInfo.latitude)];
      lastLocRef.current = location;
    } else if (lastLocRef.current) {
      location = lastLocRef.current;
    } else {
      // Default to Bandung (Neutral center for West/East Java routes)
      location = [107.6098, -6.9147];
    }

    let progress = 0;
    const totalStations = pidsState.stations?.length || 0;
    if (totalStations > 1) {
      const normalizedCurrent = getStationName(pidsState.currentStation).toUpperCase();
      const currentIndex = pidsState.stations.findIndex(s => getStationName(s).toUpperCase() === normalizedCurrent);
      if (currentIndex !== -1) {
        progress = Math.round((currentIndex / (totalStations - 1)) * 100);
      }
    }

    const trainNum = (pidsState.trainNumber || "").replace(/\s*(Coach|Gerbong)\s*\d+/gi, "").replace(/-G\d+$/i, "").replace(/^KA\s*/i, "").trim();

    // Fallback: If activeSched found a different train number, prioritize the one from pidsState
    const displayTrainNum = trainNum || (activeSched?.display_train_number || activeSched?.train_number || "");
    const serviceName = (pidsState.serviceName || activeSched?.service_name || "MALABAR").replace(/-G\d+$/i, "").replace(/\s+G\d+$/i, "").trim();

    const getTime = (obj: any, isArr: boolean) => {
      if (!obj) return null;
      if (isArr) {
        return obj.scheduled_arrival || obj.waktu_kedatangan_penjadwalan || obj.waktu_kedatangan || obj.arrival_time || obj.arrival || 
               obj.schedule_ka67 || obj.schedule_ka68 || obj.schedule_ka69 || obj.schedule_ka70;
      }
      return obj.scheduled_departure || obj.waktu_keberangkatan_penjadwalan || obj.waktu_keberangkatan || obj.departure_time || obj.departure || 
             obj.schedule_ka67 || obj.schedule_ka68 || obj.schedule_ka69 || obj.schedule_ka70;
    };

    const depTime = getTime(activeSched, false) ||
                    (activeSched?.stops && activeSched.stops.length > 0 ? getTime(activeSched.stops[0], false) : null) || 
                    "--:--";

    const arrTime = getTime(activeSched, true) ||
                    (activeSched?.stops && activeSched.stops.length > 0 ? getTime(activeSched.stops[activeSched.stops.length - 1], true) : null) || 
                    "--:--";

    return [{
      id: pidsState.trainNumber || (activeSched?.display_train_number || activeSched?.train_number) || "KA-LIVE",
      name: `${serviceName} ${displayTrainNum}`.trim(), // Combined label for consistency
      trainNum: displayTrainNum,
      status: pidsState.status || "Normal",
      progress: progress,
      nextStation: getStationName(pidsState.nextStation),
      currentStation: getStationName(pidsState.currentStation),
      depTime: depTime,
      arrTime: arrTime,
      origin: getStationName(pidsState.stations?.[0]) || activeSched?.departure_station || "---",
      destination: getStationName(pidsState.stations?.[totalStations - 1]) || activeSched?.arrival_station || "---",
      speed: pidsState.speed || 0,
      location: location,
      heading: pidsState.simGps?.heading || 0,
      eta: arrTime, // Use arrTime as ETA fallback
    }];
  }, [pidsState, schedules, stations]);

  const activeRouteLine: [number, number][] = useMemo(() => {
    if (!pidsState.stations || pidsState.stations.length === 0 || stations.length === 0) return [];
    return pidsState.stations.map(stn => {
      const stnName = getStationName(stn).toUpperCase();
      const dbStn = stations.find(s => s.name.toUpperCase() === stnName || s.id.toUpperCase() === stnName);
      if (dbStn && dbStn.longitude && dbStn.latitude) {
        return [Number(dbStn.longitude), Number(dbStn.latitude)];
      }
      return null;
    }).filter(Boolean) as [number, number][];
  }, [pidsState.stations, stations, focusedTrain]);

  useEffect(() => {
    setFocusLocation(null);
    setFocusedTrain(null);
  }, [pidsState.serviceName, pidsState.trainNumber]);

  const handleCardClick = (location: [number, number], trainId?: string) => {
    setFocusLocation([...location]);
    if (trainId) setFocusedTrain(trainId);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <main className="flex-grow">
        {/* Full-width Map Section with no margins */}
        <section className="relative w-full h-[60vh] bg-white dark:bg-slate-900 overflow-hidden border-b border-slate-200 dark:border-slate-800">
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            <div className="px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">
                Live
              </span>
            </div>
          </div>
          <MapComponent
            trains={activeFleet}
            focusCoord={focusLocation}
            routeLine={focusedTrain ? activeRouteLine : undefined}
            onAnalyze={() => setPage?.("schedules")}
            onMapClick={() => { setFocusLocation(null); setFocusedTrain(null); }}
            onTrainClick={(trainId, location) => handleCardClick(location, trainId)}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50/80 dark:from-slate-950/80 to-transparent z-10 pointer-events-none" />
        </section>

        {/* Content Section - Data Dense and Edge-to-Edge */}
        <section className="px-6 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 border-l-4 border-[#ee6f1f] pl-4">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#1d2d6a] dark:text-white leading-none">
                Fleet Operational Status
              </h2>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Real-time Telemetry and Arrival Forecasting</p>
            </div>
            <div className="bg-[#ee6f1f]/10 px-4 py-2 rounded-xl border border-[#ee6f1f]/20 backdrop-blur-md">
              <span className="text-[10px] font-bold text-[#ee6f1f] uppercase tracking-[0.1em] flex items-center gap-2">
                <Train size={12} />
                ACTIVE: {activeFleet.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading
              ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-56 bg-slate-200/50 dark:bg-slate-900 animate-pulse rounded-[2.5rem] border border-slate-200 dark:border-slate-800" />
              ))
              : activeFleet.map((s, i) => (
                <TransportLineCard
                  key={i}
                  trainName={s.name}
                  serviceNumber={s.id}
                  status={s.status}
                  progress={s.progress}
                  nextStation={s.nextStation}
                  currentStation={s.currentStation}
                  depTime={s.depTime}
                  arrTime={s.arrTime}
                  origin={s.origin}
                  destination={s.destination}
                  onClick={() => handleCardClick(s.location, s.id)}
                />
              ))}
            {!loading && activeFleet.length === 0 && (
              <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Train size={40} className="text-[#ee6f1f]" />
                </div>
                <p className="text-[#1d2d6a] dark:text-white font-bold text-xl uppercase tracking-tight">No Active Fleet Detected</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-[0.3em] mt-2 italic">Connect via Selector App to initialize telemetry</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const TransportLineCard: React.FC<{
  trainName: string;
  serviceNumber: string;
  status: string;
  progress: number;
  nextStation: string;
  currentStation: string;
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  onClick: () => void;
}> = ({ trainName, serviceNumber, status, progress, nextStation, currentStation, depTime, arrTime, origin, destination, onClick }) => {
  const isDelay = status?.toLowerCase().includes("lambat") || status?.toLowerCase().includes("delay") || status?.toLowerCase().includes("late");

  // Dummy PIC data
  const picName = "Budi Santoso";
  const picPhone = "+62 812-3456-7890";

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-[#ee6f1f] dark:hover:border-[#ee6f1f] transition-all hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] group text-left w-full relative overflow-hidden flex flex-col gap-4"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1d2d6a] dark:bg-blue-600/20 rounded-xl flex items-center justify-center text-white shadow-inner transition-transform group-hover:scale-110">
            <Train size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Service</span>
            <span className="text-sm font-bold text-[#1d2d6a] dark:text-white uppercase leading-none tracking-tight">{trainName}</span>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 ${!isDelay ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${!isDelay ? "bg-green-500" : "bg-amber-500"} animate-pulse`} />
          {status || "NORMAL"}
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{origin}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={10} />
              <span className="text-[10px] font-bold font-mono">{depTime}</span>
            </div>
          </div>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-[2.5px]" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ee6f1f]" />
              <span className="text-[11px] font-semibold text-[#ee6f1f] uppercase tracking-tight">{destination}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ee6f1f]">
              <Clock size={10} />
              <span className="text-[10px] font-bold font-mono">{arrTime}</span>
            </div>
          </div>
        </div>
        <div className="pl-6 text-right border-l border-slate-200 dark:border-slate-700 ml-6 shrink-0">
          <div className="text-[18px] font-bold text-[#1d2d6a] dark:text-blue-400 leading-none">{progress}%</div>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mt-1">Progress</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1">
            <LocateFixed size={10} /> CURRENT
          </p>
          <p className="text-[11px] font-semibold text-[#1d2d6a] dark:text-white uppercase truncate">{currentStation}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1">
            <Clock size={10} /> NEXT ETA
          </p>
          <p className="text-[11px] font-semibold text-[#ee6f1f] uppercase truncate">{nextStation}</p>
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
