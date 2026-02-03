# Ordo ReAct Agent Documentation

## Overview

The Ordo ReAct Agent implements the **Reasoning + Acting** pattern for autonomous token risk analysis. It combines LLM-powered reasoning with tool execution to provide intelligent, step-by-step analysis of Solana tokens.

## What is ReAct?

ReAct (Reasoning + Acting) is an AI agent pattern that alternates between:
1. **Reasoning** - Thinking about what to do next
2. **Acting** - Using tools to gather information
3. **Observing** - Analyzing the results
4. **Repeating** - Until enough information is gathered

This creates a transparent, explainable decision-making process.

---

## Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│         ReAct Agent Loop            │
│                                     │
│  1. Thought: "I need to analyze..." │
│  2. Action: analyze_token_risk      │
│  3. Observation: [Risk data]        │
│  4. Thought: "Based on this..."     │
│  5. Final Answer: [Response]        │
└─────────────────────────────────────┘
    ↓
User receives comprehensive answer
```

---

## Features

### 🧠 LLM-Powered Reasoning
- Uses OpenRouter API (Claude, GPT-4, etc.)
- Intelligent decision-making
- Natural language understanding
- Context-aware responses

### 🔧 Tool Integration
- **analyze_token_risk** - Full risk analysis
- **quick_risk_check** - Fast PROCEED/CAUTION/REJECT
- **compare_tokens** - Multi-token comparison
- **extract_token_info** - Basic token information

### 📊 Transparent Process
- Shows reasoning steps
- Displays tool usage
- Explains observations
- Provides final answer

### 🔄 Iterative Refinement
- Up to 5 reasoning iterations
- Gathers information progressively
- Adapts based on observations
- Handles complex queries

---

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
```bash
cp .env.example .env
```

Add to `.env`:
```
HELIUS_API_KEY=your_helius_key
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Get API keys:
- **Helius**: https://helius.dev
- **OpenRouter**: https://openrouter.ai

---

## Usage

### Interactive CLI

```bash
npm run agent
```

**Example session:**
```
🛡️  Ordo ReAct Agent - Interactive Token Risk Analysis

I am Ordo, your AI token risk analyst.

🤖 You: Analyze token So11111111111111111111111111111111111111112

🔄 Iteration 1/5

💭 Thought: I need to analyze this token to assess its risk profile
🔧 Action: analyze_token_risk
📥 Input: So11111111111111111111111111111111111111112
👁️  Observation: Risk Analysis Complete: Grade: A, Score: 95/100...

🔄 Iteration 2/5

💭 Thought: Based on the analysis, this token shows excellent metrics
✅ Final Answer:

This token receives a Grade A with a score of 95/100.

✅ Recommendation: PROCEED

This token shows strong market metrics with healthy liquidity,
good holder distribution, and solid trading activity...
```

### Programmatic Usage

```typescript
import { ReActAgent } from './src/agents/react-agent';

const agent = new ReActAgent(
  process.env.HELIUS_API_KEY!,
  process.env.OPENROUTER_API_KEY!,
  'anthropic/claude-3.5-sonnet'
);

// Run analysis
const answer = await agent.run(
  'Is token So11111111111111111111111111111111111111112 safe to trade?'
);

console.log(answer);

// Get conversation history
const history = agent.getHistory();
history.forEach(step => {
  console.log('Thought:', step.thought);
  console.log('Action:', step.action);
  console.log('Observation:', step.observation);
});
```

### Demo Script

```bash
npm run agent:demo
```

---

## Example Queries

### Single Token Analysis
```
"Analyze token So11111111111111111111111111111111111111112"
"Is EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v safe?"
"What's the risk of trading [TOKEN_ADDRESS]?"
"Should I buy [TOKEN_ADDRESS]?"
```

### Token Comparison
```
"Compare token A and token B"
"Which is safer: [TOKEN1] or [TOKEN2]?"
"Analyze both [TOKEN1] and [TOKEN2]"
```

