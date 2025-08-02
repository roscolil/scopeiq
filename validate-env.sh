#!/bin/bash

# Environment Validation Script
# This script checks that all required environment variables are properly set

echo "🔍 Environment Configuration Validation"
echo "========================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found"
    echo "📝 Please copy .env.example to .env and fill in your credentials"
    exit 1
fi

# Check for required environment variables
required_vars=(
    "VITE_AWS_ACCESS_KEY_ID"
    "VITE_AWS_SECRET_ACCESS_KEY" 
    "VITE_AWS_REGION"
    "VITE_S3_BUCKET_NAME"
    "VITE_OPENAI_API_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env; then
        value=$(grep "^${var}=" .env | cut -d'=' -f2-)
        if [ -n "$value" ] && [ "$value" != "your_${var,,}_here" ]; then
            echo "✅ $var is set"
        else
            echo "❌ $var is empty or has placeholder value"
            missing_vars+=("$var")
        fi
    else
        echo "❌ $var is missing from .env"
        missing_vars+=("$var")
    fi
done

# Security checks
echo ""
echo "🔒 Security Validation"
echo "======================"

# Check .gitignore
if grep -q "^\.env$" .gitignore; then
    echo "✅ .env is in .gitignore"
else
    echo "⚠️  .env should be in .gitignore"
fi

# Check for hardcoded credentials in source code
echo "🔍 Checking for hardcoded credentials..."
if grep -r "AKIA[0-9A-Z]\{16\}" src/ 2>/dev/null; then
    echo "❌ Found hardcoded AWS access keys in source code!"
else
    echo "✅ No hardcoded AWS access keys found in source code"
fi

if grep -r "sk-proj-" src/ 2>/dev/null; then
    echo "❌ Found hardcoded OpenAI API key in source code!"
else
    echo "✅ No hardcoded OpenAI API keys found in source code"
fi

# Summary
echo ""
echo "📊 Summary"
echo "=========="
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required environment variables are configured"
    echo "🚀 Ready to run the application!"
else
    echo "❌ Missing environment variables: ${missing_vars[*]}"
    echo "📝 Please update your .env file with the missing variables"
    exit 1
fi
