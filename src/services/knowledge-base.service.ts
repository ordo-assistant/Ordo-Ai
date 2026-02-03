import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeEntry {
  source: string;
  category: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  token_count?: number;
}

export class KnowledgeBaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Load all LLM documentation files into the knowledge base
   */
  async loadLLMDocumentation(llmsDir: string = 'llms'): Promise<void> {
    console.log('📚 Loading LLM documentation into knowledge base...\n');

    const files = fs.readdirSync(llmsDir).filter(f => f.endsWith('.txt'));
    let totalLoaded = 0;

    for (const file of files) {
      try {
        const filePath = path.join(llmsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract source name (e.g., 'birdeye-llms.txt' -> 'birdeye')
        const source = file.replace('-llms.txt', '');
        
        // Determine category
        const category = this.categorizeSource(source);
        
        // Create title
        const title = this.createTitle(source);
        
        // Estimate token count (rough approximation: 1 token ≈ 4 characters)
        const tokenCount = Math.ceil(content.length / 4);

        const entry: KnowledgeEntry = {
          source,
          category,
          title,
          content,
          token_count: tokenCount,
          metadata: {
            file_name: file,
            file_size: content.length,
            loaded_at: new Date().toISOString()
          }
        };

        await this.upsertKnowledge(entry);
        console.log(`✅ Loaded: ${title} (${tokenCount.toLocaleString()} tokens)`);
        totalLoaded++;
      } catch (error) {
        console.error(`❌ Failed to load ${file}:`, error);
      }
    }

    console.log(`\n✅ Loaded ${totalLoaded}/${files.length} documentation files\n`);
  }

  /**
   * Upsert knowledge entry (insert or update if exists)
   */
  private async upsertKnowledge(entry: KnowledgeEntry): Promise<void> {
    // Check if entry exists
    const { data: existing } = await this.client
      .from('knowledge_base')
      .select('id')
      .eq('source', entry.source)
      .single();

    if (existing) {
      // Update existing
      const { error } = await this.client
        .from('knowledge_base')
        .update({
          category: entry.category,
          title: entry.title,
          content: entry.content,
          metadata: entry.metadata,
          token_count: entry.token_count
        })
        .eq('id', existing.id);

      if (error) {
        throw error;
      }
    } else {
      // Insert new
      const { error } = await this.client
        .from('knowledge_base')
        .insert(entry);

      if (error) {
        throw error;
      }
    }
  }

  /**
   * Search knowledge base by text
   */
  async searchText(query: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await this.client
      .rpc('search_knowledge_text', {
        search_query: query,
        match_count: limit
      });

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get knowledge by source
   */
  async getBySource(source: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('knowledge_base')
      .select('*')
      .eq('source', source)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get knowledge by category
   */
  async getByCategory(category: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('knowledge_base')
      .select('*')
      .eq('category', category)
      .order('title');

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * List all sources
   */
  async listSources(): Promise<string[]> {
    const { data, error } = await this.client
      .from('knowledge_base')
      .select('source, title, category, token_count')
      .order('source');

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Get total token count
   */
  async getTotalTokens(): Promise<number> {
    const { data, error } = await this.client
      .from('knowledge_base')
      .select('token_count');

    if (error) {
      return 0;
    }

    return data?.reduce((sum, item) => sum + (item.token_count || 0), 0) || 0;
  }

  /**
   * Categorize source based on name
   */
  private categorizeSource(source: string): string {
    const categories: Record<string, string> = {
      'birdeye': 'analytics',
      'composio': 'tools',
      'flutter': 'mobile',
      'helius': 'infrastructure',
      'jupiter': 'defi',
      'langchain': 'ai-framework',
      'magicblock': 'infrastructure',
      'meteora': 'defi',
      'openclaw': 'ai-framework',
      'openrouter': 'ai-infrastructure',
      'range': 'analytics',
      'sendai': 'defi',
      'solana-app-kit': 'development',
      'solana': 'blockchain',
      'solana-mobile': 'mobile'
    };

    return categories[source] || 'general';
  }

  /**
   * Create human-readable title
   */
  private createTitle(source: string): string {
    const titles: Record<string, string> = {
      'birdeye': 'Birdeye Analytics',
      'composio': 'Composio Tools Integration',
      'flutter': 'Flutter Mobile Development',
      'helius': 'Helius RPC & APIs',
      'jupiter': 'Jupiter Aggregator',
      'langchain': 'LangChain Framework',
      'magicblock': 'MagicBlock Infrastructure',
      'meteora': 'Meteora DLMM',
      'openclaw': 'OpenClaw Agent Framework',
      'openrouter': 'OpenRouter LLM Gateway',
      'range': 'Range Protocol Risk Scoring',
      'sendai': 'Solana Agent Kit (SendAI)',
      'solana-app-kit': 'Solana App Kit',
      'solana': 'Solana Blockchain',
      'solana-mobile': 'Solana Mobile SDK'
    };

    return titles[source] || source.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }
}
