// Helper: Konversi URL YouTube biasa/shortlink ke URL Embed
function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  
  // Bersihkan spasi di awal/akhir link
  url = String(url).trim();
  let videoId = '';

  try {
    // Format: https://youtu.be/VIDEO_ID
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } 
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    else if (url.includes('youtube.com/watch')) {
      const queryString = url.split('?')[1] || '';
      const urlParams = new URLSearchParams(queryString);
      videoId = urlParams.get('v');
    } 
    // Format Shorts: https://www.youtube.com/shorts/VIDEO_ID
    else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('youtube.com/shorts/')[1].split('?')[0];
    } 
    // Format Embed: https://www.youtube.com/embed/VIDEO_ID
    else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1].split('?')[0];
    }
  } catch (e) {
    console.error("Gagal mengekstrak Video ID:", e);
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

// Global Event Listener
document.addEventListener("DOMContentLoaded", function() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const page = window.location.pathname.split("/").pop();

  // Proteksi Halaman
  if (!currentUser && page !== "index.html" && page !== "") {
    window.location.href = "index.html";
    return;
  }

  if (currentUser) {
    const nameElem = document.getElementById("userDisplayName");
    const roleElem = document.getElementById("userRole");
    if (nameElem) nameElem.innerText = currentUser.nama;
    if (roleElem) roleElem.innerText = currentUser.role;

    // Menu Khusus Dashboard
    const menuKhusus = document.getElementById("menuKhususRole");
    if (menuKhusus) {
      if (currentUser.role.includes("Guru")) {
        menuKhusus.innerHTML = `
          <a href="rekap.html" class="custom-nav-card">
            <div class="card-icon-box"><i class="fas fa-chart-line"></i></div>
            <div>
              <h6 class="fw-bold text-dark mb-1">Monitoring Live</h6>
              <small class="text-muted d-block">Pantau ringkasan pencapaian siswa.</small>
            </div>
          </a>`;
      } else {
        menuKhusus.innerHTML = `
          <a href="ujian.html" class="custom-nav-card">
            <div class="card-icon-box"><i class="fas fa-pen-to-square"></i></div>
            <div>
              <h6 class="fw-bold text-dark mb-1">Ujian Online</h6>
              <small class="text-muted d-block">Kerjakan evaluasi pemahaman PKn.</small>
            </div>
          </a>`;
      }
    }

    // Tampilkan Form Guru di Forum Diskusi
    const guruForm = document.getElementById("guruFormDiskusi");
    if (guruForm && currentUser.role.includes("Guru")) {
      guruForm.style.display = "block";
    }
  }

  // Inisialisasi Otomatis Berdasarkan Halaman
  if (page === "materi.html") loadMateri();
  if (page === "ujian.html") loadSoal();
  if (page === "game.html") loadGame();
  if (page === "diskusi.html") loadDiskusi();
  if (page === "rekap.html") loadRekap();
});

// 1. LOGIK LOGIN & LOGOUT
function handleLogin(e) {
  e.preventDefault();
  const nama = document.getElementById("loginNama").value;
  const pass = document.getElementById("loginPassword").value;

  fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "login", username: nama, password: pass })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } else {
      alert(data.message || "Login gagal, periksa nama & password!");
    }
  })
  .catch(err => {
    let role = nama.toLowerCase().includes("guru") ? "Guru (Fasilitator)" : "Siswa";
    localStorage.setItem("currentUser", JSON.stringify({ nama: nama, role: role }));
    window.location.href = "dashboard.html";
  });
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// 2. MODUL MATERI (PERBAIKAN FITUR MATERI & YOUTUBE)
function loadMateri() {
  const listContainer = document.getElementById("listMateriMenu");
  if (!listContainer) return;

  listContainer.innerHTML = `<div class="p-3 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat materi...</div>`;

  fetch(`${CONFIG.API_URL}?action=getMateri`)
    .then(res => res.json())
    .then(data => {
      console.log("Data Materi dari API:", data);

      if (Array.isArray(data) && data.length > 0) {
        window.materiData = data;
        listContainer.innerHTML = data.map((item, index) => {
          const judulMateri = item.judul || item.Judul || `Materi ${index + 1}`;
          return `
            <button class="list-group-item list-group-item-action ${index === 0 ? 'active' : ''}" onclick="selectMateri(${index})">
              <i class="fas fa-book me-2"></i>${judulMateri}
            </button>
          `;
        }).join('');
        
        selectMateri(0);
      } else {
        listContainer.innerHTML = `<div class="p-3 text-danger">Belum ada data materi di Spreadsheet.</div>`;
      }
    })
    .catch(err => {
      console.error("Error loadMateri:", err);
      listContainer.innerHTML = `<div class="p-3 text-danger">Gagal memuat materi. Cek URL API di config.js.</div>`;
    });
}

