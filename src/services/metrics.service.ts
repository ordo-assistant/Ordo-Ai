/**
 * Token Metrics Extraction Service
 * Analyzes transaction history to extract key metrics
 */

import { HeliusTransaction, TokenMetrics } from '../types';

export class MetricsService {
  /**
   * Extract metrics from transaction history
   */
  extractMetricsFromTransactions(
    txHistory: HeliusTransaction[],
    holderData?: any[]
  ): TokenMetrics {
    if (txHistory.length === 0) {
      return this.getDefaultMetrics();
    }

    const holders = this.extractUniqueHolders(txHistory);
    const volume = this.calculate7DayVolume(txHistory);
    const liquidity = this.estimateLiquidity(txHistory);
    const concentration = this.calculateTopHolderConcentration(holderData || []);
    const tokenAge = txHistory[0]?.blockTime || Date.now() / 1000;
    const dailyVolume = this.calculateDailyVolume(txHistory);

    return {
      holderCount: holders.size,
      volume7d: volume,
      liquidity,
      marketCap: this.estimateMarketCap(liquidity, holders.size),
      topHolderConcentration: concentration,
      tokenAge,
      dailyVolume,
    };
  }

  /**
   * Extract unique holder addresses from transactions
   */
  private extractUniqueHolders(txHistory: HeliusTransaction[]): Set<string> {
    const holders = new Set<string>();

    for (const tx of txHistory) {
      if (tx.transaction?.message?.accountKeys) {
        tx.transaction.message.accountKeys.forEach((key) => {
          // Filter out program IDs and system accounts
          if (!this.isSystemAccount(key)) {
            holders.add(key);
          }
        });
      }
    }

    return holders;
  }

  /**
   * Calculate 7-day trading volume from transaction history
   */
  private calculate7DayVolume(txHistory: HeliusTransaction[]): number {
    const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
    let totalVolume = 0;

    for (const tx of txHistory) {
      if (tx.blockTime && tx.blockTime >= sevenDaysAgo) {
        // Estimate volume from balance changes
        if (tx.meta?.preBalances && tx.meta?.postBalances) {
          const balanceChanges = tx.meta.postBalances.map(
            (post, i) => Math.abs(post - tx.meta.preBalances[i])
          );
          totalVolume += balanceChanges.reduce((a, b) => a + b, 0);
        }
      }
    }

    // Convert lamports to SOL (rough estimate)
    return totalVolume / 1e9;
  }

  /**
   * Calculate daily volume
   */
  private calculateDailyVolume(txHistory: HeliusTransaction[]): number {
    const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;
    let totalVolume = 0;

    for (const tx of txHistory) {
      if (tx.blockTime && tx.blockTime >= oneDayAgo) {
        if (tx.meta?.preBalances && tx.meta?.postBalances) {
          const balanceChanges = tx.meta.postBalances.map(
            (post, i) => Math.abs(post - tx.meta.preBalances[i])
          );
          totalVolume += balanceChanges.reduce((a, b) => a + b, 0);
        }
      }
    }

    return totalVolume / 1e9;
  }

  /**
   * Estimate liquidity from transaction patterns
   */
  private estimateLiquidity(txHistory: HeliusTransaction[]): number {
    // Simplified: Use average of largest balance changes as proxy
    const balanceChanges: number[] = [];

    for (const tx of txHistory) {
      if (tx.meta?.preBalances && tx.meta?.postBalances) {
        const changes = tx.meta.postBalances.map(
          (post, i) => Math.abs(post - tx.meta.preBalances[i])
        );
        balanceChanges.push(Math.max(...changes));
      }
    }

    if (balanceChanges.length === 0) return 0;

    // Take top 10% of balance changes as liquidity estimate
    balanceChanges.sort((a, b) => b - a);
    const top10Percent = balanceChanges.slice(0, Math.ceil(balanceChanges.length * 0.1));
    const avgLiquidity = top10Percent.reduce((a, b) => a + b, 0) / top10Percent.length;

    return avgLiquidity / 1e9; // Convert to SOL
  }

  /**
   * Calculate top holder concentration
   */
  private calculateTopHolderConcentration(holderData: any[]): number {
    if (holderData.length === 0) return 0;

    // Sort by balance descending
    const sorted = holderData
      .map((h) => h.amount || 0)
      .sort((a, b) => b - a);

    const totalSupply = sorted.reduce((a, b) => a + b, 0);
    if (totalSupply === 0) return 0;

    // Top 10 holders
    const top10 = sorted.slice(0, 10);
    const top10Total = top10.reduce((a, b) => a + b, 0);

    return (top10Total / totalSupply) * 100;
  }

  /**
   * Estimate market cap from liquidity and holder count
   */
  private estimateMarketCap(liquidity: number, holderCount: number): number {
    // Rough heuristic: marketCap ≈ liquidity * sqrt(holderCount)
    return liquidity * Math.sqrt(holderCount) * 10;
  }

  /**
   * Check if address is a system account
   */
  private isSystemAccount(address: string): boolean {
    const systemAccounts = [
      '11111111111111111111111111111111', // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
    ];
    return systemAccounts.includes(address);
  }

  /**
   * Get default metrics for error cases
   */
  private getDefaultMetrics(): TokenMetrics {
    return {
      holderCount: 0,
      volume7d: 0,
      liquidity: 0,
      marketCap: 0,
      topHolderConcentration: 100,
      tokenAge: Date.now() / 1000,
      dailyVolume: 0,
    };
  }
}
