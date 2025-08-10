# AWS SES Setup Instructions

## Before deploying, you need to set up AWS SES:

### 1. Verify Email Addresses

In the AWS SES console, verify these email addresses:

- `noreply@scopeiq.ai` (sender)
- `ross@exelion.ai` (recipient)

### 2. Request Production Access (if needed)

- By default, SES is in sandbox mode
- You can only send to verified email addresses
- For production, request to move out of sandbox

### 3. Domain Verification (Optional but Recommended)

- Verify the domain `scopeiq.ai` in SES
- This allows sending from any email address at that domain
- Add the required DNS records

### 4. Set up SPF, DKIM, and DMARC (Recommended)

- Improves email deliverability
- Reduces likelihood of emails being marked as spam

## Current Configuration:

- **From Email:** noreply@scopeiq.ai
- **To Email:** ross@exelion.ai
- **Region:** ap-southeast-2 (Sydney)

## Testing:

After deployment, the contact form will:

1. Save the submission to DynamoDB
2. Trigger the Lambda function to send email via SES
3. Fall back to localStorage and console logging if SES fails

## Notes:

- Email sending won't block form submission if it fails
- All email attempts are logged for debugging
- Reply-to is set to the submitter's email for easy responses
