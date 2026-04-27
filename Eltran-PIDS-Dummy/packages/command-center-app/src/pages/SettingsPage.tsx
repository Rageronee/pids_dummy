/** /command-center-app/src/pages/SettingsPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: SettingsPage */

import React from "react";
import { Moon, Sun, Monitor, Shield, Bell, Smartphone, Globe } from "lucide-react";

interface SettingsPageProps {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isDark, setIsDark }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight">Pengaturan Sistem</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold">Konfigurasi preferensi tampilan dan keamanan panel kontrol</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Monitor className="text-[#ee6f1f]" size={20} />
            <h3 className="font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.1em] text-sm">Tampilan & Tema</h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Mode Warna</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsDark(false)}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${!isDark ? 'border-[#ee6f1f] bg-orange-50 dark:bg-orange-950/20 text-[#ee6f1f]' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
              >
                <Sun size={32} />
                <span className="font-semibold text-sm">Light Mode</span>
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${isDark ? 'border-[#ee6f1f] bg-orange-50 dark:bg-orange-950/20 text-[#ee6f1f]' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
              >
                <Moon size={32} />
                <span className="font-semibold text-sm">Dark Mode</span>
              </button>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Bell className="text-[#ee6f1f]" size={20} />
            <h3 className="font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.1em] text-sm">Notifikasi</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Suara Peringatan Bahaya</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#ee6f1f]" />
            </label>
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Push Notification</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#ee6f1f]" />
            </label>
          </div>
        </section>

        {/* Security Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Shield className="text-[#ee6f1f]" size={20} />
            <h3 className="font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.1em] text-sm">Keamanan</h3>
          </div>

          <button className="w-full py-4 bg-[#1d2d6a] hover:bg-[#1d2d6a]/90 text-white font-bold rounded-2xl transition-all active:scale-95 text-sm uppercase tracking-[0.2em]">
            Ubah Password Admin
          </button>
        </section>

        {/* Language & Region */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Globe className="text-[#ee6f1f]" size={20} />
            <h3 className="font-bold text-[#1d2d6a] dark:text-white uppercase tracking-[0.1em] text-sm">Regional</h3>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Bahasa Sistem</p>
            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-[#ee6f1f]">
              <option>Bahasa Indonesia</option>
              <option>English (US)</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
