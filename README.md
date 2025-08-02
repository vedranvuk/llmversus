# LLM Versus

LLM Versus is a web application for comparing the outputs of two local LLMs (Large Language Models) side by side, using a conversational interface. It is built with Go for the backend and vanilla JavaScript/CSS/HTML for the frontend.

## Features

- **Compare Two LLMs:** Enter a prompt and see how two different models respond in a conversational loop.
- **WebSocket Streaming:** Real-time, streaming responses from both models.
- **Advanced Options:** Configure temperature, top-p, max tokens, and context size for each model.
- **Modern UI:** Responsive, dark-themed interface.

## Project Structure

```
cmd/llmversus/main.go         # Main Go server entry point
pkg/handlers/                # HTTP/WebSocket handlers
pkg/ollama/client.go         # Ollama client for model interaction
web/static/                  # Frontend (HTML, CSS, JS)
```

## Requirements

- Go 1.24+
- Ollama running locally (default: `http://localhost:11434`)
- Node.js (for frontend development, optional)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vedranvuk/llmversus.git
   cd llmversus
   ```

2. **Run Ollama locally**  
   Make sure Ollama is running and has models available.

3. **Build and run the server:**
   ```bash
   go build -o llmversus ./cmd/llmversus
   ./llmversus
   ```
   The server will start at [http://localhost:8080](http://localhost:8080) and open in your browser.

4. **Open the app:**  
   Visit [http://localhost:8080](http://localhost:8080) in your browser.

## Usage

- Enter a prompt and select two models to compare.
- Adjust advanced options as needed.
- Click **Start** to begin the conversation.
- Click **Stop** to halt streaming, or **Reset** to clear the chat.

## Customization

- **Add/Remove Models:** Models are fetched from your local Ollama instance.
- **Frontend:** Modify files in `web/static/` for UI changes.

## License

MIT
