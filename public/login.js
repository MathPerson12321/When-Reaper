import {getAuth,createUserWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,sendEmailVerification,signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {redirectFromLogin} from "./authcheck.js";
import app from './firebase.js';

const link = "https://reaperclone.onrender.com/";

async function fetchJSON(path,token){
  const idToken = token
  let res = await fetch(link+path,{
    headers:{
      Authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
}

async function writeJSON(path,data,token){
  const response = await fetch(link+path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data), 
  });
  return response.json();
}

function isValid(username){
  const isValid = /^[a-z0-9]+$/i.test(username);
  if(!isValid){
    document.getElementById("error").innerHTML = "Username must be alphanumeric.";
    return false;
  }
  return true;
}

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", async() => {
  const user = await redirectFromLogin();
  if(user){
    document.getElementById("register").style.display = "block";
  }

  document.getElementById("loginbutton").addEventListener("click", async() => {
    try{
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const users = await fetchJSON("users/",idToken);

      if(!users){
        document.getElementById("register").style.display = "block";
      }else{
        window.location.replace(link);
      }
    }catch(error){
      document.getElementById("error").innerHTML = error;
    }
  });

  document.getElementById("senduser").addEventListener("click", async() => {
    const username = document.getElementById("usernamebox").value;
    const isValid = isValid(username);
    if(!isValid){
      return;
    }
    try{
      const idToken = await auth.currentUser.getIdToken();
      const result = await writeJSON("usercheck",username,idToken);
      if(!(result.allowed == "Good!")){
        document.getElementById("error").innerHTML = result.message;
      }else{
        window.location.replace(link);
      }
    }catch(error){
      document.getElementById("error").innerHTML = error;
    }
  });

  document.getElementById("createaccount").addEventListener("click", async() => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;
    const validpass = /^[\w!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]+$/.test(password);
    if(password.length < 8 || password.length > 30){
      document.getElementById("error").innerHTML = "Password must be between 8 and 30 characters.";
      return;
    }else if(!validpass){
      document.getElementById("error").innerHTML = "Password can only have letters, numbers, and symbols.";
      return;
    }

    const isValid = isValid(username);
    if(!isValid){
      return;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!re.test(email)){
      document.getElementById("error").innerHTML = "Email must be valid.";
    }

    try{
      const result = await createUserWithEmailAndPassword(auth,email,password);
      const user = result.user;

      await sendEmailVerification(user);
      document.getElementById("error").innerHTML = "Verification email sent! Please check your inbox.";

      const idToken = await user.getIdToken();
  
      const response = await writeJSON("registeruser",{email,username,password},idToken);
  
      if(!(response.allowed == "Good!")){
        document.getElementById("error").innerHTML = response.message;
      }else{
        window.location.replace(link);
      }
    }catch(e){
      document.getElementById("error").innerHTML = e.message;
    }
  });

  document.getElementById("login").addEventListener("click", async() => {
    const email = document.getElementById("emaillogin").value;
    const password = document.getElementById("passwordlogin").value;

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!re.test(email)){
      document.getElementById("error").innerHTML = "Email must be valid.";
    }

    try{
      const result = await createUserWithEmailAndPassword(auth,email,password);
      const user = result.user;

      await user.reload();
      if(!user.emailVerified){
        document.getElementById("error").innerText = "Please verify your email before logging in.";
        await auth.signOut();
        return;
      }

      const idToken = await user.getIdToken();
      let registered = await fetchJSON("users/" + user.uid);
      if(!registered){
        document.getElementById("register").style.display = "block";
      }else{
        window.location.href = "https://reaperclone.onrender.com/";
      }
    }catch(e){
      document.getElementById("error").innerHTML = e.message;
    }
  });
});
