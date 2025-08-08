#!/bin/bash

# Load environment variables from .env file and start Amplify sandbox
# This script ensures AWS credentials are properly exported for Amplify CLI

cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found in the current directory"
    exit 1
fi

echo "🔧 Loading environment variables from .env file..."

# Export AWS credentials from .env file
export AWS_ACCESS_KEY_ID=$(grep VITE_AWS_ACCESS_KEY_ID .env | cut -d '=' -f2)
export AWS_SECRET_ACCESS_KEY=$(grep VITE_AWS_SECRET_ACCESS_KEY .env | cut -d '=' -f2)
export AWS_DEFAULT_REGION=$(grep VITE_AWS_REGION .env | cut -d '=' -f2)

# Verify credentials are loaded
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_DEFAULT_REGION" ]; then
    echo "❌ Failed to load AWS credentials from .env file"
    echo "Please check that your .env file contains:"
    echo "  - VITE_AWS_ACCESS_KEY_ID"
    echo "  - VITE_AWS_SECRET_ACCESS_KEY"
    echo "  - VITE_AWS_REGION"
    exit 1
fi

echo "✅ AWS credentials loaded successfully"
echo "   Region: $AWS_DEFAULT_REGION"
echo "   Access Key: ${AWS_ACCESS_KEY_ID:0:10}..."

# Test AWS connection
echo "🔍 Testing AWS connection..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo "✅ AWS connection successful"
else
    echo "❌ AWS connection failed - please check your credentials"
    exit 1
fi

# Start Amplify sandbox with proper environment
echo "🚀 Starting Amplify sandbox..."
echo "   Make sure to keep this terminal open while developing"
echo ""

npx amplify sandbox
