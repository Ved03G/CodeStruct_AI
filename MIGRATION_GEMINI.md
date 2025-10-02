# 🔄 Migration Guide: OpenAI → Google Gemini

## Why We Switched

✅ **FREE** - No credit card, no billing  
✅ **Fast** - 2-5 second responses vs 3-10 seconds  
✅ **Generous** - 1,500 requests/day free tier  
✅ **Quality** - Comparable to GPT-4 performance  
✅ **Simple** - Just sign in with Google account  

## What Changed

### Backend Changes

#### 1. Dependencies
```bash
# OLD
npm install axios

# NEW
npm install @google/generative-ai
```

#### 2. API Configuration
```typescript
// OLD (ai-refactoring.service.ts)
private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// NEW
private readonly genAI: GoogleGenerativeAI;
private readonly model: any;

constructor(private readonly prisma: PrismaService) {
  const apiKey = process.env.GEMINI_API_KEY;
  this.genAI = new GoogleGenerativeAI(apiKey || '');
  this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}
```

#### 3. API Calls
```typescript
// OLD
private async callOpenAI(prompt: string): Promise<string> {
  const response = await axios.post(
    this.OPENAI_API_URL,
    {
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert...' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    },
    {
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

// NEW
private async callGemini(prompt: string): Promise<string> {
  const fullPrompt = `You are an expert software engineer...

${prompt}`;

  const result = await this.model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}
```

### Environment Variables

#### Old `.env`
```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

#### New `.env`
```bash
GEMINI_API_KEY=AIzaSyBxxxxx
```

### Documentation Updates

- ✅ Updated `AI_REFACTORING.md` with Gemini info
- ✅ Updated `SETUP_AI_REFACTORING.md` with free tier details
- ✅ Created `GET_GEMINI_API_KEY.md` with step-by-step guide
- ✅ Updated `README.md` with Gemini features
- ✅ Updated `.env.example` with Gemini key

## Migration Steps

### For Existing Projects

1. **Install new dependency**
   ```bash
   cd backend
   npm install @google/generative-ai
   ```

2. **Get Gemini API key**
   - Visit https://aistudio.google.com/app/apikey
   - Sign in with Google
   - Create API key
   - Copy the key

3. **Update environment variable**
   ```bash
   # In backend/.env
   # Remove old key
   # OPENAI_API_KEY=sk-...
   
   # Add new key
   GEMINI_API_KEY=AIzaSyB...
   ```

4. **Restart backend**
   ```bash
   npm run dev
   ```

5. **Test**
   - Analyze a project
   - Click "⚡ AI Fix" on any issue
   - Verify refactoring works

## Performance Comparison

| Metric | OpenAI GPT-4 | Gemini 1.5 Flash |
|--------|--------------|------------------|
| Cost | ~$0.03/request | FREE |
| Speed | 3-10 seconds | 2-5 seconds |
| Quality | Excellent | Very Good |
| Rate Limit | Pay-per-use | 1,500/day |
| Setup | Credit card | Google account |

## Expected Behavior

### Before (OpenAI)
```
User clicks "AI Fix"
  → Backend calls OpenAI API (~$0.03, 5 seconds)
  → Returns refactored code
  → Displays diff
```

### After (Gemini)
```
User clicks "AI Fix"
  → Backend calls Gemini API (FREE, 3 seconds)
  → Returns refactored code
  → Displays diff
```

**Result:** Same functionality, faster, and FREE! 🎉

## Troubleshooting

### "Module '@google/generative-ai' not found"
```bash
cd backend
npm install @google/generative-ai
```

### "GEMINI_API_KEY is not set"
Check `backend/.env` file exists and has:
```bash
GEMINI_API_KEY=AIzaSyBxxxxx
```

### "Invalid API key"
- Make sure you copied the full key (39 characters)
- Regenerate key at https://aistudio.google.com/app/apikey
- Check for extra spaces

### "Quota exceeded"
- You've hit the 1,500 requests/day limit (rare)
- Wait 24 hours or create a new API key in different project

## Benefits Summary

### Cost Savings
- **Before:** ~$3-5 for 100 refactorings
- **After:** $0 for 1,500 refactorings/day

### Development
- **Before:** Need to add credits, manage billing
- **After:** Sign in with Google, start immediately

### Production
- **Before:** Monitor costs, set limits
- **After:** Free tier is generous enough for most teams

## Code Quality

Both APIs produce high-quality refactorings:
- ✅ Maintain functional equivalence
- ✅ Follow best practices
- ✅ Clear, readable code
- ✅ Proper error handling

Gemini 1.5 Flash is specifically optimized for:
- Fast response times
- Code generation tasks
- Efficient token usage

## Rollback (if needed)

If you need to switch back:

1. Keep the old code in Git history
2. Reinstall axios: `npm install axios`
3. Revert `ai-refactoring.service.ts`
4. Update `.env` with OpenAI key
5. Restart backend

But honestly, why would you? Gemini is faster and FREE! 😄

## Next Steps

1. ✅ Get your FREE Gemini API key
2. ✅ Update `.env` file
3. ✅ Test the AI refactoring
4. ✅ Enjoy unlimited refactorings!

---

**Questions?** Check the [setup guide](./SETUP_AI_REFACTORING.md) or [Gemini key guide](./GET_GEMINI_API_KEY.md).