function selectMateri(index) {
  const contentArea = document.getElementById("contentMateriArea");
  const item = window.materiData[index];
  if (!item || !contentArea) return;

  document.querySelectorAll("#listMateriMenu button").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });

  // Kompatibilitas pembacaan kolom dari Google Apps Script (huruf kecil)
  const judul = item.judul || item.Judul || 'Tanpa Judul';
  const deskripsi = item.deskripsi || item.Deskripsi || 'Tidak ada deskripsi.';
  const rawVideoUrl = item.videourl || item.videoUrl || item.video || item.Video || '';

  const embedUrl = getYoutubeEmbedUrl(rawVideoUrl);

  contentArea.innerHTML = `
    <h3 class="fw-bold text-success mb-3">${judul}</h3>
    
    ${embedUrl ? `
      <div class="ratio ratio-16x9 mb-4 rounded overflow-hidden shadow-sm">
        <iframe src="${embedUrl}" title="${judul}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
    ` : (rawVideoUrl ? `<div class="alert alert-warning mb-3"><i class="fas fa-exclamation-triangle me-2"></i>Format link video tidak valid: <code>${rawVideoUrl}</code></div>` : '')}

    <div class="card p-3 border-0 bg-light shadow-sm">
      <h6 class="fw-bold text-dark mb-2"><i class="fas fa-file-alt me-2 text-success"></i>Deskripsi Pelajaran:</h6>
      <p class="mb-0 text-secondary" style="white-space: pre-line; line-height: 1.6;">${deskripsi}</p>
    </div>
  `;
}

// 3. UJIAN ONLINE
function loadSoal() {
  const container = document.getElementById("soalContainer");
  if (!container) return;

  container.innerHTML = `<div class="text-muted p-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat soal...</div>`;

  fetch(`${CONFIG.API_URL}?action=getSoal`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        window.soalData = data;
        container.innerHTML = data.map((soal, i) => `
          <div class="card p-3 mb-3 border-0 bg-light text-start">
            <p class="fw-bold mb-2">${i + 1}. ${soal.pertanyaan}</p>
            ${['A', 'B', 'C', 'D'].map(opt => `
              <div class="form-check mb-1">
                <input class="form-check-input" type="radio" name="soal_${i}" id="soal_${i}_${opt}" value="${opt}">
                <label class="form-check-label" for="soal_${i}_${opt}">${opt}.${soal['opsi' + opt]}</label>
              </div>
            `).join('')}
          </div>
        `).join('');
      } else {
        container.innerHTML = `<div class="text-danger p-3">Belum ada soal pada sheet 'Soal'.</div>`;
      }
    });
}

function submitUjian() {
  const user = JSON.parse(localStorage.getItem("currentUser")) || { nama: "Siswa", role: "Siswa" };
  if (!window.soalData || window.soalData.length === 0) return;

  let correctCount = 0;
  const totalSoal = window.soalData.length;

  window.soalData.forEach((soal, i) => {
    const selected = document.querySelector(`input[name="soal_${i}"]:checked`);
    if (selected) {
      const jawabanSiswa = String(selected.value).trim().toUpperCase();
      const kunciJawaban = String(soal.kunciJawaban || "").trim().toUpperCase();

      if (jawabanSiswa === kunciJawaban) {
        correctCount++;
      }
    }
  });

  const finalScore = Math.round((correctCount / totalSoal) * 100);

  fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "submitUjian",
      nama: user.nama,
      role: user.role,
      skor: finalScore,
      kategori: "Ujian Online"
    })
  })
  .then(() => {
    alert(`Ujian selesai!\n\nJawaban Benar: ${correctCount} dari ${totalSoal}\nSkor kamu: ${finalScore}`);
    window.location.href = "dashboard.html";
  })
  .catch(() => alert(`Ujian selesai!\nSkor kamu: ${finalScore}`));
}

