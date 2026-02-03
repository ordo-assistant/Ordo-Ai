import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export interface AgentProfile {
  id: string;
  agent_id: number;
  agent_name: string;
  hackathon_id: number;
  api_key_hash: string;
  claim_code: string;
  verification_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ForumActivity {
  id?: string;
  agent_profile_id: string;
  post_id?: number;
  comment_id?: number;
  activity_type: 'post' | 'comment' | 'vote' | 'search';
  title?: string;
  body?: string;
  tags?: string[];
  vote_value?: number;
  search_query?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface TokenAnalysis {
  id?: string;
  agent_profile_id: string;
  mint_address: string;
  market_score: number;
  grade: 'A' | 'B' | 'C';
  liquidity_health?: number;
  holder_distribution?: number;
  trading_activity?: number;
  holder_count?: number;
  limiting_factors?: string[];
  risk_signals?: number;
  transaction_count?: number;
  analysis_metadata?: Record<string, any>;
  created_at?: string;
}

export interface HeartbeatLog {
  id?: string;
  agent_profile_id: string;
  agent_status?: Record<string, any>;
  leaderboard_snapshot?: Record<string, any>;
  forum_posts_checked?: number;
  new_replies_found?: number;
  next_steps?: string[];
  execution_time_ms?: number;
  created_at?: string;
}

export interface ProjectStatus {
  id?: string;
  agent_profile_id: string;
  project_name?: string;
  project_slug?: string;
  description?: string;
  repo_link?: string;
  solana_integration?: string;
  demo_link?: string;
  presentation_link?: string;
  tags?: string[];
  status: 'draft' | 'submitted';
  human_upvotes?: number;
  agent_upvotes?: number;
  total_score?: number;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
}

export class SupabaseService {
  private client: SupabaseClient;
  private agentProfileId?: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize agent profile (call once on startup)
   */
  async initializeAgentProfile(): Promise<AgentProfile> {
    const agentId = parseInt(process.env.AGENT_ID || '93');
    const agentName = process.env.AGENT_NAME || 'ordo-seeker-assistant';
    const hackathonId = parseInt(process.env.HACKATHON_ID || '1');
    const apiKey = process.env.COLOSSEUM_API_KEY || '';
    const claimCode = process.env.CLAIM_CODE || '';
    const verificationCode = process.env.VERIFICATION_CODE || '';

    // Hash the API key for storage (never store plain text)
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    // Check if profile exists
    const { data: existing, error: fetchError } = await this.client
      .from('agent_profiles')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (existing && !fetchError) {
      this.agentProfileId = existing.id;
      return existing;
    }

    // Create new profile
    const { data, error } = await this.client
      .from('agent_profiles')
      .insert({
        agent_id: agentId,
        agent_name: agentName,
        hackathon_id: hackathonId,
        api_key_hash: apiKeyHash,
        claim_code: claimCode,
        verification_code: verificationCode,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent profile: ${error.message}`);
    }

    this.agentProfileId = data.id;
    return data;
  }

  /**
   * Log forum activity
   */
  async logForumActivity(activity: Omit<ForumActivity, 'agent_profile_id'>): Promise<void> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { error } = await this.client
      .from('forum_activity')
      .insert({
        ...activity,
        agent_profile_id: this.agentProfileId
      });

    if (error) {
      console.error('Failed to log forum activity:', error);
    }
  }

  /**
   * Save token analysis
   */
  async saveTokenAnalysis(analysis: Omit<TokenAnalysis, 'agent_profile_id'>): Promise<void> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { error } = await this.client
      .from('token_analyses')
      .insert({
        ...analysis,
        agent_profile_id: this.agentProfileId
      });

    if (error) {
      console.error('Failed to save token analysis:', error);
    }
  }

  /**
   * Get recent token analyses
   */
  async getRecentTokenAnalyses(limit: number = 10): Promise<TokenAnalysis[]> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { data, error } = await this.client
      .from('token_analyses')
      .select('*')
      .eq('agent_profile_id', this.agentProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch token analyses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get analysis for specific token
   */
  async getTokenAnalysis(mintAddress: string): Promise<TokenAnalysis | null> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { data, error } = await this.client
      .from('token_analyses')
      .select('*')
      .eq('agent_profile_id', this.agentProfileId)
      .eq('mint_address', mintAddress)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Log heartbeat execution
   */
  async logHeartbeat(log: Omit<HeartbeatLog, 'agent_profile_id'>): Promise<void> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { error } = await this.client
      .from('heartbeat_logs')
      .insert({
        ...log,
        agent_profile_id: this.agentProfileId
      });

    if (error) {
      console.error('Failed to log heartbeat:', error);
    }
  }

  /**
   * Get recent heartbeat logs
   */
  async getRecentHeartbeats(limit: number = 10): Promise<HeartbeatLog[]> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { data, error } = await this.client
      .from('heartbeat_logs')
      .select('*')
      .eq('agent_profile_id', this.agentProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch heartbeat logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update or create project status
   */
  async updateProjectStatus(project: Omit<ProjectStatus, 'agent_profile_id'>): Promise<void> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    // Check if project exists
    const { data: existing } = await this.client
      .from('project_status')
      .select('id')
      .eq('agent_profile_id', this.agentProfileId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await this.client
        .from('project_status')
        .update(project)
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update project status:', error);
      }
    } else {
      // Insert new
      const { error } = await this.client
        .from('project_status')
        .insert({
          ...project,
          agent_profile_id: this.agentProfileId
        });

      if (error) {
        console.error('Failed to create project status:', error);
      }
    }
  }

  /**
   * Get current project status
   */
  async getProjectStatus(): Promise<ProjectStatus | null> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { data, error } = await this.client
      .from('project_status')
      .select('*')
      .eq('agent_profile_id', this.agentProfileId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get forum activity stats
   */
  async getForumActivityStats(): Promise<{
    total_posts: number;
    total_comments: number;
    total_votes: number;
    total_searches: number;
  }> {
    if (!this.agentProfileId) {
      throw new Error('Agent profile not initialized');
    }

    const { data, error } = await this.client
      .from('forum_activity')
      .select('activity_type')
      .eq('agent_profile_id', this.agentProfileId);

    if (error || !data) {
      return { total_posts: 0, total_comments: 0, total_votes: 0, total_searches: 0 };
    }

    const stats = {
      total_posts: data.filter(a => a.activity_type === 'post').length,
      total_comments: data.filter(a => a.activity_type === 'comment').length,
      total_votes: data.filter(a => a.activity_type === 'vote').length,
      total_searches: data.filter(a => a.activity_type === 'search').length
    };

    return stats;
  }
}
