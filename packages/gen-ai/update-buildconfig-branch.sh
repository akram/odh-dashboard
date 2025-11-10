#!/bin/bash

# Script to update the genai BuildConfig to point to a specific branch
# Usage: ./update-buildconfig-branch.sh <branch-name>

if [ -z "$1" ]; then
  echo "❌ Error: Branch name is required"
  echo "Usage: ./update-buildconfig-branch.sh <branch-name>"
  exit 1
fi

BRANCH_NAME="$1"
APP_NAME="genai"

# Get the current repository URL from the BuildConfig
REPO_URL=$(oc get buildconfig ${APP_NAME} -o jsonpath='{.spec.source.git.uri}' 2>/dev/null)

if [ -z "$REPO_URL" ]; then
  echo "❌ Error: Could not find BuildConfig '${APP_NAME}' or it doesn't have a git source"
  echo "💡 Make sure you're logged into OpenShift and the BuildConfig exists"
  exit 1
fi

echo "📦 Current repository URL: ${REPO_URL}"
echo "🌿 Updating to branch: ${BRANCH_NAME}"

# Patch the BuildConfig to update the branch reference
oc patch buildconfig ${APP_NAME} --type=json -p="[
  {\"op\": \"replace\", \"path\": \"/spec/source/git/ref\", \"value\": \"${BRANCH_NAME}\"}
]" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ BuildConfig updated successfully to branch: ${BRANCH_NAME}"
  echo "🚀 You may want to start a new build with: oc start-build ${APP_NAME}"
else
  echo "❌ Error: Failed to update BuildConfig"
  exit 1
fi

