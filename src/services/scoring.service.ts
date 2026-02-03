/**
 * Risk Scoring Service
 * Implements Range Protocol Market Score v1.8 methodology
 */

import { TokenMetrics, ScoreComponents, MarketScore, RiskGrade } from '../types';

export class ScoringService {
  // Weights from Range Protocol v1.8
  private readonly WEIGHTS = {
    liquidityHealth: 0.353,
    holderDistribution: 0.235,
    tradingActivity: 0.235,
    holderCount: 0.176,
  };

  /**
   * Calculate comprehensive market score
   */
  calculateMarketScore(metrics: TokenMetrics): MarketScore {
    // Calculate individual component scores
    const components: ScoreComponents = {
      liquidityHealth: this.scoreLiquidityHealth(metrics),
      holderDistribution: this.scoreHolderDistribution(metrics),
      tradingActivity: this.scoreTradingActivity(metrics),
      holderCount: this.scoreHolderCount(metrics),
    };

    // Calculate weighted score
    const rawScore =
      components.liquidityHealth * this.WEIGHTS.liquidityHealth +
      components.holderDistribution * this.WEIGHTS.holderDistribution +
      components.tradingActivity * this.WEIGHTS.tradingActivity +
      components.holderCount * this.WEIGHTS.holderCount;

    // Apply limiting factors
    const limitingFactors = this.identifyLimitingFactors(metrics);
    const riskSignals = this.countRiskSignals(metrics);
    const { grade, cappedScore } = this.applyLimitingFactors(rawScore, metrics, limitingFactors, riskSignals);

    // Generate recommendation
    const { recommendation, reasoning } = this.generateRecommendation(grade, cappedScore, limitingFactors, metrics);

    return {
      score: Math.round(cappedScore),
      grade,
      components,
      limitingFactors,
      riskSignals,
      recommendation,
      reasoning,
    };
  }

  /**
   * Score Liquidity Health (35.3% weight)
   * Uses higher of absolute or ratio score
   */
  private scoreLiquidityHealth(metrics: TokenMetrics): number {
    const { liquidity, marketCap } = metrics;

    // Absolute liquidity score
    let absoluteScore = 0;
    if (liquidity >= 10_000_000) absoluteScore = 100;
    else if (liquidity >= 5_000_000) absoluteScore = 80;
    else if (liquidity >= 1_000_000) absoluteScore = 60;
    else if (liquidity >= 100_000) absoluteScore = 40;
    else if (liquidity >= 10_000) absoluteScore = 20;

    // Liquidity/MarketCap ratio score
    let ratioScore = 0;
    if (marketCap > 0) {
      const ratio = (liquidity / marketCap) * 100;
      if (ratio >= 5) ratioScore = 100;
      else if (ratio >= 3) ratioScore = 80;
      else if (ratio >= 1) ratioScore = 60;
      else if (ratio >= 0.5) ratioScore = 40;
      else if (ratio >= 0.1) ratioScore = 20;
    }

    // Return higher of the two
    return Math.max(absoluteScore, ratioScore);
  }

  /**
   * Score Holder Distribution (23.5% weight)
   * Lower concentration = higher score
   */
  private scoreHolderDistribution(metrics: TokenMetrics): number {
    const { topHolderConcentration } = metrics;

    if (topHolderConcentration <= 20) return 100;
    if (topHolderConcentration <= 30) return 80;
    if (topHolderConcentration <= 40) return 60;
    if (topHolderConcentration <= 50) return 40;
    if (topHolderConcentration <= 70) return 20;
    return 0;
  }

  /**
   * Score Trading Activity (23.5% weight)
   * Sweet spot: 0.5x-4x volume/liquidity ratio
   */
  private scoreTradingActivity(metrics: TokenMetrics): number {
    const { volume7d, liquidity, dailyVolume } = metrics;

    // Absolute volume score
    let absoluteScore = 0;
    if (volume7d >= 5_000_000) absoluteScore = 100;
    else if (volume7d >= 1_000_000) absoluteScore = 80;
    else if (volume7d >= 100_000) absoluteScore = 60;
    else if (volume7d >= 10_000) absoluteScore = 40;
    else if (volume7d >= 1_000) absoluteScore = 20;

    // Volume/Liquidity ratio score
    let ratioScore = 0;
    if (liquidity > 0) {
      const ratio = volume7d / liquidity;
      if (ratio >= 0.5 && ratio <= 4) ratioScore = 100; // Sweet spot
      else if (ratio >= 0.3 && ratio <= 5) ratioScore = 80;
      else if (ratio >= 0.1 && ratio <= 7) ratioScore = 60;
      else if (ratio < 0.1) ratioScore = 40; // Too low
      else ratioScore = 20; // Too high (manipulation risk)
    }

    // Check for daily volume (activity recency)
    const activityBonus = dailyVolume > 100 ? 10 : 0;

    return Math.min(100, Math.max(absoluteScore, ratioScore) + activityBonus);
  }

