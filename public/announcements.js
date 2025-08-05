document.addEventListener("DOMContentLoaded", () => {
    let info = `
    <div id="announcements">
        <h2>Announcements</h2>
        <p><b>Maintenence will happen at 8 PM ET and will end at 9 PM ET (could be earlier).</b></p>
    </div>
    `;
    document.getElementById("information").insertAdjacentHTML("afterend", info);
});