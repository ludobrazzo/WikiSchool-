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

let currentUser = null;
let uploadedFileUrl = "";
let uploadedThumbUrl = "";

// Elementi HTML presi in modo sicuro
const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");
const uploadCard = document.querySelector(".upload-card"); // Il tuo blocco caricamento

// GESTIONE LOGIN E TRASPARENZA BLOCCO UPLOAD
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (authBtn) {
      authBtn.innerText = "Ciao, " + (user.displayName || "Studente");
      authBtn.style.background = "#10b981"; // Verde
    }
    if (profileBtn) profileBtn.style.display = "block";
    
    // Utente loggato: il blocco pubblicazione è acceso e cliccabile
    if (uploadCard) {
      uploadCard.style.opacity = "1";
      uploadCard.style.pointerEvents = "auto";
    }
  } else {
    currentUser = null;
    if (authBtn) {
      authBtn.innerText = "Login";
      authBtn.style.background = "var(--primary)";
    }
    if (profileBtn) profileBtn.style.display = "none";
    
    // Utente disconnesso: il blocco pubblicazione diventa semi-trasparente e bloccato
    if (uploadCard) {
      uploadCard.style.opacity = "0.4";
      uploadCard.style.pointerEvents = "none";
    }
  }
});

// APERTURA/CHIUSURA FINESTRE (Controlli anti-crash)
if (authBtn && modal) {
  authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
}
const closeModal = document.getElementById("close-modal");
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

// GESTIONE PROFILO (Ignorata se non hai messo il codice HTML)
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
  if(!container) return; // Se non c'è, si ferma senza errori
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento in corso...</p>";
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Non hai ancora caricato appunti.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const imgSrc = data.thumbUrl || data.fileUrl || "https://via.placeholder.com/300x200?text=Anteprima";
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content">
        <div class="card-title" onclick="window.open('${data.fileUrl}', '_blank')">${data.title}</div>
        <div class="card-meta">${data.category} - ${data.year}° Anno</div>
        <button class="delete-btn" data-id="${docSnap.id}">Elimina File</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async (e) => {
      if(confirm("Sei sicuro di voler eliminare questo file dall'archivio?")) {
        await deleteDoc(doc(db, "projects", e.target.getAttribute("data-id")));
        loadMyUploads();
      }
    };
  });
}

async function loadMyFavorites() {
  const container = document.getElementById("profile-content");
  if(!container) return;
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento preferiti...</p>";
  const q = query(collection(db, "projects"), where("favorites", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Non hai ancora salvato preferiti.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const imgSrc = data.thumbUrl || data.fileUrl || "https://via.placeholder.com/300x200?text=Anteprima";
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content">
        <div class="card-title" onclick="window.open('${data.fileUrl}', '_blank')">${data.title}</div>
        <div class="card-meta">di ${data.authorName}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

const logoutBtn = document.getElementById("logout-btn");
if(logoutBtn) {
  logoutBtn.onclick = () => { signOut(auth).then(() => { if(profileModal) profileModal.style.display = "none"; location.reload(); }); };
}

// LOGICA CLOUDINARY
const uploadWidgetBtn = document.getElementById("upload-widget");
if (uploadWidgetBtn && typeof cloudinary !== "undefined") {
  const myWidget = cloudinary.createUploadWidget(
    { cloudName: CLOUD_NAME, uploadPreset: UPLOAD_PRESET },
    (error, result) => {
      if (!error && result && result.event === "success") {
        uploadedFileUrl = result.info.secure_url;
        uploadedThumbUrl = uploadedFileUrl.endsWith(".pdf") ? uploadedFileUrl.replace(".pdf", ".jpg") : uploadedFileUrl;
        const statusP = document.getElementById("file-status");
        if(statusP) statusP.innerText = "✅ File caricato con successo!";
      }
    }
  );
  uploadWidgetBtn.addEventListener("click", () => {
    if (!currentUser) return alert("Devi fare il login per caricare un file.");
    myWidget.open();
  });
}

// SALVATAGGIO IN ARCHIVIO
const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.onclick = async () => {
    if (!currentUser) return alert("Fai il login prima di pubblicare.");
    
    const tEl = document.getElementById("doc-title");
    const yEl = document.getElementById("doc-year");
    const sEl = document.getElementById("doc-subject");
    const linkEl = document.getElementById("doc-link"); // Se l'hai aggiunto

    const t = tEl ? tEl.value : "";
    const y = yEl ? yEl.value : "";
    const s = sEl ? sEl.value : "";
    const linkInput = linkEl ? linkEl.value : "";
    
    const finalUrl = uploadedFileUrl || linkInput;

    if (!t || !finalUrl) return alert("Inserisci il titolo e carica un file oppure incolla un link!");

    const finalThumb = uploadedThumbUrl || "https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?w=500";

    publishBtn.innerText = "Pubblicazione...";
    publishBtn.disabled = true;

    try {
      await addDoc(collection(db, "projects"), {
        title: t,
        year: y,
        category: s,
        fileUrl: finalUrl,
        thumbUrl: finalThumb,
        authorName: currentUser.displayName || "Studente",
        authorUid: currentUser.uid,
        likes: [], favorites: [], comments: [],
        createdAt: new Date().toISOString()
      });
      alert("Appunto caricato e pubblicato con successo!");
      window.location.reload();
    } catch (err) {
      alert("Errore durante il salvataggio: " + err.message);
      publishBtn.innerText = "Pubblica Appunto";
      publishBtn.disabled = false;
    }
  };
}

// LOGICA SISTEMA DI ACCESSO
const doLogin = document.getElementById("do-login");
if(doLogin) {
  doLogin.onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value)
      .then(() => { if(modal) modal.style.display = "none"; }).catch((err) => alert(err.message));
  };
}
const doRegister = document.getElementById("do-register");
if(doRegister) {
  doRegister.onclick = () => {
    const n = document.getElementById("reg-name").value;
    createUserWithEmailAndPassword(auth, document.getElementById("reg-email").value, document.getElementById("reg-password").value)
      .then((res) => { updateProfile(res.user, { displayName: n }); if(modal) modal.style.display = "none"; })
      .catch((err) => alert(err.message));
  };
}
const googleLogin = document.getElementById("google-login");
if(googleLogin) {
  googleLogin.onclick = () => {
    signInWithPopup(auth, provider).then(() => { if(modal) modal.style.display = "none"; }).catch((err) => alert(err.message));
  };
}

const viewLogin = document.getElementById("auth-view-login");
const viewReg = document.getElementById("auth-view-register");
const goToReg = document.getElementById("go-to-reg");
const goToLogin = document.getElementById("go-to-login");

if(goToReg && viewLogin && viewReg) {
  goToReg.onclick = () => { viewLogin.style.display = "none"; viewReg.style.display = "block"; };
}
if(goToLogin && viewLogin && viewReg) {
  goToLogin.onclick = () => { viewLogin.style.display = "block"; viewReg.style.display = "none"; };
}

// REGISTRAZIONE PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.log(err));
  });
}
