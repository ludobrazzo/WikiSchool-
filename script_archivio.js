import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDl9CCciK9P1od4ITzpskYsP5Sa5N7ukOE",
  authDomain: "wikischool-vero.firebaseapp.com",
  projectId: "wikischool-vero",
  storageBucket: "wikischool-vero.firebasestorage.app",
  messagingSenderId: "373765015160",
  appId: "1:373765015160:web:a709c39d0a3529cc04cf8d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const gallery = document.getElementById("gallery");
const backBtn = document.getElementById("back-btn");
const navInfo = document.getElementById("nav-info");
const searchBar = document.getElementById("search-bar");

let selectedYear = null;
let currentFolderProjects = [];

const subjects = [
  {
    name: "Italiano",
    img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500",
  },
  {
    name: "Latino",
    img: "https://images.unsplash.com/photo-1543165796-5426273eaab3?w=500",
  },
  {
    name: "Storia",
    img: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=800",
  },
  {
    name: "Filosofia",
    img: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=800",
  },
  {
    name: "Educazione Civica",
    img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500",
  },
  {
    name: "Matematica",
    img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500",
  },
  {
    name: "Fisica",
    img: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=500",
  },
  {
    name: "Scienze Naturali",
    img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500",
  },
  {
    name: "Informatica",
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500",
  },
  {
    name: "Disegno e Storia dell'Arte",
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500",
  },
  {
    name: "Inglese",
    img: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=500",
  },
  {
    name: "Francese",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500",
  },
  {
    name: "Spagnolo",
    img: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=500",
  },
  {
    name: "Scienze Umane",
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500",
  },
  {
    name: "Diritto ed Economia",
    img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500",
  },
  {
    name: "Scienze Motorie",
    img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500",
  },
];

function showYears() {
  selectedYear = null;
  currentFolderProjects = [];
  gallery.innerHTML = "";
  if (backBtn) backBtn.style.display = "none";
  navInfo.innerText = "Archivio Materie";
  for (let i = 1; i <= 5; i++) {
    gallery.insertAdjacentHTML(
      "beforeend",
      `<div class="folder-card" onclick="selectYear('${i}')">
        <div class="folder-img" style="background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:800;">${i}°</div>
        <div class="folder-label">${i}° Anno</div>
      </div>`
    );
  }
}

window.selectYear = (year) => {
  selectedYear = year;
  gallery.innerHTML = "";
  if (backBtn) backBtn.style.display = "block";
  navInfo.innerText = `Materie del ${year}° Anno`;
  subjects.forEach((s) => {
    gallery.insertAdjacentHTML(
      "beforeend",
      `<div class="folder-card" onclick="openFolder('${s.name}')">
        <img src="${s.img}" class="folder-img">
        <div class="folder-label">${s.name}</div>
      </div>`
    );
  });
};

function renderCards(projects) {
  gallery.innerHTML = "";
  if (projects.length === 0) {
    gallery.innerHTML =
      "<h3 style='grid-column:1/-1; text-align:center;'>Nessun appunto trovato.</h3>";
    return;
  }
  projects.forEach((d) => {
    const mailLink = `mailto:${d.authorEmail}?subject=Info: ${d.title}`;

    const fileURL = d.fileLink || "";
    let thumb = d.thumbnail || fileURL;

    // Per sicurezza (file vecchi): se l'anteprima termina ancora in .pdf, forziamo in .jpg
    if (thumb && thumb.toLowerCase().endsWith(".pdf")) {
      thumb = thumb.replace(/\.pdf$/i, ".jpg");
    }

    // Un'immagine generica di backup per i link Drive esterni o se il thumbnail fallisce
    const fallbackImage =
      "https://images.unsplash.com/photo-1568227452042-49339e0340f1?w=500";

    gallery.insertAdjacentHTML(
      "beforeend",
      `<div class="card-pro">
        <div class="card-media">
           <img src="${
             thumb || fallbackImage
           }" onerror="this.src='${fallbackImage}'">
        </div>
        <div class="card-body">
          <span class="badge">${d.category}</span>
          <h3 style="margin:10px 0 5px 0; font-size:1.2rem;">${d.title}</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;">✍️ Autore: ${
            d.authorName
          }</p>
          <div style="display:flex; gap:10px;">
            <button onclick="visualizza('${fileURL}')" class="btn-action" style="flex:3; border:none; cursor:pointer;">Apri</button>
            <a href="${mailLink}" style="flex:1; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px; text-decoration:none; font-size:1.2rem;">✉️</a>
          </div>
        </div>
      </div>`
    );
  });
}

window.openFolder = async (cat) => {
  gallery.innerHTML = "<h3>Caricamento...</h3>";
  navInfo.innerText = `${selectedYear}° Anno > ${cat}`;
  try {
    const q = query(
      collection(db, "projects"),
      where("year", "==", selectedYear),
      where("category", "==", cat)
    );
    const snap = await getDocs(q);
    currentFolderProjects = [];
    snap.forEach((doc) => currentFolderProjects.push(doc.data()));
    renderCards(currentFolderProjects);
  } catch (e) {
    console.error(e);
  }
};

searchBar.addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase();
  if (term.length === 0) {
    if (!selectedYear) showYears();
    else if (navInfo.innerText.includes(">"))
      renderCards(currentFolderProjects);
    else selectYear(selectedYear);
    return;
  }
  const snap = await getDocs(collection(db, "projects"));
  const results = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.title && data.title.toLowerCase().includes(term))
      results.push(data);
  });
  if (backBtn) backBtn.style.display = "block";
  navInfo.innerText = "Risultati della ricerca...";
  renderCards(results);
});

window.visualizza = (fileURL) => {
  if (!fileURL || fileURL === "undefined" || fileURL.trim() === "") {
    alert("Errore: Il file non è disponibile oppure il link è vuoto.");
    return;
  }

  let secureURL = fileURL;
  if (secureURL.startsWith("http://")) {
    secureURL = secureURL.replace("http://", "https://");
  }

  window.open(secureURL, "_blank");
};

if (backBtn) backBtn.onclick = showYears;
showYears();
