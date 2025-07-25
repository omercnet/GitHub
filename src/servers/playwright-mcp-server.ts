import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { MCPServer, MCPTool, PlaywrightConfig } from '../types/index.js';
import { MCPLogger, createToolResponse, validateToolArguments, formatError, withTimeout } from '../utils/common.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class PlaywrightMCPServer implements MCPServer {
  public readonly name = 'playwright-mcp-server';
  public readonly version = '1.0.0';
  public readonly protocol = 'mcp/1.0';
  
  private server: Server;
  private logger: MCPLogger;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: PlaywrightConfig;
  private running = false;
  private screenshotCounter = 0;

  constructor(config: PlaywrightConfig = {}) {
    this.config = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
      screenshotPath: './screenshots',
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
        name: 'navigate',
        description: 'Navigate to a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
            waitUntil: { 
              type: 'string', 
              enum: ['load', 'domcontentloaded', 'networkidle'],
              description: 'When to consider navigation complete' 
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or text content' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['selector'],
        },
      },
      {
        name: 'fill',
        description: 'Fill an input field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            value: { type: 'string', description: 'Value to fill' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['selector', 'value'],
        },
      },
      {
        name: 'get_text',
        description: 'Get text content from an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['selector'],
        },
      },
      {
        name: 'get_page_title',
        description: 'Get the current page title',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_page_url',
        description: 'Get the current page URL',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector to screenshot specific element' },
            fullPage: { type: 'boolean', description: 'Take full page screenshot' },
            filename: { type: 'string', description: 'Custom filename for screenshot' },
          },
        },
      },
      {
        name: 'wait_for_element',
        description: 'Wait for an element to appear',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            state: { 
              type: 'string', 
              enum: ['attached', 'detached', 'visible', 'hidden'],
              description: 'Element state to wait for' 
            },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['selector'],
        },
      },
      {
        name: 'evaluate_javascript',
        description: 'Execute JavaScript in the page context',
        inputSchema: {
          type: 'object',
          properties: {
            script: { type: 'string', description: 'JavaScript code to execute' },
            args: { type: 'array', description: 'Arguments to pass to the script' },
          },
          required: ['script'],
        },
      },
      {
        name: 'get_page_source',
        description: 'Get the HTML source of the current page',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'press_key',
        description: 'Press a keyboard key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to press (e.g., "Enter", "Tab", "Escape")' },
            selector: { type: 'string', description: 'CSS selector to focus first (optional)' },
          },
          required: ['key'],
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
        await this.ensureBrowserStarted();
        
        switch (name) {
          case 'navigate':
            return await this.navigate(toolArgs.url as string, toolArgs.waitUntil as string);
          case 'click':
            return await this.click(toolArgs.selector as string, toolArgs.timeout as number);
          case 'fill':
            return await this.fill(toolArgs.selector as string, toolArgs.value as string, toolArgs.timeout as number);
          case 'get_text':
            return await this.getText(toolArgs.selector as string, toolArgs.timeout as number);
          case 'get_page_title':
            return await this.getPageTitle();
          case 'get_page_url':
            return await this.getPageUrl();
          case 'screenshot':
            return await this.screenshot(toolArgs.selector as string, toolArgs.fullPage as boolean, toolArgs.filename as string);
          case 'wait_for_element':
            return await this.waitForElement(toolArgs.selector as string, toolArgs.state as string, toolArgs.timeout as number);
          case 'evaluate_javascript':
            return await this.evaluateJavaScript(toolArgs.script as string, toolArgs.args as any[]);
          case 'get_page_source':
            return await this.getPageSource();
          case 'press_key':
            return await this.pressKey(toolArgs.key as string, toolArgs.selector as string);
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
          uri: 'playwright://screenshots',
          name: 'Screenshots',
          description: 'Browser screenshots',
          mimeType: 'image/png',
        },
        {
          uri: 'playwright://page-source',
          name: 'Page Source',
          description: 'Current page HTML source',
          mimeType: 'text/html',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (uri === 'playwright://page-source') {
        await this.ensureBrowserStarted();
        const source = await this.page!.content();
        return {
          contents: [
            {
              uri,
              mimeType: 'text/html',
              text: source,
            },
          ],
        };
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async ensureBrowserStarted(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: this.config.headless,
        timeout: this.config.timeout 
      });
    }
    
    if (!this.context) {
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
      });
    }
    
    if (!this.page) {
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout || 30000);
    }
  }

  private async navigate(url: string, waitUntil?: string) {
    const page = this.page!;
    await page.goto(url, { waitUntil: waitUntil as any });
    return createToolResponse(`Navigated to: ${url}`);
  }

  private async click(selector: string, timeout?: number) {
    const page = this.page!;
    await page.click(selector, { timeout });
    return createToolResponse(`Clicked element: ${selector}`);
  }

  private async fill(selector: string, value: string, timeout?: number) {
    const page = this.page!;
    await page.fill(selector, value, { timeout });
    return createToolResponse(`Filled ${selector} with: ${value}`);
  }

  private async getText(selector: string, timeout?: number) {
    const page = this.page!;
    const text = await page.textContent(selector, { timeout });
    return createToolResponse(text || '');
  }

  private async getPageTitle() {
    const page = this.page!;
    const title = await page.title();
    return createToolResponse(title);
  }

  private async getPageUrl() {
    const page = this.page!;
    const url = page.url();
    return createToolResponse(url);
  }

  private async screenshot(selector?: string, fullPage = false, filename?: string) {
    const page = this.page!;
    
    if (!filename) {
      this.screenshotCounter++;
      filename = `screenshot-${Date.now()}-${this.screenshotCounter}.png`;
    }
    
    const screenshotPath = join(this.config.screenshotPath!, filename);
    
    // Ensure screenshot directory exists
    await mkdir(this.config.screenshotPath!, { recursive: true });
    
    if (selector) {
      const element = await page.locator(selector);
      await element.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage });
    }
    
    return createToolResponse(`Screenshot saved: ${screenshotPath}`);
  }

  private async waitForElement(selector: string, state = 'visible', timeout?: number) {
    const page = this.page!;
    await page.waitForSelector(selector, { state: state as any, timeout });
    return createToolResponse(`Element ${selector} is ${state}`);
  }

  private async evaluateJavaScript(script: string, args?: any[]) {
    const page = this.page!;
    // Create a safe function wrapper for the script
    const scriptFunction = `(function(...args) { ${script} })`;
    const result = await page.evaluate(scriptFunction, ...(args || []));
    return createToolResponse(JSON.stringify(result, null, 2));
  }

  private async getPageSource() {
    const page = this.page!;
    const source = await page.content();
    return createToolResponse(source);
  }

  private async pressKey(key: string, selector?: string) {
    const page = this.page!;
    
    if (selector) {
      await page.focus(selector);
    }
    
    await page.keyboard.press(key);
    return createToolResponse(`Pressed key: ${key}`);
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Server is already running');
      return;
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.running = true;
    this.logger.info('Playwright MCP Server started');
  }

  async stop(): Promise<void> {
    if (!this.running) {
      this.logger.warn('Server is not running');
      return;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    await this.server.close();
    this.running = false;
    this.logger.info('Playwright MCP Server stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PlaywrightMCPServer();
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  server.start().catch(console.error);
}