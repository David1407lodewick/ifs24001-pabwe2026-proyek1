import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App.jsx'

// ==================================================
// HELPER / FUNGSI BANTU
// ==================================================

function isiInput(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function isiFormRegistrasi({
  nama = 'Mahasiswa Del',
  username = 'mahasiswa01',
  email = 'mahasiswa01@example.com',
  password = 'Belajar123',
  konfirmasi = password,
} = {}) {
  isiInput('Nama lengkap', nama)
  isiInput('Username', username)
  isiInput('Email', email)
  isiInput('Password', password)
  isiInput('Konfirmasi password', konfirmasi)
}

function siapkanPenggunaLogin() {
  localStorage.setItem('delstudyhub_authenticated', 'true')
  localStorage.setItem('delstudyhub_user', 'mahasiswa01')
  localStorage.setItem('delstudyhub_user_name', 'Mahasiswa Del')
}

function bukaDashboard() {
  siapkanPenggunaLogin()
  window.history.replaceState({}, '', '/dashboard')
  render(<App />)
}

function klikNavigasi(nama) {
  const target = nama.toLowerCase().replace(/\s+/g, '')
  const tombol = screen.getAllByRole('button').find((elemen) =>
    elemen.textContent.trim().toLowerCase().replace(/\s+/g, '').includes(target),
  )

  if (!tombol) {
    const tersedia = screen.getAllByRole('button')
      .map((elemen) => elemen.textContent.trim()).join(', ')
    throw new Error(`Tombol navigasi "${nama}" tidak ditemukan. Tombol tersedia: ${tersedia}`)
  }

  fireEvent.click(tombol)
}

// ==================================================
// PENGUJIAN DELSTUDYHUB
// ==================================================

describe('Pengujian DelStudyHub', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  // 1. Menampilkan halaman publik
  it('menampilkan halaman publik', () => {
    render(<App />)
    expect(screen.getByRole('heading', {
      name: /belajar lebih teratur bersama delstudyhub/i,
    })).toBeTruthy()
  })

  // 2. Menampilkan halaman registrasi
  it('menampilkan halaman registrasi', () => {
    window.history.replaceState({}, '', '/register')
    render(<App />)
    expect(screen.getByRole('heading', { name: /buat akun delstudyhub/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Daftar' })).toBeTruthy()
  })

  // 3. Menolak registrasi jika konfirmasi password berbeda
  it('menolak registrasi jika konfirmasi password berbeda', () => {
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ password: 'Belajar123', konfirmasi: 'Berbeda123' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/konfirmasi password tidak sama/i)
    expect(localStorage.getItem('delstudyhub_users')).toBeNull()
  })

  // 4. Menyimpan akun saat registrasi berhasil
  it('menyimpan akun saat registrasi berhasil', () => {
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi()
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/registrasi berhasil/i)
    const users = JSON.parse(localStorage.getItem('delstudyhub_users'))
    expect(users).toHaveLength(1)
    expect(users[0].username).toBe('mahasiswa01')
    expect(users[0].email).toBe('mahasiswa01@example.com')
    expect(screen.getByRole('link', { name: /lanjut ke login/i })).toBeTruthy()
  })

  // 5. Menolak username yang sudah terdaftar
  it('menolak username yang sudah terdaftar', () => {
    localStorage.setItem('delstudyhub_users', JSON.stringify([{
      name: 'Mahasiswa Lama', username: 'mahasiswa01',
      email: 'lama@example.com', password: 'Password123',
    }]))
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ email: 'baru@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/username sudah digunakan/i)
    expect(JSON.parse(localStorage.getItem('delstudyhub_users'))).toHaveLength(1)
  })

  // 6. Menampilkan pesan ketika login gagal
  it('menampilkan pesan jika login menggunakan akun yang salah', () => {
    window.history.replaceState({}, '', '/login')
    render(<App />)
    isiInput('Username', 'tidakada')
    isiInput('Password', 'Password123')
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(screen.getByRole('alert').textContent).toMatch(/username atau password tidak sesuai/i)
    expect(localStorage.getItem('delstudyhub_authenticated')).not.toBe('true')
  })

  // 7. Melindungi dashboard dari pengguna yang belum login
  it('mengarahkan pengguna yang belum login dari dashboard ke login', async () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    expect(await screen.findByRole('heading', { name: /masuk ke delstudyhub/i })).toBeTruthy()
    expect(window.location.pathname).toBe('/auth/login')
  })

  // 8. Menolak password yang kurang dari 8 karakter
  it('menolak password registrasi yang kurang dari 8 karakter', () => {
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ password: 'abc123', konfirmasi: 'abc123' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/password harus terdiri dari minimal 8 karakter/i)
    expect(localStorage.getItem('delstudyhub_users')).toBeNull()
  })

  // 9. Menolak email yang sudah terdaftar
  it('menolak email yang sudah terdaftar', () => {
    localStorage.setItem('delstudyhub_users', JSON.stringify([{
      name: 'Mahasiswa Lama', username: 'lama01',
      email: 'mahasiswa01@example.com', password: 'Belajar123',
    }]))
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ username: 'mahasiswaBaru', email: 'mahasiswa01@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/email sudah terdaftar/i)
    expect(JSON.parse(localStorage.getItem('delstudyhub_users'))).toHaveLength(1)
  })

  // 10. Berhasil login menggunakan akun yang benar
  it('berhasil login menggunakan akun yang benar', async () => {
    localStorage.setItem('delstudyhub_users', JSON.stringify([{
      name: 'Mahasiswa Del', username: 'mahasiswa01',
      email: 'mahasiswa01@example.com', password: 'Belajar123',
    }]))
    window.history.replaceState({}, '', '/login')
    render(<App />)
    isiInput('Username', 'mahasiswa01')
    isiInput('Password', 'Belajar123')
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(localStorage.getItem('delstudyhub_authenticated')).toBe('true')
    expect(localStorage.getItem('delstudyhub_user')).toBe('mahasiswa01')
    expect(localStorage.getItem('delstudyhub_user_name')).toBe('Mahasiswa Del')
    expect(window.location.pathname).toBe('/dashboard')
  })

  // 11. Menambahkan tugas baru
  it('menambahkan tugas baru dan menyimpannya', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')
    fireEvent.click(screen.getByRole('button', { name: /tambah tugas/i }))
    isiInput('Nama tugas', 'Tugas Pengujian Perangkat Lunak')
    isiInput('Deadline', '2026-11-01')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tugas' }))
    expect(await screen.findByText('Tugas Pengujian Perangkat Lunak')).toBeTruthy()
    await waitFor(() => {
      const tasks = JSON.parse(localStorage.getItem('delstudyhub_tasks'))
      expect(tasks.some((task) => task.title === 'Tugas Pengujian Perangkat Lunak')).toBe(true)
    })
  })

  // 12. Mengedit nama dan deskripsi kelompok belajar
  it('mengedit nama dan deskripsi kelompok belajar', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')
    fireEvent.click(screen.getByRole('button', { name: /tambah kelompok/i }))
    isiInput('Nama kelompok', 'Kelompok Lama')
    const mataKuliah = screen.getByLabelText('Mata kuliah')
    expect(mataKuliah.options.length).toBeGreaterThan(0)
    fireEvent.change(mataKuliah, { target: { value: mataKuliah.options[0].value } })
    isiInput('Deskripsi', 'Deskripsi lama')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Kelompok' }))
    expect(await screen.findByRole('heading', { name: 'Kelompok Lama' })).toBeTruthy()
    const tombolKelompok = screen.getAllByRole('button', { name: /Kelompok Lama/ })
      .find((tombol) => tombol.closest('.task-row'))
    expect(tombolKelompok).toBeTruthy()
    const baris = tombolKelompok.closest('.task-row')
    expect(baris).not.toBeNull()
    fireEvent.click(within(baris).getByRole('button', { name: 'Edit' }))
    isiInput('Nama kelompok', 'Kelompok Baru')
    isiInput('Deskripsi', 'Deskripsi baru')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }))
    expect(await screen.findByRole('heading', { name: 'Kelompok Baru' })).toBeTruthy()
    expect(screen.getByText(/Deskripsi baru/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Kelompok Lama' })).toBeNull()
    await waitFor(() => {
      const groups = JSON.parse(localStorage.getItem('delstudyhub_groups'))
      expect(groups.some((g) => g.name === 'Kelompok Baru' && g.description === 'Deskripsi baru')).toBe(true)
    })
  })

  // 13. Filter materi berdasarkan mata kuliah
  it('menampilkan materi sesuai filter mata kuliah', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Algoritma')
    const select = screen.getByLabelText('Mata kuliah')
    const options = Array.from(select.options)
    expect(options.length).toBeGreaterThan(1)
    const pertama = options[0].value
    const kedua = options[1].value
    fireEvent.change(select, { target: { value: pertama } })
    isiInput('Tautan materi', 'https://example.com/algoritma')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Algoritma')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Kedua')
    fireEvent.change(screen.getByLabelText('Mata kuliah'), { target: { value: kedua } })
    isiInput('Tautan materi', 'https://example.com/kedua')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Kedua')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Filter mata kuliah'), { target: { value: pertama } })
    expect(screen.getByText('Materi Algoritma')).toBeTruthy()
    expect(screen.queryByText('Materi Kedua')).toBeNull()
  })

  // 14. Mengalihkan pengguna yang belum login ke halaman login
  it('mengalihkan pengguna yang belum login ke halaman login', async () => {
    localStorage.clear()
    sessionStorage.clear()
    window.history.pushState({}, '', '/dashboard')
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/auth/login'))
  })

  // 15. Memastikan kolom wajib registrasi tidak boleh kosong
  it('memastikan kolom wajib registrasi tidak boleh kosong', () => {
    window.history.replaceState({}, '', '/auth/register')
    render(<App />)
    const required = document.querySelectorAll('form input[required], form select[required], form textarea[required]')
    expect(required.length).toBeGreaterThan(0)
    required.forEach((kolom) => expect(kolom.checkValidity()).toBe(false))
  })

  // 16. Menambahkan jadwal kuliah baru
  it('menambahkan jadwal kuliah baru', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')
    fireEvent.click(screen.getByRole('button', { name: /tambah jadwal/i }))
    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'IF-01')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }))
    expect(await screen.findByText(/Ruangan:\s*IF-01/i)).toBeTruthy()
    await waitFor(() => {
      const schedules = JSON.parse(localStorage.getItem('delstudyhub_schedules'))
      expect(schedules.some((s) => s.room === 'IF-01' && s.startTime === '08:00')).toBe(true)
    })
  })

  // 17. Menolak registrasi ketika kolom wajib kosong
  it('menolak registrasi ketika kolom wajib kosong', () => {
    window.history.replaceState({}, '', '/auth/register')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /daftar|registrasi/i }))
    expect(window.location.pathname).toBe('/auth/register')
  })

  // 18. Menambahkan materi dengan tautan valid
  it('menambahkan materi dengan tautan yang valid', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Pengujian')
    isiInput('Tautan materi', 'https://example.com/materi')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Pengujian')).toBeTruthy()
    await waitFor(() => {
      const materials = JSON.parse(localStorage.getItem('delstudyhub_materials'))
      expect(materials.some((m) => m.title === 'Materi Pengujian' && m.url === 'https://example.com/materi')).toBe(true)
    })
  })

  // 19. Menolak jadwal dengan jam selesai sebelum jam mulai
  it('menolak jadwal dengan jam selesai sebelum jam mulai', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')
    fireEvent.click(screen.getByRole('button', { name: /tambah jadwal/i }))
    isiInput('Mata kuliah', 'Algoritma dan Pemrograman')
    isiInput('Hari', 'Senin')
    isiInput('Jam mulai', '10:00')
    isiInput('Jam selesai', '08:00')
    isiInput('Ruangan', 'Lab Komputer')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }))
    await waitFor(() => {
      const schedules = JSON.parse(localStorage.getItem('delstudyhub_schedules') || '[]')
      expect(schedules.some((s) => s.course === 'Algoritma dan Pemrograman' && s.startTime === '10:00' && s.endTime === '08:00')).toBe(false)
    })
  })

  // 20. Mengedit jadwal kuliah
  it('mengedit jadwal kuliah dan memperbarui penyimpanan', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')
    fireEvent.click(screen.getByRole('button', { name: /tambah jadwal/i }))
    isiInput('Mata kuliah', 'Algoritma dan Pemrograman')
    isiInput('Hari', 'Senin')
    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'Lab Komputer')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }))
    expect(await screen.findByText(/Ruangan:\s*Lab Komputer/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit jadwal Algoritma dan Pemrograman' }))
    isiInput('Ruangan', 'Lab Komputer 2')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }))
    expect(await screen.findByText(/Ruangan:\s*Lab Komputer 2/)).toBeTruthy()
    await waitFor(() => {
      const schedules = JSON.parse(localStorage.getItem('delstudyhub_schedules'))
      expect(schedules.some((s) => s.course === 'Algoritma dan Pemrograman' && s.room === 'Lab Komputer 2')).toBe(true)
    })
  })

  // 21. Menghapus jadwal kuliah
  it('menghapus jadwal kuliah dan memperbarui penyimpanan', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')
    fireEvent.click(screen.getByRole('button', { name: /tambah jadwal/i }))
    isiInput('Mata kuliah', 'Algoritma dan Pemrograman')
    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'Lab Komputer')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }))
    expect(await screen.findByText(/Lab Komputer/)).toBeTruthy()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus jadwal Algoritma dan Pemrograman' }))
    await waitFor(() => {
      const schedules = JSON.parse(localStorage.getItem('delstudyhub_schedules'))
      expect(schedules.some((s) => s.room === 'Lab Komputer')).toBe(false)
    })
  })

  // 22. Menghapus materi
  it('menghapus materi dan memperbarui penyimpanan', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi untuk Dihapus')
    isiInput('Tautan materi', 'https://example.com/materi-hapus')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi untuk Dihapus')).toBeTruthy()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus materi Materi untuk Dihapus' }))
    await waitFor(() => expect(screen.queryByText('Materi untuk Dihapus')).toBeNull())
    await waitFor(() => {
      const materials = JSON.parse(localStorage.getItem('delstudyhub_materials'))
      expect(materials.some((m) => m.title === 'Materi untuk Dihapus')).toBe(false)
    })
  })

  // 23. Mencari materi berdasarkan judul
  it('mencari materi berdasarkan judul', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Struktur Data')
    isiInput('Tautan materi', 'https://example.com/struktur-data')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Struktur Data')).toBeTruthy()
    isiInput('Cari materi', 'Struktur Data')
    expect(screen.getByText('Materi Struktur Data')).toBeTruthy()
    expect(screen.queryByText('Materi tidak ditemukan. Coba ubah kata pencarian atau filter mata kuliah.')).toBeNull()
  })

  // 24. Mengedit materi
  it('mengedit materi dan menyimpan perubahan', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Lama')
    isiInput('Tautan materi', 'https://example.com/lama')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Lama')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit materi Materi Lama' }))
    isiInput('Judul materi', 'Materi Baru')
    isiInput('Tautan materi', 'https://example.com/baru')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }))
    expect(await screen.findByText('Materi Baru')).toBeTruthy()
    const materials = JSON.parse(localStorage.getItem('delstudyhub_materials'))
    expect(materials.some((m) => m.title === 'Materi Baru' && m.url === 'https://example.com/baru')).toBe(true)
    expect(materials.some((m) => m.title === 'Materi Lama')).toBe(false)
  })

  // 25. Menambahkan anggota kelompok belajar
  it('menambahkan anggota ke kelompok belajar', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')
    fireEvent.click(screen.getByRole('button', { name: /tambah kelompok/i }))
    isiInput('Nama kelompok', 'Kelompok Pengujian')
    isiInput('Deskripsi', 'Belajar bersama')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Kelompok' }))
    expect(await screen.findByRole('heading', { name: 'Kelompok Pengujian' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /tambah anggota/i }))
    isiInput('Nama anggota', 'Budi Santoso')
    isiInput('NIM', '11S24002')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Anggota' }))
    expect(await screen.findByText('Budi Santoso')).toBeTruthy()
    await waitFor(() => {
      const groups = JSON.parse(localStorage.getItem('delstudyhub_groups'))
      expect(groups.some((g) => g.name === 'Kelompok Pengujian' && g.members.some((m) => m.name === 'Budi Santoso' && m.nim === '11S24002'))).toBe(true)
    })
  })

  // 26. Menambahkan agenda diskusi
  it('menambahkan agenda diskusi ke kelompok belajar', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')
    fireEvent.click(screen.getByRole('button', { name: /tambah kelompok/i }))
    isiInput('Nama kelompok', 'Kelompok Agenda')
    isiInput('Deskripsi', 'Persiapan ujian')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Kelompok' }))
    expect(await screen.findByRole('heading', { name: 'Kelompok Agenda' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /tambah agenda/i }))
    isiInput('Topik diskusi', 'Persiapan Ujian Akhir')
    isiInput('Tanggal', '2026-11-10')
    isiInput('Jam', '15:00')
    isiInput('Tempat atau tautan pertemuan', 'Perpustakaan')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Agenda' }))
    expect(await screen.findByText('Persiapan Ujian Akhir')).toBeTruthy()
    await waitFor(() => {
      const groups = JSON.parse(localStorage.getItem('delstudyhub_groups'))
      expect(groups.some((g) => g.name === 'Kelompok Agenda' && g.agendas.some((a) => a.title === 'Persiapan Ujian Akhir' && a.date === '2026-11-10' && a.time === '15:00'))).toBe(true)
    })
  })

  // 27. Membaca data pengguna yang rusak di localStorage
  it('tetap dapat melakukan registrasi ketika data pengguna rusak', () => {
    localStorage.setItem('delstudyhub_users', '{data tidak valid')
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ username: 'mahasiswaBaru', email: 'baru@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/registrasi berhasil/i)
    const users = JSON.parse(localStorage.getItem('delstudyhub_users'))
    expect(users).toHaveLength(1)
    expect(users[0].username).toBe('mahasiswabaru')
  })

  // 28. Menolak tautan materi dengan protokol selain HTTP/HTTPS
  it('menolak materi dengan protokol tautan yang tidak didukung', () => {
    bukaDashboard()
    klikNavigasi('Materi')
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Tautan Tidak Valid')
    isiInput('Tautan materi', 'ftp://example.com/materi')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(alertMock).toHaveBeenCalled()
    const materials = JSON.parse(localStorage.getItem('delstudyhub_materials') || '[]')
    expect(materials.some((m) => m.title === 'Materi Tautan Tidak Valid')).toBe(false)
  })

  // 29. Membatalkan penghapusan materi
  it('tidak menghapus materi ketika pengguna memilih Batal', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Tetap Ada')
    isiInput('Tautan materi', 'https://example.com/materi-tetap')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Tetap Ada')).toBeTruthy()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus materi Materi Tetap Ada' }))
    expect(screen.getByText('Materi Tetap Ada')).toBeTruthy()
    const materials = JSON.parse(localStorage.getItem('delstudyhub_materials'))
    expect(materials.some((m) => m.title === 'Materi Tetap Ada')).toBe(true)
  })

  // 30. Menandai tugas sebagai selesai
  it('dapat mengubah status tugas menjadi selesai', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')
    fireEvent.click(screen.getByRole('button', { name: /tambah tugas/i }))
    isiInput('Nama tugas', 'Tugas untuk Diselesaikan')
    isiInput('Deadline', '2026-11-01')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tugas' }))
    const judul = await screen.findByText('Tugas untuk Diselesaikan')
    const baris = judul.closest('.task-row')
    expect(baris).not.toBeNull()
    fireEvent.click(within(baris).getByRole('button', { name: 'Tandai selesai' }))
    await waitFor(() => {
      const tasks = JSON.parse(localStorage.getItem('delstudyhub_tasks'))
      expect(tasks.some((t) => t.title === 'Tugas untuk Diselesaikan' && t.done === true)).toBe(true)
    })
  })

  // 31. Menghapus tugas
  it('dapat menghapus tugas dari daftar', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')
    fireEvent.click(screen.getByRole('button', { name: /tambah tugas/i }))
    isiInput('Nama tugas', 'Tugas yang Dihapus')
    isiInput('Deadline', '2026-11-01')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tugas' }))
    const judul = await screen.findByText('Tugas yang Dihapus')
    const baris = judul.closest('.task-row')
    expect(baris).not.toBeNull()
    fireEvent.click(within(baris).getByRole('button', { name: 'Hapus tugas' }))
    await waitFor(() => expect(screen.queryByText('Tugas yang Dihapus')).toBeNull())
    await waitFor(() => {
      const tasks = JSON.parse(localStorage.getItem('delstudyhub_tasks'))
      expect(tasks.some((t) => t.title === 'Tugas yang Dihapus')).toBe(false)
    })
  })

  // 32. Menguji halaman yang tidak dikenal
  it('mengarahkan halaman yang tidak dikenal ke halaman publik', () => {
    window.history.replaceState({}, '', '/halaman-tidak-tersedia')
    render(<App />)
    expect(screen.getByRole('heading', {
      name: /belajar lebih teratur bersama delstudyhub/i,
    })).toBeTruthy()
  })

  // 33. Membatalkan penghapusan jadwal
  it('tidak menghapus jadwal ketika pengguna memilih Batal', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')
    fireEvent.click(screen.getByRole('button', { name: /tambah jadwal/i }))
    isiInput('Mata kuliah', 'Algoritma dan Pemrograman')
    isiInput('Hari', 'Senin')
    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'IF-03')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }))
    expect(await screen.findByText(/Ruangan:\s*IF-03/i)).toBeTruthy()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus jadwal Algoritma dan Pemrograman' }))
    expect(screen.getByText(/Ruangan:\s*IF-03/i)).toBeTruthy()
    const schedules = JSON.parse(localStorage.getItem('delstudyhub_schedules') || '[]')
    expect(schedules.some((s) => s.room === 'IF-03')).toBe(true)
  })

  // 34. Mencari materi yang tidak ditemukan
  it('menampilkan pesan ketika materi tidak ditemukan', async () => {
    bukaDashboard()
    klikNavigasi('Materi')
    fireEvent.click(screen.getByRole('button', { name: /tambah materi/i }))
    isiInput('Judul materi', 'Materi Algoritma')
    isiInput('Tautan materi', 'https://example.com/algoritma')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Materi' }))
    expect(await screen.findByText('Materi Algoritma')).toBeTruthy()
    isiInput('Cari materi', 'Materi yang tidak tersedia')
    expect(screen.getByText(/materi tidak ditemukan/i)).toBeTruthy()
    expect(screen.queryByText('Materi Algoritma')).toBeNull()
  })

  // 35. Menolak username duplikat dengan kapitalisasi berbeda
  it('menolak username yang sama dengan kapitalisasi berbeda', () => {
    localStorage.setItem('delstudyhub_users', JSON.stringify([{
      name: 'Mahasiswa Lama', username: 'mahasiswa01',
      email: 'lama@example.com', password: 'Belajar123',
    }]))
    window.history.replaceState({}, '', '/register')
    render(<App />)
    isiFormRegistrasi({ username: 'MAHASISWA01', email: 'baru@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByRole('status').textContent).toMatch(/username sudah digunakan/i)
    expect(JSON.parse(localStorage.getItem('delstudyhub_users'))).toHaveLength(1)
  })
})
