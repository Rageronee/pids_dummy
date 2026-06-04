/** /command-center-app/src/pages/NotificationsPage.tsx — untuk mengubah: halaman riwayat notifikasi; fungsi utama: NotificationsPage */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ChevronRight,
  Activity,
  Phone,
  ShieldAlert,
  Wifi,
  Cpu,
  RefreshCw,
  FileText,
  Check,
  Share2,
  Thermometer,
  Wind,
  Server,
  Database,
  HardDrive,
  Lock,
  ExternalLink,
  X,
  PhoneOff,
  Mic,
  Volume2,
  Radio,
  Loader2,
  User,
  ShieldCheck
} from "lucide-react";
import { NotificationItem } from "../App";

interface NotificationsPageProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  selectedNotifId: number | null;
  setSelectedNotifId: React.Dispatch<React.SetStateAction<number | null>>;
}

interface Toast {
  id: number;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error" | "loading";
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  setNotifications,
  selectedNotifId,
  setSelectedNotifId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeModal, setActiveModal] = useState<"call" | "dispatch" | "reboot" | null>(null);

  const [callState, setCallState] = useState<"dialing" | "connected" | "ended">("dialing");
  const [callTimer, setCallTimer] = useState(0);

  const [dispatchStep, setDispatchStep] = useState<"config" | "dispatching" | "dispatched">("config");
  const [crewSize, setCrewSize] = useState(5);
  const [vehicleType, setVehicleType] = useState("Rescue Train RT-12");

  const [rebootProgress, setRebootProgress] = useState(0);
  const [rebootStage, setRebootStage] = useState("");

  const addToast = (title: string, message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    if (type !== "loading") {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeModal === "call" && callState === "connected") {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else if (activeModal === "call" && callState === "dialing") {
      const dialTimeout = setTimeout(() => {
        setCallState("connected");
      }, 2000);
      return () => {
        clearTimeout(dialTimeout);
      };
    } else if (activeModal !== "call") {
      setCallState("dialing");
      setCallTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeModal, callState]);

  const handleStartCall = () => {
    setCallState("dialing");
    setCallTimer(0);
    setActiveModal("call");
  };

  const handleStartDispatch = () => {
    setDispatchStep("dispatching");
    setTimeout(() => {
      setDispatchStep("dispatched");
      addToast("Rescue Dispatched", "Rescue crew size " + crewSize + " successfully dispatched via " + vehicleType, "success");
      setTimeout(() => {
        setActiveModal(null);
        setDispatchStep("config");
      }, 1500);
    }, 2000);
  };

  const handleStartReboot = () => {
    setActiveModal("reboot");
    setRebootProgress(0);
    setRebootStage("Initiating connection to Train router...");
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setRebootProgress(progress);
      if (progress === 30) {
        setRebootStage("Sending OTA system reset signal...");
      } else if (progress === 60) {
        setRebootStage("Verifying GPS module handshake...");
      } else if (progress === 90) {
        setRebootStage("Calibrating latency parameters...");
      } else if (progress >= 100) {
        clearInterval(interval);
        setRebootStage("Completed successfully.");
        setTimeout(() => {
          setActiveModal(null);
          addToast("GPS Rebooted", "GPS module re-synchronized. Current Latency: 12ms", "success");
        }, 800);
      }
    }, 300);
  };

  const handlePingDiagnostics = () => {
    addToast("Ping Node", "Pinging telemetry device node NODE-TEL-92...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("Ping Response", "64 bytes from NODE-TEL-92: icmp_seq=1 ttl=64 time=42ms. Latency is optimal.", "success");
    }, 1500);
  };

  const handleDownloadReport = () => {
    addToast("Download Report", "Generating system sync JSON spreadsheet...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("Download Complete", "Sync log saved to sch_v3.2_sync_report.json (42 KB)", "success");
    }, 1200);
  };

  const handleForceSync = () => {
    addToast("Force Sync", "Broadcasting sync payloads to all carriage displays...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("Sync Completed", "All 12 carriage displays successfully re-synchronized.", "success");
    }, 1800);
  };

  const handleBoostHVAC = () => {
    addToast("Boost HVAC", "Directing coolant valves boost to Rack A3 switches...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("HVAC Boosted", "Fan speed set to 8,200 RPM. Temperature dropping: current 39.5 °C.", "success");
    }, 1500);
  };

  const handleMigrateLoad = () => {
    addToast("Migrate Virtual Load", "Redistributing VM nodes from Rack A3 to Rack B1...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("Migration Complete", "Load balancing finished. Virtual migration successful with 0ms loss.", "success");
    }, 2000);
  };

  const handleDownloadSQL = () => {
    addToast("Download Dump", "Requesting master snapshot database file...", "loading");
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.type !== "loading"));
      addToast("File Downloaded", "SQL dump download successful: db_backup_2026-05-25_sql.zip (1.24 GB)", "success");
    }, 1500);
  };

  const handleViewTrace = () => {
    addToast("System Trace", "Initializing real-time diagnostics debugger stream...", "success");
  };

  const filtered = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.msg.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "ALL" ||
      (activeFilter === "UNREAD" && n.status === "unread") ||
      (activeFilter === "DANGER" && n.type === "danger");
    return matchesSearch && matchesFilter;
  });

  const stats = [
    { label: "Total", value: notifications.length, icon: Activity, color: "text-blue-400", bg: "from-blue-500/10 to-transparent" },
    { label: "Unread", value: notifications.filter(n => n.status === "unread").length, icon: Bell, color: "text-[#ee6f1f]", bg: "from-orange-500/10 to-transparent" },
    { label: "Critical", value: notifications.filter(n => n.type === "danger").length, icon: AlertTriangle, color: "text-red-500", bg: "from-red-500/10 to-transparent" },
  ];

  const handleSelectNotification = (id: number) => {
    setSelectedNotifId(id);
    setNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "read" } : item
      )
    );
  };

  const handleDismissNotification = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setNotifications(prev => prev.filter(item => item.id !== id));
    if (selectedNotifId === id) {
      setSelectedNotifId(null);
    }
  };

  const selectedNotif = notifications.find(n => n.id === selectedNotifId);

  const renderDetailTemplate = () => {
    if (!selectedNotif) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-650 shadow-sm">
            <Info size={28} />
          </div>
          <div className="space-y-1 px-4">
            <h4 className="text-sm font-bold text-[#1d2d6a] dark:text-white uppercase tracking-wider">No Selection</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Select a notification from the list to view its diagnostics, live metrics, and operational control checklist.
            </p>
          </div>
        </div>
      );
    }

    if (selectedNotif.category === "Operational") {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                {selectedNotif.category}
              </span>
              <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
                {selectedNotif.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Incident ID: INC-OP-00{selectedNotif.id} • Triggered: {selectedNotif.time}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">CRITICAL INCIDENT DESCRIPTION</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {selectedNotif.msg}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Affected Train</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">KA Argo Wilis (KA-1)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Location</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">KM 102.4 (Padalarang)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Current Velocity</span>
                <span className="text-xs font-extrabold text-red-500 block mt-0.5">0 km/h (Emergency Braked)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Passenger Manifest</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">342 Registered</span>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 bg-slate-50 dark:bg-slate-900/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Live Track Segment Map</span>
                <span className="text-[10px] font-bold text-[#ee6f1f] animate-pulse uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ee6f1f]" /> GPS Stream
                </span>
              </div>
              <div className="h-32 bg-slate-200 dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-300/40 dark:border-white/5 relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#475569" strokeWidth="6" strokeDasharray="4 4" />
                  <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#94a3b8" strokeWidth="2" />
                  <circle cx="20%" cy="50%" r="8" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                  <circle cx="80%" cy="50%" r="8" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                  <circle cx="55%" cy="50%" r="12" fill="#ef4444" className="animate-ping opacity-75" />
                  <circle cx="55%" cy="50%" r="6" fill="#ef4444" />
                </svg>
                <span className="absolute bottom-2 left-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Padalarang</span>
                <span className="absolute bottom-2 right-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cicalengka</span>
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">KA Argo Wilis (KM 102)</span>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Incident Control Center</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartCall}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 transition-colors"
                >
                  <Phone size={14} />
                  Hubungi Masinis
                </button>
                <button
                  onClick={() => {
                    setDispatchStep("config");
                    setActiveModal("dispatch");
                  }}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <ShieldAlert size={14} />
                  Kirim Tim Rescue
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedNotif.category === "System" && selectedNotif.type === "warning") {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {selectedNotif.category}
              </span>
              <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
                {selectedNotif.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Node ID: NODE-TEL-92 • Telemetry Alert • {selectedNotif.time}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
              <Wifi size={24} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">SYSTEM INSTABILITY WARNING</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {selectedNotif.msg}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">GPS Signal Strength</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5 items-end h-3">
                    <div className="w-1 h-1.5 bg-red-500 rounded-sm" />
                    <div className="w-1 h-2.5 bg-red-500 rounded-sm" />
                    <div className="w-1 h-3.5 bg-slate-300 dark:bg-slate-700 rounded-sm" />
                    <div className="w-1 h-4.5 bg-slate-300 dark:bg-slate-700 rounded-sm" />
                  </div>
                  <span className="text-xs font-bold text-red-500">Weak (18%)</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Telemetry Latency</span>
                <span className="text-xs font-extrabold text-red-500 block mt-0.5">4,820 ms</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Fallback Network</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">Cellular Triangulation</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Device Temperature</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">38.5 °C (Normal)</span>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 bg-slate-50 dark:bg-slate-900/30 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Telemetry Diagnostic Log</span>
              <div className="font-mono text-[10px] text-slate-500 space-y-1.5 max-h-24 overflow-y-auto">
                <p className="text-red-500">[08:45:12] GPS connection dropped: TimeoutException</p>
                <p className="text-amber-500">[08:46:20] Retrying socket handshake... Attempt 1/5</p>
                <p className="text-red-500">[08:47:35] Handshake fail: Server unresolvable</p>
                <p className="text-blue-500">[08:50:00] Fallback cell tower telemetry registered (CellID: 52119)</p>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">System Controls</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartReboot}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/10"
                >
                  <RefreshCw size={14} />
                  Reboot Modul GPS
                </button>
                <button
                  onClick={handlePingDiagnostics}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Cpu size={14} />
                  Ping Diagnostik
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedNotif.category === "Update") {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {selectedNotif.category}
              </span>
              <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
                {selectedNotif.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Propagation Task: SYNC-SCH-11 • Success • {selectedNotif.time}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
              <Share2 size={24} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">PROPAGATION STATUS REPORT</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {selectedNotif.msg}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Sync State</span>
                <span className="text-xs font-extrabold text-green-500 block mt-0.5">100% Propagated</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Carriage Count</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">12 Coaches Connected</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Update Package Name</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5 truncate">sch_v3.2_prh_argo.json</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Propagation Duration</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">12.4 Seconds</span>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 bg-slate-50 dark:bg-slate-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-355 block mb-3">Carriage Sync Matrix</span>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">C{idx+1}</span>
                    <Check size={12} className="text-green-500 mt-0.5" strokeWidth={3} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Sync Tools</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadReport}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/10"
                >
                  <FileText size={14} />
                  Download Sync Report
                </button>
                <button
                  onClick={handleForceSync}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 size={14} />
                  Force Sync Display
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedNotif.category === "Hardware") {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                {selectedNotif.category}
              </span>
              <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
                {selectedNotif.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Location: DC-Rack-A3 • Thermal Node • {selectedNotif.time}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
              <Thermometer size={24} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">THERMAL ALARM TRIGGERED</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {selectedNotif.msg}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rack Temperature</span>
                <span className="text-xs font-extrabold text-red-500 block mt-0.5">42.0 °C (Max Threshold: 40 °C)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Fan RPM Status</span>
                <span className="text-xs font-extrabold text-orange-500 block mt-0.5">6,800 RPM (100% capacity)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Voltage Input</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">228 V (Stable)</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">HVAC Active Current</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">12.4 A (Peak load)</span>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 bg-slate-50 dark:bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <span>Thermal Gauge Level</span>
                <span className="text-red-500 font-extrabold">42 °C</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-4 overflow-hidden flex">
                <div className="bg-green-500 h-full w-[65%]" />
                <div className="bg-amber-500 h-full w-[15%]" />
                <div className="bg-red-500 h-full w-[20%] animate-pulse" />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>0 °C (Min)</span>
                <span>40 °C (Warn)</span>
                <span>50 °C (Crit)</span>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Cooling Controls</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBoostHVAC}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/10"
                >
                  <Wind size={14} />
                  Boost HVAC Cooling
                </button>
                <button
                  onClick={handleMigrateLoad}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Server size={14} />
                  Migrasi Virtual Load
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedNotif.category === "System" && selectedNotif.type === "success") {
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                Database Backup
              </span>
              <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
                {selectedNotif.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Backup Job: DB-BACKUP-0129 • Success • {selectedNotif.time}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 shrink-0">
              <Database size={24} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">BACKUP INTEGRITY VERIFICATION PASSED</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {selectedNotif.msg}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Compressed File Size</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">4.28 GB</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Database Tables Backed Up</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">48 tables</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Cloud Storage Destination</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5 truncate">KAI Cloud S3 Bucket B</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Job Duration Time</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white block mt-0.5">12.4 Seconds</span>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 bg-slate-50 dark:bg-slate-900/30 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Checksum Validation Integrity Check</span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <span>SHA-256 Signature Match</span>
                  <span className="text-green-500 font-extrabold">MATCHED</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <span>Row Integrity Count</span>
                  <span className="text-green-500 font-extrabold">100% VALID</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <span>Index Key Generation</span>
                  <span className="text-green-500 font-extrabold">REBUILT</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Backup Management</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadSQL}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/10"
                >
                  <HardDrive size={14} />
                  Download SQL Dump
                </button>
                <button
                  disabled
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-white/5"
                  title="Restore is only allowed by Master Superadmin"
                >
                  <Lock size={14} />
                  Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-start justify-between border-b border-slate-150 dark:border-white/5 pb-5">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {selectedNotif.category}
            </span>
            <h3 className="text-lg font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-1">
              {selectedNotif.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Event ID: EVT-GEN-00{selectedNotif.id} • Triggered: {selectedNotif.time}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
            <Info size={24} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-450 uppercase tracking-wider mb-1">EVENT DETAIL</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
              {selectedNotif.msg}
            </p>
          </div>

          <div className="pt-2">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Controls</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleViewTrace}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/10"
              >
                <ExternalLink size={14} />
                View System Trace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-kai-slate-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex gap-3.5 items-start relative overflow-hidden"
            >
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                toast.type === "success" ? "bg-green-500" :
                toast.type === "warning" ? "bg-amber-500" :
                toast.type === "error" ? "bg-red-500" :
                toast.type === "loading" ? "bg-blue-500" : "bg-blue-500"
              }`} />
              
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                toast.type === "success" ? "bg-green-500/10 text-green-500" :
                toast.type === "warning" ? "bg-amber-500/10 text-amber-500" :
                toast.type === "error" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
              }`}>
                {toast.type === "success" && <CheckCircle2 size={16} />}
                {toast.type === "warning" && <AlertTriangle size={16} />}
                {toast.type === "error" && <AlertTriangle size={16} />}
                {toast.type === "info" && <Info size={16} />}
                {toast.type === "loading" && <Loader2 size={16} className="animate-spin" />}
              </div>
              
              <div className="flex-1 space-y-0.5">
                <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{toast.title}</h5>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-normal">{toast.message}</p>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 transition-colors p-1"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal === "call" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-6 animate-pulse-subtle"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setCallState("dialing");
                    addToast("Call Ended", "Voice connection to Masinis disconnected.", "info");
                  }}
                  className="p-2 text-slate-450 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ee6f1f] bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                  Radio Link
                </span>
                <h4 className="text-base font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-2">
                  KA Argo Wilis Masinis Call
                </h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold">
                  Frequency: 450.125 MHz
                </p>
              </div>

              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-450 dark:text-slate-550 shadow-inner">
                  <User size={40} />
                </div>
                {callState === "dialing" && (
                  <div className="absolute inset-0 rounded-full border-4 border-[#ee6f1f] animate-ping opacity-75" />
                )}
                {callState === "connected" && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white">
                    <span className="block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {callState === "dialing" ? "Connecting link..." : "Connected"}
                </p>
                <p className="text-2xl font-bold font-mono text-slate-800 dark:text-white tracking-tight">
                  {callState === "dialing" ? "00:00" : `00:${callTimer < 10 ? "0" + callTimer : callTimer}`}
                </p>
              </div>

              {callState === "connected" && (
                <div className="flex gap-4 items-center justify-center py-2 h-14">
                  <div className="w-1 bg-[#ee6f1f] rounded animate-pulse h-6" />
                  <div className="w-1 bg-[#ee6f1f] rounded animate-pulse h-10" />
                  <div className="w-1 bg-[#ee6f1f] rounded animate-pulse h-4" />
                  <div className="w-1 bg-[#ee6f1f] rounded animate-pulse h-8" />
                  <div className="w-1 bg-[#ee6f1f] rounded animate-pulse h-5" />
                </div>
              )}

              <div className="flex gap-4 w-full pt-4">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setCallState("dialing");
                    addToast("Call Completed", "Call duration 00:" + (callTimer < 10 ? "0" + callTimer : callTimer) + ". Logs saved.", "success");
                  }}
                  className="flex-1 bg-red-650 hover:bg-red-750 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-650/10 transition-colors"
                >
                  <PhoneOff size={14} />
                  Hang Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === "dispatch" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden flex flex-col space-y-6"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setDispatchStep("config");
                  }}
                  className="p-2 text-slate-450 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ee6f1f] bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                  Emergency Dispatch
                </span>
                <h4 className="text-base font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-2">
                  Rescue Coordination Dispatcher
                </h4>
              </div>

              {dispatchStep === "config" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Crew Size</label>
                    <div className="flex gap-2">
                      {[3, 5, 8, 12].map(size => (
                        <button
                          key={size}
                          onClick={() => setCrewSize(size)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                            crewSize === size
                              ? "bg-[#ee6f1f] text-white border-[#ee6f1f]"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5"
                          }`}
                        >
                          {size} Crew
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Transport Unit</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    >
                      <option value="Rescue Train RT-12">Rescue Train RT-12 (Heavy Rail)</option>
                      <option value="Rapid Response Railcar RR-04">Rapid Response Railcar RR-04</option>
                      <option value="Emergency Road-Rail Jeep ER-2">Emergency Road-Rail Jeep ER-2</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleStartDispatch}
                      className="w-full bg-red-650 hover:bg-red-755 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-650/15 transition-colors"
                    >
                      <ShieldAlert size={14} />
                      Confirm Dispatch Directive
                    </button>
                  </div>
                </div>
              )}

              {dispatchStep === "dispatching" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 size={36} className="text-[#ee6f1f] animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-750 dark:text-slate-205 uppercase tracking-wider animate-pulse">Broadcasting Dispatch Signal...</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">Contacting emergency unit depot station...</p>
                  </div>
                </div>
              )}

              {dispatchStep === "dispatched" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-green-500 uppercase tracking-wider">Rescue Mission Dispatched</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      {crewSize} Personnel en route via {vehicleType}.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {activeModal === "reboot" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative overflow-hidden flex flex-col space-y-6"
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  OTA Command
                </span>
                <h4 className="text-base font-extrabold text-[#1d2d6a] dark:text-white tracking-tight mt-2">
                  GPS Module System Reboot
                </h4>
              </div>

              <div className="space-y-4">
                <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-white/5 relative">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${rebootProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Reboot Progress</span>
                  <span>{rebootProgress}%</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl p-3.5 flex items-center gap-2">
                  <Radio size={14} className="text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-350">{rebootStage}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 px-6 lg:px-10 pt-8 pb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2 uppercase">
              Notifications
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-[#ee6f1f] rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Real-time feed of system events and operational alerts
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="relative group overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/5 p-3.5 px-5 rounded-2xl flex items-center justify-between gap-4 min-w-[150px] transition-all hover:border-[#ee6f1f]/30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-30`} />
                <div className="relative z-10">
                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-0.5">{s.label}</div>
                  <div className={`text-xl font-bold ${s.color} tracking-tighter`}>{s.value}</div>
                </div>
                <div className={`relative z-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 ${s.color} shadow-inner`}>
                  <s.icon size={16} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-30 px-6 lg:px-10 py-3 backdrop-blur-xl bg-[#f8fafc] dark:bg-slate-950 border-y border-slate-200 dark:border-white/5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl shadow-sm">
              {[
                { id: "ALL", label: "All", icon: Activity },
                { id: "UNREAD", label: "Unread", icon: Bell },
                { id: "DANGER", label: "Critical", icon: AlertTriangle },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${activeFilter === opt.id
                    ? "bg-[#ee6f1f] text-white shadow-md shadow-orange-500/10"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                >
                  <opt.icon size={12} strokeWidth={3} />
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ee6f1f] transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-[#ee6f1f] focus:ring-4 focus:ring-[#ee6f1f]/10 rounded-xl text-[11px] font-semibold transition-all outline-none dark:text-white shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, status: "read" })))}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-[#ee6f1f] transition-all shadow-sm"
                  title="Mark all as read"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  onClick={() => {
                    setNotifications([]);
                    setSelectedNotifId(null);
                  }}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm"
                  title="Clear all logs"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 p-6 lg:p-10 overflow-hidden min-h-0">
          <div className="col-span-12 lg:col-span-5 flex flex-col overflow-y-auto pr-1 custom-scrollbar space-y-3.5 h-[45vh] lg:h-full">
            <AnimatePresence mode="popLayout">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  onClick={() => handleSelectNotification(n.id)}
                  className={`group relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-[1.5rem] border cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 ${selectedNotifId === n.id
                    ? 'border-[#ee6f1f] bg-[#ee6f1f]/5 dark:bg-[#ee6f1f]/5 shadow-lg shadow-[#ee6f1f]/5'
                    : n.status === 'unread'
                      ? 'border-[#ee6f1f]/30 shadow-lg shadow-[#ee6f1f]/5'
                      : 'border-slate-200 dark:border-white/5'
                    }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${n.type === 'danger' ? 'bg-red-500' :
                    n.type === 'warning' ? 'bg-amber-500' :
                    n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />

                  <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${n.type === 'danger' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                          {n.category}
                        </span>

                        <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <Clock size={9} strokeWidth={3} />
                          {n.time}
                        </div>

                        {n.status === 'unread' && (
                          <div className="flex items-center gap-1 bg-[#ee6f1f]/10 px-1.5 py-0.5 rounded-full border border-[#ee6f1f]/20">
                            <div className="w-1 h-1 rounded-full bg-[#ee6f1f] animate-pulse" />
                            <span className="text-[8px] font-extrabold text-[#ee6f1f] uppercase tracking-wider">Unread</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className={`text-xs lg:text-sm font-extrabold tracking-tight truncate ${n.status === 'unread' ? 'text-[#1d2d6a] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {n.title}
                        </h3>
                        <p className="text-[10px] lg:text-xs font-semibold text-slate-400 dark:text-slate-500 truncate">
                          {n.msg}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 pt-0.5">
                        <button
                          onClick={(e) => handleDismissNotification(n.id, e)}
                          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 transition-all bg-transparent border-none outline-none"
                        >
                          <Trash2 size={9} strokeWidth={3} />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:flex shrink-0 w-8 h-8 rounded-xl items-center justify-center shadow-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 shadow-xl">
                  <Bell size={28} strokeWidth={1} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.2em]">System Clear</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">No active logs matching filter.</p>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-7 flex flex-col overflow-y-auto pr-1 custom-scrollbar bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-3xl p-6 lg:p-8 h-[55vh] lg:h-full min-h-[400px]">
            {renderDetailTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
