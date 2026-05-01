import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
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
const modal = document.getElementById("login-modal");
const uploadBox = document.getElementById("upload-box");
const loginPrompt = document.getElementById("login-prompt");

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (authBtn)
      authBtn.innerText =
        "Logout (" + (user.displayName || user.email.split("@")[0]) + ")";
    if (uploadBox) uploadBox.style.display = "block";
    if (loginPrompt) loginPrompt.style.display = "none";
  } else {
    if (authBtn) authBtn.innerText = "Login";
    if (uploadBox) uploadBox.style.display = "none";
    if (loginPrompt) loginPrompt.style.display = "block";
  }
});

if (authBtn)
  authBtn.onclick = () => {
    auth.currentUser ? signOut(auth) : (modal.style.display = "flex");
  };
document.getElementById("close-modal").onclick = () => {
  modal.style.display = "none";
};

// --- CARICAMENTO OTTIMIZZATO ---
const uploadBtn = document.getElementById("upload-btn");

if (uploadBtn) {
  uploadBtn.onclick = async () => {
    const title = document.getElementById("title").value;
    const year = document.getElementById("year-selector").value;
    const category = document.getElementById("category-filter").value;
    const fileInput = document.getElementById("file-selector");
    const externalLink = document.getElementById("external-link").value;

    if (!title || !year || !category) return alert("Compila tutti i campi!");

    let finalFileURL = externalLink;
    let finalThumb = ""; // Sarà vuoto per i link esterni, gestito poi dall'archivio

    if (fileInput.files.length > 0) {
      uploadBtn.innerText = "Caricamento in corso...";
      uploadBtn.disabled = true;

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      try {
        const resp = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await resp.json();

        if (!resp.ok) throw new Error(data.error.message);

        finalFileURL = data.secure_url;

        // MODIFICA PER L'ANTEPRIMA: Controlla se il file caricato termina con .pdf
        if (finalFileURL.toLowerCase().endsWith(".pdf")) {
          // Sostituisce .pdf con .jpg per forzare Cloudinary a generare un'immagine della 1° pagina
          finalThumb = finalFileURL.replace(/\.pdf$/i, ".jpg");
        } else {
          // Se è già un'immagine (jpg, png, ecc.), l'anteprima è il file stesso
          finalThumb = finalFileURL;
        }
      } catch (err) {
        alert("Errore Caricamento: " + err.message);
        uploadBtn.innerText = "Pubblica";
        uploadBtn.disabled = false;
        return;
      }
    }

    if (!finalFileURL) return alert("Seleziona un file o metti un link!");

    try {
      await addDoc(collection(db, "projects"), {
        title,
        year,
        category,
        fileLink: finalFileURL,
        thumbnail: finalThumb,
        authorName: auth.currentUser.displayName || "Studente",
        authorEmail: auth.currentUser.email,
        createdAt: new Date().toISOString(),
      });

      alert("Pubblicato con successo!");
      window.location.reload();
    } catch (err) {
      alert("Errore salvataggio: " + err.message);
      uploadBtn.innerText = "Pubblica";
      uploadBtn.disabled = false;
    }
  };
}

// Logica Login (Invariata)
document.getElementById("do-login").onclick = () => {
  const e = document.getElementById("login-email").value,
    p = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, e, p)
    .then(() => (modal.style.display = "none"))
    .catch((err) => alert(err.message));
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
    .catch((err) => alert(err.message));
};
document.getElementById("google-login").onclick = () => {
  signInWithPopup(auth, provider)
    .then(() => (modal.style.display = "none"))
    .catch((err) => alert(err.message));
};
const viewLogin = document.getElementById("auth-view-login"),
  viewReg = document.getElementById("auth-view-register");
document.getElementById("go-to-reg").onclick = () => {
  viewLogin.style.display = "none";
  viewReg.style.display = "block";
};
document.getElementById("go-to-login").onclick = () => {
  viewLogin.style.display = "block";
  viewReg.style.display = "none";
};

// REGISTRAZIONE SERVICE WORKER (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js") // <-- AGGIUNTO IL PUNTO QUI
      .then((registration) => {
        console.log("Service Worker registrato con successo:", registration.scope);
      })
      .catch((error) => {
        console.log("Registrazione Service Worker fallita:", error);
      });
  });
}


