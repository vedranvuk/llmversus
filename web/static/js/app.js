const messages = document.getElementById('messages');
const promptInput = document.getElementById('prompt-input');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resetButton = document.getElementById('reset-button');
const model1Select = document.getElementById('model1-select');
const model2Select = document.getElementById('model2-select');
const model1Temperature = document.getElementById('model1-temperature');
const model1TopP = document.getElementById('model1-top-p');
const model1MaxTokens = document.getElementById('model1-max-tokens');
const model1ContextSize = document.getElementById('model1-context-size');
const model2Temperature = document.getElementById('model2-temperature');
const model2TopP = document.getElementById('model2-top-p');
const model2MaxTokens = document.getElementById('model2-max-tokens');
const model2ContextSize = document.getElementById('model2-context-size');

let ws;

function scrollToBottom() {
    // Use a small delay to ensure DOM updates are complete
    setTimeout(() => {
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            const oldScrollTop = mainContainer.scrollTop;
            const scrollHeight = mainContainer.scrollHeight;
            mainContainer.scrollTop = scrollHeight;
            console.log(`Scrolling: oldScrollTop=${oldScrollTop}, scrollHeight=${scrollHeight}, newScrollTop=${mainContainer.scrollTop}`);
        }
    }, 10);
}

function connect() {
    ws = new WebSocket(`ws://${window.location.host}/chat`);

    ws.onopen = () => {
        console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const participant = data.participant;
        let content = data.content;

        let lastMessage = messages.lastElementChild;
        let messageElement;

        if (lastMessage && lastMessage.dataset.participant == participant) {
            messageElement = lastMessage;
        } else {
            messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.dataset.participant = participant;
            messageElement.dataset.state = 'reply'; // Initial state
            
            if (participant === 1) {
                messageElement.classList.add('model-1');
            } else {
                messageElement.classList.add('model-2');
            }
            messages.appendChild(messageElement);
        }

        let currentState = messageElement.dataset.state;
        let remainingContent = content;

        while (remainingContent) {
            if (currentState === 'reply') {
                const thinkIndex = remainingContent.indexOf('<think>');
                if (thinkIndex !== -1) {
                    // Append text before <think> to reply
                    appendContent(messageElement, 'reply', remainingContent.substring(0, thinkIndex));
                    // Transition to thinking state
                    currentState = 'thinking';
                    messageElement.dataset.state = 'thinking';
                    remainingContent = remainingContent.substring(thinkIndex + 7);
                } else {
                    appendContent(messageElement, 'reply', remainingContent);
                    remainingContent = '';
                }
            } else if (currentState === 'thinking') {
                const thinkEndIndex = remainingContent.indexOf('</think>');
                if (thinkEndIndex !== -1) {
                    // Append text before </think> to thinking
                    appendContent(messageElement, 'thinking', remainingContent.substring(0, thinkEndIndex));
                    // Transition back to reply state
                    currentState = 'reply';
                    messageElement.dataset.state = 'reply';
                    remainingContent = remainingContent.substring(thinkEndIndex + 8);
                } else {
                    appendContent(messageElement, 'thinking', remainingContent);
                    remainingContent = '';
                }
            }
        }
        // Auto-scroll to the bottom - scroll the main container, not the messages div
        scrollToBottom();
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function appendContent(messageElement, type, text) {
    if (!text) return;

    if (type === 'thinking') {
        let details = messageElement.querySelector('details');
        if (!details) {
            details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = 'Show thought process';
            details.appendChild(summary);
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'thinking-content';
            details.appendChild(thinkingDiv);
            messageElement.appendChild(details);
        }
        details.querySelector('.thinking-content').textContent += text;
    } else { // This is the 'reply' content
        let replyDiv = messageElement.querySelector('.reply-content');
        if (!replyDiv) {
            replyDiv = document.createElement('div');
            replyDiv.className = 'reply-content';
            // Ensure reply content is always after the details tag if it exists
            const detailsElement = messageElement.querySelector('details');
            if (detailsElement) {
                detailsElement.insertAdjacentElement('afterend', replyDiv);
            } else {
                messageElement.appendChild(replyDiv);
            }
        }
        replyDiv.textContent += text;
    }
    
    // Auto-scroll to the bottom after appending content
    scrollToBottom();
}


async function fetchModels() {
    try {
        const response = await fetch('/models');
        const models = await response.json();
        models.forEach(model => {
            const option1 = document.createElement('option');
            option1.value = model;
            option1.textContent = model;
            model1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = model;
            option2.textContent = model;
            model2Select.appendChild(option2);
        });
    } catch (error) {
        console.error('Failed to fetch models:', error);
    }
}

// Enable Enter key to trigger Start
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !promptInput.disabled) {
        e.preventDefault();
        startButton.click();
    }
});

startButton.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const prompt = promptInput.value;
        const model1 = model1Select.value;
        const model2 = model2Select.value;

        const options1 = {
            temperature: parseFloat(model1Temperature.value),
            top_p: parseFloat(model1TopP.value),
            num_predict: parseInt(model1MaxTokens.value, 10) || 2048, // Default to 2048 if empty/invalid
            num_ctx: parseInt(model1ContextSize.value, 10),
        };

        const options2 = {
            temperature: parseFloat(model2Temperature.value),
            top_p: parseFloat(model2TopP.value),
            num_predict: parseInt(model2MaxTokens.value, 10) || 2048, // Default to 2048 if empty/invalid
            num_ctx: parseInt(model2ContextSize.value, 10),
        };

        if (prompt && model1 && model2) {
            // Clear previous messages
            messages.innerHTML = '';
            
            ws.send(JSON.stringify({
                prompt,
                model1,
                model2,
                options1,
                options2,
                action: 'start'
            }));
            promptInput.value = '';
            promptInput.disabled = true; // Disable input when chat starts
        }
    } else {
        console.log('WebSocket is not connected.');
    }
});

stopButton.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'stop' }));
    }
    promptInput.disabled = false; // Enable input when stopped
});

resetButton.addEventListener('click', () => {
    messages.innerHTML = '';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'stop' }));
    }
    promptInput.disabled = false; // Enable input on reset
});

fetchModels();
connect();

// Debug: Add scroll event listener
document.querySelector('main').addEventListener('scroll', (e) => {
    const container = e.target;
    const isAtBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 5;
    console.log(`Scroll event: scrollTop=${container.scrollTop}, scrollHeight=${container.scrollHeight}, clientHeight=${container.clientHeight}, isAtBottom=${isAtBottom}`);
});
