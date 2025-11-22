# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod file
COPY go.mod ./

# Initialize go.sum and download dependencies
RUN go mod tidy

# Copy source code
COPY . .

# Download dependencies again after copying source
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:3.20

# Update package index and install dependencies
    # Update package index and install dependencies
    # Retry logic for network issues with Alpine repositories
    RUN apk update --no-cache || \
        (sleep 3 && apk update --no-cache) || \
        (sleep 5 && apk update --no-cache) && \
        apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]
