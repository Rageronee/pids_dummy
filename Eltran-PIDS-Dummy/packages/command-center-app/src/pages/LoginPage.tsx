/** /command-center-app/src/pages/LoginPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: LoginPage */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { API } from "../config";

interface AuthUser {
  id: string;
  username: string;
  role: string;
  nama: string;
}

export default function LoginPage({
  onLogin,
}: {
  onLogin: (user: AuthUser, token: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!d.success) {
        setError(d.error || "Login gagal.");
        return;
      }
      if (d.user.role !== "Admin") {
        setError("Akses ditolak. Command Center hanya untuk Admin.");
        return;
      }
      sessionStorage.setItem("cc_token", d.token);
      sessionStorage.setItem("cc_user", JSON.stringify(d.user));
      onLogin(d.user, d.token);
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-white font-sans">
      <div
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage:
            "url('https://ik.trn.asia/uploads/2022/11/1669271102786.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(3px) brightness(1.1)",
        }}
      />
      <div className="absolute inset-0 z-0 bg-white/60 backdrop-blur-sm" />
      <div className="relative z-10 flex w-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[440px] rounded-[2rem] bg-white/95 backdrop-blur-xl p-10 py-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.03] flex flex-col items-center"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-150" />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                alt="KAI Logo"
                className="relative h-16 drop-shadow-xl"
              />
            </div>
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-[#1d2d6a] drop-shadow-sm">
              PIDS Command Center
            </h1>
            <p className="mt-2 text-[16px] font-semibold text-[#1d2d6a] opacity-90">
              Passenger Information Display System
            </p>
          </div>
          <form onSubmit={submit} className="flex w-full flex-col space-y-7">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
              disabled={loading}
              autoComplete="username"
            />
            <div className="relative w-full">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-0 top-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex w-full items-center gap-2 text-red-500 text-xs font-semibold pt-1"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full h-12 rounded-full bg-[#ee6f1f] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)] transition-all hover:bg-[#d45d15] active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? "Memproses..." : "Masuk Ke Sistem"}
            </button>
            <p className="text-center w-full text-sm text-slate-400 font-medium mt-6">
              Demo: admin / admin123
            </p>
          </form>
        </motion.div>
      </div>
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-[10px] font-semibold text-slate-500/70">
          © 2025 PT ELTRAN INDONESIA - PIDS V1.2.0
        </p>
      </div>
    </div>
  );
}
