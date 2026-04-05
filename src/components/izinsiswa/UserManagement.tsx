import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Shield, User, Key, AlertCircle, CheckCircle } from 'lucide-react';

export default function UserManagement() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen User Aplikasi</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah User */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-600" />
              Tambah User Baru
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama User (Username)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="Contoh: guru_ipa"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="Nama lengkap staf..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hak Akses (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm appearance-none"
                >
                  <option value="view">Hanya Melihat (View Only)</option>
                  <option value="entry">Edit & Entry Data</option>
                  <option value="full">Administrator (Full Access)</option>
                </select>
              </div>

              {error && (
                <div className="text-rose-600 text-xs flex items-center gap-1">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {success && (
                <div className="text-emerald-600 text-xs flex items-center gap-1">
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan User'}
              </button>
            </form>
          </div>
        </div>

        {/* Daftar User */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Daftar User Terdaftar</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{u.username}</div>
                        <div className="text-xs text-slate-500">{u.nama_lengkap}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'full' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'entry' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          <Shield size={12} />
                          {u.role === 'full' ? 'Administrator' : u.role === 'entry' ? 'Editor' : 'Viewer'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.username === 'admin'}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                          title="Hapus User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 italic">Belum ada user terdaftar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
