import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import { MCPServer, MCPTool, GitHubConfig } from '../types/index.js';
import { MCPLogger, createToolResponse, validateToolArguments, formatError } from '../utils/common.js';

export class GitHubMCPServer implements MCPServer {
  public readonly name = 'github-mcp-server';
  public readonly version = '1.0.0';
  public readonly protocol = 'mcp/1.0';
  
  private server: Server;
  private logger: MCPLogger;
  private octokit: Octokit;
  private config: GitHubConfig;
  private running = false;

  constructor(config: GitHubConfig = {}) {
    this.config = config;
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

    this.octokit = new Octokit({
      auth: config.token || process.env.GITHUB_TOKEN,
      baseUrl: config.baseUrl || 'https://api.github.com',
    });

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private getTools(): MCPTool[] {
    return [
      {
        name: 'get_repository',
        description: 'Get information about a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Issue state' },
            labels: { type: 'string', description: 'Comma-separated list of labels' },
            per_page: { type: 'number', description: 'Number of issues per page (max 100)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' },
            assignees: { type: 'array', items: { type: 'string' }, description: 'Issue assignees' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'get_pull_requests',
        description: 'List pull requests in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'PR state' },
            per_page: { type: 'number', description: 'Number of PRs per page (max 100)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_file_content',
        description: 'Get the content of a file from a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            path: { type: 'string', description: 'File path' },
            ref: { type: 'string', description: 'Branch, tag, or commit SHA' },
          },
          required: ['owner', 'repo', 'path'],
        },
      },
      {
        name: 'search_repositories',
        description: 'Search for GitHub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            sort: { type: 'string', enum: ['stars', 'forks', 'updated'], description: 'Sort field' },
            order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
            per_page: { type: 'number', description: 'Number of results per page (max 100)' },
          },
          required: ['q'],
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
          case 'get_repository':
            return await this.getRepository(toolArgs.owner as string, toolArgs.repo as string);
          case 'list_issues':
            return await this.listIssues(toolArgs);
          case 'create_issue':
            return await this.createIssue(toolArgs);
          case 'get_pull_requests':
            return await this.getPullRequests(toolArgs);
          case 'get_file_content':
            return await this.getFileContent(toolArgs);
          case 'search_repositories':
            return await this.searchRepositories(toolArgs);
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
          uri: 'github://repositories',
          name: 'GitHub Repositories',
          description: 'Access to GitHub repositories',
          mimeType: 'application/json',
        },
        {
          uri: 'github://issues',
          name: 'GitHub Issues',
          description: 'Access to GitHub issues',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (uri.startsWith('github://')) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ message: 'GitHub resource access', uri }),
            },
          ],
        };
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async getRepository(owner: string, repo: string) {
    const response = await this.octokit.rest.repos.get({ owner, repo });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  private async listIssues(args: any) {
    const response = await this.octokit.rest.issues.listForRepo({
      owner: args.owner,
      repo: args.repo,
      state: args.state || 'open',
      labels: args.labels,
      per_page: args.per_page || 30,
    });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  private async createIssue(args: any) {
    const response = await this.octokit.rest.issues.create({
      owner: args.owner,
      repo: args.repo,
      title: args.title,
      body: args.body,
      labels: args.labels,
      assignees: args.assignees,
    });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  private async getPullRequests(args: any) {
    const response = await this.octokit.rest.pulls.list({
      owner: args.owner,
      repo: args.repo,
      state: args.state || 'open',
      per_page: args.per_page || 30,
    });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  private async getFileContent(args: any) {
    const response = await this.octokit.rest.repos.getContent({
      owner: args.owner,
      repo: args.repo,
      path: args.path,
      ref: args.ref,
    });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  private async searchRepositories(args: any) {
    const response = await this.octokit.rest.search.repos({
      q: args.q,
      sort: args.sort,
      order: args.order,
      per_page: args.per_page || 30,
    });
    return createToolResponse(JSON.stringify(response.data, null, 2));
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Server is already running');
      return;
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.running = true;
    this.logger.info('GitHub MCP Server started');
  }

  async stop(): Promise<void> {
    if (!this.running) {
      this.logger.warn('Server is not running');
      return;
    }

    await this.server.close();
    this.running = false;
    this.logger.info('GitHub MCP Server stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GitHubMCPServer();
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  server.start().catch(console.error);
}