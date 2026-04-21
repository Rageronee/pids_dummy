/** /command-center-app/src/pages/DashboardPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: DashboardPage */

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import MapComponent from "../components/MapComponent";

import { API } from "../config";

const DashboardPage: React.FC<{ setPage?: (page: string) => void }> = ({
  setPage,
}) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated live train data for the map
  const [liveTrains] = useState<any[]>([
    { id: "KA123", name: "ARGO WILIS", location: [106.8272, -6.1751], status: "Normal", speed: 85, eta: "10:30" },
    { id: "KA456", name: "MALABAR", location: [107.6098, -6.9175], status: "Delay", speed: 45, eta: "11:15" },
    { id: "KA789", name: "PARAHYANGAN", location: [107.1234, -6.4567], status: "Normal", speed: 95, eta: "10:45" },
  ]);

  const fetchData = async () => {
    try {
      const schedRes = await fetch(`${API}/api/schedules`);
      const schedData = await schedRes.json();

      if (schedData.success) {
        setSchedules(schedData.schedules.slice(0, 8));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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
          <MapComponent trains={liveTrains} />
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
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800"
                    />
                  ))
              : schedules.map((s, i) => (
                  <TransportLineCard
                    key={s.id || i}
                    trainName={s.display_train_name || s.train_name || "KERETA"}
                    serviceNumber={s.display_train_number || s.train_number || s.ka_number || "-"}
                    status={s.status_keberangkatan || "Normal"}
                    progress={Math.floor(Math.random() * 60) + 20}
                    nextStation={s.stasiun_tujuan || "---"}
                    depTime={s.waktu_keberangkatan_penjadwalan || "--:--"}
                    arrTime={s.waktu_kedatangan_penjadwalan || "--:--"}
                    onClick={() => setPage?.("schedules")}
                  />
                ))}
            {!loading && schedules.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                <p className="text-slate-400 font-medium text-sm">
                  Tidak ada jadwal aktif terdeteksi.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  status: "success" | "warning" | "error" | "info";
  icon: React.ReactNode;
  trend?: string;
}> = ({ title, value, status, icon, trend }) => {
  const statusColors = {
    success: "text-green-600 bg-green-50",
    warning: "text-amber-600 bg-amber-50",
    error: "text-rose-600 bg-rose-50",
    info: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`p-3 rounded-2xl transition-colors duration-300 ${statusColors[status]}`}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`text-[9px] font-semibold px-2 py-1 rounded-lg ${statusColors[status]}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
};

const LogItem: React.FC<{
  time: string;
  tag: string;
  msg: string;
  type: "info" | "success" | "warning";
}> = ({ time, tag, msg, type }) => {
  const typeStyles = {
    info: "text-blue-600",
    success: "text-green-600",
    warning: "text-amber-600",
  };

  return (
    <div className="text-[11px] leading-relaxed group hover:bg-slate-50 p-1 rounded-lg transition-colors">
      <div className="flex gap-3 items-center">
        <span className="text-slate-400 tabular-nums shrink-0 font-medium">
          {time}
        </span>
        <span
          className={`text-[10px] font-semibold tracking-wider shrink-0 uppercase ${typeStyles[type]}`}
        >
          {tag}
        </span>
        <span className="text-slate-600 font-medium truncate">{msg}</span>
      </div>
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
  onClick: () => void;
}> = ({ trainName, serviceNumber, status, progress, nextStation, depTime, arrTime, onClick }) => {
  const isDelay = status?.toLowerCase().includes("lambat") || status?.toLowerCase().includes("delay");

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
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">{trainName}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{serviceNumber}</span>
          </div>
        </div>
        <div
          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${!isDelay ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}
        >
          {status || "NORMAL"}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Next Point</span>
            <span className="text-xs font-bold text-[#1d2d6a] dark:text-white uppercase">{nextStation}</span>
          </div>
          <span className="text-[10px] font-black text-[#ee6f1f]">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${isDelay ? "bg-amber-500" : "bg-[#ee6f1f]"}`}
            style={{ width: `${progress}%` }}
          />
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
