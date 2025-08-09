document.addEventListener("DOMContentLoaded", async() => {
    let res = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>Game 3 has been delayed until a major bug with reaping is fixed.</b></p>
        <p>Sign in with google is in the works to be more secure. Community polls coming soon!</p>
    </div>
     `
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});