/** /command-center-app/src/pages/DashboardPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: DashboardPage */

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  MapPin,
  Server,
  ShieldAlert,
  Train,
  Clock,
  Zap,
  Navigation2,
  Cloud,
  ArrowRight,
} from "lucide-react";
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

  // Helper to robustly extract station name from string, JSON string, or object
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

  // Filter to show only the currently active train being simulated
  const activeFleet = useMemo(() => {
    if (!pidsState.serviceName || pidsState.serviceName === "Belum Dikonfigurasi") {
      return [];
    }

    const currentServiceName = pidsState.serviceName.toUpperCase();
    const currentTrainNumber = (pidsState.trainNumber || "").toUpperCase().replace("KA ", "").trim();

    // Smart matching: filter schedules to find the one matching both service name and train number
    const activeSched = schedules.find(s => {
      const sName = (s.display_service_name || s.service_name || s.train_name || "").toUpperCase();
      const sNum = (s.display_train_number || s.train_number || s.ka_number || "").toUpperCase().trim();

      const nameMatch = sName === currentServiceName || currentServiceName.includes(sName) || sName.includes(currentServiceName);
      const numMatch = currentTrainNumber && sNum ? (sNum === currentTrainNumber || currentTrainNumber.includes(sNum) || sNum.includes(currentTrainNumber)) : true;

      return nameMatch && numMatch;
    }) || schedules.find(s => {
      // Fallback to name only if no specific number match
      const sName = (s.display_service_name || s.service_name || s.train_name || "").toUpperCase();
      return sName === currentServiceName || currentServiceName.includes(sName) || sName.includes(currentServiceName);
    });

    const currentStnName = getStationName(pidsState.currentStation).toUpperCase();
    const stnInfo = stations.find(s => s.name.toUpperCase() === currentStnName || s.id.toUpperCase() === currentStnName);
    const location: [number, number] = stnInfo ? [Number(stnInfo.longitude), Number(stnInfo.latitude)] : [106.8272, -6.1751];

    let progress = 0;
    const totalStations = pidsState.stations?.length || 0;
    if (totalStations > 1) {
      const normalizedCurrent = getStationName(pidsState.currentStation).toUpperCase();
      const currentIndex = pidsState.stations.findIndex(s => getStationName(s).toUpperCase() === normalizedCurrent);
      if (currentIndex !== -1) {
        progress = Math.round((currentIndex / (totalStations - 1)) * 100);
      }
    }

    const origin = getStationName(pidsState.stations?.[0]) || activeSched?.departure_station || "---";
    const destination = getStationName(pidsState.stations?.[totalStations - 1]) || activeSched?.arrival_station || "---";

    return [{
      id: pidsState.trainNumber || (activeSched?.display_train_number || activeSched?.train_number) || "KA-LIVE",
      name: pidsState.serviceName,
      status: pidsState.status || "Normal",
      progress: progress,
      nextStation: getStationName(pidsState.nextStation),
      currentStation: getStationName(pidsState.currentStation),
      depTime: activeSched?.scheduled_departure || activeSched?.waktu_keberangkatan_penjadwalan || "--:--",
      arrTime: activeSched?.scheduled_arrival || activeSched?.waktu_kedatangan_penjadwalan || "--:--",
      origin: origin,
      destination: destination,
      speed: pidsState.speed || 0,
      location: location,
      eta: activeSched?.scheduled_arrival || activeSched?.waktu_kedatangan_penjadwalan || "--:--",
    }];
  }, [pidsState, schedules, stations]);

  const handleCardClick = (location: [number, number]) => {
    setFocusLocation([...location]);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-black text-slate-900 dark:text-slate-200 overflow-hidden font-sans">
      <main className="flex-grow overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300">
        <section className="relative w-full h-[450px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
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
            onAnalyze={() => setPage?.("schedules")}
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f8fafc] dark:from-black to-transparent z-10 pointer-events-none" />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Fleet Status & ETA
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array(1).fill(0).map((_, i) => (
                  <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800" />
                ))
              : activeFleet.map((s, i) => (
                  <TransportLineCard
                    key={i}
                    trainName={s.name}
                    serviceNumber={s.id}
                    status={s.status}
                    progress={s.progress}
                    nextStation={s.nextStation}
                    depTime={s.depTime}
                    arrTime={s.arrTime}
                    origin={s.origin}
                    destination={s.destination}
                    onClick={() => handleCardClick(s.location)}
                  />
                ))}
            {!loading && activeFleet.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
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
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  onClick: () => void;
}> = ({ trainName, serviceNumber, status, progress, nextStation, depTime, arrTime, origin, destination, onClick }) => {
  const isDelay = status?.toLowerCase().includes("lambat") || status?.toLowerCase().includes("delay") || status?.toLowerCase().includes("late");

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#ee6f1f] dark:hover:border-[#ee6f1f] transition-all hover:shadow-md group text-left w-full"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-[#1d2d6a] dark:text-blue-400">
            <Train size={18} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{trainName}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{serviceNumber}</span>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${!isDelay ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
          {status || "NORMAL"}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em]">Origin</span>
          <span className="text-[10px] font-bold text-[#1d2d6a] dark:text-slate-300 truncate max-w-[80px]">{origin}</span>
        </div>
        <ArrowRight size={10} className="text-slate-300" />
        <div className="flex flex-col text-right">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em]">Destination</span>
          <span className="text-[10px] font-bold text-[#ee6f1f] truncate max-w-[80px]">{destination}</span>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Next Point</span>
            <span className="text-xs font-bold text-[#1d2d6a] dark:text-white uppercase truncate max-w-[120px]">{nextStation}</span>
          </div>
          <span className="text-[10px] font-black text-[#ee6f1f]">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 rounded-full ${isDelay ? "bg-amber-500" : "bg-[#ee6f1f]"}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
        <div className="flex flex-col">
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">DEPARTURE</p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono tracking-tight">{depTime}</p>
        </div>
        <div className="flex flex-col text-right">
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">ARRIVAL</p>
          <p className="text-sm font-black text-[#ee6f1f] font-mono tracking-tight">{arrTime}</p>
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
