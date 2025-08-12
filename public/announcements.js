document.addEventListener("DOMContentLoaded", async() => {
    let res = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>Game 3 has been fixed in the recent round of maintenance and starts today! Emails will be sent on game start.</b></p>
        <p>Sign in with Google is in the works to be more secure. Community polls coming soon!</p>
    </div>
     `
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});