// 4. MODUL FORUM DISKUSI BERDASARKAN TOPIK
window.allDiskusiData = [];
window.currentSelectedTopicId = null;

function loadDiskusi() {
  const menuContainer = document.getElementById("listTemaMenu");
  if (!menuContainer) return;

  menuContainer.innerHTML = `<div class="p-2 text-muted small"><i class="fas fa-spinner fa-spin me-2"></i>Memuat topik...</div>`;

  fetch(`${CONFIG.API_URL}?action=getDiskusi`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        window.allDiskusiData = data;

        // Filter: Hanya ambil pesan yang merupakan TOPIK UTAMA
        const topikList = [];
        const mapTopik = {};

        data.forEach(item => {
          const topicId = item.id || item.judul;
          const hasValidTitle = item.judul && item.judul.trim() !== '' && item.judul !== '-';
          
          if (hasValidTitle && !mapTopik[topicId]) {
            mapTopik[topicId] = true;
            topikList.push({
              id: topicId,
              judul: item.judul,
              pengirim: item.pengirim
            });
          }
        });

        if (topikList.length > 0) {
          menuContainer.innerHTML = topikList.map((t) => `
            <button class="list-group-item list-group-item-action text-start p-2 text-truncate" 
                    id="btn-topic-${t.id}"
                    onclick="selectTopic('${t.id}', '${t.judul.replace(/'/g, "\\'")}')">
              <i class="fas fa-comments me-2"></i><strong>${t.judul}</strong>
            </button>
          `).join('');

          let targetTopic = topikList.find(t => String(t.id) === String(window.currentSelectedTopicId));
          if (!targetTopic) {
            targetTopic = topikList[0];
          }

          selectTopic(targetTopic.id, targetTopic.judul);
        } else {
          menuContainer.innerHTML = `<div class="p-2 text-muted small">Belum ada topik diskusi diterbitkan.</div>`;
          document.getElementById("diskusiContainer").innerHTML = `<div class="text-muted p-3">Belum ada topik diskusi.</div>`;
        }
      } else {
        menuContainer.innerHTML = `<div class="p-2 text-muted small">Belum ada topik diskusi. Guru dapat menerbitkan tema baru.</div>`;
        document.getElementById("diskusiContainer").innerHTML = `<div class="text-muted p-3">Belum ada diskusi.</div>`;
      }
    })
    .catch(err => {
      console.error("Error loadDiskusi:", err);
      menuContainer.innerHTML = `<div class="p-2 text-danger small">Gagal memuat topik diskusi.</div>`;
    });
}

