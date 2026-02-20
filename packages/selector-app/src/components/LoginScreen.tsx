import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, AlertCircle, Fingerprint } from 'lucide-react';
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
        <div className="min-h-screen w-full bg-[#1d2d6a] flex flex-col items-center justify-center relative overflow-hidden select-none">
            {/* Background radial */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#253d90_0%,#1d2d6a_40%,#0d1526_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#ee6f1f15_0%,transparent_60%)]" />

            {/* Moving dots decoration */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: i % 3 === 0 ? 8 : 4,
                            height: i % 3 === 0 ? 8 : 4,
                            background: i % 4 === 0 ? '#ee6f1f' : '#ffffff',
                            opacity: 0.1,
                            left: `${(i * 8.3) % 100}%`,
                            top: `${(i * 13.7) % 100}%`
                        }}
                        animate={{
                            y: [-10, 10, -10],
                            opacity: [0.05, 0.2, 0.05]
                        }}
                        transition={{
                            duration: 4 + i * 0.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.3
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-sm mx-6"
            >
                {/* Logo & Title */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] shadow-2xl mb-6"
                    >
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg"
                            alt="KAI"
                            className="h-12"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl font-black text-white tracking-tight mb-1">PIDS Selector</h1>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.4em]">Operator Login</p>
                    </motion.div>
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/15 p-8 shadow-2xl"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
                                <User size={22} />
                            </div>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-14 pr-5 py-5 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-[#ee6f1f]/80 focus:bg-white/15 transition-all"
                                autoComplete="username"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
                                <Lock size={22} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-14 pr-14 py-5 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:border-[#ee6f1f]/80 focus:bg-white/15 transition-all"
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                            </button>
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-start gap-3 bg-red-500/15 border border-red-500/30 rounded-2xl px-5 py-4"
                                >
                                    <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-red-300 text-sm font-medium">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileTap={{ scale: 0.97 }}
                            className="w-full mt-2 py-6 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-white/20 disabled:text-white/30 text-white font-black rounded-2xl text-lg uppercase tracking-widest transition-all shadow-xl shadow-orange-900/40 flex items-center justify-center gap-3 active:scale-95"
                        >
                            {isLoading ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifikasi...</>
                            ) : (
                                <><Fingerprint size={22} /> Masuk</>
                            )}
                        </motion.button>
                    </form>
                </motion.div>

                {/* Demo hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 text-center"
                >
                    <p className="text-white/25 text-[11px] font-bold uppercase tracking-widest">
                        Demo: operator / operator123
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
