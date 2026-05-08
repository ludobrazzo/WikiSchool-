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

const gallery = document.getElementById("gallery");
const backBtn = document.getElementById("back-btn");
const navInfo = document.getElementById("nav-info");
const searchBar = document.getElementById("search-bar");

let currentUser = null;
let selectedYear = null;
let currentFolderProjects = [];
let currentDocForComments = null;

// GESTIONE LOGIN E BLOCCO COMMENTI PER UTENTI NON LOGGATI
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
        loginWarning.style.textAlign = "center";
        loginWarning.style.color = "#e63946"; 
        loginWarning.style.fontWeight = "bold";
        loginWarning.style.fontSize = "0.9rem";
        loginWarning.style.marginTop = "10px";
        loginWarning.innerText = "Devi effettuare il login per poter commentare.";
        commentInputRow.parentNode.insertBefore(loginWarning, commentInputRow);
      } else {
        loginWarning.style.display = "block";
      }
    }
  }
});

// LISTA MATERIE
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
  { name: "Disegno e Storia dell'Arte", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500" },
  { name: "Inglese", img: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=500" },
  { name: "Francese", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500" },
  { name: "Spagnolo", img: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=500" },
  { name: "Scienze Umane", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500" },
  { name: "Diritto ed Economia", img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500" },
  { name: "Scienze Motorie", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500" },
];

function showYears() {
  if(!gallery || !navInfo) return; 
  gallery.innerHTML = "";
  navInfo.innerText = "Archivio > Scegli Anno";
  if(backBtn) backBtn.style.display = "none";
  selectedYear = null;
  
  for (let i = 1; i <= 5; i++) {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <div style="background: var(--primary); height: 180px; display:flex; align-items:center; justify-content:center; color:white; font-size: 3rem; font-weight:800">${i}°</div>
      <div class="card-content"><div class="card-title">${i}° Anno</div></div>
    `;
    d.onclick = () => selectYear(i.toString());
    gallery.appendChild(d);
  }
}

function selectYear(y) {
  if(!gallery || !navInfo) return;
  selectedYear = y;
  gallery.innerHTML = "";
  navInfo.innerText = `${y}° Anno > Scegli Materia`;
  if(backBtn) {
    backBtn.style.display = "block";
    backBtn.onclick = showYears;
  }

  subjects.forEach(sub => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <img src="${sub.img}" alt="${sub.name}" style="cursor:pointer; object-fit: cover;" />
      <div class="card-content"><div class="card-title">${sub.name}</div></div>
    `;
    d.onclick = () => loadProjects(sub.name);
    gallery.appendChild(d);
  });
}

async function loadProjects(cat) {
  if(!gallery || !navInfo) return;
  gallery.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Caricamento appunti in corso...</p>";
  navInfo.innerText = `${selectedYear}° Anno > ${cat}`;
  if(backBtn) backBtn.onclick = () => selectYear(selectedYear);

  try {
    const q = query(collection(db, "projects"), where("year", "==", selectedYear), where("category", "==", cat));
    const snap = await getDocs(q);
    currentFolderProjects = [];
    snap.forEach((doc) => currentFolderProjects.push({ id: doc.id, ...doc.data() }));
    renderCards(currentFolderProjects);
  } catch (e) { console.error(e); }
}

function renderCards(projectsArray) {
  if(!gallery) return;
  gallery.innerHTML = "";
  if (projectsArray.length === 0) {
    gallery.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color: var(--text-muted)'>Nessun file trovato per questa categoria.</p>";
    return;
  }

  projectsArray.forEach((p) => {
    const d = document.createElement("div");
    d.className = "card";
    
    const hasLiked = currentUser && p.likes && p.likes.includes(currentUser.uid) ? "active-like" : "";
    const likeCount = p.likes ? p.likes.length : 0;
    
    const isFavorited = currentUser && p.favorites && p.favorites.includes(currentUser.uid);
    const hasFavoritedClass = isFavorited ? "active-fav" : "";
    const starIcon = isFavorited ? "★" : "☆";

    const commentCount = p.comments ? p.comments.length : 0;
    const imgSrc = p.thumbUrl || p.fileUrl || 'https://via.placeholder.com/300x200?text=Anteprima';

    d.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.visualizza('${p.fileUrl}')" style="object-fit: cover;" />
      <div class="card-content">
        <div class="card-title" onclick="window.visualizza('${p.fileUrl}')">${p.title}</div>
        <div class="card-meta">di ${p.authorName || 'Anonimo'}</div>
        
        <div class="social-bar">
          <button class="social-btn ${hasLiked}" onclick="toggleLike('${p.id}', this)">
            ♥ <span class="like-count">${likeCount}</span>
          </button>
          <button class="social-btn" onclick="openComments('${p.id}')">
            💬 <span class="comment-count">${commentCount}</span>
          </button>
          <button class="social-btn ${hasFavoritedClass}" onclick="toggleFavorite('${p.id}', this)">
            <span class="fav-icon" style="font-size: 1.2rem;">${starIcon}</span>
          </button>
        </div>
      </div>
    `;
    gallery.appendChild(d);
  });
}

if(searchBar) {
  searchBar.addEventListener("input", async (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length === 0) {
      if (!selectedYear) showYears();
      else if (navInfo.innerText.includes("> Scegli Materia")) selectYear(selectedYear);
      else renderCards(currentFolderProjects);
      return;
    }
    const snap = await getDocs(collection(db, "projects"));
    const results = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.title && data.title.toLowerCase().includes(term)) results.push({ id: doc.id, ...data });
    });
    if(backBtn) {
      backBtn.style.display = "block";
      backBtn.onclick = showYears;
    }
    if(navInfo) navInfo.innerText = "Risultati ricerca...";
    renderCards(results);
  });
}

window.visualizza = (fileURL) => {
  if (!fileURL) return alert("File non disponibile.");
  window.open(fileURL, "_blank");
};

window.toggleLike = async (docId, btnElement) => {
  if (!currentUser) return alert("Devi fare il login per mettere Mi Piace!");
  const docRef = doc(db, "projects", docId);
  const countSpan = btnElement.querySelector(".like-count");
  let currentCount = parseInt(countSpan.innerText);

  if (btnElement.classList.contains("active-like")) {
    await updateDoc(docRef, { likes: arrayRemove(currentUser.uid) });
    btnElement.classList.remove("active-like");
    countSpan.innerText = currentCount - 1;
  } else {
    await updateDoc(docRef, { likes: arrayUnion(currentUser.uid) });
    btnElement.classList.add("active-like");
    countSpan.innerText = currentCount + 1;
  }
};

window.toggleFavorite = async (docId, btnElement) => {
  if (!currentUser) return alert("Devi fare il login per salvare nei preferiti!");
  const docRef = doc(db, "projects", docId);
  const iconSpan = btnElement.querySelector(".fav-icon");

  if (btnElement.classList.contains("active-fav")) {
    await updateDoc(docRef, { favorites: arrayRemove(currentUser.uid) });
    btnElement.classList.remove("active-fav");
    if (iconSpan) iconSpan.innerText = "☆";
  } else {
    await updateDoc(docRef, { favorites: arrayUnion(currentUser.uid) });
    btnElement.classList.add("active-fav");
    if (iconSpan) iconSpan.innerText = "★";
  }
};

const commentsModal = document.getElementById("comments-modal");

window.openComments = async (docId) => {
  if(!commentsModal) return alert("Per usare i commenti devi avere la finestra modale nell'HTML.");
  currentDocForComments = docId;
  commentsModal.style.display = "flex";
  await loadComments(docId);
};

const closeComments = document.getElementById("close-comments");
if(closeComments) {
  closeComments.onclick = () => {
    if(commentsModal) commentsModal.style.display = "none";
    currentDocForComments = null;
  };
}

async function loadComments(docId) {
  const list = document.getElementById("comments-list");
  if(!list) return;
  list.innerHTML = "<p style='text-align:center;'>Caricamento commenti in corso...</p>";
  
  const docSnap = await getDoc(doc(db, "projects", docId));
  if (docSnap.exists()) {
    const comments = docSnap.data().comments || [];
    list.innerHTML = "";
    if (comments.length === 0) {
      list.innerHTML = "<p style='color:var(--text-muted); text-align:center; margin-top:20px;'>Nessun commento. Sii il primo!</p>";
      return;
    }
    comments.forEach(c => {
      const div = document.createElement("div");
      div.className = "comment-box";
      div.innerHTML = `<div class="comment-author">${c.authorName}</div><div class="comment-text">${c.text}</div>`;
      list.appendChild(div);
    });
    list.scrollTop = list.scrollHeight;
  }
}

// --- FUNZIONE INVIO COMMENTO CON NOTIFICA ---
const sendCommentBtn = document.getElementById("send-comment");
if(sendCommentBtn) {
  sendCommentBtn.onclick = async () => {
    if (!currentUser) return alert("Devi effettuare il login per poter commentare!");
    const input = document.getElementById("new-comment");
    const text = input.value.trim();
    if (!text || !currentDocForComments) return;

    const newComment = {
      authorName: currentUser.displayName || "Studente",
      authorUid: currentUser.uid,
      text: text,
      timestamp: new Date().toISOString()
    };

    try {
      const docRef = doc(db, "projects", currentDocForComments);
      const docSnap = await getDoc(docRef);
      const projectData = docSnap.data();

      // 1. Aggiungi il commento all'appunto
      await updateDoc(docRef, { comments: arrayUnion(newComment) });
      
      // 2. Crea la notifica per il proprietario (se non sono io stesso)
      if (projectData && projectData.ownerUid && projectData.ownerUid !== currentUser.uid) {
        const notifRef = collection(db, "artifacts", "wikischool-vero", "users", projectData.ownerUid, "notifications");
        await addDoc(notifRef, {
          text: `${currentUser.displayName || "Un utente"} ha commentato il tuo appunto: "${projectData.title}"`,
          projectId: currentDocForComments,
          read: false,
          timestamp: new Date().toISOString()
        });
      }

      input.value = "";
      await loadComments(currentDocForComments); 
    } catch (e) {
      console.error("Errore:", e);
    }
  };
}

showYears();
