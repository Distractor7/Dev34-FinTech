import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQ-wTvan99kZal7EWXcve2RAQy966M0yk",
  authDomain: "flow34-bad8e.firebaseapp.com",
  projectId: "flow34-bad8e",
  storageBucket: "flow34-bad8e.appspot.com",
  messagingSenderId: "256044292068",
  appId: "1:XXXXXXXXXXXX:web:YYYYYYYYYYYYYYYYY", // << fill in from Firebase
  measurementId: "G-XXXXXXXXXX", // << if shown in your Firebase config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, auth, storage, db };
