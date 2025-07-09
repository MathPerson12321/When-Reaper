import {checkAuthAndRedirect} from "./authcheck.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";
import app from './firebase.js';
const link = "https://reaperclone.onrender.com/";
const auth = getAuth(app);
let cansend = true

function getChat(){
    let curlink = window.location.href;
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
    return chat;
}

let lastTimestamp = null;
let loading = false;
let allLoaded = false;
let typing = false;
let start = null;
let keycount = 0;

async function loadMessages(limit,user){
    if (loading || allLoaded) return [];
    loading = true;
    const idToken = await user.getIdToken();
    const data = {
        url: window.location.href,
        limit: limit,
        before: lastTimestamp
    };
    const res = await fetch(link + "loadchatmessages", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
    });
    let messages = await res.json();
    if (messages.length == 0) {
        allLoaded = true;
        loading = false;
        return [];
    }
    const firstmsg = messages[0];
    const firstTimestampRaw = firstmsg.timestamp;
    if(firstTimestampRaw.toDate){
        lastTimestamp = firstTimestampRaw.toDate().toISOString();
    }else if(firstTimestampRaw._seconds){
        lastTimestamp = new Date(firstTimestampRaw._seconds*1000 + firstTimestampRaw._nanoseconds/1e6).toISOString();
    }else{
        lastTimestamp = firstTimestampRaw;
    }
    loading = false;
    return messages;
}

async function sendMessage(user){
    if(!cansend){
        alert("Please wait 5 seconds before sending another message.");
        return;
    }
    const message = document.getElementById("chatmsgcontent").value.trim();
    const elapsed = Date.now() - start;
    if(message.length == 0){
        alert("Please type something.")
        return
    }
    if(message.length > keycount || elapsed < 50){
        alert("Stop botting.");
        return;
    }
    try {
        if (!user) {
            return;
        }
        cansend = false;
        const idToken = await user.getIdToken();
        const data = {
            message,
            keycount,
            elapsed,
            url: window.location.href,
        };
        const res = await fetch(link + "sendchatmessage", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if(!res.ok){
            alert(result.error || "Failed to send message.");
        }else{
            document.getElementById("chatmsgcontent").value = "";
            typing = false;
            keycount = 0;
            setTimeout(() => {
                cansend = true;
            }, 5000);
        }
    }catch(err){
        console.error("Error sending message:", err);
    }
}

function addMessage(username,message,prepend = false){
    const msgdiv = document.createElement("div");
    msgdiv.innerHTML = "<b>"+username+":</b> " + message;
    if(username == "MathPerson12321"){
        msgdiv.innerHTML = "<b>👑 "+username+":</b> " + message;
    }
    let chatWindow = document.getElementById("chatwindow");
    if(prepend){
        chatWindow.insertBefore(msgdiv, chatWindow.firstChild);
    }else{
        chatWindow.appendChild(msgdiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

document.addEventListener("DOMContentLoaded", async() => {
    const user = await checkAuthAndRedirect();
    if (!user) {
        return;
    }
    //Chat
    const chatContainer = document.createElement("div");
    chatContainer.style.width = "300px";
    chatContainer.style.height = "400px";
    chatContainer.style.border = "1.5px solid #ccc";
    chatContainer.style.borderRadius = "12px";
    chatContainer.style.display = "flex";
    chatContainer.style.flexDirection = "column";
    chatContainer.style.position = "fixed";
    chatContainer.style.bottom = "20px";
    chatContainer.style.right = "20px";
    chatContainer.style.background = "#fff";
    chatContainer.style.fontFamily = "Arial, sans-serif";
    chatContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";
    document.body.appendChild(chatContainer);

    //Header
    const chatHeader = document.createElement("div");
    chatHeader.style.flex = "0 0 auto";
    chatHeader.style.overflowY = "auto";
    chatHeader.style.padding = "10px";
    chatHeader.style.borderBottom = "1.5px solid #ccc";
    const headerText = document.createElement("h1");
    let cr = getChat();
    if(cr.substring(0,4) == "game"){
        headerText.innerHTML = "Game " + cr.slice(4) + " Chat";
    }else{
        headerText.innerHTML = cr.charAt(0).toUpperCase() + cr.slice(1) + " Chat";
    }
    headerText.style.textAlign = "center";
    headerText.style.fontSize = "20px";
    chatHeader.appendChild(headerText);
    chatContainer.appendChild(chatHeader);
  
    //Chat window area
    const chatWindow = document.createElement("div");
    chatWindow.style.flex = "1";
    chatWindow.style.padding = "10px";
    chatWindow.style.overflowY = "auto";
    chatWindow.style.fontSize = "14px";
    chatWindow.id = "chatwindow";
    chatContainer.appendChild(chatWindow);
  
    const inputContainer = document.createElement("div");
    inputContainer.style.display = "flex";
    inputContainer.style.borderTop = "1.5px solid #ccc";
  
    //Input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a message...";
    input.style.border = "none";
    input.style.padding = "10px";
    input.style.outline = "none";
    input.style.flex = "1";
    input.id = "chatmsgcontent";
  
    //Send button
    const button = document.createElement("button");
    button.innerText = "Send";
    button.style.width = "60px";
    button.style.border = "none";
    button.style.color = "#fff";
    button.style.background = "#A9A9A9";
    button.style.cursor = "pointer";

    inputContainer.appendChild(input);
    inputContainer.appendChild(button);
    chatContainer.appendChild(inputContainer);

    let messages = await loadMessages(50,user);
    for (const msg of messages) {
        addMessage(msg.username,msg.message);
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
    chatWindow.addEventListener("scroll", async () => {
        if(chatWindow.scrollTop <= 5 && !loading && !allLoaded){
          const oldHeight = chatWindow.scrollHeight;
          const older = await loadMessages(50,user);
          for(const msg of older){
            addMessage(msg.username,msg.message,true);
          }
          chatWindow.scrollTop = chatWindow.scrollHeight-oldHeight;
        }
    });

    let chatroom = getChat();
    const ws = new WebSocket(`wss://reaperclone.onrender.com/?room=${chatroom}`);
    ws.addEventListener("open", () => {
        console.log("WebSocket connected to room:", chatroom);
    });
    ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "chatmessage") {
            if(data.chat == chatroom){
                const {username, message} = data.message;
                addMessage(username,message);
            }
        }
    });
    ws.addEventListener("close", () => {
        input.disabled = true;
        button.disabled = true;
        input.placeholder = "Disconnected. Please refresh.";
    });

    input.addEventListener("keydown", () => {
        if(!typing){
            typing = true;
            start = Date.now();
        }
        keycount++;
    });
    button.addEventListener("click", () => sendMessage(user));
    input.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){
            sendMessage(user);
        }
    });
});
  