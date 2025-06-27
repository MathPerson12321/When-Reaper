import express from "express";
import http from "http";
import WebSocket, {WebSocketServer} from "ws";
import cors from "cors";
import path from "path";
import admin from "firebase-admin";
import fs from "fs";
import {readFile} from "fs/promises";
import {fileURLToPath} from "url";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const link = "https://reaperclone.onrender.com/";

// Firebase Admin SDK initialization
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "firebase-adminsdk.json"), "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://reaper-clone-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const firestore = admin.firestore();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Logging startup
console.log("Starting Reaper server");

// WebSocket broadcast function - broadcasts to all clients
function broadcast(obj) {
  const json = JSON.stringify(obj);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
 });
}

async function getBonuses(){
  let data = await firestore.collection("bonuses").doc("multipliers").get();
  const bonuses = data.data()
  return bonuses
}

async function addUser(user, id) {
  let users = await getUsers()
  const existing = await firestore.collection("users")
  .where("username", "==", user)
  .get();

  if (!existing.empty) {
    return { success: false, message: "Pick a different username dumbo, be creative"};
  }
  try{
    await firestore.collection("users").doc(id).set({
      username: user,
      wins: 0,
      totalbonuses: 0,
      totaltime: 0,
      banned: false,
      banreason: "",
      gamesplayed: 0,
      totalsnipes: 0,
      totaltimessniped: 0,
      timejoined: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success:true};
  }catch(err){
    console.error("Error in addUser:", err);
    return{success:false, message:err.message};
  }
}


async function isLoggedIn(id) {
  const users = await getUsers();
  console.log(`[BACKEND] Firestore collections:`, users);
  return users.some(user => user.id === id);
}


async function getGames() {
  const now = Date.now();
  const snapshot = await db.ref().once("value");

  const games = snapshot.val();
  if (!games) return [];

  const names = Object.keys(games);

  const gameinfo = await Promise.all(
    names.map(async (name) => {
      const gameSnap = await db.ref(name + "/gamedata").once("value");
      let gamedata = {};
      if (gameSnap.exists()) {
        gamedata = gameSnap.val();
      }
      const starttime = gamedata.starttime;
      let running = false;
      if (now >= starttime) {
        running = true;
      }
      const description = gamedata.description;
      const winner = gamedata.winner

      return {
        name,
        running,
        description,
        winner
      };
   })
  );
  return gameinfo;
}

async function renameLeaderboardKey(gameId, oldKey, newKey) {
  const oldRef = db.ref(`${gameId}/leaderboard/${oldKey}`);
  const newRef = db.ref(`${gameId}/leaderboard/${newKey}`);

  try {
    const snapshot = await oldRef.once("value"); // ✅ use `.once("value")` in admin SDK

    if (!snapshot.exists()) {
      console.error("Old key does not exist");
      return;
    }

    const value = snapshot.val();

    await newRef.set(value);      // ✅ set value to new key
    await oldRef.remove();        // ✅ delete old key

    console.log(`Renamed ${oldKey} to ${newKey}`);
  } catch (err) {
    console.error("Error renaming key:", err);
  }
}

async function updateReapsUsername(gameId, oldUsername, newUsername) {
  const reapsRef = db.ref(`${gameId}/reaps`);
  const snapshot = await reapsRef.once("value"); // ✅

  if (!snapshot.exists()) {
    console.error("No reaps found.");
    return;
  }

  const reaps = snapshot.val();
  const updates = {};

  for (const [reapId, reapData] of Object.entries(reaps)) {
    if (reapData.user === oldUsername) {
      updates[`${reapId}/user`] = newUsername;
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log("No usernames matched to update.");
    return;
  }

  await reapsRef.update(updates); // ✅ apply batch update
  console.log(`Updated usernames from '${oldUsername}' to '${newUsername}'`);
}

async function replaceReaps(olduser,newuser,gamenum){
  await renameLeaderboardKey(gamenum,olduser,newuser);
  await updateReapsUsername(gamenum,olduser,newuser);
}

async function getUsers() {
  const snapshot = await firestore.collection("users").get();
  const users = snapshot.docs.map(doc => (
    {
      id: doc.id,
      ...doc.data()
    }));
  return users;
}

async function loadReaps(gamenum) {
  const snapshot = await db.ref(`game${gamenum}/reaps`).once("value");
  return snapshot.exists() ? snapshot.val() || {} : {};
}

async function saveReaps(gamenum, reaps) {
  await db.ref(`game${gamenum}/reaps`).set(reaps);
}

async function loadLastUserReaps(gamenum) {
  const snapshot = await db.ref(`game${gamenum}/lastuserreap`).once("value");
  return snapshot.exists() ? snapshot.val() || {} : {};
}

async function saveLastUserReaps(gamenum, obj) {
  await db.ref(`game${gamenum}/lastuserreap`).set(obj);
}

async function loadLeaderboard(gamenum) {
  const snapshot = await db.ref(`game${gamenum}/leaderboard`).once("value");
  return snapshot.exists() ? snapshot.val() || {} : {};
}

async function saveLeaderboard(gamenum, lb) {
  await db.ref(`game${gamenum}/leaderboard`).set(lb);
}

async function loadData(gamenum) {
  const snapshot = await db.ref(`game${gamenum}/gamedata`).once("value");
  return snapshot.exists() ? snapshot.val() : null;
}

async function saveData(gamenum, data) {
  await db.ref(`game${gamenum}/gamedata`).update(data);
}

async function getUsername(userId){
  const userdoc = await firestore.collection('users').doc(userId).get();
  const userData = userdoc.data();
  const username = userData.username;
  return username
}

// ------------------ WebSocket connection logs ------------------

wss.on("connection", (ws) => {
  console.log("[WS] New client connected");

  ws.on("message", (message) => {
    console.log("[WS] Received:", message);
 });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
 });
});

