import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, updateDoc, arrayUnion, getDoc
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
const APP_ID = "wikischool-vero";

let currentUser = null;

// Riferimenti UI
const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");
const warningMsg = document.getElementById("login-warning");
const formContainer = document.getElementById("upload-form-container");

// --- STATO AUTENTICAZIONE ---
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
    setupNotifications(user);
  } else {
    currentUser = null;
    if (authBtn) {
      authBtn.innerText = "Login";
      authBtn.style.background = "";
    }
    if (profileBtn) profileBtn.style.display = "none";
    if (warningMsg) warningMsg.style.display = "block";
    if (formContainer) formContainer.style.display = "none";
  }
});

// --- SISTEMA NOTIFICHE (REAL-TIME) ---
function setupNotifications(user) {
  const notifRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'notifications');
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
          <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window.handleNotifClick('${n.id}', '${n.projectId}')" 
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
    const docRef = doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'notifications', notifId);
    await updateDoc(docRef, { read: true });
    window.location.href = `archivio.html?project=${projectId}`;
  } catch (e) { console.error(e); }
};

// --- LOGICA COMMENTI E INVIO NOTIFICA (DA USARE IN ARCHIVIO) ---
window.sendComment = async (projectId, text) => {
  if (!currentUser || !text.trim()) return;
  try {
    const prjRef = doc(db, "projects", projectId);
    const prjSnap = await getDoc(prjRef);
    const prjData = prjSnap.data();

    // 1. Salva commento
    await updateDoc(prjRef, {
      comments: arrayUnion({
        userId: currentUser.uid,
        userName: currentUser.displayName || "Studente",
        text: text,
        timestamp: new Date().toISOString()
      })
    });

    // 2. Notifica l'autore (se non sono io)
    if (prjData.authorUid !== currentUser.uid) {
      const notifRef = collection(db, 'artifacts', APP_ID, 'users', prjData.authorUid, 'notifications');
      await addDoc(notifRef, {
        text: `${currentUser.displayName || "Qualcuno"} ha commentato il tuo appunto: ${prjData.title}`,
        projectId: projectId,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- LOGIN / REGISTRAZIONE ---
const doLoginBtn = document.getElementById("do-login");
if (doLoginBtn) {
  doLoginBtn.onclick = async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      modal.style.display = "none";
      showToast("Benvenuto!", "success");
    } catch (err) { showToast(err.message, "error"); }
  };
}

const doRegisterBtn = document.getElementById("do-register");
if (doRegisterBtn) {
  doRegisterBtn.onclick = async (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-password").value;
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      modal.style.display = "none";
      showToast("Account creato!", "success");
    } catch (err) { showToast(err.message, "error"); }
  };
}

if (document.getElementById("google-login")) {
  document.getElementById("google-login").onclick = () => signInWithPopup(auth, provider).then(() => modal.style.display = "none");
}

const goToReg = document.getElementById("go-to-reg");
const goToLogin = document.getElementById("go-to-login");
if (goToReg) goToReg.onclick = () => { document.getElementById("auth-view-login").style.display = "none"; document.getElementById("auth-view-register").style.display = "block"; };
if (goToLogin) goToLogin.onclick = () => { document.getElementById("auth-view-login").style.display = "block"; document.getElementById("auth-view-register").style.display = "none"; };

if (authBtn) authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
if (document.getElementById("close-auth")) document.getElementById("close-auth").onclick = () => modal.style.display = "none";

// Notifiche Panel Toggle
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');
if (notifBtn && notifPanel) {
  notifBtn.onclick = (e) => { e.stopPropagation(); notifPanel.classList.toggle('show'); };
  document.addEventListener('click', () => notifPanel.classList.remove('show'));
}

// --- PUBBLICAZIONE ---
const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.onclick = async (e) => {
    e.preventDefault();
    const title = document.getElementById("project-title").value;
    const year = document.getElementById("project-year").value;
    const subject = document.getElementById("project-subject").value;
    const linkUrl = document.getElementById("doc-link").value;
    const file = document.getElementById("file-input").files[0];

    if (!title || !year || !subject) return showToast("Mancano dati!", "info");
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
        title, year, category: subject, fileUrl: finalUrl, thumbUrl: finalThumb,
        authorName: currentUser.displayName || "Studente", authorUid: currentUser.uid,
        likes: [], favorites: [], comments: [], createdAt: new Date().toISOString()
      });
      location.reload();
    } catch (err) { alert(err.message); publishBtn.disabled = false; }
  };
}

// --- PROFILO ---
if (profileBtn) profileBtn.onclick = () => { profileModal.style.display = "flex"; loadMyUploads(); };
if (document.getElementById("close-profile")) document.getElementById("close-profile").onclick = () => profileModal.style.display = "none";
if (document.getElementById("logout-btn")) document.getElementById("logout-btn").onclick = () => signOut(auth).then(() => location.reload());

async function loadMyUploads() {
  const container = document.getElementById("profile-content");
  if(!container) return;
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    container.innerHTML += `
      <div class="card">
        <img src="${data.thumbUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">
        <p><strong>${data.title}</strong></p>
        <button onclick="deletePrj('${docSnap.id}')" style="color:red; border:none; background:none; cursor:pointer;">Elimina</button>
      </div>`;
  });
}

window.deletePrj = async (id) => { if(confirm("Eliminare?")) { await deleteDoc(doc(db, "projects", id)); loadMyUploads(); } };

function showToast(message, type) {
  const t = document.createElement("div"); t.className = `toast ${type}`; t.innerText = message;
  document.getElementById("toast-container").appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
