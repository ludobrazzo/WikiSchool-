import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, updateDoc
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
const provider = new GoogleAuthProvider();

const CLOUD_NAME = "dkzbg6vyo";
const UPLOAD_PRESET = "unsigned_preset_123";

let currentUser = null;

const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");

const warningMsg = document.getElementById("login-warning"); 
const formContainer = document.getElementById("upload-form-container"); 

// --- LOGICA NOTIFICHE (AGGIUNTA) ---
function setupNotifications(user) {
  // Uso il percorso corretto per le regole di sicurezza
  const notifRef = collection(db, 'artifacts', 'wikischool-vero', 'users', user.uid, 'notifications');
  
  onSnapshot(notifRef, (snapshot) => {
    const notifications = [];
    let unreadCount = 0;
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      notifications.push({ id: docSnap.id, ...data });
      if (!data.read) unreadCount++;
    });

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    updateNotifUI(notifications, unreadCount);
  }, (err) => console.error("Errore notifiche:", err));
}

function updateNotifUI(notifs, count) {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  if(!badge || !list) return;

  if (count > 0) {
    badge.innerText = count;
    badge.classList.add('active');
    badge.style.display = "block";
  } else {
    badge.classList.remove('active');
    badge.style.display = "none";
  }

  if (notifs.length === 0) {
    list.innerHTML = '<div style="padding:15px; text-align:center; color:#94a3b8; font-size:0.8rem;">Nessuna notifica</div>';
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.projectId}')" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; background:${n.read ? '#fff' : '#f0f9ff'}">
      <div style="font-size:0.85rem; font-weight:${n.read ? 'normal' : 'bold'}">${n.text}</div>
      <div style="font-size:0.7rem; color:#999;">${new Date(n.timestamp).toLocaleString()}</div>
    </div>
  `).join('');
}

window.handleNotifClick = async (notifId, projectId) => {
  if (!currentUser) return;
  const docRef = doc(db, 'artifacts', 'wikischool-vero', 'users', currentUser.uid, 'notifications', notifId);
  await updateDoc(docRef, { read: true });
  window.location.href = `archivio.html?project=${projectId}`;
};

// --- GESTIONE ACCESSO (COPIATA DAL TUO ORIGINALE) ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (authBtn) {
      authBtn.innerText = "Ciao, " + (user.displayName || "Studente");
      authBtn.style.background = "#10b981"; 
    }
    if (profileBtn) profileBtn.style.display = "block";
    
    if (warningMsg) warningMsg.style.display = "none";
    if (formContainer) formContainer.style.display = "block";

    // Attivo le notifiche qui
    setupNotifications(user);

  } else {
    currentUser = null;
    if (authBtn) {
      authBtn.innerText = "Login";
      authBtn.style.background = "var(--primary)";
    }
    if (profileBtn) profileBtn.style.display = "none";
    
    if (warningMsg) warningMsg.style.display = "block";
    if (formContainer) formContainer.style.display = "none";
  }
});

// Apertura/Chiusura pannello notifiche
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
if (notifBtn && notifPanel) {
  notifBtn.onclick = (e) => {
    e.stopPropagation();
    notifPanel.style.display = notifPanel.style.display === "block" ? "none" : "block";
  };
  document.addEventListener('click', () => { if(notifPanel) notifPanel.style.display = "none"; });
  notifPanel.onclick = (e) => e.stopPropagation();
}

// --- FUNZIONI ORIGINALI RIPRISTINATE ---

const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");
if (fileInput && fileNameDisplay) {
  fileInput.addEventListener("change", function() {
    if (this.files && this.files.length > 0) {
      fileNameDisplay.innerText = "✅ File pronto: " + this.files[0].name;
    } else {
      fileNameDisplay.innerText = "";
    }
  });
}

if (authBtn && modal) {
  authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
}

const closeAuth = document.getElementById("close-auth");
if (closeAuth && modal) closeAuth.onclick = () => (modal.style.display = "none");

if (profileBtn && profileModal) {
  profileBtn.onclick = () => { 
    profileModal.style.display = "flex"; 
    const pe = document.getElementById("profile-email");
    if(pe) pe.innerText = currentUser.email; 
    loadMyUploads(); 
  };
}
const closeProfile = document.getElementById("close-profile");
if (closeProfile && profileModal) closeProfile.onclick = () => (profileModal.style.display = "none");

const tabUploads = document.getElementById("tab-uploads");
const tabFavorites = document.getElementById("tab-favorites");
if (tabUploads && tabFavorites) {
  tabUploads.onclick = () => {
    tabUploads.className = "btn-primary";
    tabFavorites.className = "btn-secondary";
    loadMyUploads();
  };
  tabFavorites.onclick = () => {
    tabFavorites.className = "btn-primary";
    tabUploads.className = "btn-secondary";
    loadMyFavorites();
  };
}

async function loadMyUploads() {
  const container = document.getElementById("profile-content");
  if(!container) return; 
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento...</p>";
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Nessun file caricato.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${data.thumbUrl || data.fileUrl}" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content">
        <div class="card-title">${data.title}</div>
        <button class="delete-btn" data-id="${docSnap.id}">Elimina</button>
      </div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async (e) => {
      if(confirm("Eliminare?")) {
        await deleteDoc(doc(db, "projects", e.target.getAttribute("data-id")));
        loadMyUploads();
      }
    };
  });
}

async function loadMyFavorites() {
  const container = document.getElementById("profile-content");
  if(!container) return;
  const q = query(collection(db, "projects"), where("favorites", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Nessun preferito.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${data.thumbUrl || data.fileUrl}" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content"><div class="card-title">${data.title}</div></div>
    `;
    container.appendChild(div);
  });
}

