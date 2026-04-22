/** /command-center-app/src/components/SharedUI.tsx — untuk mengubah: komponen PIDS; fungsi utama: SharedUI */

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Info } from "lucide-react";
export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.05] text-center"
          >
            <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-100 dark:border-red-900/50 shadow-sm">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#1d2d6a] dark:text-white mb-2">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={loading}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl text-sm transition-all active:scale-95 shadow-[0_8px_20px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2"
              >
                {loading ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold rounded-2xl text-sm transition-all"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export function ToastNotification({
  toast,
  onClose,
}: {
  toast: { msg: string; ok: boolean; id?: number } | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          className="fixed bottom-10 right-10 z-[100] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 dark:border-slate-800 min-w-[350px] max-w-[420px]"
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-2 ${toast.ok ? "bg-[#1d2d6a]" : "bg-red-500"}`}
          />
          <div className="relative p-5 pl-7 pb-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <div className="flex gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${toast.ok ? "bg-[#ee6f1f]" : "bg-red-50 dark:bg-red-900/30"}`}
              >
                {toast.ok ? (
                  <Info size={24} className="text-white" />
                ) : (
                  <X size={24} className="text-red-500" />
                )}
              </div>
              <div className="flex flex-col pr-6">
                <span
                  className={`font-semibold text-lg leading-tight mb-2 ${toast.ok ? "text-[#1d2d6a] dark:text-white" : "text-red-600 dark:text-red-400"}`}
                >
                  {toast.ok ? "Informasi Sistem" : "Peringatan Sistem"}
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-medium text-[15px] leading-relaxed mb-5">
                  {toast.msg}
                </span>
                <div className="flex justify-end gap-5 items-center mt-2">
                  <button
                    onClick={onClose}
                    className="text-slate-500 dark:text-slate-400 font-semibold text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`h-1.5 w-full absolute bottom-0 left-0 ${toast.ok ? "bg-orange-100 dark:bg-orange-950/30" : "bg-red-100 dark:bg-red-950/30"}`}
          >
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className={`h-full ${toast.ok ? "bg-[#ee6f1f]" : "bg-red-500"}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
