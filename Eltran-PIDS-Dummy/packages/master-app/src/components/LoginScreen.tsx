import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { AuthUser } from '@eltran/pids-core';

interface LoginScreenProps {
    onLogin: (user: AuthUser, token: string) => void;
}

const API_URL = 'http://localhost:3001';

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Username dan password wajib diisi.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.error || 'Login gagal. Periksa kembali kredensial Anda.');
                return;
            }
            sessionStorage.setItem('pids_token', data.token);
            sessionStorage.setItem('pids_user', JSON.stringify(data.user));
            onLogin(data.user, data.token);
        } catch {
            setError('Tidak dapat terhubung ke Master. Pastikan Master App aktif.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-white font-sans">
            {/* Background Image with blur and overlay */}
            <div
                className="absolute inset-0 z-0 scale-105"
                style={{
                    backgroundImage: "url('https://ik.trn.asia/uploads/2022/11/1669271102786.jpeg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(3px) brightness(1.1)'
                }}
            />
            <div className="absolute inset-0 z-0 bg-white/60 backdrop-blur-sm" />

            <div className="relative z-10 flex w-full items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-[440px] rounded-[2rem] bg-white/95 backdrop-blur-xl p-10 py-12 shadow-[0_30px_60px_-f_rgba(0,0,0,0.15)] ring-1 ring-black/[0.03] flex flex-col items-center"
                >
                    {/* Branding */}
                    <div className="mb-10 flex flex-col items-center text-center">
                        <div className="relative mb-5">
                            <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-150" />
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                                alt="KAI Logo"
                                className="relative h-16 drop-shadow-xl"
                            />
                        </div>
                        <h1 className="text-3xl leading-tight font-black tracking-tight text-[#1d2d6a] drop-shadow-sm">
                            PIDS Master Controller
                        </h1>
                        <p className="mt-2 text-[16px] font-bold text-[#1d2d6a] opacity-90">
                            Passenger Information Display System
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex w-full flex-col space-y-7">
                        {/* Username Input */}
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
                                disabled={isLoading}
                                autoComplete="username"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="relative w-full">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border-b-[1.5px] border-slate-200 bg-transparent py-2.5 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#ee6f1f] focus:outline-none transition-colors"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 top-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex w-full items-center gap-2 text-red-500 text-xs font-semibold pt-1"
                                >
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-8 w-full rounded-full bg-[#ee6f1f] py-3.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(238,111,31,0.25)] transition-all hover:bg-[#d45d15] hover:shadow-[0_4px_12px_rgba(238,111,31,0.3)] active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                        >
                            {isLoading ? 'Memproses...' : 'Masuk Ke Sistem'}
                        </button>

                        {/* Hint Info */}
                        <p className="text-center w-full text-[15px] text-slate-400 font-medium mt-6">
                            Demo: operator / operator123
                        </p>
                    </form>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 w-full text-center z-10">
                <p className="text-[10px] font-bold text-slate-500/70">
                    © 2025 PT ELTRAN INDONESIA - PIDS V1.2.0
                </p>
            </div>
        </div>
    );
}
