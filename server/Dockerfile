# builder
FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/app ./main.go

# runtime
FROM alpine:3.18
RUN apk add --no-cache ca-certificates
COPY --from=build /app/bin/app /app/app
WORKDIR /app
ENV PORT=8080
EXPOSE 8080
CMD ["/app/app"]
