import {checkAuthAndRedirect} from "./authcheck.js";
const link = "https://reaperclone.onrender.com/";
document.addEventListener("DOMContentLoaded", async() => {
    let user = await checkAuthAndRedirect();
    const idToken = await user.getIdToken();
    let res = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>You can now sign-up with a username, email, and password instead of google! Logging out + alt detection is the next update.</p>
        <p>Good luck in Game 3!</p></b>
    </div>
     `
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});