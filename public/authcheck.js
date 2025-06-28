import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import app from "./firebase.js";

let link = "https://reaperclone.onrender.com/"

const auth = getAuth(app);

async function fetchJSON(path){
    const res = await fetch(link+path);
    return await res.json();
}

export async function checkAuthAndRedirect() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log(user)
        if (!user) {
          console.log("No user detected - redirecting to login");
          unsubscribe();  // stop listening
          window.location.href = link + "login";
          return;
        }
  
        try {
          const registered = await fetchJSON("users/" + user.uid);
  
          if (registered) {
            unsubscribe();
            resolve(user);
          } else {
            unsubscribe();
            window.location.href = link + "login";
          }
        } catch (e) {
          console.error("Error fetching registration status:", e);
          unsubscribe();
          window.location.href = link + "login";
        }
      });
    });
}
  

export async function redirectFromLogin() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            console.log("redirectFromLogin() detected user:", user);
            if (!user) {
                console.log("No user, staying on login");
                resolve(null);
                return;
            }
            let registered = await fetchJSON("users/" + user.uid);
            console.log("Fetched user registered:", registered);
            if (registered) {
                console.log("User is registered, redirecting to main page");
                window.location.href = link; // redirect to main page
            } else {
                console.log("User is unregistered, staying on login page");
                resolve(user); // let page show register form
            }
        });
    });
}

  