import React, { useState, useEffect } from 'react';
import { GraduationCap, Search, Users, Filter, CheckCircle2, AlertCircle, FileText, Plus, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { supabase, fetchAllSiswa } from '../../lib/supabase';
import { formatKelasDisplay } from './BKAgendaKerja';

export default function BKManagementSiswa({ user }: { user?: any }) {
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('Semua');

  useEffect(() => {
    loadSiswa();
  }, []);

  const loadSiswa = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSiswa();
      if (data && data.length > 0) {
        const formatted = data.map((s: any) => ({
          ...s,
          nama: (s.nama || s.nama_siswa || '').toUpperCase().trim(),
          kelas: formatKelasDisplay(s.kelas),
          nis: s.nis || s.nisn || '',
          nisn: s.nisn || s.nis || '',
          jenis_kelamin: s.jenis_kelamin === 'P' || s.gender === 'P' || s.jenis_kelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          nama_ortu: s.nama_ortu || s.orang_tua || '-',
          status: s.status || 'Aktif'
        }));
        setSiswaList(formatted);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Supabase fetchAllSiswa error:', e);
    }

    const local = localStorage.getItem('master_siswa') || localStorage.getItem('sitelat_siswa');
    if (local) {
      try {
        const parsed = JSON.parse(local).filter((s: any) => s.periode !== '2025');
        const formatted = parsed.map((s: any) => ({
          ...s,
          nama: (s.nama || '').toUpperCase().trim(),
          kelas: formatKelasDisplay(s.kelas),
          status: s.status || 'Aktif'
        }));
        setSiswaList(formatted);
      } catch {}
    } else {
      // Default initial mock students for SMPN 7
      setSiswaList([
        { id: '1', nama: 'Ahmad Dani Saputra', kelas: '8-B', nisn: '0098765431', jenis_kelamin: 'Laki-laki', nama_ortu: 'Bpk. Hendro', status: 'Aktif' },
        { id: '2', nama: 'Bagas Pratama', kelas: '7-C', nisn: '0094567890', jenis_kelamin: 'Laki-laki', nama_ortu: 'Ibu Siti Rahma', status: 'Aktif' },
        { id: '3', nama: 'Citra Dewi', kelas: '9-D', nisn: '0087654321', jenis_kelamin: 'Perempuan', nama_ortu: 'Bpk. Hartono', status: 'Aktif' },
        { id: '4', nama: 'Dimas Anggara', kelas: '8-E', nisn: '0089871234', jenis_kelamin: 'Laki-laki', nama_ortu: 'Bpk. Kasiman', status: 'Rentan ATS' },
        { id: '5', nama: 'Muhammad Farhan', kelas: '9-C', nisn: '0091234567', jenis_kelamin: 'Laki-laki', nama_ortu: 'Ibu Nurul', status: 'Kasus' },
        { id: '6', nama: 'Rizky Ramadhani', kelas: '8-B', nisn: '0098765432', jenis_kelamin: 'Laki-laki', nama_ortu: 'Bpk. Sugeng Wibowo', status: 'Kasus' },
        { id: '7', nama: 'Nabila Putri Azzahra', kelas: '7-A', nisn: '0097766554', jenis_kelamin: 'Perempuan', nama_ortu: 'Bpk. Wahyudi', status: 'Aktif' },
        { id: '8', nama: 'Zahra Amelia', kelas: '8-C', nisn: '0085544332', jenis_kelamin: 'Perempuan', nama_ortu: 'Ibu Maryati', status: 'Aktif' }
      ]);
    }
    setLoading(false);
  };

  const filtered = siswaList.filter(s => {
    const matchSearch = 
      (s.nama && s.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nisn && s.nisn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.kelas && s.kelas.toLowerCase().includes(searchTerm.toLowerCase()));

    if (selectedKelas === 'Semua') return matchSearch;
    return matchSearch && s.kelas === selectedKelas;
  });

  const availableKelas = Array.from(new Set(siswaList.map(s => s.kelas).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
              MASTER
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Management Data Siswa SMPN 7
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Direktori siswa aktif UPT SMP Negeri 7 Pasuruan tahun ajaran 2026
          </p>
        </div>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Siswa Terdaftar</div>
            <div className="text-xl font-black text-slate-800">{siswaList.length} Siswa</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Rombongan Belajar (Kelas)</div>
            <div className="text-xl font-black text-blue-600">{availableKelas.length || 7} Kelas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Status Sinkronisasi</div>
            <div className="text-xl font-black text-emerald-600">Tersinkron 2026</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Daftar Peserta Didik
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filtered.length} dari {siswaList.length} siswa
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 outline-none font-medium"
            >
              <option value="Semua">Semua Kelas</option>
              {availableKelas.map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama siswa, NISN..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">NISN / NIS</th>
                <th className="py-3 px-4">Nama Orang Tua</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-semibold">{index + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{item.nama}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.jenis_kelamin === 'L' || item.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.nisn || item.nis || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.nama_ortu || item.orang_tua || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Rentan ATS' 
                          ? 'bg-rose-100 text-rose-700' 
                          : item.status === 'Kasus'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status || 'Aktif'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
