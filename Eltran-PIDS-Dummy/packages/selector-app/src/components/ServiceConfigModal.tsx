/** /selector-app/src/components/ServiceConfigModal.tsx — untuk mengubah: komponen PIDS; fungsi utama: ServiceConfigModal */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Train } from "lucide-react";

interface ServiceConfigProps {
  show: boolean;
  onClose: () => void;
  trainNames: string[];
  routes: any;
  coachCount: number;
  onSetConfig: (
    name: string,
    routeData: any,
    newStations: string[],
    gerbong: number,
  ) => void;
  onSetGerbong: (gerbong: number) => void;
  initialTrainNameIndex: number;
  selectedGerbong: number;
  setSelectedGerbong: (gerbong: number) => void;
}

const ServiceConfigModal = React.memo(function ServiceConfigModal({
  show,
  onClose,
  trainNames,
  routes,
  coachCount,
  onSetConfig,
  onSetGerbong,
  initialTrainNameIndex,
  selectedGerbong,
  setSelectedGerbong,
}: ServiceConfigProps) {
  const [trainNameIndex, setTrainNameIndex] = useState(initialTrainNameIndex);
  const [trainSearchQuery, setTrainSearchQuery] = useState("");
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [carriageDropdownOpen, setCarriageDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const carriageDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTrainNameIndex(initialTrainNameIndex);
  }, [initialTrainNameIndex]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(e.target as Node)
      ) {
        setServiceDropdownOpen(false);
      }
      if (
        carriageDropdownRef.current &&
        !carriageDropdownRef.current.contains(e.target as Node)
      ) {
        setCarriageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = useCallback(() => {
    if (trainNameIndex >= 0 && trainNameIndex < trainNames.length) {
      const newName = trainNames[trainNameIndex];
      const routeData = routes[newName];
      const newStations = routeData?.stations || [];
      onSetConfig(newName, routeData, newStations, selectedGerbong);
    } else {
      onSetGerbong(selectedGerbong);
    }

    onClose();
  }, [
    trainNameIndex,
    trainNames,
    routes,
    selectedGerbong,
    onSetConfig,
    onSetGerbong,
    onClose,
  ]);

  const maxWagons = coachCount > 0 ? coachCount : 10;
  const filtered = trainNames
    .map((name, idx) => ({ name, idx }))
    .filter((t) =>
      t.name.toUpperCase().includes(trainSearchQuery.toUpperCase()),
    );

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 line-clamp-none"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-visible flex flex-col border border-transparent dark:border-slate-800"
        >
          <div className="bg-[#1d2d6a] dark:bg-slate-800 px-8 py-5 text-white flex justify-between items-center shrink-0 rounded-t-[2rem]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl">
                <Train className="text-[#ee6f1f]" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight">
                  Service Configuration
                </h2>
                <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                  Select Train Route and Unit Size
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-8 flex flex-col gap-8 bg-[#f8fafc] dark:bg-slate-900">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-[#1d2d6a] dark:text-slate-400 pl-1 uppercase tracking-wider">
                Select Route / Train Name
              </label>
              <div className="relative flex-1" ref={serviceDropdownRef}>
                <div
                  className={`w-full bg-white dark:bg-slate-800 border-2 rounded-xl px-5 py-4 shadow-sm transition-all cursor-pointer flex items-center ${serviceDropdownOpen ? "border-[#ee6f1f] ring-4 ring-orange-500/10" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                  onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                >
                  <input
                    type="text"
                    placeholder={
                      trainNameIndex >= 0 && trainNames[trainNameIndex]
                        ? trainNames[trainNameIndex]
                        : "--- Pilih Service ---"
                    }
                    value={trainSearchQuery}
                    onChange={(e) => {
                      setTrainSearchQuery(e.target.value);
                      if (!serviceDropdownOpen) setServiceDropdownOpen(true);
                    }}
                    onFocus={() => setServiceDropdownOpen(true)}
                    className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-base font-bold text-[#1d2d6a] dark:text-white placeholder-slate-400 p-0"
                  />
                  <ChevronDown
                    size={20}
                    strokeWidth={2.5}
                    className={`text-slate-400 transition-transform flex-shrink-0 ${serviceDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {serviceDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-5 py-3.5 text-sm font-bold text-slate-400 text-center">
                        Tidak ada layanan ditemukan
                      </div>
                    ) : (
                      filtered.map((t) => (
                        <div
                          key={t.name}
                          onClick={() => {
                            setTrainNameIndex(t.idx);
                            setTrainSearchQuery("");
                            setServiceDropdownOpen(false);
                          }}
                          className={`px-5 py-3 text-base font-bold cursor-pointer transition-colors ${trainNameIndex === t.idx ? "bg-[#ee6f1f]/10 text-[#ee6f1f]" : "text-[#1d2d6a] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                        >
                          {t.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-[#1d2d6a] dark:text-slate-400 pl-1 uppercase tracking-wider">
                Select Carriage Number
              </label>
              <div className="relative flex-1" ref={carriageDropdownRef}>
                <div
                  className={`w-full bg-white dark:bg-slate-800 border-2 rounded-xl px-5 py-4 shadow-sm transition-all cursor-pointer flex items-center justify-between ${carriageDropdownOpen ? "border-[#ee6f1f] ring-4 ring-orange-500/10" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                  onClick={() => {
                    setCarriageDropdownOpen(!carriageDropdownOpen);
                    if (serviceDropdownOpen) setServiceDropdownOpen(false);
                  }}
                >
                  <span className="text-base font-bold text-[#1d2d6a] dark:text-white">
                    Gerbong {selectedGerbong}
                  </span>
                  <ChevronDown
                    size={20}
                    strokeWidth={2.5}
                    className={`text-slate-400 transition-transform ${carriageDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {carriageDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                    {[...Array(maxWagons)].map((_, i) => (
                      <div
                        key={i + 1}
                        onClick={() => {
                          setSelectedGerbong(i + 1);
                          setCarriageDropdownOpen(false);
                        }}
                        className={`px-5 py-3 text-base font-bold cursor-pointer transition-colors ${selectedGerbong === i + 1 ? "bg-[#ee6f1f]/10 text-[#ee6f1f]" : "text-[#1d2d6a] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                      >
                        Gerbong {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 pt-0 bg-[#f8fafc] dark:bg-slate-900 rounded-b-[2rem]">
            <button
              onClick={handleApply}
              className="w-full py-5 bg-[#ee6f1f] hover:bg-[#d86116] text-white rounded-2xl font-bold text-xl shadow-[0_8px_20px_rgba(238,111,31,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              Apply Configuration
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ServiceConfigModal;
