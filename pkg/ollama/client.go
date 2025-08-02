package ollama

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gorilla/websocket"
)

type OllamaClient struct {
	Host string
}

func NewClient() *OllamaClient {
	return &OllamaClient{
		Host: "http://localhost:11434",
	}
}

type ollamaRequest struct {
	Model    string  `json:"model"`
	Prompt   string  `json:"prompt"`
	Stream   bool    `json:"stream"` // Always true for streaming
	Options  *map[string]interface{} `json:"options,omitempty"`
}

type ollamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

type streamPayload struct {
	Model       string `json:"model"`
	Content     string `json:"content"`
	Participant int    `json:"participant"`
}

type ollamaTagsResponse struct {
	Models []struct {
		Name string `json:"name"`
	} `json:"models"`
}

func (c *OllamaClient) GetModels() ([]string, error) {
	resp, err := http.Get(c.Host + "/api/tags")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tagsResp ollamaTagsResponse
	if err := json.Unmarshal(body, &tagsResp); err != nil {
		return nil, err
	}

	var models []string
	for _, model := range tagsResp.Models {
		models = append(models, model.Name)
	}

	return models, nil
}

func (c *OllamaClient) StreamResponse(model, prompt string, options map[string]interface{}, participantID int, conn *websocket.Conn) (string, error) {
	reqData := ollamaRequest{
		Model:  model,
		Prompt: prompt,
		Stream: true,
		Options: &options,
	}
	reqBytes, err := json.Marshal(reqData)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(c.Host+"/api/generate", "application/json", bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var fullResponse string
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		var ollamaResp ollamaResponse
		if err := json.Unmarshal(scanner.Bytes(), &ollamaResp); err != nil {
			continue
		}

		fullResponse += ollamaResp.Response

		payload := streamPayload{
			Model:       model,
			Content:     ollamaResp.Response,
			Participant: participantID,
		}
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			continue // Or handle error appropriately
		}

		if err := conn.WriteMessage(websocket.TextMessage, payloadBytes); err != nil {
			return "", err
		}
	}

	return fullResponse, scanner.Err()
}
