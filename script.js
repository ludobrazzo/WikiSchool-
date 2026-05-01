import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc
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

const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");

let currentUser = null;
let uploadedFileUrl = "";
let uploadedThumbUrl = "";

// Gestione Stato Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authBtn.innerText = "Ciao, " + (user.displayName || "Studente");
    authBtn.style.background = "#10b981"; // verde se loggato
    profileBtn.style.display = "block";
  } else {
    currentUser = null;
    authBtn.innerText = "Login";
    authBtn.style.background = "var(--primary)";
    profileBtn.style.display = "none";
  }
});

// Apertura Modali
authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
document.getElementById("close-modal").onclick = () => (modal.style.display = "none");
profileBtn.onclick = () => { openProfileModal(); };
document.getElementById("close-profile").onclick = () => (profileModal.style.display = "none");

// --- LOGICA PROFILO UTENTE ---
async function openProfileModal() {
  profileModal.style.display = "flex";
  document.getElementById("profile-email").innerText = currentUser.email;
  loadMyUploads();
}

document.getElementById("tab-uploads").onclick = () => {
  document.getElementById("tab-uploads").className = "btn-primary";
  document.getElementById("tab-favorites").className = "btn-secondary";
  loadMyUploads();
};

document.getElementById("tab-favorites").onclick = () => {
  document.getElementById("tab-favorites").className = "btn-primary";
  document.getElementById("tab-uploads").className = "btn-secondary";
  loadMyFavorites();
};

async function loadMyUploads() {
  const container = document.getElementById("profile-content");
  container.innerHTML = "<p>Caricamento...</p>";
  
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  
  if (snap.empty) {
    container.innerHTML = "<p>Non hai ancora caricato nessun appunto.</p>";
    return;
  }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "profile-item";
    div.innerHTML = `
      <div>
        <strong>${data.title}</strong><br>
        <span style="font-size:0.8rem; color:var(--text-muted)">${data.category} - ${data.year}° Anno</span>
      </div>
      <button class="delete-btn" data-id="${docSnap.id}">Elimina</button>
    `;
    container.appendChild(div);
  });

  // Gestione Eliminazione
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async (e) => {
      if(confirm("Sei sicuro di voler eliminare questo file dall'archivio?")) {
        await deleteDoc(doc(db, "projects", e.target.getAttribute("data-id")));
        loadMyUploads(); // Ricarica la lista
      }
    };
  });
}

async function loadMyFavorites() {
  const container = document.getElementById("profile-content");
  container.innerHTML = "<p>Caricamento preferiti...</p>";
  
  const q = query(collection(db, "projects"), where("favorites", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  
  if (snap.empty) {
    container.innerHTML = "<p>Non hai ancora salvato nessun preferito.</p>";
    return;
  }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "profile-item";
    div.innerHTML = `
      <div>
        <strong>${data.title}</strong><br>
        <span style="font-size:0.8rem; color:var(--text-muted)">${data.authorName || 'Anonimo'}</span>
      </div>
      <a href="${data.fileUrl}" target="_blank" class="btn-secondary" style="padding: 5px 10px; text-decoration:none; font-size:0.9rem;">Apri File</a>
    `;
    container.appendChild(div);
  });
}

document.getElementById("logout-btn").onclick = () => {
  signOut(auth).then(() => {
    profileModal.style.display = "none";
    alert("Disconnesso con successo!");
  });
};

// --- LOGICA UPLOAD CLOUDINARY ---
if (document.getElementById("upload-widget")) {
  const myWidget = cloudinary.createUploadWidget(
    { cloudName: CLOUD_NAME, uploadPreset: UPLOAD_PRESET },
    (error, result) => {
      if (!error && result && result.event === "success") {
        uploadedFileUrl = result.info.secure_url;
        uploadedThumbUrl = uploadedFileUrl.endsWith(".pdf") 
          ? uploadedFileUrl.replace(".pdf", ".jpg") 
          : uploadedFileUrl;
        document.getElementById("file-status").innerText = "✅ File caricato e pronto!";
      }
    }
  );

  document.getElementById("upload-widget").addEventListener("click", () => {
    if (!currentUser) return alert("Devi fare il login per caricare file.");
    myWidget.open();
  });
}

// --- SALVATAGGIO IN FIRESTORE ---
if (document.getElementById("publish-btn")) {
  const uploadBtn = document.getElementById("publish-btn");
  uploadBtn.onclick = async () => {
    if (!currentUser) return alert("Fai il login per pubblicare.");
    const t = document.getElementById("doc-title").value;
    const y = document.getElementById("doc-year").value;
    const s = document.getElementById("doc-subject").value;
    
    if (!t || !uploadedFileUrl) return alert("Inserisci titolo e carica un file!");

    uploadBtn.innerText = "Pubblicazione...";
    uploadBtn.disabled = true;

    try {
      await addDoc(collection(db, "projects"), {
        title: t,
        year: y,
        category: s,
        fileUrl: uploadedFileUrl,
        thumbUrl: uploadedThumbUrl,
        authorName: currentUser.displayName || "Studente",
        authorUid: currentUser.uid,
        likes: [],      // Array per i Mi Piace
        favorites: [],  // Array per i Preferiti
        comments: [],   // Array per i Commenti
        createdAt: new Date().toISOString()
      });
      alert("Appunto caricato con successo!");
      window.location.reload();
    } catch (err) {
      alert("Errore salvataggio: " + err.message);
      uploadBtn.innerText = "Pubblica Appunto";
      uploadBtn.disabled = false;
    }
  };
}

// --- LOGICA LOGIN/REGISTRAZIONE ---
document.getElementById("do-login").onclick = () => {
  const e = document.getElementById("login-email").value,
        p = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, e, p)
    .then(() => (modal.style.display = "none"))
    .catch((err) => alert("Errore login: " + err.message));
};

document.getElementById("do-register").onclick = () => {
  const n = document.getElementById("reg-name").value,
        e = document.getElementById("reg-email").value,
        p = document.getElementById("reg-password").value;
  createUserWithEmailAndPassword(auth, e, p)
    .then((res) => {
      updateProfile(res.user, { displayName: n });
      modal.style.display = "none";
    })
    .catch((err) => alert("Errore registrazione: " + err.message));
};

document.getElementById("google-login").onclick = () => {
  signInWithPopup(auth, provider)
    .then(() => (modal.style.display = "none"))
    .catch((err) => alert(err.message));
};

const viewLogin = document.getElementById("auth-view-login");
const viewReg = document.getElementById("auth-view-register");
document.getElementById("go-to-reg").onclick = () => { viewLogin.style.display = "none"; viewReg.style.display = "block"; };
document.getElementById("go-to-login").onclick = () => { viewLogin.style.display = "block"; viewReg.style.display = "none"; };

// REGISTRAZIONE SERVICE WORKER (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("SW registrato:", reg.scope))
      .catch((err) => console.log("SW fallito:", err));
  });
}
