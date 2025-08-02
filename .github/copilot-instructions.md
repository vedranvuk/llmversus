# Copilot Instructions for LLM Versus

## Project Overview

LLM Versus is a Go-based web application for comparing the outputs of two local LLMs (Large Language Models) in a conversational loop. The backend is written in Go, and the frontend is a single-page app using vanilla JS/CSS/HTML. The project is designed for local, real-time model comparison using Ollama as the LLM provider.

## Architecture & Data Flow

- **Backend (Go):**
  - Entry point: `cmd/llmversus/main.go` sets up HTTP routes and static file serving.
  - WebSocket endpoint `/chat` (handled in `pkg/handlers/chat.go`) streams conversation between two models.
  - `/models` endpoint (in `pkg/handlers/models.go`) fetches available models from Ollama via `pkg/ollama/client.go`.
  - All model interaction is via Ollama's local API (`http://localhost:11434`).
- **Frontend (web/static/):**
  - `index.html` is the main UI, with advanced options for each model.
  - `js/app.js` manages WebSocket connection, message rendering, and model selection.
  - `css/style.css` provides a modern, dark-themed UI.

## Developer Workflows

- **Build & Run:**
  - Build: `go build -o llmversus ./cmd/llmversus`
  - Run: `./llmversus` (opens browser at `http://localhost:8080`)
  - Ollama must be running locally with models available.
- **Testing:**
  - Use `go test` in relevant package directories. No custom test runner.
- **Frontend:**
  - Static files are served from `web/static/`. No build step required for JS/CSS/HTML.

## Project-Specific Patterns

- **WebSocket Streaming:**
  - All chat is streamed via WebSocket (`/chat`). Each message alternates between two models, using the previous response as the next prompt.
  - Use `stop` action in the WebSocket protocol to halt streaming.
- **Model Options:**
  - Advanced options (temperature, top-p, max tokens, context size) are passed as JSON objects per model.
- **Ollama Integration:**
  - All model calls use Ollama's `/api/generate` and `/api/tags` endpoints. See `pkg/ollama/client.go` for request/response structure.

## Conventions

- All Go code is organized by feature (handlers, ollama client) under `pkg/`.
- Frontend is a single-page app; all assets in `web/static/`.
- No framework or dependency injection; code is explicit and minimal.
- No authentication or user management; local use only.

## Key Files

- `cmd/llmversus/main.go` — server entry point
- `pkg/handlers/chat.go` — WebSocket chat handler
- `pkg/handlers/models.go` — model list handler
- `pkg/ollama/client.go` — Ollama API client
- `web/static/index.html`, `js/app.js`, `css/style.css` — frontend

## Example: Adding a New Model Option

To add a new model option (e.g., "frequency_penalty"):
- Update the frontend form in `index.html` and `app.js` to include the new field.
- Update the backend `chatRequest` struct in `pkg/handlers/chat.go` to accept the new option.
- Pass the option through to Ollama in `pkg/ollama/client.go`.

---

For more, see the project [README.md](../README.md).
