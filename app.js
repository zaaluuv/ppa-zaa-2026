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
const siswiRef = collection(db, "nama_siswi");
const suratRef = collection(db, "surat");
const ayatRef = collection(db, "ayat");

let allLaporanData = [];
let uniqueNamesSet = new Set();
let allSiswi = [];
let allSurat = [];
let allAyat = [];
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

// ===================== SEARCHABLE SELECT =====================
const searchableSelects = {};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initSearchableSelect(selectId, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sselect";
  wrapper.innerHTML =
    '<input type="text" class="sselect-input" placeholder="' + escapeHtml(placeholder) + '" autocomplete="off" readonly>' +
    '<div class="sselect-list hidden"></div>';
  select.classList.add("sselect-hidden-select");
  select.parentNode.insertBefore(wrapper, select);

  const input = wrapper.querySelector(".sselect-input");
  const list = wrapper.querySelector(".sselect-list");
  const st = { open: false, active: -1, shown: [] };

  function allOptions() {
    return Array.from(select.options).map(o => ({ value: o.value, label: o.textContent }));
  }
  function selectedLabel() {
    const o = Array.from(select.options).find(x => String(x.value) === String(select.value));
    return o ? o.textContent : "";
  }
  function render(filter) {
    const f = (filter || "").toLowerCase();
    st.shown = allOptions().filter(o => !f || String(o.label).toLowerCase().includes(f));
    if (st.shown.length) {
      list.innerHTML = st.shown.map((o, i) =>
        '<div class="sselect-option' + (String(o.value) === String(select.value) ? " selected" : "") + '" data-i="' + i + '" data-value="' + escapeHtml(String(o.value)) + '">' + escapeHtml(o.label) + '</div>'
      ).join("");
    } else {
      list.innerHTML = '<div class="sselect-empty">Tidak ada hasil</div>';
    }
    st.active = -1;
  }
  function setActive(i) {
    const els = list.querySelectorAll(".sselect-option");
    els.forEach(el => el.classList.remove("active"));
    if (i >= 0 && i < els.length) {
      els[i].classList.add("active");
      els[i].scrollIntoView({ block: "nearest" });
    }
    st.active = i;
  }
  function refreshDisplay() {
    input.value = select.value ? selectedLabel() : "";
  }
  function open() {
    st.open = true;
    input.classList.add("open");
    input.removeAttribute("readonly");
    list.classList.remove("hidden");
    input.value = "";
    render("");
    input.focus();
  }
  function close() {
    st.open = false;
    input.classList.remove("open");
    input.setAttribute("readonly", "readonly");
    list.classList.add("hidden");
    refreshDisplay();
  }
  function commit(value) {
    select.value = value;
    close();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  input.addEventListener("focus", () => { if (!st.open) open(); });
  input.addEventListener("click", () => { if (!st.open) open(); });
  input.addEventListener("input", () => {
    if (!st.open) open();
    render(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (st.shown.length) setActive(st.active < st.shown.length - 1 ? st.active + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (st.shown.length) setActive(st.active > 0 ? st.active - 1 : st.shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (st.open) {
        const o = st.shown[st.active >= 0 ? st.active : 0];
        if (o) commit(o.value);
      }
    } else if (e.key === "Escape") {
      close();
    }
  });
  input.addEventListener("blur", () => { setTimeout(close, 120); });
  list.addEventListener("mousedown", (e) => { e.preventDefault(); });
  list.addEventListener("click", (e) => {
    const el = e.target.closest(".sselect-option");
    if (el) commit(el.dataset.value);
  });

  refreshDisplay();
  searchableSelects[selectId] = { sync: refreshDisplay };
}

function syncSearchableSelects() {
  Object.keys(searchableSelects).forEach(id => searchableSelects[id].sync());
}

function initAllSearchableSelects() {
  initSearchableSelect("select-santri", "-- Pilih Nama Siswi --");
  initSearchableSelect("form-nama", "-- Pilih Nama Siswi --");
  initSearchableSelect("form-ziyadah-surat", "-- Pilih Surat --");
  initSearchableSelect("form-ziyadah-ayat-awal", "-- Pilih Ayat --");
  initSearchableSelect("form-ziyadah-ayat-akhir", "-- Pilih Ayat --");
  initSearchableSelect("form-murajaah-surat", "-- Pilih Surat --");
  initSearchableSelect("form-murajaah-ayat-awal", "-- Pilih Ayat --");
  initSearchableSelect("form-murajaah-ayat-akhir", "-- Pilih Ayat --");
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
  if (!nama) return showToast("Pilih nama siswi terlebih dahulu!", "error");
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
    document.getElementById("card-ziyadah").textContent = formatRangeDisplay(found.ziyadah) || "-";
    document.getElementById("card-murajaah").textContent = formatRangeDisplay(found.murajaah) || "-";
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

  if (usn === "ppacs2627" && pw === "laz2627") {
    closeLoginModal();
    document.getElementById("btn-login").classList.add("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    document.getElementById("btn-back-guest").classList.remove("hidden");
    document.getElementById("guest-view").classList.add("hidden");
    document.getElementById("admin-view").classList.remove("hidden");
    adminNav("laporan");
    resetFormAdmin();
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
  syncSearchableSelects();
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
  select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Siswi --</option>';

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
  syncSearchableSelects();
}

// ===================== DATA REFERENSI (SISWI, SURAT, AYAT) =====================
onSnapshot(siswiRef, (snapshot) => {
  allSiswi = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    allSiswi.push(data);
  });
  allSiswi.sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), "id"));
  populateFormSelects();
  renderSiswiTable();
}, (error) => {
  console.error("Siswi read error:", error);
});

