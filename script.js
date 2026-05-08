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

// --- GESTIONE ACCESSO E NOTIFICHE ---
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

    // ✅ Attiva le notifiche in tempo reale per l'utente loggato
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
    
    // Rimuovi eventuali badge se l'utente esce
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.remove('active');
  }
});

// --- FUNZIONI NOTIFICHE ---

function setupNotifications(user) {
  // Percorso corretto come da regole Artifacts
  const notifRef = collection(db, 'artifacts', 'wikischool-vero', 'users', user.uid, 'notifications');
  
  onSnapshot(notifRef, (snapshot) => {
    const notifications = [];
    let unreadCount = 0;
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      notifications.push({ id: docSnap.id, ...data });
      if (!data.read) unreadCount++;
    });

    // Ordina dalla più recente
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    updateNotifUI(notifications, unreadCount);
  }, (err) => console.error("Errore snapshot notifiche:", err));
}

function updateNotifUI(notifs, count) {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  if(!badge || !list) return;

  if (count > 0) {
    badge.innerText = count;
    badge.classList.add('active');
  } else {
    badge.classList.remove('active');
  }

  if (notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">Nessuna nuova notifica</div>';
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.projectId}')">
      <div class="notif-text">${n.text}</div>
      <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">
        ${new Date(n.timestamp).toLocaleString()}
      </div>
    </div>
  `).join('');
}

// Click sulla notifica: segna come letta e reindirizza
window.handleNotifClick = async (notifId, projectId) => {
  if (!currentUser) return;
  try {
    const docRef = doc(db, 'artifacts', 'wikischool-vero', 'users', currentUser.uid, 'notifications', notifId);
    await updateDoc(docRef, { read: true });
    // Va alla pagina archivio passando l'id del progetto per evidenziarlo (se gestito)
    window.location.href = `archivio.html?project=${projectId}`;
  } catch (e) {
    console.error("Errore lettura notifica:", e);
  }
};

// Toggle del pannello notifiche
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
if (notifBtn && notifPanel) {
  notifBtn.onclick = (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle('show');
  };
  // Chiude il pannello cliccando fuori
  document.addEventListener('click', () => notifPanel.classList.remove('show'));
}

// --- RESTO DELLA LOGICA ESISTENTE ---

// [Gestione File Input, Apertura Modali, Caricamento Profilo e Pubblicazione...]
// Assicurati che il resto delle tue funzioni (loadMyUploads, loadMyFavorites, ecc.)
// rimangano sotto questo blocco come nel tuo file originale.

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

// Chiusura Modali
const closeModal = document.getElementById("close-auth") || document.getElementById("close-modal");
if (closeModal && modal) closeModal.onclick = () => (modal.style.display = "none");

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

// [Le tue funzioni di caricamento e logout...]

const logoutBtn = document.getElementById("logout-btn");
if(logoutBtn) {
  logoutBtn.onclick = () => { 
    signOut(auth).then(() => { 
        if(profileModal) profileModal.style.display = "none"; 
        showToast("Sessione terminata", "info");
    }); 
  };
}

// Funzione Toast
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = '💡';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => { toast.remove(); }, 300);
  }, 3000);
}
