/**
 * Test script for risk scoring engine
 * Tests scoring logic with mock data
 */

import { ScoringService } from './services/scoring.service';
import { TokenMetrics } from './types';

const scoring = new ScoringService();

console.log('🧪 Testing Ordo Risk Scoring Engine\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test Case 1: Grade A Token (Blue Chip)
console.log('Test 1: Grade A Token (Blue Chip)');
console.log('─────────────────────────────────────');
const gradeAMetrics: TokenMetrics = {
  holderCount: 5000,
  volume7d: 10_000_000,
  liquidity: 5_000_000,
  marketCap: 50_000_000,
  topHolderConcentration: 15,
  tokenAge: Date.now() / 1000 - 90 * 24 * 60 * 60, // 90 days old
  dailyVolume: 1_500_000,
};

const scoreA = scoring.calculateMarketScore(gradeAMetrics);
console.log(`Grade: ${scoreA.grade}`);
console.log(`Score: ${scoreA.score}/100`);
console.log(`Recommendation: ${scoreA.recommendation}`);
console.log(`Reasoning: ${scoreA.reasoning}\n`);

// Test Case 2: Grade B Token (Moderate Risk)
console.log('Test 2: Grade B Token (Moderate Risk)');
console.log('─────────────────────────────────────');
const gradeBMetrics: TokenMetrics = {
  holderCount: 800,
  volume7d: 500_000,
  liquidity: 200_000,
  marketCap: 2_000_000,
  topHolderConcentration: 45,
  tokenAge: Date.now() / 1000 - 5 * 24 * 60 * 60, // 5 days old
  dailyVolume: 80_000,
};

const scoreB = scoring.calculateMarketScore(gradeBMetrics);
console.log(`Grade: ${scoreB.grade}`);
console.log(`Score: ${scoreB.score}/100`);
console.log(`Recommendation: ${scoreB.recommendation}`);
console.log(`Limiting Factors: ${scoreB.limitingFactors.join(', ')}`);
console.log(`Reasoning: ${scoreB.reasoning}\n`);

// Test Case 3: Grade C Token (High Risk / Scam)
console.log('Test 3: Grade C Token (High Risk / Scam)');
console.log('─────────────────────────────────────');
const gradeCMetrics: TokenMetrics = {
  holderCount: 15,
  volume7d: 500,
  liquidity: 800,
  marketCap: 50_000,
  topHolderConcentration: 85,
  tokenAge: Date.now() / 1000 - 12 * 60 * 60, // 12 hours old
  dailyVolume: 50,
};

const scoreC = scoring.calculateMarketScore(gradeCMetrics);
console.log(`Grade: ${scoreC.grade}`);
console.log(`Score: ${scoreC.score}/100`);
console.log(`Recommendation: ${scoreC.recommendation}`);
console.log(`Limiting Factors: ${scoreC.limitingFactors.join(', ')}`);
console.log(`Risk Signals: ${scoreC.riskSignals}`);
console.log(`Reasoning: ${scoreC.reasoning}\n`);

// Test Case 4: Edge Case - New but Legitimate
console.log('Test 4: Edge Case - New but Legitimate');
console.log('─────────────────────────────────────');
const edgeCaseMetrics: TokenMetrics = {
  holderCount: 1200,
  volume7d: 2_000_000,
  liquidity: 1_000_000,
  marketCap: 10_000_000,
  topHolderConcentration: 35,
  tokenAge: Date.now() / 1000 - 3 * 24 * 60 * 60, // 3 days old
  dailyVolume: 300_000,
};

const scoreEdge = scoring.calculateMarketScore(edgeCaseMetrics);
console.log(`Grade: ${scoreEdge.grade}`);
console.log(`Score: ${scoreEdge.score}/100`);
console.log(`Recommendation: ${scoreEdge.recommendation}`);
console.log(`Limiting Factors: ${scoreEdge.limitingFactors.join(', ') || 'None'}`);
console.log(`Reasoning: ${scoreEdge.reasoning}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All tests completed successfully!');
