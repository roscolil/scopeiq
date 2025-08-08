# AWS Environment Variables Setup
# Source this file to load AWS credentials from .env into your shell session
# Usage: source aws-env.sh

# Load AWS credentials from .env file
export AWS_ACCESS_KEY_ID=$(grep VITE_AWS_ACCESS_KEY_ID .env | cut -d '=' -f2)
export AWS_SECRET_ACCESS_KEY=$(grep VITE_AWS_SECRET_ACCESS_KEY .env | cut -d '=' -f2)
export AWS_DEFAULT_REGION=$(grep VITE_AWS_REGION .env | cut -d '=' -f2)

echo "✅ AWS environment variables loaded from .env file"
echo "   Region: $AWS_DEFAULT_REGION"
echo "   Access Key: ${AWS_ACCESS_KEY_ID:0:10}..."
echo ""
echo "You can now run Amplify commands:"
echo "   npx amplify sandbox"
echo "   npx amplify status"
