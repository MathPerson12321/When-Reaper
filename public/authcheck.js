import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import app from "./firebase.js";

let link = "https://reaperclone.onrender.com/"

const auth = getAuth(app);

const registeredcache = new Map();
let resolved = false;
let cacheduser = null;

async function fetchJSON(path,token){
  const idToken = token
  let res = await fetch(link+path,{
    headers:{
      Authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
}

async function getCurrentUser() {
  return new Promise((resolve) => {
    if(resolved){
      unsubscribe();
      resolve(cacheduser);
    }
    const unsubscribe = onAuthStateChanged(auth,(user) => {
      cacheduser = user;
      resolved = true;
      unsubscribe();
      resolve(user);
    });
  });
}


export async function checkAuthAndRedirect(){
  const user = await getCurrentUser();
  let token = await user.getIdToken();
  if(!user){
    window.location.href = link + "login";
    return;
  }
  try{
    let registered = registeredcache.get(user.uid);
    if(registered == undefined){
      registered = await fetchJSON("users/" + user.uid,token);
      registeredcache.set(user.uid,registered);
    }
    if(registered){
      return user;
    }else{
      window.location.href = link + "login";
      return;
    }
  }catch(e){
    console.error("Error fetching registration status:", e);
    window.location.href = link + "login";
    return;
  }
}

export async function redirectFromLogin() {
  const user = await getCurrentUser();
  if(!user){
    return;
  }
  let token = await user.getIdToken();
  let registered = registeredcache.get(user.uid);
  if(registered == undefined){
    registered = await fetchJSON("users/" + user.uid,token);
    registeredcache.set(user.uid,registered);
  }
  if(registered){
    window.location.href = link;
    return;
  }else{
    return user;
  }
}

  