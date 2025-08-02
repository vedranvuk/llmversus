package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/vedranvuk/llmversus/pkg/ollama"
)

func ModelsHandler(w http.ResponseWriter, r *http.Request) {
	client := ollama.NewClient()
	models, err := client.GetModels()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models); err != nil {
		log.Printf("Failed to encode models: %v", err)
	}
}
