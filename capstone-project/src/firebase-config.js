import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAepF75qwmFAetmgVCCpYFeOjsWURTcnDo",
  authDomain: "planwise-5e5fe.firebaseapp.com",
  projectId: "planwise-5e5fe",
  storageBucket: "planwise-5e5fe.firebasestorage.app",
  messagingSenderId: "448092137403",
  appId: "1:448092137403:web:0709e9c9c92918f792469e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);