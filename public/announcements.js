document.addEventListener("DOMContentLoaded", async() => {
    let res = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>Major bug in logging in and creating accounts, Game 3 has been DELAYED to TBD.</p>
        <p>Good luck in Game 3! Free reaps are now a thing.</p></b>
    </div>
     `
    document.getElementById("information").insertAdjacentHTML("afterend", res);
});