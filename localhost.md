# 🏠 Running Chad Maker Forge Locally

Quick guide to run the project on localhost for development and testing.

## 📋 Prerequisites

- Node.js (version 18 or higher)
- npm or bun
- Git

---

## 🚀 Installation and Execution

### 1. Clone the Repository

```bash
# If the repository is private, you'll need authentication
git clone https://github.com/DevGuipe/chad-maker-forge.git
cd chad-maker-forge
```

**For private repositories:**
- Use Personal Access Token or configure SSH key
- See details in [INSTALLATION.md](INSTALLATION.md)

### 2. Install Dependencies

```bash
# With npm
npm install

# Or with bun (faster)
bun install
```

### 3. Run in Development Mode

```bash
# With npm
npm run dev

# Or with bun
bun dev
```

The project will be available at: **http://localhost:8080**

---

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Generate production build
npm run preview      # Preview build locally

# Linting
npm run lint         # Check code with ESLint
```

---

## 🌐 Supabase Configuration

The project comes with Supabase configurations in the `.env` file:

```env
VITE_SUPABASE_PROJECT_ID="imyajbdqytdrefdnvgej"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://imyajbdqytdrefdnvgej.supabase.co"
```

**Note:** These are public keys and can be exposed in the frontend.

---

## 🧪 Testing Features

### Telegram WebApp
- In local environment, the component uses mocked data for development
- To test with real Telegram, production deployment is required

### Meme Creation
- All editing features work locally
- Upload and gallery use the configured Supabase

### Database
- The project is connected to Supabase in production
- Data created locally will be saved to the real database

---

## 🚨 Troubleshooting

### Port Already in Use Error
```bash
# If port 8080 is occupied
npx kill-port 8080

# Or change the port in vite.config.ts
```

### Dependency Issues
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### Telegram WebApp Error
```bash
# Normal on localhost - uses mocked data
# Check console for confirmation
```

---

## 📁 Project Structure

```
chad-maker-forge/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Application pages
│   ├── lib/                # Utilities and configurations
│   └── integrations/       # Integrations (Supabase)
├── public/                 # Static files
└── supabase/              # Supabase configurations and functions
```

---

## ⚡ Development Tips

1. **Hot Reload**: Code changes are reflected automatically
2. **DevTools**: Use React Developer Tools for debugging
3. **Console**: Monitor console for logs and errors
4. **Network**: Check API calls in DevTools

---

## 🔄 Recommended Workflow

1. **Develop locally** with `npm run dev`
2. **Test features** on localhost:8080
3. **Build** with `npm run build` 
4. **Deploy** following [INSTALLATION.md](INSTALLATION.md)

---

*💡 For full production setup, follow the guide in [INSTALLATION.md](INSTALLATION.md)*
