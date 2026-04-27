/** /selector-app/src/components/TVMonitor.tsx — untuk mengubah: komponen PIDS; fungsi utama: TVMonitor */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Video, Gauge, Mountain, Thermometer } from "lucide-react";
import type { PidsState } from "@eltran/pids-core";

import { API } from "@eltran/shared";

interface TVMonitorProps {
  show: boolean;
  onClose?: () => void;
  data: PidsState | null;
  currentStation: string;
  nextStation: string;
  masterSyncedServiceName: string;
  masterSyncedNumber: string;
  speed: number;
  altitude: number;
  temp: number;
  isEmbedded?: boolean;
}

const TVMonitor = React.memo(function TVMonitor({
  show,
  onClose,
  data,
  currentStation,
  nextStation,
  masterSyncedServiceName,
  masterSyncedNumber,
  speed,
  altitude,
  temp,
  isEmbedded = false,
}: TVMonitorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tvDisplayMode, setTvDisplayMode] = useState<"current" | "next">(
    "current",
  );

  useEffect(() => {
    if (!show && !isEmbedded) return;
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [show, isEmbedded]);

  useEffect(() => {
    if (!show && !isEmbedded) return;
    const t = setInterval(
      () =>
        setTvDisplayMode((prev) => (prev === "current" ? "next" : "current")),
      15000,
    );
    return () => clearInterval(t);
  }, [show, isEmbedded]);

  if (!show && !isEmbedded) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={isEmbedded ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={
          isEmbedded
            ? "relative w-full flex-1 bg-slate-900 flex flex-col overflow-hidden font-sans select-none border-t border-slate-800"
            : "fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden font-sans select-none"
        }
      >
        {!isEmbedded && onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-slate-900/30 hover:bg-slate-900/60 rounded-full text-white/50 hover:text-white backdrop-blur-sm transition-all z-50 group"
            title="Close Monitor"
          >
            <X
              size={24}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
          </button>
        )}

        <AnimatePresence mode="wait">
          {data?.tvStandby !== false ? (
            <motion.div
              key="standby-pids"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col overflow-hidden"
            >
              {(() => {
                const activeStationName =
                  tvDisplayMode === "current" ? currentStation : nextStation;
                const stationObj = data?.activeRoute?.stations?.find(
                  (s: any) => {
                    const sName = String(
                      typeof s === "object" ? s.name : s || "",
                    ).trim();
                    const aName = String(
                      typeof activeStationName === "object"
                        ? (activeStationName as any).name
                        : activeStationName || "",
                    ).trim();
                    return sName.toUpperCase() === aName.toUpperCase();
                  },
                );
                const mediaFile = (stationObj as any)?.media || null;
                const bgUrl = mediaFile
                  ? `${API}/media/station/${encodeURIComponent(mediaFile)}`
                  : `${API}/media/station/station_fallback.png`;

                return (
                  <motion.div
                    key={bgUrl}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url('${bgUrl}')` }}
                  >
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />
                  </motion.div>
                );
              })()}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/40 pointer-events-none" />
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

              <div className="relative z-20 flex justify-between items-start pt-10 px-14">
                <div className="flex flex-col text-white drop-shadow-md">
                  <div className="text-5xl font-bold tracking-tight mb-1">
                    {currentTime
                      .toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })
                      .replace(/\./g, ":")}
                  </div>
                  <div className="text-xl font-medium text-white/90">
                    {currentTime.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 mr-16">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                    alt="KAI Logo"
                    className="h-9 drop-shadow-md brightness-0 invert"
                  />
                  <div className="flex flex-col text-white font-bold leading-none drop-shadow-md">
                    <span className="text-sm">Monitor</span>
                    <span className="text-sm">PIDS</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center px-12 relative z-20 -mt-8">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-center w-full max-w-5xl"
                >
                  <h3 className={isEmbedded ? "text-[0.7vw] font-bold text-white/80 mb-1 drop-shadow-md uppercase tracking-[0.3em]" : "text-[1.5vw] font-bold text-white/80 mb-2 drop-shadow-md uppercase tracking-[0.3em]"}>
                    {tvDisplayMode === "current"
                      ? "Stasiun Saat Ini"
                      : "STASIUN BERIKUTNYA"}
                  </h3>
                  <h3 className={isEmbedded ? "text-[2.5vw] font-bold text-white tracking-tight leading-none drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] mb-4 uppercase" : "text-[8vw] font-bold text-white tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] mb-8 uppercase"}>
                    {tvDisplayMode === "current" ? currentStation : nextStation}
                  </h3>
                  <div className="flex items-center justify-center font-sans">
                    <div className={isEmbedded ? "bg-[#0a1536]/80 backdrop-blur-xl px-6 py-2 flex flex-col items-center justify-center rounded-l-2xl w-40 h-[70px] shadow-2xl border border-white/10 border-r-0" : "bg-[#0a1536]/80 backdrop-blur-xl px-12 py-3.5 flex flex-col items-center justify-center rounded-l-3xl w-80 h-[140px] shadow-2xl border border-white/10 border-r-0"}>
                      <span className={isEmbedded ? "text-[7px] font-bold text-white/60 uppercase tracking-widest mb-0.5" : "text-[13px] font-bold text-white/60 uppercase tracking-widest mb-1.5"}>
                        Layanan
                      </span>
                      <span className={isEmbedded ? "text-[14px] font-black text-white drop-shadow-sm leading-tight text-center uppercase" : "text-[32px] font-black text-white drop-shadow-sm leading-tight text-center uppercase"}>
                        {masterSyncedServiceName}
                      </span>
                    </div>
                    <div className={isEmbedded ? "bg-[#ee6f1f]/90 backdrop-blur-xl px-6 py-2 flex flex-col items-center justify-center rounded-r-2xl w-40 h-[70px] shadow-2xl border border-white/20 border-l-0" : "bg-[#ee6f1f]/90 backdrop-blur-xl px-12 py-3.5 flex flex-col items-center justify-center rounded-r-3xl w-80 h-[140px] shadow-2xl border border-white/20 border-l-0"}>
                      <span className={isEmbedded ? "text-[7px] font-bold text-white/80 uppercase tracking-widest mb-0.5" : "text-[13px] font-bold text-white/80 uppercase tracking-widest mb-1.5"}>
                        Nomor KA
                      </span>
                      <span className={isEmbedded ? "text-[14px] font-black text-white drop-shadow-sm leading-tight text-center" : "text-[32px] font-black text-white drop-shadow-sm leading-tight text-center"}>
                        KA-{masterSyncedNumber}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="h-[200px] bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900 relative z-20 flex items-end justify-between px-24 pb-12">
                <div className="flex items-center gap-6 w-1/3 justify-start">
                  <div className={isEmbedded ? "bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md" : "bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md"}>
                    <Gauge
                      size={isEmbedded ? 24 : 48}
                      className="text-[#ee6f1f]"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className={isEmbedded ? "text-[8px] font-bold text-white/40 uppercase tracking-widest" : "text-xs font-bold text-white/40 uppercase tracking-widest mb-1"}>
                      Kecepatan
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={isEmbedded ? "text-2xl font-black text-white tracking-tighter" : "text-5xl font-black text-white tracking-tighter"}>
                        {speed}
                      </span>
                      <span className={isEmbedded ? "text-[10px] font-bold text-white/60 uppercase" : "text-xl font-bold text-white/60 uppercase"}>
                        km/h
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-1/3 justify-center">
                  <div className={isEmbedded ? "bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md" : "bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md"}>
                    <Mountain
                      size={isEmbedded ? 24 : 48}
                      className="text-[#ee6f1f]"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className={isEmbedded ? "text-[8px] font-bold text-white/40 uppercase tracking-widest" : "text-xs font-bold text-white/40 uppercase tracking-widest mb-1"}>
                      Ketinggian
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={isEmbedded ? "text-2xl font-black text-white tracking-tighter" : "text-5xl font-black text-white tracking-tighter"}>
                        {altitude}
                      </span>
                      <span className={isEmbedded ? "text-[10px] font-bold text-white/60 uppercase" : "text-xl font-bold text-white/60 uppercase"}>
                        mdpl
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-1/3 justify-end">
                  <div className={isEmbedded ? "bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md" : "bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md"}>
                    <Thermometer
                      size={isEmbedded ? 24 : 48}
                      className="text-[#ee6f1f]"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className={isEmbedded ? "text-[8px] font-bold text-white/40 uppercase tracking-widest" : "text-xs font-bold text-white/40 uppercase tracking-widest mb-1"}>
                      Suhu Kabin
                    </span>
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className={isEmbedded ? "text-2xl font-black text-white tracking-tighter" : "text-5xl font-black text-white tracking-tighter"}>
                        {temp}
                      </span>
                      <span className={isEmbedded ? "text-[10px] font-bold text-white/60 uppercase" : "text-xl font-bold text-white/60 uppercase"}>
                        °C
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="video-display"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900"
            >
              {(() => {
                const playlist = data?.videoPlaylist || [];
                const activeIdx = data?.activeVideoIndex ?? 0;
                const activeFile = playlist[activeIdx];
                const videoUrl = activeFile
                  ? `${API}/media/video/${encodeURIComponent(activeFile)}`
                  : null;
                if (!videoUrl || playlist.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Video size={40} className="text-white/20" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/40 text-sm font-bold">
                          Tidak Ada Video Aktif
                        </p>
                        <p className="text-white/20 text-xs mt-1">
                          Tambahkan video ke playlist dari Master Console
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex-1 flex items-center justify-center w-full h-full bg-slate-900">
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      autoPlay={data?.isPlaying ?? false}
                      loop
                      muted={data?.muteVideo ?? false}
                      className="w-full h-full object-contain"
                      ref={(el) => {
                        if (el) {
                          if (data?.isPlaying !== undefined) {
                            if (data.isPlaying && el.paused)
                              el.play().catch(() => {});
                            if (!data.isPlaying && !el.paused) el.pause();
                          }
                          el.volume = (data?.volume ?? 50) / 100;
                        }
                      }}
                    />
                    <div className="absolute bottom-6 left-6 bg-slate-900/50 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 z-30">
                      <div
                        className={`w-2 h-2 rounded-full ${data?.isPlaying ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
                      />
                      <span className="text-[10px] font-bold">
                        {data?.isPlaying ? "Now Playing" : "Paused"}:{" "}
                        {activeFile}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
});

export default TVMonitor;
