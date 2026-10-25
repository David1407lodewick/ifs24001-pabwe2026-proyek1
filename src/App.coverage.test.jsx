
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import App from './App.jsx'

// ==================================================
// FUNGSI BANTU
// ==================================================

function isiInput(label, value) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  })
}

function siapkanPenggunaLogin() {
  localStorage.setItem('delstudyhub_authenticated', 'true')
  localStorage.setItem('delstudyhub_user', 'mahasiswa01')
  localStorage.setItem('delstudyhub_user_name', 'Mahasiswa Del')
}

function siapkanDataPengguna() {
  localStorage.setItem(
    'delstudyhub_users',
    JSON.stringify([
      {
        name: 'Mahasiswa Del',
        username: 'mahasiswa01',
        email: 'mahasiswa01@example.com',
        password: 'Belajar123',
      },
    ]),
  )
}

function bukaDashboard() {
  siapkanPenggunaLogin()
  window.history.replaceState({}, '', '/dashboard')
  render(<App />)
}

function klikNavigasi(nama) {
  const target = nama.toLowerCase().replace(/\s+/g, '')

  const tombol = screen.getAllByRole('button').find((elemen) =>
    elemen.textContent
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .includes(target),
  )

  if (!tombol) {
    throw new Error(`Tombol navigasi "${nama}" tidak ditemukan`)
  }

  fireEvent.click(tombol)
}

function bukaHalaman(path) {
  window.history.replaceState({}, '', path)
  render(<App />)
}

// ==================================================
// RESET KONDISI SEBELUM SETIAP TEST
// ==================================================

beforeEach(() => {
  vi.restoreAllMocks()

  localStorage.clear()
  sessionStorage.clear()

  vi.spyOn(window, 'alert').mockImplementation(() => {})
  vi.spyOn(window, 'confirm').mockReturnValue(false)

  window.history.replaceState({}, '', '/')
})

// ==================================================
// AUTENTIKASI DAN ROUTING
// ==================================================