onSnapshot(suratRef, (snapshot) => {
  allSurat = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    allSurat.push(data);
  });
  allSurat.sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), "id"));
  populateFormSelects();
  renderSuratTable();
}, (error) => {
  console.error("Surat read error:", error);
});

onSnapshot(ayatRef, (snapshot) => {
  allAyat = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    allAyat.push(data);
  });
  allAyat.sort((a, b) => Number(a.nomor) - Number(b.nomor));
  populateFormSelects();
  renderAyatTable();
}, (error) => {
  console.error("Ayat read error:", error);
});

function populateFormSelects() {
  const selNama = document.getElementById("form-nama");
  if (!selNama) return;
  const curNama = selNama.value;
  selNama.innerHTML = '<option value="" disabled selected>-- Pilih Nama Siswi --</option>';
  allSiswi.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.nama;
    opt.textContent = s.nama;
    selNama.appendChild(opt);
  });
  preserveSelectValue(selNama, curNama);

  ["form-ziyadah-surat", "form-murajaah-surat"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="" selected>-- Pilih Surat --</option>';
    allSurat.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.nama;
      opt.textContent = s.nama;
      sel.appendChild(opt);
    });
    preserveSelectValue(sel, cur);
  });

  ["form-ziyadah-ayat-awal", "form-ziyadah-ayat-akhir", "form-murajaah-ayat-awal", "form-murajaah-ayat-akhir"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="" selected>-- Pilih --</option>';
    allAyat.forEach(a => {
      const opt = document.createElement("option");
      opt.value = String(a.nomor);
      opt.textContent = String(a.nomor);
      sel.appendChild(opt);
    });
    preserveSelectValue(sel, cur);
  });
  syncSearchableSelects();
}

function preserveSelectValue(select, val) {
  if (val === undefined || val === null || val === "") return;
  const exists = Array.from(select.options).some(o => o.value === String(val));
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = String(val);
    opt.textContent = String(val);
    select.appendChild(opt);
  }
  select.value = String(val);
}

function buildRange(surat, awal, akhir) {
  if (!surat) return "";
  if (!awal) return surat;
  return surat + ": " + awal + (akhir ? " - " + akhir : "");
}

