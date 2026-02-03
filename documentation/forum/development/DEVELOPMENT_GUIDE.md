# Ordo Risk Engine - Development Guide

## Project Structure

```
ordo-risk-engine/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── services/
│   │   ├── helius.service.ts     # Helius API integration
│   │   ├── metrics.service.ts    # Transaction analysis & metrics extraction
│   │   ├── scoring.service.ts    # Risk scoring algorithm (Range Protocol v1.8)
│   │   └── risk-engine.service.ts # Main orchestrator
│   ├── index.ts                  # CLI entry point & exports
│   └── test-scoring.ts           # Test script with mock data
├── documentation/
│   ├── HACKATHON_REGISTRATION.md
│   ├── HACKATHON_STATUS.md
│   └── forum/
│       ├── FORUM_ENGAGEMENT_SUMMARY.md
│       └── development/
│           ├── NEXT_STEPS.md
│           └── DEVELOPMENT_GUIDE.md (this file)
├── package.json
├── tsconfig.json
├── .env.example
├── .env.hackathon              # Hackathon credentials (gitignored)
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Add your Helius API key:
```
HELIUS_API_KEY=your_helius_api_key_here
```

Get a free API key at: https://helius.dev

### 3. Test the Scoring Engine

Run the test script with mock data:
```bash
npm test
```

This will test the scoring logic with 4 scenarios:
- Grade A token (blue chip)
- Grade B token (moderate risk)
- Grade C token (high risk/scam)
- Edge case (new but legitimate)

### 4. Run CLI Analysis

Analyze a real token (requires Helius API key):
```bash
npm run dev <TOKEN_MINT_ADDRESS>
```

Example with Wrapped SOL:
```bash
npm run dev So11111111111111111111111111111111111111112
```

## Architecture Overview

### Data Flow

```
1. User Input (Token Mint Address)
   ↓
2. RiskEngineService.analyzeToken()
   ↓
3. HeliusService.getTransactionsForAddress()
   ↓ (Transaction History)
4. HeliusService.getTokenHolders()
   ↓ (Holder Data)
5. MetricsService.extractMetricsFromTransactions()
   ↓ (TokenMetrics)
6. ScoringService.calculateMarketScore()
   ↓ (MarketScore)
7. Return TokenAnalysisResult
```

### Service Responsibilities

#### HeliusService
- Fetches transaction history from Helius API
- Retrieves token metadata
- Gets holder information
- Handles API errors and retries

#### MetricsService
- Extracts unique holders from transactions
- Calculates 7-day and daily volume
- Estimates liquidity from transaction patterns
- Computes top holder concentration
- Filters out system accounts

#### ScoringService
- Implements Range Protocol v1.8 methodology
- Scores 4 components with proper weights
- Applies limiting factors for grade caps
- Identifies risk signals
- Generates recommendations and reasoning

#### RiskEngineService
- Orchestrates the entire analysis flow
- Provides high-level API methods
- Formats results for display
- Handles batch analysis

## Risk Scoring Algorithm

### Component Scoring

#### 1. Liquidity Health (35.3% weight)
```typescript
// Uses HIGHER of absolute or ratio score
absoluteScore = f(liquidity)
ratioScore = f(liquidity / marketCap)
score = max(absoluteScore, ratioScore)
```

Thresholds:
- $10M+ liquidity = 100
- $5M liquidity = 80
- $1M liquidity = 60
- 5%+ liq/mcap ratio = 100
- 3% ratio = 80
- 1% ratio = 60

#### 2. Holder Distribution (23.5% weight)
```typescript
score = f(topHolderConcentration)
```

Thresholds:
- ≤20% concentration = 100
- ≤30% = 80
- ≤40% = 60
- ≤50% = 40
- ≤70% = 20

#### 3. Trading Activity (23.5% weight)
```typescript
// Sweet spot: 0.5x-4x volume/liquidity ratio
absoluteScore = f(volume7d)
ratioScore = f(volume7d / liquidity)
score = max(absoluteScore, ratioScore) + activityBonus
```

Sweet spot: 0.5x-4x vol/liq = 100 points

#### 4. Holder Count (17.6% weight)
```typescript
score = f(holderCount)
```

Thresholds:
- 5000+ holders = 100
- 2000+ = 80
- 1000+ = 60
- 500+ = 40
- 100+ = 20

### Weighted Score Calculation

```typescript
rawScore = 
  liquidityHealth * 0.353 +
  holderDistribution * 0.235 +
  tradingActivity * 0.235 +
  holderCount * 0.176
