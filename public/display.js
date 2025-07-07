import {checkAuthAndRedirect} from "./authcheck.js";
import app from './firebase.js';
import {getAuth} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";

let data = null;
let userlastreaps = null;
let reaps = null;
let leaderboard = null;
let username = null;
let user = null;

const link = "https://reaperclone.onrender.com/";
const gamenum = "game1";

async function fetchJSON(path,path2,user){
  const idToken = await user.getIdToken();
  let res = await fetch(link+path2+path, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
}

async function writeJSON(path,path2,data){
  const response = await fetch(link+path2+path, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data),
  });
  return response.json();
}

function mostrecentreapdisplay(){
  if (!reaps || Object.keys(reaps).length == 0){
    return;
  }

  const arr = Object.entries(reaps);
  let count = 1;

  for(let i = 0; i < reaps.length && count <= 10; i++){
    let [reapnum,details] = arr[i];
    if(!details.timestamp){
      let [num,details2] = details
      details = details2
    } 
    const date = new Date(details.timestamp);
    const options = { month: "short", day: "2-digit" };
    const datePart = date.toLocaleDateString("en-US", options);
    const timePart = date.toTimeString().split(" ")[0];
    const formatted = datePart + ", " + timePart;
    let str = details.user + " reaped at " + formatted + " and gained " + timetoseconds(details.timegain*1000);
    if(details.bonustext){
      str += " " + details.bonustext
    }

    const element = document.getElementById(count);
    if (element) {
      element.innerHTML = str;
    }
    count++;
  }
}

function makeLeaderboard(){
  if(data.starttime > Date.now()){
    return;
  }
  parent.innerHTML = "";
  const table = document.createElement("table");
  table.id = "lbtable";
  table.border = "1";
  const thead = document.createElement("thead");
  const trow = document.createElement("tr");
  table.style.tableLayout = "fixed";
  const colminwidths = ["1ch", "5ch", "3ch", "1ch", "2ch"];
  const headers = ["Rank","Username","Time","Reaps","Average"];
  for (let i=0;i<headers.length;i++){
    const th = document.createElement("th");
    th.textContent = headers[i];
    th.style.padding = "4px 4px";
    th.style.width = colminwidths[i];
    trow.appendChild(th);
  }
  thead.appendChild(trow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const entries = Object.entries(leaderboard);
  entries.sort((a,b) => b[1].time - a[1].time);

  for (let i = 0; i < entries.length; i++){
    const username = entries[i][0];
    const stats = entries[i][1];
    const tr = document.createElement("tr");
    tr.className = "lb-entry";
    tr.id = "rank-" + (i + 1);

    tr.appendChild(createCell(i+1,0));
    tr.appendChild(createCell(username,1));
    tr.appendChild(createCell(stats.time.toFixed(3),2));
    tr.appendChild(createCell(stats.reapcount,3));
    tr.appendChild(createCell((stats.time/stats.reapcount).toFixed(3),4));

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  inject(table.outerHTML,"game","afterend");

  function createCell(text,colIndex){
    const td = document.createElement("td");
    td.style.padding = "4px 4px";
    td.style.whiteSpace = "nowrap"; //Prevent line breaks
    td.style.textAlign = "left";
    td.textContent = text;
    td.style.minWidth = colminwidths[colIndex];
    return td;
  }
}

function timetoseconds(milliseconds){
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);
  seconds %= 60;
  minutes %= 60;
  hours %= 24;
  if (days > 0){
    return (
      days +
      " days, " +
      hours +
      " hours, " +
      minutes +
      " minutes, " +
      seconds +
      " seconds"
    );
  }
  if (hours > 0){
    return hours + " hours, " + minutes + " minutes, " + seconds + " seconds";
  }
  if (minutes > 0){
    return minutes + " minutes, " + seconds + " seconds";
  }
  return seconds + " seconds";
}

function inject(c,q,t){
  document.getElementById(q).insertAdjacentHTML(t,c);
}

async function reaped() {
  const idToken = await user.getIdToken();
  const response = await fetch(link + gamenum + "/reap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}), 
  });
  const data = await response.json();
  if(data.reap.h && !document.getElementById("bomb-container")){
    inject(data.reap.h,"recentreaps","afterend")
  }
  if(!response.ok){
    alert(data.error || "Error during reaping");
    return;
  }
  displayCooldown(Date.now());
  await updateAll();
}