### Information Extraction
```
"How many holders does [TOKEN_ADDRESS] have?"
"What's the liquidity of [TOKEN_ADDRESS]?"
"Tell me about [TOKEN_ADDRESS]"
```

---

## ReAct Loop Explained

### Step 1: Initial Thought
```
Thought: I need to analyze token So1111... to assess its risk.
Let me use the analyze_token_risk tool.
```

### Step 2: Action Selection
```
Action: analyze_token_risk
Action Input: So11111111111111111111111111111111111111112
```

### Step 3: Tool Execution
```
Observation: Risk Analysis Complete:
Grade: A
Score: 95/100
Recommendation: PROCEED
...
```

### Step 4: Analysis
```
Thought: Based on the analysis, this token shows excellent
metrics with Grade A rating. I now have enough information
to provide a comprehensive answer.
```

### Step 5: Final Answer
```
Final Answer: This token receives a Grade A with a score
of 95/100. It shows strong market metrics and is safe
for trading...
```

---

## Available Tools

### 1. analyze_token_risk
**Description**: Full risk analysis with all metrics  
**Input**: Token mint address  
**Output**: Grade, score, metrics, reasoning, limiting factors

**Example:**
```
Action: analyze_token_risk
Action Input: So11111111111111111111111111111111111111112
```

### 2. quick_risk_check
**Description**: Fast PROCEED/CAUTION/REJECT assessment  
**Input**: Token mint address  
**Output**: Single recommendation

**Example:**
```
Action: quick_risk_check
Action Input: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 3. compare_tokens
**Description**: Compare multiple tokens side-by-side  
**Input**: Comma-separated token addresses  
**Output**: Comparison table with recommendations

**Example:**
```
Action: compare_tokens
Action Input: TOKEN1, TOKEN2, TOKEN3
```

### 4. extract_token_info
**Description**: Get basic token information  
**Input**: Token mint address  
**Output**: Holders, concentration, liquidity, volume

**Example:**
```
Action: extract_token_info
Action Input: So11111111111111111111111111111111111111112
```

---

## Configuration

### Model Selection

Choose from OpenRouter's available models:

**Recommended:**
- `anthropic/claude-3.5-sonnet` - Best reasoning (default)
- `anthropic/claude-3-opus` - Most capable
- `openai/gpt-4o` - Fast and reliable
- `google/gemini-1.5-pro` - Good balance

**Budget-friendly:**
- `anthropic/claude-3-haiku` - Fast and cheap
- `openai/gpt-4o-mini` - Affordable
- `meta-llama/llama-3.1-70b` - Open source

Set in `.env`:
```
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Max Iterations

Adjust in code:
```typescript
const agent = new ReActAgent(heliusKey, openRouterKey);
agent.maxIterations = 10; // Default: 5
```

---

## Advanced Usage

### Custom Tools

Add your own tools:

```typescript
agent.tools.set('my_custom_tool', {
  name: 'my_custom_tool',
  description: 'Does something custom',
  execute: async (input: string) => {
    // Your logic here
    return 'Result';
  },
});
```

### Conversation History

Access full reasoning trace:

```typescript
const history = agent.getHistory();

history.forEach((step, i) => {
  console.log(`Step ${i + 1}:`);
  console.log('  Thought:', step.thought);
  console.log('  Action:', step.action);
  console.log('  Input:', step.actionInput);
  console.log('  Observation:', step.observation);
  console.log('  Answer:', step.answer);
});
```

### Error Handling

The agent includes fallback reasoning:

```typescript
try {
  const answer = await agent.run(query);
} catch (error) {
  // Agent will fall back to rule-based reasoning
  // if OpenRouter API fails
  console.error('Error:', error);
}
```

---

## Performance

### Typical Response Times

| Query Type | Iterations | Time |
|------------|-----------|------|
| Single token analysis | 2-3 | 5-10s |
| Token comparison | 2-3 | 8-15s |
| Information extraction | 1-2 | 3-7s |

