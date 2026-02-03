/**
 * ReAct-style Agent for Token Risk Analysis
 * Implements Reasoning + Acting pattern for autonomous decision-making
 */

import OpenAI from 'openai';
import { RiskEngineService } from '../services/risk-engine.service';
import { TokenAnalysisResult } from '../types';

interface Tool {
  name: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

interface ReActStep {
  thought: string;
  action?: string;
  actionInput?: string;
  observation?: string;
  answer?: string;
}

export class ReActAgent {
  private riskEngine: RiskEngineService;
  private tools: Map<string, Tool>;
  private maxIterations: number = 5;
  private conversationHistory: ReActStep[] = [];
  private openai: OpenAI;
  private model: string;

  constructor(heliusApiKey: string, openRouterApiKey: string, model: string = 'anthropic/claude-3.5-sonnet') {
    this.riskEngine = new RiskEngineService(heliusApiKey);
    this.tools = new Map();
    this.model = model;
    
    // Initialize OpenRouter client
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ordo-risk-engine',
        'X-Title': 'Ordo Risk Engine',
      },
    });
    
    this.initializeTools();
  }

  /**
   * Initialize available tools for the agent
   */
  private initializeTools() {
    // Tool 1: Analyze Token Risk
    this.tools.set('analyze_token_risk', {
      name: 'analyze_token_risk',
      description: 'Analyzes a Solana token for risk using transaction history and holder data. Input: token mint address',
      execute: async (mintAddress: string): Promise<string> => {
        try {
          const analysis = await this.riskEngine.analyzeToken(mintAddress);
          return this.formatAnalysisForAgent(analysis);
        } catch (error: any) {
          return `Error analyzing token: ${error.message}`;
        }
      },
    });

    // Tool 2: Quick Risk Check
    this.tools.set('quick_risk_check', {
      name: 'quick_risk_check',
      description: 'Quick risk assessment returning only PROCEED/CAUTION/REJECT. Input: token mint address',
      execute: async (mintAddress: string): Promise<string> => {
        try {
          const recommendation = await this.riskEngine.quickRiskCheck(mintAddress);
          return `Risk Assessment: ${recommendation}`;
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      },
    });

    // Tool 3: Compare Tokens
    this.tools.set('compare_tokens', {
      name: 'compare_tokens',
      description: 'Compare risk scores of multiple tokens. Input: comma-separated token addresses',
      execute: async (input: string): Promise<string> => {
        try {
          const addresses = input.split(',').map(a => a.trim());
          const results = await this.riskEngine.analyzeTokens(addresses);
          
          let comparison = 'Token Comparison:\n';
          results.forEach((result, index) => {
            comparison += `\n${index + 1}. ${result.mintAddress.slice(0, 8)}...`;
            comparison += `\n   Grade: ${result.marketScore.grade}`;
            comparison += `\n   Score: ${result.marketScore.score}/100`;
            comparison += `\n   Recommendation: ${result.marketScore.recommendation}\n`;
          });
          
          return comparison;
        } catch (error: any) {
          return `Error comparing tokens: ${error.message}`;
        }
      },
    });

    // Tool 4: Extract Token Info
    this.tools.set('extract_token_info', {
      name: 'extract_token_info',
      description: 'Extract basic information about a token from analysis. Input: token mint address',
      execute: async (mintAddress: string): Promise<string> => {
        try {
          const analysis = await this.riskEngine.analyzeToken(mintAddress);
          const { metrics } = analysis;
          
          return `Token Information:
- Holders: ${metrics.holderCount.toLocaleString()}
- Top 10 Concentration: ${metrics.topHolderConcentration.toFixed(1)}%
- Liquidity: $${metrics.liquidity.toLocaleString()}
- 7-Day Volume: $${metrics.volume7d.toLocaleString()}
- Market Cap: $${metrics.marketCap.toLocaleString()}`;
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      },
    });
  }

  /**
   * Format analysis result for agent consumption
   */
  private formatAnalysisForAgent(analysis: TokenAnalysisResult): string {
    const { marketScore, metrics } = analysis;
    
    return `Risk Analysis Complete:
Grade: ${marketScore.grade}
Score: ${marketScore.score}/100
Recommendation: ${marketScore.recommendation}

Key Metrics:
- Holders: ${metrics.holderCount}
- Top 10 Concentration: ${metrics.topHolderConcentration.toFixed(1)}%
- Liquidity: $${metrics.liquidity.toLocaleString()}
- 7-Day Volume: $${metrics.volume7d.toLocaleString()}

Reasoning: ${marketScore.reasoning}

${marketScore.limitingFactors.length > 0 ? `Limiting Factors: ${marketScore.limitingFactors.join('; ')}` : ''}`;
  }

  /**
   * Get available tools description for prompting
   */
  private getToolsDescription(): string {
    let description = 'Available Tools:\n';
    this.tools.forEach((tool) => {
      description += `- ${tool.name}: ${tool.description}\n`;
    });
    return description;
  }

  /**
   * Parse agent's thought to extract action and input
   */
  private parseAction(thought: string): { action: string; input: string } | null {
    // Look for Action: and Action Input: patterns
    const actionMatch = thought.match(/Action:\s*([^\n]+)/i);
    const inputMatch = thought.match(/Action Input:\s*([^\n]+)/i);

    if (actionMatch && inputMatch) {
      return {
        action: actionMatch[1].trim(),
        input: inputMatch[1].trim(),
      };
    }

    return null;
  }

  /**
   * Generate reasoning prompt for the agent
   */
  private generatePrompt(query: string, history: ReActStep[]): string {
    let prompt = `You are Ordo, an expert token risk analyst for Solana. Your goal is to help users make informed decisions about token trades.

${this.getToolsDescription()}

Use the following format:

Thought: [Your reasoning about what to do next]
Action: [Tool name to use]
Action Input: [Input for the tool]
Observation: [Result from the tool]
... (repeat Thought/Action/Observation as needed)
Thought: I now have enough information to answer
Final Answer: [Your final response to the user]

Previous steps:
${history.map((step, i) => `
Step ${i + 1}:
Thought: ${step.thought}
${step.action ? `Action: ${step.action}` : ''}
${step.actionInput ? `Action Input: ${step.actionInput}` : ''}
${step.observation ? `Observation: ${step.observation}` : ''}
${step.answer ? `Final Answer: ${step.answer}` : ''}
`).join('\n')}

User Query: ${query}

Begin! Remember to think step-by-step and use tools when needed.

Thought:`;

    return prompt;
  }

  /**
   * Simulate LLM reasoning (now using real OpenRouter API)
   */
  private async reason(prompt: string, query: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are Ordo, an expert token risk analyst for Solana. You use the ReAct (Reasoning + Acting) framework to analyze tokens step-by-step.

CRITICAL INSTRUCTIONS:
1. Always follow the exact format: Thought → Action → Action Input
2. Use tools to gather information before answering
3. After receiving an Observation, think about what it means
4. Only provide a Final Answer when you have enough information
5. Be concise but thorough in your reasoning

Available Tools:
${Array.from(this.tools.values()).map(t => `- ${t.name}: ${t.description}`).join('\n')}

Format:
Thought: [Your reasoning about what to do next]
Action: [Exact tool name]
Action Input: [Input for the tool]

After you receive an Observation, continue with:
Thought: [Analyze the observation]
Action: [Next tool if needed, or skip to Final Answer]

When ready to answer:
Thought: I now have enough information to answer
Final Answer: [Your comprehensive response]`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0].message.content || 'No response generated';
    } catch (error: any) {
      console.error('OpenRouter API error:', error.message);
      
      // Fallback to rule-based reasoning if API fails
      return this.fallbackReason(query);
    }
  }

  /**
   * Fallback reasoning when LLM API is unavailable
   */
  private fallbackReason(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Check if query is about analyzing a specific token
    if (lowerQuery.includes('analyze') || lowerQuery.includes('check') || lowerQuery.includes('risk')) {
      const addressMatch = query.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
      
      if (addressMatch) {
        const address = addressMatch[0];
        
        if (this.conversationHistory.length === 0) {
          return `I need to analyze the token ${address} to assess its risk. Let me use the analyze_token_risk tool.
Action: analyze_token_risk
Action Input: ${address}`;
        } else if (this.conversationHistory.length === 1) {
          const lastObs = this.conversationHistory[0].observation || '';
          return `Based on the analysis, I can now provide a comprehensive answer about this token's risk profile.
Final Answer: ${this.generateFinalAnswer(lastObs, query)}`;
        }
      }
    }
    
    // Compare tokens
    if (lowerQuery.includes('compare') || lowerQuery.includes('which is safer')) {
      const addresses = query.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
      
      if (addresses && addresses.length >= 2) {
        if (this.conversationHistory.length === 0) {
          return `I need to compare these tokens to determine which is safer. Let me use the compare_tokens tool.
Action: compare_tokens
Action Input: ${addresses.join(', ')}`;
        } else {
          const lastObs = this.conversationHistory[0].observation || '';
          return `Based on the comparison, I can now recommend which token is safer.
Final Answer: ${this.generateComparisonAnswer(lastObs)}`;
        }
      }
    }
    
    // Default response
    return `I need more information to help you. Please provide a token address to analyze, or ask me to compare multiple tokens.
Final Answer: I'm Ordo, a token risk analyst. I can help you:
1. Analyze token risk: "Analyze token [ADDRESS]"
2. Compare tokens: "Compare [ADDRESS1] and [ADDRESS2]"
3. Quick risk check: "Is [ADDRESS] safe to trade?"

Please provide a token address and I'll assess its risk for you.`;
  }

  /**
   * Generate final answer based on observation
   */
  private generateFinalAnswer(observation: string, query: string): string {
    // Extract key information from observation
    const gradeMatch = observation.match(/Grade:\s*([ABC])/);
    const scoreMatch = observation.match(/Score:\s*(\d+)\/100/);
    const recommendationMatch = observation.match(/Recommendation:\s*(\w+)/);
    
    if (gradeMatch && scoreMatch && recommendationMatch) {
      const grade = gradeMatch[1];
      const score = scoreMatch[1];
      const recommendation = recommendationMatch[1];
      
      let answer = `Based on my analysis, this token receives a Grade ${grade} with a score of ${score}/100.\n\n`;
      
      if (recommendation === 'PROCEED') {
        answer += '✅ **Recommendation: PROCEED**\n\n';
        answer += 'This token shows strong market metrics with healthy liquidity, good holder distribution, and solid trading activity. It appears safe for trading.\n\n';
      } else if (recommendation === 'CAUTION') {
        answer += '⚠️ **Recommendation: CAUTION**\n\n';
        answer += 'This token has moderate risk factors. Consider proceeding with smaller amounts or conducting additional research before trading.\n\n';
      } else {
        answer += '🚫 **Recommendation: REJECT**\n\n';
        answer += 'This token shows high risk characteristics. I do not recommend trading this token without thorough manual review.\n\n';
      }
      
      // Add key metrics
      const holdersMatch = observation.match(/Holders:\s*([\d,]+)/);
      const concentrationMatch = observation.match(/Top 10 Concentration:\s*([\d.]+)%/);
      const liquidityMatch = observation.match(/Liquidity:\s*\$([\d,]+)/);
      
      if (holdersMatch || concentrationMatch || liquidityMatch) {
        answer += '**Key Metrics:**\n';
        if (holdersMatch) answer += `- Holders: ${holdersMatch[1]}\n`;
        if (concentrationMatch) answer += `- Top 10 Concentration: ${concentrationMatch[1]}%\n`;
        if (liquidityMatch) answer += `- Liquidity: $${liquidityMatch[1]}\n`;
      }
      
      return answer;
    }
    
    return observation;
  }

  /**
   * Generate comparison answer
   */
  private generateComparisonAnswer(observation: string): string {
    const lines = observation.split('\n');
    const tokens: any[] = [];
    
    let currentToken: any = null;
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentToken) tokens.push(currentToken);
        currentToken = { address: line };
      } else if (currentToken) {
        if (line.includes('Grade:')) currentToken.grade = line.split(':')[1].trim();
        if (line.includes('Score:')) currentToken.score = parseInt(line.split(':')[1]);
        if (line.includes('Recommendation:')) currentToken.recommendation = line.split(':')[1].trim();
      }
    }
    if (currentToken) tokens.push(currentToken);
    
    // Find safest token
    const safest = tokens.reduce((best, current) => {
      if (!best || current.score > best.score) return current;
      return best;
    }, null);
    
    let answer = '**Token Comparison Results:**\n\n';
    tokens.forEach((token, i) => {
      const emoji = token.grade === 'A' ? '🟢' : token.grade === 'B' ? '🟡' : '🔴';
      answer += `${i + 1}. ${emoji} Grade ${token.grade} (${token.score}/100) - ${token.recommendation}\n`;
    });
    
    answer += `\n**Recommendation:** `;
    if (safest) {
      answer += `Token #${tokens.indexOf(safest) + 1} is the safest option with a Grade ${safest.grade} rating. `;
      if (safest.recommendation === 'PROCEED') {
        answer += 'This token shows strong market metrics and is suitable for trading.';
      } else if (safest.recommendation === 'CAUTION') {
        answer += 'While this is the safer option, still proceed with caution and consider smaller amounts.';
      } else {
        answer += 'However, even the safest option shows high risk. Consider avoiding all these tokens.';
      }
    }
    
    return answer;
  }

  /**
   * Execute one ReAct iteration
   */
  private async executeStep(query: string): Promise<ReActStep> {
    // Generate prompt with history
    const prompt = this.generatePrompt(query, this.conversationHistory);
    
    // Get reasoning from LLM (simulated)
    const reasoning = await this.reason(prompt, query);
    
    // Parse the reasoning
    const lines = reasoning.split('\n');
    const thought = lines[0] || reasoning;
    
    // Check if this is a final answer
    if (reasoning.includes('Final Answer:')) {
      const answerMatch = reasoning.match(/Final Answer:\s*(.+)/s);
      return {
        thought,
        answer: answerMatch ? answerMatch[1].trim() : reasoning,
      };
    }
    
    // Parse action
    const actionInfo = this.parseAction(reasoning);
    
    if (actionInfo) {
      const tool = this.tools.get(actionInfo.action);
      
      if (tool) {
        const observation = await tool.execute(actionInfo.input);
        return {
          thought,
          action: actionInfo.action,
          actionInput: actionInfo.input,
          observation,
        };
      } else {
        return {
          thought,
          observation: `Error: Tool '${actionInfo.action}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        };
      }
    }
    
    return {
      thought,
      observation: 'No action specified. Please specify an action to take.',
    };
  }

  /**
   * Run the ReAct agent loop
   */
  async run(query: string): Promise<string> {
    console.log('🤖 Ordo ReAct Agent Starting...\n');
    console.log(`Query: ${query}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    this.conversationHistory = [];
    
    for (let i = 0; i < this.maxIterations; i++) {
      console.log(`\n🔄 Iteration ${i + 1}/${this.maxIterations}\n`);
      
      const step = await this.executeStep(query);
      this.conversationHistory.push(step);
      
      // Display step
      console.log(`💭 Thought: ${step.thought}`);
      if (step.action) console.log(`🔧 Action: ${step.action}`);
      if (step.actionInput) console.log(`📥 Input: ${step.actionInput}`);
      if (step.observation) console.log(`👁️  Observation: ${step.observation.slice(0, 200)}...`);
      
      // Check if we have a final answer
      if (step.answer) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Final Answer:\n');
        console.log(step.answer);
        return step.answer;
      }
    }
    
    return 'Maximum iterations reached. Unable to complete the task.';
  }

  /**
   * Get conversation history
   */
  getHistory(): ReActStep[] {
    return this.conversationHistory;
  }
}
