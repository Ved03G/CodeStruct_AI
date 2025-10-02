# 🔑 How to Get Your FREE Gemini API Key

## Why Gemini?

✨ **Completely FREE** - No credit card required  
⚡ **Fast & Efficient** - 2-5 second response times  
🎯 **High Quality** - Comparable to GPT-4 performance  
📊 **Generous Limits** - 1,500 requests/day on free tier  

## Step-by-Step Guide

### 1. Visit Google AI Studio

Go to: **https://aistudio.google.com/app/apikey**

### 2. Sign In

- Click "Sign in" in the top right
- Use your Google account (Gmail)
- No registration needed if you have a Google account!

### 3. Create API Key

1. Click the **"Get API Key"** button
2. Select **"Create API key in new project"** (recommended)
3. Your API key will be generated instantly!

### 4. Copy Your Key

- Click the **Copy** icon next to your API key
- It will look like: `AIzaSyB...` (about 39 characters)

### 5. Add to Your Project

Edit `backend/.env` file:

```bash
GEMINI_API_KEY=AIzaSyB...your-actual-key-here
```

**Important:** Keep this key secret! Never commit it to Git.

## ✅ Verify It Works

```bash
# Start your backend
cd backend
npm run dev

# You should see: "Gemini API initialized successfully"
```

## 📊 Free Tier Limits

| Resource | Limit |
|----------|-------|
| Requests per Day | 1,500 |
| Requests per Minute | 15 |
| Tokens per Minute | 1,000,000 |

**This is MORE than enough for:**
- Development and testing
- Small to medium teams
- Personal projects
- Prototypes and MVPs

## 🔄 If You Hit Rate Limits

If you exceed the free tier (unlikely), you can:

1. **Wait 24 hours** - Limits reset daily
2. **Create multiple API keys** - Use different projects
3. **Upgrade to paid** - Still much cheaper than OpenAI!

## 🆚 Gemini vs OpenAI

| Feature | Gemini Free | OpenAI GPT-4 |
|---------|-------------|--------------|
| Cost | FREE | ~$0.03/request |
| Setup | No card | Credit card required |
| Speed | 2-5 seconds | 3-10 seconds |
| Quality | High | Very High |
| Limits | 1,500/day | Pay-per-use |

## 🐛 Troubleshooting

### "Invalid API key" error
- Make sure you copied the FULL key (39 characters)
- Check for extra spaces before/after the key
- Regenerate a new key if needed

### "Quota exceeded" error
- You've hit the daily limit (1,500 requests)
- Wait 24 hours or create a new API key in a different project

### "API key not found" error
- Make sure the key is in `backend/.env`, not `backend/.env.example`
- Restart your backend server after adding the key

## 🎯 Best Practices

1. **Keep it Secret** - Never share your API key publicly
2. **Use .env** - Always store in environment variables
3. **Monitor Usage** - Check your usage in Google AI Studio
4. **Rotate Keys** - Generate new keys periodically for security

## 📝 Example .env File

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/codestruct

# Frontend
FRONTEND_ORIGIN=http://localhost:5173

# Gemini API (FREE!)
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional
PORT=3000
HOST=0.0.0.0
```

## 🚀 Next Steps

After adding your key:

1. Restart your backend: `npm run dev`
2. Open the frontend: http://localhost:5173
3. Analyze a project
4. Click "⚡ AI Fix" on any issue
5. Watch the magic happen!

## 🎉 That's It!

You're now ready to use AI-powered code refactoring for FREE! 

---

**Questions?** Check the [main documentation](./AI_REFACTORING.md) or [setup guide](./SETUP_AI_REFACTORING.md).
