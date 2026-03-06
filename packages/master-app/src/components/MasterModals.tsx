/**
 * MasterModals — All modal/overlay components for MasterConsolePanel.
 * Includes: Toast, Standby Confirm, Delete GeoJSON, Clear Playlist, Loading.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertCircle, Video, Trash2, Loader2 } from 'lucide-react';

interface ToastState { msg: string; ok: boolean; id?: number }

interface MasterModalsProps {
    toast: ToastState | null;
    setToast: (t: ToastState | null) => void;

    showStandbyConfirm: boolean;
    setShowStandbyConfirm: (v: boolean) => void;
    handleVideoAction: (updates: any) => void;

    showDeleteModal: boolean;
    setShowDeleteModal: (v: boolean) => void;
    confirmDeleteGeoJSON: () => void;
    routeName: string;

    showClearPlaylistConfirm: boolean;
    setShowClearPlaylistConfirm: (v: boolean) => void;
    showToast: (msg: string, ok?: boolean) => void;

    uploading: boolean;
}

export function MasterModals({
    toast, setToast,
    showStandbyConfirm, setShowStandbyConfirm, handleVideoAction,
    showDeleteModal, setShowDeleteModal, confirmDeleteGeoJSON, routeName,
    showClearPlaylistConfirm, setShowClearPlaylistConfirm, showToast,
    uploading
}: MasterModalsProps) {
    return (
        <>
            {/* TOAST SYSTEM */}
            <AnimatePresence>
                {toast && (
                    <motion.div key={toast.id} initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-24 right-8 z-[70] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 min-w-[350px] max-w-[420px]">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${toast.ok ? 'bg-[#1d2d6a]' : 'bg-red-600'}`} />
                        <div className="relative p-5 pl-7 pb-6">
                            <button onClick={() => setToast(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-1 rounded-full hover:bg-slate-50"><X size={18} strokeWidth={2.5} /></button>
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-600'}`}>
                                    {toast.ok ? <Info size={24} className="text-white" /> : <AlertCircle size={24} className="text-white" />}
                                </div>
                                <div className="flex flex-col pr-6">
                                    <span className={`font-semibold text-lg leading-tight mb-2 ${toast.ok ? 'text-[#1d2d6a]' : 'text-red-700'}`}>{toast.ok ? 'Informasi Sistem' : 'Peringatan Sistem'}</span>
                                    <span className="text-slate-600 font-medium text-[15px] leading-relaxed mb-5">{toast.msg}</span>
                                    <div className="flex justify-end gap-5 items-center mt-2">
                                        <button onClick={() => setToast(null)} className="text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors">Tutup</button>
                                        <button onClick={() => setToast(null)} className="text-[#1d2d6a] font-bold text-sm hover:text-blue-800 transition-colors">Lihat Detail</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`h-1.5 w-full ${toast.ok ? 'bg-orange-100' : 'bg-red-100'} absolute bottom-0 left-0`}>
                            <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: "linear" }} className={`h-full ${toast.ok ? 'bg-[#ee6f1f]' : 'bg-red-500'}`} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standby Confirmation Modal */}
            <AnimatePresence>
                {showStandbyConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                            <div className="bg-blue-50 p-6 flex flex-col items-center justify-center border-b border-blue-100">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500 shadow-inner"><Video size={32} /></div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Tampilkan Video?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">Apakah Anda yakin ingin menampilkan video di Layar TV? Hal ini akan menonaktifkan mode Standby PIDS.</div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => setShowStandbyConfirm(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm">Batal</button>
                                <button onClick={() => { handleVideoAction({ tvStandby: false }); setShowStandbyConfirm(false); }} className="flex-1 py-3 px-4 bg-[#1d2d6a] hover:bg-[#152355] text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(29,45,106,0.3)]">Ya, Tampilkan</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete GeoJSON Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                            <div className="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Hapus GeoJSON?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">Anda yakin ingin menghapus data rute <span className="text-[#1d2d6a] font-black">{routeName}</span>? Tindakan ini tidak dapat dibatalkan.</div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm">Batal</button>
                                <button onClick={confirmDeleteGeoJSON} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)]">Ya, Hapus</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Clear Playlist Confirmation Modal */}
            <AnimatePresence>
                {showClearPlaylistConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                            <div className="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                                <h3 className="text-xl font-black text-[#1d2d6a] text-center">Bersihkan Playlist?</h3>
                            </div>
                            <div className="p-6 text-center text-slate-500 text-sm font-bold leading-relaxed">Apakah Anda yakin ingin menghapus semua video dari playlist? Anda dapat menambahkan video kembali setelah dibersihkan.</div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => setShowClearPlaylistConfirm(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition-all shadow-sm">Batal</button>
                                <button onClick={() => { handleVideoAction({ videoPlaylist: [], activeVideoIndex: 0, isPlaying: false, playbackProgress: 0 }); setShowClearPlaylistConfirm(false); showToast('Playlist berhasil dikosongkan', true); }} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(220,38,38,0.3)]">Ya, Bersihkan</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full-screen Loading Overlay for GeoJSON operations */}
            <AnimatePresence>
                {uploading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 bg-[#0b1437]/80 backdrop-blur-md">
                        <div className="bg-white/10 p-8 rounded-3xl mb-6 shadow-2xl border border-white/20 flex items-center justify-center">
                            <Loader2 size={64} className="text-[#ee6f1f] animate-spin" />
                        </div>
                        <h3 className="text-white font-black text-2xl mb-2 drop-shadow-lg">Memproses Data Peta</h3>
                        <p className="text-slate-300 text-center max-w-sm px-6 text-sm font-bold tracking-tight leading-relaxed">Mohon tunggu sebentar. Sistem sedang mensinkronisasi rute dan waypoint navigasi.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
