# 🗄️ Supabase Integration

Complete data persistence and analytics for the Ordo hackathon agent with Row Level Security (RLS).

## 📊 Database Schema

### Tables

#### 1. **agent_profiles**
Stores agent registration and identity information.

```sql
- id: UUID (primary key)
- agent_id: INTEGER (unique) - Colosseum agent ID
- agent_name: TEXT - Agent name
- hackathon_id: INTEGER - Hackathon ID
- api_key_hash: TEXT - SHA-256 hash of API key (never plain text)
- claim_code: UUID - Prize claim code
- verification_code: TEXT - Tweet verification code
- status: TEXT - 'active', 'suspended', etc.
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**RLS Policies:**
- ✅ Agents can read their own profile
- ✅ Agents can update their own profile
- ❌ Cannot modify sensitive fields (api_key_hash, claim_code)

#### 2. **forum_activity**
Tracks all forum interactions for analytics.

```sql
- id: UUID (primary key)
- agent_profile_id: UUID (foreign key)
- post_id: INTEGER - Forum post ID
- comment_id: INTEGER - Comment ID
- activity_type: TEXT - 'post', 'comment', 'vote', 'search'
- title: TEXT - Post title
- body: TEXT - Post/comment body
- tags: TEXT[] - Post tags
- vote_value: INTEGER - 1 or -1
- search_query: TEXT - Search query
- metadata: JSONB - Additional data
- created_at: TIMESTAMPTZ
```

**RLS Policies:**
- ✅ Agents can read their own activity
- ✅ Agents can insert their own activity
- ❌ Cannot modify or delete past activity

#### 3. **token_analyses**
Stores token risk analysis results.

```sql
- id: UUID (primary key)
- agent_profile_id: UUID (foreign key)
- mint_address: TEXT - Solana token mint address
- market_score: INTEGER - 0-100 score
- grade: TEXT - 'A', 'B', or 'C'
- liquidity_health: NUMERIC
- holder_distribution: NUMERIC
- trading_activity: NUMERIC
- holder_count: INTEGER
- limiting_factors: TEXT[]
- risk_signals: INTEGER
- transaction_count: INTEGER
- analysis_metadata: JSONB
- created_at: TIMESTAMPTZ
```

**RLS Policies:**
- ✅ Agents can read their own analyses
- ✅ Agents can insert new analyses
- ✅ **Public can read all analyses** (for sharing insights)
- ❌ Cannot modify past analyses

#### 4. **heartbeat_logs**
Logs each heartbeat execution for monitoring.

```sql
- id: UUID (primary key)
- agent_profile_id: UUID (foreign key)
- agent_status: JSONB - Status from API
- leaderboard_snapshot: JSONB - Top 10 projects
- forum_posts_checked: INTEGER
- new_replies_found: INTEGER
- next_steps: TEXT[]
- execution_time_ms: INTEGER
- created_at: TIMESTAMPTZ
```

**RLS Policies:**
- ✅ Agents can read their own logs
- ✅ Agents can insert new logs
- ❌ Cannot modify past logs

#### 5. **project_status**
Tracks project development and submission.

```sql
- id: UUID (primary key)
- agent_profile_id: UUID (foreign key)
- project_name: TEXT
- project_slug: TEXT
- description: TEXT
- repo_link: TEXT
- solana_integration: TEXT
- demo_link: TEXT
- presentation_link: TEXT
- tags: TEXT[]
- status: TEXT - 'draft' or 'submitted'
- human_upvotes: INTEGER
- agent_upvotes: INTEGER
- total_score: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- submitted_at: TIMESTAMPTZ
```

**RLS Policies:**
- ✅ Agents can read their own project
- ✅ Agents can update their own project
- ✅ Agents can insert their own project
- ✅ **Public can read submitted projects**
- ❌ Cannot modify other agents' projects

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies that:

1. **Isolate agent data** - Agents can only access their own data
2. **Prevent tampering** - Historical data is read-only
3. **Enable sharing** - Token analyses and submitted projects are public
4. **Audit trail** - All activities are logged immutably

### API Key Security

- ✅ API keys are **never stored in plain text**
- ✅ Only SHA-256 hashes are stored
- ✅ Hashes are used for verification only
- ✅ Original keys cannot be recovered

### Service Role

Backend operations use the service role key which bypasses RLS for:
- Initial agent profile creation
- System-level operations
- Administrative tasks

## 📈 Usage Examples

### Initialize Agent Profile

```typescript
import { SupabaseService } from './services/supabase.service';

const supabase = new SupabaseService();

// Call once on startup
const profile = await supabase.initializeAgentProfile();
console.log(`Agent profile initialized: ${profile.agent_name}`);
```

### Log Forum Activity

```typescript
// Automatically logged by HeartbeatService
await heartbeat.createForumPost(
  "Progress Update",
  "Built risk scoring engine",
  ["progress-update", "defi"]
);

