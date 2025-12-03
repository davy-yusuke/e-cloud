.PHONY: all deps swag mocks test run build docker-up

all: deps

deps:
	go mod tidy

swag:
	swag init -g main.go -o docs

mocks:
	mockery --dir=internal/repository --name=UserRepository --output=internal/repository/mocks --outpkg=mocks

test:
	export JWT_SECRET=testsecret; go test ./... -v

run:
	export MONGO_URI="mongodb://localhost:27017"; export MONGO_DB="e-cloud"; export JWT_SECRET=example; go run main.go

build:
	GOOS=linux GOARCH=amd64 go build -o bin/app main.go

docker-up:
	docker-compose up -d
