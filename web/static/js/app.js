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

function parseMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Escape HTML entities in non-code content
    // We'll do this selectively to avoid breaking code blocks
    
    // First, protect code blocks and inline code by replacing them with placeholders
    const codeBlocks = [];
    const inlineCodes = [];
    
    // Extract and protect fenced code blocks
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang ? ` class="language-${lang}"` : '';
        const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code${language}>${code.trim()}</code></pre>`);
        return placeholder;
    });
    
    // Extract and protect inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        const placeholder = `__INLINECODE_${inlineCodes.length}__`;
        inlineCodes.push(`<code>${code}</code>`);
        return placeholder;
    });
    
    // Now escape HTML entities in the remaining text
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Process block-level elements first
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    let listType = null;
    let listLevel = 0;
    let inBlockquote = false;
    let inTable = false;
    let tableHeaders = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        
        // Skip empty lines but track them for paragraph breaks
        if (!trimmed) {
            // Close lists and blockquotes on empty lines
            if (inList) {
                processedLines.push(`${'</ul></ol>'.repeat(listLevel)}`);
                inList = false;
                listType = null;
                listLevel = 0;
            }
            if (inBlockquote) {
                processedLines.push('</blockquote>');
                inBlockquote = false;
            }
            if (inTable) {
                processedLines.push('</tbody></table>');
                inTable = false;
                tableHeaders = [];
            }
            processedLines.push('<br>');
            continue;
        }
        
        // Headers (# ## ### #### ##### ######)
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            line = `<h${level}>${text}</h${level}>`;
        }
        // Horizontal rules (--- or ***)
        else if (trimmed.match(/^[-*_]{3,}$/)) {
            line = '<hr>';
        }
        // Blockquotes (> text)
        else if (trimmed.startsWith('>')) {
            const quoteText = trimmed.substring(1).trim();
            if (!inBlockquote) {
                processedLines.push('<blockquote>');
                inBlockquote = true;
            }
            line = `<p>${quoteText}</p>`;
        }
        // Tables (| column | column |)
        else if (trimmed.includes('|') && trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const cells = trimmed.split('|').slice(1, -1).map(cell => cell.trim());
            
            if (!inTable) {
                // Check if next line is separator (|---|---|)
                const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
                if (nextLine.match(/^\|[\s\-:|]+\|$/)) {
                    // This is a table header
                    tableHeaders = cells;
                    processedLines.push('<table><thead><tr>');
                    processedLines.push(cells.map(cell => `<th>${cell}</th>`).join(''));
                    processedLines.push('</tr></thead><tbody>');
                    inTable = true;
                    i++; // Skip the separator line
                    continue;
                }
            } else {
                // Table row
                processedLines.push('<tr>');
                processedLines.push(cells.map(cell => `<td>${cell}</td>`).join(''));
                processedLines.push('</tr>');
                continue;
            }
        }
        // Unordered lists (-, *, +)
        else if (trimmed.match(/^[-*+]\s+/)) {
            const text = trimmed.replace(/^[-*+]\s+/, '');
            const currentLevel = (line.length - line.trimLeft().length) / 2 + 1;
            
            if (!inList || listType !== 'ul' || currentLevel !== listLevel) {
                if (inList && currentLevel <= listLevel) {
                    // Close previous list levels
                    for (let j = listLevel; j >= currentLevel; j--) {
                        processedLines.push('</ul>');
                    }
                }
                if (currentLevel > listLevel || !inList) {
                    processedLines.push('<ul>');
                }
                inList = true;
                listType = 'ul';
                listLevel = currentLevel;
            }
            line = `<li>${text}</li>`;
        }
        // Ordered lists (1. 2. 3.)
        else if (trimmed.match(/^\d+\.\s+/)) {
            const text = trimmed.replace(/^\d+\.\s+/, '');
            const currentLevel = (line.length - line.trimLeft().length) / 2 + 1;
            
            if (!inList || listType !== 'ol' || currentLevel !== listLevel) {
                if (inList && currentLevel <= listLevel) {
                    // Close previous list levels
                    for (let j = listLevel; j >= currentLevel; j--) {
                        processedLines.push('</ol>');
                    }
                }
                if (currentLevel > listLevel || !inList) {
                    processedLines.push('<ol>');
                }
                inList = true;
                listType = 'ol';
                listLevel = currentLevel;
            }
            line = `<li>${text}</li>`;
        }
        // Definition lists (term: definition)
        else if (trimmed.includes(':') && !trimmed.startsWith(' ')) {
            const [term, ...defParts] = trimmed.split(':');
            if (defParts.length > 0) {
                const definition = defParts.join(':').trim();
                line = `<dl><dt>${term.trim()}</dt><dd>${definition}</dd></dl>`;
            }
        }
        // Close lists if we encounter a non-list line
        else if (inList) {
            for (let j = 0; j < listLevel; j++) {
                processedLines.push(`</${listType}>`);
            }
            inList = false;
            listType = null;
            listLevel = 0;
        }
        
        // Close blockquote if we encounter a non-quote line
        if (inBlockquote && !trimmed.startsWith('>')) {
            processedLines.push('</blockquote>');
            inBlockquote = false;
        }
        
        processedLines.push(line);
    }
    
    // Close any remaining open elements
    if (inList) {
        for (let j = 0; j < listLevel; j++) {
            processedLines.push(`</${listType}>`);
        }
    }
    if (inBlockquote) {
        processedLines.push('</blockquote>');
    }
    if (inTable) {
        processedLines.push('</tbody></table>');
    }
    
    html = processedLines.join('\n');
    
    // Process inline formatting
    // Bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // Superscript (^text^)
    html = html.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
    
    // Subscript (~text~)
    html = html.replace(/~([^~\n]+)~/g, '<sub>$1</sub>');
    
    // Highlight (==text==)
    html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    
    // Links [text](url) and [text](url "title")
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (match, text, url, title) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${url}"${titleAttr} target="_blank" rel="noopener">${text}</a>`;
    });
    
    // Reference-style links [text][ref] (simplified)
    html = html.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, '<a href="#$2" target="_blank" rel="noopener">$1</a>');
    
    // Automatic links <http://example.com>
    html = html.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    // Email links <email@example.com>
    html = html.replace(/<([^@\s]+@[^@\s]+\.[^@\s]+)>/g, '<a href="mailto:$1">$1</a>');
    
    // Images ![alt](src) and ![alt](src "title")
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (match, alt, src, title) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${src}" alt="${alt}"${titleAttr}>`;
    });
    
    // Restore protected code blocks and inline code
    codeBlocks.forEach((block, index) => {
        html = html.replace(`__CODEBLOCK_${index}__`, block);
    });
    
    inlineCodes.forEach((code, index) => {
        html = html.replace(`__INLINECODE_${index}__`, code);
    });
    
    // Convert remaining line breaks to <br> tags
    html = html.replace(/\n/g, '<br>');
    
    return html;
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
        const thinkingDiv = details.querySelector('.thinking-content');
        
        // Get current content, append new text, then re-parse and update
        const currentText = thinkingDiv.getAttribute('data-raw-text') || '';
        const newText = currentText + text;
        thinkingDiv.setAttribute('data-raw-text', newText);
        thinkingDiv.innerHTML = parseMarkdown(newText);
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
        
        // Get current content, append new text, then re-parse and update
        const currentText = replyDiv.getAttribute('data-raw-text') || '';
        const newText = currentText + text;
        replyDiv.setAttribute('data-raw-text', newText);
        replyDiv.innerHTML = parseMarkdown(newText);
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
