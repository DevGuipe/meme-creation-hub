# 🐱 POPCAT Meme Maker

## About the Project

**POPCAT Meme Maker** is the ultimate meme generator with full gamification system. Built with React, TypeScript, Supabase and native Telegram Bot integration.

## Technologies Used

- **Frontend:** React + TypeScript + Vite
- **UI:** shadcn-ui + Tailwind CSS  
- **Backend:** Supabase (Database + Edge Functions)
- **Bot:** Telegram Bot API
- **Deploy:** VPS Ubuntu 22.04 + Nginx

## Features

- ✅ Complete meme editor with templates
- ✅ Authentication system via Telegram WebApp
- ✅ Full database on Supabase with RLS
- ✅ Functional Telegram bot with commands and reactions
- ✅ Gamification system (POPS Points)
- ✅ Personal meme gallery
- ✅ Rankings and leaderboards
- ✅ Responsive and mobile-first design

## How to Run Locally

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd meme-maker-forge

# Install dependencies
npm install

# Run in development
npm run dev
```

## Deploy

See the `INSTALLATION.md` file for complete deployment instructions on VPS Ubuntu 22.04.

## Bot Commands

- `/start` - Register user and open WebApp  
- `/meme <ID>` - Publish saved meme (groups only)

---

*🐱 Ready to POP some memes! 💪*