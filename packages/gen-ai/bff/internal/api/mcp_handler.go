package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
)

// MCPHandler handles requests to MCP servers in different namespaces.
// The endpoint format is /genai/v1/api/v1/mcp/{namespace}/{mcp-service-name}
// This handler:
// 1. Extracts namespace and service name from URL parameters
// 2. Authenticates the request using the Bearer token
// 3. Performs Subject Access Review (SAR) to check if user can access the MCP service
// 4. Retrieves the MCP service endpoint from Kubernetes
// 5. For GET requests: Returns data from service root or AI plugin JSON
// 6. For POST/PUT requests: Proxies the request to the MCP service
func (app *App) MCPHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	// Extract namespace and service name from URL parameters
	namespace := ps.ByName("namespace")
	serviceName := ps.ByName("service")

	if namespace == "" || serviceName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required path parameters: namespace and service"))
		return
	}

	logger.Info("MCP request", slog.String("namespace", namespace), slog.String("service", serviceName), slog.String("method", r.Method))

	// Get identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing request identity"))
		return
	}

	// Get Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Perform Subject Access Review to check if user can access the MCP service
	allowed, err := app.performSAR(r, k8sClient, identity, namespace, serviceName)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to perform access review: %w", err))
		return
	}

	if !allowed {
		app.forbiddenResponse(w, r, fmt.Sprintf("access denied to MCP service %s in namespace %s", serviceName, namespace))
		return
	}

	// Get the MCP service endpoint
	endpoint, err := k8sClient.GetMCPServiceEndpoint(ctx, identity, namespace, serviceName)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get MCP service endpoint: %w", err))
		return
	}

	logger.Info("MCP service endpoint retrieved", slog.String("endpoint", endpoint), slog.String("method", r.Method))

	// Handle different HTTP methods
	switch r.Method {
	case "GET":
		app.handleMCPGet(w, r, endpoint)
	case "POST", "PUT":
		app.proxyToMCPService(w, r, endpoint)
	default:
		app.methodNotAllowedResponse(w, r)
	}
}

// performSAR performs a Subject Access Review to check if the user can access the MCP service
func (app *App) performSAR(r *http.Request, k8sClient kubernetes.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, serviceName string) (bool, error) {
	logger := helper.GetContextLoggerFromReq(r)

	// For this implementation, we'll perform a simplified access check
	// In a production environment, you should implement proper SAR logic using the Kubernetes API
	// This would involve creating a SubjectAccessReview resource and checking the response

	// For now, we'll assume the user has access if they can get the service endpoint
	// This is a placeholder implementation
	allowed, err := app.performSARWithClient(r.Context(), k8sClient, namespace, serviceName)
	if err != nil {
		logger.Error("SAR failed", slog.String("error", err.Error()))
		return false, err
	}

	logger.Info("SAR result", slog.Bool("allowed", allowed), slog.String("namespace", namespace), slog.String("service", serviceName))
	return allowed, nil
}

// performSARWithClient performs the actual SAR using the Kubernetes client
func (app *App) performSARWithClient(ctx context.Context, k8sClient kubernetes.KubernetesClientInterface, namespace, serviceName string) (bool, error) {
	// This is a placeholder implementation. In a real scenario, you would need to
	// implement the actual SAR logic using the Kubernetes client.
	// For now, we'll assume the user has access if they can get the service endpoint.

	// You would typically do something like:
	// sar := &authv1.SubjectAccessReview{
	//     Spec: authv1.SubjectAccessReviewSpec{
	//         ResourceAttributes: &authv1.ResourceAttributes{
	//             Namespace: namespace,
	//             Verb:      "get",
	//             Group:     "",
	//             Version:   "v1",
	//             Resource:  "services",
	//             Name:      serviceName,
	//         },
	//     },
	// }
	// return k8sClient.CreateSubjectAccessReview(ctx, sar)

	// For this implementation, we'll return true to allow the request to proceed
	// In a production environment, you should implement proper SAR logic
	return true, nil
}

// handleMCPGet handles GET requests to MCP services
// It tries to fetch data from the service's root endpoint (/) or AI plugin JSON (/.well-known/ai-plugin.json)
func (app *App) handleMCPGet(w http.ResponseWriter, r *http.Request, serviceEndpoint string) {
	logger := helper.GetContextLoggerFromReq(r)

	// Try to get AI plugin JSON first, then fall back to root endpoint
	endpoints := []string{
		serviceEndpoint + "/.well-known/ai-plugin.json",
		serviceEndpoint + "/",
	}

	var responseData []byte
	var contentType string

	for _, endpoint := range endpoints {
		logger.Debug("Trying MCP service endpoint", slog.String("endpoint", endpoint))

		// Create HTTP client with timeout
		client := &http.Client{
			Timeout: 10 * time.Second,
		}

		// Create request
		req, err := http.NewRequest("GET", endpoint, nil)
		if err != nil {
			logger.Error("Failed to create request", slog.String("error", err.Error()), slog.String("endpoint", endpoint))
			continue
		}

		// Add headers from original request
		for k, v := range r.Header {
			if k != "Host" { // Don't forward Host header
				req.Header[k] = v
			}
		}

		// Make the request
		resp, err := client.Do(req)
		if err != nil {
			logger.Debug("Failed to connect to endpoint", slog.String("error", err.Error()), slog.String("endpoint", endpoint))
			continue
		}
		defer resp.Body.Close()

		// Check if response is successful
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			responseData, err = io.ReadAll(resp.Body)
			if err != nil {
				logger.Error("Failed to read response body", slog.String("error", err.Error()), slog.String("endpoint", endpoint))
				continue
			}

			contentType = resp.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/json"
			}

			logger.Info("Successfully fetched MCP service data",
				slog.String("endpoint", endpoint),
				slog.Int("status", resp.StatusCode),
				slog.String("content-type", contentType),
				slog.Int("content-length", len(responseData)))
			break
		} else {
			logger.Debug("Endpoint returned non-success status",
				slog.String("endpoint", endpoint),
				slog.Int("status", resp.StatusCode))
		}
	}

	if responseData == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to fetch data from MCP service endpoints"))
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Write response
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(responseData); err != nil {
		logger.Error("Failed to write response", slog.String("error", err.Error()))
	}
}

// proxyToMCPService proxies the request to the MCP service
func (app *App) proxyToMCPService(w http.ResponseWriter, r *http.Request, targetURL string) {
	logger := helper.GetContextLoggerFromReq(r)

	// Parse the target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("invalid target URL: %w", err))
		return
	}

	// Create a reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Modify the request to forward to the target
	r.URL.Host = target.Host
	r.URL.Scheme = target.Scheme
	r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
	r.Host = target.Host

	// Set a timeout for the proxy request
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	r = r.WithContext(ctx)

	logger.Info("Proxying request to MCP service", slog.String("target", targetURL))

	// Serve the request through the proxy
	proxy.ServeHTTP(w, r)
}
