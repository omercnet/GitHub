import { GitHubMCPServer } from './servers/github-mcp-server.js';
import { PlaywrightMCPServer } from './servers/playwright-mcp-server.js';
import { Context7MCPServer } from './servers/context7-mcp-server.js';
import { MemorySequentialThinkingServer } from './servers/memory-mcp-server.js';
import { MCPServer, ServerConfig, GitHubConfig, PlaywrightConfig } from './types/index.js';
import { MCPLogger, getDefaultServerConfig, parseEnvBool, parseEnvInt } from './utils/common.js';

interface WebDevMCPConfig {
  github?: GitHubConfig;
  playwright?: PlaywrightConfig;
  context7?: {
    maxContextItems?: number;
    contextStoragePath?: string;
    relevanceThreshold?: number;
    enableSemanticSearch?: boolean;
  };
  memory?: {
    maxShortTermItems?: number;
    maxLongTermItems?: number;
    maxWorkingMemoryItems?: number;
    memoryStoragePath?: string;
    autoConsolidateThreshold?: number;
    forgetFactorDays?: number;
  };
  server?: ServerConfig;
}

export class WebDevelopmentMCPCoordinator {
  private servers: Map<string, MCPServer> = new Map();
  private logger: MCPLogger;
  private config: WebDevMCPConfig;
  private running = false;

  constructor(config: WebDevMCPConfig = {}) {
    this.config = {
      github: {
        token: process.env.GITHUB_TOKEN,
        baseUrl: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
        ...config.github,
      },
      playwright: {
        headless: parseEnvBool(process.env.PLAYWRIGHT_HEADLESS, true),
        viewport: {
          width: parseEnvInt(process.env.PLAYWRIGHT_VIEWPORT_WIDTH, 1280),
          height: parseEnvInt(process.env.PLAYWRIGHT_VIEWPORT_HEIGHT, 720),
        },
        timeout: parseEnvInt(process.env.PLAYWRIGHT_TIMEOUT, 30000),
        screenshotPath: process.env.PLAYWRIGHT_SCREENSHOT_PATH || './screenshots',
        ...config.playwright,
      },
      context7: {
        maxContextItems: parseEnvInt(process.env.CONTEXT7_MAX_ITEMS, 1000),
        contextStoragePath: process.env.CONTEXT7_STORAGE_PATH || './context_storage',
        relevanceThreshold: parseFloat(process.env.CONTEXT7_RELEVANCE_THRESHOLD || '0.5'),
        enableSemanticSearch: parseEnvBool(process.env.CONTEXT7_SEMANTIC_SEARCH, false),
        ...config.context7,
      },
      memory: {
        maxShortTermItems: parseEnvInt(process.env.MEMORY_MAX_SHORT_TERM, 100),
        maxLongTermItems: parseEnvInt(process.env.MEMORY_MAX_LONG_TERM, 1000),
        maxWorkingMemoryItems: parseEnvInt(process.env.MEMORY_MAX_WORKING, 20),
        memoryStoragePath: process.env.MEMORY_STORAGE_PATH || './memory_storage',
        autoConsolidateThreshold: parseFloat(process.env.MEMORY_CONSOLIDATE_THRESHOLD || '0.7'),
        forgetFactorDays: parseEnvInt(process.env.MEMORY_FORGET_DAYS, 30),
        ...config.memory,
      },
      server: {
        ...getDefaultServerConfig(),
        ...config.server,
      },
    };

    this.logger = new MCPLogger('WebDevMCPCoordinator');
    this.initializeServers();
  }

  private initializeServers(): void {
    // Initialize GitHub MCP Server
    const githubServer = new GitHubMCPServer(this.config.github);
    this.servers.set('github', githubServer);

    // Initialize Playwright MCP Server
    const playwrightServer = new PlaywrightMCPServer(this.config.playwright);
    this.servers.set('playwright', playwrightServer);

    // Initialize Context7 MCP Server
    const context7Server = new Context7MCPServer(this.config.context7);
    this.servers.set('context7', context7Server);

    // Initialize Memory Sequential Thinking Server
    const memoryServer = new MemorySequentialThinkingServer(this.config.memory);
    this.servers.set('memory', memoryServer);

    this.logger.info(`Initialized ${this.servers.size} MCP servers`);
  }

