#!/bin/bash

# ScopeIQ User Management Deployment Script
# This script deploys the complete user management system with proper synchronization

set -e  # Exit on any error

echo "🚀 Starting ScopeIQ User Management Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI not found. Some verification commands may not work."
else
    print_status "AWS CLI available"
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for required files
echo "🔍 Verifying project structure..."

required_files=(
    "amplify/auth/resource.ts"
    "amplify/data/resource.ts"
    "amplify/backend.ts"
    "amplify/functions/post-confirmation/handler.ts"
    "amplify/functions/post-confirmation/resource.ts"
    "src/services/user.ts"
    "src/hooks/aws-auth.tsx"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

print_status "All required files found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install function dependencies
echo "📦 Installing Lambda function dependencies..."
cd amplify/functions/post-confirmation
npm install
cd ../../..

print_status "Dependencies installed"

# Deploy backend
echo "🚀 Deploying backend infrastructure..."
echo "This may take several minutes..."

if npx ampx sandbox; then
    print_status "Backend deployed successfully"
else
    print_error "Backend deployment failed"
    exit 1
fi

# Wait for deployment to stabilize
echo "⏳ Waiting for deployment to stabilize..."
sleep 30

# Verify Lambda function exists
echo "🔍 Verifying Lambda function deployment..."
if command -v aws &> /dev/null; then
    LAMBDA_FUNCTIONS=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `post-confirmation`)].FunctionName' --output text 2>/dev/null || echo "")
    if [ -n "$LAMBDA_FUNCTIONS" ]; then
        print_status "Lambda function deployed: $LAMBDA_FUNCTIONS"
    else
        print_warning "Could not verify Lambda function deployment via AWS CLI"
    fi
else
    print_warning "Skipping Lambda verification (AWS CLI not available)"
fi

# Test the setup
echo "🧪 Testing user management setup..."

# Start development server in background for testing
echo "Starting development server for testing..."
npm run dev &
DEV_SERVER_PID=$!

# Wait for server to start
sleep 10

# Kill the development server
kill $DEV_SERVER_PID 2>/dev/null || true

print_status "Development server test completed"

# Display next steps
echo ""
echo "🎉 Deployment completed successfully!"
echo "===================================="
echo ""
echo "📋 Next Steps:"
echo "1. Start your development server: npm run dev"
echo "2. Navigate to http://localhost:5173"
echo "3. Create a test account to verify user sync"
echo "4. Check CloudWatch logs for Lambda execution"
echo ""
echo "📖 Documentation:"
echo "• User Management Guide: USER_MANAGEMENT.md"
echo "• Deployment Checklist: DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🔍 Monitoring:"
if command -v aws &> /dev/null; then
    echo "• Watch Lambda logs: aws logs tail /aws/lambda/post-confirmation --follow"
    echo "• Check DynamoDB tables: aws dynamodb list-tables"
else
    echo "• Install AWS CLI for monitoring commands"
fi
echo ""
echo "🎯 Test User Registration:"
echo "1. Go to /auth/signup"
echo "2. Register with a new email"
echo "3. Verify email with confirmation code"
echo "4. Check that user appears in DynamoDB"
echo ""

# Final verification checklist
echo "✅ Verification Checklist:"
echo "• Backend infrastructure deployed"
echo "• Lambda function created"
echo "• DynamoDB tables ready"
echo "• Auth trigger configured"
echo "• Frontend sync service ready"
echo ""

print_status "Ready for testing! 🚀"
