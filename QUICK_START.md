# Ordo Risk Engine - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install
```bash
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Add your Helius API key to .env
```

Get free API key: https://helius.dev

### 3. Test
```bash
# Test scoring logic (no API key needed)
npm test

# Analyze real token (requires API key)
npm run example So11111111111111111111111111111111111111112
```

---

## 📊 Example Output

```
🟢 Token Risk Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Score: 87/100 (Grade A)
🎯 Recommendation: PROCEED

💡 Reasoning:
Strong market metrics with Grade A rating. Token shows 
healthy liquidity, good holder distribution, and solid 
trading activity. Safe to proceed with transaction.

📈 Component Scores:
  • Liquidity Health:      92.0/100 (35.3% weight)
  • Holder Distribution:   85.0/100 (23.5% weight)
  • Trading Activity:      88.0/100 (23.5% weight)
  • Holder Count:          82.0/100 (17.6% weight)
```

---

## 💻 Use as Library

```typescript
import { RiskEngineService } from 'ordo-risk-engine';

const engine = new RiskEngineService(process.env.HELIUS_API_KEY!);

// Full analysis
const analysis = await engine.analyzeToken(mintAddress);
console.log(`Grade: ${analysis.marketScore.grade}`);

// Quick check
const recommendation = await engine.quickRiskCheck(mintAddress);
if (recommendation === 'PROCEED') {
  await executeSwap();
}
```

---

## 🎯 Grade System

| Grade | Score | Meaning | Action |
|-------|-------|---------|--------|
| 🟢 A | 85-100 | Trusted | PROCEED |
| 🟡 B | 70-84 | Developing | CAUTION |
| 🔴 C | 0-69 | Volatile | REJECT |

---

## 📚 Documentation

- **README.md** - Full documentation
- **DEVELOPMENT_GUIDE.md** - Developer guide
- **IMPLEMENTATION_COMPLETE.md** - Build summary
- **BUILD_SUMMARY.md** - Technical details

---

## 🤝 Integration

### For Trading Bots
```typescript
const risk = await engine.quickRiskCheck(tokenMint);
if (risk === 'PROCEED') await executeSwap();
```

### For Yield Optimizers
```typescript
const analysis = await engine.analyzeToken(protocolToken);
if (analysis.marketScore.grade === 'A') await rebalance();
```

---

## 🆘 Troubleshooting

**"HELIUS_API_KEY not found"**
→ Create `.env` file with your API key

**"Failed to fetch transaction history"**
→ Check API key is valid and has credits

**"Analysis returns Grade C for known blue chip"**
→ Verify using mainnet address, not testnet

---

## 📞 Support

- **Forum**: Post ID 83
- **Agent**: ordo-seeker-assistant
- **Docs**: See documentation/ folder

---

**Built for the Colosseum Agent Hackathon 🏆**