describe('Autentikasi dan routing', () => {
  it('menampilkan halaman publik pada path utama', () => {
    bukaHalaman('/')

    expect(
      screen.getByRole('heading', {
        name: /belajar lebih teratur bersama delstudyhub/i,
      }),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', { name: /buat akun/i }),
    ).toBeTruthy()
  })

  it('mengarahkan pengguna yang belum login dari dashboard ke login', async () => {
    bukaHalaman('/dashboard')

    expect(
      await screen.findByRole('heading', {
        name: /masuk ke delstudyhub/i,
      }),
    ).toBeTruthy()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/auth/login')
    })
  })

  it('mengarahkan pengguna yang belum login dari halaman materi ke login', async () => {
    bukaHalaman('/materi')

    expect(
      await screen.findByRole('heading', {
        name: /masuk ke delstudyhub/i,
      }),
    ).toBeTruthy()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/auth/login')
    })
  })

  it('mengarahkan path yang tidak dikenal ke halaman publik', async () => {
    bukaHalaman('/halaman-tidak-dikenal')

    expect(
      await screen.findByRole('heading', {
        name: /belajar lebih teratur bersama delstudyhub/i,
      }),
    ).toBeTruthy()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })
  })

  it('mengalihkan pengguna yang sudah login dari halaman login ke dashboard', async () => {
    siapkanPenggunaLogin()
    bukaHalaman('/auth/login')

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeTruthy()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('menampilkan pesan jika login menggunakan akun yang salah', async () => {
    siapkanDataPengguna()
    bukaHalaman('/auth/login')

    isiInput('Username', 'mahasiswa01')
    isiInput('Password', 'PasswordSalah')

    fireEvent.click(
      screen.getByRole('button', { name: 'Login' }),
    )

    const pesan = await screen.findByRole('alert')

    expect(pesan.textContent).toContain(
      'Username atau password tidak sesuai.',
    )

    expect(
      localStorage.getItem('delstudyhub_authenticated'),
    ).toBeNull()
  })

  it('menerima username login tanpa membedakan huruf besar dan kecil', async () => {
    siapkanDataPengguna()
    bukaHalaman('/auth/login')

    isiInput('Username', 'MAHASISWA01')
    isiInput('Password', 'Belajar123')

    fireEvent.click(
      screen.getByRole('button', { name: 'Login' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeTruthy()

    expect(
      localStorage.getItem('delstudyhub_authenticated'),
    ).toBe('true')

    expect(
      localStorage.getItem('delstudyhub_user'),
    ).toBe('mahasiswa01')
  })

  it('mengeluarkan pengguna dan mengarahkan ke halaman login', async () => {
    bukaDashboard()

    fireEvent.click(
      screen.getByRole('button', { name: 'Keluar' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: /masuk ke delstudyhub/i,
      }),
    ).toBeTruthy()

    expect(window.location.pathname).toBe('/auth/login')

    expect(
      localStorage.getItem('delstudyhub_authenticated'),
    ).toBeNull()

    expect(
      localStorage.getItem('delstudyhub_user'),
    ).toBeNull()

    expect(
      localStorage.getItem('delstudyhub_user_name'),
    ).toBeNull()
  })
})

// ==================================================
// REGISTRASI AKUN
// ==================================================

describe('Registrasi akun', () => {
  function isiFormRegistrasi({
    name = 'Mahasiswa Baru',
    username = 'mahasiswa02',
    email = 'mahasiswa02@example.com',
    password = 'Belajar123',
    confirmPassword = 'Belajar123',
  } = {}) {
    isiInput('Nama lengkap', name)
    isiInput('Username', username)
    isiInput('Email', email)
    isiInput('Password', password)
    isiInput('Konfirmasi password', confirmPassword)
  }

  it('menolak password yang kurang dari delapan karakter', async () => {
    bukaHalaman('/register')

    isiFormRegistrasi({
      password: '12345',
      confirmPassword: '12345',
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Daftar' }),
    )

    const pesan = await screen.findByRole('status')

    expect(pesan.textContent).toContain(
      'Password harus terdiri dari minimal 8 karakter.',
    )

    expect(
      localStorage.getItem('delstudyhub_users'),
    ).toBeNull()
  })

  it('menolak konfirmasi password yang tidak sama', async () => {
    bukaHalaman('/register')

    isiFormRegistrasi({
      password: 'Belajar123',
      confirmPassword: 'Password456',
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Daftar' }),
    )

    const pesan = await screen.findByRole('status')

    expect(pesan.textContent).toContain(
      'Konfirmasi password tidak sama.',
    )

    expect(
      localStorage.getItem('delstudyhub_users'),
    ).toBeNull()
  })

  it('menolak username yang sudah digunakan', async () => {
    siapkanDataPengguna()
    bukaHalaman('/register')

    isiFormRegistrasi({
      username: 'MAHASISWA01',
      email: 'alamatbaru@example.com',
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Daftar' }),
    )

    const pesan = await screen.findByRole('status')

    expect(pesan.textContent).toMatch(
      /username sudah digunakan/i,
    )

    const users = JSON.parse(
      localStorage.getItem('delstudyhub_users'),
    )

    expect(users).toHaveLength(1)
  })

  it('menolak email yang sudah terdaftar', async () => {
    siapkanDataPengguna()
    bukaHalaman('/register')

    isiFormRegistrasi({
      username: 'mahasiswa02',
      email: 'MAHASISWA01@EXAMPLE.COM',
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Daftar' }),
    )

    const pesan = await screen.findByRole('status')

    expect(pesan.textContent).toMatch(
      /email sudah terdaftar/i,
    )

    const users = JSON.parse(
      localStorage.getItem('delstudyhub_users'),
    )

    expect(users).toHaveLength(1)
  })

  it('berhasil mendaftarkan akun baru dan menampilkan tautan login', async () => {
    bukaHalaman('/register')

    isiFormRegistrasi()

    fireEvent.click(
      screen.getByRole('button', { name: 'Daftar' }),
    )

    const pesan = await screen.findByRole('status')

    expect(pesan.textContent).toMatch(
      /registrasi berhasil/i,
    )

    const users = JSON.parse(
      localStorage.getItem('delstudyhub_users'),
    )

    expect(users).toHaveLength(1)

    expect(users[0]).toMatchObject({
      name: 'Mahasiswa Baru',
      username: 'mahasiswa02',
      email: 'mahasiswa02@example.com',
      password: 'Belajar123',
    })

    expect(
      screen.getByRole('link', { name: /lanjut ke login/i }),
    ).toBeTruthy()
  })
})

// ==================================================
// DASHBOARD DAN DATA AWAL
// ==================================================

describe('Dashboard dan penyimpanan data', () => {
  it('menampilkan statistik utama pada dashboard', () => {
    bukaDashboard()

    const statistik = document.querySelector('.stats-grid')

    expect(statistik).not.toBeNull()

    expect(
      within(statistik).getByText('Mata Kuliah'),
    ).toBeTruthy()

    expect(
      within(statistik).getByText('Tugas Pending'),
    ).toBeTruthy()

    expect(
      within(statistik).getByText('Tugas Selesai'),
    ).toBeTruthy()

    expect(
      within(statistik).getByText('Progres Tugas'),
    ).toBeTruthy()
  })

  it('menampilkan pesan ketika belum ada tugas', () => {
    localStorage.setItem(
      'delstudyhub_tasks',
      JSON.stringify([]),
    )

    bukaDashboard()

    expect(
      screen.getByText(
        'Belum ada tugas. Tambahkan tugas pertamamu!',
      ),
    ).toBeTruthy()
  })

  it('menggunakan data cadangan ketika data tugas di localStorage rusak', () => {
    localStorage.setItem(
      'delstudyhub_tasks',
      '{data-rusak',
    )

    bukaDashboard()

    expect(
      screen.getByText('Latihan Algoritma Pencarian'),
    ).toBeTruthy()
  })

  it('menampilkan halaman mata kuliah', () => {
    bukaDashboard()
    klikNavigasi('Mata Kuliah')

    expect(
      screen.getByRole('heading', {
        name: 'Mata Kuliah Saya',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText('Struktur Data'),
    ).toBeTruthy()
  })

  it('menampilkan halaman profil melalui navigasi profil', async () => {
    bukaDashboard()

    fireEvent.click(
      screen.getByRole('button', {
        name: /mahasiswa del/i,
      }),
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Profil',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText(
        /halaman profil dan pengaturan pengguna/i,
      ),
    ).toBeTruthy()
  })
})

// ==================================================
// MANAJEMEN TUGAS
// ==================================================

describe('Manajemen tugas', () => {
  it('menambahkan tugas baru dan menyimpannya', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah tugas/i,
      }),
    )

    isiInput('Nama tugas', 'Tugas Testing Tambahan')
    isiInput('Deadline', '2026-11-15')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Tugas',
      }),
    )

    expect(
      await screen.findByText('Tugas Testing Tambahan'),
    ).toBeTruthy()

    await waitFor(() => {
      const tasks = JSON.parse(
        localStorage.getItem('delstudyhub_tasks'),
      )

      expect(tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Tugas Testing Tambahan',
            due: '2026-11-15',
            done: false,
          }),
        ]),
      )
    })
  })

  it('menolak penyimpanan tugas tanpa judul', () => {
    bukaDashboard()
    klikNavigasi('Tugas')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah tugas/i,
      }),
    )

    isiInput('Nama tugas', '   ')
    isiInput('Deadline', '2026-11-15')

    const form = screen
      .getByRole('button', { name: 'Simpan Tugas' })
      .closest('form')

    fireEvent.submit(form)

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_tasks'),
      ),
    ).toHaveLength(3)
  })

  it('menandai tugas sebagai selesai', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Tandai selesai',
      })[0],
    )

    await waitFor(() => {
      const tasks = JSON.parse(
        localStorage.getItem('delstudyhub_tasks'),
      )

      expect(tasks[0].done).toBe(true)
    })
  })

  it('menghapus tugas dari daftar', async () => {
    bukaDashboard()
    klikNavigasi('Tugas')

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Hapus tugas',
      })[0],
    )

    await waitFor(() => {
      const tasks = JSON.parse(
        localStorage.getItem('delstudyhub_tasks'),
      )

      expect(tasks).toHaveLength(2)
    })

    expect(
      screen.queryByText('Latihan Algoritma Pencarian'),
    ).toBeNull()
  })
})