```

### Limiting Factors

**Grade C Max (≤69):**
- Concentration >80%
- <20 holders
- <$100 daily volume
- <$1,000 liquidity
- <1 day old
- <$100K market cap

**Grade B Max (≤84):**
- Concentration >50%
- Volume/liquidity >9x
- <1 week old
- 3+ risk signals

### Final Grade Assignment

```typescript
if (rawScore >= 85 && no limiting factors) → Grade A
if (rawScore >= 70 && no C-level factors) → Grade B
else → Grade C
```

## Testing Strategy

### Current Tests

1. **Mock Data Tests** (`test-scoring.ts`)
   - Grade A scenario
   - Grade B scenario
   - Grade C scenario
   - Edge cases

### Future Tests

1. **Unit Tests**
   - Each scoring component
   - Limiting factor detection
   - Metric extraction logic

2. **Integration Tests**
   - Helius API calls
   - End-to-end analysis
   - Error handling

3. **Real Token Tests**
   - Known blue chips (SOL, USDC)
   - Known scams (historical data)
   - Edge cases (new launches)

## Development Workflow

### Adding New Features

1. **Define Types** in `src/types/index.ts`
2. **Implement Service** in `src/services/`
3. **Update RiskEngine** to orchestrate
4. **Add Tests** in `src/test-*.ts`
5. **Update README** with usage examples

### Code Style

- Use TypeScript strict mode
- Document public methods with JSDoc
- Use descriptive variable names
- Keep functions focused and small
- Handle errors gracefully

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature
```

## API Integration Examples

### As a Library

```typescript
import { RiskEngineService } from 'ordo-risk-engine';

const engine = new RiskEngineService(heliusApiKey);

// Full analysis
const result = await engine.analyzeToken(mintAddress);
console.log(result.marketScore.grade); // 'A', 'B', or 'C'

// Quick check
const recommendation = await engine.quickRiskCheck(mintAddress);
if (recommendation === 'PROCEED') {
  // Safe to trade
}

// Batch analysis
const results = await engine.analyzeTokens([mint1, mint2, mint3]);
```

### REST API (Future)

```typescript
// GET /api/analyze/:mintAddress
app.get('/api/analyze/:mintAddress', async (req, res) => {
  const result = await engine.analyzeToken(req.params.mintAddress);
  res.json(result);
});

// POST /api/analyze/batch
app.post('/api/analyze/batch', async (req, res) => {
  const results = await engine.analyzeTokens(req.body.addresses);
  res.json(results);
});
```

## Performance Considerations

### Current Performance
- Single token analysis: ~2-5 seconds
- Batch analysis: ~2-5 seconds per token (parallel)

### Optimization Opportunities
1. **Caching** - Cache analysis results for 5-10 minutes
2. **Parallel Fetching** - Fetch tx history and holders simultaneously
3. **Pagination** - Limit transaction history to most recent 1000
4. **Rate Limiting** - Respect Helius API limits

## Deployment

### Local Development
```bash
npm run dev <TOKEN_ADDRESS>
```

### Production Build
```bash
npm run build
npm start <TOKEN_ADDRESS>
```

### Docker (Future)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

**Issue**: "HELIUS_API_KEY not found"
- **Solution**: Create `.env` file with your API key

**Issue**: "Failed to fetch transaction history"
- **Solution**: Check API key is valid and has credits

**Issue**: "Analysis returns Grade C for known blue chip"
- **Solution**: Check if using testnet vs mainnet addresses

### Debug Mode

Add verbose logging:
```typescript
// In .env
DEBUG=true

// In code
if (process.env.DEBUG) {
  console.log('Debug info:', data);
}
```

## Next Steps

### Phase 1 (Current Sprint)
- [x] Core scoring engine
- [x] Helius integration
- [x] CLI interface
- [ ] Unit tests
- [ ] Real token testing

### Phase 2
- [ ] REST API with Express
- [ ] Web dashboard (React)
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] API documentation (Swagger)

### Phase 3
- [ ] MagicBlock integration
- [ ] Composio tool connections
- [ ] Multi-agent orchestration
- [ ] LangSmith observability
- [ ] Production deployment

## Resources

- **Helius Docs**: https://docs.helius.dev
- **Range Protocol**: https://range.org
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js
- **TypeScript**: https://www.typescriptlang.org/docs

## Contributing

See main README.md for contribution guidelines.

## Questions?

- **Forum**: [Colosseum Hackathon Forum](https://agents.colosseum.com/hackathon/forum)
- **Post**: Post ID 83
- **Agent**: ordo-seeker-assistant

---

**Happy coding! 🛡️**
