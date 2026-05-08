import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc
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
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = "wikischool-vero";
const gallery = document.getElementById("gallery");
const backBtn = document.getElementById("back-btn");
const navInfo = document.getElementById("nav-info");
const searchBar = document.getElementById("search-bar");

let currentUser = null;
let selectedYear = null;
let currentFolderProjects = [];
let currentDocForComments = null;

// --- GESTIONE LOGIN ---
onAuthStateChanged(auth, (user) => { 
  currentUser = user; 
  const commentInputRow = document.querySelector(".comment-input-row");
  let loginWarning = document.getElementById("comment-login-warning");

  if (user) {
    if (commentInputRow) commentInputRow.style.display = "flex";
    if (loginWarning) loginWarning.style.display = "none";
  } else {
    if (commentInputRow) {
      commentInputRow.style.display = "none";
      if (!loginWarning) {
        loginWarning = document.createElement("p");
        loginWarning.id = "comment-login-warning";
        loginWarning.style.cssText = "text-align:center; color:#e63946; font-weight:bold; font-size:0.9rem; margin-top:10px;";
        loginWarning.innerText = "Accedi per poter commentare.";
        commentInputRow.parentNode.insertBefore(loginWarning, commentInputRow);
      } else {
        loginWarning.style.display = "block";
      }
    }
  }
});

