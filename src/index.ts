/**
 * Ordo Risk Engine
 * Entry point and CLI interface
 */

import * as dotenv from 'dotenv';
import { RiskEngineService } from './services/risk-engine.service';

// Load environment variables
dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error('❌ Error: HELIUS_API_KEY not found in environment variables');
    console.log('Please add HELIUS_API_KEY to your .env file');
    process.exit(1);
  }

  // Initialize risk engine
  const riskEngine = new RiskEngineService(heliusApiKey);

  // Get token address from command line or use example
  const tokenAddress = process.argv[2] || 'So11111111111111111111111111111111111111112'; // Wrapped SOL

  console.log('🛡️  Ordo Risk Engine v1.0.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Analyze token
    const analysis = await riskEngine.analyzeToken(tokenAddress);

    // Display formatted results
    console.log(riskEngine.formatAnalysis(analysis));

    // Exit with appropriate code
    const exitCode = analysis.marketScore.recommendation === 'REJECT' ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Export services for use as library
export { RiskEngineService } from './services/risk-engine.service';
export { HeliusService } from './services/helius.service';
export { MetricsService } from './services/metrics.service';
export { ScoringService } from './services/scoring.service';
export * from './types';

// Run CLI if executed directly
if (require.main === module) {
  main();
}
