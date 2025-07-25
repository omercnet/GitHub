import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPServer, MCPTool, ContextItem } from '../types/index.js';
import { MCPLogger, createToolResponse, validateToolArguments, formatError } from '../utils/common.js';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { join } from 'path';

interface Context7Config {
  maxContextItems?: number;
  contextStoragePath?: string;
  relevanceThreshold?: number;
  enableSemanticSearch?: boolean;
}

export class Context7MCPServer implements MCPServer {
  public readonly name = 'context7-mcp-server';
  public readonly version = '1.0.0';
  public readonly protocol = 'mcp/1.0';
  
  private server: Server;
  private logger: MCPLogger;
  private config: Context7Config;
  private contexts: Map<string, ContextItem[]> = new Map();
  private globalContext: ContextItem[] = [];
  private running = false;

  constructor(config: Context7Config = {}) {
    this.config = {
      maxContextItems: 1000,
      contextStoragePath: './context_storage',
      relevanceThreshold: 0.5,
      enableSemanticSearch: false,
      ...config,
    };
    
    this.logger = new MCPLogger(this.name);
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
        name: 'add_context',
        description: 'Add a new context item',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier for the context item' },
            type: { 
              type: 'string', 
              enum: ['file', 'code', 'documentation', 'conversation', 'task'],
              description: 'Type of context item' 
            },
            content: { type: 'string', description: 'Content of the context item' },
            metadata: { type: 'object', description: 'Additional metadata' },
            namespace: { type: 'string', description: 'Context namespace (optional)' },
          },
          required: ['id', 'type', 'content'],
        },
      },
      {
        name: 'get_context',
        description: 'Retrieve context items',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Specific context item ID' },
            type: { type: 'string', description: 'Filter by context type' },
            namespace: { type: 'string', description: 'Filter by namespace' },
            limit: { type: 'number', description: 'Maximum number of items to return' },
          },
        },
      },
      {
        name: 'search_context',
        description: 'Search context items by content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            type: { type: 'string', description: 'Filter by context type' },
            namespace: { type: 'string', description: 'Filter by namespace' },
            limit: { type: 'number', description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'update_context',
        description: 'Update an existing context item',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Context item ID' },
            content: { type: 'string', description: 'New content' },
            metadata: { type: 'object', description: 'Updated metadata' },
            relevanceScore: { type: 'number', description: 'Updated relevance score' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_context',
        description: 'Delete a context item',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Context item ID' },
            namespace: { type: 'string', description: 'Context namespace' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_namespace',
        description: 'Create a new context namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace name' },
            description: { type: 'string', description: 'Namespace description' },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'list_namespaces',
        description: 'List all context namespaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_context_summary',
        description: 'Get a summary of context statistics',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Filter by namespace' },
          },
        },
      },
      {
        name: 'export_context',
        description: 'Export context data to file',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to export' },
            format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: 'Export format' },
            filename: { type: 'string', description: 'Output filename' },
          },
        },
      },
      {
        name: 'import_context',
        description: 'Import context data from file',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Input filename' },
            namespace: { type: 'string', description: 'Target namespace' },
            format: { type: 'string', enum: ['json', 'csv', 'markdown'], description: 'Input format' },
          },
          required: ['filename'],
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
          case 'add_context':
            return await this.addContext(toolArgs);
          case 'get_context':
            return await this.getContext(toolArgs);
          case 'search_context':
            return await this.searchContext(toolArgs);
          case 'update_context':
            return await this.updateContext(toolArgs);
          case 'delete_context':
            return await this.deleteContext(toolArgs);
          case 'create_namespace':
            return await this.createNamespace(toolArgs);
          case 'list_namespaces':
            return await this.listNamespaces();
          case 'get_context_summary':
            return await this.getContextSummary(toolArgs);
          case 'export_context':
            return await this.exportContext(toolArgs);
          case 'import_context':
            return await this.importContext(toolArgs);
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
          uri: 'context7://contexts',
          name: 'Context Items',
          description: 'All context items',
          mimeType: 'application/json',
        },
        {
          uri: 'context7://namespaces',
          name: 'Context Namespaces',
          description: 'Available context namespaces',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (uri === 'context7://contexts') {
        const allContexts = { global: this.globalContext, namespaces: Object.fromEntries(this.contexts) };
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(allContexts, null, 2),
            },
          ],
        };
      }
      
      if (uri === 'context7://namespaces') {
        const namespaces = Array.from(this.contexts.keys());
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(namespaces, null, 2),
            },
          ],
        };
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async addContext(args: any) {
    const contextItem: ContextItem = {
      id: args.id,
      type: args.type,
      content: args.content,
      metadata: args.metadata || {},
      timestamp: new Date(),
      relevanceScore: 1.0,
    };

    const namespace = args.namespace || 'global';
    
    if (namespace === 'global') {
      this.globalContext.push(contextItem);
      // Keep only the most recent items within limit
      if (this.globalContext.length > this.config.maxContextItems!) {
        this.globalContext = this.globalContext.slice(-this.config.maxContextItems!);
      }
    } else {
      if (!this.contexts.has(namespace)) {
        this.contexts.set(namespace, []);
      }
      const contextArray = this.contexts.get(namespace)!;
      contextArray.push(contextItem);
      if (contextArray.length > this.config.maxContextItems!) {
        contextArray.splice(0, contextArray.length - this.config.maxContextItems!);
      }
    }

    await this.saveContext();
    return createToolResponse(`Context item '${args.id}' added to namespace '${namespace}'`);
  }

  private async getContext(args: any) {
    const namespace = args.namespace || 'global';
    const contextItems = namespace === 'global' ? this.globalContext : this.contexts.get(namespace) || [];
    
    let results = contextItems;
    
    if (args.id) {
      results = results.filter(item => item.id === args.id);
    }
    
    if (args.type) {
      results = results.filter(item => item.type === args.type);
    }
    
    if (args.limit) {
      results = results.slice(-args.limit);
    }
    
    return createToolResponse(JSON.stringify(results, null, 2));
  }

  private async searchContext(args: any) {
    const query = args.query.toLowerCase();
    const namespace = args.namespace || 'global';
    const contextItems = namespace === 'global' ? this.globalContext : this.contexts.get(namespace) || [];
    
    let results = contextItems.filter(item => 
      item.content.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      JSON.stringify(item.metadata).toLowerCase().includes(query)
    );
    
    if (args.type) {
      results = results.filter(item => item.type === args.type);
    }
    
    if (args.limit) {
      results = results.slice(-args.limit);
    }
    
    // Sort by relevance (basic text matching score)
    results.sort((a, b) => {
      const scoreA = this.calculateTextMatchScore(a.content, query);
      const scoreB = this.calculateTextMatchScore(b.content, query);
      return scoreB - scoreA;
    });
    
    return createToolResponse(JSON.stringify(results, null, 2));
  }

  private calculateTextMatchScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      // Exact match gets higher score
      const exactMatches = (lowerText.match(new RegExp(lowerQuery, 'g')) || []).length;
      return exactMatches / text.length;
    }
    
    // Word matching
    const queryWords = lowerQuery.split(/\s+/);
    const textWords = lowerText.split(/\s+/);
    const matchingWords = queryWords.filter(word => textWords.includes(word));
    
    return matchingWords.length / queryWords.length;
  }

  private async updateContext(args: any) {
    const namespace = args.namespace || 'global';
    const contextItems = namespace === 'global' ? this.globalContext : this.contexts.get(namespace) || [];
    
    const itemIndex = contextItems.findIndex(item => item.id === args.id);
    if (itemIndex === -1) {
      return createToolResponse(`Context item '${args.id}' not found`, true);
    }
    
    const item = contextItems[itemIndex];
    if (args.content !== undefined) item.content = args.content;
    if (args.metadata !== undefined) item.metadata = { ...item.metadata, ...args.metadata };
    if (args.relevanceScore !== undefined) item.relevanceScore = args.relevanceScore;
    
    await this.saveContext();
    return createToolResponse(`Context item '${args.id}' updated`);
  }

  private async deleteContext(args: any) {
    const namespace = args.namespace || 'global';
    const contextItems = namespace === 'global' ? this.globalContext : this.contexts.get(namespace) || [];
    
    const itemIndex = contextItems.findIndex(item => item.id === args.id);
    if (itemIndex === -1) {
      return createToolResponse(`Context item '${args.id}' not found`, true);
    }
    
    contextItems.splice(itemIndex, 1);
    await this.saveContext();
    return createToolResponse(`Context item '${args.id}' deleted`);
  }

  private async createNamespace(args: any) {
    if (!this.contexts.has(args.namespace)) {
      this.contexts.set(args.namespace, []);
      await this.saveContext();
      return createToolResponse(`Namespace '${args.namespace}' created`);
    }
    return createToolResponse(`Namespace '${args.namespace}' already exists`, true);
  }

  private async listNamespaces() {
    const namespaces = ['global', ...Array.from(this.contexts.keys())];
    return createToolResponse(JSON.stringify(namespaces, null, 2));
  }

  private async getContextSummary(args: any) {
    const namespace = args.namespace;
    
    if (namespace && namespace !== 'global') {
      const contextItems = this.contexts.get(namespace) || [];
      const summary = {
        namespace,
        totalItems: contextItems.length,
        typeBreakdown: this.getTypeBreakdown(contextItems),
        averageRelevance: this.getAverageRelevance(contextItems),
      };
      return createToolResponse(JSON.stringify(summary, null, 2));
    }
    
    // Summary of all contexts
    const allItems = [
      ...this.globalContext,
      ...Array.from(this.contexts.values()).flat(),
    ];
    
    const summary = {
      totalItems: allItems.length,
      globalItems: this.globalContext.length,
      namespacesCount: this.contexts.size,
      typeBreakdown: this.getTypeBreakdown(allItems),
      averageRelevance: this.getAverageRelevance(allItems),
    };
    
    return createToolResponse(JSON.stringify(summary, null, 2));
  }

  private getTypeBreakdown(items: ContextItem[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const item of items) {
      breakdown[item.type] = (breakdown[item.type] || 0) + 1;
    }
    return breakdown;
  }

  private getAverageRelevance(items: ContextItem[]): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item.relevanceScore || 0), 0);
    return sum / items.length;
  }

  private async exportContext(args: any) {
    const namespace = args.namespace || 'global';
    const format = args.format || 'json';
    const filename = args.filename || `context_export_${namespace}_${Date.now()}.${format}`;
    
    const contextItems = namespace === 'global' ? this.globalContext : this.contexts.get(namespace) || [];
    
    await mkdir(this.config.contextStoragePath!, { recursive: true });
    const filePath = join(this.config.contextStoragePath!, filename);
    
    let content: string;
    switch (format) {
      case 'json':
        content = JSON.stringify(contextItems, null, 2);
        break;
      case 'csv':
        content = this.contextItemsToCSV(contextItems);
        break;
      case 'markdown':
        content = this.contextItemsToMarkdown(contextItems);
        break;
      default:
        return createToolResponse(`Unsupported format: ${format}`, true);
    }
    
    await writeFile(filePath, content, 'utf-8');
    return createToolResponse(`Context exported to: ${filePath}`);
  }

  private contextItemsToCSV(items: ContextItem[]): string {
    const headers = ['id', 'type', 'content', 'timestamp', 'relevanceScore', 'metadata'];
    const rows = items.map(item => [
      item.id,
      item.type,
      `"${item.content.replace(/"/g, '""')}"`,
      item.timestamp.toISOString(),
      item.relevanceScore || 0,
      `"${JSON.stringify(item.metadata).replace(/"/g, '""')}"`,
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private contextItemsToMarkdown(items: ContextItem[]): string {
    let md = `# Context Export\n\n`;
    md += `Total items: ${items.length}\n\n`;
    
    for (const item of items) {
      md += `## ${item.id} (${item.type})\n\n`;
      md += `**Timestamp:** ${item.timestamp.toISOString()}\n`;
      md += `**Relevance:** ${item.relevanceScore || 0}\n\n`;
      md += `**Content:**\n${item.content}\n\n`;
      
      if (Object.keys(item.metadata).length > 0) {
        md += `**Metadata:**\n\`\`\`json\n${JSON.stringify(item.metadata, null, 2)}\n\`\`\`\n\n`;
      }
      
      md += '---\n\n';
    }
    
    return md;
  }

  private async importContext(args: any) {
    const filename = args.filename;
    const namespace = args.namespace || 'global';
    const format = args.format || 'json';
    
    try {
      const content = await readFile(filename, 'utf-8');
      let items: ContextItem[];
      
      switch (format) {
        case 'json':
          items = JSON.parse(content);
          break;
        default:
          return createToolResponse(`Import format '${format}' not supported yet`, true);
      }
      
      // Validate items
      if (!Array.isArray(items)) {
        return createToolResponse('Invalid import file: expected array of context items', true);
      }
      
      // Add to appropriate namespace
      if (namespace === 'global') {
        this.globalContext.push(...items);
      } else {
        if (!this.contexts.has(namespace)) {
          this.contexts.set(namespace, []);
        }
        this.contexts.get(namespace)!.push(...items);
      }
      
      await this.saveContext();
      return createToolResponse(`Imported ${items.length} context items to namespace '${namespace}'`);
    } catch (error) {
      return createToolResponse(`Import failed: ${formatError(error)}`, true);
    }
  }

  private async saveContext(): Promise<void> {
    try {
      await mkdir(this.config.contextStoragePath!, { recursive: true });
      
      const data = {
        globalContext: this.globalContext,
        contexts: Object.fromEntries(this.contexts),
      };
      
      const filePath = join(this.config.contextStoragePath!, 'contexts.json');
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save context:', error as Error);
    }
  }

  private async loadContext(): Promise<void> {
    try {
      const filePath = join(this.config.contextStoragePath!, 'contexts.json');
      await access(filePath);
      
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      this.globalContext = data.globalContext || [];
      this.contexts = new Map(Object.entries(data.contexts || {}));
    } catch (error) {
      // File doesn't exist or is invalid, start with empty context
      this.logger.info('No existing context file found, starting fresh');
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Server is already running');
      return;
    }

    await this.loadContext();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.running = true;
    this.logger.info('Context7 MCP Server started');
  }

  async stop(): Promise<void> {
    if (!this.running) {
      this.logger.warn('Server is not running');
      return;
    }

    await this.saveContext();
    await this.server.close();
    this.running = false;
    this.logger.info('Context7 MCP Server stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Context7MCPServer();
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  server.start().catch(console.error);
}