import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc
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
onAuthStateChanged(auth, (user) => { currentUser = user; });

let selectedYear = null;
let currentFolderProjects = [];
let currentDocForComments = null;

// LE TUE 16 MATERIE COMPLETE
const subjects = [
  { name: "Italiano", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500" },
  { name: "Storia", img: "https://images.unsplash.com/photo-1461301214746-1e109215d6d3?w=500" },
  { name: "Matematica", img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500" },
  { name: "Inglese", img: "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?w=500" },
  { name: "Informatica", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500" },
  { name: "Fisica", img: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=500" },
  { name: "Scienze", img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500" },
  { name: "Arte", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500" },
  { name: "Filosofia", img: "https://images.unsplash.com/photo-1505664159854-2328114f17f4?w=500" },
  { name: "Educazione Fisica", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500" },
  { name: "Latino", img: "https://images.unsplash.com/photo-1555627237-7ea4c346c827?w=500" },
  { name: "Greco", img: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500" },
  { name: "Chimica", img: "https://images.unsplash.com/photo-1532187875605-2fe358a3d46a?w=500" },
  { name: "Diritto", img: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500" },
  { name: "Economia", img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500" },
  { name: "Geografia", img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500" }
];

function showYears() {
  gallery.innerHTML = "";
  navInfo.innerText = "Archivio > Scegli Anno";
  backBtn.style.display = "none";
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
  selectedYear = y;
  gallery.innerHTML = "";
  navInfo.innerText = `${y}° Anno > Scegli Materia`;
  backBtn.style.display = "block";
  backBtn.onclick = showYears;

  subjects.forEach(sub => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <img src="${sub.img}" alt="${sub.name}" />
      <div class="card-content"><div class="card-title">${sub.name}</div></div>
    `;
    d.onclick = () => loadProjects(sub.name);
    gallery.appendChild(d);
  });
}

async function loadProjects(cat) {
  gallery.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Caricamento appunti...</p>";
  navInfo.innerText = `${selectedYear}° Anno > ${cat}`;
  backBtn.onclick = () => selectYear(selectedYear);

  try {
    const q = query(collection(db, "projects"), where("year", "==", selectedYear), where("category", "==", cat));
    const snap = await getDocs(q);
    currentFolderProjects = [];
    snap.forEach((doc) => currentFolderProjects.push({ id: doc.id, ...doc.data() }));
    renderCards(currentFolderProjects);
  } catch (e) { console.error(e); }
}

function renderCards(projectsArray) {
  gallery.innerHTML = "";
  if (projectsArray.length === 0) {
    gallery.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color: var(--text-muted)'>Nessun file trovato.</p>";
    return;
  }

  projectsArray.forEach((p) => {
    const d = document.createElement("div");
    d.className = "card";
    
    const hasLiked = currentUser && p.likes && p.likes.includes(currentUser.uid) ? "active-like" : "";
    const hasFavorited = currentUser && p.favorites && p.favorites.includes(currentUser.uid) ? "active-fav" : "";
    const likeCount = p.likes ? p.likes.length : 0;
    const commentCount = p.comments ? p.comments.length : 0;

    // Questa riga risolve il problema delle anteprime invisibili
    const imgSrc = p.thumbUrl || p.fileUrl || 'https://via.placeholder.com/300x200?text=Documento';

    d.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.visualizza('${p.fileUrl}')" />
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
          <button class="social-btn ${hasFavorited}" onclick="toggleFavorite('${p.id}', this)">
            ⭐
          </button>
        </div>
      </div>
    `;
    gallery.appendChild(d);
  });
}

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
  backBtn.style.display = "block";
  backBtn.onclick = showYears;
  navInfo.innerText = "Risultati ricerca...";
  renderCards(results);
});

window.visualizza = (fileURL) => {
  if (!fileURL) return alert("File non disponibile.");
  window.open(fileURL, "_blank");
};

// Funzioni Social
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
  if (btnElement.classList.contains("active-fav")) {
    await updateDoc(docRef, { favorites: arrayRemove(currentUser.uid) });
    btnElement.classList.remove("active-fav");
  } else {
    await updateDoc(docRef, { favorites: arrayUnion(currentUser.uid) });
    btnElement.classList.add("active-fav");
  }
};

// Logica Commenti
const commentsModal = document.getElementById("comments-modal");

window.openComments = async (docId) => {
  currentDocForComments = docId;
  commentsModal.style.display = "flex";
  await loadComments(docId);
};

document.getElementById("close-comments").onclick = () => {
  commentsModal.style.display = "none";
  currentDocForComments = null;
};

async function loadComments(docId) {
  const list = document.getElementById("comments-list");
  list.innerHTML = "<p style='text-align:center;'>Caricamento...</p>";
  
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
    // Scrolla automaticamente in basso per leggere l'ultimo messaggio
    list.scrollTop = list.scrollHeight;
  }
}

document.getElementById("send-comment").onclick = async () => {
  if (!currentUser) return alert("Devi fare il login per commentare!");
  const input = document.getElementById("new-comment");
  const text = input.value.trim();
  if (!text || !currentDocForComments) return;

  const newComment = {
    authorName: currentUser.displayName || "Studente",
    authorUid: currentUser.uid,
    text: text,
    timestamp: new Date().toISOString()
  };

  const docRef = doc(db, "projects", currentDocForComments);
  await updateDoc(docRef, { comments: arrayUnion(newComment) });
  
  input.value = "";
  await loadComments(currentDocForComments); 
};

// Avvio
showYears();