// ==================================================
// MANAJEMEN MATERI
// ==================================================

describe('Manajemen materi', () => {
  it('menampilkan peringatan ketika URL materi tidak valid', () => {
    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah materi/i,
      }),
    )

    isiInput('Judul materi', 'Materi URL Rusak')
    isiInput('Tautan materi', 'https://')

    const form = screen
      .getByRole('button', { name: 'Simpan Materi' })
      .closest('form')

    fireEvent.submit(form)

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/tautan yang valid/i),
    )

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_materials') || '[]',
      ),
    ).toHaveLength(0)
  })

  it('menolak tautan materi yang tidak menggunakan HTTP atau HTTPS', () => {
    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah materi/i,
      }),
    )

    isiInput('Judul materi', 'Materi Protokol')
    isiInput(
      'Tautan materi',
      'ftp://example.com/materi',
    )

    const form = screen
      .getByRole('button', { name: 'Simpan Materi' })
      .closest('form')

    fireEvent.submit(form)

    expect(window.alert).toHaveBeenCalledWith(
      'Tautan materi harus menggunakan HTTP atau HTTPS.',
    )

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_materials') || '[]',
      ),
    ).toHaveLength(0)
  })

  it('menambahkan, mengedit, dan menghapus materi', async () => {
    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah materi/i,
      }),
    )

    isiInput('Judul materi', 'Materi Awal')
    isiInput(
      'Tautan materi',
      'https://example.com/materi-awal',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Materi',
      }),
    )

    expect(
      await screen.findByText('Materi Awal'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit materi Materi Awal',
      }),
    )

    isiInput('Judul materi', 'Materi Diperbarui')
    isiInput(
      'Tautan materi',
      'https://example.com/materi-baru',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      }),
    )

    expect(
      await screen.findByText('Materi Diperbarui'),
    ).toBeTruthy()

    expect(
      screen.queryByText('Materi Awal'),
    ).toBeNull()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus materi Materi Diperbarui',
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Materi Diperbarui'),
      ).toBeNull()
    })

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_materials'),
      ),
    ).toHaveLength(0)
  })

  it('menampilkan pesan ketika pencarian materi tidak menemukan hasil', () => {
    localStorage.setItem(
      'delstudyhub_materials',
      JSON.stringify([
        {
          id: 1,
          title: 'Materi Algoritma',
          course: 'Algoritma dan Pemrograman',
          url: 'https://example.com/algoritma',
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Materi')

    isiInput('Cari materi', 'materi yang tidak tersedia')

    expect(
      screen.getByText(/materi tidak ditemukan/i),
    ).toBeTruthy()
  })

  it('memfilter materi berdasarkan mata kuliah', () => {
    localStorage.setItem(
      'delstudyhub_materials',
      JSON.stringify([
        {
          id: 1,
          title: 'Materi Algoritma',
          course: 'Algoritma dan Pemrograman',
          url: 'https://example.com/algoritma',
        },
        {
          id: 2,
          title: 'Materi Basis Data',
          course: 'Basis Data',
          url: 'https://example.com/database',
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.change(
      screen.getByLabelText('Filter mata kuliah'),
      {
        target: { value: 'Basis Data' },
      },
    )

    expect(
      screen.getByText('Materi Basis Data'),
    ).toBeTruthy()

    expect(
      screen.queryByText('Materi Algoritma'),
    ).toBeNull()
  })
})

// ==================================================
// MANAJEMEN JADWAL KULIAH
// ==================================================

describe('Manajemen jadwal kuliah', () => {
  it('menolak jadwal ketika jam mulai sama dengan jam selesai', () => {
    bukaDashboard()
    klikNavigasi('Jadwal')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah jadwal/i,
      }),
    )

    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '08:00')
    isiInput('Ruangan', 'IF-01')

    const form = screen
      .getByRole('button', { name: 'Simpan Jadwal' })
      .closest('form')

    fireEvent.submit(form)

    expect(window.alert).toHaveBeenCalledWith(
      'Jam selesai harus setelah jam mulai.',
    )

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_schedules') || '[]',
      ),
    ).toHaveLength(0)
  })

  it('menambahkan, mengedit, dan menghapus jadwal', async () => {
    bukaDashboard()
    klikNavigasi('Jadwal')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah jadwal/i,
      }),
    )

    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'IF-01')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Jadwal',
      }),
    )

    expect(
      await screen.findByText('Ruangan: IF-01'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit jadwal Algoritma dan Pemrograman',
      }),
    )

    isiInput('Ruangan', 'IF-02')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      }),
    )

    expect(
      await screen.findByText('Ruangan: IF-02'),
    ).toBeTruthy()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus jadwal Algoritma dan Pemrograman',
      }),
    )

    await waitFor(() => {
      expect(
        JSON.parse(
          localStorage.getItem('delstudyhub_schedules'),
        ),
      ).toHaveLength(0)
    })
  })
})

// ==================================================
// MANAJEMEN KELOMPOK BELAJAR
// ==================================================

