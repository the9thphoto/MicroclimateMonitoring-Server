SHELL := /bin/sh
API_DIR := apps/api
MIGRATIONS := $(API_DIR)/internal/platform/migrate/sql
GOOSE := go run github.com/pressly/goose/v3/cmd/goose@v3.29.0

.PHONY: install api web gen test test-api test-web lint format typecheck build migrate migrate-status migrate-stamp e2e ci

install:
	pnpm install

api:
	cd $(API_DIR) && go run ./cmd/api

web:
	pnpm --filter @microclimate/web dev

gen:
	pnpm gen:api

test: test-api test-web

test-api:
	cd $(API_DIR) && go test -p 1 ./...

test-web:
	pnpm -r --if-present test

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck

build:
	pnpm build

migrate:
	$(GOOSE) -dir $(MIGRATIONS) postgres "$$DATABASE_URL" up

migrate-status:
	$(GOOSE) -dir $(MIGRATIONS) postgres "$$DATABASE_URL" status

migrate-stamp:
	$(GOOSE) -dir $(MIGRATIONS) postgres "$$DATABASE_URL" stamp 1

e2e:
	pnpm e2e

ci:
	act push
