import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===================== FIREBASE INIT =====================
const firebaseConfig = {
  apiKey: "AIzaSyALo4r1b26m_vJVD0zpD7AfiM46SfDkvy0",
  authDomain: "ppa-zahi.firebaseapp.com",
  projectId: "ppa-zahi",
  storageBucket: "ppa-zahi.firebasestorage.app",
  messagingSenderId: "1074747696973",
  appId: "1:1074747696973:web:f3349b03d122d873f97904",
  measurementId: "G-4VLREV3WQM"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const laporanRef = collection(db, "laporan_ppa");

let allLaporanData = [];
let uniqueNamesSet = new Set();
let calMonth, calYear;
let selectedCalDate = null;
let pendingDeleteId = null;

// ===================== TOAST =====================
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");
  toastMsg.textContent = msg;
  toast.className = "toast toast-" + type + " show";
  setTimeout(() => { toast.className = "toast hidden"; }, 3000);
}

// ===================== SPLASH SCREEN =====================
window.closeSplash = function () {
  const splash = document.getElementById("splash-screen");
  splash.style.opacity = "0";
  splash.style.transition = "opacity 0.5s ease";
  setTimeout(() => { splash.classList.add("hidden"); }, 500);
};

// ===================== GUEST NAVIGATION =====================
window.nextToDate = function () {
  const nama = document.getElementById("select-santri").value;
  if (!nama) return showToast("Pilih nama santri terlebih dahulu!", "error");
  document.getElementById("selected-name-display").textContent = nama;
  document.getElementById("step-nama").classList.add("hidden");
  document.getElementById("step-tanggal").classList.remove("hidden");
  initCalendar();
};

window.backToNama = function () {
  document.getElementById("step-tanggal").classList.add("hidden");
  document.getElementById("step-nama").classList.remove("hidden");
  selectedCalDate = null;
};

window.backToDate = function () {
  document.getElementById("card-laporan").classList.add("hidden");
  document.getElementById("step-tanggal").classList.remove("hidden");
};

// ===================== CALENDAR =====================
function initCalendar() {
  const today = new Date();
  calMonth = today.getMonth();
  calYear = today.getFullYear();
  selectedCalDate = null;
  updateSelectedDateDisplay();
  renderCalendar();
}

function renderCalendar() {
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  document.getElementById("cal-month-year").textContent = monthNames[calMonth] + " " + calYear;

  const daysContainer = document.getElementById("cal-days");
  daysContainer.innerHTML = "";

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day cal-day-empty";
    daysContainer.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "cal-day";
    cell.textContent = d;

    const cellDate = new Date(calYear, calMonth, d);
    cellDate.setHours(0, 0, 0, 0);

    const cellDateStr = calYear + "-" + String(calMonth + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const selectedNama = document.getElementById("select-santri").value;
    const hasData = allLaporanData.some(item =>
      item.nama.trim().toLowerCase() === selectedNama.trim().toLowerCase() && item.tanggal === cellDateStr
    );

    if (hasData) {
      cell.classList.add("cal-day-has-data");
    }

    if (cellDate > today) {
      cell.classList.add("cal-day-future");
      cell.style.cursor = "not-allowed";
    } else {
      if (cellDate.getTime() === today.getTime()) {
        cell.classList.add("cal-day-today");
      }
      if (selectedCalDate && cellDate.getTime() === selectedCalDate.getTime()) {
        cell.classList.add("cal-day-selected");
      }
      cell.addEventListener("click", () => selectCalDate(d));
    }

    daysContainer.appendChild(cell);
  }
}

function selectCalDate(day) {
  selectedCalDate = new Date(calYear, calMonth, day);
  selectedCalDate.setHours(0, 0, 0, 0);
  renderCalendar();
  updateSelectedDateDisplay();
}

function updateSelectedDateDisplay() {
  const display = document.getElementById("selected-date-display");
  const text = document.getElementById("selected-date-text");
  if (selectedCalDate) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    text.textContent = selectedCalDate.toLocaleDateString("id-ID", options);
    display.classList.remove("hidden");
  } else {
    display.classList.add("hidden");
  }
}

window.calPrev = function () {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
};

window.calNext = function () {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
};

