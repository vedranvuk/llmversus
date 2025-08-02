# Copilot Instructions for LLM Versus

## Project Overview

LLM Versus is a Go-based web application for comparing the outputs of two local LLMs (Large Language Models) in a conversational loop. The backend is written in Go, and the frontend is a single-page app using vanilla JS/CSS/HTML with Tailwind CSS. The project is designed for local, real-time model comparison using Ollama as the LLM provider.

## Architecture & Data Flow

- **Backend (Go):**
  - Entry point: `cmd/llmversus/main.go` sets up HTTP routes and static file serving, auto-opens browser
  - WebSocket endpoint `/chat` (handled in `pkg/handlers/chat.go`) streams alternating conversation between two models
  - `/models` endpoint (in `pkg/handlers/models.go`) fetches available models from Ollama via `pkg/ollama/client.go`
  - All model interaction is via Ollama's local API (currently `http://vedran-pc:11434` - hardcoded in client)
- **Frontend (web/static/):**
  - `index.html` is the main UI with collapsible advanced options for each model
  - `js/app.js` manages WebSocket connection, stateful message rendering with thinking/reply states
  - `css/style.css` uses Tailwind v4 with custom CSS variables for theming

## Critical Developer Workflows

- **Build & Run:**
  - Build: `go build -o llmversus ./cmd/llmversus`
  - Run: `./llmversus` (auto-opens browser at `http://localhost:8080`)
  - **Prerequisites:** Ollama must be running locally with models available
- **CSS Development:**
  - Source: `web/static/css/style.css` (Tailwind input file)
  - Build: `make tailwind` or `npx tailwindcss -i web/static/css/style.css -o web/static/css/tailwind.css --config web/static/css/tailwind.config.js --minify`
  - Watch: `make tailwind-watch` for development
- **Testing:**
  - Use `go test` in relevant package directories. No custom test runner or mocks.

## Project-Specific Patterns

- **Conversational Loop Architecture:**
  - Each WebSocket message alternates between Model 1 → Model 2 → Model 1, using previous response as next prompt
  - Backend removes `<think>...</think>` tags via regex before passing to next model (see `pkg/handlers/chat.go:78`)
  - Frontend preserves and renders thinking blocks as collapsible `<details>` elements
  
- **Thinking/Reply State Machine (Frontend):**
  - Messages transition between 'reply' and 'thinking' states based on `<think>` tags in streaming content
  - `appendContent()` function in `app.js` handles stateful content parsing and DOM updates
  - CSS classes: `.thinking-content` (italic gray), `.reply-content` (pre-wrap text)

- **WebSocket Message Format:**
  ```json
  {"model": "modelname", "content": "text chunk", "participant": 1|2}
  ```
  - Use `{"action": "stop"}` to halt streaming mid-conversation

- **Stop Flag Pattern:**
  - Global `stopFlags` map in `pkg/handlers/chat.go` tracks per-connection stop state
  - Mutex-protected concurrent access for streaming control

- **Ollama Integration:**
  - Streaming via `/api/generate` with `stream: true`
  - Model discovery via `/api/tags` endpoint
  - Options passed as `map[string]interface{}` to support dynamic Ollama parameters

## Conventions

- All Go code organized by feature under `pkg/` (handlers, ollama client)
- Frontend is vanilla JS/CSS/HTML - no build frameworks beyond Tailwind
- No dependency injection or frameworks; explicit, minimal code
- No authentication - designed for local development use only
- CSS uses custom properties for theming with light/dark mode support

## Key Files

- `cmd/llmversus/main.go` — server entry point with browser auto-launch
- `pkg/handlers/chat.go` — WebSocket handler with conversational loop logic
- `pkg/ollama/client.go` — Ollama API client with streaming support
- `web/static/js/app.js` — frontend WebSocket and stateful message rendering
- `web/static/css/style.css` — Tailwind source with custom theming variables
- `Makefile` — Tailwind CSS build commands

## Adding New Model Options Example

To add "frequency_penalty":
1. Add input field in `index.html` advanced options section
2. Wire up in `app.js` form serialization (see existing temperature/top-p patterns)
3. Update `chatRequest` struct in `pkg/handlers/chat.go` 
4. Pass through `options1`/`options2` maps to Ollama (no backend changes needed due to `map[string]interface{}`)

---

For more, see the project [README.md](../README.md).
