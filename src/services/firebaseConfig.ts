// src/services/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore"; // ✅ import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyC5FM4moEQkN_pJJDc6_IuauKfd3sRrAC0",
  authDomain: "obsero-4c05b.firebaseapp.com",
  projectId: "obsero-4c05b",
  storageBucket: "obsero-4c05b.appspot.com",
  messagingSenderId: "842986928404",
  appId: "1:842986928404:web:7b8495f6975a256157ea01",
  measurementId: "G-23Q59Q8ZHV",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app); // ✅ initialize Firestore

export { app, auth, storage, db }; // ✅ export db
