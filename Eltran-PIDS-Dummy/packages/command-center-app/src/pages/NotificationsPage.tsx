/** /command-center-app/src/pages/NotificationsPage.tsx — untuk mengubah: halaman riwayat notifikasi; fungsi utama: NotificationsPage */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Search, 
  Filter, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Calendar,
  Shield,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronRight
} from "lucide-react";

const NotificationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const [notifications, setNotifications] = useState([
    { 
      id: 1, 
      type: "danger", 
      title: "KA Argo Wilis Emergency Stop", 
      msg: "CRITICAL: KA Argo Wilis detected stopping outside station boundaries (KM 102). Immediate operator intervention required.", 
      time: "2026-04-23 09:05:12",
      status: "unread",
      category: "Operational"
    },
    { 
      id: 2, 
      type: "warning", 
      title: "KA Malabar GPS Instability", 
      msg: "GPS telemetry for KA Malabar has been intermittent for 5+ minutes. Monitoring node status.", 
      time: "2026-04-23 08:50:45",
      status: "read",
      category: "System"
    },
    { 
      id: 3, 
      type: "info", 
      title: "Schedule Sync Complete", 
      msg: "KA Parahyangan updated schedules have been successfully propagated to all coach units.", 
      time: "2026-04-23 08:12:30",
      status: "read",
      category: "Update"
    },
    { 
      id: 4, 
      type: "success", 
      title: "Daily Backup Succeeded", 
      msg: "Full system state backup completed. Integrity verification passed across all data clusters.", 
      time: "2026-04-22 23:59:59",
      status: "read",
      category: "System"
    },
    { 
      id: 5, 
      type: "warning", 
      title: "Thermal Alert: Server Rack A3", 
      msg: "Ambient temperature in Rack A3 reached 42°C. Cooling systems are operating at peak capacity.", 
      time: "2026-04-22 14:22:10",
      status: "read",
      category: "Hardware"
    }
  ]);

  const filtered = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.msg.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "ALL" || 
                          (activeFilter === "UNREAD" && n.status === "unread") ||
                          (activeFilter === "DANGER" && n.type === "danger");
    return matchesSearch && matchesFilter;
  });

  const stats = [
    { label: "Active Nodes", value: notifications.length, icon: Bell, color: "text-blue-400", bg: "bg-blue-400/5" },
    { label: "Unresolved", value: notifications.filter(n => n.status === "unread").length, icon: Clock, color: "text-[#ee6f1f]", bg: "bg-orange-500/5" },
    { label: "Critical", value: notifications.filter(n => n.type === "danger").length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/5" },
  ];

  return (
    <div className="flex-1 w-full flex flex-col bg-slate-50 dark:bg-[#020617] overflow-hidden">
      {/* Header & Stats Bento Grid */}
      <div className="p-8 lg:p-12 space-y-12">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-10 bg-[#ee6f1f] rounded-full shadow-[0_0_20px_rgba(238,111,31,0.4)]" />
              <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                System <span className="text-[#ee6f1f]">Intelligence</span>
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm lg:text-base max-w-2xl">
              Comprehensive audit logs and real-time operational notifications for the PIDS infrastructure network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:w-auto w-full">
            {stats.map((s) => (
              <div key={s.label} className={`${s.bg} border border-slate-200 dark:border-white/5 p-6 rounded-3xl flex items-center gap-6 min-w-[240px]`}>
                <div className={`p-4 rounded-2xl ${s.color.replace('text', 'bg')}/10 ${s.color}`}>
                  <s.icon size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-3xl font-black ${s.color} tracking-tight`}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
             {[
               { id: "ALL", label: "All Logs", icon: Bell },
               { id: "UNREAD", label: "Unread", icon: Clock },
               { id: "DANGER", label: "Critical", icon: AlertTriangle },
             ].map(opt => (
               <button
                 key={opt.id}
                 onClick={() => setActiveFilter(opt.id)}
                 className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                   activeFilter === opt.id 
                    ? "bg-[#ee6f1f] text-white shadow-lg shadow-orange-500/25" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                 }`}
               >
                 <opt.icon size={14} strokeWidth={3} />
                 {opt.label}
               </button>
             ))}
           </div>

           <div className="flex items-center gap-4 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-80">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Search identifiers..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-14 pr-6 py-3.5 bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-[#ee6f1f] rounded-2xl text-sm font-bold transition-all outline-none dark:text-white"
               />
             </div>
             <div className="h-10 w-[1px] bg-slate-200 dark:bg-white/10 hidden lg:block" />
             <button 
                onClick={() => setNotifications(prev => prev.map(n => ({...n, status: "read"})))}
                className="p-3.5 text-slate-400 hover:text-[#ee6f1f] transition-all"
             >
               <CheckCircle2 size={24} />
             </button>
             <button className="p-3.5 text-slate-400 hover:text-red-500 transition-all">
               <Trash2 size={24} />
             </button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto px-8 lg:px-12 pb-12">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((n, i) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all hover:shadow-2xl hover:-translate-y-1 ${
                  n.status === 'unread' 
                    ? 'border-[#ee6f1f]/30 ring-1 ring-[#ee6f1f]/10' 
                    : 'border-slate-200 dark:border-white/5'
                }`}
              >
                {/* Decorative Side Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                  n.type === 'danger' ? 'bg-red-500' : 
                  n.type === 'warning' ? 'bg-amber-500' :
                  n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`} />

                <div className="p-8 lg:p-10 flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        n.type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {n.category}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock size={12} />
                        {n.time}
                      </div>
                      {n.status === 'unread' && (
                        <div className="w-2 h-2 rounded-full bg-[#ee6f1f] animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className={`text-2xl lg:text-3xl font-black tracking-tight ${n.status === 'unread' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title}
                      </h3>
                      <p className="text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        {n.msg}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 pt-4">
                       <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#ee6f1f] transition-all">
                         <ExternalLink size={16} />
                         View Details
                       </button>
                       <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all">
                         <Trash2 size={16} />
                         Delete Log
                       </button>
                    </div>
                  </div>

                  <div className="md:w-32 flex flex-row md:flex-col items-center justify-center gap-4 md:border-l border-slate-100 dark:border-white/5 md:pl-10">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${
                       n.type === 'danger' ? 'bg-red-500/10 text-red-500' : 
                       n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                       n.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                       {n.type === 'danger' ? <AlertTriangle size={32} /> : 
                        n.type === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                <Bell size={48} strokeWidth={1} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No Matches Found</h4>
                <p className="text-slate-500 font-bold">Try adjusting your filters or search keywords.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
