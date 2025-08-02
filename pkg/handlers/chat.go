package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/vedranvuk/llmversus/pkg/ollama"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type chatRequest struct {
	Prompt   string                 `json:"prompt"`
	Model1   string                 `json:"model1"`
	Model2   string                 `json:"model2"`
	Options1 map[string]interface{} `json:"options1"`
	Options2 map[string]interface{} `json:"options2"`
	Action   string                 `json:"action"`
}

var (
	stopFlags = make(map[*websocket.Conn]bool)
	mu        sync.Mutex
)

func ChatHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	client := ollama.NewClientWithAddr(OllamaAddr())

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			mu.Lock()
			delete(stopFlags, conn)
			mu.Unlock()
			return
		}

		var req chatRequest
		if err := json.Unmarshal(msg, &req); err != nil {
			log.Printf("Error unmarshalling json: %v", err)
			continue
		}

		if req.Action == "stop" {
			mu.Lock()
			stopFlags[conn] = true
			mu.Unlock()
			continue
		}

		mu.Lock()
		stopFlags[conn] = false
		mu.Unlock()

		go conversation(conn, client, req.Prompt, req.Model1, req.Options1, req.Model2, req.Options2)
	}
}

func conversation(conn *websocket.Conn, client *ollama.OllamaClient, initialPrompt, model1 string, options1 map[string]interface{}, model2 string, options2 map[string]interface{}) {
	currentPrompt := initialPrompt

	// Regex to remove <think>...</think> blocks
	thinkRe := regexp.MustCompile(`(?s)<think>.*?</think>`)

	for {
		mu.Lock()
		stop := stopFlags[conn]
		mu.Unlock()
		if stop {
			return
		}

		// Model 1
		resp1, err := client.StreamResponse(model1, currentPrompt, options1, 1, conn)
		if err != nil {
			log.Printf("Error from model 1: %v", err)
			return
		}
		// Remove <think>...</think> from response before passing as prompt
		currentPrompt = thinkRe.ReplaceAllString(resp1, "")

		mu.Lock()
		stop = stopFlags[conn]
		mu.Unlock()
		if stop {
			return
		}

		// Model 2
		resp2, err := client.StreamResponse(model2, currentPrompt, options2, 2, conn)
		if err != nil {
			log.Printf("Error from model 2: %v", err)
			return
		}
		// Remove <think>...</think> from response before passing as prompt
		currentPrompt = thinkRe.ReplaceAllString(resp2, "")
	}
}
