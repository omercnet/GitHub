import { MCPTool, ServerConfig } from '../types/index.js';

export class MCPLogger {
  private prefix: string;

  constructor(serverName: string) {
    this.prefix = `[${serverName}]`;
  }

  info(message: string, ...args: any[]): void {
    console.log(`${this.prefix} INFO:`, message, ...args);
  }

  error(message: string, error?: Error): void {
    console.error(`${this.prefix} ERROR:`, message, error?.stack || error);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`${this.prefix} DEBUG:`, message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} WARN:`, message, ...args);
  }
}

export function createToolResponse(
  content: string | Array<{ type: 'text' | 'image' | 'resource'; text?: string; data?: string }>,
  isError = false
) {
  if (typeof content === 'string') {
    return {
      content: [{ type: 'text' as const, text: content }],
      isError,
    };
  }
  return { content, isError };
}

export function validateToolArguments(
  tool: MCPTool,
  args: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = tool.inputSchema.required || [];
  
  // Check required arguments
  for (const field of required) {
    if (!(field in args)) {
      errors.push(`Missing required argument: ${field}`);
    }
  }

  // Check argument types (basic validation)
  const properties = tool.inputSchema.properties;
  for (const [key, value] of Object.entries(args)) {
    if (!(key in properties)) {
      errors.push(`Unknown argument: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeString(input: string): string {
  return input.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#x27;';
      default: return char;
    }
  });
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export function getDefaultServerConfig(): ServerConfig {
  return {
    port: 3000,
    host: 'localhost',
    transport: 'stdio',
    cors: true,
    maxRequestSize: 1024 * 1024, // 1MB
  };
}

export function parseEnvBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

export function parseEnvInt(envValue: string | undefined, defaultValue: number): number {
  if (!envValue) return defaultValue;
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}