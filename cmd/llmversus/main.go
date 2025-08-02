package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"

	"github.com/vedranvuk/llmversus/pkg/handlers"
)

func main() {
	addrFlag := flag.String("addr", ":8080", "server listen address (host:port)")
	ollamaFlag := flag.String("ollama", "http://vedran-pc:11434", "Ollama API address")
	flag.Parse()

	handlers.SetOllamaAddr(*ollamaFlag)

	http.HandleFunc("/chat", handlers.ChatHandler)
	http.HandleFunc("/models", handlers.ModelsHandler)
	http.Handle("/", http.FileServer(http.Dir("./web/static")))

	addr := *addrFlag
	url := "http://localhost" + addr
	if addr[0] == ':' {
		url = "http://localhost" + addr
	} else {
		url = "http://" + addr
	}

	go func() {
		fmt.Printf("Server starting on %s\n", url)
		if err := http.ListenAndServe(addr, nil); err != nil {
			log.Fatal(err)
		}
	}()

	openBrowser(url)

	select {}
}

func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Printf("Failed to open browser: %v", err)
	}
}
