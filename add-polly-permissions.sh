#!/bin/bash

# Script to add Polly permissions to Cognito Identity Pool authenticated role
# This allows authenticated users to use AWS Polly text-to-speech

echo "🔍 Finding Cognito Identity Pool authenticated role..."

# Find the role name (it contains "authenticatedU" or "AuthenticatedUser")
ROLE_NAME=$(aws iam list-roles --query "Roles[?contains(RoleName, 'amplify-vitereactshadcnts') && contains(RoleName, 'authenticatedU')].RoleName" --output text | head -1)

if [ -z "$ROLE_NAME" ]; then
  echo "❌ Could not find authenticated user role. Please check your Amplify deployment."
  echo "   Looking for role matching: amplify-vitereactshadcnts-*authenticatedU*"
  exit 1
fi

echo "✅ Found role: $ROLE_NAME"
echo ""
echo "📝 Adding Polly permissions..."

# Add the policy
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "PollyTextToSpeech" \
  --policy-document file://polly-policy.json

if [ $? -eq 0 ]; then
  echo "✅ Successfully added Polly permissions!"
  echo ""
  echo "🎉 You can now use text-to-speech in your app."
  echo "   Just refresh your browser - no need to restart the dev server."
else
  echo "❌ Failed to add permissions. Please check AWS credentials."
  exit 1
fi

