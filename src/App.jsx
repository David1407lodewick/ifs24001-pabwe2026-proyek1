import { useEffect, useState } from "react";
import "./App.css";

const initialCourses = [
  { id: 1, code: "IF101", name: "Algoritma dan Pemrograman", color: "blue", progress: 75 },
  { id: 2, code: "IF102", name: "Struktur Data", color: "purple", progress: 60 },
  { id: 3, code: "IF103", name: "Basis Data", color: "orange", progress: 45 },
];

const initialTasks = [
  { id: 1, title: "Latihan Algoritma Pencarian", course: "Algoritma dan Pemrograman", due: "2026-10-25", done: false },
  { id: 2, title: "Implementasi Linked List", course: "Struktur Data", due: "2026-10-26", done: false },
  { id: 3, title: "Rancangan ERD", course: "Basis Data", due: "2026-10-28", done: true },
];

const navigation = [
  { label: "Dashboard", icon: "▦", section: "BELAJAR" },
  { label: "Mata Kuliah", icon: "▤" },
  { label: "Tugas", icon: "☑" },
  { label: "Jadwal", icon: "▦" },
  { label: "Materi", icon: "▧", section: "KOLABORASI" },
  { label: "Kelompok Belajar", icon: "♧" },
];

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

const PAGE_PATHS = {
  Dashboard: "/dashboard",
  "Mata Kuliah": "/mata-kuliah",
  Tugas: "/tugas",
  Jadwal: "/jadwal",
  Materi: "/materi",
  "Kelompok Belajar": "/kelompok",
  Profil: "/profile",
  Pengaturan: "/settings",
};

const PATH_PAGES = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])
);

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("delstudyhub_authenticated") === "true"
  );

  useEffect(() => {
    function syncPath() {
      setCurrentPath(window.location.pathname);
    }
    window.addEventListener("popstate", syncPath);
    window.addEventListener("delstudyhub:navigate", syncPath);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener("delstudyhub:navigate", syncPath);
    };
  }, []);

  useEffect(() => {
    const protectedPaths = Object.values(PAGE_PATHS);
    if (protectedPaths.includes(currentPath) && !isAuthenticated) {
      window.history.replaceState({}, "", "/auth/login");
      setCurrentPath("/auth/login");
    }
    if (["/login", "/auth/login"].includes(currentPath) && isAuthenticated) {
      window.history.replaceState({}, "", "/dashboard");
      setCurrentPath("/dashboard");
    }
  }, [currentPath, isAuthenticated]);

  function handleRegister({ name, username, email, password }) {
    const users = readStorage("delstudyhub_users", []);
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some(user => user.username.toLowerCase() === normalizedUsername)) {
      return { ok: false, message: "Username sudah digunakan. Silakan pilih username lain." };
    }
    if (users.some(user => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, message: "Email sudah terdaftar. Silakan login." };
    }
    users.push({ name: name.trim(), username: normalizedUsername, email: normalizedEmail, password });
    localStorage.setItem("delstudyhub_users", JSON.stringify(users));
    return { ok: true, message: "Registrasi berhasil. Silakan login dengan akun yang baru dibuat." };
  }

  function handleLogin(username, password) {
    const users = readStorage("delstudyhub_users", []);
    const user = users.find(item => item.username.toLowerCase() === username.trim().toLowerCase() && item.password === password);
    if (!user) return false;
    localStorage.setItem("delstudyhub_authenticated", "true");
    localStorage.setItem("delstudyhub_user", user.username);
    localStorage.setItem("delstudyhub_user_name", user.name);
    setIsAuthenticated(true);
    window.history.pushState({}, "", "/dashboard");
    setCurrentPath("/dashboard");
    return true;
  }

  function handleLogout() {
    localStorage.removeItem("delstudyhub_authenticated");
    localStorage.removeItem("delstudyhub_user");
    localStorage.removeItem("delstudyhub_user_name");
    setIsAuthenticated(false);
    window.history.pushState({}, "", "/auth/login");
    setCurrentPath("/auth/login");
  }

  function navigateToPath(path) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  }

  // Rute publik autentikasi mendukung path standar dan alias lama.
  if (["/login", "/auth/login"].includes(currentPath)) {
    return <LoginPage onLogin={handleLogin} onNavigate={navigateToPath} />;
  }
  if (["/register", "/auth/register"].includes(currentPath)) {
    return <RegisterPage onRegister={handleRegister} onNavigate={navigateToPath} />;
  }
  if (currentPath === "/") return <PublicHome onLoginClick={() => {
    window.history.pushState({}, "", "/auth/login");
    setCurrentPath("/auth/login");
  }} onRegisterClick={() => {
    window.history.pushState({}, "", "/register");
    setCurrentPath("/register");
  }} />;
  if (Object.values(PAGE_PATHS).includes(currentPath)) {
    if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;
    return <Workspace initialPage={PATH_PAGES[currentPath] || "Dashboard"} onLogout={handleLogout} />;
  }
  // Path yang tidak dikenal diarahkan ke halaman publik agar tidak dianggap sebagai route aplikasi.
  if (currentPath !== "/") {
    window.history.replaceState({}, "", "/");
  }
  return <PublicHome onLoginClick={() => {
    window.history.pushState({}, "", "/auth/login");
    setCurrentPath("/auth/login");
  }} onRegisterClick={() => {
    window.history.pushState({}, "", "/register");
    setCurrentPath("/register");
  }} />;
}

