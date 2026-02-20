import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, AlertCircle, Train } from 'lucide-react';
import type { AuthUser } from '@eltran/pids-core';

interface LoginScreenProps {
    onLogin: (user: AuthUser, token: string) => void;
    requireRole?: 'Admin' | 'Operator';
}

const API_URL = 'http://localhost:3001';

export function LoginScreen({ onLogin, requireRole }: LoginScreenProps) {
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
            if (requireRole && data.user.role !== requireRole) {
                setError(`Akses ditolak. Halaman ini hanya untuk ${requireRole}.`);
                return;
            }
            sessionStorage.setItem('pids_token', data.token);
            sessionStorage.setItem('pids_user', JSON.stringify(data.user));
            onLogin(data.user, data.token);
        } catch {
            setError('Tidak dapat terhubung ke server. Pastikan Master App berjalan.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0f1e] flex items-center justify-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(#1d2d6a08 1px, transparent 1px), linear-gradient(90deg, #1d2d6a08 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1d2d6a30_0%,transparent_70%)]" />

            {/* Animated rail lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute h-px bg-gradient-to-r from-transparent via-[#1d2d6a] to-transparent opacity-20"
                        style={{ top: `${20 + i * 15}%`, width: '100%' }}
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 1.5 }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Card */}
                <div className="bg-[#0d1526]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1d2d6a] to-[#253d90] p-10 text-center relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#ee6f1f20,transparent_70%)]" />
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 relative z-10"
                        >
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                                alt="KAI"
                                className="h-10"
                            />
                        </motion.div>
                        <h1 className="text-2xl font-black text-white tracking-tight mb-1 relative z-10">
                            PIDS Master Controller
                        </h1>
                        <p className="text-blue-300/60 text-xs font-bold uppercase tracking-[0.3em] relative z-10">
                            Passenger Information Display System
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-10">
                        <div className="mb-8 text-center">
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Masuk sebagai Operator</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Username */}
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/20 font-medium text-sm focus:outline-none focus:border-[#ee6f1f]/60 focus:bg-white/8 transition-all"
                                    autoComplete="username"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/20 font-medium text-sm focus:outline-none focus:border-[#ee6f1f]/60 focus:bg-white/8 transition-all"
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3"
                                    >
                                        <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                        <p className="text-red-400 text-xs font-medium">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileTap={{ scale: 0.98 }}
                                className="w-full mt-2 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-white/10 disabled:text-white/20 text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memverifikasi...</>
                                ) : (
                                    <><Train size={18} /> Masuk ke Sistem</>
                                )}
                            </motion.button>
                        </form>

                        {/* Hint */}
                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
                                Demo: operator / operator123
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-center text-white/20 text-[10px] font-bold uppercase tracking-widest mt-6">
                    © 2025 PT Eltran Indonesia · PIDS v1.2.0
                </p>
            </motion.div>
        </div>
    );
}