function selectTopic(topicId, topicTitle) {
  window.currentSelectedTopicId = topicId;

  document.querySelectorAll("#listTemaMenu button").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(`btn-topic-${topicId}`);
  if (activeBtn) activeBtn.classList.add("active");

  const titleElem = document.getElementById("activeTopicTitle");
  const subElem = document.getElementById("activeTopicSub");
  if (titleElem) titleElem.innerText = topicTitle;
  if (subElem) subElem.innerText = `ID Topik: ${topicId}`;

  const inputMsg = document.getElementById("inputBalasanPesan");
  const btnSend = document.getElementById("btnSendReply");
  if (inputMsg) inputMsg.disabled = false;
  if (btnSend) btnSend.disabled = false;

  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};

  const filteredMessages = window.allDiskusiData.filter(item => {
    const itemTopicId = item.id || item.judul;
    return String(itemTopicId) === String(topicId);
  });

  const container = document.getElementById("diskusiContainer");
  if (!container) return;

  if (filteredMessages.length > 0) {
    container.innerHTML = filteredMessages.map(d => {
      const isMe = currentUser.nama && d.pengirim && currentUser.nama.trim().toLowerCase() === d.pengirim.trim().toLowerCase();
      const alignClass = isMe ? "align-self-end text-end" : "align-self-start text-start";
      const bgClass = isMe ? "bg-success text-white" : "bg-light text-dark border";
      const roleBadge = d.role ? `<span class="badge ${isMe ? 'bg-light text-dark' : 'bg-success text-white'} ms-1" style="font-size:0.65rem;">${d.role}</span>` : '';
      const timeStr = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

      return `
        <div class="d-flex flex-column ${alignClass}" style="max-width: 80%;">
          <small class="text-muted mb-1 px-1" style="font-size: 0.75rem;">
            <strong>${d.pengirim}</strong> ${roleBadge}
          </small>
          <div class="p-3 rounded-3 shadow-sm ${bgClass}" style="word-break: break-word;">
            ${d.judul && d.judul !== '-' ? `<div class="fw-bold border-bottom pb-1 mb-1" style="font-size: 0.9rem;">📌 ${d.judul}</div>` : ''}
            <div style="white-space: pre-line;">${d.pesan}</div>
            <div class="text-end mt-1" style="font-size: 0.65rem; opacity: 0.8;">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } else {
    container.innerHTML = `<div class="text-muted p-3">Belum ada tanggapan pada topik ini. Mulai berikan komentar!</div>`;
  }
}

function handleCreateTema(e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem("currentUser")) || { nama: "Guru", role: "Guru" };
  const id = document.getElementById("newTemaId").value.trim();
  const judul = document.getElementById("newTemaJudul").value.trim();
  const pesan = document.getElementById("newTemaPesan").value.trim();

  window.currentSelectedTopicId = id;

  fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "sendDiskusi",
      id: id,
      judul: judul,
      pesan: pesan,
      pengirim: user.nama,
      role: user.role
    })
  }).then(() => {
    alert("Tema baru berhasil diterbitkan!");
    document.getElementById("newTemaId").value = "";
    document.getElementById("newTemaJudul").value = "";
    document.getElementById("newTemaPesan").value = "";
    loadDiskusi();
  });
}

function handleSendReply(e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem("currentUser")) || { nama: "Siswa", role: "Siswa" };
  const inputElem = document.getElementById("inputBalasanPesan");
  const pesan = inputElem.value.trim();

  if (!pesan || !window.currentSelectedTopicId) return;

  fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "sendDiskusi",
      id: window.currentSelectedTopicId,
      judul: "-",
      pesan: pesan,
      pengirim: user.nama,
      role: user.role
    })
  }).then(() => {
    inputElem.value = "";
    loadDiskusi();
  });
}

// 5. MONITORING REKAP (UJIAN & GAME TERPISAH)
function loadRekap() {
  const tbodyUjian = document.getElementById("rekapUjianBody");
  const tbodyGame = document.getElementById("rekapGameBody");
  if (!tbodyUjian && !tbodyGame) return;

  fetch(`${CONFIG.API_URL}?action=getHasil`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const dataUjian = data.filter(item => {
          const kat = String(item.kategori || "").toLowerCase();
          return kat.includes("ujian") || kat === "" || !kat.includes("game");
        });

        const dataGame = data.filter(item => {
          const kat = String(item.kategori || "").toLowerCase();
          return kat.includes("game") || kat.includes("mini");
        });

        if (tbodyUjian) {
          tbodyUjian.innerHTML = dataUjian.length > 0 ? dataUjian.map(row => `
            <tr>
              <td class="fw-bold">${row.nama || '-'}</td>
              <td>${row.role || '-'}</td>
              <td><span class="badge bg-success">${row.kategori || 'Ujian Online'}</span></td>
              <td class="fw-bold text-success">${row.skor ?? '-'}</td>
              <td><small class="text-muted">${row.timestamp || '-'}</small></td>
            </tr>
          `).join('') : `<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada hasil Ujian.</td></tr>`;
        }

        if (tbodyGame) {
          tbodyGame.innerHTML = dataGame.length > 0 ? dataGame.map(row => `
            <tr>
              <td class="fw-bold">${row.nama || '-'}</td>
              <td>${row.role || '-'}</td>
              <td><span class="badge bg-info text-dark">${row.kategori || 'Mini-Game'}</span></td>
              <td class="fw-bold text-success">${row.skor ?? '-'}</td>
              <td><small class="text-muted">${row.timestamp || '-'}</small></td>
            </tr>
          `).join('') : `<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada hasil Game.</td></tr>`;
        }

      } else {
        if (tbodyUjian) tbodyUjian.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada data rekap.</td></tr>`;
        if (tbodyGame) tbodyGame.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada data rekap.</td></tr>`;
      }
    })
    .catch(err => {
      console.error("Error loadRekap:", err);
      if (tbodyUjian) tbodyUjian.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Gagal memuat rekap data.</td></tr>`;
      if (tbodyGame) tbodyGame.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Gagal memuat rekap data.</td></tr>`;
    });
}

// 6. GAME DRAG & DROP
function loadGame() {
  const container = document.getElementById("gameAreaContainer");
  if (!container) return;

  container.innerHTML = `<div class="p-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Memuat game dari spreadsheet...</div>`;

  fetch(`${CONFIG.API_URL}?action=getGame`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        window.gameDataList = data;
        renderDragDropGame(data);
      } else {
        container.innerHTML = `<div class="alert alert-warning">Belum ada data game di Spreadsheet.</div>`;
      }
    })
    .catch(err => {
      console.error("Error loadGame:", err);
      container.innerHTML = `<div class="alert alert-danger">Gagal memuat game. Cek koneksi API atau Apps Script.</div>`;
    });
}