  /**
   * Score Holder Count (17.6% weight)
   */
  private scoreHolderCount(metrics: TokenMetrics): number {
    const { holderCount } = metrics;

    if (holderCount >= 5000) return 100;
    if (holderCount >= 2000) return 80;
    if (holderCount >= 1000) return 60;
    if (holderCount >= 500) return 40;
    if (holderCount >= 100) return 20;
    return 0;
  }

  /**
   * Identify limiting factors that cap the grade
   */
  private identifyLimitingFactors(metrics: TokenMetrics): string[] {
    const factors: string[] = [];
    const tokenAgeDays = (Date.now() / 1000 - metrics.tokenAge) / (24 * 60 * 60);

    // Grade C limiting factors (≤69)
    if (metrics.topHolderConcentration > 80) {
      factors.push('Extreme concentration: >80% held by top 10');
    }
    if (metrics.holderCount < 20) {
      factors.push('Very few holders: <20');
    }
    if (metrics.dailyVolume < 100) {
      factors.push('Minimal daily volume: <$100');
    }
    if (metrics.liquidity < 1000) {
      factors.push('Extremely low liquidity: <$1,000');
    }
    if (tokenAgeDays < 1) {
      factors.push('Brand new token: <1 day old');
    }
    if (metrics.marketCap < 100_000) {
      factors.push('Very low market cap: <$100K');
    }

    // Grade B limiting factors (≤84)
    if (metrics.topHolderConcentration > 50 && factors.length === 0) {
      factors.push('High concentration: >50% held by top 10');
    }
    if (metrics.liquidity > 0 && metrics.volume7d / metrics.liquidity > 9) {
      factors.push('Unusual volume: >9x volume/liquidity ratio');
    }
    if (tokenAgeDays < 7 && factors.length === 0) {
      factors.push('Very new token: <1 week old');
    }

    return factors;
  }

  /**
   * Count risk signals
   */
  private countRiskSignals(metrics: TokenMetrics): number {
    let signals = 0;

    if (metrics.topHolderConcentration > 50) signals++;
    if (metrics.holderCount < 100) signals++;
    if (metrics.liquidity < 10_000) signals++;
    if (metrics.volume7d < 1_000) signals++;
    if (metrics.liquidity > 0 && metrics.volume7d / metrics.liquidity > 7) signals++;

    return signals;
  }

  /**
   * Apply limiting factors to determine final grade and score
   */
  private applyLimitingFactors(
    rawScore: number,
    metrics: TokenMetrics,
    limitingFactors: string[],
    riskSignals: number
  ): { grade: RiskGrade; cappedScore: number } {
    const tokenAgeDays = (Date.now() / 1000 - metrics.tokenAge) / (24 * 60 * 60);

    // Grade C conditions (cap at 69)
    if (
      metrics.topHolderConcentration > 80 ||
      metrics.holderCount < 20 ||
      metrics.dailyVolume < 100 ||
      metrics.liquidity < 1000 ||
      tokenAgeDays < 1 ||
      metrics.marketCap < 100_000
    ) {
      return { grade: 'C', cappedScore: Math.min(rawScore, 69) };
    }

    // Grade B conditions (cap at 84)
    if (
      metrics.topHolderConcentration > 50 ||
      (metrics.liquidity > 0 && metrics.volume7d / metrics.liquidity > 9) ||
      tokenAgeDays < 7 ||
      riskSignals >= 3
    ) {
      return { grade: 'B', cappedScore: Math.min(rawScore, 84) };
    }

    // Grade A (85-100)
    if (rawScore >= 85) {
      return { grade: 'A', cappedScore: rawScore };
    }

    // Grade B (70-84)
    if (rawScore >= 70) {
      return { grade: 'B', cappedScore: rawScore };
    }

    // Grade C (0-69)
    return { grade: 'C', cappedScore: rawScore };
  }

  /**
   * Generate recommendation and reasoning
   */
  private generateRecommendation(
    grade: RiskGrade,
    score: number,
    limitingFactors: string[],
    metrics: TokenMetrics
  ): { recommendation: 'PROCEED' | 'CAUTION' | 'REJECT'; reasoning: string } {
    if (grade === 'A') {
      return {
        recommendation: 'PROCEED',
        reasoning: `Strong market metrics with Grade A rating (${score}/100). Token shows healthy liquidity, good holder distribution, and solid trading activity. Safe to proceed with transaction.`,
      };
    }

    if (grade === 'B' && score > 75) {
      return {
        recommendation: 'CAUTION',
        reasoning: `Moderate risk with Grade B rating (${score}/100). ${limitingFactors.length > 0 ? 'Limiting factors: ' + limitingFactors.join('; ') + '.' : ''} Consider proceeding with smaller amounts or additional research.`,
      };
    }

    if (grade === 'B') {
      return {
        recommendation: 'CAUTION',
        reasoning: `Elevated risk with Grade B rating (${score}/100). ${limitingFactors.join('; ')}. Recommend human approval before proceeding.`,
      };
    }

    // Grade C
    return {
      recommendation: 'REJECT',
      reasoning: `High risk with Grade C rating (${score}/100). Critical issues: ${limitingFactors.join('; ')}. Not recommended for automated trading. Requires thorough manual review.`,
    };
  }
}
