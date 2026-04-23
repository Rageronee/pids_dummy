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
      } catch (e) {}
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
      return (sName === currentServiceName || currentServiceName.includes(sName)) &&
             (currentTrainNumber ? sNum.includes(currentTrainNumber) : true);
    });

    const currentStnName = getStationName(pidsState.currentStation).toUpperCase();
    const stnInfo = stations.find(s => s.name.toUpperCase() === currentStnName || s.id.toUpperCase() === currentStnName);
    
    // Prioritize high-accuracy simGps if available, otherwise snap to station
    let location: [number, number] = [106.8272, -6.1751];
    
    if (pidsState.simGps) {
      location = [Number(pidsState.simGps.lng), Number(pidsState.simGps.lat)];
      lastLocRef.current = location;
    } else if (lastLocRef.current) {
      location = lastLocRef.current;
    } else if (stnInfo) {
      location = [Number(stnInfo.longitude), Number(stnInfo.latitude)];
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

    return [{
      id: pidsState.trainNumber || (activeSched?.display_train_number || activeSched?.train_number) || "KA-LIVE",
      name: pidsState.serviceName,
      status: pidsState.status || "Normal",
      progress: progress,
      nextStation: getStationName(pidsState.nextStation),
      currentStation: getStationName(pidsState.currentStation),
      depTime: activeSched?.scheduled_departure || activeSched?.waktu_keberangkatan_penjadwalan || "--:--",
      arrTime: activeSched?.scheduled_arrival || activeSched?.waktu_kedatangan_penjadwalan || "--:--",
      origin: getStationName(pidsState.stations?.[0]) || activeSched?.departure_station || "---",
      destination: getStationName(pidsState.stations?.[totalStations - 1]) || activeSched?.arrival_station || "---",
      speed: pidsState.speed || 0,
      location: location,
      heading: pidsState.simGps?.heading || 0,
      eta: activeSched?.scheduled_arrival || activeSched?.waktu_kedatangan_penjadwalan || "--:--",
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

  const handleCardClick = (location: [number, number], trainId?: string) => {
    setFocusLocation([...location]);
    if (trainId) setFocusedTrain(trainId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <main className="flex-grow overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300">
        <section className="relative w-full h-[450px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/50 shadow-sm group bg-white dark:bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Live Fleet Tracking
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
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f8fafc] dark:from-slate-950 to-transparent z-10 pointer-events-none" />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Active Fleet Status & Real-time ETA
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-5">
            {loading
              ? Array(1).fill(0).map((_, i) => (
                  <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2rem] border border-slate-200 dark:border-slate-800" />
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
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-800">
                <div className="bg-orange-50 dark:bg-orange-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Train size={32} className="text-[#ee6f1f]" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-base">Tidak ada armada aktif.</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Aktifkan servis melalui aplikasi Selector.</p>
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
      className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.25rem] p-6 border border-slate-200 dark:border-slate-800/50 shadow-sm hover:border-[#ee6f1f] dark:hover:border-[#ee6f1f] transition-all hover:shadow-xl group text-left w-full relative overflow-hidden flex flex-col xl:flex-row gap-6 items-center"
    >
      <div className="flex-1 w-full xl:w-auto min-w-[250px]">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1d2d6a] dark:bg-[#020617] rounded-xl text-white shadow-lg shadow-blue-900/20 transition-transform group-hover:scale-110 shrink-0">
              <Train size={20} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{trainName}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{serviceNumber}</span>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${!isDelay ? "bg-green-500 text-white" : "bg-amber-500 text-white"}`}>
            {status || "NORMAL"}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Users size={14} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Kondektur / PIC</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{picName}</span>
            <span className="text-[10px] font-medium text-slate-500">{picPhone}</span>
          </div>
        </div>
      </div>

      <div className="flex-[1.5] w-full xl:w-auto xl:border-l border-slate-100 dark:border-slate-800 px-0 xl:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asal</span>
            <span className="text-xs font-bold text-[#1d2d6a] dark:text-slate-300 truncate max-w-[120px]" title={origin}>{origin}</span>
            <span className="text-[10px] font-mono font-bold mt-1 text-slate-500">{depTime}</span>
          </div>
          <div className="flex-1 px-4 flex flex-col items-center">
             <div className="text-[10px] font-black text-[#ee6f1f] mb-1">{progress}%</div>
             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
               <div className={`h-full transition-all duration-1000 rounded-full ${isDelay ? "bg-amber-500" : "bg-[#ee6f1f]"}`} style={{ width: `${progress}%` }} />
             </div>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tujuan</span>
            <span className="text-xs font-bold text-[#ee6f1f] truncate max-w-[120px]" title={destination}>{destination}</span>
            <span className="text-[10px] font-mono font-bold mt-1 text-slate-500">{arrTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
               <LocateFixed size={10} /> Posisi Sekarang
             </span>
             <span className="text-[11px] font-black text-[#1d2d6a] dark:text-white uppercase truncate">{currentStation}</span>
          </div>
          <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-4">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
               Berhenti Berikutnya
             </span>
             <span className="text-[11px] font-black text-[#1d2d6a] dark:text-slate-300 uppercase truncate">{nextStation}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
