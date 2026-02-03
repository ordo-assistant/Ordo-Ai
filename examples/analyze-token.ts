/**
 * Example: Analyze a Solana token for risk
 * 
 * Usage:
 *   npm run example <TOKEN_MINT_ADDRESS>
 * 
 * Examples:
 *   npm run example So11111111111111111111111111111111111111112  # Wrapped SOL
 *   npm run example EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC
 */

import * as dotenv from 'dotenv';
import { RiskEngineService } from '../src/services/risk-engine.service';

dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.error('❌ Error: HELIUS_API_KEY not found in .env file');
    console.log('\nPlease:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your Helius API key from https://helius.dev');
    process.exit(1);
  }

  // Get token address from command line
  const tokenAddress = process.argv[2];

  if (!tokenAddress) {
    console.error('❌ Error: No token address provided');
    console.log('\nUsage: npm run example <TOKEN_MINT_ADDRESS>');
    console.log('\nExamples:');
    console.log('  npm run example So11111111111111111111111111111111111111112  # Wrapped SOL');
    console.log('  npm run example EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC');
    process.exit(1);
  }

  console.log('🛡️  Ordo Risk Engine - Token Analysis Example\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Analyzing: ${tokenAddress}\n`);

  try {
    // Initialize risk engine
    const riskEngine = new RiskEngineService(heliusApiKey);

    // Analyze the token
    const analysis = await riskEngine.analyzeToken(tokenAddress);

    // Display formatted results
    console.log(riskEngine.formatAnalysis(analysis));

    // Show recommendation
    console.log('\n💡 Integration Example:\n');
    console.log('```typescript');
    console.log('// Quick risk check before swap');
    console.log(`const risk = await engine.quickRiskCheck('${tokenAddress}');`);
    console.log('if (risk === "PROCEED") {');
    console.log('  await executeSwap();');
    console.log('} else if (risk === "CAUTION") {');
    console.log('  await requestHumanApproval();');
    console.log('} else {');
    console.log('  console.log("Transaction rejected - high risk token");');
    console.log('}');
    console.log('```\n');

    // Exit with appropriate code
    const exitCode = analysis.marketScore.recommendation === 'REJECT' ? 1 : 0;
    process.exit(exitCode);
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    console.log('\nPossible issues:');
    console.log('  • Invalid token address');
    console.log('  • Helius API key invalid or out of credits');
    console.log('  • Network connectivity issues');
    console.log('  • Token has no transaction history');
    process.exit(1);
  }
}

main();
