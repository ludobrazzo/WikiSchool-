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

const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");

const warningMsg = document.getElementById("login-warning"); 
const formContainer = document.getElementById("upload-form-container"); 

// --- GESTIONE ACCESSO E VISIBILITÀ ---
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

// --- MOSTRA IL NOME DEL FILE SELEZIONATO ---
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");

if (fileInput && fileNameDisplay) {
  fileInput.addEventListener("change", function() {
    if (this.files && this.files.length > 0) {
      // Quando scegli un file, ti scrive il nome!
      fileNameDisplay.innerText = "✅ File pronto: " + this.files[0].name;
    } else {
      fileNameDisplay.innerText = "";
    }
  });
}

// --- APERTURA/CHIUSURA MODALI ---
if (authBtn && modal) {
  authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
}
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


// --- GESTIONE PROFILO ---
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

// --- PUBBLICAZIONE IN BACKGROUND ---
const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    if (!currentUser) return showToast("Devi fare il login prima di pubblicare.");
    
    const tEl = document.getElementById("project-title");
    const yEl = document.getElementById("project-year");
    const sEl = document.getElementById("project-subject");
    const linkInput = document.getElementById("doc-link"); 

    const title = tEl ? tEl.value : "";
    const year = yEl ? yEl.value : "";
    const subject = sEl ? sEl.value : "";
    
    const file = (fileInput && fileInput.files.length > 0) ? fileInput.files[0] : null;
    const linkUrl = linkInput ? linkInput.value : "";

    if (!title || !year || !subject) return showToast("Per favore, compila tutti i campi!");
    if (!file && !linkUrl) return showToast("Carica un file o inserisci un link valido!");

    publishBtn.innerText = "Caricamento in corso... ⏳";
    publishBtn.disabled = true;

    try {
      let finalUrl = linkUrl;
      let finalThumb = "https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?w=500"; 

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);

        finalUrl = data.secure_url;
        finalThumb = data.format === "pdf" ? finalUrl.replace(".pdf", ".jpg") : finalUrl;
      }

      await addDoc(collection(db, "projects"), {
        title: title,
        year: year,
        category: subject,
        fileUrl: finalUrl,
        thumbUrl: finalThumb,
        authorName: currentUser.displayName || "Studente",
        authorUid: currentUser.uid,
        likes: [], favorites: [], comments: [],
        createdAt: new Date().toISOString()
      });

      showToast("Appunto caricato e pubblicato con successo! 🎉");
      window.location.reload();

    } catch (err) {
      console.error(err);
      showToast("Errore durante il salvataggio: " + err.message);
      publishBtn.innerText = "Pubblica Appunto";
      publishBtn.disabled = false;
    }
  });
}

// --- LOGICA LOGIN ---
const doLogin = document.getElementById("do-login");
if(doLogin) {
  doLogin.onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value)
      .then(() => { if(modal) modal.style.display = "none"; }).catch((err) => alert("Errore login: " + err.message));
  };
}
const doRegister = document.getElementById("do-register");
if(doRegister) {
  doRegister.onclick = () => {
    const n = document.getElementById("reg-name").value;
    createUserWithEmailAndPassword(auth, document.getElementById("reg-email").value, document.getElementById("reg-password").value)
      .then((res) => { updateProfile(res.user, { displayName: n }); if(modal) modal.style.display = "none"; })
      .catch((err) => alert("Errore registrazione: " + err.message));
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

// PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.log(err));
  });
}



/**
 * Mostra una notifica Toast.
 * @param {string} message - Il messaggio da mostrare.
 * @param {string} type - 'success', 'error', o 'info' (default).
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // 1. Crea l'elemento toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // 2. Sceglie un'iconina carina in base al tipo
  let icon = '💡';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  // 3. Lo aggiunge allo schermo
  container.appendChild(toast);

  // 4. Lo fa sparire dopo 3 secondi (3000 millisecondi)
  setTimeout(() => {
    toast.classList.add('fade-out'); // Fa sfumare il toast
    setTimeout(() => {
      toast.remove(); // Lo cancella definitivamente dal codice
    }, 300); // Aspetta che finisca l'animazione CSS
  }, 3000);
}