  async startAll(): Promise<void> {
    if (this.running) {
      this.logger.warn('Coordinator is already running');
      return;
    }

    this.logger.info('Starting all MCP servers...');
    
    const startPromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      try {
        await server.start();
        this.logger.info(`Started ${name} server`);
      } catch (error) {
        this.logger.error(`Failed to start ${name} server:`, error as Error);
        throw error;
      }
    });

    await Promise.all(startPromises);
    this.running = true;
    this.logger.info('All MCP servers started successfully');
  }

  async stopAll(): Promise<void> {
    if (!this.running) {
      this.logger.warn('Coordinator is not running');
      return;
    }

    this.logger.info('Stopping all MCP servers...');
    
    const stopPromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      try {
        if (server.isRunning()) {
          await server.stop();
          this.logger.info(`Stopped ${name} server`);
        }
      } catch (error) {
        this.logger.error(`Failed to stop ${name} server:`, error as Error);
      }
    });

    await Promise.all(stopPromises);
    this.running = false;
    this.logger.info('All MCP servers stopped');
  }

  async startServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server '${name}' not found`);
    }

    if (server.isRunning()) {
      this.logger.warn(`Server '${name}' is already running`);
      return;
    }

    await server.start();
    this.logger.info(`Started ${name} server`);
  }

  async stopServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server '${name}' not found`);
    }

    if (!server.isRunning()) {
      this.logger.warn(`Server '${name}' is not running`);
      return;
    }

    await server.stop();
    this.logger.info(`Stopped ${name} server`);
  }

  getServerStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, server] of this.servers) {
      status[name] = server.isRunning();
    }
    return status;
  }

  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): WebDevMCPConfig {
    return this.config;
  }
}

// CLI functionality
export function createCLI() {
  const coordinator = new WebDevelopmentMCPCoordinator();

  return {
    async start(serverName?: string): Promise<void> {
      if (serverName) {
        await coordinator.startServer(serverName);
      } else {
        await coordinator.startAll();
      }
    },

    async stop(serverName?: string): Promise<void> {
      if (serverName) {
        await coordinator.stopServer(serverName);
      } else {
        await coordinator.stopAll();
      }
    },

    status(): Record<string, boolean> {
      return coordinator.getServerStatus();
    },

    list(): string[] {
      return coordinator.getServerNames();
    },

    coordinator,
  };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = createCLI();
  const args = process.argv.slice(2);
  const command = args[0];
  const serverName = args[1];

  async function main() {
    try {
      switch (command) {
        case 'start':
          await cli.start(serverName);
          if (!serverName) {
            // Keep all servers running
            process.on('SIGINT', async () => {
              console.log('\nShutting down...');
              await cli.stop();
              process.exit(0);
            });
            
            // Keep the process alive
            await new Promise(() => {});
          }
          break;

        case 'stop':
          await cli.stop(serverName);
          break;

        case 'status':
          const status = cli.status();
          console.log('Server Status:');
          for (const [name, running] of Object.entries(status)) {
            console.log(`  ${name}: ${running ? 'RUNNING' : 'STOPPED'}`);
          }
          break;

        case 'list':
          const servers = cli.list();
          console.log('Available Servers:');
          for (const name of servers) {
            console.log(`  - ${name}`);
          }
          break;

        default:
          console.log(`
Web Development MCP Servers

Usage:
  npm start                     # Start all servers
  npm run dev                   # Start in development mode
  node dist/index.js start      # Start all servers
  node dist/index.js start <server>  # Start specific server
  node dist/index.js stop       # Stop all servers
  node dist/index.js stop <server>   # Stop specific server
  node dist/index.js status     # Show server status
  node dist/index.js list       # List available servers

Available servers:
  - github      GitHub API integration
  - playwright  Browser automation
  - context7    Context management
  - memory      Memory and sequential thinking

Environment variables:
  GITHUB_TOKEN                   GitHub API token
  PLAYWRIGHT_HEADLESS           Run browser in headless mode (true/false)
  PLAYWRIGHT_SCREENSHOT_PATH    Screenshot save directory
  CONTEXT7_MAX_ITEMS           Max context items to store
  MEMORY_MAX_SHORT_TERM        Max short-term memory items
          `);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }

  main();
}