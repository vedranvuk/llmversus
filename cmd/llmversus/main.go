package main

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"

	"github.com/vedranvuk/llmversus/pkg/handlers"
)

func main() {
	http.HandleFunc("/chat", handlers.ChatHandler)
	http.HandleFunc("/models", handlers.ModelsHandler)
	http.Handle("/", http.FileServer(http.Dir("./web/static")))

	port := "8080"
	addr := "http://localhost:" + port

	go func() {
		fmt.Printf("Server starting on %s\n", addr)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatal(err)
		}
	}()

	openBrowser(addr)

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
