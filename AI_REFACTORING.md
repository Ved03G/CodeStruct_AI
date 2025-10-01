# 🤖 AI-Powered Code Refactoring

## Overview

CodeStruct.AI now includes **AI-powered automatic refactoring** - a game-changing feature that not only detects code issues but also generates production-ready fixes using advanced language models.

## 🌟 What Makes This Special

Unlike SonarQube and other static analysis tools that only **detect** issues, CodeStruct.AI:

✅ **Detects** code issues with AST-based analysis  
✅ **Generates** context-aware refactoring suggestions using AI  
✅ **Displays** before/after code comparison with diff viewer  
✅ **Validates** changes maintain functional equivalence  
✅ **Applies** fixes directly to your codebase  

## 🚀 Features

### 1. **Context-Aware Refactoring**
The AI understands the issue type and generates targeted fixes:
- **GodClass** → Breaks down into smaller, focused classes
- **DeepNesting** → Extracts nested logic with early returns
- **DuplicateCode** → Extracts into reusable functions
- **HighComplexity** → Simplifies with helper functions
- **MagicNumber** → Replaces with named constants
- And more...

### 2. **Smart Prompting**
Each issue type gets specialized prompts:
```typescript
DeepNesting: 'Reduce nesting depth by extracting nested logic into separate functions, using early returns (guard clauses)...'
GodClass: 'Break down this class into smaller, focused classes following Single Responsibility Principle...'
```

### 3. **Side-by-Side Diff Viewer**
Beautiful UI showing:
- ❌ Original code (highlighted in red)
- ✅ Refactored code (highlighted in green)
- 🔄 Modified lines (highlighted in yellow)
- Line-by-line comparison

### 4. **Confidence Scoring**
AI provides confidence scores based on:
- Issue complexity
- Code size
- Change scope
- Historical success rates

## 📋 Supported Issue Types

| Issue Type | AI Refactoring | Complexity |
|------------|----------------|------------|
| GodClass | ✅ Yes | High |
| DeepNesting | ✅ Yes | Medium |
| LongParameterList | ✅ Yes | Low |
| HighComplexity | ✅ Yes | High |
| CognitiveComplexity | ✅ Yes | Medium |
| DuplicateCode | ✅ Yes | Low |
| MagicNumber | ✅ Yes | Very Low |
| DeadCode | ✅ Yes | Very Low |
| FeatureEnvy | ✅ Yes | Medium |
| LongMethod | ❌ Too Large | N/A |

## 🔧 Setup

### 1. Get Google Gemini API Key (FREE!)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add to `.env`:
   ```bash
   GEMINI_API_KEY=your-api-key-here
   ```

**✨ No credit card required! Generous free tier with 1,500 requests/day.**

### 2. Run Database Migration
```bash
cd backend
npx prisma migrate dev
```

### 3. Start the Services
```bash
npm run dev
```

## 💻 Usage

### From the UI:

1. **Analyze your project** to detect code issues
2. **Click any issue card** to view details
3. **Click the "AI Fix" button** (⚡ AI Fix)
4. **Review the suggestion** with side-by-side diff
5. **Accept or Reject** the refactoring

### From the API:

```bash
# Generate AI refactoring
POST /api/issues/:id/ai-refactor

# Get existing suggestion
GET /api/issues/:id/ai-refactor

# Accept suggestion
POST /api/issues/:id/ai-refactor/accept

# Reject suggestion
POST /api/issues/:id/ai-refactor/reject
```

## 🎯 Example Workflow

### Before (Original Code):
```typescript
function processUser(user) {
  if (user) {
    if (user.active) {
      if (user.verified) {
        if (user.email) {
          return sendEmail(user.email);
        }
      }
    }
  }
  return false;
}
```

### After (AI Refactored):
```typescript
function processUser(user) {
  // Guard clauses for early returns
  if (!user) return false;
  if (!user.active) return false;
  if (!user.verified) return false;
  if (!user.email) return false;
  
  return sendEmail(user.email);
}
```

**Result:** Reduced nesting from 5 levels to 1! ✨

## 🔒 Safety Features

1. **Functional Equivalence**: AI maintains exact same behavior
2. **Signature Preservation**: Function interfaces remain unchanged
3. **Confidence Scoring**: Low-confidence suggestions are flagged
4. **Human Review**: All suggestions require manual approval
5. **Rollback Support**: Original code always preserved

## 💰 Cost Considerations

**FREE!** 🎉

Google Gemini API offers:
- **Free Tier:** 1,500 requests/day, 1M tokens/minute
- **Fast & Efficient:** gemini-1.5-flash model optimized for speed
- **No Credit Card:** Get started immediately

**Why Gemini?**
- ✅ Free tier is very generous
- ✅ Fast response times (2-5 seconds)
- ✅ Comparable quality to GPT-4
- ✅ No billing surprises

## 🎨 UI Components

### AIRefactorViewer
Main modal component with:
- Loading states
- Error handling
- Tab navigation (Diff / Original / Refactored)
- Action buttons (Accept / Reject / Regenerate)

### EnhancedIssueCard
Updated with:
- ⚡ AI Fix button
- Integration with AIRefactorViewer
- Skip logic for LongMethod issues

## 🧪 Testing

```bash
# Run tests
npm test

# Test AI refactoring endpoint
curl -X POST http://localhost:3000/api/issues/1/ai-refactor \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Pro Tip:** Test with DeepNesting or MagicNumber issues first - they're simpler and faster!

## 📊 Metrics

Track your refactoring success:
- Issues detected
- Refactorings generated
- Acceptance rate
- Time saved
- Code quality improvements

## 🚧 Limitations

1. **LongMethod** issues excluded (too large for context window)
2. **Free Tier Limits**: 1,500 requests/day (very generous for most use cases)
3. **Context Size**: Optimized for typical function/class sizes
4. **Language Support**: Currently optimized for TypeScript/JavaScript

## 🔮 Future Enhancements

- [ ] Multi-file refactoring
- [ ] Batch refactoring for similar issues
- [ ] Custom refactoring templates
- [ ] Integration with GitHub Actions
- [ ] Support for more programming languages
- [ ] Local LLM support (Llama, CodeLlama)
- [ ] Automated testing of refactored code

## 📚 Learn More

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Code Refactoring Patterns](https://refactoring.guru/refactoring)

---

**Built with ❤️ using Google Gemini 1.5 Flash and Tree-Sitter AST Analysis**
