import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import path from "path";
import admin from "firebase-admin";
import fs from "fs";
import {readFile} from "fs/promises";
import {fileURLToPath} from "url";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reapingLocks = new Set(); // Prevents simultaneous reaps by same user
const link = "https://reaperclone.onrender.com/";

// Firebase Admin SDK initialization
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname,"firebase-adminsdk.json"),"utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:"https://reaper-clone-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const firestore = admin.firestore();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Middleware to authenticate Firebase ID token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const idToken = req.body.idToken || (authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null);

  if (!idToken) {
    return res.status(401).json({error:"Missing ID token" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // contains uid
    next();
  } catch (err) {
    console.error("[AUTHerror]", err);
    return res.status(401).json({error:"Invalid or expired ID token" });
  }
}

// Broadcast helper for WebSocket
function broadcast(obj) {
  const json = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

async function getBonuses() {
  let data = await firestore.collection("bonuses").doc("multipliers").get();
  return data.data();
}

async function getDivisors() {
  let data = await firestore.collection("bonuses").doc("dividers").get();
  return data.data();
}

async function addUser(user, id) {
  const existing = await firestore
    .collection("users")
    .where("username","==", user)
    .get();

  if (!existing.empty) {
    return { success: false, message:"Pick a different username dumbo, be creative" };
  }
  try {
    await firestore.collection("users").doc(id).set({
      username: user,
      wins: 0,
      totalbonuses: 0,
      totaltime: 0,
      banned: false,
      banreason:"",
      gamesplayed: 0,
      totalsnipes: 0,
      totaltimessniped: 0,
      timejoined: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error("Error in addUser:", err);
    return { success: false, message: err.message };
  }
}

async function getUsers() {
  const snapshot = await firestore.collection("users").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function isLoggedIn(id) {
  const users = await getUsers();
  return users.some((user) => user.id === id);
}

async function getUsername(userId) {
  const userdoc = await firestore.collection("users").doc(userId).get();
  const userData = userdoc.data();
  if (!userData) throw newerror("User not found");
  return userData.username;
}

async function getGames() {
  const now = Date.now();
  const snapshot = await db.ref().once("value");

  const games = snapshot.val();
  if (!games) return [];

  const names = Object.keys(games);

  const gameinfo = await Promise.all(
    names.map(async (name) => {
      const gameSnap = await db.ref(name +"/gamedata").once("value");
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
      const winner = gamedata.winner;

      return {
        name,
        running,
        description,
        winner,
      };
    })
  );
  return gameinfo;
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

function getChat(curlink){
  const split = curlink.split("/");
  if (split[split.length - 1] ==="") {
    split.pop();
  }
  let chat ="";
  if (split[split.length - 1].includes(".com")) {
    chat ="lobby";
  } else {
    chat = split[split.length - 1];
  }
  return chat
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
  res.sendFile(path.join(__dirname,"public","lobby.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname,"public","login.html"));
});

app.get("/games", async (req, res) => {
  const games = await getGames();
  res.json(games);
});

app.get("/users/:userid", async (req, res) => {
  const id = req.params.userid;
  const registered = await isLoggedIn(id);
  res.json(registered);
});

app.get("/users/:userid", async (req, res) => {
  const id = req.params.userid;
  const registered = await isLoggedIn(id);
  res.json(registered);
});

app.post("/loadchatmessages", authenticateToken, async (req, res) => {
  const {url,limit,before} = req.body;
  const userId = req.user.uid; // Firebase ID token validation

  // Cap the limit to prevent abuse
  const maxlimit = 50;
  const safeLimit = Math.min(parseInt(limit) || 50, maxlimit);

  // Optional: validate chatUrl
  if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Invalid chatUrl" });
  }
  let chat = getChat(url)
  const chatRef = firestore.collection("gamechat").doc(chat+"chat");
  let query = chatRef.collection("messages")
    .orderBy("timestamp")
    .limit(safeLimit);

  if(before){
      //Convert string to Firestore Timestamp (if needed)
      query = query.startAfter(new Date(before));
  }

  const snapshot = await query.get();
  const messages = snapshot.docs.map(doc => doc.data());

  res.json(messages);
});


// Route to send chat messages - secured with token
app.post("/sendchatmessage", authenticateToken, async (req, res) => {
  const { message, keycount, elapsed, url: curlink } = req.body;
  const userId = req.user.uid;

  if (!message || message.length === 0) {
    return res.json({ msg:"Trying to send an empty message, I'm not that stupid 🥀" });
  }
  if (message.length > keycount || elapsed < 50) {
    return res.json({ msg:"Bro tried to bot chat messages on a useless game and still failed. How bad are you at ts gang 🥀" });
  }
  const username = await getUsername(userId);
  let chat = getChat(curlink)
  const chatDocRef = firestore.collection("gamechat").doc(chat +"chat");
  const chatDoc = await chatDocRef.get();
  const chatData = chatDoc.exists ? chatDoc.data() : {};

  const messageCount = Object.keys(chatData).length + 1; //Next message

  const newMessage = {
    userid: userId,
    username,
    message,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await chatDocRef.set({ [messageCount]: newMessage }, { merge: true });

  res.json({ msg:"Message received." });
});

// User creation / check route - token required
app.post("/usercheck", authenticateToken, async (req, res) => {
  const { username: name } = req.body;
  const id = req.user.uid;

  // Profanity check
  const json = path.join(__dirname,"profanitydoc.json");
  const file = await readFile(json,"utf-8");
  const bannedwords = JSON.parse(file);
  for (let i = 0; i < bannedwords.length; i++) {
    if (name.toLowerCase().includes(bannedwords[i].toLowerCase())) {
      return res.status(200).json({ allowed:"Contains banned term." });
    }
  }

  const result = await addUser(name, id);
  if (!result.success) {
    return res.status(500).json({ allowed:"Failed to add user",error: result.message });
  }

  return res.status(200).json({ allowed:"Good!" });
});

app.get("/game:gameid/", (req, res) => {
  const gameid = req.params.gameid;
  res.sendFile(path.join(__dirname,"public","gamepage" + gameid +".html"));
});

app.get("/game:gameid/leaderboard", async (req, res) => {
  const gamenum = req.params.gameid;
  try {
    const leaderboard = await loadLeaderboard(gamenum);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Internal servererror" });
  }
});

app.get("/game:gameid/reaps", async (req, res) => {
  const gamenum = req.params.gameid;
  try {
    const reaps = await loadReaps(gamenum);
    res.json(reaps);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Internal server error" });
  }
});

app.get("/game:gameid/lastuserreap", async (req, res) => {
  const gamenum = req.params.gameid;
  try {
    const last = await loadLastUserReaps(gamenum);
    res.json(last);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Internal servererror" });
  }
});

app.get("/getusername/:userid", async (req, res) => {
  const userId = req.params.userid;
  try {
    let username = await getUsername(userId);
    return res.json(username);
  } catch {
    return res.status(404).json({error:"User not found" });
  }
});

// Reap route - secured with token auth
app.post("/game:gameid/reap", authenticateToken, async (req, res) => {
  const gamenum = req.params.gameid;
  const userId = req.user.uid;

  if (reapingLocks.has(userId)) {
    return res.status(429).json({error:"Reap already in progress" });
  }

  reapingLocks.add(userId);

  try {
    const username = await getUsername(userId);
    const data = await loadData(gamenum);
    const now = Date.now();

    if (!data || !data.gamerunning || now < data.starttime) {
      return res.status(400).json({error:"Game is not running" });
    }

    if (data.winner !=="") {
      return res.status(400).json({error:"Game has ended" });
    }

    const lastUserReaps = await loadLastUserReaps(gamenum);
    const reaps = await loadReaps(gamenum);
    const leaderboard = await loadLeaderboard(gamenum);

    const userLastReap = lastUserReaps[username] || 0;
    if (now - userLastReap < data.cooldown) {
      const waitTime = data.cooldown - (now - userLastReap);
      return res.status(429).json({error: `Cooldown active. Wait ${waitTime} ms` });
    }

    const reapTimestamps = Object.values(reaps).map((r) => r.timestamp);
    const lastReapTimestamp =
      reapTimestamps.length > 0 ? Math.max(...reapTimestamps) : data.starttime;

    let timeGained = now - lastReapTimestamp;
    const rawbonuses = await getBonuses();
    const rawdividers = await getDivisors();
    const bonuses = Object.entries(rawbonuses).sort((a, b) => b[1] - a[1]);
    const divisors = Object.entries(rawdividers);

    // Multiplier
    let endbonus = 1;
    let divider = 1;
    let counter = 2;
    let text ="";

    for (const key in bonuses) {
      const val = bonuses[key][1] * 10;
      const rand = Math.floor(Math.random() * 1000) + 1;
      if (rand <= val) {
        endbonus = counter;
        text = bonuses[key][0];
      }
      counter++;
    }
    timeGained *= endbonus;

    if (endbonus == 1) {
      // Divide
      for (const key in divisors) {
        const divide = divisors[key][1][0];
        const val = divisors[key][1][1] * 10;
        const rand = Math.floor(Math.random() * 1000) + 1;
        if (rand <= val) {
          divider = divide;
          text = divisors[key][0];
        }
        counter++;
      }
      timeGained /= divider;
    }

    const timeGainedSec = Math.round((timeGained / 1000) * 1000) / 1000;

    const reapNumber = Object.keys(reaps).length + 1;
    const reapEntry = {
      user: username,
      timestamp: now,
      timegain: timeGainedSec,
      bonus: endbonus,
      divided: divider,
      bonustext: text,
    };

    reaps[reapNumber] = reapEntry;
    lastUserReaps[username] = now;

    if (!leaderboard[username]) {
      leaderboard[username] = { time: 0, reapcount: 0 };
    }

    leaderboard[username].time = Math.round(
      (leaderboard[username].time + timeGainedSec) * 1000
    ) / 1000;
    leaderboard[username].reapcount += 1;

    if (leaderboard[username].time * 1000 >= data.endtime) {
      data.gamerunning = false;
      data.gameendtime = now;
      data.winner = username;
      await saveData(gamenum, data);
    }

    await saveReaps(gamenum, reaps);
    await saveLastUserReaps(gamenum, lastUserReaps);
    await saveLeaderboard(gamenum, leaderboard);

    broadcast({ type:"reap", reap: reapEntry });

    res.json({
      success: true,
      message:"Reap successful",
      reap: reapEntry,
      cooldown: data.cooldown,
      leaderboard,
    });
  } catch (err) {
    console.error("[REAPerror]", err);
    res.status(500).json({error:"Internal servererror" });
  } finally {
    reapingLocks.delete(userId);
  }
});

app.get("/:gameid/gamedata", async (req, res) => {
  const gamenum = req.params.gameid.replace("game","");
  try {
    const currentTime = Date.now();
    let data = await loadData(gamenum);
    if (!data) {
      return res.status(400).json({error:"No game data found." });
    }

    if (currentTime >= data.starttime) {
      if (data.gamerunning === false) {
        data.gamerunning = true;
        await saveData(gamenum, data);
      }
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Internal servererror" });
  }
});

// ------------------ Static Middleware ------------------

app.use(express.static(path.join(__dirname,"public")));

// ------------------ Catch-all 404 ------------------

app.use((req, res) => {
  console.log(`[SERVER] 404 Not Found for ${req.method} ${req.originalUrl}`);
  res.status(404).send("Not Found");
});

const publicPaths = [
 "/",
  /^\/game\d+$/,
  /^\/public\//,
];

app.use((req, res, next) => {
  const isAllowed = publicPaths.some((path) => {
    return typeof path ==="string" ? req.path === path : path.test(req.path);
  });

  if (!isAllowed && req.method !=="POST" && req.path !=="/healthz") {
    return res.status(403).json({error:"Forbidden" });
  }
  next();
});

// ------------------ Start Server ------------------ 
server.listen(PORT, () => {
  console.log(`Reaper backend running on port ${PORT}`);

  /*replaceReaps("aiden0626","yaxuan","game1").then(() => {
    console.log("✅ replaceReaps done");
  }).catch(err => {
    console.error("❌ replaceReaps error:", err);
  });*/
});
