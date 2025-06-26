import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { redirectFromLogin } from "./authcheck.js";

console.log("Login script loaded");

const link = "https://reaperclone.onrender.com/";

async function fetchJSON(path) {
  const res = await fetch(link + path);
  return await res.json();
}

async function writeJSON(path, data) {
  const res = await fetch(link + path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data),
  });
  return res.json();
}

const firebaseConfig = {
  apiKey: "AIzaSyASmVweFPm03Tizv6J9RMz5nR7THRx7pHU",
  authDomain: "reaper-clone.firebaseapp.com",
  databaseURL: "https://reaper-clone-default-rtdb.firebaseio.com",
  projectId: "reaper-clone",
  storageBucket: "reaper-clone.appspot.com",
  messagingSenderId: "329401063543",
  appId: "1:329401063543:web:4cb1d3ae3668c46a1d4e72",
  measurementId: "G-EGPV5J832T"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded");

  // Check if already logged in and registered
  const user = await redirectFromLogin();
  if (user) {
    console.log("Already logged in:", user.uid);
    document.getElementById("register").style.display = "block";
  }

  document.getElementById("loginbutton").addEventListener("click", async () => {
    console.log("Login button clicked");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const id = user.uid;

      console.log("Signed in as:", id);

      const users = await fetchJSON("users/" + id);
      console.log("User list result:", users);

      if (!users) {
        console.log("New user, show registration");
        document.getElementById("register").style.display = "block";
      } else {
        console.log("User exists, redirecting");
        window.location.replace(link);
      }      
    } catch (error) {
      console.error("Login error:", error);
    }
  });

  document.getElementById("senduser").addEventListener("click", async () => {
    const username = document.getElementById("usernamebox").value;
    const isValid = /^[a-z0-9]+$/i.test(username);
    if (!isValid) {
      console.log("Invalid username");
      return;
    }
    try {
      const id = auth.currentUser.uid;
      console.log(`Registering user "${username}" for ID: ${id}`);
  
      const result = await writeJSON("usercheck", {username: username, userid: id});
      console.log("Registration result:", result);
      if(!result.success){
        document.getElementById("error").innerHTML = result.message;
      }
    } catch (error) {
      console.error("Username submission error:", error);
    }
  });  
});
