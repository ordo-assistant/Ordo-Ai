/**
 * Risk Engine Service
 * Main orchestrator for token risk analysis
 */

import { HeliusService } from './helius.service';
import { MetricsService } from './metrics.service';
import { ScoringService } from './scoring.service';
import { TokenAnalysisResult } from '../types';

export class RiskEngineService {
  private helius: HeliusService;
  private metrics: MetricsService;
  private scoring: ScoringService;

  constructor(heliusApiKey: string) {
    this.helius = new HeliusService(heliusApiKey);
    this.metrics = new MetricsService();
    this.scoring = new ScoringService();
  }

  /**
   * Analyze token risk before trade execution
   * Main entry point for risk analysis
   */
  async analyzeToken(mintAddress: string): Promise<TokenAnalysisResult> {
    console.log(`🔍 Analyzing token: ${mintAddress}`);

    try {
      // Step 1: Fetch transaction history from Helius
      console.log('📊 Fetching transaction history...');
      const txHistory = await this.helius.getTransactionsForAddress(mintAddress, {
        transactionDetails: 'full',
        sortOrder: 'asc', // Oldest first for launch analysis
        filters: {
          status: 'succeeded',
          tokenAccounts: 'all',
        },
        limit: 100,
      });

      // Step 2: Fetch holder data
      console.log('👥 Fetching holder data...');
      const holderData = await this.helius.getTokenHolders(mintAddress, 1000);

      // Step 3: Extract metrics from transaction data
      console.log('📈 Extracting metrics...');
      const tokenMetrics = this.metrics.extractMetricsFromTransactions(txHistory, holderData);

      // Step 4: Calculate market score
      console.log('🎯 Calculating risk score...');
      const marketScore = this.scoring.calculateMarketScore(tokenMetrics);

      // Step 5: Return comprehensive analysis
      const result: TokenAnalysisResult = {
        mintAddress,
        metrics: tokenMetrics,
        marketScore,
        timestamp: Date.now(),
        dataSource: 'helius',
      };

      console.log(`✅ Analysis complete: Grade ${marketScore.grade} (${marketScore.score}/100)`);
      return result;
    } catch (error) {
      console.error('❌ Risk analysis failed:', error);
      throw new Error(`Failed to analyze token ${mintAddress}: ${error}`);
    }
  }

  /**
   * Quick risk check - returns just the recommendation
   */
  async quickRiskCheck(mintAddress: string): Promise<'PROCEED' | 'CAUTION' | 'REJECT'> {
    const analysis = await this.analyzeToken(mintAddress);
    return analysis.marketScore.recommendation;
  }

  /**
   * Batch analyze multiple tokens
   */
  async analyzeTokens(mintAddresses: string[]): Promise<TokenAnalysisResult[]> {
    console.log(`🔍 Batch analyzing ${mintAddresses.length} tokens...`);

    const results = await Promise.allSettled(
      mintAddresses.map((mint) => this.analyzeToken(mint))
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<TokenAnalysisResult>).value);
  }

  /**
   * Format analysis result for display
   */
  formatAnalysis(result: TokenAnalysisResult): string {
    const { marketScore, metrics } = result;

    const gradeEmoji = {
      A: '🟢',
      B: '🟡',
      C: '🔴',
    };

    return `
${gradeEmoji[marketScore.grade]} Token Risk Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Score: ${marketScore.score}/100 (Grade ${marketScore.grade})
🎯 Recommendation: ${marketScore.recommendation}

💡 Reasoning:
${marketScore.reasoning}

📈 Component Scores:
  • Liquidity Health:      ${marketScore.components.liquidityHealth.toFixed(1)}/100 (35.3% weight)
  • Holder Distribution:   ${marketScore.components.holderDistribution.toFixed(1)}/100 (23.5% weight)
  • Trading Activity:      ${marketScore.components.tradingActivity.toFixed(1)}/100 (23.5% weight)
  • Holder Count:          ${marketScore.components.holderCount.toFixed(1)}/100 (17.6% weight)

📊 Token Metrics:
  • Holders:               ${metrics.holderCount.toLocaleString()}
  • Top 10 Concentration:  ${metrics.topHolderConcentration.toFixed(1)}%
  • Liquidity:             $${metrics.liquidity.toLocaleString()}
  • Market Cap:            $${metrics.marketCap.toLocaleString()}
  • 7-Day Volume:          $${metrics.volume7d.toLocaleString()}
  • Daily Volume:          $${metrics.dailyVolume.toLocaleString()}
  • Token Age:             ${this.formatTokenAge(metrics.tokenAge)}

${marketScore.limitingFactors.length > 0 ? `⚠️  Limiting Factors:\n${marketScore.limitingFactors.map((f) => `  • ${f}`).join('\n')}` : ''}

🚨 Risk Signals: ${marketScore.riskSignals}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * Format token age for display
   */
  private formatTokenAge(timestamp: number): string {
    const ageSeconds = Date.now() / 1000 - timestamp;
    const ageDays = Math.floor(ageSeconds / (24 * 60 * 60));

    if (ageDays === 0) return 'Less than 1 day';
    if (ageDays === 1) return '1 day';
    if (ageDays < 7) return `${ageDays} days`;
    if (ageDays < 30) return `${Math.floor(ageDays / 7)} weeks`;
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`;
    return `${Math.floor(ageDays / 365)} years`;
  }
}
