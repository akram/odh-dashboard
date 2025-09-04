# MCP Server Endpoint

This document describes the new MCP (Model Context Protocol) server endpoint implemented in the BFF.

## Endpoint

```
/genai/api/v1/mcp/{namespace}/{mcp-service-name}
```

## Features

- **Authentication**: All requests must include a valid Bearer token
- **Authorization**: Uses Subject Access Review (SAR) to verify user permissions
- **Cross-namespace**: Can call MCP services in other namespaces
- **GET Requests**: Returns service metadata from `/.well-known/ai-plugin.json` or root endpoint
- **POST/PUT Requests**: Proxies requests to the actual MCP service
- **HTTP Methods**: Supports GET, POST, and PUT only

## Implementation Details

### Authentication
The endpoint uses the existing authentication middleware that extracts the Bearer token from the request headers and validates it.

### Authorization
The implementation performs a Subject Access Review (SAR) to check if the user has permission to access the specified MCP service in the target namespace. This ensures proper RBAC enforcement.

### Service Discovery
The endpoint retrieves the MCP service endpoint from Kubernetes by:
1. Querying the Kubernetes service in the specified namespace
2. Finding the appropriate port (prefers named ports "http" or "https", falls back to first port)
3. Determining the protocol scheme (http/https) based on port and protocol
4. Constructing the internal service URL (e.g., `http://service-name.namespace.svc.cluster.local:port`)

### Request Handling
- **GET Requests**: Fetches service metadata from the MCP service's `/.well-known/ai-plugin.json` endpoint first, then falls back to the root endpoint (`/`) if the AI plugin JSON is not available
- **POST/PUT Requests**: Once authenticated and authorized, the request is proxied to the actual MCP service using Go's `httputil.ReverseProxy`

## Usage Example

```bash
# Get MCP service metadata (AI plugin JSON or root endpoint)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/genai/api/v1/mcp/my-namespace/my-mcp-service

# POST request to the MCP service
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"key": "value"}' \
     http://localhost:8080/genai/api/v1/mcp/my-namespace/my-mcp-service

# PUT request to the MCP service
curl -X PUT -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"key": "updated_value"}' \
     http://localhost:8080/genai/api/v1/mcp/my-namespace/my-mcp-service
```

## Swagger UI Access

The API documentation is available at:
- Swagger UI: `http://localhost:8080/genai/swagger-ui`
- OpenAPI JSON: `http://localhost:8080/genai/openapi.json`
- OpenAPI YAML: `http://localhost:8080/genai/openapi.yaml`

## Error Handling

The endpoint returns appropriate HTTP status codes:
- `400 Bad Request`: Missing namespace or service parameters
- `401 Unauthorized`: Missing or invalid Bearer token
- `403 Forbidden`: User lacks permission to access the MCP service
- `500 Internal Server Error`: Kubernetes client errors or service discovery failures

## Security Considerations

1. **Token Validation**: Bearer tokens are validated through the existing authentication middleware
2. **RBAC Enforcement**: Subject Access Review ensures users can only access services they have permission for
3. **Namespace Isolation**: Users can only access services in namespaces they have access to
4. **Request Logging**: All requests are logged with appropriate context for audit purposes

## Future Enhancements

1. **External Endpoints**: Support for external service endpoints and load balancers
2. **Service Health Checks**: Implement health checks for MCP services
3. **Caching**: Cache service endpoints to improve performance
4. **Metrics**: Add metrics for monitoring MCP service usage
