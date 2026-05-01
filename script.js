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

// Gestione Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authBtn.innerText = "Ciao, " + (user.displayName || "Studente");
    authBtn.style.background = "#10b981";
    profileBtn.style.display = "block";
  } else {
    currentUser = null;
    authBtn.innerText = "Login";
    authBtn.style.background = "var(--primary)";
    profileBtn.style.display = "none";
  }
});

// Bottoni Finestre
authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
document.getElementById("close-modal").onclick = () => (modal.style.display = "none");
profileBtn.onclick = () => { profileModal.style.display = "flex"; document.getElementById("profile-email").innerText = currentUser.email; loadMyUploads(); };
document.getElementById("close-profile").onclick = () => (profileModal.style.display = "none");

// Tab Profilo
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
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento in corso...</p>";
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Non hai ancora caricato appunti.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    // Anteprima: se è vuota usa l'immagine segnaposto
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

document.getElementById("logout-btn").onclick = () => { signOut(auth).then(() => { profileModal.style.display = "none"; location.reload(); }); };

// Cloudinary
if (document.getElementById("upload-widget")) {
  const myWidget = cloudinary.createUploadWidget(
    { cloudName: CLOUD_NAME, uploadPreset: UPLOAD_PRESET },
    (error, result) => {
      if (!error && result && result.event === "success") {
        uploadedFileUrl = result.info.secure_url;
        uploadedThumbUrl = uploadedFileUrl.endsWith(".pdf") ? uploadedFileUrl.replace(".pdf", ".jpg") : uploadedFileUrl;
        document.getElementById("file-status").innerText = "✅ File caricato con successo!";
      }
    }
  );
  document.getElementById("upload-widget").addEventListener("click", () => {
    if (!currentUser) return alert("Devi fare il login per caricare un file.");
    myWidget.open();
  });
}

// Pubblicazione DB (File O Link)
if (document.getElementById("publish-btn")) {
  const uploadBtn = document.getElementById("publish-btn");
  uploadBtn.onclick = async () => {
    if (!currentUser) return alert("Fai il login prima di pubblicare.");
    const t = document.getElementById("doc-title").value;
    const y = document.getElementById("doc-year").value;
    const s = document.getElementById("doc-subject").value;
    const linkInput = document.getElementById("doc-link").value;
    
    // Controlla se c'è un file da tasto OPPURE un link incollato
    const finalUrl = uploadedFileUrl || linkInput;

    if (!t || !finalUrl) return alert("Inserisci il titolo e carica un file oppure incolla un link!");

    // Immagine d'anteprima standard se mettono un link esterno
    const finalThumb = uploadedThumbUrl || "https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?w=500";

    uploadBtn.innerText = "Pubblicazione...";
    uploadBtn.disabled = true;

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
      uploadBtn.innerText = "Pubblica Appunto";
      uploadBtn.disabled = false;
    }
  };
}

// Login
document.getElementById("do-login").onclick = () => {
  signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value)
    .then(() => (modal.style.display = "none")).catch((err) => alert(err.message));
};
document.getElementById("do-register").onclick = () => {
  const n = document.getElementById("reg-name").value;
  createUserWithEmailAndPassword(auth, document.getElementById("reg-email").
