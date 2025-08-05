document.addEventListener("DOMContentLoaded", () => {
    let info = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>Game 3 has been delayed, and the win time and cooldown will not be revealed.</b></p>
    </div>
    `;
    document.getElementById("information").insertAdjacentHTML("afterend", info);
});