// ------------------ API Routes ------------------

app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });  

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lobby.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/games", async (req, res) => {
    const games = await getGames();
    res.json(games);
});  

app.get("/users/:userid", async (req, res) => {
  const id = req.params.userid;
  console.log(`[BACKEND] Checking registration for user: ${id}`);
  const registered = await isLoggedIn(id);
  console.log(`[BACKEND] Registration result: ${registered}`);
  res.json(registered);
});

app.post("/sendchatmessage", async (req, res) => {
  const {userId:id,message:message,keycount:keycount,elapsed:elapsed,url:curlink} = req.body
  if(message.length == 0 || message.length > keycount || elapsed < 50){
    return res.json({msg:"Bro tried to bot chat messages on a useless game and still failed. How bad are you at ts gang 🥀"});
  }
  const username = await getUsername(id)
  const split = curlink.split("/");
  let chat = ""
  console.log(split)
  if(split[split.length-1].includes(".com")){
    chat = "lobby"
  }else{
    chat = split[split.length-1]
  }
  console.log(chat)
  /*await firestore.collection("users").doc(id).set({
    username: user,
    wins: 0,
    totalbonuses: 0,
    totaltime: 0,
    banned: false,
    banreason: "",
    gamesplayed: 0,
    totalsnipes: 0,
    totaltimessniped: 0,
    lastActive: admin.firestore.FieldValue.serverTimestamp()
  });*/

  res.json({msg: "Message received."});
})

app.post("/usercheck", async (req, res) => {
  const {username:name,userid:id} = req.body;
  const json = path.join(__dirname, "profanitydoc.json");
  const file = await readFile(json, "utf-8");
  const bannedwords = JSON.parse(file);
  for (let i = 0; i < bannedwords.length; i++) {
    if (name.toLowerCase().includes(bannedwords[i].toLowerCase())) {
      return res.status(200).json({allowed:"Contains banned term."});
    }
  }
  const result = await addUser(name, id);

  if (!result.success) {
    return res.status(500).json({ allowed: "Failed to add user", error: result.message });
  }

  return res.status(200).json({ allowed: "Good!" });
});

app.get("/game:gameid/", (req, res) => {
    const gameid = req.params.gameid;
    res.sendFile(path.join(__dirname, "public", "gamepage"+gameid+".html"));
});

app.get("/game:gameid/leaderboard", async (req, res) => {
    const gamenum = req.params.gameid;
    try {
      const leaderboard = await loadLeaderboard(gamenum);
      res.json(leaderboard);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error"});
    }
});
  
app.get("/game:gameid/reaps", async (req, res) => {
    const gamenum = req.params.gameid;
    try {
      const reaps = await loadReaps(gamenum);
      res.json(reaps);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error"});
    }
});
  
app.get("/game:gameid/lastuserreap", async (req, res) => {
    const gamenum = req.params.gameid;
    try {
      const last = await loadLastUserReaps(gamenum);
      res.json(last);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error"});
    }
});

app.get("/getusername/:userid", async (req, res) => {
  const userId = req.params.userid;
  let username = await getUsername(userId)
  return res.json(username);
});
  