describe('Manajemen kelompok belajar', () => {
  it('mengedit data anggota kelompok belajar', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Anggota')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Kelompok',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Kelompok Anggota',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah anggota/i,
      }),
    )

    isiInput('Nama anggota', 'Budi Lama')
    isiInput('NIM', '11S24002')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Anggota',
      }),
    )

    expect(
      await screen.findByText('Budi Lama'),
    ).toBeTruthy()

    const barisAnggota = screen
      .getByText('Budi Lama')
      .closest('.task-row')

    fireEvent.click(
      within(barisAnggota).getByRole('button', {
        name: 'Edit',
      }),
    )

    isiInput('Nama anggota', 'Budi Baru')
    isiInput('NIM', '11S24003')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      }),
    )

    expect(
      await screen.findByText('Budi Baru'),
    ).toBeTruthy()

    expect(
      screen.queryByText('Budi Lama'),
    ).toBeNull()

    await waitFor(() => {
      const groups = JSON.parse(
        localStorage.getItem('delstudyhub_groups'),
      )

      expect(groups[0].members).toEqual([
        expect.objectContaining({
          name: 'Budi Baru',
          nim: '11S24003',
        }),
      ])
    })
  })

  it('menghapus anggota kelompok ketika penghapusan dikonfirmasi', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Hapus Anggota')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Kelompok',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Kelompok Hapus Anggota',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah anggota/i,
      }),
    )

    isiInput('Nama anggota', 'Anggota Hapus')
    isiInput('NIM', '11S24004')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Anggota',
      }),
    )

    expect(
      await screen.findByText('Anggota Hapus'),
    ).toBeTruthy()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus anggota Anggota Hapus',
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Anggota Hapus'),
      ).toBeNull()
    })

    const groups = JSON.parse(
      localStorage.getItem('delstudyhub_groups'),
    )

    expect(groups[0].members).toHaveLength(0)
  })

  it('mengedit agenda diskusi kelompok belajar', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Agenda Edit')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Kelompok',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Kelompok Agenda Edit',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah agenda/i,
      }),
    )

    isiInput('Topik diskusi', 'Agenda Lama')
    isiInput('Tanggal', '2026-11-10')
    isiInput('Jam', '15:00')
    isiInput(
      'Tempat atau tautan pertemuan',
      'Perpustakaan',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Agenda',
      }),
    )

    expect(
      await screen.findByText('Agenda Lama'),
    ).toBeTruthy()

    const barisAgenda = screen
      .getByText('Agenda Lama')
      .closest('.task-row')

    fireEvent.click(
      within(barisAgenda).getByRole('button', {
        name: 'Edit',
      }),
    )

    isiInput('Topik diskusi', 'Agenda Baru')
    isiInput(
      'Tempat atau tautan pertemuan',
      'Ruang Diskusi',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      }),
    )

    expect(
      await screen.findByText('Agenda Baru'),
    ).toBeTruthy()

    expect(
      screen.queryByText('Agenda Lama'),
    ).toBeNull()

    const groups = JSON.parse(
      localStorage.getItem('delstudyhub_groups'),
    )

    expect(groups[0].agendas).toEqual([
      expect.objectContaining({
        title: 'Agenda Baru',
        location: 'Ruang Diskusi',
      }),
    ])
  })

  it('menghapus agenda diskusi ketika penghapusan dikonfirmasi', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Hapus Agenda')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Kelompok',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Kelompok Hapus Agenda',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah agenda/i,
      }),
    )

    isiInput('Topik diskusi', 'Agenda Dihapus')
    isiInput('Tanggal', '2026-11-10')
    isiInput('Jam', '15:00')
    isiInput(
      'Tempat atau tautan pertemuan',
      'Perpustakaan',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Agenda',
      }),
    )

    expect(
      await screen.findByText('Agenda Dihapus'),
    ).toBeTruthy()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus agenda Agenda Dihapus',
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Agenda Dihapus'),
      ).toBeNull()
    })

    const groups = JSON.parse(
      localStorage.getItem('delstudyhub_groups'),
    )

    expect(groups[0].agendas).toHaveLength(0)
  })

  it('menghapus kelompok belajar ketika penghapusan dikonfirmasi', async () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Akan Dihapus')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Kelompok',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Kelompok Akan Dihapus',
      }),
    ).toBeTruthy()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus kelompok Kelompok Akan Dihapus',
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: 'Kelompok Akan Dihapus',
        }),
      ).toBeNull()
    })

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_groups'),
      ),
    ).toHaveLength(0)
  })
})

// ==================================================
// PENGUJIAN CABANG TAMBAHAN
// ==================================================

