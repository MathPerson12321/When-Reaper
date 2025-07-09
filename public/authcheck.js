import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import app from "./firebase.js";

let link = "https://reaperclone.onrender.com/"

const auth = getAuth(app);

const registeredcache = new Map();

async function fetchJSON(path){
    const res = await fetch(link+path);
    return await res.json();
}

export async function checkAuthAndRedirect() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async(user) => {
        if(!user){
          unsubscribe(); 
          window.location.href = link + "login";
          resolve(null);
          return;
        }
  
        try{
          let registered = registeredcache.get(user.uid);
          if(registered == undefined){
            registered = await fetchJSON("users/" + user.uid);
            registeredcache.set(user.uid,registered);
          }
          if(registered){
            unsubscribe();
            resolve(user);
          }else{
            unsubscribe();
            window.location.href = link + "login";
            resolve(null);
          }
        }catch(e){
          console.error("Error fetching registration status:", e);
          unsubscribe();
          window.location.href = link + "login";
          resolve(null);
        }
      });
    });
}
  

export async function redirectFromLogin() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async(user) => {
            if(!user){
                resolve(null);
                return;
            }
            let registered = registeredcache.get(user.uid);
            if(registered == undefined){
              registered = await fetchJSON("users/" + user.uid);
              registeredcache.set(user.uid,registered);
            }
            if(registered){
                window.location.href = link;
            }else{
                resolve(user);
            }
        });
    });
}

  