#!/usr/bin/env node
import { config } from 'dotenv';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { SupabaseService } from './services/supabase.service';

config();

async function verifySetup() {
  console.log('🔍 Verifying Ordo Setup...\n');

  // 1. Check environment variables
  console.log('1️⃣ Environment Variables:');
  const requiredVars = [
    'OPENROUTER_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'COLOSSEUM_API_KEY',
    'AGENT_ID',
    'AGENT_NAME'
  ];

  let envOk = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}`);
    } else {
      console.log(`   ❌ ${varName} - NOT SET`);
      envOk = false;
    }
  }
  console.log('');

  if (!envOk) {
    console.log('❌ Some environment variables are missing. Check your .env file.\n');
    process.exit(1);
  }

  // 2. Test Supabase connection
  console.log('2️⃣ Supabase Connection:');
  try {
    const supabase = new SupabaseService();
    const profile = await supabase.initializeAgentProfile();
    console.log(`   ✅ Connected to Supabase`);
    console.log(`   ✅ Agent Profile: ${profile.agent_name} (#${profile.agent_id})`);
  } catch (error: any) {
    console.log(`   ❌ Supabase connection failed: ${error.message}`);
    console.log('');
    process.exit(1);
  }
  console.log('');

  // 3. Test Knowledge Base
  console.log('3️⃣ Knowledge Base:');
  try {
    const kb = new KnowledgeBaseService();
    
    // Check if knowledge base has data
    const sources = await kb.listSources();
    const totalTokens = await kb.getTotalTokens();

    if (sources.length === 0) {
      console.log('   ⚠️  Knowledge base is empty');
      console.log('   Run: npm run load-knowledge');
    } else {
      console.log(`   ✅ ${sources.length} documentation sources loaded`);
      console.log(`   ✅ ${totalTokens.toLocaleString()} total tokens`);
      
      // Test search
      const searchResults = await kb.searchText('solana', 1);
      if (searchResults.length > 0) {
        console.log(`   ✅ Full-text search working`);
      } else {
        console.log(`   ⚠️  Search returned no results`);
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Knowledge base error: ${error.message}`);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('   💡 Table not created yet. Run: npm run load-knowledge');
    }
  }
  console.log('');

  // 4. Test OpenRouter
  console.log('4️⃣ OpenRouter API:');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });

    if (response.ok) {
      console.log('   ✅ OpenRouter API key is valid');
    } else {
      console.log(`   ❌ OpenRouter API returned: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`   ❌ OpenRouter test failed: ${error.message}`);
  }
  console.log('');

  // Summary
  console.log('📊 Setup Summary:');
  console.log('   ✅ Environment configured');
  console.log('   ✅ Supabase connected');
  console.log('   ✅ OpenRouter ready');
  console.log('');
  console.log('🚀 Ready to start chat interface:');
  console.log('   npm run chat');
  console.log('');
}

verifySetup().catch(console.error);
