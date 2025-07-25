import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPServer, MCPTool, MemoryState, ContextItem } from '../types/index.js';
import { MCPLogger, createToolResponse, validateToolArguments, formatError } from '../utils/common.js';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { join } from 'path';

interface ThoughtProcess {
  id: string;
  steps: ThoughtStep[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  metadata: Record<string, any>;
}

interface ThoughtStep {
  id: string;
  content: string;
  type: 'observation' | 'hypothesis' | 'analysis' | 'conclusion' | 'action' | 'reflection';
  timestamp: Date;
  confidence: number;
  dependencies: string[];
  evidences: string[];
}

interface MemoryConfig {
  maxShortTermItems?: number;
  maxLongTermItems?: number;
  maxWorkingMemoryItems?: number;
  memoryStoragePath?: string;
  autoConsolidateThreshold?: number;
  forgetFactorDays?: number;
}

export class MemorySequentialThinkingServer implements MCPServer {
  public readonly name = 'memory-sequential-thinking-server';
  public readonly version = '1.0.0';
  public readonly protocol = 'mcp/1.0';
  
  private server: Server;
  private logger: MCPLogger;
  private config: MemoryConfig;
  private memoryState: MemoryState;
  private activeThoughts: Map<string, ThoughtProcess> = new Map();
  private completedThoughts: ThoughtProcess[] = [];
  private running = false;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      maxShortTermItems: 100,
      maxLongTermItems: 1000,
      maxWorkingMemoryItems: 20,
      memoryStoragePath: './memory_storage',
      autoConsolidateThreshold: 0.7,
      forgetFactorDays: 30,
      ...config,
    };
    
