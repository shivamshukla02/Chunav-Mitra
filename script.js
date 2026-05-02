const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const historyContainer = document.getElementById('chat-history');
const submitBtn = form.querySelector('button');

// Keep track of conversation for context
let chatHistory = [];

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // 1. Display User Message
    appendMessage(message, 'user');
    input.value = '';
    submitBtn.disabled = true;

    // 2. Fetch Bot Response
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: chatHistory, message: message })
        });

        const data = await response.json();
        
        if (data.success) {
            // 3. Display Bot Response
            appendMessage(data.text, 'bot');
            
            // 4. Update History for Context
            chatHistory.push({ role: "user", parts: [{ text: message }] });
            chatHistory.push({ role: "model", parts: [{ text: data.text }] });
        } else {
            appendMessage("Sorry, I encountered an error. Please try again.", 'bot');
        }
    } catch (error) {
        appendMessage("Network error. Please make sure the server is running.", 'bot');
    } finally {
        submitBtn.disabled = false;
        input.focus();
    }
});

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    
    // Simple markdown parsing for bold text and new lines
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
        
    div.innerHTML = `<div class="message-content">${formattedText}</div>`;
    historyContainer.appendChild(div);
    
    // Auto-scroll to bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
}
