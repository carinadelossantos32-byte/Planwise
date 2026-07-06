import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAepF75qwmFAetmgVCCpYFeOjsWURTcnDo",
  authDomain: "planwise-5e5fe.firebaseapp.com",
  databaseURL: "https://planwise-5e5fe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "planwise-5e5fe",
  storageBucket: "planwise-5e5fe.firebasestorage.app",
  messagingSenderId: "448092137403",
  appId: "1:448092137403:web:0709e9c9c92918f792469e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export { signInWithEmailAndPassword, sendPasswordResetEmail, doc, getDoc };