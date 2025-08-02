# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1fdbe5a7-7b37-4a64-9443-ce69a6d6ecbc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1fdbe5a7-7b37-4a64-9443-ce69a6d6ecbc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables.
cp .env.example .env
# Edit .env file with your actual API keys and credentials

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Setup

This application requires several environment variables to function properly. **Never commit your actual credentials to version control.**

### Required Environment Variables

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

- **AWS Configuration**: Your AWS access keys and S3 bucket for file storage
- **OpenAI API Key**: For AI-powered document analysis features
- **Google Places API Key**: For location-based features (if used)

### Security Notes

- ✅ `.env` is in `.gitignore` - your credentials won't be committed
- ✅ Use `.env.example` as a template for team members
- ❌ Never hardcode credentials in source code
- ❌ Never commit `.env` files to version control
- 🔄 Rotate API keys regularly for security

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1fdbe5a7-7b37-4a64-9443-ce69a6d6ecbc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
