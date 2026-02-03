/**
 * ReAct Agent Demo
 * Shows the agent reasoning through a token analysis
 */

import * as dotenv from 'dotenv';
import { ReActAgent } from '../src/agents/react-agent';

dotenv.config();

async function main() {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!heliusApiKey) {
    console.error('❌ Error: HELIUS_API_KEY not found');
    process.exit(1);
  }

  if (!openRouterApiKey) {
    console.log('⚠️  Warning: OPENROUTER_API_KEY not found');
    console.log('Using fallback rule-based reasoning\n');
  }

  // Initialize agent
  const agent = new ReActAgent(
    heliusApiKey,
    openRouterApiKey || 'fallback',
    'anthropic/claude-3.5-sonnet'
  );

  // Example queries
  const queries = [
    'Analyze token So11111111111111111111111111111111111111112',
    // Add more example queries here
  ];

  for (const query of queries) {
    console.log('\n' + '='.repeat(60));
    console.log(`Query: ${query}`);
    console.log('='.repeat(60) + '\n');

    try {
      const answer = await agent.run(query);
      
      console.log('\n' + '='.repeat(60));
      console.log('Conversation History:');
      console.log('='.repeat(60));
      
      const history = agent.getHistory();
      history.forEach((step, i) => {
        console.log(`\nStep ${i + 1}:`);
        console.log(`  Thought: ${step.thought}`);
        if (step.action) console.log(`  Action: ${step.action}`);
        if (step.actionInput) console.log(`  Input: ${step.actionInput}`);
        if (step.observation) console.log(`  Observation: ${step.observation.slice(0, 100)}...`);
        if (step.answer) console.log(`  Answer: ${step.answer.slice(0, 100)}...`);
      });
      
    } catch (error: any) {
      console.error('Error:', error.message);
    }

    // Wait a bit between queries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main();
