import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Users, Activity, Save, X, Trash2, Search, Check, Plus, UserCheck, AlertCircle, UserPlus, Printer, FileSpreadsheet } from 'lucide-react';
import { supabase, filterLatestStudents, normalizeKelasKey } from '../../lib/supabase';
import { AgamaProgram } from '../../types/keagamaan';
import { fetchGuruList, addMasterGuru, deduplicateGuruList, isExcludedGuru, isValidUUID } from '../../lib/jurnalService';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';

interface SiswaKeagamaanItem {
  siswa_id: string;
  nama: string;
  nis?: string;
  kelas: string;
  periode?: string;
  absensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Haid' | 'Pulang sebelum waktunya';
  nilai?: string;
  catatan_siswa?: string;
  tindakan?: string;
  sudah_izin?: boolean;
  keterangan_izin?: string;
}

const KeagamaanAbsensi: React.FC<{ user?: any }> = () => {
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaKeagamaanItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('2026');

  // State Input Tambah Guru Baru
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [newGuruNama, setNewGuruNama] = useState('');
  const [newGuruNip, setNewGuruNip] = useState('');
  const [isSavingNewGuru, setIsSavingNewGuru] = useState(false);

  // Mode Dokumen: berubah otomatis menjadi Laporan setelah data terisi & tersimpan
  const [isSavedReport, setIsSavedReport] = useState<boolean>(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isReportMode = isSavedReport && !hasUnsavedEdits;

  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH.mm'),
    kegiatan_id: '',
    wali_kelas_id: '',
    alasan: 'Hadir' as any,
    kelas: '7A'
  });

  // Rentang tanggal untuk Cetak / Simpan Excel (default mengikuti tanggal formulir)
  const [exportStartDate, setExportStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [hasCustomExportRange, setHasCustomExportRange] = useState<boolean>(false);

  useEffect(() => {
    if (!hasCustomExportRange && formData.tanggal) {
      setExportStartDate(formData.tanggal);
      setExportEndDate(formData.tanggal);
    }
  }, [formData.tanggal, hasCustomExportRange]);

  const handleChangeExportStart = (val: string) => {
    setHasCustomExportRange(true);
    setExportStartDate(val);
    if (val && exportEndDate && val > exportEndDate) {
      setExportEndDate(val);
    }
  };

  const handleChangeExportEnd = (val: string) => {
    setHasCustomExportRange(true);
    setExportEndDate(val);
    if (val && exportStartDate && val < exportStartDate) {
      setExportStartDate(val);
    }
  };

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchAllMasterSiswa = async () => {
    if (!supabase) return [];
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let keepGoing = true;

    while (keepGoing) {
      const start = page * pageSize;
      const end = (page + 1) * pageSize - 1;
      const { data, error } = await supabase
        .from('master_siswa')
        .select('*')
        .range(start, end)
        .order('nama', { ascending: true })
        .setHeader('x-raw-master-siswa', 'true');

      if (error || !data || data.length === 0) {
        keepGoing = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          keepGoing = false;
        } else {
          page++;
          if (page > 20) keepGoing = false;
        }
      }
    }

    return filterLatestStudents(allData).filter(
      (s: any) => !String(s.id || '').startsWith('pad-')
    );
  };

  const fetchInitialData = async () => {
    try {
      const [pRes, gList, sData] = await Promise.all([
        supabase ? supabase.from('agama_program').select('*').order('nama_kegiatan') : Promise.resolve({ data: [] }),
        fetchGuruList(),
        fetchAllMasterSiswa()
      ]);

      const programList = pRes.data || [];
      const teacherList = deduplicateGuruList((gList || []).filter(g => !isExcludedGuru(g.nama_guru)));
      setPrograms(programList);
      setTeachers(teacherList);
      setStudents(sData || []);

      setFormData(prev => ({
        ...prev,
        kegiatan_id: prev.kegiatan_id || (programList.length > 0 ? programList[0].id : ''),
        wali_kelas_id: prev.wali_kelas_id || (teacherList.length > 0 ? teacherList[0].id : '')
      }));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const availablePeriodes = Array.from(
    new Set(['2026', '2025', ...students.map(s => s.periode || '2026')])
  ).sort((a, b) => b.localeCompare(a));

  // Load students for the selected class & periode
  useEffect(() => {
    if (!formData.kelas) {
      setSiswaList([]);
      return;
    }

    const loadClassStudents = async () => {
      // 1. Filter students from master_siswa (normalized class & periode)
      const targetKelas = normalizeKelasKey(formData.kelas);
      const matched = students.filter(s => {
        const sPeriode = String(s.periode || '2026').replace(/^Periode\s*/i, '').trim() || '2026';
        const matchPeriode = filterPeriode === 'ALL' ? true : sPeriode === filterPeriode;
        return normalizeKelasKey(s.kelas || '') === targetKelas && matchPeriode;
      }).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

      // 2. Check existing records in agama_absensi for this class on this date & program
      let existingAbsensiMap: Record<string, any> = {};
      if (formData.tanggal && formData.kegiatan_id && supabase && matched.length > 0) {
        try {
          const studentIds = matched.map(m => m.id);
          const { data: existingData } = await supabase
            .from('agama_absensi')
            .select('*')
            .in('siswa_id', studentIds)
            .eq('tanggal', formData.tanggal)
            .eq('kegiatan_id', formData.kegiatan_id);

          if (existingData) {
            existingData.forEach((item: any) => {
              existingAbsensiMap[String(item.siswa_id)] = item;
            });
          }
        } catch (e) {
          console.warn('Error fetching existing class attendance:', e);
        }
      }

      // 3. Check active izin for this date from izin_siswa
      let activeIzinByStudent: Record<string, any> = {};
      if (formData.tanggal && supabase) {
        try {
          const { data: izinData } = await supabase
            .from('izin_siswa')
            .select('*')
            .neq('status', 'Ditolak');
          if (izinData) {
            izinData.forEach((iz: any) => {
              const start = iz.tanggal_mulai;
              const end = iz.tanggal_selesai || iz.tanggal_mulai;
              if (start <= formData.tanggal && end >= formData.tanggal) {
                activeIzinByStudent[String(iz.siswa_id)] = iz;
              }
            });
          }
        } catch (err) {}
      }

      const list: SiswaKeagamaanItem[] = matched.map((s, idx) => {
        const existingRecord = existingAbsensiMap[String(s.id)];
        const existingIzin = activeIzinByStudent[String(s.id)];

        let defaultAbsensi: any = 'Hadir';
        let sudahIzin = false;
        let keteranganIzin = '';
        let defaultCatatan = '';

        if (existingRecord) {
          defaultAbsensi = existingRecord.alasan;
        } else if (existingIzin) {
          sudahIzin = true;
          defaultAbsensi = existingIzin.jenis_izin === 'Sakit' ? 'Sakit' : 'Izin';
          keteranganIzin = `Sudah Izin (${existingIzin.jenis_izin})`;
          defaultCatatan = `Izin via Form Wali Murid (${existingIzin.jenis_izin})`;
        }

        return {
          siswa_id: s.id,
          nama: s.nama,
          nis: s.nis || `24${formData.kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
          kelas: s.kelas || formData.kelas,
          periode: s.periode || (filterPeriode === 'ALL' ? '2026' : filterPeriode),
          absensi: defaultAbsensi,
          nilai: '',
          catatan_siswa: defaultCatatan,
          tindakan: '',
          sudah_izin: sudahIzin,
          keterangan_izin: keteranganIzin
        };
      });

      setSiswaList(list);
      const hasExistingSaved = Object.keys(existingAbsensiMap).length > 0;
      setIsSavedReport(hasExistingSaved);
      setHasUnsavedEdits(false);
      setSaveFeedback(null);
    };

    loadClassStudents();
  }, [formData.kelas, filterPeriode, formData.tanggal, formData.kegiatan_id, students]);

  // Set all students to Hadir
  const handleSetAllHadir = () => {
    setSiswaList(prev => prev.map(s => ({ ...s, absensi: 'Hadir' })));
    setHasUnsavedEdits(true);
  };

  // Update specific student field
  const handleUpdateStudent = (index: number, field: keyof SiswaKeagamaanItem, value: any) => {
    setSiswaList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setHasUnsavedEdits(true);
  };

  // Add manual student
  const handleAddManualStudent = () => {
    const nama = prompt('Masukkan nama siswa baru:');
    if (!nama || !nama.trim()) return;

    const newStudent: SiswaKeagamaanItem = {
      siswa_id: `manual-${Date.now()}`,
      nama: nama.trim().toUpperCase(),
      nis: `24${(formData.kelas || '7A').replace(/[^0-9]/g, '')}${String(siswaList.length + 1).padStart(3, '0')}`,
      kelas: formData.kelas || '7A',
      periode: filterPeriode === 'ALL' ? '2026' : filterPeriode,
      absensi: 'Hadir',
      nilai: '',
      catatan_siswa: '',
      tindakan: ''
    };

    setSiswaList(prev => [...prev, newStudent]);
    setHasUnsavedEdits(true);
  };

  // Remove student from list
  const handleRemoveStudent = (index: number) => {
    if (confirm('Hapus siswa ini dari daftar absensi kegiatan ini?')) {
      setSiswaList(prev => prev.filter((_, i) => i !== index));
      setHasUnsavedEdits(true);
    }
  };

  // Counters
  const countHadir = siswaList.filter(s => s.absensi === 'Hadir').length;
  const countSakit = siswaList.filter(s => s.absensi === 'Sakit').length;
  const countIzin = siswaList.filter(s => s.absensi === 'Izin').length;
  const countAlpa = siswaList.filter(s => s.absensi === 'Alpa').length;
  const countHaid = siswaList.filter(s => s.absensi === 'Haid').length;

  // Filtered rows
  const filteredSiswaTable = siswaList.filter(s =>
    s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) ||
    (s.nis && s.nis.includes(searchSiswa))
  );

  const resolveTeacherUuid = async (selectedId: string): Promise<string> => {
    if (isValidUUID(selectedId)) return selectedId;

    const selectedTeacher = teachers.find(t => String(t.id) === String(selectedId));
    const targetName = (selectedTeacher?.nama_guru || '').trim();
    const norm = (str: string) =>
      str
        .toLowerCase()
        .replace(/^(hj\.|h\.|drs\.|dra\.)\s*/i, '')
        .replace(/,?\s*(s\.pd\.i|s\.pd|m\.pd|m\.m|s\.ag|s\.kom|s\.si)\.?/gi, '')
        .replace(/[^a-z0-9]/g, '');

    if (supabase) {
      const { data: dbGurus } = await supabase.from('master_guru').select('id, nama_guru');
      if (Array.isArray(dbGurus) && dbGurus.length > 0) {
        const matched =
          dbGurus.find(g => norm(g.nama_guru || '') === norm(targetName)) ||
          dbGurus.find(g =>
            (g.nama_guru || '').toLowerCase().includes(targetName.split(',')[0].trim().toLowerCase())
          ) ||
          dbGurus[0];
        if (matched && isValidUUID(matched.id)) {
          setFormData(prev => ({ ...prev, wali_kelas_id: matched.id }));
          return matched.id;
        }
      }

      if (targetName) {
        const newUuid = crypto.randomUUID();
        const { error: insErr } = await supabase
          .from('master_guru')
          .insert([{ id: newUuid, nama_guru: targetName }]);
        if (!insErr) {
          setFormData(prev => ({ ...prev, wali_kelas_id: newUuid }));
          return newUuid;
        }
      }
    }

    return selectedId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!formData.kegiatan_id || !formData.wali_kelas_id) {
      setSaveFeedback({
        type: 'error',
        message: 'Mohon pilih Nama Kegiatan dan Wali Kelas / Guru Pengampu terlebih dahulu.'
      });
      return;
    }

    if (siswaList.length === 0) {
      setSaveFeedback({
        type: 'error',
        message: 'Daftar siswa untuk kelas ini kosong. Silakan pilih kelas lain atau klik Tambah Siswa.'
      });
      return;
    }

    try {
      setSubmitting(true);

      const resolvedGuruId = await resolveTeacherUuid(formData.wali_kelas_id);
      const validSiswaRows = siswaList.filter(s => isValidUUID(String(s.siswa_id)));
      const studentIds = validSiswaRows.map(s => String(s.siswa_id));

      let existingRecords: any[] = [];
      if (supabase && studentIds.length > 0) {
        const { data: exData, error: exErr } = await supabase
          .from('agama_absensi')
          .select('id, siswa_id, tanggal, kegiatan_id')
          .in('siswa_id', studentIds)
          .eq('tanggal', formData.tanggal)
          .eq('kegiatan_id', formData.kegiatan_id);
        if (exErr) throw exErr;
        if (exData) existingRecords = exData;
      }

      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      validSiswaRows.forEach(s => {
        const existing = existingRecords.find(ex => String(ex.siswa_id) === String(s.siswa_id));
        const basePayload = {
          siswa_id: s.siswa_id,
          tanggal: formData.tanggal,
          jam: formData.jam,
          kegiatan_id: formData.kegiatan_id,
          wali_kelas_id: resolvedGuruId,
          alasan: s.absensi
        };
        if (existing?.id) {
          toUpdate.push({ id: existing.id, ...basePayload });
        } else {
          toInsert.push(basePayload);
        }
      });

      const nowStr = format(new Date(), 'HH:mm:ss');
      setIsSavedReport(true);
      setHasUnsavedEdits(false);
      setLastSavedTime(nowStr);
      setSaveFeedback({
        type: 'success',
        message: `Presensi kelas ${formData.kelas} (${validSiswaRows.length} siswa) berhasil disimpan pukul ${nowStr}. Cetak / Simpan Excel kini otomatis menjadi Laporan Presensi Kegiatan Keagamaan.`
      });
    } catch (error: any) {
      console.error('Error saving absensi:', error);
      setSaveFeedback({
        type: 'error',
        message: `Gagal menyimpan presensi ke database: ${error?.message || 'Periksa koneksi Supabase.'}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const escapeHtml = (val: string) =>
    String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const getSelectedMeta = () => {
    const selectedProgram = programs.find(p => String(p.id) === String(formData.kegiatan_id));
    const selectedTeacher = teachers.find(t => String(t.id) === String(formData.wali_kelas_id));
    let formattedDate = formData.tanggal;
    try {
      formattedDate = format(parseISO(formData.tanggal), 'EEEE, d MMMM yyyy', { locale: idLocale });
    } catch {
      formattedDate = formData.tanggal;
    }
    return {
      kegiatanName: selectedProgram?.nama_kegiatan || '........................................',
      guruName: selectedTeacher?.nama_guru || '........................................',
      formattedDate,
      periodeLabel: filterPeriode === 'ALL' ? 'Semua Periode' : `Periode ${filterPeriode}`,
      kelasLabel: formData.kelas || '-'
    };
  };

  const getExportDateRange = () => {
    const rawStart = exportStartDate || formData.tanggal;
    const rawEnd = exportEndDate || rawStart;
    const start = rawStart <= rawEnd ? rawStart : rawEnd;
    const end = rawStart <= rawEnd ? rawEnd : rawStart;
    const isRangeExport = start !== end || start !== formData.tanggal;
    return { start, end, isRangeExport };
  };

  const formatTanggalIndo = (dateStr: string, withDay = false) => {
    try {
      return format(parseISO(dateStr), withDay ? 'EEEE, d MMMM yyyy' : 'd MMMM yyyy', { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  const fetchRangeAttendanceForClass = async (startDate: string, endDate: string) => {
    const targetKelas = normalizeKelasKey(formData.kelas || '');
    const rosterStudents: Array<{ siswa_id: string; nis: string; nama: string; kelas: string }> =
      siswaList.length > 0
        ? siswaList.map(s => ({
            siswa_id: String(s.siswa_id),
            nis: s.nis || '-',
            nama: s.nama,
            kelas: s.kelas || formData.kelas
          }))
        : students
            .filter(s => {
              const sPeriode = String(s.periode || '2026').replace(/^Periode\s*/i, '').trim() || '2026';
              const matchPeriode = filterPeriode === 'ALL' ? true : sPeriode === filterPeriode;
              return normalizeKelasKey(s.kelas || '') === targetKelas && matchPeriode;
            })
            .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))
            .map((s, idx) => ({
              siswa_id: String(s.id),
              nis: s.nis || `24${(formData.kelas || '').replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
              nama: s.nama,
              kelas: s.kelas || formData.kelas
            }));

    const rosterIds = rosterStudents.map(r => r.siswa_id);
    const allRecords: any[] = [];

    if (supabase && rosterIds.length > 0) {
      let page = 0;
      const pageSize = 1000;
      let keepGoing = true;

      while (keepGoing) {
        let query = supabase
          .from('agama_absensi')
          .select('*')
          .in('siswa_id', rosterIds)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .order('tanggal', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (formData.kegiatan_id) {
          query = query.eq('kegiatan_id', formData.kegiatan_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          keepGoing = false;
        } else {
          allRecords.push(...data);
          if (data.length < pageSize || page >= 20) {
            keepGoing = false;
          } else {
            page++;
          }
        }
      }
    }

    const statsByStudent = new Map<
      string,
      {
        hadir: number;
        sakit: number;
        izin: number;
        alpa: number;
        haid: number;
        pulang: number;
        total: number;
      }
    >();

    rosterStudents.forEach(s => {
      statsByStudent.set(s.siswa_id, {
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        haid: 0,
        pulang: 0,
        total: 0
      });
    });

    allRecords.forEach(rec => {
      const bucket = statsByStudent.get(String(rec.siswa_id));
      if (!bucket) return;
      bucket.total += 1;
      if (rec.alasan === 'Hadir') bucket.hadir += 1;
      else if (rec.alasan === 'Sakit') bucket.sakit += 1;
      else if (rec.alasan === 'Izin') bucket.izin += 1;
      else if (rec.alasan === 'Alpa') bucket.alpa += 1;
      else if (rec.alasan === 'Haid') bucket.haid += 1;
      else if (rec.alasan === 'Pulang sebelum waktunya') bucket.pulang += 1;
    });

    const recapRows = rosterStudents.map(s => {
      const st = statsByStudent.get(s.siswa_id) || {
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        haid: 0,
        pulang: 0,
        total: 0
      };
      const persen = st.total > 0 ? ((st.hadir / st.total) * 100).toFixed(1) : '0.0';
      return {
        ...s,
        ...st,
        persen
      };
    });

    const totals = recapRows.reduce(
      (acc, r) => ({
        hadir: acc.hadir + r.hadir,
        sakit: acc.sakit + r.sakit,
        izin: acc.izin + r.izin,
        alpa: acc.alpa + r.alpa,
        haid: acc.haid + r.haid,
        pulang: acc.pulang + r.pulang,
        total: acc.total + r.total
      }),
      { hadir: 0, sakit: 0, izin: 0, alpa: 0, haid: 0, pulang: 0, total: 0 }
    );

    const detailRows = allRecords
      .map(rec => {
        const student = rosterStudents.find(r => r.siswa_id === String(rec.siswa_id));
        const program = programs.find(p => String(p.id) === String(rec.kegiatan_id));
        return {
          tanggal: rec.tanggal || '-',
          jam: rec.jam || '-',
          nis: student?.nis || '-',
          nama: student?.nama || 'Unknown',
          kegiatan: program?.nama_kegiatan || 'Kegiatan Keagamaan',
          alasan: rec.alasan || '-'
        };
      })
      .sort((a, b) =>
        `${a.tanggal}-${a.jam}-${a.nama}`.localeCompare(`${b.tanggal}-${b.jam}-${b.nama}`)
      );

    return { recapRows, totals, detailRows };
  };

  const handlePrintForm = async () => {
    if (siswaList.length === 0) {
      alert('Daftar siswa kosong. Silakan pilih kelas atau tambahkan siswa terlebih dahulu.');
      return;
    }

    const { start, end, isRangeExport } = getExportDateRange();
    const { kegiatanName, guruName, formattedDate, periodeLabel, kelasLabel } = getSelectedMeta();

    let docHeading = isReportMode
      ? 'Laporan Presensi Kegiatan Keagamaan Siswa'
      : 'Formulir Presensi Kegiatan Keagamaan Siswa';
    let docTabTitle = isReportMode
      ? `Laporan Presensi Kegiatan Keagamaan - Kelas ${escapeHtml(kelasLabel)}`
      : `Formulir Presensi Kegiatan Keagamaan - Kelas ${escapeHtml(kelasLabel)}`;
    let metaRowsHtml = '';
    let summaryCounts = {
      hadir: countHadir,
      sakit: countSakit,
      izin: countIzin,
      alpa: countAlpa,
      haid: countHaid,
      persen: siswaList.length > 0 ? ((countHadir / siswaList.length) * 100).toFixed(1) : '0.0'
    };
    let tableHeadHtml = `
      <tr>
        <th style="width:28px;">No</th>
        <th style="width:58px;">NIS</th>
        <th>Nama Siswa</th>
        <th style="width:74px;">Status</th>
        <th style="width:130px;">Catatan Siswa</th>
        <th style="width:130px;">Tindakan Guru</th>
        <th style="width:62px;">${isReportMode ? 'Keterangan' : 'Paraf'}</th>
      </tr>
    `;
    let rowsHtml = '';

    if (isRangeExport) {
      try {
        setSubmitting(true);
        const { recapRows, totals } = await fetchRangeAttendanceForClass(start, end);
        const rangeLabel =
          start === end
            ? formatTanggalIndo(start, true)
            : `${formatTanggalIndo(start)} s.d. ${formatTanggalIndo(end)}`;

        docHeading = `Laporan Presensi Kegiatan Keagamaan Siswa (${start === end ? 'Harian' : 'Rekap Rentang Tanggal'})`;
        docTabTitle = `Laporan Presensi Keagamaan - Kelas ${escapeHtml(kelasLabel)} (${escapeHtml(start)} s.d. ${escapeHtml(end)})`;

        summaryCounts = {
          hadir: totals.hadir,
          sakit: totals.sakit,
          izin: totals.izin,
          alpa: totals.alpa,
          haid: totals.haid,
          persen: totals.total > 0 ? ((totals.hadir / totals.total) * 100).toFixed(1) : '0.0'
        };

        metaRowsHtml = `
          <tr>
            <td style="width:18%;font-weight:700;">Nama Kegiatan</td>
            <td style="width:34%;">: ${escapeHtml(formData.kegiatan_id ? kegiatanName : 'Semua Kegiatan Keagamaan')}</td>
            <td style="width:18%;font-weight:700;">Kelas / Periode</td>
            <td style="width:30%;">: ${escapeHtml(kelasLabel)} (${escapeHtml(periodeLabel)})</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Periode Cetak</td>
            <td>: ${escapeHtml(rangeLabel)}</td>
            <td style="font-weight:700;">Total Presensi</td>
            <td>: ${totals.total} Catatan (${recapRows.length} Siswa)</td>
          </tr>
          <tr>
            <td style="font-weight:700;">Wali Kelas / Guru</td>
            <td>: ${escapeHtml(guruName)}</td>
            <td style="font-weight:700;">Jenis Dokumen</td>
            <td>: Laporan Rekap Rentang Tanggal</td>
          </tr>
        `;

        tableHeadHtml = `
          <tr>
            <th style="width:28px;">No</th>
            <th style="width:58px;">NIS</th>
            <th>Nama Siswa</th>
            <th style="width:36px;">H</th>
            <th style="width:36px;">S</th>
            <th style="width:36px;">I</th>
            <th style="width:36px;">A</th>
            <th style="width:42px;">Haid</th>
            <th style="width:44px;">Total</th>
            <th style="width:52px;">% Hadir</th>
          </tr>
        `;

        rowsHtml =
          recapRows
            .map(
              (r, idx) => `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td style="text-align:center;">${escapeHtml(r.nis)}</td>
                <td style="font-weight:600;">${escapeHtml(r.nama)}</td>
                <td style="text-align:center;font-weight:700;">${r.hadir}</td>
                <td style="text-align:center;">${r.sakit}</td>
                <td style="text-align:center;">${r.izin}</td>
                <td style="text-align:center;">${r.alpa}</td>
                <td style="text-align:center;">${r.haid}</td>
                <td style="text-align:center;font-weight:700;">${r.total}</td>
                <td style="text-align:center;font-weight:700;">${r.persen}%</td>
              </tr>
            `
            )
            .join('') +
          `
            <tr style="background:#f1f5f9;font-weight:800;">
              <td colspan="3" style="text-align:right;">TOTAL KESELURUHAN</td>
              <td style="text-align:center;">${totals.hadir}</td>
              <td style="text-align:center;">${totals.sakit}</td>
              <td style="text-align:center;">${totals.izin}</td>
              <td style="text-align:center;">${totals.alpa}</td>
              <td style="text-align:center;">${totals.haid}</td>
              <td style="text-align:center;">${totals.total}</td>
              <td style="text-align:center;">${summaryCounts.persen}%</td>
            </tr>
          `;
      } catch (err: any) {
        console.error('Error preparing range print:', err);
        alert('Gagal memuat data presensi untuk rentang tanggal tersebut.');
        setSubmitting(false);
        return;
      } finally {
        setSubmitting(false);
      }
    } else {
      metaRowsHtml = `
        <tr>
          <td style="width:16%;font-weight:700;">Nama Kegiatan</td>
          <td style="width:36%;">: ${escapeHtml(kegiatanName)}</td>
          <td style="width:16%;font-weight:700;">Kelas / Periode</td>
          <td style="width:32%;">: ${escapeHtml(kelasLabel)} (${escapeHtml(periodeLabel)})</td>
        </tr>
        <tr>
          <td style="font-weight:700;">Hari / Tanggal</td>
          <td>: ${escapeHtml(formattedDate)}</td>
          <td style="font-weight:700;">Jam Pelaksanaan</td>
          <td>: ${escapeHtml(formData.jam || '-')} WIB</td>
        </tr>
        <tr>
          <td style="font-weight:700;">Wali Kelas / Guru</td>
          <td>: ${escapeHtml(guruName)}</td>
          <td style="font-weight:700;">Status Dokumen</td>
          <td>: ${
            isReportMode
              ? `Laporan Tersimpan${lastSavedTime ? ` (${escapeHtml(lastSavedTime)})` : ''}`
              : 'Formulir / Draf Presensi'
          }</td>
        </tr>
      `;

      rowsHtml = siswaList
        .map(
          (s, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="text-align:center;">${escapeHtml(s.nis || '-')}</td>
            <td style="font-weight:600;">${escapeHtml(s.nama)}</td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(s.absensi || 'Hadir')}</td>
            <td>${escapeHtml(s.catatan_siswa || '-')}</td>
            <td>${escapeHtml(s.tindakan || '-')}</td>
            ${
              isReportMode
                ? `<td style="text-align:center;">${s.absensi === 'Hadir' ? 'Mengikuti' : 'Tercatat'}</td>`
                : '<td></td>'
            }
          </tr>
        `
        )
        .join('');
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${docTabTitle}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: "Times New Roman", Times, serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
        padding: 0;
        font-size: 11px;
        line-height: 1.4;
      }
      .kop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px double #0f172a;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .kop img {
        width: 56px;
        height: 64px;
        object-fit: contain;
      }
      .kop-text {
        flex: 1;
        text-align: center;
        padding: 0 10px;
      }
      .kop-text h1 { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
      .kop-text h2 { margin: 2px 0; font-size: 15px; font-weight: 800; }
      .kop-text p { margin: 1px 0; font-size: 10px; }
      .doc-title {
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 10px 0 10px;
        text-decoration: underline;
      }
      .meta-grid {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5px;
      }
      .meta-grid td {
        padding: 3px 6px;
        vertical-align: top;
      }
      .summary-bar {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
        margin-bottom: 10px;
        font-family: Arial, Helvetica, sans-serif;
      }
      .summary-item {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 4px 6px;
        text-align: center;
        background: #f8fafc;
      }
      .summary-item .lbl { font-size: 9px; color: #475569; font-weight: 700; text-transform: uppercase; }
      .summary-item .val { font-size: 12px; font-weight: 800; color: #0f172a; }
      table.data-table {
        width: 100%;
        border-collapse: collapse;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
      }
      table.data-table th, table.data-table td {
        border: 1px solid #334155;
        padding: 4px 6px;
        vertical-align: middle;
      }
      table.data-table th {
        background: #e2e8f0;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 9.5px;
        text-align: center;
      }
      table.data-table tr {
        page-break-inside: avoid;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 22px;
        page-break-inside: avoid;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5px;
      }
      .sig-box {
        width: 44%;
        text-align: center;
      }
      .sig-space {
        height: 54px;
      }
      .sig-name {
        font-weight: 700;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="kop">
      <img src="https://i.ibb.co/677QPVHY/logo.png" alt="Logo Pemkot Pasuruan" />
      <div class="kop-text">
        <h1>PEMERINTAH KOTA PASURUAN</h1>
        <h2>SMP NEGERI 7 PASURUAN</h2>
        <p>Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139</p>
        <p>Telepon (0343) 426845 · Pos-el smp7pas@yahoo.co.id · Laman www.smpn7pasuruan.sch.id</p>
      </div>
      <img src="https://iili.io/KDFk4fI.png" alt="Logo SMPN 7 Pasuruan" />
    </div>

    <div class="doc-title">${docHeading}</div>

    <table class="meta-grid">
      ${metaRowsHtml}
    </table>

    <div class="summary-bar">
      <div class="summary-item"><div class="lbl">Hadir (H)</div><div class="val">${summaryCounts.hadir}</div></div>
      <div class="summary-item"><div class="lbl">Sakit (S)</div><div class="val">${summaryCounts.sakit}</div></div>
      <div class="summary-item"><div class="lbl">Izin (I)</div><div class="val">${summaryCounts.izin}</div></div>
      <div class="summary-item"><div class="lbl">Alpa (A)</div><div class="val">${summaryCounts.alpa}</div></div>
      <div class="summary-item"><div class="lbl">Haid</div><div class="val">${summaryCounts.haid}</div></div>
      <div class="summary-item"><div class="lbl">% Hadir</div><div class="val">${summaryCounts.persen}%</div></div>
    </div>

    <table class="data-table">
      <thead>
        ${tableHeadHtml}
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signatures">
      <div class="sig-box">
        <div>Mengetahui,</div>
        <div>Kepala SMP Negeri 7 Pasuruan</div>
        <div class="sig-space"></div>
        <div class="sig-name">NUR FADILAH, S.Pd</div>
        <div>NIP. 19860410 201001 2 030</div>
      </div>
      <div class="sig-box">
        <div>Pasuruan, ${escapeHtml(format(new Date(), 'd MMMM yyyy', { locale: idLocale }))}</div>
        <div>Wali Kelas / Guru Pengampu</div>
        <div class="sig-space"></div>
        <div class="sig-name">${escapeHtml(guruName)}</div>
        <div>NIP. ............................</div>
      </div>
    </div>
  </body>
</html>`;

    const existing = document.getElementById('keagamaan-print-frame');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    const iframe = document.createElement('iframe');
    iframe.id = 'keagamaan-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlDoc);
    doc.close();

    const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
    const imgPromises = imgs.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    );

    Promise.race([Promise.all(imgPromises), new Promise<void>(r => setTimeout(r, 2000))]).then(() => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 60000);
        }
      }, 150);
    });
  };

  const handleSaveFormExcel = async () => {
    if (siswaList.length === 0) {
      alert('Daftar siswa kosong. Silakan pilih kelas atau tambahkan siswa terlebih dahulu.');
      return;
    }

    try {
      setSubmitting(true);
      const { start, end, isRangeExport } = getExportDateRange();
      const { kegiatanName, guruName, periodeLabel, kelasLabel } = getSelectedMeta();

      const workbook = new ExcelJS.Workbook();

      if (isRangeExport) {
        const { recapRows, totals, detailRows } = await fetchRangeAttendanceForClass(start, end);
        const rangeLabel = start === end ? start : `${start} s.d. ${end}`;
        const overallPersen = totals.total > 0 ? ((totals.hadir / totals.total) * 100).toFixed(1) : '0.0';

        const worksheet = workbook.addWorksheet(`Rekap Kelas ${kelasLabel}`);
        worksheet.columns = [
          { width: 6 },  // No
          { width: 12 }, // NIS
          { width: 32 }, // Nama Siswa
          { width: 10 }, // Hadir
          { width: 10 }, // Sakit
          { width: 10 }, // Izin
          { width: 10 }, // Alpa
          { width: 10 }, // Haid
          { width: 10 }, // Total
          { width: 12 }  // % Hadir
        ];

        await addExcelHeaderAndLogos(
          worksheet,
          workbook,
          `Laporan Presensi Kegiatan Keagamaan - Kelas ${kelasLabel}`,
          10
        );

        worksheet.getCell('A9').value =
          `Kegiatan: ${formData.kegiatan_id ? kegiatanName : 'Semua Kegiatan'} | Tanggal: ${rangeLabel} | ${periodeLabel} | Wali Kelas/Guru: ${guruName}`;
        worksheet.mergeCells('A9:J9');
        worksheet.getCell('A9').font = { bold: true, size: 10 };
        worksheet.getCell('A9').alignment = { horizontal: 'center' };

        const headerRow = worksheet.getRow(10);
        headerRow.values = ['NO', 'NIS', 'NAMA SISWA', 'HADIR', 'SAKIT', 'IZIN', 'ALPA', 'HAID', 'TOTAL', '% HADIR'];

        recapRows.forEach((r, idx) => {
          const row = worksheet.getRow(11 + idx);
          const vals = [idx + 1, r.nis, r.nama, r.hadir, r.sakit, r.izin, r.alpa, r.haid, r.total, `${r.persen}%`];
          vals.forEach((v, cIdx) => {
            const cell = row.getCell(cIdx + 1);
            cell.value = v;
            cell.alignment = { horizontal: cIdx === 2 ? 'left' : 'center', vertical: 'middle' };
          });
        });

        applyColorfulTableStyle(worksheet, 10, recapRows.length, 10);

        const totalRowIdx = 11 + recapRows.length;
        const totalRow = worksheet.getRow(totalRowIdx);
        totalRow.values = [
          '',
          '',
          'TOTAL KESELURUHAN',
          totals.hadir,
          totals.sakit,
          totals.izin,
          totals.alpa,
          totals.haid,
          totals.total,
          `${overallPersen}%`
        ];
        for (let c = 1; c <= 10; c++) {
          const cell = totalRow.getCell(c);
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          cell.alignment = { horizontal: c <= 3 ? 'right' : 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }

        const sigStart = totalRowIdx + 2;
        worksheet.mergeCells(sigStart, 1, sigStart, 4);
        worksheet.getCell(sigStart, 1).value = 'Mengetahui, Kepala Sekolah';
        worksheet.getCell(sigStart, 1).alignment = { horizontal: 'center' };

        worksheet.mergeCells(sigStart + 4, 1, sigStart + 4, 4);
        worksheet.getCell(sigStart + 4, 1).value = 'NUR FADILAH, S.Pd';
        worksheet.getCell(sigStart + 4, 1).font = { bold: true, underline: true };
        worksheet.getCell(sigStart + 4, 1).alignment = { horizontal: 'center' };

        worksheet.mergeCells(sigStart, 6, sigStart, 10);
        worksheet.getCell(sigStart, 6).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy', { locale: idLocale })}`;
        worksheet.getCell(sigStart, 6).alignment = { horizontal: 'center' };

        worksheet.mergeCells(sigStart + 1, 6, sigStart + 1, 10);
        worksheet.getCell(sigStart + 1, 6).value = 'Wali Kelas / Guru Pengampu';
        worksheet.getCell(sigStart + 1, 6).alignment = { horizontal: 'center' };

        worksheet.mergeCells(sigStart + 4, 6, sigStart + 4, 10);
        worksheet.getCell(sigStart + 4, 6).value = guruName;
        worksheet.getCell(sigStart + 4, 6).font = { bold: true, underline: true };
        worksheet.getCell(sigStart + 4, 6).alignment = { horizontal: 'center' };

        // Sheet 2: Rincian Harian
        const detailSheet = workbook.addWorksheet('Rincian Harian');
        detailSheet.columns = [
          { width: 6 },
          { width: 14 },
          { width: 10 },
          { width: 12 },
          { width: 32 },
          { width: 26 },
          { width: 16 }
        ];
        await addExcelHeaderAndLogos(
          detailSheet,
          workbook,
          `Rincian Harian Presensi Keagamaan - Kelas ${kelasLabel}`,
          7
        );
        detailSheet.getCell('A9').value = `Periode: ${rangeLabel} | ${periodeLabel} | Total Catatan: ${detailRows.length}`;
        detailSheet.mergeCells('A9:G9');
        detailSheet.getCell('A9').font = { bold: true, size: 10 };
        detailSheet.getCell('A9').alignment = { horizontal: 'center' };

        detailSheet.getRow(10).values = ['NO', 'TANGGAL', 'JAM', 'NIS', 'NAMA SISWA', 'KEGIATAN', 'STATUS'];
        detailRows.forEach((d, idx) => {
          const r = detailSheet.getRow(11 + idx);
          const vals = [idx + 1, d.tanggal, d.jam, d.nis, d.nama, d.kegiatan, d.alasan];
          vals.forEach((v, cIdx) => {
            const cell = r.getCell(cIdx + 1);
            cell.value = v;
            cell.alignment = { horizontal: cIdx === 4 || cIdx === 5 ? 'left' : 'center', vertical: 'middle' };
          });
        });
        applyColorfulTableStyle(detailSheet, 10, detailRows.length, 7);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileRange = start === end ? start : `${start}_sd_${end}`;
        saveAs(blob, `Laporan_Presensi_Keagamaan_${kelasLabel}_${fileRange}.xlsx`);
        return;
      }

      const sheetTitle = isReportMode ? `Laporan ${kelasLabel}` : `Formulir ${kelasLabel}`;
      const docExcelTitle = isReportMode
        ? `Laporan Presensi Kegiatan Keagamaan - Kelas ${kelasLabel}`
        : `Formulir Presensi Kegiatan Keagamaan - Kelas ${kelasLabel}`;
      const worksheet = workbook.addWorksheet(sheetTitle);

      worksheet.columns = [
        { width: 6 },  // No
        { width: 12 }, // NIS
        { width: 32 }, // Nama Siswa
        { width: 14 }, // Status
        { width: 26 }, // Catatan Siswa
        { width: 26 }  // Tindakan Guru
      ];

      await addExcelHeaderAndLogos(
        worksheet,
        workbook,
        docExcelTitle,
        6
      );

      worksheet.getCell('A9').value = `Kegiatan: ${kegiatanName} | Tanggal: ${formData.tanggal} (${formData.jam}) | ${periodeLabel} | Wali Kelas/Guru: ${guruName}`;
      worksheet.mergeCells('A9:F9');
      worksheet.getCell('A9').font = { bold: true, size: 10 };
      worksheet.getCell('A9').alignment = { horizontal: 'center' };

      const headerRow = worksheet.getRow(10);
      headerRow.values = ['NO', 'NIS', 'NAMA SISWA', 'STATUS', 'CATATAN SISWA', 'TINDAKAN GURU'];

      siswaList.forEach((s, idx) => {
        const r = worksheet.getRow(11 + idx);
        const vals = [
          idx + 1,
          s.nis || '-',
          s.nama,
          s.absensi || 'Hadir',
          s.catatan_siswa || '-',
          s.tindakan || '-'
        ];
        vals.forEach((v, cIdx) => {
          const cell = r.getCell(cIdx + 1);
          cell.value = v;
          cell.alignment = { horizontal: cIdx === 0 || cIdx === 1 || cIdx === 3 ? 'center' : 'left', vertical: 'middle' };
        });
      });

      applyColorfulTableStyle(worksheet, 10, siswaList.length, 6);

      const summaryRowIdx = 11 + siswaList.length + 1;
      worksheet.mergeCells(`A${summaryRowIdx}:F${summaryRowIdx}`);
      worksheet.getCell(`A${summaryRowIdx}`).value =
        `Rekap: Hadir (${countHadir}) | Sakit (${countSakit}) | Izin (${countIzin}) | Alpa (${countAlpa}) | Haid (${countHaid}) | Total (${siswaList.length})`;
      worksheet.getCell(`A${summaryRowIdx}`).font = { bold: true, size: 10 };

      const sigStart = summaryRowIdx + 2;
      worksheet.mergeCells(sigStart, 1, sigStart, 3);
      worksheet.getCell(sigStart, 1).value = 'Mengetahui, Kepala Sekolah';
      worksheet.getCell(sigStart, 1).alignment = { horizontal: 'center' };

      worksheet.mergeCells(sigStart + 4, 1, sigStart + 4, 3);
      worksheet.getCell(sigStart + 4, 1).value = 'NUR FADILAH, S.Pd';
      worksheet.getCell(sigStart + 4, 1).font = { bold: true, underline: true };
      worksheet.getCell(sigStart + 4, 1).alignment = { horizontal: 'center' };

      worksheet.mergeCells(sigStart, 4, sigStart, 6);
      worksheet.getCell(sigStart, 4).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy', { locale: idLocale })}`;
      worksheet.getCell(sigStart, 4).alignment = { horizontal: 'center' };

      worksheet.mergeCells(sigStart + 1, 4, sigStart + 1, 6);
      worksheet.getCell(sigStart + 1, 4).value = 'Wali Kelas / Guru Pengampu';
      worksheet.getCell(sigStart + 1, 4).alignment = { horizontal: 'center' };

      worksheet.mergeCells(sigStart + 4, 4, sigStart + 4, 6);
      worksheet.getCell(sigStart + 4, 4).value = guruName;
      worksheet.getCell(sigStart + 4, 4).font = { bold: true, underline: true };
      worksheet.getCell(sigStart + 4, 4).alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filePrefix = isReportMode ? 'Laporan_Presensi_Keagamaan' : 'Formulir_Presensi_Keagamaan';
      saveAs(blob, `${filePrefix}_${kelasLabel}_${formData.tanggal}.xlsx`);
    } catch (err: any) {
      console.error('Error saving excel form:', err);
      alert('Gagal menyimpan file Excel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Form Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl sm:rounded-3xl md:rounded-[40px] p-1 sm:p-2 shadow-xl shadow-emerald-900/10">
        <div className="p-4 sm:p-6 md:p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 sm:mb-2">
              Form Isian Presensi Kegiatan Keagamaan
            </h2>
            <p className="text-emerald-100/80 text-xs sm:text-sm font-medium tracking-wide">
              {isReportMode
                ? `Data presensi kelas ${formData.kelas} telah tersimpan — siap dicetak atau diunduh sebagai Laporan Presensi Kegiatan Keagamaan`
                : 'Kelola presensi, absensi, dan nilai kegiatan keagamaan siswa secara terpadu per kelas'}
            </p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2.5 shrink-0 print:hidden">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handlePrintForm}
                disabled={submitting}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold flex items-center gap-2 transition-all backdrop-blur-xs disabled:opacity-50 cursor-pointer"
                title={
                  isReportMode || getExportDateRange().isRangeExport
                    ? 'Cetak Laporan atau Simpan sebagai PDF'
                    : 'Cetak Formulir atau Simpan sebagai PDF'
                }
              >
                <Printer size={16} />{' '}
                {isReportMode || getExportDateRange().isRangeExport ? 'Cetak Laporan / PDF' : 'Cetak / PDF'}
              </button>
              <button
                type="button"
                onClick={handleSaveFormExcel}
                disabled={submitting}
                className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                title={
                  isReportMode || getExportDateRange().isRangeExport
                    ? 'Simpan Laporan sebagai File Excel'
                    : 'Simpan sebagai File Excel'
                }
              >
                <FileSpreadsheet size={16} />{' '}
                {isReportMode || getExportDateRange().isRangeExport ? 'Simpan Laporan Excel' : 'Simpan Excel'}
              </button>
            </div>
            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2 backdrop-blur-xs flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-white/95 uppercase tracking-wider px-0.5">
                  Mulai Tanggal
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={e => handleChangeExportStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold border border-white/50 outline-none focus:ring-2 focus:ring-emerald-300 shadow-xs"
                />
              </div>
              <span className="text-white/90 text-xs font-bold pb-2 px-0.5">s.d.</span>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-white/95 uppercase tracking-wider px-0.5">
                  Akhir Tanggal
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={e => handleChangeExportEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold border border-white/50 outline-none focus:ring-2 focus:ring-emerald-300 shadow-xs"
                />
              </div>
              {hasCustomExportRange && (
                <button
                  type="button"
                  onClick={() => {
                    setHasCustomExportRange(false);
                    setExportStartDate(formData.tanggal);
                    setExportEndDate(formData.tanggal);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors cursor-pointer mb-0.5"
                  title="Samakan dengan tanggal kegiatan di formulir"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white m-1 sm:m-2 rounded-xl sm:rounded-2xl md:rounded-[32px] p-3.5 sm:p-6 md:p-8">
          {saveFeedback?.type === 'error' && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="text-rose-600 shrink-0" size={18} />
                <span className="text-xs sm:text-sm font-bold text-rose-900">{saveFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveFeedback(null)}
                className="p-1 text-rose-400 hover:text-rose-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {isReportMode && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Check className="text-emerald-600 shrink-0" size={18} />
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {saveFeedback?.type === 'success'
                    ? saveFeedback.message
                    : `Presensi kelas ${formData.kelas} tersimpan. Cetak / Simpan Excel otomatis menghasilkan Laporan Presensi Kegiatan Keagamaan.`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintForm}
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Printer size={14} /> Cetak Laporan
                </button>
                <button
                  type="button"
                  onClick={handleSaveFormExcel}
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Simpan Laporan Excel
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-6">
              {/* Tanggal Kegiatan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tanggal Kegiatan</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="date"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  />
                </div>
              </div>

              {/* Jam Pelaksanaan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Jam Pelaksanaan</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    placeholder="Contoh: 07.30"
                    value={formData.jam}
                    onChange={e => setFormData({ ...formData, jam: e.target.value })}
                  />
                </div>
              </div>

              {/* Pilih Periode */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Periode</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={filterPeriode}
                    onChange={e => setFilterPeriode(e.target.value)}
                  >
                    <option value="ALL">Semua Periode</option>
                    {availablePeriodes.map(p => <option key={p} value={p}>Periode {p}</option>)}
                  </select>
                </div>
              </div>

              {/* Pilih Kelas */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Kelas</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Nama Kegiatan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Kegiatan</label>
                <div className="relative group">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.kegiatan_id}
                    onChange={e => setFormData({ ...formData, kegiatan_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama_kegiatan}</option>)}
                  </select>
                </div>
              </div>

              {/* Wali Kelas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wali Kelas / Guru Pengampu</label>
                  <button
                    type="button"
                    onClick={() => setShowAddGuruModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus size={13} className="stroke-[3]" /> Tambah Guru
                  </button>
                </div>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.wali_kelas_id}
                    onChange={e => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                  >
                    <option value="">-- Pilih Wali Kelas / Guru --</option>
                    {teachers.map((t, idx) => <option key={`${t.id || 'guru'}-${idx}`} value={t.id}>{t.nama_guru}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* DAFTAR SISWA SECTION (SESUAI GAMBAR TERLAMPIR) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                    <Users size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                        Daftar Siswa Kelas {formData.kelas || '7A'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                        Periode {filterPeriode === 'ALL' ? '2026' : filterPeriode}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({siswaList.length} Siswa)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Menampilkan siswa periode baru ({filterPeriode === 'ALL' ? '2026' : filterPeriode}) saja agar data tidak ganda antar tahun ajaran.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleSetAllHadir}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Check size={16} className="text-emerald-600" /> Set Semua Hadir
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualStudent}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={16} /> Tambah Siswa
                  </button>
                </div>
              </div>

              {/* 4 Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Hadir (H)</span>
                  <span className="text-xl font-black text-emerald-700">{countHadir}</span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Sakit (S)</span>
                  <span className="text-xl font-black text-amber-700">{countSakit}</span>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800">Izin (I)</span>
                  <span className="text-xl font-black text-blue-700">{countIzin}</span>
                </div>
                <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Alpa (A)</span>
                  <span className="text-xl font-black text-rose-700">{countAlpa}</span>
                </div>
              </div>

              {countHaid > 0 && (
                <div className="p-2.5 bg-pink-50 rounded-xl border border-pink-200 flex items-center gap-2 text-xs text-pink-700 font-bold">
                  <span>Haid (Tidak Sholat):</span>
                  <span className="px-2 py-0.5 bg-pink-200 text-pink-800 rounded-lg">{countHaid} Siswi</span>
                </div>
              )}

              {/* Search in student list */}
              <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa di kelas..."
                  value={searchSiswa}
                  onChange={e => setSearchSiswa(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                />
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3 min-w-[180px]">Nama Siswa</th>
                      <th className="p-3 text-center min-w-[210px]">Absensi</th>
                      <th className="p-3 min-w-[180px]">Catatan Siswa</th>
                      <th className="p-3 min-w-[180px]">Tindakan Guru</th>
                      <th className="p-3 text-center w-10">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSiswaTable.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          {siswaList.length === 0
                            ? `Tidak ada siswa untuk Kelas ${formData.kelas} (${filterPeriode === 'ALL' ? 'Semua Periode' : `Periode ${filterPeriode}`}). Klik "+ Tambah Siswa" untuk menambahkan secara manual.`
                            : `Tidak ditemukan siswa yang cocok dengan pencarian "${searchSiswa}".`}
                        </td>
                      </tr>
                    ) : (
                      filteredSiswaTable.map((siswa) => {
                        const actualIdx = siswaList.findIndex(item => item.siswa_id === siswa.siswa_id);

                        return (
                          <tr key={siswa.siswa_id || actualIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-center font-medium text-slate-400">{actualIdx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 uppercase tracking-tight flex items-center flex-wrap gap-1.5">
                                <span>{siswa.nama}</span>
                                {siswa.sudah_izin && (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300 normal-case"
                                    title={siswa.keterangan_izin || 'Izin Form Wali Murid'}
                                  >
                                    <UserCheck size={11} /> {siswa.keterangan_izin || 'Izin Form Wali Murid'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                                {siswa.nis && <span>NIS: {siswa.nis}</span>}
                                {siswa.periode && (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200/60">
                                    Periode {siswa.periode}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Absensi Segmented Buttons */}
                            <td className="p-3 text-center">
                              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 gap-1 items-center">
                                {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status) => {
                                  const isSelected = siswa.absensi === status;
                                  let activeClass = '';
                                  if (isSelected) {
                                    if (status === 'Hadir') activeClass = 'bg-emerald-600 text-white shadow-xs';
                                    else if (status === 'Sakit') activeClass = 'bg-amber-500 text-white shadow-xs';
                                    else if (status === 'Izin') activeClass = 'bg-blue-600 text-white shadow-xs';
                                    else if (status === 'Alpa') activeClass = 'bg-rose-600 text-white shadow-xs';
                                  } else {
                                    activeClass = 'text-slate-500 hover:text-slate-800 hover:bg-white/60';
                                  }

                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleUpdateStudent(actualIdx, 'absensi', status)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeClass}`}
                                      title={status}
                                    >
                                      {status[0]}
                                    </button>
                                  );
                                })}

                                {/* Optional Haid button for religious screening */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStudent(actualIdx, 'absensi', siswa.absensi === 'Haid' ? 'Hadir' : 'Haid')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    siswa.absensi === 'Haid'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-rose-400 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title="Haid (Tidak Sholat)"
                                >
                                  Haid
                                </button>
                              </div>
                            </td>

                            {/* Catatan Siswa */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Catatan perilaku/keaktifan"
                                value={siswa.catatan_siswa || ''}
                                onChange={e => handleUpdateStudent(actualIdx, 'catatan_siswa', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs"
                              />
                            </td>

                            {/* Tindakan Guru */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Tindakan/solusi guru..."
                                value={siswa.tindakan || ''}
                                onChange={e => handleUpdateStudent(actualIdx, 'tindakan', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs"
                              />
                            </td>

                            {/* Hapus Baris */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(actualIdx)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="Hapus siswa dari daftar ini"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={handlePrintForm}
                disabled={submitting}
                className="px-6 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                <Printer size={18} />{' '}
                {isReportMode || getExportDateRange().isRangeExport ? 'Cetak Laporan' : 'Cetak Formulir'}
              </button>
              <button
                type="button"
                onClick={handleSaveFormExcel}
                disabled={submitting}
                className="px-6 py-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet size={18} />{' '}
                {isReportMode || getExportDateRange().isRangeExport ? 'Simpan Laporan Excel' : 'Simpan Formulir Excel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={20} />
                )}
                {`Simpan Presensi Kelas (${siswaList.length} Siswa)`}
              </button>
            </div>
          </form>
        </div>
      </div>


      {/* Modal Input Tambah Guru Baru */}
      {showAddGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Input Tambah Guru Baru</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Tambahkan ke daftar Wali Kelas / Guru Pengampu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddGuruModal(false);
                  setNewGuruNama('');
                  setNewGuruNip('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                  value={newGuruNama}
                  onChange={e => setNewGuruNama(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-semibold text-slate-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  NIP Guru <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 19750812 200501 2 004"
                  value={newGuruNip}
                  onChange={e => setNewGuruNip(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-semibold text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuruModal(false);
                    setNewGuruNama('');
                    setNewGuruNip('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingNewGuru || !newGuruNama.trim()}
                  onClick={async () => {
                    const trimmed = newGuruNama.trim();
                    if (!trimmed) return;
                    try {
                      setIsSavingNewGuru(true);
                      const res = await addMasterGuru(trimmed, newGuruNip);
                      if (res.success && res.guru) {
                        const updatedTeachers = deduplicateGuruList(res.list);
                        setTeachers(updatedTeachers);
                        const added = updatedTeachers.find(t => t.nama_guru.toLowerCase() === res.guru!.nama_guru.toLowerCase()) || res.guru;
                        setFormData(prev => ({ ...prev, wali_kelas_id: added.id }));
                        setShowAddGuruModal(false);
                        setNewGuruNama('');
                        setNewGuruNip('');
                      } else {
                        alert(res.error || 'Gagal menambahkan guru');
                      }
                    } catch (err: any) {
                      alert(err.message || 'Gagal menambahkan guru');
                    } finally {
                      setIsSavingNewGuru(false);
                    }
                  }}
                  className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSavingNewGuru ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Plus size={14} className="stroke-[3]" /> Simpan & Pilih Guru
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeagamaanAbsensi;