function renderDragDropGame(data) {
  const container = document.getElementById("gameAreaContainer");
  if (!container) return;

  const shuffledKegunaan = [...data].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div class="row g-4 text-start">
      <div class="col-md-6">
        <h6 class="fw-bold mb-3 text-success"><i class="fas fa-hand-pointer me-1"></i> Tarik (Drag) Istilah</h6>
        <div id="sourceContainer" class="d-flex flex-column gap-2">
          ${data.map(item => `
            <div class="card p-3 bg-white shadow-sm border-success draggable-item" 
                 draggable="true" 
                 ondragstart="drag(event)" 
                 id="drag_${item.id}" 
                 data-id="${item.id}"
                 style="cursor: grab;">
              <i class="fas fa-grip-vertical me-2 text-muted"></i><strong>${item.istilah}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="col-md-6">
        <h6 class="fw-bold mb-3 text-success"><i class="fas fa-bullseye me-1"></i> Tempel (Drop) pada Kegunaan</h6>
        <div class="d-flex flex-column gap-2">
          ${shuffledKegunaan.map(item => `
            <div class="card p-3 bg-light border-dashed drop-zone" 
                 ondragover="allowDrop(event)" 
                 ondrop="drop(event)" 
                 data-target-id="${item.id}">
              <small class="text-muted d-block mb-1">Kegunaan / Pasangan:</small>
              <h6 class="fw-bold mb-2 text-dark">${item.kegunaan}</h6>
              <div class="drop-target-area p-2 rounded border bg-white text-center text-muted small" style="min-height: 48px;">
                Tarik istilah ke sini
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function allowDrop(e) {
  e.preventDefault();
}

function drag(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
}

function drop(e) {
  e.preventDefault();
  const draggedId = e.dataTransfer.getData("text/plain");
  const draggedElement = document.getElementById(draggedId);
  const dropZone = e.target.closest('.drop-zone');

  if (dropZone && draggedElement) {
    const targetArea = dropZone.querySelector('.drop-target-area');
    targetArea.innerHTML = '';
    targetArea.appendChild(draggedElement);
  }
}

function checkGameResult() {
  const dropZones = document.querySelectorAll('.drop-zone');
  if (dropZones.length === 0) return;

  let correctCount = 0;
  let total = dropZones.length;

  dropZones.forEach(zone => {
    const targetId = zone.getAttribute('data-target-id');
    const droppedItem = zone.querySelector('.draggable-item');
    
    if (droppedItem && droppedItem.getAttribute('data-id') === targetId) {
      correctCount++;
      zone.classList.add('border-success', 'bg-light-success');
      zone.classList.remove('border-danger');
    } else {
      zone.classList.add('border-danger');
    }
  });

  const finalScore = Math.round((correctCount / total) * 100);
  const user = JSON.parse(localStorage.getItem("currentUser")) || { nama: "Siswa", role: "Siswa" };

  fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "submitGame",
      nama: user.nama,
      role: user.role,
      skor: finalScore,
      kategori: "Mini-Game PKn"
    })
  })
  .then(() => {
    alert(`Game Selesai!\n\nJawaban Benar: ${correctCount} dari ${total}\nSkor Kamu: ${finalScore}\n\nHasil berhasil disimpan ke rekap.`);
  })
  .catch(() => {
    alert(`Game Selesai!\nSkor Kamu: ${finalScore}`);
  });
}