function displayTime(ms){
  document.getElementById("timer").innerHTML = timetoseconds(getTimeFromUnix(ms));
}

function getTimeFromUnix(ms){
  let time = ms - data.starttime;
  if (reaps && Object.keys(reaps).length > 0){
    const [_, lastreap] = reaps[0];
    time = ms - lastreap.timestamp;
  }
  return time;
}

function displayCooldown(ms){
  let cooldownleft = data.cooldown + (userlastreaps[username] || 0) - Date.now();
  document.getElementById("cd").innerHTML = "Cooldown: " + timetoseconds(cooldownleft) + " left";
}

function calcTime(){
  return data.starttime - Date.now();
}

async function updateAll(){
  data = await fetchJSON("/gamedata",gamenum,user);
  reaps = await fetchJSON("/reaps",gamenum,user);
  reaps = Object.entries(reaps).filter(([_, val]) => val !== null);
  userlastreaps = await fetchJSON("/lastuserreap",gamenum,user);

  mostrecentreapdisplay();
}

document.addEventListener("click", async (e) => {
  if (e.target && e.target.id == "bomb-use") {
    const idToken = await user.getIdToken();
    const response = await fetch(link + gamenum + "/usebomb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({})
    });

    if(response.ok){
      const el = document.getElementById("bomb-count");
      let val = parseInt(el.textContent);
      if (!isNaN(val) && val > 0) {
        el.textContent = val - 1;
        if (val - 1 <= 0) {
          document.getElementById("bomb-container").remove();
        }
      }
    }else{
      const err = await response.json();
      alert(err.message || "Failed to use bomb.");
    }
  }
});


document.addEventListener("DOMContentLoaded", async () => {
  user = await checkAuthAndRedirect();
  const json = await fetchJSON("me","",user)
  username = json.username;
  const bd = await fetchJSON("/gb",gamenum,user);
  if(bd){
    inject(bd,"recentreaps","afterend");
  }
  await updateAll();
  leaderboard = await fetchJSON("/leaderboard",gamenum,user);
  makeLeaderboard();

  // Initialize WebSocket
  const socket = new WebSocket("wss://reaperclone.onrender.com?game="+gamenum+"/");
  socket.addEventListener("message", async (event) => {
    const msgData = JSON.parse(event.data);
    if(msgData.type == "reap"){
      const index = Object.keys(reaps).length + 1;
      reaps[index] = msgData.reap;
      const {user,timegain} = msgData.reap;
      userlastreaps[user] = msgData.reap.timestamp;
      mostrecentreapdisplay();
    }

    if(msgData.type == "win"){
      data.winner = msgData.winner;
      data.gamerunning = false;
    }
  });

  socket.addEventListener("close", () => {
    const banner = document.createElement("p");
    banner.innerHTML = "<b>Connection lost. Please refresh the page.</b>";
    document.body.appendChild(banner);

    document.getElementById("reapbutton").disabled = true;
  });

  document.getElementById("reapbutton").addEventListener("click", (e) => {
    if (!e.isTrusted) {
      return;
    }
    reaped();
  });

  setInterval(async function() {
    const now = Date.now();
    document.getElementById("desc").innerHTML = data.description;
    if(data.winner != "" && !data.gamerunning){
      const finalUser = data.winner;
      if(!document.getElementById("winscreen")){
        inject(`<div id="winscreen"><h2>${finalUser} has won Game ${gamenum.substring(4)} of When Reaper.</h2><p style="font-size:16px">See you next time (in an alternate universe)!</p></div>`,"desc","afterend");
        document.getElementById("game").remove();
        document.getElementById("wait").remove();
      }
    }
    if(data.starttime > now){
      const res = "Game starts in " + timetoseconds(data.starttime-now);
      document.getElementById("timeleft").innerHTML = res;
    }else{
      document.getElementById("wait").style.display = "none";
      document.getElementById("game").style.display = "block";
      displayTime(now);
      if(now - (userlastreaps[username] || 0) < data.cooldown){
        document.getElementById("reapstuff").style.display = "none";
        document.getElementById("cooldown").style.display = "block";
        displayCooldown(now);
      }else{
        document.getElementById("reapstuff").style.display = "block";
        document.getElementById("cooldown").style.display = "none";
      }
    }
  }, 1000);
});

