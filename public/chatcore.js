import {checkAuthAndRedirect} from "./authcheck.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";
import app from './firebase.js';
const link = "https://reaperclone.onrender.com/";
const auth = getAuth(app);
const currentUser = auth.currentUser;

let lastTimestamp = null;
let loading = false;

let typing = false;
let start = null;
let keycount = 0;

async function loadMessages(limit,user){
    if (loading) return;
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
    if (messages.length > 0) {
        const firstTimestamp = messages[0].timestamp;
        if (firstTimestamp.toDate) {
          lastTimestamp = firstTimestamp.toDate().toISOString();
        } else {
          lastTimestamp = firstTimestamp;
        }
    }
    loading = false;
    return messages;
}

async function sendMessage(user){
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
        }
    }catch(err){
        console.error("Error sending message:", err);
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
  
    //Chat window area
    const chatWindow = document.createElement("div");
    chatWindow.style.flex = "1";
    chatWindow.style.padding = "10px";
    chatWindow.style.overflowY = "auto";
    chatWindow.style.fontSize = "14px";
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
        const msgdiv = document.createElement("div");
        msgdiv.textContent = msg.username+": " + msg.message;
        chatWindow.prepend(msgdiv);
    }

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
  