// ===================== SHOW REPORT CARD =====================
window.showReportCard = function () {
  if (!selectedCalDate) return showToast("Pilih tanggal terlebih dahulu!", "error");
  const nama = document.getElementById("select-santri").value;
  const yyyy = selectedCalDate.getFullYear();
  const mm = String(selectedCalDate.getMonth() + 1).padStart(2, "0");
  const dd = String(selectedCalDate.getDate()).padStart(2, "0");
  const dateStr = yyyy + "-" + mm + "-" + dd;

  const found = allLaporanData.find(item =>
    item.nama.trim().toLowerCase() === nama.trim().toLowerCase() && item.tanggal === dateStr
  );

  document.getElementById("card-nama").textContent = nama;
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("card-tgl").textContent = "Tanggal: " + selectedCalDate.toLocaleDateString("id-ID", options);

  if (found) {
    document.getElementById("card-ziyadah").textContent = found.ziyadah || "-";
    document.getElementById("card-murajaah").textContent = found.murajaah || "-";
    document.getElementById("card-catatan").textContent = found.catatan || "-";
    const ketEl = document.getElementById("card-keterangan");
    ketEl.textContent = found.keterangan || "-";
    ketEl.className = "report-badge " + getKetBadgeClass(found.keterangan);
  } else {
    document.getElementById("card-ziyadah").textContent = "Tidak ada laporan untuk tanggal ini.";
    document.getElementById("card-murajaah").textContent = "-";
    document.getElementById("card-catatan").textContent = "-";
    const ketEl = document.getElementById("card-keterangan");
    ketEl.textContent = "Belum Ada Data";
    ketEl.className = "report-badge badge-izin";

    // Show available dates for this name
    const datesAvailable = allLaporanData
      .filter(item => item.nama.trim().toLowerCase() === nama.trim().toLowerCase())
      .map(item => item.tanggal)
      .sort();
    if (datesAvailable.length > 0) {
      const formattedDates = datesAvailable.map(d => {
        const dt = new Date(d + "T00:00:00");
        return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      }).join(", ");
      document.getElementById("card-ziyadah").textContent =
        "Tidak ada laporan untuk tanggal ini. Laporan tersedia: " + formattedDates;
    }
  }

  document.getElementById("step-tanggal").classList.add("hidden");
  document.getElementById("card-laporan").classList.remove("hidden");
};

function getKetBadgeClass(ket) {
  if (!ket) return "badge-izin";
  switch (ket) {
    case "Lancar": return "badge-lancar";
    case "Kurang Lancar": return "badge-kurang";
    case "Mengulang": return "badge-mengulang";
    default: return "badge-izin";
  }
}

// ===================== ADMIN AUTH =====================
window.openLoginModal = function () {
  document.getElementById("login-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("admin-usn").focus(), 100);
};

window.closeLoginModal = function () {
  document.getElementById("login-modal").classList.add("hidden");
  document.getElementById("admin-usn").value = "";
  document.getElementById("admin-pw").value = "";
};

window.loginAdmin = function () {
  const usn = document.getElementById("admin-usn").value.trim();
  const pw = document.getElementById("admin-pw").value;

  if (usn === "zazairaa" && pw === "zai2708") {
    closeLoginModal();
    document.getElementById("btn-login").classList.add("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    document.getElementById("btn-back-guest").classList.remove("hidden");
    document.getElementById("guest-view").classList.add("hidden");
    document.getElementById("admin-view").classList.remove("hidden");
    updateStats();
    showToast("Login admin berhasil!");
  } else {
    showToast("Username atau Password salah!", "error");
  }
};

window.logoutAdmin = function () {
  document.getElementById("admin-view").classList.add("hidden");
  document.getElementById("guest-view").classList.remove("hidden");
  document.getElementById("btn-logout").classList.add("hidden");
  document.getElementById("btn-back-guest").classList.add("hidden");
  document.getElementById("btn-login").classList.remove("hidden");
  resetGuestView();
  showToast("Berhasil logout.");
};

window.backToGuestMode = function () {
  document.getElementById("admin-view").classList.add("hidden");
  document.getElementById("guest-view").classList.remove("hidden");
};

window.toggleGuestView = function () {
  document.getElementById("admin-view").classList.add("hidden");
  document.getElementById("guest-view").classList.remove("hidden");
  document.getElementById("btn-back-guest").classList.remove("hidden");
};

function resetGuestView() {
  document.getElementById("step-tanggal").classList.add("hidden");
  document.getElementById("card-laporan").classList.add("hidden");
  document.getElementById("step-nama").classList.remove("hidden");
  document.getElementById("select-santri").selectedIndex = 0;
  selectedCalDate = null;
}

// ===================== DEBUG HELPERS =====================
window.debugData = function () {
  console.log("=== DEBUG DATA ===");
  console.log("Jumlah laporan di memori:", allLaporanData.length);
  console.log("Data mentah:", JSON.stringify(allLaporanData, null, 2));
  console.log("Nama unik:", Array.from(uniqueNamesSet));
};

window.debugFetch = async function () {
  try {
    console.log("=== FETCH MENTAH DARI FIRESTORE ===");
    const snap = await getDocs(laporanRef);
    console.log("Total dokumen dari server:", snap.size);
    snap.forEach(d => console.log(d.id, d.data()));
  } catch (e) {
    console.error("Fetch error:", e);
  }
};

// ===================== FIREBASE REALTIME LISTENER =====================
onSnapshot(laporanRef, (snapshot) => {
  allLaporanData = [];
  uniqueNamesSet = new Set();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    allLaporanData.push(data);
    uniqueNamesSet.add(data.nama);
  });

  // Sort by date descending
  allLaporanData.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  console.log("Firestore sync: " + allLaporanData.length + " laporan dimuat", allLaporanData);

  populateSantriSelect();
  renderAdminTable();
  updateStats();
}, (error) => {
  console.error("Firestore read error:", error);
  showToast("Gagal membaca data dari server: " + error.message, "error");
});

