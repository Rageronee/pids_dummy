/** /master-app/src/pages/SettingsPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: SettingsPage */

import React from "react";
import { Sun, Moon, Monitor, Info, Video } from "lucide-react";

interface SettingsPageProps {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isDark, setIsDark }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-[#1d2d6a] dark:text-white tracking-tight uppercase">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Configure PIDS Master Controller preferences and display options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Theme Settings */}
        <section className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800/50 space-y-8 transition-all hover:shadow-md">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-2xl text-[#ee6f1f]">
              <Monitor size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-tight">Appearance</h3>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theme Mode</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsDark(false)}
                className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all ${!isDark ? 'border-[#ee6f1f] bg-orange-50 dark:bg-orange-950/20 text-[#ee6f1f]' : 'border-slate-50 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'}`}
              >
                <Sun size={40} />
                <span className="font-black text-xs uppercase tracking-widest">Light</span>
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all ${isDark ? 'border-[#ee6f1f] bg-orange-50 dark:bg-orange-950/20 text-[#ee6f1f]' : 'border-slate-50 dark:border-slate-800 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'}`}
              >
                <Moon size={40} />
                <span className="font-black text-xs uppercase tracking-widest">Dark</span>
              </button>
            </div>
          </div>
        </section>

        {/* Audio & Visual */}
        <section className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800/50 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-blue-500">
              <Video size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-tight">Audio & Video</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Volume</span>
                <span className="font-mono text-[#1d2d6a] dark:text-white font-bold">85%</span>
              </div>
              <input type="range" className="w-full accent-[#ee6f1f]" />
            </div>
            <label className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Auto-play CCTV</span>
              <input type="checkbox" defaultChecked className="w-6 h-6 accent-[#ee6f1f]" />
            </label>
          </div>
        </section>

        {/* System Info */}
        <section className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-[2.5rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800/50 space-y-8 md:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
              <Info size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#1d2d6a] dark:text-white uppercase tracking-tight">System Information</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Software Version</p>
              <p className="font-bold text-[#1d2d6a] dark:text-white">v2.4.0-dummy</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Sync</p>
              <p className="font-bold text-green-500">Connected</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uptime</p>
              <p className="font-bold text-[#1d2d6a] dark:text-white">14h 22m</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hardware IP</p>
              <p className="font-mono font-bold text-[#1d2d6a] dark:text-white">192.168.1.100</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
