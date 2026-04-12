import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, Shield, User, Key, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ManagementLogin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [role, setRole] = useState<'view' | 'entry' | 'full'>('view');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('users_app').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (supabase) {
        const { error } = await supabase.from('users_app').insert([{
          username,
          password,
          nama_lengkap: namaLengkap,
          role
        }]);
        if (error) throw error;
        
        setSuccess(`User ${username} berhasil ditambahkan.`);
        setUsername('');
        setPassword('');
        setNamaLengkap('');
        setRole('view');
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, uname: string) => {
    if (uname === 'admin') {
      alert('User admin utama tidak dapat dihapus!');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus user ${uname}?`)) return;

    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.from('users_app').delete().eq('id', id);
        if (error) throw error;
        setSuccess(`User ${uname} berhasil dihapus.`);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-emerald-600" size={32} />
              Management Login
            </h2>
            <p className="text-slate-500 font-medium mt-1">Kelola akun pengguna dan hak akses aplikasi SIAP SPANJU</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah User */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-6">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <UserPlus size={24} className="text-emerald-600" />
                Tambah User
              </h3>

              <form onSubmit={handleAddUser} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                      placeholder="Contoh: guru_ipa"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                    placeholder="Nama lengkap staf..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hak Akses</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold appearance-none"
                  >
                    <option value="view">Hanya Melihat (View Only)</option>
                    <option value="entry">Edit & Entry Data</option>
                    <option value="full">Administrator (Full Access)</option>
                  </select>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                    <CheckCircle size={16} /> {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs"
                >
                  {loading ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </form>
            </div>
          </div>

          {/* Daftar User */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800">Daftar Akun Terdaftar</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User & Nama</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Akses</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-base">{u.username}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{u.nama_lengkap}</div>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            u.role === 'full' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'entry' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <Shield size={12} />
                            {u.role === 'full' ? 'Administrator' : u.role === 'entry' ? 'Editor' : 'Viewer'}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.username === 'admin'}
                            className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all disabled:opacity-20 group-hover:scale-110 active:scale-95"
                            title="Hapus User"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-slate-400 font-bold italic">Belum ada user terdaftar</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
