package handlers

import "sync"

var ollamaAddr string
var ollamaAddrOnce sync.Once

// SetOllamaAddr sets the Ollama API address for all handlers.
func SetOllamaAddr(addr string) {
	ollamaAddrOnce.Do(func() {
		ollamaAddr = addr
	})
}

// OllamaAddr returns the configured Ollama API address, or default if not set.
func OllamaAddr() string {
	if ollamaAddr == "" {
		return "http://vedran-pc:11434"
	}
	return ollamaAddr
}