const logoutBtn = document.getElementById("logout-btn");
if(logoutBtn) {
  logoutBtn.onclick = () => { signOut(auth).then(() => { location.reload(); }); };
}

const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const tEl = document.getElementById("project-title");
    const yEl = document.getElementById("project-year");
    const sEl = document.getElementById("project-subject");
    const linkInput = document.getElementById("doc-link");

    const title = tEl.value;
    const year = yEl.value;
    const subject = sEl.value;
    const file = fileInput.files[0];
    const linkUrl = linkInput ? linkInput.value : "";

    if (!title || !year || !subject) return alert("Compila tutto");

    publishBtn.innerText = "Caricamento...";
    publishBtn.disabled = true;

    try {
      let finalUrl = linkUrl;
      let finalThumb = "https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?w=500";

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
        const data = await res.json();
        finalUrl = data.secure_url;
        finalThumb = data.format === "pdf" ? finalUrl.replace(".pdf", ".jpg") : finalUrl;
      }

      await addDoc(collection(db, "projects"), {
        title, year, category: subject,
        fileUrl: finalUrl, thumbUrl: finalThumb,
        authorName: currentUser.displayName || "Studente",
        authorUid: currentUser.uid,
        likes: [], favorites: [], comments: [],
        createdAt: new Date().toISOString()
      });
      location.reload();
    } catch (err) { alert(err.message); publishBtn.disabled = false; }
  });
}

// --- GESTIONE LOGIN MANUALE (ID DO-LOGIN / DO-REGISTER) ---
const doLogin = document.getElementById("do-login");
if(doLogin) {
  doLogin.onclick = (e) => {
    e.preventDefault();
    const em = document.getElementById("login-email").value;
    const pw = document.getElementById("login-password").value;
    signInWithEmailAndPassword(auth, em, pw).then(() => (modal.style.display = "none"));
  };
}

const doRegister = document.getElementById("do-register");
if(doRegister) {
  doRegister.onclick = (e) => {
    e.preventDefault();
    const nm = document.getElementById("reg-name").value;
    const em = document.getElementById("reg-email").value;
    const pw = document.getElementById("reg-password").value;
    createUserWithEmailAndPassword(auth, em, pw).then((res) => {
      updateProfile(res.user, { displayName: nm });
      modal.style.display = "none";
    });
  };
}

const googleLogin = document.getElementById("google-login");
if(googleLogin) {
  googleLogin.onclick = () => signInWithPopup(auth, provider).then(() => (modal.style.display = "none"));
}

const goToReg = document.getElementById("go-to-reg");
const goToLogin = document.getElementById("go-to-login");
const viewLogin = document.getElementById("auth-view-login");
const viewReg = document.getElementById("auth-view-register");
if(goToReg) goToReg.onclick = () => { viewLogin.style.display = "none"; viewReg.style.display = "block"; };
if(goToLogin) goToLogin.onclick = () => { viewLogin.style.display = "block"; viewReg.style.display = "none"; };

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