function populateSantriSelect() {
  const select = document.getElementById("select-santri");
  const currentVal = select.value;
  select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Santri --</option>';

  const sortedNames = Array.from(uniqueNamesSet).sort();
  sortedNames.forEach(nama => {
    const opt = document.createElement("option");
    opt.value = nama;
    opt.textContent = nama;
    select.appendChild(opt);
  });

  if (currentVal && uniqueNamesSet.has(currentVal)) {
    select.value = currentVal;
  }
}

function updateStats() {
  const total = allLaporanData.length;
  const nama = uniqueNamesSet.size;
  const today = new Date();
  const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const hariIni = allLaporanData.filter(d => d.tanggal === todayStr).length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-nama").textContent = nama;
  document.getElementById("stat-hari-ini").textContent = hariIni;
}

// ===================== ADMIN TABLE =====================
function renderAdminTable() {
  const tbody = document.getElementById("admin-table-body");
  const emptyState = document.getElementById("table-empty");
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  const filterKet = document.getElementById("filter-keterangan").value;

  let filtered = allLaporanData.filter(item => {
    const matchSearch = !searchTerm || item.nama.toLowerCase().includes(searchTerm);
    const matchKet = !filterKet || item.keterangan === filterKet;
    return matchSearch && matchKet;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tbody.innerHTML = filtered.map((item, idx) => `
    <tr>
      <td class="td-name" data-label="Nama">${item.nama}</td>
      <td data-label="Tanggal">${formatDateID(item.tanggal)}</td>
      <td data-label="Ziyadah">${item.ziyadah || "-"}</td>
      <td data-label="Murajaah">${item.murajaah || "-"}</td>
      <td data-label="Catatan" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.catatan || "-"}</td>
      <td class="td-ket" data-label="Ket."><span class="badge-ket ${getKetBadgeClass(item.keterangan)}">${item.keterangan || "-"}</span></td>
      <td data-label="Aksi">
        <div class="td-actions">
          <button class="btn-table btn-table-view" onclick="showDetailModal('${item.id}')" title="Lihat Detail">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-table btn-table-edit" onclick="editLaporan('${item.id}')" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-table btn-table-delete" onclick="openDeleteModal('${item.id}')" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

window.filterTable = function () {
  renderAdminTable();
};

// ===================== DETAIL MODAL =====================
window.showDetailModal = function (id) {
  const data = allLaporanData.find(item => item.id === id);
  if (!data) return;

  document.getElementById("detail-modal-title").textContent = "Detail: " + data.nama;
  const body = document.getElementById("detail-modal-body");
  body.innerHTML = `
    <div class="detail-row"><span class="detail-label">Nama</span><span class="detail-value">${data.nama}</span></div>
    <div class="detail-row"><span class="detail-label">Tanggal</span><span class="detail-value">${formatDateID(data.tanggal)}</span></div>
    <div class="detail-row"><span class="detail-label">Ziyadah</span><span class="detail-value">${data.ziyadah || "-"}</span></div>
    <div class="detail-row"><span class="detail-label">Murajaah</span><span class="detail-value">${data.murajaah || "-"}</span></div>
    <div class="detail-row"><span class="detail-label">Catatan</span><span class="detail-value">${data.catatan || "-"}</span></div>
    <div class="detail-row"><span class="detail-label">Keterangan</span><span class="detail-value"><span class="badge-ket ${getKetBadgeClass(data.keterangan)}">${data.keterangan || "-"}</span></span></div>
  `;

  document.getElementById("detail-btn-edit").onclick = function () {
    closeDetailModal();
    editLaporan(id);
  };

  document.getElementById("detail-modal").classList.remove("hidden");
};

window.closeDetailModal = function () {
  document.getElementById("detail-modal").classList.add("hidden");
};

// ===================== DELETE MODAL =====================
window.openDeleteModal = function (id) {
  pendingDeleteId = id;
  document.getElementById("delete-modal").classList.remove("hidden");
};

window.closeDeleteModal = function () {
  pendingDeleteId = null;
  document.getElementById("delete-modal").classList.add("hidden");
};

window.confirmDelete = async function () {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, "laporan_ppa", pendingDeleteId));
    closeDeleteModal();
    showToast("Laporan berhasil dihapus!");
  } catch (error) {
    showToast("Gagal menghapus: " + error.message, "error");
  }
};

// ===================== CRUD =====================
window.simpanLaporan = async function () {
  const docId = document.getElementById("admin-doc-id").value;
  const nama = document.getElementById("form-nama").value.trim();
  const tanggal = document.getElementById("form-tanggal").value;
  const ziyadah = document.getElementById("form-ziyadah").value.trim();
  const murajaah = document.getElementById("form-murajaah").value.trim();
  const catatan = document.getElementById("form-catatan").value.trim();
  const keterangan = document.getElementById("form-keterangan").value;

  if (!nama) return showToast("Nama santri wajib diisi!", "error");
  if (!tanggal) return showToast("Tanggal wajib diisi!", "error");

  const payload = { nama, tanggal, ziyadah, murajaah, catatan, keterangan };

  try {
    if (docId) {
      await updateDoc(doc(db, "laporan_ppa", docId), payload);
      showToast("Laporan berhasil diperbarui!");
    } else {
      await addDoc(laporanRef, payload);
      showToast("Laporan berhasil ditambahkan!");
    }
    resetFormAdmin();
  } catch (error) {
    showToast("Gagal menyimpan: " + error.message, "error");
  }
};

window.editLaporan = function (id) {
  const data = allLaporanData.find(item => item.id === id);
  if (!data) return;

  document.getElementById("admin-doc-id").value = data.id;
  document.getElementById("form-nama").value = data.nama;
  document.getElementById("form-tanggal").value = data.tanggal;
  document.getElementById("form-ziyadah").value = data.ziyadah || "";
  document.getElementById("form-murajaah").value = data.murajaah || "";
  document.getElementById("form-catatan").value = data.catatan || "";
  document.getElementById("form-keterangan").value = data.keterangan || "Lancar";

  document.getElementById("form-title").innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    Edit Laporan: ${data.nama}
  `;
  document.getElementById("btn-batal-edit").classList.remove("hidden");

  // Scroll to form
  document.getElementById("admin-view").scrollIntoView({ behavior: "smooth", block: "start" });
};

window.resetFormAdmin = function () {
  document.getElementById("admin-doc-id").value = "";
  document.getElementById("form-nama").value = "";
  document.getElementById("form-tanggal").value = "";
  document.getElementById("form-ziyadah").value = "";
  document.getElementById("form-murajaah").value = "";
  document.getElementById("form-catatan").value = "";
  document.getElementById("form-keterangan").value = "Lancar";
  document.getElementById("form-title").innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Tambah Laporan Baru
  `;
  document.getElementById("btn-batal-edit").classList.add("hidden");
};

// ===================== CLOSE MODALS ON OVERLAY CLICK =====================
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", function (e) {
    if (e.target === this) {
      this.classList.add("hidden");
      pendingDeleteId = null;
    }
  });
});

// ===================== CLOSE MODALS WITH ESC =====================
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
    pendingDeleteId = null;
  }
});
