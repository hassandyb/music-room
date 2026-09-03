all: down build up

api:
	npm run dev:api

web:
	npm run dev:web

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

mobile:
	./run-mobile.sh


.PHONY: api web build up down
