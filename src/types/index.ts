import { z } from 'zod';

// Base MCP types
export interface MCPServer {
  name: string;
  version: string;
  protocol: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// Tool definitions
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

// Resource definitions
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export type MCPResource = z.infer<typeof MCPResourceSchema>;

// Tool call and response types
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    resource?: MCPResource;
  }>;
  isError?: boolean;
}

// Server configuration types
export interface ServerConfig {
  port?: number;
  host?: string;
  transport?: 'stdio' | 'http' | 'websocket';
  cors?: boolean;
  maxRequestSize?: number;
}

// Context and memory types
export interface ContextItem {
  id: string;
  type: 'file' | 'code' | 'documentation' | 'conversation' | 'task';
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  relevanceScore?: number;
}

export interface MemoryState {
  shortTerm: ContextItem[];
  longTerm: ContextItem[];
  workingMemory: ContextItem[];
  contextHistory: ContextItem[];
}

// GitHub specific types
export interface GitHubConfig {
  token?: string;
  owner?: string;
  repo?: string;
  baseUrl?: string;
}

// Playwright specific types
export interface PlaywrightConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
  screenshotPath?: string;
}