    this.logger = new MCPLogger(this.name);
    this.memoryState = {
      shortTerm: [],
      longTerm: [],
      workingMemory: [],
      contextHistory: [],
    };
    
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private getTools(): MCPTool[] {
    return [
      {
        name: 'start_thinking_process',
        description: 'Start a new sequential thinking process',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier for the thinking process' },
            topic: { type: 'string', description: 'Topic or question to think about' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['id', 'topic'],
        },
      },
      {
        name: 'add_thought_step',
        description: 'Add a step to an active thinking process',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'Thinking process ID' },
            content: { type: 'string', description: 'Thought content' },
            type: { 
              type: 'string', 
              enum: ['observation', 'hypothesis', 'analysis', 'conclusion', 'action', 'reflection'],
              description: 'Type of thought step' 
            },
            confidence: { type: 'number', description: 'Confidence level (0-1)' },
            dependencies: { type: 'array', items: { type: 'string' }, description: 'IDs of dependent steps' },
            evidences: { type: 'array', items: { type: 'string' }, description: 'Supporting evidence IDs' },
          },
          required: ['processId', 'content', 'type'],
        },
      },
      {
        name: 'complete_thinking_process',
        description: 'Mark a thinking process as completed',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'Thinking process ID' },
            conclusion: { type: 'string', description: 'Final conclusion' },
          },
          required: ['processId'],
        },
      },
      {
        name: 'get_thinking_process',
        description: 'Retrieve a thinking process',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'Thinking process ID' },
          },
          required: ['processId'],
        },
      },
      {
        name: 'list_thinking_processes',
        description: 'List all thinking processes',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'completed', 'paused', 'abandoned'], description: 'Filter by status' },
            limit: { type: 'number', description: 'Maximum number of processes to return' },
          },
        },
      },
      {
        name: 'add_to_memory',
        description: 'Add information to memory (short-term, long-term, or working)',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content' },
            type: { 
              type: 'string', 
              enum: ['file', 'code', 'documentation', 'conversation', 'task'],
              description: 'Type of memory item' 
            },
            memoryType: { 
              type: 'string', 
              enum: ['short_term', 'long_term', 'working'],
              description: 'Which memory store to use' 
            },
            metadata: { type: 'object', description: 'Additional metadata' },
            relevanceScore: { type: 'number', description: 'Relevance score (0-1)' },
          },
          required: ['content', 'type', 'memoryType'],
        },
      },
      {
        name: 'recall_memory',
        description: 'Recall information from memory',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            memoryType: { 
              type: 'string', 
              enum: ['short_term', 'long_term', 'working', 'all'],
              description: 'Which memory store to search' 
            },
            limit: { type: 'number', description: 'Maximum number of results' },
            minRelevance: { type: 'number', description: 'Minimum relevance score' },
          },
          required: ['query'],
        },
      },
      {
        name: 'consolidate_memory',
        description: 'Move important short-term memories to long-term',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Minimum relevance score for consolidation' },
          },
        },
      },
      {
        name: 'forget_memory',
        description: 'Remove old or irrelevant memories',
        inputSchema: {
          type: 'object',
          properties: {
            memoryType: { 
              type: 'string', 
              enum: ['short_term', 'long_term', 'working'],
              description: 'Which memory store to clean' 
            },
            olderThanDays: { type: 'number', description: 'Remove memories older than this many days' },
            belowRelevance: { type: 'number', description: 'Remove memories below this relevance score' },
          },
        },
      },
      {
        name: 'get_memory_status',
        description: 'Get current memory statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_thought_patterns',
        description: 'Analyze patterns in thinking processes',
        inputSchema: {
          type: 'object',
          properties: {
            timeRange: { type: 'string', description: 'Time range to analyze (e.g., "7d", "1h")' },
          },
        },
      },
      {
        name: 'connect_memories',
        description: 'Find connections between memories and thoughts',
        inputSchema: {
          type: 'object',
          properties: {
            memoryId: { type: 'string', description: 'Memory item ID to find connections for' },
            maxConnections: { type: 'number', description: 'Maximum number of connections to return' },
          },
          required: ['memoryId'],
        },
      },
    ];
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tools = this.getTools();
      const tool = tools.find(t => t.name === name);
      
      if (!tool) {
        return createToolResponse(`Unknown tool: ${name}`, true);
      }

      const toolArgs = args || {};
      const validation = validateToolArguments(tool, toolArgs);
      if (!validation.valid) {
        return createToolResponse(`Invalid arguments: ${validation.errors.join(', ')}`, true);
      }

      try {
        switch (name) {
          case 'start_thinking_process':
            return await this.startThinkingProcess(toolArgs);
          case 'add_thought_step':
            return await this.addThoughtStep(toolArgs);
          case 'complete_thinking_process':
            return await this.completeThinkingProcess(toolArgs);
          case 'get_thinking_process':
            return await this.getThinkingProcess(toolArgs);
          case 'list_thinking_processes':
            return await this.listThinkingProcesses(toolArgs);
          case 'add_to_memory':
            return await this.addToMemory(toolArgs);
          case 'recall_memory':
            return await this.recallMemory(toolArgs);
          case 'consolidate_memory':
            return await this.consolidateMemory(toolArgs);
          case 'forget_memory':
            return await this.forgetMemory(toolArgs);
          case 'get_memory_status':
            return await this.getMemoryStatus();
          case 'analyze_thought_patterns':
            return await this.analyzeThoughtPatterns(toolArgs);
          case 'connect_memories':
            return await this.connectMemories(toolArgs);
          default:
            return createToolResponse(`Tool '${name}' not implemented`, true);
        }
      } catch (error) {
        this.logger.error(`Error executing tool ${name}:`, error as Error);
        return createToolResponse(`Error: ${formatError(error)}`, true);
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'memory://state',
          name: 'Memory State',
          description: 'Current memory state',
          mimeType: 'application/json',
        },
        {
          uri: 'memory://thoughts',
          name: 'Thinking Processes',
          description: 'All thinking processes',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (uri === 'memory://state') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.memoryState, null, 2),
            },
          ],
        };
      }
      
      if (uri === 'memory://thoughts') {
        const allThoughts = {
          active: Object.fromEntries(this.activeThoughts),
          completed: this.completedThoughts,
        };
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(allThoughts, null, 2),
            },
          ],
        };
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async startThinkingProcess(args: any) {
    const process: ThoughtProcess = {
      id: args.id,
      steps: [],
      startTime: new Date(),
      status: 'active',
      metadata: args.metadata || { topic: args.topic },
    };

    this.activeThoughts.set(args.id, process);
    await this.saveState();
    
    return createToolResponse(`Started thinking process '${args.id}' on topic: ${args.topic}`);
  }

  private async addThoughtStep(args: any) {
    const process = this.activeThoughts.get(args.processId);
    if (!process) {
      return createToolResponse(`Thinking process '${args.processId}' not found`, true);
    }

    const step: ThoughtStep = {
      id: `${args.processId}_step_${process.steps.length + 1}`,
      content: args.content,
      type: args.type,
      timestamp: new Date(),
      confidence: args.confidence || 0.5,
      dependencies: args.dependencies || [],
      evidences: args.evidences || [],
    };

    process.steps.push(step);
    await this.saveState();
    
    return createToolResponse(`Added ${args.type} step to thinking process '${args.processId}'`);
  }

  private async completeThinkingProcess(args: any) {
    const process = this.activeThoughts.get(args.processId);
    if (!process) {
      return createToolResponse(`Thinking process '${args.processId}' not found`, true);
    }

    process.status = 'completed';
    process.endTime = new Date();
    
    if (args.conclusion) {
      const conclusionStep: ThoughtStep = {
        id: `${args.processId}_conclusion`,
        content: args.conclusion,
        type: 'conclusion',
        timestamp: new Date(),
        confidence: 1.0,
        dependencies: [],
        evidences: [],
      };
      process.steps.push(conclusionStep);
    }

    this.completedThoughts.push(process);
    this.activeThoughts.delete(args.processId);
    
    // Automatically add the conclusion to long-term memory
    if (args.conclusion) {
      await this.addMemoryItem(args.conclusion, 'conversation', 'long_term', {
        sourceProcess: args.processId,
        isConclusion: true,
      }, 0.8);
    }
    
    await this.saveState();
    return createToolResponse(`Completed thinking process '${args.processId}'`);
  }

  private async getThinkingProcess(args: any) {
    const process = this.activeThoughts.get(args.processId) || 
                   this.completedThoughts.find(p => p.id === args.processId);
    
    if (!process) {
      return createToolResponse(`Thinking process '${args.processId}' not found`, true);
    }

    return createToolResponse(JSON.stringify(process, null, 2));
  }

  private async listThinkingProcesses(args: any) {
    let processes: ThoughtProcess[] = [
      ...Array.from(this.activeThoughts.values()),
      ...this.completedThoughts,
    ];

    if (args.status) {
      processes = processes.filter(p => p.status === args.status);
    }

    if (args.limit) {
      processes = processes.slice(-args.limit);
    }

    return createToolResponse(JSON.stringify(processes, null, 2));
  }

  private async addToMemory(args: any) {
    const relevanceScore = args.relevanceScore || 0.5;
    await this.addMemoryItem(args.content, args.type, args.memoryType, args.metadata || {}, relevanceScore);
    await this.saveState();
    
    return createToolResponse(`Added to ${args.memoryType} memory`);
  }

  private async addMemoryItem(
    content: string,
    type: string,
    memoryType: string,
    metadata: Record<string, any>,
    relevanceScore: number
  ): Promise<void> {
    const item: ContextItem = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      content,
      metadata,
      timestamp: new Date(),
      relevanceScore,
    };

    const memoryStore = this.getMemoryStore(memoryType);
    memoryStore.push(item);

    // Maintain size limits
    const maxSize = this.getMaxSize(memoryType);
    if (memoryStore.length > maxSize) {
      // Remove oldest items with lowest relevance
      memoryStore.sort((a, b) => {
        const scoreA = (a.relevanceScore || 0) * (new Date().getTime() - a.timestamp.getTime());
        const scoreB = (b.relevanceScore || 0) * (new Date().getTime() - b.timestamp.getTime());
        return scoreA - scoreB;
      });
      memoryStore.splice(0, memoryStore.length - maxSize);
    }
  }

  private getMemoryStore(memoryType: string): ContextItem[] {
    switch (memoryType) {
      case 'short_term': return this.memoryState.shortTerm;
      case 'long_term': return this.memoryState.longTerm;
      case 'working': return this.memoryState.workingMemory;
      default: throw new Error(`Unknown memory type: ${memoryType}`);
    }
  }

  private getMaxSize(memoryType: string): number {
    switch (memoryType) {
      case 'short_term': return this.config.maxShortTermItems!;
      case 'long_term': return this.config.maxLongTermItems!;
      case 'working': return this.config.maxWorkingMemoryItems!;
      default: return 100;
    }
  }

  private async recallMemory(args: any) {
    const memoryStores: ContextItem[][] = [];
    
    if (args.memoryType === 'all' || !args.memoryType) {
      memoryStores.push(
        this.memoryState.shortTerm,
        this.memoryState.longTerm,
        this.memoryState.workingMemory
      );
    } else {
      memoryStores.push(this.getMemoryStore(args.memoryType));
    }

    const allItems = memoryStores.flat();
    const query = args.query.toLowerCase();
    const minRelevance = args.minRelevance || 0;

    let results = allItems.filter(item => {
      const matchesQuery = item.content.toLowerCase().includes(query) ||
                          item.id.toLowerCase().includes(query) ||
                          JSON.stringify(item.metadata).toLowerCase().includes(query);
      const meetsRelevance = (item.relevanceScore || 0) >= minRelevance;
      return matchesQuery && meetsRelevance;
    });

    // Sort by relevance and recency
    results.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) + (new Date().getTime() - a.timestamp.getTime()) / 1000000;
      const scoreB = (b.relevanceScore || 0) + (new Date().getTime() - b.timestamp.getTime()) / 1000000;
      return scoreB - scoreA;
    });

    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    return createToolResponse(JSON.stringify(results, null, 2));
  }

  private async consolidateMemory(args: any) {
    const threshold = args.threshold || this.config.autoConsolidateThreshold!;
    const consolidatedItems = this.memoryState.shortTerm.filter(item => 
      (item.relevanceScore || 0) >= threshold
    );

    for (const item of consolidatedItems) {
      this.memoryState.longTerm.push({ ...item });
    }

    // Remove consolidated items from short-term
    this.memoryState.shortTerm = this.memoryState.shortTerm.filter(item => 
      (item.relevanceScore || 0) < threshold
    );

    await this.saveState();
    return createToolResponse(`Consolidated ${consolidatedItems.length} items to long-term memory`);
  }

  private async forgetMemory(args: any) {
    const memoryStore = args.memoryType ? this.getMemoryStore(args.memoryType) : null;
    const stores = memoryStore ? [memoryStore] : [
      this.memoryState.shortTerm,
      this.memoryState.longTerm,
      this.memoryState.workingMemory,
    ];

    let totalForgotten = 0;
    const now = new Date();

    for (const store of stores) {
      const originalLength = store.length;
      
      store.splice(0, store.length, ...store.filter(item => {
        if (args.olderThanDays) {
          const daysDiff = (now.getTime() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > args.olderThanDays) return false;
        }
        
        if (args.belowRelevance) {
          if ((item.relevanceScore || 0) < args.belowRelevance) return false;
        }
        
        return true;
      }));
      
      totalForgotten += originalLength - store.length;
    }

    await this.saveState();
    return createToolResponse(`Forgot ${totalForgotten} memory items`);
  }

  private async getMemoryStatus() {
    const status = {
      shortTerm: {
        count: this.memoryState.shortTerm.length,
        maxSize: this.config.maxShortTermItems,
        averageRelevance: this.calculateAverageRelevance(this.memoryState.shortTerm),
      },
      longTerm: {
        count: this.memoryState.longTerm.length,
        maxSize: this.config.maxLongTermItems,
        averageRelevance: this.calculateAverageRelevance(this.memoryState.longTerm),
      },
      working: {
        count: this.memoryState.workingMemory.length,
        maxSize: this.config.maxWorkingMemoryItems,
        averageRelevance: this.calculateAverageRelevance(this.memoryState.workingMemory),
      },
      activeThoughts: this.activeThoughts.size,
      completedThoughts: this.completedThoughts.length,
    };

    return createToolResponse(JSON.stringify(status, null, 2));
  }

  private calculateAverageRelevance(items: ContextItem[]): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item.relevanceScore || 0), 0);
    return sum / items.length;
  }

  private async analyzeThoughtPatterns(_args: any) {
    const patterns = {
      mostCommonStepTypes: this.analyzeMostCommonStepTypes(),
      averageProcessLength: this.calculateAverageProcessLength(),
      averageConfidence: this.calculateAverageConfidence(),
      completionRate: this.calculateCompletionRate(),
      topicFrequency: this.analyzeTopicFrequency(),
    };

    return createToolResponse(JSON.stringify(patterns, null, 2));
  }

  private analyzeMostCommonStepTypes(): Record<string, number> {
    const stepTypes: Record<string, number> = {};
    
    const allProcesses = [...Array.from(this.activeThoughts.values()), ...this.completedThoughts];
    for (const process of allProcesses) {
      for (const step of process.steps) {
        stepTypes[step.type] = (stepTypes[step.type] || 0) + 1;
      }
    }
    
    return stepTypes;
  }

  private calculateAverageProcessLength(): number {
    const allProcesses = [...Array.from(this.activeThoughts.values()), ...this.completedThoughts];
    if (allProcesses.length === 0) return 0;
    
    const totalSteps = allProcesses.reduce((acc, process) => acc + process.steps.length, 0);
    return totalSteps / allProcesses.length;
  }

  private calculateAverageConfidence(): number {
    const allProcesses = [...Array.from(this.activeThoughts.values()), ...this.completedThoughts];
    const allSteps = allProcesses.flatMap(process => process.steps);
    
    if (allSteps.length === 0) return 0;
    
    const totalConfidence = allSteps.reduce((acc, step) => acc + step.confidence, 0);
    return totalConfidence / allSteps.length;
  }

  private calculateCompletionRate(): number {
    const total = this.activeThoughts.size + this.completedThoughts.length;
    if (total === 0) return 0;
    
    return this.completedThoughts.length / total;
  }

  private analyzeTopicFrequency(): Record<string, number> {
    const topics: Record<string, number> = {};
    
    const allProcesses = [...Array.from(this.activeThoughts.values()), ...this.completedThoughts];
    for (const process of allProcesses) {
      const topic = process.metadata.topic;
      if (topic) {
        topics[topic] = (topics[topic] || 0) + 1;
      }
    }
    
    return topics;
  }

  private async connectMemories(args: any) {
    const allItems = [
      ...this.memoryState.shortTerm,
      ...this.memoryState.longTerm,
      ...this.memoryState.workingMemory,
    ];

    const targetItem = allItems.find(item => item.id === args.memoryId);
    if (!targetItem) {
      return createToolResponse(`Memory item '${args.memoryId}' not found`, true);
    }

    const connections = this.findSemanticConnections(targetItem, allItems, args.maxConnections || 5);
    return createToolResponse(JSON.stringify(connections, null, 2));
  }

  private findSemanticConnections(target: ContextItem, items: ContextItem[], maxConnections: number): ContextItem[] {
    const targetWords = this.extractKeywords(target.content);
    
    const scored = items
      .filter(item => item.id !== target.id)
      .map(item => ({
        item,
        score: this.calculateSemanticSimilarity(targetWords, this.extractKeywords(item.content)),
      }))
      .filter(scored => scored.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxConnections)
      .map(scored => scored.item);

    return scored;
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 20); // Limit for performance
  }

  private calculateSemanticSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async saveState(): Promise<void> {
    try {
      await mkdir(this.config.memoryStoragePath!, { recursive: true });
      
      const state = {
        memoryState: this.memoryState,
        activeThoughts: Object.fromEntries(this.activeThoughts),
        completedThoughts: this.completedThoughts,
      };
      
      const filePath = join(this.config.memoryStoragePath!, 'memory_state.json');
      await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save memory state:', error as Error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const filePath = join(this.config.memoryStoragePath!, 'memory_state.json');
      await access(filePath);
      
      const content = await readFile(filePath, 'utf-8');
      const state = JSON.parse(content);
      
      this.memoryState = state.memoryState || this.memoryState;
      this.activeThoughts = new Map(Object.entries(state.activeThoughts || {}));
      this.completedThoughts = state.completedThoughts || [];
    } catch (error) {
      this.logger.info('No existing memory state found, starting fresh');
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Server is already running');
      return;
    }

    await this.loadState();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.running = true;
    this.logger.info('Memory Sequential Thinking Server started');
  }

  async stop(): Promise<void> {
    if (!this.running) {
      this.logger.warn('Server is not running');
      return;
    }

    await this.saveState();
    await this.server.close();
    this.running = false;
    this.logger.info('Memory Sequential Thinking Server stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MemorySequentialThinkingServer();
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  server.start().catch(console.error);
}