function Workspace({ initialPage = "Dashboard", onLogout }) {
  const [activePage, setActivePage] = useState(initialPage);

  // Sinkronkan halaman aktif ketika URL dibuka langsung atau tombol Back/Forward digunakan.
  useEffect(() => {
    setActivePage(initialPage);
  }, [initialPage]);

  function navigateToPage(page) {
    setActivePage(page);
    window.history.pushState({}, "", PAGE_PATHS[page] || "/dashboard");
    window.dispatchEvent(new Event("delstudyhub:navigate"));
  }

  // Profil mahasiswa disimpan di LocalStorage agar tetap tersedia setelah refresh.
  const [profile, setProfile] = useState(() =>
    readStorage("delstudyhub_profile", {
      name: localStorage.getItem("delstudyhub_user_name") || "",
      nim: "",
      prodi: "",
      angkatan: "2024",
      bio: "",
    })
  );
  const [profileMessage, setProfileMessage] = useState("");

  function updateProfileField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setProfileMessage("");
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!profile.name.trim() || !profile.nim.trim() || !profile.prodi.trim()) {
      setProfileMessage("Nama lengkap, NIM, dan program studi wajib diisi.");
      return;
    }

    const updatedProfile = {
      ...profile,
      name: profile.name.trim(),
      nim: profile.nim.trim(),
      prodi: profile.prodi.trim(),
      angkatan: profile.angkatan.trim(),
      bio: profile.bio.trim(),
    };

    setProfile(updatedProfile);
    localStorage.setItem("delstudyhub_profile", JSON.stringify(updatedProfile));
    localStorage.setItem("delstudyhub_user_name", updatedProfile.name);
    setProfileMessage("Profil berhasil disimpan.");
  }

  const [tasks, setTasks] = useState(() =>
    readStorage("delstudyhub_tasks", initialTasks)
  );

  const [courses] = useState(() =>
    readStorage("delstudyhub_courses", initialCourses)
  );

  // Data jadwal kuliah disimpan di LocalStorage
  const [schedules, setSchedules] = useState(() =>
    readStorage("delstudyhub_schedules", [])
  );
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleCourse, setScheduleCourse] = useState(
    initialCourses[0]?.name || ""
  );
  const [scheduleDay, setScheduleDay] = useState("Senin");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleRoom, setScheduleRoom] = useState("");

  // Data materi kuliah disimpan di LocalStorage
  const [materials, setMaterials] = useState(() =>
    readStorage("delstudyhub_materials", [])
  );
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialCourse, setMaterialCourse] = useState(
    initialCourses[0]?.name || ""
  );
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialCourseFilter, setMaterialCourseFilter] = useState("Semua");

  // Kelompok belajar, anggota, dan agenda diskusi disimpan bersama.
  const [studyGroups, setStudyGroups] = useState(() =>
    readStorage("delstudyhub_groups", [])
  );
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupCourse, setGroupCourse] = useState(initialCourses[0]?.name || "");
  const [groupDescription, setGroupDescription] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [memberNim, setMemberNim] = useState("");
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState(null);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDate, setAgendaDate] = useState("");
  const [agendaTime, setAgendaTime] = useState("");
  const [agendaLocation, setAgendaLocation] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCourse, setTaskCourse] = useState(initialCourses[0].name);
  const [taskDue, setTaskDue] = useState("");

  useEffect(() => {
    localStorage.setItem("delstudyhub_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("delstudyhub_courses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem("delstudyhub_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem("delstudyhub_materials", JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem("delstudyhub_groups", JSON.stringify(studyGroups));
  }, [studyGroups]);

  const completed = tasks.filter((task) => task.done).length;
  const pending = tasks.filter((task) => !task.done).length;

  function addTask(event) {
    event.preventDefault();

    if (!taskTitle.trim() || !taskDue) return;

    setTasks((previous) => [
      ...previous,
      {
        id: Date.now(),
        title: taskTitle.trim(),
        course: taskCourse,
        due: taskDue,
        done: false,
      },
    ]);

    setTaskTitle("");
    setTaskDue("");
    setShowForm(false);
  }

  function toggleTask(id) {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  }

  function deleteTask(id) {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  }

  function resetMaterialForm() {
    setEditingMaterialId(null);
    setMaterialTitle("");
    setMaterialCourse(courses[0]?.name || "");
    setMaterialUrl("");
    setShowMaterialForm(false);
  }

  function saveMaterial(event) {
    event.preventDefault();

    const trimmedTitle = materialTitle.trim();
    const trimmedUrl = materialUrl.trim();

    if (!trimmedTitle || !materialCourse || !trimmedUrl) return;

    // Pastikan tautan menggunakan protokol HTTP atau HTTPS.
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      alert("Masukkan tautan yang valid, misalnya https://example.com/materi");
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      alert("Tautan materi harus menggunakan HTTP atau HTTPS.");
      return;
    }

    const materialData = {
      id: editingMaterialId ?? Date.now(),
      title: trimmedTitle,
      course: materialCourse,
      url: parsedUrl.href,
    };

    if (editingMaterialId !== null) {
      setMaterials((previous) =>
        previous.map((material) =>
          material.id === editingMaterialId ? materialData : material
        )
      );
    } else {
      setMaterials((previous) => [...previous, materialData]);
    }

    resetMaterialForm();
  }

  function editMaterial(material) {
    setEditingMaterialId(material.id);
    setMaterialTitle(material.title);
    setMaterialCourse(material.course);
    setMaterialUrl(material.url);
    setShowMaterialForm(true);
  }

  function deleteMaterial(id) {
    const confirmed = window.confirm("Yakin ingin menghapus materi ini?");
    if (confirmed) {
      setMaterials((previous) =>
        previous.filter((material) => material.id !== id)
      );
    }
  }

  function resetGroupForm() {
    setEditingGroupId(null);
    setGroupName("");
    setGroupCourse(courses[0]?.name || "");
    setGroupDescription("");
    setShowGroupForm(false);
  }

  function saveGroup(event) {
    event.preventDefault();
    if (!groupName.trim() || !groupCourse) return;

    const groupData = {
      id: editingGroupId ?? Date.now(),
      name: groupName.trim(),
      course: groupCourse,
      description: groupDescription.trim(),
      members:
        editingGroupId !== null
          ? studyGroups.find((group) => group.id === editingGroupId)?.members || []
          : [],
      agendas:
        editingGroupId !== null
          ? studyGroups.find((group) => group.id === editingGroupId)?.agendas || []
          : [],
    };

    if (editingGroupId !== null) {
      setStudyGroups((previous) =>
        previous.map((group) => group.id === editingGroupId ? groupData : group)
      );
    } else {
      setStudyGroups((previous) => [...previous, groupData]);
      setSelectedGroupId(groupData.id);
    }
    resetGroupForm();
  }

  function editGroup(group) {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupCourse(group.course);
    setGroupDescription(group.description || "");
    setShowGroupForm(true);
  }

  function deleteGroup(id) {
    if (window.confirm("Hapus kelompok ini beserta anggota dan agendanya?")) {
      setStudyGroups((previous) => previous.filter((group) => group.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
      if (editingGroupId === id) resetGroupForm();
    }
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberName("");
    setMemberNim("");
    setShowMemberForm(false);
  }

  function saveMember(event) {
    event.preventDefault();
    if (!selectedGroup || !memberName.trim() || !memberNim.trim()) return;

    const memberData = {
      id: editingMemberId ?? Date.now(),
      name: memberName.trim(),
      nim: memberNim.trim(),
    };
    setStudyGroups((previous) => previous.map((group) => {
      if (group.id !== selectedGroup.id) return group;
      const members = editingMemberId !== null
        ? group.members.map((member) => member.id === editingMemberId ? memberData : member)
        : [...group.members, memberData];
      return { ...group, members };
    }));
    resetMemberForm();
  }

  function editMember(member) {
    setEditingMemberId(member.id);
    setMemberName(member.name);
    setMemberNim(member.nim);
    setShowMemberForm(true);
  }

  function deleteMember(memberId) {
    if (!selectedGroup || !window.confirm("Hapus anggota ini dari kelompok?")) return;
    setStudyGroups((previous) => previous.map((group) =>
      group.id === selectedGroup.id
        ? { ...group, members: group.members.filter((member) => member.id !== memberId) }
        : group
    ));
    if (editingMemberId === memberId) resetMemberForm();
  }

  function resetAgendaForm() {
    setEditingAgendaId(null);
    setAgendaTitle("");
    setAgendaDate("");
    setAgendaTime("");
    setAgendaLocation("");
    setShowAgendaForm(false);
  }

  function saveAgenda(event) {
    event.preventDefault();
    if (!selectedGroup || !agendaTitle.trim() || !agendaDate || !agendaTime || !agendaLocation.trim()) return;

    const agendaData = {
      id: editingAgendaId ?? Date.now(),
      title: agendaTitle.trim(),
      date: agendaDate,
      time: agendaTime,
      location: agendaLocation.trim(),
    };
    setStudyGroups((previous) => previous.map((group) => {
      if (group.id !== selectedGroup.id) return group;
      const agendas = editingAgendaId !== null
        ? group.agendas.map((agenda) => agenda.id === editingAgendaId ? agendaData : agenda)
        : [...group.agendas, agendaData];
      return { ...group, agendas };
    }));
    resetAgendaForm();
  }

  function editAgenda(agenda) {
    setEditingAgendaId(agenda.id);
    setAgendaTitle(agenda.title);
    setAgendaDate(agenda.date);
    setAgendaTime(agenda.time);
    setAgendaLocation(agenda.location);
    setShowAgendaForm(true);
  }

  function deleteAgenda(agendaId) {
    if (!selectedGroup || !window.confirm("Hapus agenda diskusi ini?")) return;
    setStudyGroups((previous) => previous.map((group) =>
      group.id === selectedGroup.id
        ? { ...group, agendas: group.agendas.filter((agenda) => agenda.id !== agendaId) }
        : group
    ));
    if (editingAgendaId === agendaId) resetAgendaForm();
  }

  function resetScheduleForm() {
    setEditingScheduleId(null);
    setScheduleCourse(courses[0]?.name || "");
    setScheduleDay("Senin");
    setScheduleStart("");
    setScheduleEnd("");
    setScheduleRoom("");
    setShowScheduleForm(false);
  }

  function saveSchedule(event) {
    event.preventDefault();

    if (
      !scheduleCourse ||
      !scheduleDay ||
      !scheduleStart ||
      !scheduleEnd ||
      !scheduleRoom.trim()
    ) {
      return;
    }

    if (scheduleStart >= scheduleEnd) {
      alert("Jam selesai harus setelah jam mulai.");
      return;
    }

    const scheduleData = {
      id: editingScheduleId ?? Date.now(),
      course: scheduleCourse,
      day: scheduleDay,
      startTime: scheduleStart,
      endTime: scheduleEnd,
      room: scheduleRoom.trim(),
    };

    if (editingScheduleId !== null) {
      setSchedules((previous) =>
        previous.map((schedule) =>
          schedule.id === editingScheduleId ? scheduleData : schedule
        )
      );
    } else {
      setSchedules((previous) => [...previous, scheduleData]);
    }

    resetScheduleForm();
  }

  function editSchedule(schedule) {
    setEditingScheduleId(schedule.id);
    setScheduleCourse(schedule.course);
    setScheduleDay(schedule.day);
    setScheduleStart(schedule.startTime);
    setScheduleEnd(schedule.endTime);
    setScheduleRoom(schedule.room);
    setShowScheduleForm(true);
  }

  function deleteSchedule(id) {
    const confirmed = window.confirm("Yakin ingin menghapus jadwal ini?");
    if (confirmed) {
      setSchedules((previous) =>
        previous.filter((schedule) => schedule.id !== id)
      );
    }
  }

  const selectedGroup = studyGroups.find((group) => group.id === selectedGroupId) || null;

  const daysOfWeek = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  function formatDate(date) {
    if (!date) return "-";

    return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderTask(task) {
    return (
      <div className="task-row" key={task.id}>
        <button
          className={`task-check ${task.done ? "checked" : ""}`}
          onClick={() => toggleTask(task.id)}
          aria-label={task.done ? "Tandai belum selesai" : "Tandai selesai"}
        >
          {task.done ? "✓" : ""}
        </button>

        <div className="task-info">
          <span className={task.done ? "task-title is-done" : "task-title"}>
            {task.title}
          </span>
          <span className="task-course">{task.course}</span>
        </div>

        <span className="task-date">{formatDate(task.due)}</span>

        <button
          className="delete-task"
          onClick={() => deleteTask(task.id)}
          aria-label="Hapus tugas"
          title="Hapus tugas"
        >
          ×
        </button>
      </div>
    );
  }

  function renderPage() {
    if (activePage === "Profil") {
      return (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Profil Mahasiswa</h2>
              <p>Kelola informasi pribadi yang digunakan pada DelStudyHub.</p>
            </div>
          </div>

          <div className="profile-page-content">
            <form className="task-form" onSubmit={saveProfile}>
              <label>
                Nama lengkap
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => updateProfileField("name", event.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </label>
              <label>
                NIM
                <input
                  type="text"
                  value={profile.nim}
                  onChange={(event) => updateProfileField("nim", event.target.value)}
                  placeholder="Masukkan NIM"
                  required
                />
              </label>
              <label>
                Program studi
                <input
                  type="text"
                  value={profile.prodi}
                  onChange={(event) => updateProfileField("prodi", event.target.value)}
                  placeholder="Contoh: S1 Informatika"
                  required
                />
              </label>
              <label>
                Angkatan
                <input
                  type="text"
                  value={profile.angkatan}
                  onChange={(event) => updateProfileField("angkatan", event.target.value)}
                  placeholder="Contoh: 2024"
                />
              </label>
              <label>
                Tentang saya
                <textarea
                  value={profile.bio}
                  onChange={(event) => updateProfileField("bio", event.target.value)}
                  placeholder="Tuliskan deskripsi singkat tentang diri kamu"
                  rows={4}
                />
              </label>
              {profileMessage && (
                <p role="status" className="form-message">{profileMessage}</p>
              )}
              <button className="primary-button" type="submit">Simpan Profil</button>
            </form>

            <div className="profile-preview panel">
              <div className="avatar profile-preview-avatar">
                {(profile.name.trim().charAt(0) || "D").toUpperCase()}
              </div>
              <h3>{profile.name || "Nama Mahasiswa"}</h3>
              <p>{profile.nim || "NIM belum diisi"}</p>
              <p>{profile.prodi || "Program studi belum diisi"}</p>
              <p>Angkatan {profile.angkatan || "-"}</p>
              {profile.bio && <p>{profile.bio}</p>}
            </div>
          </div>
        </section>
      );
    }

    if (activePage === "Dashboard") {
      return (
        <>
          <section className="welcome-banner">
            <div>
              <span className="eyebrow">YOUR LEARNING SPACE</span>
              <h2>Belajar lebih terarah.</h2>
              <p>
                Kelola perkuliahan, selesaikan tugas, dan capai
                target belajarmu bersama DelStudyHub.
              </p>
              <button
                className="banner-button"
                onClick={() => navigateToPage("Tugas")}
              >
                Lihat tugas <span>→</span>
              </button>
            </div>

            <div className="banner-decoration" aria-hidden="true">
              <div className="book-illustration">▤</div>
              <div className="floating-star">✳</div>
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              icon="▤"
              color="blue"
              label="Mata Kuliah"
              value={courses.length}
              note="Mata kuliah terdaftar"
            />
            <StatCard
              icon="◷"
              color="orange"
              label="Tugas Pending"
              value={pending}
              note="Perlu diselesaikan"
            />
            <StatCard
              icon="✓"
              color="green"
              label="Tugas Selesai"
              value={completed}
              note="Berhasil diselesaikan"
            />
            <StatCard
              icon="◎"
              color="purple"
              label="Progres Tugas"
              value={`${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%`}
              note="Penyelesaian tugas"
            />
          </section>

          <section className="content-grid">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Tugas Terbaru</h3>
                  <p>Pantau pekerjaan akademikmu.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigateToPage("Tugas")}
                >
                  Lihat semua →
                </button>
              </div>

              <div className="task-list">
                {tasks.length ? (
                  tasks.slice(0, 4).map(renderTask)
                ) : (
                  <EmptyState text="Belum ada tugas. Tambahkan tugas pertamamu!" />
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Mata Kuliah</h3>
                  <p>Perjalanan belajarmu.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigateToPage("Mata Kuliah")}
                >
                  Lihat semua →
                </button>
              </div>

              <div className="course-list">
                {courses.slice(0, 3).map((course) => (
                  <CourseItem course={course} key={course.id} />
                ))}
              </div>
            </div>
          </section>
        </>
      );
    }

    if (activePage === "Tugas") {
      return (
        <section className="panel page-panel">
          <div className="panel-heading">
            <div>
              <h3>Manajemen Tugas</h3>
              <p>Atur deadline dan pantau status tugasmu.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Batal" : "+ Tambah Tugas"}
            </button>
          </div>

          {showForm && (
            <form className="task-form" onSubmit={addTask}>
              <label>
                Nama tugas
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Contoh: Latihan sorting"
                  required
                />
              </label>

              <label>
                Mata kuliah
                <select
                  value={taskCourse}
                  onChange={(event) => setTaskCourse(event.target.value)}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Deadline
                <input
                  type="date"
                  value={taskDue}
                  onChange={(event) => setTaskDue(event.target.value)}
                  required
                />
              </label>

              <button className="primary-button" type="submit">
                Simpan Tugas
              </button>
            </form>
          )}

          <div className="task-list full-task-list">
            {tasks.length ? (
              tasks.map(renderTask)
            ) : (
              <EmptyState text="Belum ada tugas. Tambahkan tugas baru." />
            )}
          </div>
        </section>
      );
    }

    if (activePage === "Mata Kuliah") {
      return (
        <section className="panel page-panel">
          <div className="panel-heading">
            <div>
              <h3>Mata Kuliah Saya</h3>
              <p>Ringkasan mata kuliah yang sedang dipelajari.</p>
            </div>
          </div>

          <div className="all-courses">
            {courses.map((course) => (
              <CourseItem course={course} key={course.id} />
            ))}
          </div>
        </section>
      );
    }

    if (activePage === "Jadwal") {
      const sortedSchedules = [...schedules].sort((a, b) => {
        const dayDifference =
          daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
        return dayDifference || a.startTime.localeCompare(b.startTime);
      });

      return (
        <section className="panel page-panel">
          <div className="panel-heading">
            <div>
              <h3>Jadwal Kuliah Saya</h3>
              <p>Atur jadwal kuliah berdasarkan hari dan jam.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                if (showScheduleForm) {
                  resetScheduleForm();
                } else {
                  setEditingScheduleId(null);
                  setScheduleCourse(courses[0]?.name || "");
                  setScheduleDay("Senin");
                  setScheduleStart("");
                  setScheduleEnd("");
                  setScheduleRoom("");
                  setShowScheduleForm(true);
                }
              }}
            >
              {showScheduleForm ? "Batal" : "+ Tambah Jadwal"}
            </button>
          </div>

          {showScheduleForm && (
            <form className="task-form" onSubmit={saveSchedule}>
              <label>
                Mata kuliah
                <select
                  value={scheduleCourse}
                  onChange={(event) => setScheduleCourse(event.target.value)}
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Hari
                <select
                  value={scheduleDay}
                  onChange={(event) => setScheduleDay(event.target.value)}
                  required
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Jam mulai
                <input
                  type="time"
                  value={scheduleStart}
                  onChange={(event) => setScheduleStart(event.target.value)}
                  required
                />
              </label>

              <label>
                Jam selesai
                <input
                  type="time"
                  value={scheduleEnd}
                  onChange={(event) => setScheduleEnd(event.target.value)}
                  required
                />
              </label>

              <label>
                Ruangan
                <input
                  value={scheduleRoom}
                  onChange={(event) => setScheduleRoom(event.target.value)}
                  placeholder="Contoh: IF-02"
                  required
                />
              </label>

              <button className="primary-button" type="submit">
                {editingScheduleId !== null ? "Simpan Perubahan" : "Simpan Jadwal"}
              </button>
            </form>
          )}

          <div className="task-list full-task-list">
            {sortedSchedules.length ? (
              sortedSchedules.map((schedule) => (
                <div className="task-row" key={schedule.id}>
                  <div className="task-info">
                    <span className="task-title">{schedule.course}</span>
                    <span className="task-course">
                      {schedule.day} · {schedule.startTime}–{schedule.endTime}
                    </span>
                    <span className="task-course">Ruangan: {schedule.room}</span>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => editSchedule(schedule)}
                    aria-label={`Edit jadwal ${schedule.course}`}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-task"
                    type="button"
                    onClick={() => deleteSchedule(schedule.id)}
                    aria-label={`Hapus jadwal ${schedule.course}`}
                    title="Hapus jadwal"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <EmptyState text="Belum ada jadwal. Klik Tambah Jadwal untuk membuat jadwal kuliah pertamamu." />
            )}
          </div>
        </section>
      );
    }

    if (activePage === "Materi") {
      const normalizedSearch = materialSearch.trim().toLowerCase();
      const filteredMaterials = materials.filter((material) => {
        const matchesSearch =
          material.title.toLowerCase().includes(normalizedSearch) ||
          material.course.toLowerCase().includes(normalizedSearch);
        const matchesCourse =
          materialCourseFilter === "Semua" ||
          material.course === materialCourseFilter;
        return matchesSearch && matchesCourse;
      });

      return (
        <section className="panel page-panel">
          <div className="panel-heading">
            <div>
              <h3>Materi Kuliah</h3>
              <p>Simpan dan temukan tautan materi pembelajaranmu.</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (showMaterialForm) {
                  resetMaterialForm();
                } else {
                  setEditingMaterialId(null);
                  setMaterialTitle("");
                  setMaterialCourse(courses[0]?.name || "");
                  setMaterialUrl("");
                  setShowMaterialForm(true);
                }
              }}
            >
              {showMaterialForm ? "Batal" : "+ Tambah Materi"}
            </button>
          </div>

          {showMaterialForm && (
            <form className="task-form" onSubmit={saveMaterial}>
              <label>
                Judul materi
                <input
                  value={materialTitle}
                  onChange={(event) => setMaterialTitle(event.target.value)}
                  placeholder="Contoh: Ringkasan Algoritma Pencarian"
                  required
                />
              </label>

              <label>
                Mata kuliah
                <select
                  value={materialCourse}
                  onChange={(event) => setMaterialCourse(event.target.value)}
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tautan materi
                <input
                  type="url"
                  value={materialUrl}
                  onChange={(event) => setMaterialUrl(event.target.value)}
                  placeholder="https://..."
                  required
                />
              </label>

              <button className="primary-button" type="submit">
                {editingMaterialId !== null ? "Simpan Perubahan" : "Simpan Materi"}
              </button>
            </form>
          )}

          <div className="task-form material-filters">
            <label>
              Cari materi
              <input
                type="search"
                value={materialSearch}
                onChange={(event) => setMaterialSearch(event.target.value)}
                placeholder="Cari judul atau mata kuliah..."
              />
            </label>
            <label>
              Filter mata kuliah
              <select
                value={materialCourseFilter}
                onChange={(event) => setMaterialCourseFilter(event.target.value)}
              >
                <option value="Semua">Semua mata kuliah</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.name}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-list full-task-list">
            {filteredMaterials.length ? (
              filteredMaterials.map((material) => (
                <div className="task-row" key={material.id}>
                  <div className="task-info">
                    <span className="task-title">{material.title}</span>
                    <span className="task-course">{material.course}</span>
                    <a
                      className="task-course material-link"
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Buka materi ↗
                    </a>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => editMaterial(material)}
                    aria-label={`Edit materi ${material.title}`}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-task"
                    type="button"
                    onClick={() => deleteMaterial(material.id)}
                    aria-label={`Hapus materi ${material.title}`}
                    title="Hapus materi"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                text={
                  materials.length
                    ? "Materi tidak ditemukan. Coba ubah kata pencarian atau filter mata kuliah."
                    : "Belum ada materi. Klik Tambah Materi untuk menyimpan tautan pertamamu."
                }
              />
            )}
          </div>
        </section>
      );
    }

    if (activePage === "Kelompok Belajar") {
      return (
        <section className="panel page-panel">
          <div className="panel-heading">
            <div>
              <h3>Kelompok Belajar</h3>
              <p>Buat kelompok, kelola anggota, dan rencanakan agenda diskusi.</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => showGroupForm ? resetGroupForm() : (setEditingGroupId(null), setGroupName(""), setGroupCourse(courses[0]?.name || ""), setGroupDescription(""), setShowGroupForm(true))}
            >
              {showGroupForm ? "Batal" : "+ Tambah Kelompok"}
            </button>
          </div>

          {showGroupForm && (
            <form className="task-form" onSubmit={saveGroup}>
              <label>
                Nama kelompok
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Contoh: Tim Belajar Struktur Data" required />
              </label>
              <label>
                Mata kuliah
                <select value={groupCourse} onChange={(event) => setGroupCourse(event.target.value)} required>
                  {courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}
                </select>
              </label>
              <label>
                Deskripsi
                <input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Tujuan atau topik kelompok" />
              </label>
              <button className="primary-button" type="submit">{editingGroupId !== null ? "Simpan Perubahan" : "Simpan Kelompok"}</button>
            </form>
          )}

          <div className="all-courses">
            {studyGroups.length ? studyGroups.map((group) => (
              <div className="task-row" key={group.id} style={{ alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className={`text-button ${selectedGroupId === group.id ? "active" : ""}`}
                  type="button"
                  onClick={() => { setSelectedGroupId(group.id); resetMemberForm(); resetAgendaForm(); }}
                  style={{ textAlign: "left", flex: "1 1 220px", whiteSpace: "normal" }}
                >
                  <strong>{group.name}</strong><br />
                  <span className="task-course">{group.course} · {(group.members || []).length} anggota · {(group.agendas || []).length} agenda</span>
                </button>
                <button className="text-button" type="button" onClick={() => editGroup(group)}>Edit</button>
                <button className="delete-task" type="button" onClick={() => deleteGroup(group.id)} aria-label={`Hapus kelompok ${group.name}`} title="Hapus kelompok">×</button>
              </div>
            )) : <EmptyState text="Belum ada kelompok belajar. Tambahkan kelompok pertamamu." />}
          </div>

          {selectedGroup && (
            <div style={{ marginTop: "24px" }}>
              <div className="panel-heading">
                <div>
                  <h3>{selectedGroup.name}</h3>
                  <p>{selectedGroup.course}{selectedGroup.description ? ` · ${selectedGroup.description}` : ""}</p>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: "18px" }}>
                <div className="panel-heading">
                  <div><h3>Anggota Kelompok</h3><p>Catat nama dan NIM anggota.</p></div>
                  <button className="primary-button" type="button" onClick={() => showMemberForm ? resetMemberForm() : (setEditingMemberId(null), setMemberName(""), setMemberNim(""), setShowMemberForm(true))}>{showMemberForm ? "Batal" : "+ Tambah Anggota"}</button>
                </div>
                {showMemberForm && (
                  <form className="task-form" onSubmit={saveMember}>
                    <label>Nama anggota<input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Nama lengkap" required /></label>
                    <label>NIM<input value={memberNim} onChange={(event) => setMemberNim(event.target.value)} placeholder="Nomor induk mahasiswa" required /></label>
                    <button className="primary-button" type="submit">{editingMemberId !== null ? "Simpan Perubahan" : "Simpan Anggota"}</button>
                  </form>
                )}
                <div className="task-list full-task-list">
                  {selectedGroup.members?.length ? selectedGroup.members.map((member) => (
                    <div className="task-row" key={member.id}>
                      <div className="task-info"><span className="task-title">{member.name}</span><span className="task-course">NIM: {member.nim}</span></div>
                      <button className="text-button" type="button" onClick={() => editMember(member)}>Edit</button>
                      <button className="delete-task" type="button" onClick={() => deleteMember(member.id)} aria-label={`Hapus anggota ${member.name}`} title="Hapus anggota">×</button>
                    </div>
                  )) : <EmptyState text="Belum ada anggota di kelompok ini." />}
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div><h3>Agenda Diskusi</h3><p>Atur waktu dan lokasi pertemuan kelompok.</p></div>
                  <button className="primary-button" type="button" onClick={() => showAgendaForm ? resetAgendaForm() : (setEditingAgendaId(null), setAgendaTitle(""), setAgendaDate(""), setAgendaTime(""), setAgendaLocation(""), setShowAgendaForm(true))}>{showAgendaForm ? "Batal" : "+ Tambah Agenda"}</button>
                </div>
                {showAgendaForm && (
                  <form className="task-form" onSubmit={saveAgenda}>
                    <label>Topik diskusi<input value={agendaTitle} onChange={(event) => setAgendaTitle(event.target.value)} placeholder="Contoh: Persiapan ujian" required /></label>
                    <label>Tanggal<input type="date" value={agendaDate} onChange={(event) => setAgendaDate(event.target.value)} required /></label>
                    <label>Jam<input type="time" value={agendaTime} onChange={(event) => setAgendaTime(event.target.value)} required /></label>
                    <label>Tempat atau tautan pertemuan<input value={agendaLocation} onChange={(event) => setAgendaLocation(event.target.value)} placeholder="Contoh: Perpustakaan / Google Meet" required /></label>
                    <button className="primary-button" type="submit">{editingAgendaId !== null ? "Simpan Perubahan" : "Simpan Agenda"}</button>
                  </form>
                )}
                <div className="task-list full-task-list">
                  {selectedGroup.agendas?.length ? [...selectedGroup.agendas].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)).map((agenda) => (
                    <div className="task-row" key={agenda.id}>
                      <div className="task-info"><span className="task-title">{agenda.title}</span><span className="task-course">{formatDate(agenda.date)} · {agenda.time}</span><span className="task-course">Tempat: {agenda.location}</span></div>
                      <button className="text-button" type="button" onClick={() => editAgenda(agenda)}>Edit</button>
                      <button className="delete-task" type="button" onClick={() => deleteAgenda(agenda.id)} aria-label={`Hapus agenda ${agenda.title}`} title="Hapus agenda">×</button>
                    </div>
                  )) : <EmptyState text="Belum ada agenda diskusi untuk kelompok ini." />}
                </div>
              </div>
            </div>
          )}
        </section>
      );
    }

    const descriptions = {
      Jadwal: "Rencanakan jadwal kuliah dan waktu belajar mandiri.",
      Materi: "Kelola catatan, rangkuman, dan tautan materi kuliah.",
      "Kelompok Belajar":
        "Ruang untuk merencanakan belajar bersama teman.",
    };

    return (
      <section className="panel empty-page">
        <div className="empty-icon">✳</div>
        <h3>{activePage}</h3>
        <p>
          {descriptions[activePage] ||
            "Halaman profil dan pengaturan pengguna."}
        </p>
        <span className="coming-soon">
          Dipersiapkan untuk tahap berikutnya
        </span>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            navigateToPage("Dashboard");
          }}
        >
          <div className="brand-icon">D</div>
          <div>
            <span className="brand-name">DelStudyHub</span>
            <span className="brand-caption">YOUR CAMPUS COMPANION</span>
          </div>
        </a>

        <div className="sidebar-label">MENU UTAMA</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <div key={item.label}>
              {item.section && item.label !== "Dashboard" && (
                <div className="sidebar-label section-label">
                  {item.section}
                </div>
              )}

              <button
                className={`nav-item ${
                  activePage === item.label ? "active" : ""
                }`}
                onClick={() => {
                  navigateToPage(item.label);
                  setShowForm(false);
                  setShowMaterialForm(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>

                {item.label === "Tugas" && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Terus semangat!</strong>
            <p>
              Langkah kecil hari ini membawa hasil besar esok hari.
            </p>
          </div>

          <button
            className={`nav-item profile-link ${
              activePage === "Profil" ? "active" : ""
            }`}
            onClick={() => navigateToPage("Profil")}
          >
            <span className="avatar">D</span>
            <span className="profile-text">
              <strong>{profile.name || "Mahasiswa Del"}</strong>
              <small>Student account</small>
            </span>
            <span className="profile-menu">···</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / {activePage}
            </div>
            <h1>{activePage}</h1>
          </div>

          <div className="topbar-right">
            <span className="today-label">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <div className="top-avatar">{(profile.name.trim().charAt(0) || "D").toUpperCase()}</div>
            <button className="logout-button" type="button" onClick={onLogout}>Keluar</button>
          </div>
        </header>

        <div className="page-content">{renderPage()}</div>

        <footer className="footer">
          <span>© 2026 DelStudyHub</span>
          <span>Belajar, berkembang, berkolaborasi.</span>
        </footer>
      </main>
    </div>
  );
}

function PublicHome({ onLoginClick, onRegisterClick }) {
  return (
    <main className="public-home">
      <nav className="public-nav">
        <a className="public-brand" href="/">DelStudyHub</a>
        <div className="public-nav-actions"><button className="secondary-button" onClick={onRegisterClick}>Daftar</button><button className="primary-button" onClick={onLoginClick}>Login</button></div>
      </nav>
      <section className="public-hero">
        <span className="public-eyebrow">YOUR CAMPUS COMPANION</span>
        <h1>Belajar lebih teratur bersama DelStudyHub.</h1>
        <p>Kelola tugas, jadwal kuliah, materi, dan kelompok belajar dalam satu tempat.</p>
        <div className="public-cta-row"><button className="primary-button public-cta" onClick={onRegisterClick}>Buat Akun →</button><button className="secondary-button public-cta" onClick={onLoginClick}>Sudah punya akun? Login</button></div>
      </section>
      <section className="public-features">
        <article><strong>✓ Tugas</strong><p>Pantau tugas yang belum selesai dan tenggat waktu.</p></article>
        <article><strong>▦ Jadwal</strong><p>Atur jadwal kuliah dan kegiatan belajar.</p></article>
        <article><strong>♧ Kolaborasi</strong><p>Kelola materi dan kelompok belajar.</p></article>
      </section>
    </main>
  );
}


function LoginPage({ onLogin, onNavigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submitLogin(event) {
    event.preventDefault();
    setError("");

    const success = onLogin(username.trim(), password);

    if (!success) {
      setError("Username atau password tidak sesuai.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <a className="login-back" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
          ← Kembali ke halaman publik
        </a>

        <div className="login-logo">D</div>

        <h1>Masuk ke DelStudyHub</h1>

        <p className="login-subtitle">
          Silakan masuk untuk membuka dashboard dan fitur belajar.
        </p>

        <form onSubmit={submitLogin} className="login-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Masukkan username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password"
            required
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            id="btn-submit"
            className="primary-button login-submit"
            type="submit"
          >
            Login
          </button>
        </form>

        <p className="register-prompt">
          Belum punya akun?{" "}
          <a href="/auth/register" onClick={(event) => { event.preventDefault(); onNavigate("/auth/register"); }}>Daftar sekarang</a>
        </p>
      </section>
    </main>
  );
}


function RegisterPage({ onRegister, onNavigate }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function submitRegister(event) {
    event.preventDefault();
    if (password.length < 8) {
      setIsError(true);
      setMessage("Password harus terdiri dari minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Konfirmasi password tidak sama.");
      return;
    }
    const result = onRegister({ name, username, email, password });
    setIsError(!result.ok);
    setMessage(result.message);
    if (result.ok) {
      setName(""); setUsername(""); setEmail(""); setPassword(""); setConfirmPassword("");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <a className="login-back" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>← Kembali ke halaman publik</a>
        <div className="login-logo">D</div>
        <h1>Buat akun DelStudyHub</h1>
        <p className="login-subtitle">Daftar terlebih dahulu. Setelah berhasil, gunakan akunmu untuk login.</p>
        <form onSubmit={submitRegister} className="login-form">
          <label>Nama lengkap<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" required /></label>
          <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Buat username" minLength={3} required /></label>
          <label>Email<input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" required /></label>
          <label>Password<input autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" minLength={8} required /></label>
          <label>Konfirmasi password<input autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password" minLength={8} required /></label>
          {message && <p className={isError ? "login-error" : "register-success"} role="status">{message}</p>}
          {message.startsWith("Registrasi berhasil") && <a className="primary-button login-submit register-login-link" href="/auth/login" onClick={(event) => { event.preventDefault(); onNavigate("/auth/login"); }}>Lanjut ke Login</a>}
          {!message.startsWith("Registrasi berhasil") && <button className="primary-button login-submit" type="submit">Daftar</button>}
        </form>
        <p className="register-prompt">Sudah punya akun? <a href="/auth/login" onClick={(event) => { event.preventDefault(); onNavigate("/auth/login"); }}>Login</a></p>
      </section>
    </main>
  );
}

function StatCard({ icon, color, label, value, note }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function CourseItem({ course }) {
  return (
    <div className="course-item">
      <div className={`course-icon ${course.color}`}>
        {course.code.slice(0, 2)}
      </div>

      <div className="course-info">
        <strong>{course.name}</strong>
        <span>{course.code}</span>

        <div className="progress-track">
          <div
            className={`progress-fill ${course.color}`}
            style={{ width: `${course.progress}%` }}
          />
        </div>
      </div>

      <span className="progress-label">{course.progress}%</span>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

export default App;
