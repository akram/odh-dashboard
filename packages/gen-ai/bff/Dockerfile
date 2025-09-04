# Multi-stage build for local development and Quay.io deployment
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /workspace

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application for linux/amd64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o bin/bff ./cmd

# Use minimal runtime image
FROM alpine:latest

# Install necessary packages
RUN apk --no-cache add ca-certificates tzdata curl

# Create non-root user
RUN addgroup -g 1001 genai && \
    adduser -D -s /bin/sh -u 1001 -G genai genai

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /workspace/bin/bff .

# Copy static assets if they exist
COPY --from=builder /workspace/static ./static

# Change ownership to non-root user
RUN chown -R genai:genai /app

# Switch to non-root user
USER genai

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["./bff"]
CMD ["--port=8080", "--static-assets-dir=./static"]
