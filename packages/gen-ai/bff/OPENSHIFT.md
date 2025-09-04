# OpenShift Build and Deployment Configuration for Gen-AI BFF

This directory contains OpenShift configuration files for building and deploying the Gen-AI BFF (Backend for Frontend) service.

## Files Overview

- `openshift-build.yaml` - BuildConfig for building the Go application
- `openshift-imagestream.yaml` - ImageStream for storing the built image
- `openshift-deployment.yaml` - Deployment and Service configuration
- `openshift-route.yaml` - Route configuration for external access
- `Dockerfile.openshift` - Multi-stage Dockerfile optimized for OpenShift
- `deploy-openshift.sh` - Automated deployment script

## Quick Start

1. **Prerequisites:**
   - OpenShift CLI (`oc`) installed
   - Logged into OpenShift cluster (`oc login`)
   - Appropriate permissions to create projects and resources

2. **Deploy the application:**
   ```bash
   ./deploy-openshift.sh
   ```

3. **Manual deployment (alternative):**
   ```bash
   # Create namespace
   oc new-project gen-ai
   
   # Apply all configurations
   oc apply -f openshift-imagestream.yaml
   oc apply -f openshift-build.yaml
   oc apply -f openshift-deployment.yaml
   oc apply -f openshift-route.yaml
   
   # Start the build
   oc start-build gen-ai-bff --follow
   ```

## Configuration

### Environment Variables

The deployment includes the following environment variables:
- `PORT`: Service port (default: 8080)
- `LOG_LEVEL`: Logging level (default: info)
- `AUTH_METHOD`: Authentication method (default: user_token)
- `API_PATH_PREFIX`: API path prefix (default: /api/v1)
- `PATH_PREFIX`: Path prefix (default: gen-ai)

### Customization

You can customize the deployment by modifying the YAML files:

1. **Change namespace:** Update the `NAMESPACE` variable in `deploy-openshift.sh`
2. **Modify resources:** Edit resource limits in `openshift-deployment.yaml`
3. **Update route:** Modify the host in `openshift-route.yaml`

## Security Features

- Non-root user execution (UID 1001)
- Minimal base image (UBI9 minimal)
- Dropped capabilities
- Read-only filesystem where possible
- Health checks for liveness and readiness

## Monitoring

The deployment includes:
- Liveness probe: `/health` endpoint
- Readiness probe: `/health` endpoint
- Resource limits and requests
- Health check in Dockerfile

## Troubleshooting

1. **Build fails:** Check the build logs with `oc logs build/gen-ai-bff-1`
2. **Pod not starting:** Check pod logs with `oc logs deployment/gen-ai-bff`
3. **Route not accessible:** Verify the route with `oc get route gen-ai-bff`
4. **Permission issues:** Ensure you have appropriate RBAC permissions
