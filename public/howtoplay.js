document.addEventListener("DOMContentLoaded", () => {
    let info = `
    <div id="information">
        <h2>How to Play</h2>
        <p>Welcome to When Reaper, a universe all about time! Here, you must steal time from the mainframe by "reaping" and add it to your collection, however, you must recharge (which takes some amount of time) before being able to take time again.</p>
        <p>There are extra natural events this universe stores in its space, including ones that make your time more valuable or less valuable.</p>
        <p>It will also randomly generate a bomb using the leftover toxins from other people taking time. This allows you to dazzle the other person and take the time for yourself (that they were originally going to take).</p>
        <p>There is a chance that your 2nd battery (ERS) charges up to its max, which gives enough energy you to reap once at any time, even if you are recharging.</p>
    </div>
    `;
    document.getElementById("title").insertAdjacentHTML("afterend", info);
});

document.addEventListener("DOMContentLoaded", () => {
    let info = `
    <div id="watermark">
        <p><b>© 2025 CircularBlox. All rights reserved.</b></p>
        <p>When Reaper is a copyrighted work created by CircularBlox. Reproduction and distribution of this game is permitted for noncommercial purposes only.</p>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', info);
});