describe('Pengujian cabang tambahan', () => {
  it('membatalkan penghapusan materi ketika konfirmasi ditolak', () => {
    localStorage.setItem(
      'delstudyhub_materials',
      JSON.stringify([
        {
          id: 101,
          title: 'Materi Tetap Ada',
          course: 'Basis Data',
          url: 'https://example.com/materi',
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus materi Materi Tetap Ada',
      }),
    )

    expect(window.confirm).toHaveBeenCalledWith(
      'Yakin ingin menghapus materi ini?',
    )

    const materials = JSON.parse(
      localStorage.getItem('delstudyhub_materials'),
    )

    expect(materials).toHaveLength(1)
    expect(materials[0].title).toBe('Materi Tetap Ada')
    expect(screen.getByText('Materi Tetap Ada')).toBeTruthy()
  })

  it('membatalkan penghapusan jadwal ketika konfirmasi ditolak', () => {
    localStorage.setItem(
      'delstudyhub_schedules',
      JSON.stringify([
        {
          id: 102,
          course: 'Basis Data',
          day: 'Senin',
          startTime: '08:00',
          endTime: '10:00',
          room: 'IF-01',
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Jadwal')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus jadwal Basis Data',
      }),
    )

    expect(window.confirm).toHaveBeenCalledWith(
      'Yakin ingin menghapus jadwal ini?',
    )

    const schedules = JSON.parse(
      localStorage.getItem('delstudyhub_schedules'),
    )

    expect(schedules).toHaveLength(1)
    expect(schedules[0].room).toBe('IF-01')
  })

  it('membatalkan penghapusan kelompok belajar ketika konfirmasi ditolak', () => {
    localStorage.setItem(
      'delstudyhub_groups',
      JSON.stringify([
        {
          id: 103,
          name: 'Kelompok Dipertahankan',
          course: 'Basis Data',
          description: 'Kelompok pengujian',
          members: [],
          agendas: [],
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus kelompok Kelompok Dipertahankan',
      }),
    )

    expect(window.confirm).toHaveBeenCalledWith(
      'Hapus kelompok ini beserta anggota dan agendanya?',
    )

    const groups = JSON.parse(
      localStorage.getItem('delstudyhub_groups'),
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Kelompok Dipertahankan')
  })

  it('menolak penyimpanan tugas tanpa deadline', () => {
    bukaDashboard()
    klikNavigasi('Tugas')

    fireEvent.click(
      screen.getByRole('button', {
        name: /tambah tugas/i,
      }),
    )

    isiInput('Nama tugas', 'Tugas Tanpa Deadline')
    isiInput('Deadline', '')

    const form = screen
      .getByRole('button', {
        name: 'Simpan Tugas',
      })
      .closest('form')

    expect(form).not.toBeNull()

    fireEvent.submit(form)

    const tasks = JSON.parse(
      localStorage.getItem('delstudyhub_tasks'),
    )

    expect(tasks).toHaveLength(3)

    expect(
      tasks.some(
        (task) => task.title === 'Tugas Tanpa Deadline',
      ),
    ).toBe(false)
  })
})

// ==================================================
// COVERAGE TAMBAHAN DASHBOARD
// ==================================================

describe('Coverage tambahan Dashboard', () => {
  it('membuka halaman Tugas melalui tombol Lihat tugas', () => {
    bukaDashboard()

    fireEvent.click(
      screen.getByRole('button', { name: /Lihat tugas/i }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Tugas',
      }),
    ).toBeTruthy()
  })

  it('membuka halaman Tugas melalui tombol Lihat semua pada Tugas Terbaru', () => {
    bukaDashboard()

    const panel = screen
      .getByRole('heading', { name: /Tugas Terbaru/i })
      .closest('.panel')

    expect(panel).not.toBeNull()

    fireEvent.click(
      within(panel).getByRole('button', {
        name: /Lihat semua/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Tugas',
      }),
    ).toBeTruthy()
  })

  it('membuka halaman Mata Kuliah melalui tombol Lihat semua', () => {
    bukaDashboard()

    const panel = screen
      .getByRole('heading', {
        level: 3,
        name: 'Mata Kuliah',
      })
      .closest('.panel')

    expect(panel).not.toBeNull()

    fireEvent.click(
      within(panel).getByRole('button', {
        name: /Lihat semua/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Mata Kuliah',
      }),
    ).toBeTruthy()
  })
})

// ==================================================
// COVERAGE TAMBAHAN APP.JSX
// ==================================================

describe('Coverage tambahan App.jsx', () => {
  it('membuka halaman Pengaturan melalui URL langsung', () => {
    siapkanPenggunaLogin()

    window.history.replaceState({}, '', '/settings')

    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Pengaturan',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText('Halaman profil dan pengaturan pengguna.'),
    ).toBeTruthy()
  })

  it('membuka halaman Profil dan kembali ke Dashboard melalui logo', () => {
    bukaDashboard()

    fireEvent.click(
      screen.getByRole('button', {
        name: /mahasiswa del/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Profil',
      }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('link', {
        name: /DelStudyHub/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Dashboard',
      }),
    ).toBeTruthy()

    expect(window.location.pathname).toBe('/dashboard')
  })

  it('menghapus kelompok yang sedang dipilih dan diedit', async () => {
    localStorage.setItem(
      'delstudyhub_groups',
      JSON.stringify([
        {
          id: 103,
          name: 'Kelompok Target',
          course: 'Basis Data',
          description: '',
          members: [],
          agendas: [],
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    const tombolKelompok = screen
      .getAllByRole('button')
      .find(
        (tombol) =>
          tombol.querySelector('strong')?.textContent.trim() ===
          'Kelompok Target',
      )

    expect(tombolKelompok).toBeTruthy()
    fireEvent.click(tombolKelompok)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit',
      }),
    )

    expect(
      screen.getByLabelText('Nama kelompok'),
    ).toBeTruthy()

    vi.mocked(window.confirm).mockReturnValue(true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hapus kelompok Kelompok Target',
      }),
    )

    await waitFor(() => {
      expect(
        JSON.parse(
          localStorage.getItem('delstudyhub_groups'),
        ),
      ).toHaveLength(0)
    })

    expect(
      screen.queryByLabelText('Nama kelompok'),
    ).toBeNull()
  })

  it('menangani kelompok lama yang belum memiliki daftar anggota dan agenda', async () => {
    localStorage.setItem(
      'delstudyhub_groups',
      JSON.stringify([
        {
          id: 201,
          name: 'Kelompok Data Lama',
          course: 'Basis Data',
          description: '',
        },
      ]),
    )

    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    const tombolKelompok = screen
      .getAllByRole('button')
      .find(
        (tombol) =>
          tombol.querySelector('strong')?.textContent.trim() ===
          'Kelompok Data Lama',
      )

    expect(tombolKelompok).toBeTruthy()
    fireEvent.click(tombolKelompok)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit',
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Data Baru')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simpan Perubahan',
      }),
    )

    await waitFor(() => {
      const groups = JSON.parse(
        localStorage.getItem('delstudyhub_groups'),
      )

      expect(groups[0]).toMatchObject({
        name: 'Kelompok Data Baru',
        members: [],
        agendas: [],
      })
    })
  })

  it('membatalkan formulir jadwal dan mereset nilai formulir', () => {
    bukaDashboard()
    klikNavigasi('Jadwal')

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Jadwal/i,
      }),
    )

    isiInput('Jam mulai', '08:00')
    isiInput('Jam selesai', '10:00')
    isiInput('Ruangan', 'IF-99')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Batal',
      }),
    )

    expect(
      screen.queryByLabelText('Jam mulai'),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Jadwal/i,
      }),
    )

    expect(
      screen.getByLabelText('Jam mulai').value,
    ).toBe('')

    expect(
      screen.getByLabelText('Jam selesai').value,
    ).toBe('')

    expect(
      screen.getByLabelText('Ruangan').value,
    ).toBe('')
  })

  it('membatalkan formulir materi dan mereset nilai formulir', () => {
    bukaDashboard()
    klikNavigasi('Materi')

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Materi/i,
      }),
    )

    isiInput('Judul materi', 'Materi Sementara')
    isiInput('Tautan materi', 'https://example.com')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Batal',
      }),
    )

    expect(
      screen.queryByLabelText('Judul materi'),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Materi/i,
      }),
    )

    expect(
      screen.getByLabelText('Judul materi').value,
    ).toBe('')

    expect(
      screen.getByLabelText('Tautan materi').value,
    ).toBe('')
  })

  it('membatalkan formulir kelompok belajar dan mereset nilainya', () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Kelompok/i,
      }),
    )

    isiInput('Nama kelompok', 'Kelompok Sementara')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Batal',
      }),
    )

    expect(
      screen.queryByLabelText('Nama kelompok'),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tambah Kelompok/i,
      }),
    )

    expect(
      screen.getByLabelText('Nama kelompok').value,
    ).toBe('')
  })

  it('menampilkan kondisi materi kosong dan kondisi pencarian kosong', () => {
    localStorage.setItem(
      'delstudyhub_materials',
      JSON.stringify([]),
    )

    bukaDashboard()
    klikNavigasi('Materi')

    expect(
      screen.getByText(/belum ada materi/i),
    ).toBeTruthy()

    isiInput('Cari materi', 'tidak ada hasil')

    expect(
      screen.getByText(/belum ada materi/i),
    ).toBeTruthy()
  })

  it('menampilkan kondisi jadwal dan kelompok belajar kosong', () => {
    localStorage.setItem(
      'delstudyhub_schedules',
      JSON.stringify([]),
    )

    localStorage.setItem(
      'delstudyhub_groups',
      JSON.stringify([]),
    )

    bukaDashboard()
    klikNavigasi('Jadwal')

    expect(
      screen.getByText(/belum ada jadwal/i),
    ).toBeTruthy()

    klikNavigasi('Kelompok Belajar')

    expect(
      screen.getByText(/belum ada kelompok belajar/i),
    ).toBeTruthy()
  })

  // ==================================================
  // COVERAGE TAMBAHAN FORMULIR DAN NAVIGASI
  // ==================================================

  describe('Coverage tambahan formulir dan navigasi', () => {
    it('mengubah mata kuliah pada formulir tugas', () => {
      bukaDashboard()
      klikNavigasi('Tugas')

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Tugas/i }),
      )

      const pilihan = screen.getByLabelText('Mata kuliah')

      fireEvent.change(pilihan, {
        target: { value: 'Basis Data' },
      })

      expect(pilihan.value).toBe('Basis Data')
    })

    it('menolak penyimpanan jadwal yang belum lengkap', () => {
      localStorage.setItem(
        'delstudyhub_schedules',
        JSON.stringify([]),
      )

      bukaDashboard()
      klikNavigasi('Jadwal')

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Jadwal/i }),
      )

      fireEvent.change(screen.getByLabelText('Mata kuliah'), {
        target: { value: 'Algoritma dan Pemrograman' },
      })

      fireEvent.change(screen.getByLabelText('Hari'), {
        target: { value: 'Senin' },
      })

      fireEvent.change(screen.getByLabelText('Jam mulai'), {
        target: { value: '08:00' },
      })

      fireEvent.change(screen.getByLabelText('Jam selesai'), {
        target: { value: '10:00' },
      })

      // Ruangan sengaja dibiarkan kosong.
      const form = screen
        .getByRole('button', { name: 'Simpan Jadwal' })
        .closest('form')

      fireEvent.submit(form)

      expect(
        screen.getByRole('button', { name: 'Simpan Jadwal' }),
      ).toBeTruthy()

      expect(
        JSON.parse(localStorage.getItem('delstudyhub_schedules')),
      ).toHaveLength(0)
    })

    it('membatalkan formulir jadwal yang sedang terbuka', () => {
      bukaDashboard()
      klikNavigasi('Jadwal')

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Jadwal/i }),
      )

      fireEvent.change(screen.getByLabelText('Ruangan'), {
        target: { value: 'IF-02' },
      })

      fireEvent.click(
        screen.getByRole('button', { name: 'Batal' }),
      )

      expect(
        screen.queryByRole('button', { name: 'Simpan Jadwal' }),
      ).toBeNull()

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Jadwal/i }),
      )

      expect(screen.getByLabelText('Ruangan').value).toBe('')
    })

    it('membuka halaman login dari halaman publik', () => {
      bukaHalaman('/')

      fireEvent.click(
        screen.getByRole('button', {
          name: /sudah punya akun\? login/i,
        }),
      )

      expect(window.location.pathname).toBe('/auth/login')

      expect(
        screen.getByRole('button', { name: 'Login' }),
      ).toBeTruthy()
    })

    it('membuka halaman registrasi dari halaman publik', () => {
      bukaHalaman('/')

      fireEvent.click(
        screen.getByRole('button', { name: /buat akun/i }),
      )

      expect(window.location.pathname).toBe('/register')
    })

    it('membuka halaman registrasi melalui fallback path tidak dikenal', () => {
      bukaHalaman('/halaman-tidak-dikenal')

      fireEvent.click(
        screen.getByRole('button', { name: /buat akun/i }),
      )

      expect(window.location.pathname).toBe('/register')
    })

    it('menjalankan pengurutan jadwal berdasarkan jam pada hari yang sama', () => {
      localStorage.setItem(
        'delstudyhub_schedules',
        JSON.stringify([
          {
            id: 301,
            course: 'Basis Data',
            day: 'Senin',
            startTime: '13:00',
            endTime: '15:00',
            room: 'IF-03',
          },
          {
            id: 302,
            course: 'Algoritma dan Pemrograman',
            day: 'Senin',
            startTime: '08:00',
            endTime: '10:00',
            room: 'IF-01',
          },
        ]),
      )

      bukaDashboard()
      klikNavigasi('Jadwal')

      expect(
        screen.getByText('Ruangan: IF-01'),
      ).toBeTruthy()

      expect(
        screen.getByText('Ruangan: IF-03'),
      ).toBeTruthy()
    })

    it('menjalankan pengurutan agenda diskusi berdasarkan tanggal dan jam', () => {
      localStorage.setItem(
        'delstudyhub_groups',
        JSON.stringify([
          {
            id: 401,
            name: 'Kelompok Agenda Terurut',
            course: 'Basis Data',
            description: 'Pengujian urutan agenda',
            members: [],
            agendas: [
              {
                id: 403,
                title: 'Agenda Kedua',
                date: '2026-11-12',
                time: '15:00',
                location: 'Ruang IF-02',
              },
              {
                id: 402,
                title: 'Agenda Pertama',
                date: '2026-11-10',
                time: '09:00',
                location: 'Ruang IF-01',
              },
            ],
          },
        ]),
      )

      bukaDashboard()
      klikNavigasi('Kelompok Belajar')

      const tombolKelompok = screen
        .getAllByRole('button')
        .find(
          (tombol) =>
            tombol.querySelector('strong')?.textContent.trim() ===
            'Kelompok Agenda Terurut',
        )

      expect(tombolKelompok).toBeTruthy()

      fireEvent.click(tombolKelompok)

      expect(
        screen.getByText('Agenda Pertama'),
      ).toBeTruthy()

      expect(
        screen.getByText('Agenda Kedua'),
      ).toBeTruthy()
    })

    it('membuka login dari halaman publik setelah path tidak dikenal dikoreksi', () => {
      bukaHalaman('/path-tidak-dikenal')

      expect(window.location.pathname).toBe('/')

      fireEvent.click(
        screen.getByRole('button', {
          name: /sudah punya akun\? login/i,
        }),
      )

      expect(window.location.pathname).toBe('/auth/login')

      expect(
        screen.getByRole('button', { name: 'Login' }),
      ).toBeTruthy()
    })

    it('membuka registrasi dari halaman publik setelah path tidak dikenal dikoreksi', () => {
      bukaHalaman('/path-tidak-dikenal')

      expect(window.location.pathname).toBe('/')

      fireEvent.click(
        screen.getByRole('button', { name: /buat akun/i }),
      )

      expect(window.location.pathname).toBe('/register')
    })
  })

  // ==================================================
  // COVERAGE TAMBAHAN CRUD KELOMPOK, ANGGOTA, DAN AGENDA
  // ==================================================

  describe('Coverage tambahan CRUD kelompok, anggota, dan agenda', () => {
    const dataKelompok = () => [
      {
        id: 701,
        name: 'Kelompok Coverage',
        course: 'Basis Data',
        description: 'Deskripsi awal',
        members: [
          { id: 702, name: 'Budi Coverage', nim: '11S24002' },
        ],
        agendas: [
          {
            id: 703,
            title: 'Agenda Coverage',
            date: '2026-11-10',
            time: '09:00',
            location: 'Ruang IF-01',
          },
        ],
      },
    ]

    function bukaKelompokCoverage() {
      localStorage.setItem(
        'delstudyhub_groups',
        JSON.stringify(dataKelompok()),
      )

      bukaDashboard()
      klikNavigasi('Kelompok Belajar')
    }

    function pilihKelompokCoverage() {
      const tombolKelompok = screen
        .getAllByRole('button')
        .find(
          (tombol) =>
            tombol.querySelector('strong')?.textContent.trim() ===
            'Kelompok Coverage',
        )

      expect(tombolKelompok).toBeTruthy()

      fireEvent.click(tombolKelompok)
    }

    function barisItem(teks) {
      const elemen = screen.getByText(teks)
      const baris = elemen.closest('.task-row')

      if (!baris) {
        throw new Error(`Baris "${teks}" tidak ditemukan`)
      }

      return baris
    }

    // PERBAIKAN:
    // Jangan mencari teks anggota dan agenda di layar setelah edit
    // kelompok, karena detailnya mungkin tidak sedang ditampilkan.
    // Periksa data yang benar-benar tersimpan di localStorage.
    it('mengedit kelompok dan mempertahankan anggota serta agenda', () => {
      bukaKelompokCoverage()

      const baris = barisItem('Kelompok Coverage')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      fireEvent.change(screen.getByLabelText('Nama kelompok'), {
        target: { value: 'Kelompok Coverage Diperbarui' },
      })

      fireEvent.change(screen.getByLabelText('Deskripsi'), {
        target: { value: 'Deskripsi baru' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Simpan Perubahan',
        }),
      )

      expect(
        screen.getByText('Kelompok Coverage Diperbarui'),
      ).toBeTruthy()

      const groups = JSON.parse(
        localStorage.getItem('delstudyhub_groups'),
      )

      expect(groups).toHaveLength(1)

      expect(groups[0]).toMatchObject({
        id: 701,
        name: 'Kelompok Coverage Diperbarui',
        course: 'Basis Data',
        description: 'Deskripsi baru',
      })

      expect(groups[0].members).toHaveLength(1)

      expect(groups[0].members[0]).toMatchObject({
        id: 702,
        name: 'Budi Coverage',
        nim: '11S24002',
      })

      expect(groups[0].agendas).toHaveLength(1)

      expect(groups[0].agendas[0]).toMatchObject({
        id: 703,
        title: 'Agenda Coverage',
        date: '2026-11-10',
        time: '09:00',
        location: 'Ruang IF-01',
      })
    })

    it('menambahkan dan mengedit anggota kelompok', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Anggota/i }),
      )

      fireEvent.change(screen.getByLabelText('Nama anggota'), {
        target: { value: 'Siti Coverage' },
      })

      fireEvent.change(screen.getByLabelText('NIM'), {
        target: { value: '11S24003' },
      })

      fireEvent.click(
        screen.getByRole('button', { name: 'Simpan Anggota' }),
      )

      expect(screen.getByText('Siti Coverage')).toBeTruthy()

      const baris = barisItem('Siti Coverage')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      fireEvent.change(screen.getByLabelText('Nama anggota'), {
        target: { value: 'Siti Diperbarui' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Simpan Perubahan',
        }),
      )

      expect(screen.getByText('Siti Diperbarui')).toBeTruthy()
      expect(screen.queryByText('Siti Coverage')).toBeNull()
    })

    it('membatalkan penghapusan anggota ketika konfirmasi ditolak', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      window.confirm.mockReturnValue(false)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus anggota Budi Coverage/i,
        }),
      )

      expect(screen.getByText('Budi Coverage')).toBeTruthy()
    })

    it('menghapus anggota dan mereset formulir anggota yang sedang diedit', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      const baris = barisItem('Budi Coverage')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      window.confirm.mockReturnValue(true)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus anggota Budi Coverage/i,
        }),
      )

      expect(screen.queryByText('Budi Coverage')).toBeNull()

      expect(
        JSON.parse(
          localStorage.getItem('delstudyhub_groups'),
        )[0].members,
      ).toHaveLength(0)
    })

    it('menambahkan dan mengedit agenda kelompok', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      fireEvent.click(
        screen.getByRole('button', { name: /Tambah Agenda/i }),
      )

      fireEvent.change(screen.getByLabelText('Topik diskusi'), {
        target: { value: 'Agenda Baru' },
      })

      fireEvent.change(screen.getByLabelText('Tanggal'), {
        target: { value: '2026-11-15' },
      })

      fireEvent.change(screen.getByLabelText('Jam'), {
        target: { value: '13:00' },
      })

      fireEvent.change(
        screen.getByLabelText('Tempat atau tautan pertemuan'),
        { target: { value: 'Ruang IF-02' } },
      )

      fireEvent.click(
        screen.getByRole('button', { name: 'Simpan Agenda' }),
      )

      expect(screen.getByText('Agenda Baru')).toBeTruthy()

      const baris = barisItem('Agenda Baru')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      fireEvent.change(screen.getByLabelText('Topik diskusi'), {
        target: { value: 'Agenda Diperbarui' },
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Simpan Perubahan',
        }),
      )

      expect(screen.getByText('Agenda Diperbarui')).toBeTruthy()
      expect(screen.queryByText('Agenda Baru')).toBeNull()
    })

    it('membatalkan penghapusan agenda ketika konfirmasi ditolak', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      window.confirm.mockReturnValue(false)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus agenda Agenda Coverage/i,
        }),
      )

      expect(screen.getByText('Agenda Coverage')).toBeTruthy()
    })

    it('menghapus agenda dan mereset formulir agenda yang sedang diedit', () => {
      bukaKelompokCoverage()
      pilihKelompokCoverage()

      const baris = barisItem('Agenda Coverage')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      window.confirm.mockReturnValue(true)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus agenda Agenda Coverage/i,
        }),
      )

      expect(screen.queryByText('Agenda Coverage')).toBeNull()

      expect(
        JSON.parse(
          localStorage.getItem('delstudyhub_groups'),
        )[0].agendas,
      ).toHaveLength(0)
    })

    it('membatalkan penghapusan kelompok jika pengguna memilih Tidak', () => {
      bukaKelompokCoverage()

      window.confirm.mockReturnValue(false)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus kelompok Kelompok Coverage/i,
        }),
      )

      expect(screen.getByText('Kelompok Coverage')).toBeTruthy()
    })

    it('menghapus kelompok yang dipilih dan sedang diedit', () => {
      bukaKelompokCoverage()

      const baris = barisItem('Kelompok Coverage')

      fireEvent.click(
        within(baris).getByRole('button', { name: 'Edit' }),
      )

      window.confirm.mockReturnValue(true)

      fireEvent.click(
        screen.getByRole('button', {
          name: /Hapus kelompok Kelompok Coverage/i,
        }),
      )

      expect(screen.queryByText('Kelompok Coverage')).toBeNull()

      expect(
        JSON.parse(
          localStorage.getItem('delstudyhub_groups'),
        ),
      ).toHaveLength(0)
    })
  })

    

  it('tidak menyimpan kelompok jika nama kelompok kosong', () => {
    bukaDashboard()
    klikNavigasi('Kelompok Belajar')

    const tombolTambah = screen.getByRole('button', {
      name: /Tambah Kelompok/i,
    })

    fireEvent.click(tombolTambah)

    fireEvent.change(screen.getByLabelText('Nama kelompok'), {
      target: { value: '   ' },
    })

    const jumlahAwal = JSON.parse(
      localStorage.getItem('delstudyhub_groups') || '[]',
    ).length

    fireEvent.click(
      screen.getByRole('button', { name: /Simpan/i }),
    )

    expect(
      JSON.parse(
        localStorage.getItem('delstudyhub_groups') || '[]',
      ),
    ).toHaveLength(jumlahAwal)
  })



})