// LISTA MATERIE (Invariata)
const subjects = [
  { name: "Italiano", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500" },
  { name: "Latino", img: "https://images.unsplash.com/photo-1543165796-5426273eaab3?w=500" },
  { name: "Storia", img: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=800" },
  { name: "Filosofia", img: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=800" },
  { name: "Educazione Civica", img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500" },
  { name: "Matematica", img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500" },
  { name: "Fisica", img: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=500" },
  { name: "Scienze Naturali", img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500" },
  { name: "Informatica", img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500" },
  { name: "Art", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500" },
  { name: "Inglese", img: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=500" },
  { name: "Scienze Umane", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500" },
  { name: "Scienze Motorie", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500" },
];

function showYears() {
  if(!gallery) return; 
  gallery.innerHTML = "";
  navInfo.innerText = "Archivio > Scegli Anno";
  if(backBtn) backBtn.style.display = "none";
  selectedYear = null;
  for (let i = 1; i <= 5; i++) {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<div style="background:var(--primary); height:160px; display:flex; align-items:center; justify-content:center; color:white; font-size:3rem; font-weight:800">${i}°</div><div class="card-content"><div class="card-title">${i}° Anno</div></div>`;
    d.onclick = () => selectYear(i.toString());
    gallery.appendChild(d);
  }
}

function selectYear(y) {
  selectedYear = y;
  gallery.innerHTML = "";
  navInfo.innerText = `${y}° Anno > Scegli Materia`;
  if(backBtn) { backBtn.style.display = "block"; backBtn.onclick = showYears; }
  subjects.forEach(sub => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<img src="${sub.img}" style="height:160px; object-fit:cover;"><div class="card-content"><div class="card-title">${sub.name}</div></div>`;
    d.onclick = () => loadProjects(sub.name);
    gallery.appendChild(d);
  });
}

async function loadProjects(cat) {
  gallery.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Caricamento...</p>";
  navInfo.innerText = `${selectedYear}° Anno > ${cat}`;
  if(backBtn) backBtn.onclick = () => selectYear(selectedYear);
  try {
    const q = query(collection(db, "projects"), where("year", "==", selectedYear), where("category", "==", cat));
    const snap = await getDocs(q);
    currentFolderProjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCards(currentFolderProjects);
  } catch (e) { console.error(e); }
}

function renderCards(projectsArray) {
  gallery.innerHTML = projectsArray.length === 0 ? "<p style='grid-column:1/-1; text-align:center;'>Nessun file trovato.</p>" : "";
  projectsArray.forEach((p) => {
    const d = document.createElement("div");
    d.className = "card";
    const hasLiked = currentUser && p.likes?.includes(currentUser.uid) ? "active-like" : "";
    const isFav = currentUser && p.favorites?.includes(currentUser.uid) ? "active-fav" : "";
    d.innerHTML = `
      <img src="${p.thumbUrl}" onclick="window.visualizza('${p.fileUrl}')" style="height:150px; object-fit:cover; cursor:pointer;">
      <div class="card-content">
        <div class="card-title" onclick="window.visualizza('${p.fileUrl}')">${p.title}</div>
        <div class="social-bar">
          <button class="social-btn ${hasLiked}" onclick="toggleLike('${p.id}', this)">♥ <span>${p.likes?.length || 0}</span></button>
          <button class="social-btn" onclick="openComments('${p.id}')">💬 <span>${p.comments?.length || 0}</span></button>
          <button class="social-btn ${isFav}" onclick="toggleFavorite('${p.id}', this)">${isFav ? '★' : '☆'}</button>
        </div>
      </div>`;
    gallery.appendChild(d);
  });
}

window.visualizza = (url) => url ? window.open(url, "_blank") : alert("Link non valido");

// LIKE E FAVORITE (Ottimizzati)
window.toggleLike = async (id, btn) => {
  if (!currentUser) return alert("Accedi prima!");
  const ref = doc(db, "projects", id);
  const span = btn.querySelector("span");
  let count = parseInt(span.innerText);
  if (btn.classList.contains("active-like")) {
    await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    btn.classList.remove("active-like"); span.innerText = count - 1;
  } else {
    await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    btn.classList.add("active-like"); span.innerText = count + 1;
  }
};

window.toggleFavorite = async (id, btn) => {
  if (!currentUser) return alert("Accedi prima!");
  const ref = doc(db, "projects", id);
  if (btn.classList.contains("active-fav")) {
    await updateDoc(ref, { favorites: arrayRemove(currentUser.uid) });
    btn.classList.remove("active-fav"); btn.innerText = "☆";
  } else {
    await updateDoc(ref, { favorites: arrayUnion(currentUser.uid) });
    btn.classList.add("active-fav"); btn.innerText = "★";
  }
};

// --- GESTIONE COMMENTI CON NOTIFICA ---
const modal = document.getElementById("comments-modal");

window.openComments = async (id) => {
  currentDocForComments = id;
  modal.style.display = "flex";
  loadComments(id);
};

if(document.getElementById("close-comments")) document.getElementById("close-comments").onclick = () => modal.style.display = "none";

async function loadComments(id) {
  const list = document.getElementById("comments-list");
  list.innerHTML = "Caricamento...";
  const snap = await getDoc(doc(db, "projects", id));
  const comments = snap.data().comments || [];
  list.innerHTML = comments.length ? "" : "Nessun commento.";
  comments.forEach(c => {
    list.innerHTML += `<div class="comment-box"><div class="comment-author">${c.authorName}</div><div class="comment-text">${c.text}</div></div>`;
  });
}

const sendBtn = document.getElementById("send-comment");
if(sendBtn) {
  sendBtn.onclick = async () => {
    const input = document.getElementById("new-comment");
    const text = input.value.trim();
    if (!text || !currentDocForComments) return;

    try {
      const prjRef = doc(db, "projects", currentDocForComments);
      const prjSnap = await getDoc(prjRef);
      const prjData = prjSnap.data();

      // 1. Salva commento
      await updateDoc(prjRef, {
        comments: arrayUnion({
          authorName: currentUser.displayName || "Studente",
          authorUid: currentUser.uid,
          text: text,
          timestamp: new Date().toISOString()
        })
      });

      // 2. Crea Notifica per l'autore (CAMPO authorUid CORRETTO)
      if (prjData.authorUid && prjData.authorUid !== currentUser.uid) {
        const notifRef = collection(db, "artifacts", APP_ID, "users", prjData.authorUid, "notifications");
        await addDoc(notifRef, {
          text: `${currentUser.displayName || "Un utente"} ha commentato il tuo appunto: "${prjData.title}"`,
          projectId: currentDocForComments,
          read: false,
          timestamp: new Date().toISOString()
        });
      }

      input.value = "";
      loadComments(currentDocForComments);
    } catch (e) { console.error(e); }
  };
}

showYears();
