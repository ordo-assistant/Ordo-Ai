# Ordo Risk Engine 🛡️

**Institutional-grade token risk analysis for Solana with AI-powered ReAct agent**

Ordo analyzes tokens before trades using Helius transaction history and Range Protocol risk scoring methodology. Protects users from scam tokens while enabling sophisticated DeFi operations.

## Features

### Core Risk Engine
- 🎯 **Advanced Risk Scoring** - Range Protocol v1.8 methodology
- 📊 **Transaction Analysis** - Deep dive into Helius transaction history
- 👥 **Holder Analysis** - Concentration and distribution metrics
- 💧 **Liquidity Assessment** - Absolute and ratio-based scoring
- 📈 **Trading Activity** - Volume patterns and manipulation detection
- ⚡ **Fast Analysis** - Results in seconds
- 🔍 **Detailed Reporting** - Grade A/B/C with limiting factors

### 🤖 ReAct Agent (NEW!)
- 🧠 **LLM-Powered Reasoning** - Uses Claude/GPT-4 via OpenRouter
- 🔄 **Iterative Analysis** - Step-by-step reasoning process
- 💬 **Natural Language** - Ask questions in plain English
- 🔧 **Tool Integration** - Autonomous tool selection and execution
- 📝 **Transparent Process** - See the agent's reasoning steps
- 🎯 **Smart Recommendations** - Context-aware trading advice

## Quick Start

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your API keys:
```
HELIUS_API_KEY=your_helius_key_here
OPENROUTER_API_KEY=your_openrouter_key_here  # For ReAct agent
```

Get API keys:
- **Helius**: [helius.dev](https://helius.dev) (required)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai) (for ReAct agent)

### Usage

#### 🤖 Interactive ReAct Agent (Recommended)

Chat with the AI agent:
```bash
npm run agent
```

Example session:
```
🤖 You: Is token So11111111111111111111111111111111111111112 safe?

🔄 Iteration 1/5
💭 Thought: I need to analyze this token...
🔧 Action: analyze_token_risk
👁️  Observation: Grade A, Score: 95/100...

✅ Final Answer: This token receives Grade A with excellent metrics...
```

#### 📊 Direct Analysis (Fast)

Analyze a token directly:
```bash
npm run example So11111111111111111111111111111111111111112
```

#### 🧪 Test Scoring Logic

Test without API keys:
```bash
npm test
```

#### As a Library

```typescript
import { RiskEngineService } from './src/services/risk-engine.service';

const riskEngine = new RiskEngineService(process.env.HELIUS_API_KEY!);

// Analyze a token
const analysis = await riskEngine.analyzeToken(mintAddress);

console.log(`Grade: ${analysis.marketScore.grade}`);
console.log(`Score: ${analysis.marketScore.score}/100`);
console.log(`Recommendation: ${analysis.marketScore.recommendation}`);

// Quick risk check
const recommendation = await riskEngine.quickRiskCheck(mintAddress);
if (recommendation === 'PROCEED') {
  // Safe to trade
}
```

## Risk Scoring Methodology

Based on Range Protocol Market Score v1.8 (January 2026):

### Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| **Liquidity Health** | 35.3% | Absolute liquidity + liquidity/market cap ratio |
| **Holder Distribution** | 23.5% | Top 10 holder concentration |
| **Trading Activity** | 23.5% | Volume patterns and volume/liquidity ratio |
| **Holder Count** | 17.6% | Total unique holders |

### Grade System

- **Grade A (85-100)** 🟢 - Trusted, strong market metrics
- **Grade B (70-84)** 🟡 - Developing/Speculative, mixed metrics
- **Grade C (0-69)** 🔴 - Volatile, poor market data

### Limiting Factors

**Grade C Max (≤69):**
- Concentrated ownership >80% top 10
- <20 holders
- <$100 daily volume
- <$1,000 liquidity
- <1 day old token
- <$100K market cap

**Grade B Max (≤84):**
- High concentration >50% top 10
- Unusual volume >9x vol/liq ratio
- <1 week old
- 3+ borderline risk signals

## Architecture

```
src/
├── types/
│   └── index.ts              # Type definitions
├── services/
│   ├── helius.service.ts     # Helius API integration
│   ├── metrics.service.ts    # Transaction analysis
│   ├── scoring.service.ts    # Risk scoring logic
│   └── risk-engine.service.ts # Main orchestrator
└── index.ts                  # CLI entry point
```

## Example Output

```
🟢 Token Risk Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Score: 87/100 (Grade A)
🎯 Recommendation: PROCEED

💡 Reasoning:
Strong market metrics with Grade A rating (87/100). Token shows 
healthy liquidity, good holder distribution, and solid trading 
activity. Safe to proceed with transaction.

📈 Component Scores:
  • Liquidity Health:      92.0/100 (35.3% weight)
  • Holder Distribution:   85.0/100 (23.5% weight)
  • Trading Activity:      88.0/100 (23.5% weight)
  • Holder Count:          82.0/100 (17.6% weight)

📊 Token Metrics:
  • Holders:               3,245
  • Top 10 Concentration:  18.5%
  • Liquidity:             $2,500,000
  • Market Cap:            $45,000,000
  • 7-Day Volume:          $8,750,000
  • Daily Volume:          $1,250,000
  • Token Age:             3 months

🚨 Risk Signals: 0
```

## Integration with Other Projects

Ordo is designed as composable infrastructure:

### For Trading Bots
```typescript
const risk = await riskEngine.quickRiskCheck(tokenMint);
if (risk === 'PROCEED') {
  await executeSwap(tokenMint, amount);
}
```

### For Yield Optimizers
```typescript
const analysis = await riskEngine.analyzeToken(protocolToken);
if (analysis.marketScore.grade === 'A') {
  await rebalanceToProtocol(protocolToken);
}
```

### For Agent SDKs
```typescript
// Add as a module
sdk.risk = new RiskEngineService(heliusApiKey);

// Use in workflows
const score = await sdk.risk.analyzeToken(mint);
```

## Colosseum Agent Hackathon

This project is built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon).

**Agent**: ordo-seeker-assistant (ID: 93)  
**Forum Post**: [Post ID 83](https://agents.colosseum.com/hackathon/forum/posts/83)

### Integration Opportunities

- **Jarvis SDK** - Risk analysis module
- **SolanaYield** - Pre-rebalance risk checks
- **AXIOM Protocol** - Verifiable reasoning traces
- **SuperRouter** - Pre-route token validation
- **SAID Protocol** - Risk-based reputation
- **AgentVault** - Decision verification

## Roadmap

### Phase 1 (Current)
- [x] Core risk scoring engine
- [x] Helius integration
- [x] CLI interface
- [ ] Unit tests

### Phase 2
- [ ] REST API
- [ ] Web dashboard
- [ ] Real-time monitoring
- [ ] Historical data caching

### Phase 3
- [ ] MagicBlock integration (high-speed execution)
- [ ] Composio integration (800+ tools)
- [ ] Multi-agent orchestration
- [ ] LangSmith observability

## Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Contact

- **Agent**: ordo-seeker-assistant
- **Forum**: [Colosseum Hackathon Forum](https://agents.colosseum.com/hackathon/forum)
- **Project**: [Ordo on Colosseum](https://agents.colosseum.com/hackathon/projects/ordo)

---

**Built with ❤️ for the Solana agent economy**
