document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.createElement('div');
    chatContainer.style.width = '300px';
    chatContainer.style.height = '400px';
    chatContainer.style.border = '2px solid #ccc';
    chatContainer.style.borderRadius = '12px';
    chatContainer.style.display = 'flex';
    chatContainer.style.flexDirection = 'column';
    chatContainer.style.position = 'fixed';
    chatContainer.style.bottom = '20px';
    chatContainer.style.right = '20px';
    chatContainer.style.background = '#fff';
    chatContainer.style.fontFamily = 'Arial, sans-serif';
    chatContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    document.body.appendChild(chatContainer);
  
    //Chat window area
    const chatWindow = document.createElement('div');
    chatWindow.style.flex = '1';
    chatWindow.style.padding = '10px';
    chatWindow.style.overflowY = 'auto';
    chatWindow.style.fontSize = '14px';
    chatContainer.appendChild(chatWindow);
  
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.borderTop = '2px solid #ccc';
  
    //Input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a message...';
    input.style.border = 'none';
    input.style.padding = '10px';
    input.style.outline = 'none';
    input.style.flex = '1';
  
    //Send button
    const button = document.createElement('button');
    button.innerText = 'Send';
    button.style.width = '60px';
    button.style.border = 'none';
    button.style.color = '#fff';

    inputContainer.appendChild(input);
    inputContainer.appendChild(button);
    chatContainer.appendChild(inputContainer);
});
  