// Firebase Configuration for CRM Checa
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "crm-checa-dist-final",
  appId: "1:109371027518:web:b68663275663d9d8b6a16f",
  storageBucket: "crm-checa-dist-final.firebasestorage.app",
  apiKey: "AIzaSyDvsgnNdrC-SrfM1QH-iuiPQ458r1bFxO0",
  authDomain: "crm-checa-dist-final.firebaseapp.com",
  messagingSenderId: "109371027518",
  measurementId: "G-XXXXXXXXXX" // No proporcionado pero no es crítico
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
