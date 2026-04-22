/** /selector-app/src/components/SystemSettingsModal.tsx — untuk mengubah: komponen PIDS; fungsi utama: SystemSettingsModal */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  Clock,
  Settings as SettingsIcon,
  Video,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { P10Matrix } from "@eltran/shared";
import type { PidsState } from "@eltran/pids-core";

interface SystemSettingsProps {
  show: boolean;
  onClose: () => void;
  data: PidsState | null;
  currentStation: string;
  stations: string[];
  masterSyncedNumber: string;
  masterSyncedLedSpeed: number;
  onSetLedSpeed: (speed: number) => void;
  ledType: "indoor" | "outdoor" | "p10_32_16" | "p25_32_16";
  onSetLedType: (
    type: "indoor" | "outdoor" | "p10_32_16" | "p25_32_16",
  ) => void;
  showTVPreview: boolean;
  handleToggleTV: () => void;
  handleLogout: () => void;
  isDark?: boolean;
  setIsDark?: (dark: boolean) => void;
}

const SystemSettingsModal = React.memo(function SystemSettingsModal({
  show,
  onClose,
  data,
  currentStation,
  stations,
  masterSyncedNumber,
  masterSyncedLedSpeed,
  onSetLedSpeed,
  ledType,
  onSetLedType,
  showTVPreview,
  handleToggleTV,
  handleLogout,
  isDark,
  setIsDark,
}: SystemSettingsProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className={`w-full h-full flex flex-col overflow-hidden ${isDark ? "bg-slate-950 text-white" : "bg-[#f4f7f9] text-slate-900"}`}
        >
          <div className="bg-[#1d2d6a] dark:bg-slate-900 px-8 py-5 text-white flex justify-between items-center shrink-0 shadow-lg relative z-20">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-[22px]">
                <SettingsIcon className="text-[#ee6f1f]" size={40} />
              </div>
              <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">
                  Selector Settings
                </h2>
                <p className="text-xs font-bold text-white/40 tracking-widest uppercase mt-0.5">
                  Configuration & Control Center
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button
                onClick={() => setIsDark?.(!isDark)}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-[20px] transition-colors text-white"
                title="Toggle Theme"
              >
                {isDark ? <Sun size={28} strokeWidth={2.5} /> : <Moon size={28} strokeWidth={2.5} />}
              </button>
              <button
                onClick={handleToggleTV}
                className={`flex items-center gap-2 px-6 py-4 rounded-[20px] transition-colors font-bold tracking-wider uppercase text-xs ${showTVPreview ? "bg-white text-[#1d2d6a]" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                <Video size={20} strokeWidth={2.5} />{" "}
                {showTVPreview ? "DISPLAYING" : "TV Monitor"}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-4 rounded-[20px] bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-bold tracking-wider uppercase text-xs"
              >
                <LogOut size={20} strokeWidth={2.5} /> Logout
              </button>
              <div className="w-px h-8 bg-white/20 mx-2" />
              <button
                onClick={onClose}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-[20px] transition-colors"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
            <div className={`w-full min-h-full flex flex-col gap-10 p-12 shadow-sm border-t ${isDark ? "bg-slate-950 border-slate-900" : "bg-white border-slate-100"}`}>
              <div className="flex items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className={`text-3xl font-bold tracking-tight flex items-center gap-4 ${isDark ? "text-white" : "text-[#1d2d6a]"}`}>
                    <Zap className="text-[#ee6f1f]" size={36} /> Display
                    Controls
                  </h2>
                  <p className="text-base font-bold text-slate-400">
                    Manage LED brightness, speed, and format configuration
                  </p>
                </div>

                <div className={`flex items-center gap-4 text-sm px-6 py-3 rounded-2xl border ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
                  <Clock size={20} className="text-blue-500" />
                  <p className="font-bold">
                    Broadcasted in real-time to all units.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`flex justify-center scale-100 h-40 items-center bg-slate-950 rounded-[1rem] border-4 overflow-hidden shadow-inner w-full ${isDark ? 'border-slate-800' : 'border-[#1d2d6a]/20'}`}>
                  {data?.ledActive !== false ? (
                    <P10Matrix
                      text={`~ POSISI SAAT INI: ${currentStation} ~ TUJUAN AKHIR STASIUN ${stations.length > 0 ? (typeof stations[stations.length - 1] === "object" ? (stations[stations.length - 1] as any).name : stations[stations.length - 1]) : "---"} ~ BERHENTI DI: ${stations.map((s: any) => (typeof s === "object" ? s.name : s)).join(", ")}`}
                      fixedText={
                        data?.showTrainNumber
                          ? masterSyncedNumber
                              .match(/Gerbong\s*(\d+)/i)?.[1]
                              .padStart(2, "0") ||
                            masterSyncedNumber
                              .replace(/\D/g, "")
                              .slice(-2)
                              .padStart(2, "0")
                          : ""
                      }
                      color="#ee6f1f"
                      speed={masterSyncedLedSpeed}
                      columns={ledType.includes("96") ? 96 : 128}
                      padding={0}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
                        LED System Standby
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-12 pt-8 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#1d2d6a]"}`}>
                      Display Type
                    </h4>
                    <p className="text-sm font-bold text-slate-400 mt-1">
                      Select the physical LED panel configuration
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => onSetLedType("indoor")}
                      className={`w-full py-8 px-6 rounded-3xl font-bold text-2xl transition-all border-2 flex items-center justify-between ${ledType === "indoor" ? "border-[#ee6f1f] bg-[#ee6f1f]/5 text-[#ee6f1f] shadow-md" : isDark ? "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}
                    >
                      P2.5 Indoor Cabinet
                      <div
                        className={`w-6 h-6 rounded-full border-4 ${ledType === "indoor" ? "border-[#ee6f1f] bg-white" : isDark ? "border-slate-700" : "border-slate-200"}`}
                      />
                    </button>
                    <button
                      onClick={() => onSetLedType("p10_32_16")}
                      className={`w-full py-8 px-6 rounded-3xl font-bold text-2xl transition-all border-2 flex items-center justify-between ${ledType === "p10_32_16" ? "border-[#ee6f1f] bg-[#ee6f1f]/5 text-[#ee6f1f] shadow-md" : isDark ? "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}
                    >
                      P10 Outdoor Module
                      <div
                        className={`w-6 h-6 rounded-full border-4 ${ledType === "p10_32_16" ? "border-[#ee6f1f] bg-white" : isDark ? "border-slate-700" : "border-slate-200"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#1d2d6a]"}`}>
                        Scrolling Velocity
                      </h4>
                      <p className="text-sm font-bold text-slate-400 mt-1">
                        Adjust text movement speed on display
                      </p>
                    </div>
                    <div className={`text-3xl font-bold text-[#ee6f1f] px-6 py-3 rounded-2xl border font-mono shadow-sm ${isDark ? "bg-orange-950/40 border-orange-900/50" : "bg-orange-50 border-orange-100"}`}>
                      {masterSyncedLedSpeed}
                      <span className="text-sm ml-1 opacity-60">MS</span>
                    </div>
                  </div>

                  <div className={`flex-1 flex flex-col justify-center rounded-[2.5rem] p-8 border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                    <div className="relative py-4">
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={masterSyncedLedSpeed}
                        onChange={(e) =>
                          onSetLedSpeed(parseInt(e.target.value))
                        }
                        className="w-full h-6 bg-slate-200 dark:bg-slate-800 rounded-3xl appearance-none cursor-pointer accent-[#ee6f1f]"
                      />
                      <div className="flex justify-between text-xs font-bold text-slate-400 mt-6 tracking-widest uppercase">
                        <span className="flex flex-col items-start">
                          <span>Fast</span>
                          <span className={`h-2 w-px mt-2 ml-2 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                        </span>
                        <span className="flex flex-col items-center">
                          <span>Standard</span>
                          <span className={`h-2 w-px mt-2 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                        </span>
                        <span className="flex flex-col items-end">
                          <span>Slow</span>
                          <span className={`h-2 w-px mt-2 mr-2 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SystemSettingsModal;
