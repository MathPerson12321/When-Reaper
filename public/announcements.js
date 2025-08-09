document.addEventListener("DOMContentLoaded", async() => {
    let res = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>The login bug and creating account with a password is now fixed, Game 3 will be pushed back a bit.</b></p>
        <p>Good luck in Game 3! Free reaps are now a thing.</p></b>
    </div>
     `
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});