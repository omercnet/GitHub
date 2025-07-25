# Project Structure

This document explains the organization and architecture of the Web Development MCP Servers project.

## Directory Structure

```
web-development-mcp-servers/
├── src/                          # Source code
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # Core types and interfaces
│   ├── utils/                    # Shared utility functions
│   │   └── common.ts            # Common utilities, logging, validation
│   ├── servers/                  # Individual MCP server implementations
│   │   ├── github-mcp-server.ts # GitHub API integration server
│   │   ├── playwright-mcp-server.ts # Browser automation server
│   │   ├── context7-mcp-server.ts   # Context management server
│   │   └── memory-mcp-server.ts     # Memory and thinking server
│   └── index.ts                 # Main coordinator and CLI entry point
├── dist/                        # Compiled JavaScript output
├── examples/                    # Usage examples and configuration
│   ├── configs/                 # Example configuration files
│   │   ├── .env.example        # Environment variables template
│   │   └── mcp-config.json     # JSON configuration example
│   └── usage/                   # Usage examples
│       ├── basic-usage.js      # Programmatic usage example
│       └── tool-examples.md    # MCP tool call examples
├── package.json                # Node.js project configuration
├── tsconfig.json              # TypeScript compiler configuration
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
└── README.md                  # Main documentation
```

## Architecture Overview

### Core Components

1. **Types System** (`src/types/index.ts`)
   - Defines interfaces for MCP servers, tools, resources
   - Configuration types for each server
   - Memory and context data structures

2. **Utility Layer** (`src/utils/common.ts`)
   - Shared logging functionality
   - Validation helpers
   - Error handling utilities
   - Environment variable parsing

3. **Individual Servers** (`src/servers/`)
   - Each server implements the `MCPServer` interface
   - Independent operation with specific tool sets
   - State management and persistence
   - Error handling and logging

4. **Coordinator** (`src/index.ts`)
   - Manages multiple MCP servers
   - Provides unified CLI interface
   - Configuration management
   - Server lifecycle control

### MCP Server Pattern

Each MCP server follows a consistent pattern:

```typescript
class XMCPServer implements MCPServer {
  // Server metadata
  public readonly name: string;
  public readonly version: string;
  public readonly protocol: string;
  
  // Core lifecycle methods
  async start(): Promise<void>
  async stop(): Promise<void>
  isRunning(): boolean
  
  // MCP protocol implementation
  private setupToolHandlers(): void
  private setupResourceHandlers(): void
  private getTools(): MCPTool[]
}
```

### Tool Implementation Pattern

Each tool follows this structure:

1. **Tool Definition**: Describes the tool's name, description, and input schema
2. **Argument Validation**: Validates input arguments against the schema
3. **Implementation**: Executes the tool's functionality
4. **Response Formatting**: Returns results in MCP-compatible format
5. **Error Handling**: Catches and formats errors appropriately

### Configuration System

The system supports multiple configuration methods:

1. **Environment Variables**: For sensitive data and deployment settings
2. **JSON Configuration**: For structured configuration data
3. **Programmatic Configuration**: For embedding in other applications

## Key Design Decisions

### Modularity
- Each MCP server is independent and can run standalone
- Shared utilities reduce code duplication
- Clear separation of concerns

### Type Safety
- Comprehensive TypeScript types
- Runtime validation for tool arguments
- Strong typing for configuration objects

### Error Handling
- Consistent error reporting across all servers
- Graceful degradation when external services fail
- Detailed logging for debugging

### Extensibility
- Easy to add new MCP servers
- Tool definitions are declarative
- Configuration system is flexible

## Adding New MCP Servers

To add a new MCP server:

1. **Create Server Class**: Implement the `MCPServer` interface
2. **Define Tools**: Create tool definitions with schemas
3. **Implement Handlers**: Add tool and resource handlers
4. **Add to Coordinator**: Register the server in the main coordinator
5. **Update Configuration**: Add configuration types and environment variables
6. **Document Usage**: Add examples and documentation

Example structure:

```typescript
// src/servers/new-mcp-server.ts
export class NewMCPServer implements MCPServer {
  public readonly name = 'new-mcp-server';
  public readonly version = '1.0.0';
  public readonly protocol = 'mcp/1.0';
  
  constructor(config: NewServerConfig) {
    // Initialize server
  }
  
  private getTools(): MCPTool[] {
    return [
      {
        name: 'new_tool',
        description: 'Description of the tool',
        inputSchema: {
          type: 'object',
          properties: {
            // Tool parameters
          },
          required: ['param1']
        }
      }
    ];
  }
  
  // Implement other required methods...
}
```

## Testing Strategy

While not implemented in this version, the recommended testing approach:

1. **Unit Tests**: Test individual tool implementations
2. **Integration Tests**: Test server startup/shutdown
3. **End-to-End Tests**: Test complete workflows
4. **Mock External Services**: Use mocks for GitHub API, browsers, etc.

## Security Considerations

1. **API Tokens**: Store securely in environment variables
2. **Input Validation**: All tool arguments are validated
3. **File System Access**: Limited to configured directories
4. **Browser Security**: Playwright runs in sandboxed environments
5. **Memory Storage**: Local file system with configurable paths

## Performance Considerations

1. **Memory Management**: Automatic cleanup of old context/memory items
2. **Resource Limits**: Configurable limits for stored items
3. **Async Operations**: Non-blocking I/O for all external calls
4. **Connection Pooling**: Reuse of GitHub API connections
5. **Browser Efficiency**: Single browser instance per Playwright server

## Future Enhancements

Potential areas for expansion:

1. **Database Storage**: Replace file-based storage with databases
2. **Clustering**: Support for running multiple server instances
3. **Metrics**: Add performance and usage metrics
4. **Authentication**: Add user authentication and authorization
5. **WebUI**: Web-based interface for management
6. **Plugin System**: Dynamic loading of custom MCP servers