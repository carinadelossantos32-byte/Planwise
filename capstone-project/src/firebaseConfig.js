// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAepF75qwmFAetmgVCCpYFeOjsWURTcnDo",
  authDomain: "planwise-5e5fe.firebaseapp.com",
  projectId: "planwise-5e5fe",
  storageBucket: "planwise-5e5fe.firebasestorage.app",
  messagingSenderId: "448092137403",
  appId: "1:448092137403:web:0709e9c9c92918f792469e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db=getFirestore(app);