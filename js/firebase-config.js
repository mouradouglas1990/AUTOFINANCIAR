// ── Configuração do Firebase ──────────────────
// Estas chaves são públicas (não são segredo) — identificam o projeto,
// a segurança real é feita pelas Regras do Firestore e do Authentication.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8Mpu0dbnVcUEU0Qufve60ULd5PPrS62s",
  authDomain: "autofinanciar.firebaseapp.com",
  projectId: "autofinanciar",
  storageBucket: "autofinanciar.firebasestorage.app",
  messagingSenderId: "93079177837",
  appId: "1:93079177837:web:deb77e311d7f6ce14c0d64",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta tudo no objeto global window.AF_FIREBASE para uso nos outros scripts
// (login.html e app.js usam <script> normal, sem import/export de módulos)
window.AF_FIREBASE = {
  auth,
  db,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
};

// Sinaliza que o Firebase já carregou (outros scripts podem esperar este evento)
window.dispatchEvent(new Event("af-firebase-ready"));
