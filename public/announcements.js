import {checkAuthAndRedirect} from "./authcheck.js";
document.addEventListener("DOMContentLoaded", async() => {
    user = await checkAuthAndRedirect();
    const idToken = await user.getIdToken();
    let res = await fetch(link+"/announcement", {
        headers: {
        Authorization: `Bearer ${idToken}`,
        },
    });
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});