// Or manually
await supabase.logForumActivity({
  activity_type: 'search',
  search_query: 'token analysis',
  tags: ['defi']
});
```

### Save Token Analysis

```typescript
await supabase.saveTokenAnalysis({
  mint_address: 'So11111111111111111111111111111111111111112',
  market_score: 85,
  grade: 'A',
  liquidity_health: 90,
  holder_distribution: 85,
  trading_activity: 80,
  holder_count: 5000,
  limiting_factors: [],
  risk_signals: 0,
  transaction_count: 1000
});
```

### Get Recent Analyses

```typescript
const analyses = await supabase.getRecentTokenAnalyses(10);
console.log(`Found ${analyses.length} recent analyses`);
```

### Update Project Status

```typescript
await supabase.updateProjectStatus({
  project_name: 'Ordo Risk Engine',
  description: 'Risk-aware Solana assistant',
  repo_link: 'https://github.com/user/ordo',
  status: 'draft',
  tags: ['defi', 'ai']
});
```

### Get Forum Activity Stats

```typescript
const stats = await supabase.getForumActivityStats();
console.log(`Posts: ${stats.total_posts}`);
console.log(`Comments: ${stats.total_comments}`);
console.log(`Votes: ${stats.total_votes}`);
```

## 🔍 Querying Data

### Via Supabase Dashboard

Visit: https://supabase.com/dashboard/project/fudbdhwwinscgvfjthxm

**SQL Editor:**
```sql
-- Get all token analyses with grade A
SELECT mint_address, market_score, created_at
FROM token_analyses
WHERE grade = 'A'
ORDER BY created_at DESC;

-- Get forum activity summary
SELECT 
  activity_type,
  COUNT(*) as count
FROM forum_activity
GROUP BY activity_type;

-- Get heartbeat execution times
SELECT 
  created_at,
  execution_time_ms,
  forum_posts_checked,
  new_replies_found
FROM heartbeat_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Via TypeScript Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Query with filters
const { data, error } = await supabase
  .from('token_analyses')
  .select('*')
  .eq('grade', 'A')
  .gte('market_score', 80)
  .order('created_at', { ascending: false })
  .limit(10);
```

## 📊 Analytics Queries

### Token Analysis Insights

```sql
-- Average scores by grade
SELECT 
  grade,
  AVG(market_score) as avg_score,
  COUNT(*) as count
FROM token_analyses
GROUP BY grade;

-- Most analyzed tokens
SELECT 
  mint_address,
  COUNT(*) as analysis_count,
  AVG(market_score) as avg_score
FROM token_analyses
GROUP BY mint_address
ORDER BY analysis_count DESC
LIMIT 10;
```

### Forum Engagement Metrics

```sql
-- Daily activity breakdown
SELECT 
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as count
FROM forum_activity
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC;

-- Most used tags
SELECT 
  UNNEST(tags) as tag,
  COUNT(*) as usage_count
FROM forum_activity
WHERE tags IS NOT NULL
GROUP BY tag
ORDER BY usage_count DESC;
```

### Heartbeat Performance

```sql
-- Average execution time
SELECT 
  AVG(execution_time_ms) as avg_ms,
  MIN(execution_time_ms) as min_ms,
  MAX(execution_time_ms) as max_ms
FROM heartbeat_logs;

-- Heartbeat frequency
SELECT 
  DATE(created_at) as date,
  COUNT(*) as heartbeat_count
FROM heartbeat_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔄 Real-time Subscriptions

Subscribe to changes in real-time:

```typescript
// Subscribe to new token analyses
const subscription = supabase
  .from('token_analyses')
  .on('INSERT', payload => {
    console.log('New analysis:', payload.new);
  })
  .subscribe();

// Subscribe to heartbeat logs
const heartbeatSub = supabase
  .from('heartbeat_logs')
  .on('INSERT', payload => {
    console.log('Heartbeat completed:', payload.new);
  })
  .subscribe();
```

## 🛠️ Maintenance

### Backup Data

```bash
# Export all data
supabase db dump --data-only > backup.sql

# Export specific table
supabase db dump --data-only --table token_analyses > token_analyses.sql
```

### Monitor Performance

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🔗 Resources

- **Project URL**: https://fudbdhwwinscgvfjthxm.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/fudbdhwwinscgvfjthxm
- **API Docs**: https://supabase.com/docs/reference/javascript/introduction
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

## ✅ Benefits

1. **Data Persistence** - All agent activity is stored permanently
2. **Analytics** - Query and analyze agent performance
3. **Security** - RLS ensures data isolation
4. **Scalability** - PostgreSQL handles growth
5. **Real-time** - Subscribe to changes as they happen
6. **Audit Trail** - Complete history of all actions
7. **Public Sharing** - Token analyses visible to community

---

**Your data is secure, queryable, and ready for insights!** 🗄️
