/**
 * Helius API Service
 * Enhanced transaction history with flexible filtering
 */

import axios, { AxiosInstance } from 'axios';
import { HeliusTransaction, HeliusTransactionQuery } from '../types';

export class HeliusService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: `https://mainnet.helius-rpc.com`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get comprehensive transaction history for an address
   * Uses Helius enhanced getTransactionsForAddress API
   */
  async getTransactionsForAddress(
    address: string,
    query: HeliusTransactionQuery = {
      transactionDetails: 'full',
      sortOrder: 'asc',
      limit: 100,
    }
  ): Promise<HeliusTransaction[]> {
    try {
      const params: any[] = [address];
      
      // Build query parameters
      const queryParams: any = {
        transactionDetails: query.transactionDetails || 'full',
        sortOrder: query.sortOrder || 'asc',
        limit: query.limit || 100,
      };

      // Add filters if provided
      if (query.filters) {
        queryParams.filters = query.filters;
      }

      // Add pagination token if provided
      if (query.paginationToken) {
        queryParams.paginationToken = query.paginationToken;
      }

      params.push(queryParams);

      const response = await this.client.post(
        `/?api-key=${this.apiKey}`,
        {
          jsonrpc: '2.0',
          id: 'ordo-risk-engine',
          method: 'getTransactionsForAddress',
          params,
        }
      );

      if (response.data.error) {
        throw new Error(`Helius API error: ${response.data.error.message}`);
      }

      // Return the data array from the result
      return response.data.result?.data || [];
    } catch (error) {
      console.error('Helius API error:', error);
      throw error;
    }
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(mintAddress: string): Promise<any> {
    try {
      const response = await this.client.post(
        `/?api-key=${this.apiKey}`,
        {
          jsonrpc: '2.0',
          id: 'ordo-risk-engine',
          method: 'getAsset',
          params: {
            id: mintAddress,
          },
        }
      );

      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
      return null;
    }
  }

  /**
   * Get token holders (using DAS API)
   */
  async getTokenHolders(mintAddress: string, limit: number = 1000): Promise<any[]> {
    try {
      // Use getTokenAccounts method from Helius DAS API
      const response = await this.client.post(
        `/?api-key=${this.apiKey}`,
        {
          jsonrpc: '2.0',
          id: 'ordo-risk-engine',
          method: 'getTokenAccounts',
          params: {
            mint: mintAddress,
            limit,
          },
        }
      );

      if (response.data.error) {
        console.warn('Failed to fetch token holders:', response.data.error.message);
        return [];
      }

      return response.data.result?.token_accounts || [];
    } catch (error) {
      console.error('Failed to fetch token holders:', error);
      return [];
    }
  }

  /**
   * Get account info for balance checking
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      const response = await this.client.post(
        `/?api-key=${this.apiKey}`,
        {
          jsonrpc: '2.0',
          id: 'ordo-risk-engine',
          method: 'getAccountInfo',
          params: [
            address,
            {
              encoding: 'jsonParsed',
            },
          ],
        }
      );

      return response.data.result?.value || null;
    } catch (error) {
      console.error('Failed to fetch account info:', error);
      return null;
    }
  }
}
