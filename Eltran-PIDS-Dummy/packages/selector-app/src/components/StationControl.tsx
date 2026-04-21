/** /selector-app/src/components/StationControl.tsx — untuk mengubah: kontrol UI stasiun (prev/next/sync); fungsi utama: StationControl */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Clock,
} from "lucide-react";
import type { PidsState } from "@eltran/pids-core";

interface StationControlProps {
  stations: string[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSync: () => void;
  data: PidsState | null;
}

const StationControl = React.memo(function StationControl({
  stations,
  currentIndex,
  onPrev,
  onNext,
  onSync,
  data,
}: StationControlProps) {
  const currentStation = stations[currentIndex] || "INITIALIZING SYNC...";
  const nextStation = stations[(currentIndex + 1) % stations.length] || "---";

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-6 flex items-center gap-3 transition-colors">
        <MapPin className="text-[#ee6f1f]" size={24} /> Station Control
      </h2>
      <div className="flex gap-6 h-[400px]">
        <div className="flex-[2] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col p-8 relative overflow-hidden group transition-colors">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              Current Station
            </span>
            <div className="bg-[#1d2d6a]/5 dark:bg-white/5 text-[#1d2d6a] dark:text-slate-300 rounded-xl p-3 shadow-sm">
              <MapPin size={24} />
            </div>
          </div>
          <div className="flex flex-col flex-1 justify-center relative z-10 pl-2">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2">
              Departing From
            </p>
            <div className="h-24">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={currentIndex}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="text-6xl font-bold text-[#1d2d6a] dark:text-white tracking-tighter"
                >
                  {currentStation}
                </motion.h3>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-auto relative z-10">
            <button
              onClick={onPrev}
              className="w-16 h-16 rounded-2xl bg-[#ee6f1f] hover:bg-[#d86116] text-white flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={onSync}
              className="flex-1 h-16 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 drop-shadow-sm text-lg"
            >
              <RefreshCcw size={22} /> SYNC DISPLAY STATUS
            </button>
            <button
              onClick={onNext}
              className="w-16 h-16 rounded-2xl bg-[#ee6f1f] hover:bg-[#d86116] text-white flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
            >
              <ChevronRight size={32} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 relative overflow-hidden group transition-colors">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
            Upcoming Stop
          </span>
          <div className="flex flex-col items-center justify-center relative z-10">
            <div className="h-16 mb-2 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h4
                  key={currentIndex}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -5, opacity: 0 }}
                  className="text-4xl font-bold text-[#1d2d6a] dark:text-white tracking-tighter truncate text-center"
                  title={nextStation}
                >
                  {nextStation}
                </motion.h4>
              </AnimatePresence>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700 w-max transition-colors">
              <Clock size={16} />
              <span>Status: {data?.status || "STANDBY"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StationControl;
