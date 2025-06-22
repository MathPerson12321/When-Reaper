import {checkAuthAndRedirect} from "./authcheck.js";

let data = null;
let userlastreaps = null;
let reaps = null;
let leaderboard = null;
let userId = null;
let username = null;

const link = "https://reaperclone.onrender.com/";
const gamenum = "game2";

async function fetchJSON(path,path2){
  const res = await fetch(link+path2+path);
  return await res.json();
}

async function writeData(path,path2){
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

  for (let i = arr.length - 1; i >= 0 && count <= 10; i--){
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

    const element = document.getElementById(count);
    if (element) {
      element.innerHTML = str;
    }
    count++;
  }
}

function makeLeaderboard(){
  const parent = document.getElementById("leaderboard");
  parent.innerHTML = "";
  const table = document.createElement("table");
  table.id = "lbtable";
  table.border = "1";
  const thead = document.createElement("thead");
  const trow = document.createElement("tr");

  const headers = ["Rank","UserID","Time","Reaps","Average"];
  for (let header of headers){
    const th = document.createElement("th");
    th.textContent = header;
    trow.appendChild(th);
  }
  thead.appendChild(trow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const entries = Object.entries(leaderboard);
  entries.sort((a,b) => b[1].time - a[1].time);

  for (let i = 0; i < entries.length; i++){
    const userid = entries[i][0];
    const stats = entries[i][1];
    const tr = document.createElement("tr");
    tr.className = "lb-entry";
    tr.id = "rank-" + (i + 1);

    tr.appendChild(createCell(i + 1));
    tr.appendChild(createCell(userid));
    tr.appendChild(createCell(stats.time));
    tr.appendChild(createCell(stats.reapcount));
    tr.appendChild(createCell((stats.time / stats.reapcount).toFixed(3)));

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  parent.appendChild(table);

  function createCell(text){
    const td = document.createElement("td");
    td.textContent = text;
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

async function reaped(){
  const response = await fetch(link+gamenum+"/reap/"+userId, {
    method: "POST",
  });

  const result = await response.json();
  await updateAll();
}

function displayTime(ms){
  document.getElementById("timer").innerHTML = timetoseconds(getTimeFromUnix(ms));
}

function getTimeFromUnix(ms){
  let time = ms - data.starttime;
  if (reaps && Object.keys(reaps).length > 0){
    const keys = Object.keys(reaps).map((k) => parseInt(k));
    const max = Math.max(...keys);
    let lastreap = reaps[max]
    if(!lastreap.timestamp){
      let [num,lastreap2] = reaps[max];
      lastreap = lastreap2
    }
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
  data = await fetchJSON("/gamedata",gamenum);
  reaps = await fetchJSON("/reaps",gamenum);
  reaps = Object.entries(reaps).filter(([_, val]) => val !== null);
  userlastreaps = await fetchJSON("/lastuserreap",gamenum);
  leaderboard = await fetchJSON("/leaderboard",gamenum);

  makeLeaderboard();
  mostrecentreapdisplay();
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuthAndRedirect();
  userId = user.uid;
  username = await fetchJSON("/"+userId,"getusername")

  await updateAll();

  // Initialize WebSocket
  const socket = new WebSocket("wss://reaperclone.onrender.com?game=" + gamenum);
  socket.addEventListener("message", async (event) => {
    const msgData = JSON.parse(event.data);
    if (msgData.type === "reap"){
      const index = Object.keys(reaps).length + 1;
      reaps[index] = msgData.reap;
      const {user,timegain} = msgData.reap;

      if(!leaderboard[user]){
        leaderboard[user] = {time:0, reapcount:0};
      }
      leaderboard[user].time += timegain;
      leaderboard[user].reapcount += 1;

      userlastreaps[user] = msgData.reap.timestamp;

      makeLeaderboard();
      mostrecentreapdisplay();
    }
  });

  document.getElementById("reapbutton").addEventListener("click", reaped);

  setInterval(async function () {
    const unixtime = Date.now();
    if (data.starttime > unixtime){
      const res = "Game starts in " + timetoseconds(calcTime());
      document.getElementById("timeleft").innerHTML = res;
    } else {
      data.gamerunning = true;
      await writeData("/gamedata",gamenum);

      document.getElementById("wait").style.display = "none";
      document.getElementById("game").style.display = "block";
      displayTime(Date.now());

      if(Date.now() - (userlastreaps[username] || 0) < data.cooldown){
        document.getElementById("reapstuff").style.display = "none";
        document.getElementById("cooldown").style.display = "block";
        displayCooldown(Date.now());
      } else {
        document.getElementById("reapstuff").style.display = "block";
        document.getElementById("cooldown").style.display = "none";
      }
    }
  }, 1000);
});

