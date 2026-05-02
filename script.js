'use strict';

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const historyContainer = document.getElementById('chat-history');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const langToggle = document.getElementById('lang-toggle');
const clearBtn = document.getElementById('clear-btn');
const quickReplies = document.getElementById('quick-replies');
const headerSubtitle = document.getElementById('header-subtitle');

// ===== STATE =====
let chatHistory = [];
let currentLang = 'auto'; // 'auto' | 'hi' | 'en'
let isProcessing = false;

const i18n = {
    en: {
        subtitle: 'Your unbiased guide to the Indian election process',
        placeholder: 'Ask about voting, voter ID, EVM...',
        clearConfirm: 'Clear the conversation?',
        networkError: '⚠️ Network error. Please check your connection and try again.',
        serverError: '⚠️ Election servers are busy. Please try again in a moment.',
        rateLimit: '⏳ You\'re sending messages too fast. Please wait a moment.',
    },
    hi: {
        subtitle: 'भारतीय चुनाव प्रक्रिया में आपका निष्पक्ष मार्गदर्शक',
        placeholder: 'मतदाता पहचान पत्र, EVM के बारे में पूछें...',
        clearConfirm: 'बातचीत मिटाएं?',
        networkError: '⚠️ नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
        serverError: '⚠️ सर्वर व्यस्त है। कृपया दोबारा कोशिश करें।',
        rateLimit: '⏳ बहुत तेज़ संदेश भेज रहे हैं। थोड़ा रुकें।',
    }
};

// ===== LANGUAGE TOGGLE =====
langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'hi' ? 'en' : 'hi';
    langToggle.textContent = currentLang === 'hi' ? 'EN / हिं' : 'हिं / EN';
    langToggle.setAttribute('aria-label', currentLang === 'hi' ? 'Switch to English' : 'Switch to Hindi');
    const t = i18n[currentLang] || i18n.en;
    headerSubtitle.textContent = t.subtitle;
    input.placeholder = t.placeholder;
});

// ===== CLEAR CHAT =====
clearBtn.addEventListener('click', () => {
    const t = i18n[currentLang] || i18n.en;
    if (confirm(t.clearConfirm)) {
        chatHistory = [];
        // Remove all messages except the first welcome message
        const messages = historyContainer.querySelectorAll('.message');
        messages.forEach((msg, i) => { if (i > 0) msg.remove(); });
    }
});

// ===== QUICK REPLY CHIPS =====
quickReplies.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || isProcessing) return;
    const msg = chip.dataset.msg;
    if (msg) {
        input.value = msg;
        form.dispatchEvent(new Event('submit'));
    }
});

// ===== FORM SUBMIT =====
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message || isProcessing) return;

    isProcessing = true;
    appendMessage(message, 'user');
    input.value = '';
    setLoading(true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: chatHistory,
                message: message,
                language: currentLang
            })
        });

        const data = await response.json();
        const t = i18n[currentLang] || i18n.en;

        if (response.status === 429) {
            appendMessage(t.rateLimit, 'bot');
        } else if (data.success) {
            appendMessage(data.text, 'bot');
            // Detect language from response and auto-switch UI hint
            if (data.language === 'hi' && currentLang === 'auto') {
                headerSubtitle.textContent = i18n.hi.subtitle;
            }
            // Update history
            chatHistory.push({ role: 'user', parts: [{ text: message }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.text }] });
            // Keep history bounded to last 20 turns (10 exchanges) to avoid token overflow
            if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        } else {
            appendMessage(t.serverError, 'bot');
        }
    } catch (err) {
        const t = i18n[currentLang] || i18n.en;
        appendMessage(t.networkError, 'bot');
        console.error('Chat error:', err);
    } finally {
        setLoading(false);
        isProcessing = false;
        input.focus();
    }
});

// ===== UI HELPERS =====
function setLoading(state) {
    sendBtn.disabled = state;
    typingIndicator.classList.toggle('hidden', !state);
    if (state) historyContainer.scrollTop = historyContainer.scrollHeight;
}

function appendMessage(text, sender) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${sender}-message`;

    if (sender === 'bot') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = '🤖';
        wrapper.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-content';

    // Markdown-lite: bold, italic, newlines, links
    const formatted = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // XSS safe
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = formatted;
    wrapper.appendChild(bubble);
    historyContainer.appendChild(wrapper);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // SW optional — fail silently
        });
    });
}
