# Makefile for LLM Versus frontend (Tailwind CSS)

TAILWIND_INPUT=web/static/css/style.css
TAILWIND_OUTPUT=web/static/css/tailwind.css
TAILWIND_CONFIG=web/static/css/tailwind.config.js

.PHONY: tailwind tailwind-watch

tailwind:
	npx tailwindcss -i $(TAILWIND_INPUT) -o $(TAILWIND_OUTPUT) --config $(TAILWIND_CONFIG) --minify

tailwind-watch:
	npx tailwindcss -i $(TAILWIND_INPUT) -o $(TAILWIND_OUTPUT) --config $(TAILWIND_CONFIG) --watch
