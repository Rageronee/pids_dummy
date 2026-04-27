/** /command-center-app/src/pages/UsersPage.tsx — untuk mengubah: komponen PIDS; fungsi utama: UsersPage */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Shield, CheckCircle2, X } from "lucide-react";
import { API } from "../config";
import { useToast } from "../hooks/useToast";
import { ConfirmModal, ToastNotification } from "../components/SharedUI";

export default function UsersPage({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    full_name: string;
  } | null>(null);
  const { toast, showToast, closeToast } = useToast();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newRole, setNewRole] = useState<"Admin" | "Operator">("Operator");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setUsers(d.users);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newNama) {
      showToast("Semua field harus diisi", false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          nama: newNama,
          role: newRole,
        }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`User ${newNama} berhasil dibuat`, true);
        fetchUsers();
        setShowForm(false);
        setNewUsername("");
        setNewPassword("");
        setNewNama("");
      } else {
        showToast(d.error || "Gagal membuat user", false);
      }
    } catch {
      showToast("Gagal terhubung ke server", false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        showToast(`User "${deleteTarget.full_name}" berhasil dihapus`, true);
        fetchUsers();
      } else {
        showToast(d.error || "Gagal menghapus user", false);
      }
    } catch {
      showToast("Gagal terhubung ke server", false);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Pengguna"
        message={`Anda yakin ingin menghapus "${deleteTarget?.full_name}"? Password dan data akses akan dihapus permanen.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={saving}
      />
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#1d2d6a] dark:text-white tracking-tight mb-2">
            Manajemen Pengguna
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {users.length} pengguna terdaftar dalam sistem PIDS
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`flex items-center gap-2 h-10 px-6 rounded-2xl font-bold text-sm transition-all active:scale-95 ${showForm ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" : "bg-[#ee6f1f] text-white hover:bg-[#d45d15] shadow-md"}`}
        >
          {showForm ? (
            <>
              <X size={16} />
              Batal
            </>
          ) : (
            <>
              <Plus size={16} />
              Tambah User
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl p-6 space-y-4 overflow-hidden mb-8 transition-colors"
          >
            <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-[0.1em]">
              User Baru
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Nama Lengkap"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[#1d2d6a] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[#1d2d6a] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-semibold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[#1d2d6a] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
              <select
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as "Admin" | "Operator")
                }
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-[#1d2d6a] dark:text-white font-bold text-sm focus:outline-none focus:border-[#ee6f1f] focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
              >
                <option value="Operator" className="dark:bg-slate-900">Operator</option>
                <option value="Admin" className="dark:bg-slate-900">Admin</option>
              </select>
            </div>
            <button
              onClick={handleAddUser}
              disabled={saving}
              className="h-11 px-8 bg-[#ee6f1f] hover:bg-[#d45d15] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-2xl text-sm transition-all active:scale-95 flex items-center gap-2 shadow-[0_8px_20px_rgba(238,111,31,0.25)] disabled:shadow-none"
            >
              {saving ? (
                "Menyimpan..."
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Simpan User
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        <div className="grid grid-cols-[80px_1fr_1fr_100px_60px] gap-0 px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors">
          <span>ID</span>
          <span>Nama</span>
          <span>Username</span>
          <span>Role</span>
          <span></span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-semibold">
            Memuat pengguna...
          </div>
        ) : (
          users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="grid grid-cols-[80px_1fr_1fr_100px_60px] gap-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors items-center group"
            >
              <span className="text-slate-400 dark:text-slate-500 font-mono text-sm">{u.id}</span>
              <span className="text-[#1d2d6a] dark:text-white font-semibold">
                {u.full_name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-sm font-semibold">
                {u.username}
              </span>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-semibold w-fit ${u.role === "Admin" ? "bg-[#ee6f1f]/10 text-[#ee6f1f] dark:bg-orange-500/20 dark:text-orange-400" : "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400"}`}
              >
                <Shield size={12} />
                {u.role}
              </span>
              <button
                onClick={() =>
                  setDeleteTarget({ id: u.id, full_name: u.full_name })
                }
                className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95 border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <ToastNotification toast={toast} onClose={closeToast} />
    </div>
  );
}