app.post("/game:gameid/reap", async (req, res) => {
  const gamenum = req.params.gameid;
  const {user:userId} = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing user ID in request body" });
  }

  const username = await getUsername(userId);

  try {
    const data = await loadData(gamenum);
    const now = Date.now();

    if (!data || !data.gamerunning || now < data.starttime) {
      return res.status(400).json({ error: "Game is not running" });
    }

    if (data.winner !== "") {
      return res.status(400).json({ error: "Game has ended" });
    }

    const lastUserReaps = await loadLastUserReaps(gamenum);
    const reaps = await loadReaps(gamenum);
    const leaderboard = await loadLeaderboard(gamenum);

    const userLastReap = lastUserReaps[username] || 0;
    if (now - userLastReap < data.cooldown) {
      const waitTime = data.cooldown - (now - userLastReap);
      return res.status(429).json({ error: `Cooldown active. Wait ${waitTime} ms` });
    }

    const reapTimestamps = Object.values(reaps).map(r => r.timestamp);
    const lastReapTimestamp = reapTimestamps.length > 0 ? Math.max(...reapTimestamps) : data.starttime;

    let timeGained = now - lastReapTimestamp;
    let rawbonuses = await getBonuses();
    let bonuses = Object.entries(rawbonuses).sort((a, b) => b[1] - a[1]);
    let endbonus = 1;
    let counter = 2;
    let text = "";

    for (const key in bonuses) {
      let val = bonuses[key][1] * 10;
      let rand = Math.floor(Math.random() * 1000) + 1;
      if (rand <= val) {
        endbonus = counter;
        text = bonuses[key][0];
      }
      counter += 1;
    }

    timeGained *= endbonus;
    const timeGainedSec = Math.round(timeGained / 1000 * 1000) / 1000;

    const reapNumber = Object.keys(reaps).length + 1;
    const reapEntry = {
      user: username,
      timestamp: now,
      timegain: timeGainedSec,
      bonus: endbonus,
      bonustext: text
    };

    reaps[reapNumber] = reapEntry;
    lastUserReaps[username] = now;

    if (!leaderboard[username]) {
      leaderboard[username] = { time: 0, reapcount: 0 };
    }
    leaderboard[username].time = Math.round((leaderboard[username].time + timeGainedSec) * 1000) / 1000;
    leaderboard[username].reapcount += 1;

    if (leaderboard[username].time*1000 >= data.endtime) {
      data.gamerunning = false;
      data.gameendtime = now;
      data.winner = username;
      await saveData(gamenum, data);
    }

    await saveReaps(gamenum, reaps);
    await saveLastUserReaps(gamenum, lastUserReaps);
    await saveLeaderboard(gamenum, leaderboard);

    broadcast({ type: "reap", reap: reapEntry });

    res.json({
      success: true,
      message: "Reap successful",
      reap: reapEntry,
      cooldown: data.cooldown,
      leaderboard,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/:gameid/gamedata", async (req, res) => {
    const gamenum = req.params.gameid.replace("game", "");
    try {
      const currentTime = Date.now();
      let data = await loadData(gamenum);
      if (!data) {
        return res.status(400).json({ error: "No game data found."});
      }
  
      if (currentTime >= data.starttime) {
        data.gamerunning = true;
        await saveData(gamenum, data);
        return res.status(200).json({ message: "Game marked as running.", data});
      } else {
        return res.status(400).json({ error: "Game hasn't started yet."});
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error"});
    }
});

// ------------------ Static Middleware ------------------

app.use(express.static(path.join(__dirname, "public")));

// ------------------ Catch-all 404 ------------------

app.use((req, res) => {
  console.log(`[SERVER] 404 Not Found for ${req.method} ${req.originalUrl}`);
  res.status(404).send("Not Found");
});

// Whitelisted public paths
const publicPaths = [
    "/",
    /^\/game\d+$/, // matches /game1, /game2, etc.
    /^\/public\//,
];
  
//Block disallowed routes
app.use((req, res, next) => {
    const isAllowed = publicPaths.some((path) => {
      return typeof path === "string"
        ? req.path === path
        : path.test(req.path);
    });
  
    if (!isAllowed && req.method !== "POST" && req.path !== "/healthz") {
      return res.status(403).json({error: "Forbidden"});
    }
    next();
});

// ------------------ Start Server ------------------

server.listen(PORT, () => {
  console.log(`Reaper backend running on port ${PORT}`);

  /*replaceReaps("aiden0626", "yaxuan", "game1").then(() => {
    console.log("✅ replaceReaps done");
  }).catch(err => {
    console.error("❌ replaceReaps error:", err);
  });*/
});
