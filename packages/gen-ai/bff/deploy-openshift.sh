# OpenShift Build and Deployment for Gen-AI BFF
# This script automates the deployment of the BFF service to OpenShift

#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
NAMESPACE=${NAMESPACE:-"llamastack"}
PROJECT_NAME=${PROJECT_NAME:-"gen-ai-bff"}
GIT_REPO=${GIT_REPO:-"https://github.com/akram/odh-dashboard.git"}
GIT_REF=${GIT_REF:-"mcp-proxying"}

echo -e "${GREEN}Starting OpenShift deployment for Gen-AI BFF...${NC}"

# Check if oc is installed
if ! command -v oc &> /dev/null; then
    echo -e "${RED}Error: OpenShift CLI (oc) is not installed${NC}"
    exit 1
fi

# Check if user is logged in
if ! oc whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged into OpenShift. Please run 'oc login' first${NC}"
    exit 1
fi

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace: ${NAMESPACE}${NC}"
oc new-project ${NAMESPACE} --skip-config-write 2>/dev/null || echo "Namespace ${NAMESPACE} already exists"

# Switch to the namespace
oc project ${NAMESPACE}

# Create ImageStream
echo -e "${YELLOW}Creating ImageStream...${NC}"
oc apply -f openshift-imagestream.yaml

# Create BuildConfig
echo -e "${YELLOW}Creating BuildConfig...${NC}"
oc apply -f openshift-build.yaml

# Start the build
echo -e "${YELLOW}Starting build...${NC}"
oc start-build ${PROJECT_NAME} --follow

# Wait for build to complete
echo -e "${YELLOW}Waiting for build to complete...${NC}"
oc wait --for=condition=complete build/${PROJECT_NAME}-1 --timeout=30m

# Deploy the application
echo -e "${YELLOW}Deploying application...${NC}"
oc apply -f openshift-deployment.yaml

# Create the route
echo -e "${YELLOW}Creating route...${NC}"
oc apply -f openshift-route.yaml

# Wait for deployment to be ready
echo -e "${YELLOW}Waiting for deployment to be ready...${NC}"
oc rollout status deployment/${PROJECT_NAME} --timeout=10m

# Get the route URL
ROUTE_URL=$(oc get route ${PROJECT_NAME} -o jsonpath='{.spec.host}')
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Application URL: https://${ROUTE_URL}${NC}"

# Show service information
echo -e "${YELLOW}Service Information:${NC}"
oc get service ${PROJECT_NAME}
oc get route ${PROJECT_NAME}
oc get pods -l app=${PROJECT_NAME}
