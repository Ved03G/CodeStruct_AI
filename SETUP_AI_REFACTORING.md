# 🚀 Quick Setup Guide - AI Refactoring

## ✅ Prerequisites (Already Done)

- [x] Database schema updated with `RefactoringSuggestion` model
- [x] Database migration completed
- [x] Backend service implemented (`AIRefactoringService`)
- [x] API endpoints created (4 new routes)
- [x] Frontend components built (`AIRefactorViewer`, `EnhancedIssueCard`)
- [x] All TypeScript errors resolved

## 🔑 What You Need To Do

### 1. Add Your Google Gemini API Key

Edit `backend/.env` and add your Gemini API key:

```bash
GEMINI_API_KEY=your-actual-api-key-here
```

**Get your FREE key at:** https://aistudio.google.com/app/apikey

> ✨ **Gemini API is FREE!** No credit card required. Just sign in with your Google account and generate a key.

> ⚠️ **Important:** Never commit your `.env` file to Git! It's already in `.gitignore`.

### 2. Start the Application

```powershell
# In the root directory
npm run dev
```

This will start:
- Backend on http://localhost:3000
- Frontend on http://localhost:5173

### 3. Test the AI Refactoring Feature

1. **Login** to your account
2. **Create/Select a project**
3. **Run analysis** on your codebase
4. **Find an issue** (any type except LongMethod)
5. **Click "⚡ AI Fix"** button
6. **Review the suggestion** in the modal
7. **Accept or Reject** the refactoring

## 🧪 Testing Checklist

- [ ] Gemini API key is set in `.env`
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] Can analyze a project
- [ ] Issues are displayed with severity colors
- [ ] "AI Fix" button appears on issue cards (except LongMethod)
- [ ] Clicking "AI Fix" shows loading spinner
- [ ] Diff viewer displays original vs refactored code
- [ ] Can switch between tabs (Diff / Original / Refactored)
- [ ] Accept button saves the suggestion
- [ ] Reject button closes the modal

## 🎯 First Test Recommendation

Start with a **DeepNesting** or **MagicNumber** issue:
- These have simpler fixes
- Faster response times
- Higher confidence scores
- Good for validating the flow

## 💡 Troubleshooting

### "API key not found" error
```bash
# Make sure you're in the backend directory
cd backend
# Check if .env exists
cat .env | Select-String "GEMINI_API_KEY"
```

### "Gemini API error"
- Check your API key is valid
- Ensure you copied the full key (no spaces)
- Try regenerating the key at https://aistudio.google.com/app/apikey
- Check rate limits (free tier has generous limits)

### "RefactoringSuggestion table not found"
```bash
cd backend
npx prisma migrate dev
```

### Frontend not showing "AI Fix" button
- Make sure you're logged in
- Refresh the page (Ctrl+Shift+R)
- Check browser console for errors

## 📊 Expected Costs

**FREE!** 🎉

Google Gemini API Free Tier includes:
- **1,500 requests per day**
- **1 million tokens per minute**
- **15 RPM (requests per minute)**

This is more than enough for development and even production use for small-medium teams!

For heavy usage, you can upgrade to pay-as-you-go pricing (very affordable compared to OpenAI).

## 🔄 What Happens When You Click "AI Fix"

1. Frontend sends POST request to `/api/issues/:id/ai-refactor`
2. Backend fetches issue details from database
3. AIRefactoringService generates context-aware prompt
4. Google Gemini API processes the request (~2-5 seconds)
5. Response is validated and stored in database
6. Frontend displays the diff in modal
7. User accepts/rejects the suggestion

## 📝 Next Steps After Setup

1. **Test with various issue types** to see different refactoring styles
2. **Enjoy the FREE API** with generous limits
3. **Review accepted refactorings** for quality
4. **Provide feedback** on what works well and what doesn't
5. **Deploy to production** when ready

## 🎉 You're Ready!

Once your Gemini API key is configured, you're all set to experience the magic of AI-powered refactoring - **completely FREE!** 🚀

---

**Need help?** Check `AI_REFACTORING.md` for detailed documentation.
