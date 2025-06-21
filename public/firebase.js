import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyASmVweFPm03Tizv6J9RMz5nR7THRx7pHU",
    authDomain: "reaper-clone.firebaseapp.com",
    databaseURL: "https://reaper-clone-default-rtdb.firebaseio.com",
    projectId: "reaper-clone",
    storageBucket: "reaper-clone.firebasestorage.app",
    messagingSenderId: "329401063543",
    appId: "1:329401063543:web:4cb1d3ae3668c46a1d4e72",
    measurementId: "G-EGPV5J832T"
};

const app = initializeApp(firebaseConfig);

export default app;