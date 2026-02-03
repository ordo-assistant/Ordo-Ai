#!/usr/bin/env node
import { config } from 'dotenv';
import { KnowledgeBaseService } from './services/knowledge-base.service';

config();

async function main() {
  console.log('🚀 Ordo Knowledge Base Loader\n');

  const kb = new KnowledgeBaseService();

  // Load all LLM documentation
  await kb.loadLLMDocumentation('llms');

  // Display summary
  console.log('📊 Knowledge Base Summary:\n');
  
  const sources = await kb.listSources();
  console.log(`Total Sources: ${sources.length}`);
  
  const totalTokens = await kb.getTotalTokens();
  console.log(`Total Tokens: ${totalTokens.toLocaleString()}\n`);

  console.log('Sources by Category:\n');
  const byCategory: Record<string, any[]> = {};
  
  for (const source of sources) {
    const cat = (source as any).category;
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(source);
  }

  Object.entries(byCategory).forEach(([category, items]) => {
    console.log(`\n${category.toUpperCase()}:`);
    items.forEach((item: any) => {
      console.log(`  • ${item.title} (${item.token_count?.toLocaleString() || 0} tokens)`);
    });
  });

  console.log('\n✅ Knowledge base ready for Ordo agent!\n');
  console.log('Test search:');
  console.log('  const results = await kb.searchText("token risk analysis");');
  console.log('  const helius = await kb.getBySource("helius");\n');
}

main().catch(console.error);