function parseRange(str) {
  if (!str) return { surat: "", awal: "", akhir: "" };
  str = String(str).trim();
  for (const s of allSurat) {
    const nm = s.nama;
    if (str === nm) return { surat: nm, awal: "", akhir: "" };
    if (str.startsWith(nm + " ") || str.startsWith(nm + ":")) {
      let rest = str.slice(nm.length).trim();
      if (rest.charAt(0) === ":") rest = rest.slice(1).trim();
      const m = rest.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (m) return { surat: nm, awal: m[1], akhir: m[2] || "" };
    }
  }
  return { surat: "", awal: "", akhir: "" };
}

function formatRangeDisplay(str) {
  if (!str) return str || "";
  const p = parseRange(str);
  if (!p.surat || (!p.awal && !p.akhir)) return str;
  return buildRange(p.surat, p.awal, p.akhir);
}

// ===================== ADMIN NAVIGATION =====================
window.adminNav = function (section) {
  ["laporan", "siswi", "surat", "ayat"].forEach(s => {
    const el = document.getElementById("admin-section-" + s);
    if (el) el.classList.toggle("hidden", s !== section);
  });
  document.querySelectorAll(".admin-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });
};

// ===================== MANAJEMEN DATA SISWI =====================
window.tambahSiswi = async function () {
  const input = document.getElementById("input-siswi");
  const nama = input.value.trim();
  if (!nama) return showToast("Nama siswi wajib diisi!", "error");
  const exists = allSiswi.some(s => String(s.nama).trim().toLowerCase() === nama.toLowerCase());
  if (exists) return showToast("Nama siswi sudah ada!", "error");
  try {
    await addDoc(siswiRef, { nama });
    input.value = "";
    showToast("Nama siswi berhasil ditambahkan!");
  } catch (error) {
    showToast("Gagal menambah: " + error.message, "error");
  }
};

function renderSiswiTable() {
  const tbody = document.getElementById("siswi-table-body");
  const empty = document.getElementById("siswi-empty");
  if (!tbody) return;
  if (allSiswi.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  tbody.innerHTML = allSiswi.map((s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td class="td-name">${s.nama}</td>
      <td class="td-center">
        <div class="td-actions">
          <button class="btn-table btn-table-delete" onclick="openDeleteModal('nama_siswi','${s.id}')" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ===================== MANAJEMEN DATA SURAT =====================
window.simpanSurat = async function () {
  const docId = document.getElementById("surat-doc-id").value;
  const input = document.getElementById("input-surat");
  const nama = input.value.trim();
  if (!nama) return showToast("Nama surat wajib diisi!", "error");
  const exists = allSurat.some(s => s.id !== docId && String(s.nama).trim().toLowerCase() === nama.toLowerCase());
  if (exists) return showToast("Nama surat sudah ada!", "error");
  try {
    if (docId) {
      await updateDoc(doc(db, "surat", docId), { nama });
      showToast("Surat berhasil diperbarui!");
    } else {
      await addDoc(suratRef, { nama });
      showToast("Surat berhasil ditambahkan!");
    }
    resetFormSurat();
  } catch (error) {
    showToast("Gagal menyimpan: " + error.message, "error");
  }
};

window.editSurat = function (id) {
  const data = allSurat.find(s => s.id === id);
  if (!data) return;
  document.getElementById("surat-doc-id").value = data.id;
  document.getElementById("input-surat").value = data.nama;
  document.getElementById("surat-form-title").innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    Edit Surat: ${data.nama}
  `;
  document.getElementById("btn-simpan-surat").textContent = "Simpan Perubahan";
  document.getElementById("btn-batal-edit-surat").classList.remove("hidden");
};

window.resetFormSurat = function () {
  document.getElementById("surat-doc-id").value = "";
  document.getElementById("input-surat").value = "";
  document.getElementById("surat-form-title").innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Tambah Surat
  `;
  document.getElementById("btn-simpan-surat").textContent = "Tambah Surat";
  document.getElementById("btn-batal-edit-surat").classList.add("hidden");
};

function renderSuratTable() {
  const tbody = document.getElementById("surat-table-body");
  const empty = document.getElementById("surat-empty");
  if (!tbody) return;
  if (allSurat.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  tbody.innerHTML = allSurat.map((s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td class="td-name">${s.nama}</td>
      <td class="td-center">
        <div class="td-actions">
          <button class="btn-table btn-table-edit" onclick="editSurat('${s.id}')" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-table btn-table-delete" onclick="openDeleteModal('surat','${s.id}')" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ===================== MANAJEMEN DATA AYAT =====================
window.tambahAyat = async function () {
  const input = document.getElementById("input-ayat");
  const val = input.value.trim();
  if (!val) return showToast("Nomor ayat wajib diisi!", "error");
  if (!/^\d+$/.test(val) || Number(val) < 1) return showToast("Nomor ayat harus angka positif!", "error");
  const nomor = Number(val);
  const exists = allAyat.some(a => Number(a.nomor) === nomor);
  if (exists) return showToast("Nomor ayat sudah ada!", "error");
  try {
    await addDoc(ayatRef, { nomor });
    input.value = "";
    showToast("Ayat berhasil ditambahkan!");
  } catch (error) {
    showToast("Gagal menambah: " + error.message, "error");
  }
};

function renderAyatTable() {
  const tbody = document.getElementById("ayat-table-body");
  const empty = document.getElementById("ayat-empty");
  if (!tbody) return;
  if (allAyat.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  tbody.innerHTML = allAyat.map((a, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td class="td-name">${a.nomor}</td>
      <td class="td-center">
        <div class="td-actions">
          <button class="btn-table btn-table-delete" onclick="openDeleteModal('ayat','${a.id}')" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
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
      <td data-label="Ziyadah">${formatRangeDisplay(item.ziyadah) || "-"}</td>
      <td data-label="Murajaah">${formatRangeDisplay(item.murajaah) || "-"}</td>
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
          <button class="btn-table btn-table-delete" onclick="openDeleteModal('laporan_ppa','${item.id}')" title="Hapus">
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
    <div class="detail-row"><span class="detail-label">Ziyadah</span><span class="detail-value">${formatRangeDisplay(data.ziyadah) || "-"}</span></div>
    <div class="detail-row"><span class="detail-label">Murajaah</span><span class="detail-value">${formatRangeDisplay(data.murajaah) || "-"}</span></div>
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
window.openDeleteModal = function (col, id) {
  pendingDeleteId = { col, id };
  const titles = {
    "laporan_ppa": "Hapus Laporan?",
    "nama_siswi": "Hapus Nama Siswi?",
    "surat": "Hapus Surat?",
    "ayat": "Hapus Ayat?"
  };
  document.getElementById("delete-modal-title").textContent = titles[col] || "Hapus Data?";
  document.getElementById("delete-modal").classList.remove("hidden");
};

window.closeDeleteModal = function () {
  pendingDeleteId = null;
  document.getElementById("delete-modal").classList.add("hidden");
};

window.confirmDelete = async function () {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, pendingDeleteId.col, pendingDeleteId.id));
    closeDeleteModal();
    showToast("Data berhasil dihapus!");
  } catch (error) {
    showToast("Gagal menghapus: " + error.message, "error");
  }
};

// ===================== CRUD =====================
window.simpanLaporan = async function () {
  const docId = document.getElementById("admin-doc-id").value;
  const nama = document.getElementById("form-nama").value.trim();
  const tanggal = document.getElementById("form-tanggal").value;
  const ziyadahSurat = document.getElementById("form-ziyadah-surat").value;
  const ziyadahAwal = document.getElementById("form-ziyadah-ayat-awal").value;
  const ziyadahAkhir = document.getElementById("form-ziyadah-ayat-akhir").value;
  const murajaahSurat = document.getElementById("form-murajaah-surat").value;
  const murajaahAwal = document.getElementById("form-murajaah-ayat-awal").value;
  const murajaahAkhir = document.getElementById("form-murajaah-ayat-akhir").value;
  const catatan = document.getElementById("form-catatan").value.trim();
  const keterangan = document.getElementById("form-keterangan").value;

  if (!nama) return showToast("Nama siswi wajib diisi!", "error");
  if (!tanggal) return showToast("Tanggal wajib diisi!", "error");

  const ziyadah = buildRange(ziyadahSurat, ziyadahAwal, ziyadahAkhir);
  const murajaah = buildRange(murajaahSurat, murajaahAwal, murajaahAkhir);

  const payload = {
    nama, tanggal,
    ziyadah, murajaah,
    ziyadah_surat: ziyadahSurat,
    ziyadah_ayat_awal: ziyadahAwal,
    ziyadah_ayat_akhir: ziyadahAkhir,
    murajaah_surat: murajaahSurat,
    murajaah_ayat_awal: murajaahAwal,
    murajaah_ayat_akhir: murajaahAkhir,
    catatan, keterangan
  };

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
  preserveSelectValue(document.getElementById("form-nama"), data.nama);
  document.getElementById("form-tanggal").value = data.tanggal;

  let z = { surat: "", awal: "", akhir: "" };
  if (data.ziyadah_surat || data.ziyadah_ayat_awal || data.ziyadah_ayat_akhir) {
    z = {
      surat: data.ziyadah_surat || "",
      awal: data.ziyadah_ayat_awal || "",
      akhir: data.ziyadah_ayat_akhir || ""
    };
  } else {
    z = parseRange(data.ziyadah);
  }
  preserveSelectValue(document.getElementById("form-ziyadah-surat"), z.surat);
  preserveSelectValue(document.getElementById("form-ziyadah-ayat-awal"), z.awal);
  preserveSelectValue(document.getElementById("form-ziyadah-ayat-akhir"), z.akhir);

  let m = { surat: "", awal: "", akhir: "" };
  if (data.murajaah_surat || data.murajaah_ayat_awal || data.murajaah_ayat_akhir) {
    m = {
      surat: data.murajaah_surat || "",
      awal: data.murajaah_ayat_awal || "",
      akhir: data.murajaah_ayat_akhir || ""
    };
  } else {
    m = parseRange(data.murajaah);
  }
  preserveSelectValue(document.getElementById("form-murajaah-surat"), m.surat);
  preserveSelectValue(document.getElementById("form-murajaah-ayat-awal"), m.awal);
  preserveSelectValue(document.getElementById("form-murajaah-ayat-akhir"), m.akhir);

  document.getElementById("form-catatan").value = data.catatan || "";
  preserveSelectValue(document.getElementById("form-keterangan"), data.keterangan || "");

  document.getElementById("form-title").innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    Edit Laporan: ${data.nama}
  `;
  document.getElementById("btn-batal-edit").classList.remove("hidden");
  syncSearchableSelects();

  // Scroll to form
  document.getElementById("admin-view").scrollIntoView({ behavior: "smooth", block: "start" });
};

window.resetFormAdmin = function () {
  document.getElementById("admin-doc-id").value = "";
  document.getElementById("form-nama").value = "";
  document.getElementById("form-tanggal").value = "";
  document.getElementById("form-ziyadah-surat").value = "";
  document.getElementById("form-ziyadah-ayat-awal").value = "";
  document.getElementById("form-ziyadah-ayat-akhir").value = "";
  document.getElementById("form-murajaah-surat").value = "";
  document.getElementById("form-murajaah-ayat-awal").value = "";
  document.getElementById("form-murajaah-ayat-akhir").value = "";
  document.getElementById("form-catatan").value = "";
  document.getElementById("form-keterangan").value = "";
  document.getElementById("form-title").innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Tambah Laporan Baru
  `;
  document.getElementById("btn-batal-edit").classList.add("hidden");
  syncSearchableSelects();
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

// ===================== INIT SEARCHABLE SELECTS =====================
initAllSearchableSelects();
