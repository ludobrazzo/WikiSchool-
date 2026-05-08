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

// Riferimenti UI (ID presi dal tuo HTML)
const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");
const warningMsg = document.getElementById("login-warning");
const formContainer = document.getElementById("upload-form-container");

// --- GESTIONE STATO AUTENTICAZIONE ---
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
    
    // Avvia sistema notifiche
    setupNotifications(user);
  } else {
    currentUser = null;
    if (authBtn) {
      authBtn.innerText = "Login";
      authBtn.style.background = ""; // Torna allo stile CSS originale
    }
    if (profileBtn) profileBtn.style.display = "none";
    if (warningMsg) warningMsg.style.display = "block";
    if (formContainer) formContainer.style.display = "none";
  }
});

// --- FUNZIONI DI LOGIN E REGISTRAZIONE (ID ESATTI) ---

// 1. LOGIN EMAIL/PASSWORD
const doLoginBtn = document.getElementById("do-login");
if (doLoginBtn) {
  doLoginBtn.onclick = async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    if (!email || !pass) return showToast("Inserisci email e password", "error");
    
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      modal.style.display = "none";
      showToast("Accesso eseguito!", "success");
    } catch (err) {
      showToast("Errore: " + err.message, "error");
    }
  };
}

// 2. REGISTRAZIONE
const doRegisterBtn = document.getElementById("do-register");
if (doRegisterBtn) {
  doRegisterBtn.onclick = async (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-password").value;
    
    if (!name || !email || !pass) return showToast("Compila tutti i campi", "error");
    
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      modal.style.display = "none";
      showToast("Account creato!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}

// 3. GOOGLE LOGIN
const googleBtn = document.getElementById("google-login");
if (googleBtn) {
  googleBtn.onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
      modal.style.display = "none";
      showToast("Accesso Google eseguito", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}

// --- SWITCH TRA VISTE LOGIN/REGISTRAZIONE ---
const goToReg = document.getElementById("go-to-reg");
const goToLogin = document.getElementById("go-to-login");
const viewLogin = document.getElementById("auth-view-login");
const viewReg = document.getElementById("auth-view-register");

if (goToReg) goToReg.onclick = () => { viewLogin.style.display = "none"; viewReg.style.display = "block"; };
if (goToLogin) goToLogin.onclick = () => { viewLogin.style.display = "block"; viewReg.style.display = "none"; };

// Apertura Modale Login
if (authBtn) authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
const closeAuth = document.getElementById("close-auth");
if (closeAuth) closeAuth.onclick = () => modal.style.display = "none";

// --- LOGICA NOTIFICHE ---
function setupNotifications(user) {
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
    
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (badge) {
      badge.innerText = unreadCount;
      badge.style.display = unreadCount > 0 ? "flex" : "none";
    }
    if (list) {
      if (notifications.length === 0) {
        list.innerHTML = '<div style="padding:15px; text-align:center; color:#94a3b8; font-size:0.8rem;">Nessuna notifica</div>';
      } else {
        list.innerHTML = notifications.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.projectId}')" 
               style="padding:12px; border-bottom:1px solid #f1f5f9; cursor:pointer; background:${n.read ? 'transparent' : 'rgba(99,102,241,0.05)'}">
            <div style="font-size:0.85rem; font-weight:${n.read ? 'normal' : '600'}; color:#1e293b;">${n.text}</div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">${new Date(n.timestamp).toLocaleString()}</div>
          </div>
        `).join('');
      }
    }
  });
}

window.handleNotifClick = async (notifId, projectId) => {
  if (!currentUser) return;
  try {
    const docRef = doc(db, 'artifacts', 'wikischool-vero', 'users', currentUser.uid, 'notifications', notifId);
    await updateDoc(docRef, { read: true });
    window.location.href = `archivio.html?project=${projectId}`;
  } catch (e) { console.error(e); }
};

const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
if (notifBtn && notifPanel) {
  notifBtn.onclick = (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle('show');
    // Se non usi classi CSS per 'show', usa questa riga:
    // notifPanel.style.display = notifPanel.style.display === "block" ? "none" : "block";
  };
  document.addEventListener('click', () => { if(notifPanel) notifPanel.classList.remove('show'); });
  notifPanel.onclick = (e) => e.stopPropagation();
}

// --- LOGOUT E PROFILO ---
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.onclick = () => { signOut(auth).then(() => location.reload()); };
}

if (profileBtn && profileModal) {
  profileBtn.onclick = () => {
    profileModal.style.display = "flex";
    document.getElementById("profile-email").innerText = currentUser.email;
    loadMyUploads();
  };
}
const closeProfile = document.getElementById("close-profile");
if (closeProfile) closeProfile.onclick = () => (profileModal.style.display = "none");

// --- PUBBLICAZIONE APPUNTI ---
const publishBtn = document.getElementById("publish-btn");
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");

if (fileInput && fileNameDisplay) {
  fileInput.onchange = () => {
    if (fileInput.files.length > 0) fileNameDisplay.innerText = "✅ File: " + fileInput.files[0].name;
  };
}

if (publishBtn) {
  publishBtn.onclick = async (e) => {
    e.preventDefault();
    if (!currentUser) return showToast("Effettua il login", "error");
    
    const title = document.getElementById("project-title").value;
    const year = document.getElementById("project-year").value;
    const subject = document.getElementById("project-subject").value;
    const linkUrl = document.getElementById("doc-link").value;
    const file = fileInput.files[0];

    if (!title || !year || !subject) return showToast("Compila i campi obbligatori", "info");

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

      showToast("Appunto pubblicato!", "success");
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast(err.message, "error");
      publishBtn.disabled = false;
      publishBtn.innerText = "Pubblica Appunto";
    }
  };
}

// --- FUNZIONI TAB PROFILO ---
async function loadMyUploads() {
  const container = document.getElementById("profile-content");
  if(!container) return;
  container.innerHTML = "Caricamento...";
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = snap.empty ? "<p>Nessun caricamento.</p>" : "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${data.thumbUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
      <div style="padding:10px;">
        <div style="font-weight:bold; margin-bottom:5px;">${data.title}</div>
        <button onclick="deletePrj('${docSnap.id}')" style="color:red; background:none; border:none; cursor:pointer; font-size:0.8rem;">Elimina</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.deletePrj = async (id) => {
  if(confirm("Eliminare l'appunto?")) {
    await deleteDoc(doc(db, "projects", id));
    loadMyUploads();
  }
};

// --- FUNZIONE TOAST ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
