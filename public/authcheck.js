import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import app from "./firebase.js";

let link = "https://reaperclone.onrender.com/"

const auth = getAuth(app);

let cachuser = null;
let userpromise = null;

async function fetchJSON(path){
    const res = await fetch(link+path);
    return await res.json();
}

//Some parts of this (mostly promises) were done by AI
async function fetchUserInfo(){
  if(cachuser){
    return user;
  }
  if(userpromise){
    return userpromise;
  }

  const user = auth.currentUser;
  if (!user) return null;

  userpromise = (async () => {
    try{
      const token = await user.getIdToken();
      const res = await fetch(link + "me", {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
      const data = await res.json();

      cachuser = {username: data.username};
      return cachuser;
    }catch (err){
      console.error("[fetchUserInfo error]", err);
      throw err;
    }finally{
      userpromise = null;
    }
  })();

  return userpromise;
}

export async function checkAuthAndRedirect() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async(user) => {
        if(!user){
          unsubscribe(); 
          window.location.href = link + "login";
          return;
        }
  
        try{
          const info = await fetchUserInfo();
          const registered = await fetchJSON("users/" + user.uid);
          if(registered){
            unsubscribe();
            resolve(info);
          }else{
            unsubscribe();
            window.location.href = link + "login";
          }
        }catch(e){
          console.error("Error fetching registration status:", e);
          unsubscribe();
          window.location.href = link + "login";
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
            const info = await fetchUserInfo();
            let registered = await fetchJSON("users/" + user.uid);
            if(registered){
                window.location.href = link;
            }else{
                resolve(info);
            }
        });
    });
}

  