### Cost Estimation

**Per query (using Claude 3.5 Sonnet):**
- Input tokens: ~500-1000
- Output tokens: ~200-500
- Cost: ~$0.01-0.03 per query

**Budget optimization:**
- Use cheaper models (Haiku, GPT-4o-mini)
- Reduce max iterations
- Cache results

---

## Troubleshooting

### "OpenRouter API error"
- Check API key is valid
- Verify you have credits
- Try a different model

### "Maximum iterations reached"
- Increase `maxIterations`
- Simplify your query
- Check tool outputs are valid

### "Tool not found"
- Verify tool name spelling
- Check tool is registered
- Review available tools list

### Slow responses
- Use faster model (Haiku, GPT-4o-mini)
- Reduce max iterations
- Check network connection

---

## Best Practices

### Query Formulation
✅ **Good:**
- "Analyze token So1111..."
- "Is [ADDRESS] safe to trade?"
- "Compare [TOKEN1] and [TOKEN2]"

❌ **Avoid:**
- Vague queries without addresses
- Multiple unrelated questions
- Extremely long queries

### Model Selection
- **Production**: Claude 3.5 Sonnet (best reasoning)
- **Development**: GPT-4o-mini (fast, cheap)
- **Budget**: Llama 3.1 70B (free tier)

### Error Handling
Always wrap agent calls in try-catch:
```typescript
try {
  const answer = await agent.run(query);
} catch (error) {
  console.error('Agent error:', error);
  // Handle gracefully
}
```

---

## Integration Examples

### With Trading Bot
```typescript
const agent = new ReActAgent(heliusKey, openRouterKey);

async function shouldExecuteTrade(tokenAddress: string): Promise<boolean> {
  const answer = await agent.run(`Is ${tokenAddress} safe to trade?`);
  
  // Parse recommendation from answer
  if (answer.includes('PROCEED')) return true;
  if (answer.includes('CAUTION')) {
    // Request human approval
    return await requestApproval(answer);
  }
  return false;
}
```

### With Web API
```typescript
app.post('/api/analyze', async (req, res) => {
  const { query } = req.body;
  
  try {
    const answer = await agent.run(query);
    const history = agent.getHistory();
    
    res.json({
      answer,
      reasoning: history,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Comparison: ReAct vs Direct Analysis

### Direct Analysis
```typescript
const analysis = await riskEngine.analyzeToken(address);
console.log(analysis.marketScore.grade);
```

**Pros:**
- Fast (2-3 seconds)
- Cheap (no LLM costs)
- Predictable output

**Cons:**
- No reasoning explanation
- Fixed format
- No natural language

### ReAct Agent
```typescript
const answer = await agent.run(`Analyze token ${address}`);
console.log(answer);
```

**Pros:**
- Natural language interface
- Explains reasoning
- Flexible queries
- Handles complex questions

**Cons:**
- Slower (5-10 seconds)
- Costs money (LLM API)
- Variable output format

---

## Future Enhancements

### Planned Features
- [ ] Memory across conversations
- [ ] Multi-turn dialogue
- [ ] Tool chaining
- [ ] Parallel tool execution
- [ ] Custom prompt templates
- [ ] Streaming responses
- [ ] Voice interface

### Integration Opportunities
- [ ] Slack bot
- [ ] Discord bot
- [ ] Telegram bot
- [ ] Web dashboard
- [ ] Mobile app

---

## Resources

- **ReAct Paper**: https://arxiv.org/abs/2210.03629
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Helius Docs**: https://docs.helius.dev
- **LangChain ReAct**: https://python.langchain.com/docs/modules/agents/agent_types/react

---

## Support

- **Forum**: Post ID 83
- **Agent**: ordo-seeker-assistant
- **GitHub**: Coming soon

---

**Built for the Colosseum Agent Hackathon 🏆**
