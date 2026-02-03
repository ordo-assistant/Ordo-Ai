/**
 * Ordo Risk Engine - Type Definitions
 * Based on Range Protocol Market Score v1.8 (January 2026)
 */

export type RiskGrade = 'A' | 'B' | 'C';

export interface TokenMetrics {
  holderCount: number;
  volume7d: number;
  liquidity: number;
  marketCap: number;
  topHolderConcentration: number; // Percentage held by top 10
  tokenAge: number; // Unix timestamp of first transaction
  dailyVolume: number;
}

export interface ScoreComponents {
  liquidityHealth: number;    // 35.3% weight
  holderDistribution: number; // 23.5% weight
  tradingActivity: number;    // 23.5% weight
  holderCount: number;        // 17.6% weight
}

export interface MarketScore {
  score: number; // 0-100
  grade: RiskGrade;
  components: ScoreComponents;
  limitingFactors: string[];
  riskSignals: number;
  recommendation: 'PROCEED' | 'CAUTION' | 'REJECT';
  reasoning: string;
}

export interface HeliusTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  meta: {
    err: any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions: any[];
    logMessages: string[];
  };
  transaction: {
    message: {
      accountKeys: string[];
      instructions: any[];
      recentBlockhash: string;
    };
    signatures: string[];
  };
}

export interface HeliusTransactionQuery {
  transactionDetails: 'full' | 'signatures';
  sortOrder: 'asc' | 'desc';
  filters?: {
    blockTime?: { gte?: number; lte?: number; eq?: number };
    slot?: { gte?: number; lt?: number };
    signature?: { lt?: string; gt?: string };
    status?: 'succeeded' | 'failed' | 'any';
    tokenAccounts?: 'none' | 'balanceChanged' | 'all';
  };
  paginationToken?: string;
  limit?: number;
}

export interface TokenAnalysisResult {
  mintAddress: string;
  metrics: TokenMetrics;
  marketScore: MarketScore;
  timestamp: number;
  dataSource: 'helius' | 'cache';
}
