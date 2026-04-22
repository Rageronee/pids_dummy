/** /selector-app/src/components/SelectorToast.tsx — untuk mengubah: komponen PIDS; fungsi utama: SelectorToast */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";

interface ToastData {
  title: string;
  message: string;
  id?: number;
}

interface SelectorToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

const SelectorToast = React.memo(function SelectorToast({
  toast,
  onClose,
}: SelectorToastProps) {
  if (!toast) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        className="fixed bottom-10 right-10 z-[70] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 dark:border-slate-800 min-w-[350px] max-w-[420px] transition-colors"
      >
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#1d2d6a] dark:bg-[#ee6f1f]" />
        <div className="relative p-5 pl-7 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#ee6f1f]">
              <Info size={24} className="text-white" />
            </div>
            <div className="flex flex-col pr-6">
              <span className="font-semibold text-lg leading-tight mb-2 text-[#1d2d6a] dark:text-white">
                {toast.title}
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium text-[15px] leading-relaxed mb-5">
                {toast.message}
              </span>
              <div className="flex justify-end gap-5 items-center mt-2">
                <button
                  onClick={onClose}
                  className="text-slate-500 dark:text-slate-400 font-semibold text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={onClose}
                  className="text-[#1d2d6a] dark:text-[#ee6f1f] font-bold text-sm hover:text-blue-800 dark:hover:text-orange-400 transition-colors"
                >
                  Lihat Detail
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-orange-100 dark:bg-orange-950/40 absolute bottom-0 left-0">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="h-full bg-[#ee6f1f]"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SelectorToast;
