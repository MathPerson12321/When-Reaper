import {checkAuthAndRedirect} from "./authcheck.js";
const link = "https://reaperclone.onrender.com/";

document.addEventListener("DOMContentLoaded", async() => {
    const user = await checkAuthAndRedirect();
    let userId = user.uid;
    let username = await fetchJSON("/"+userId,"getusername")

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

    let typing = false;
    let start = null;
    let keycount = 0;

    input.addEventListener("keydown", () => {
        if(!typing){
            typing = true;
            start = Date.now();
        }
        keycount++;
    });
    button.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if(e.key == "Enter"){
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = input.value.trim();
        const elapsed = Date.now() - start;
        if(message.length == 0 || message.length > keycount || elapsed < 50){
            alert("Stop botting.");
            return;
        }
        const data = {
            userId: localStorage.getItem("userId"),
            username: localStorage.getItem("username"),
            message,
            keycount,
            elapsed
        };
        try{
            const res = await fetch(link+"sendchatmessage", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data),
                url: window.location.href
            });

            const result = await res.json();
            if(!res.ok){
                alert(result.error || "Failed to send message.");
            }else{
                if(result != ""){
                    alert(result)
                }
                input.value = "";
                typing = false;
                keyCount = 0;
            }
        }catch(err){
            console.error("Error sending message:", err);
        }
    }
});
  