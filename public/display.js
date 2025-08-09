import {checkAuthAndRedirect} from "./authcheck.js";
import app from './firebase.js';
import {getAuth} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";

let data = null;
let leaderboard = null;
let user = null;

const link = "https://reaperclone.onrender.com/";
const gamenum = "game1";

async function fetchJSON(path,path2){
  const idToken = await user.getIdToken();
  let res = await fetch(link+path2+path, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
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

function inject(c,q,t){
  document.getElementById(q).insertAdjacentHTML(t,c);
}

async function pageLoad(){
  [data,leaderboard] = await Promise.all([
    fetchJSON("/gamedata", gamenum, user),
    fetchJSON("/leaderboard",gamenum,user)
  ]);
  makeLeaderboard();
}

document.addEventListener("DOMContentLoaded", async () => {
  user = await checkAuthAndRedirect();
  const json = await fetchJSON("me","",user)
  username = json.username;
  await pageLoad();
  document.getElementById("desc").innerHTML = data.description;

  const now = Date.now();
  if(data.winner != "" && data.winner != null && !data.gamerunning){
    const finalUser = data.winner;
    if(!document.getElementById("winscreen")){
      inject(`<div id="winscreen"><h2>${finalUser} has won Game ${gamenum.substring(4)} of When Reaper.</h2><p style="font-size:16px">See you next time (in an alternate universe)!</p></div>`,"desc","afterend");
      document.getElementById("game").remove();
      document.getElementById("wait").remove();
    }
  }
});


