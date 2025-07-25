# Web Development MCP Servers

A comprehensive collection of Model Context Protocol (MCP) servers designed specifically for web development workflows. This package provides AI-powered tools for GitHub integration, browser automation, context management, and memory-based sequential thinking.

## Features

### 🐙 GitHub MCP Server
- Repository management and exploration
- Issue and pull request handling
- File content retrieval and searching
- Repository search capabilities
- Comprehensive GitHub API integration

### 🎭 Playwright MCP Server
- Browser automation and testing
- Screenshot capture
- Web page interaction (clicking, filling forms, navigation)
- JavaScript execution in browser context
- Element waiting and selection

### 🧠 Context7 MCP Server
- Advanced context management system
- Multi-namespace context organization
- Semantic search capabilities
- Context import/export in multiple formats
- Relevance scoring and filtering

### 💭 Memory Sequential Thinking Server
- Sequential thinking process management
- Memory consolidation (short-term to long-term)
- Thought pattern analysis
- Memory connection discovery
- Automated forgetting algorithms

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Start All Servers
```bash
npm start
```

### Start Individual Servers
```bash
# GitHub server only
npm run github-server

# Playwright server only
npm run playwright-server

# Context7 server only
npm run context7-server

# Memory server only
npm run memory-server
```

### Development Mode
```bash
npm run dev
```

## Configuration

### Environment Variables

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_API_BASE_URL=https://api.github.com

# Playwright Configuration
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_VIEWPORT_WIDTH=1280
PLAYWRIGHT_VIEWPORT_HEIGHT=720
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_SCREENSHOT_PATH=./screenshots

# Context7 Configuration
CONTEXT7_MAX_ITEMS=1000
CONTEXT7_STORAGE_PATH=./context_storage
CONTEXT7_RELEVANCE_THRESHOLD=0.5
CONTEXT7_SEMANTIC_SEARCH=false

# Memory Configuration
MEMORY_MAX_SHORT_TERM=100
MEMORY_MAX_LONG_TERM=1000
MEMORY_MAX_WORKING=20
MEMORY_STORAGE_PATH=./memory_storage
MEMORY_CONSOLIDATE_THRESHOLD=0.7
MEMORY_FORGET_DAYS=30
```

## Usage Examples

### GitHub Server Tools

```json
{
  "tool": "get_repository",
  "arguments": {
    "owner": "microsoft",
    "repo": "vscode"
  }
}
```

```json
{
  "tool": "create_issue",
  "arguments": {
    "owner": "myorg",
    "repo": "myrepo",
    "title": "Bug: Application crashes on startup",
    "body": "Detailed description of the bug...",
    "labels": ["bug", "high-priority"]
  }
}
```

### Playwright Server Tools

```json
{
  "tool": "navigate",
  "arguments": {
    "url": "https://example.com",
    "waitUntil": "networkidle"
  }
}
```

```json
{
  "tool": "screenshot",
  "arguments": {
    "fullPage": true,
    "filename": "homepage.png"
  }
}
```

### Context7 Server Tools

```json
{
  "tool": "add_context",
  "arguments": {
    "id": "user_story_1",
    "type": "documentation",
    "content": "As a user, I want to be able to save my work...",
    "namespace": "project_alpha"
  }
}
```

```json
{
  "tool": "search_context",
  "arguments": {
    "query": "authentication",
    "namespace": "project_alpha",
    "limit": 5
  }
}
```

### Memory Server Tools

```json
{
  "tool": "start_thinking_process",
  "arguments": {
    "id": "solve_bug_123",
    "topic": "Investigate memory leak in user authentication"
  }
}
```

```json
{
  "tool": "add_thought_step",
  "arguments": {
    "processId": "solve_bug_123",
    "content": "I notice the token cache is not being cleared on logout",
    "type": "observation",
    "confidence": 0.8
  }
}
```

## API Reference

### GitHub MCP Server

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `get_repository` | Get repository info | `owner`, `repo` | - |
| `list_issues` | List repository issues | `owner`, `repo` | `state`, `labels`, `per_page` |
| `create_issue` | Create new issue | `owner`, `repo`, `title` | `body`, `labels`, `assignees` |
| `get_pull_requests` | List pull requests | `owner`, `repo` | `state`, `per_page` |
| `get_file_content` | Get file content | `owner`, `repo`, `path` | `ref` |
| `search_repositories` | Search repositories | `q` | `sort`, `order`, `per_page` |

### Playwright MCP Server

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `navigate` | Navigate to URL | `url` | `waitUntil` |
| `click` | Click element | `selector` | `timeout` |
| `fill` | Fill input field | `selector`, `value` | `timeout` |
| `get_text` | Get element text | `selector` | `timeout` |
| `screenshot` | Take screenshot | - | `selector`, `fullPage`, `filename` |
| `wait_for_element` | Wait for element | `selector` | `state`, `timeout` |
| `evaluate_javascript` | Execute JS | `script` | `args` |
| `press_key` | Press keyboard key | `key` | `selector` |

### Context7 MCP Server

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `add_context` | Add context item | `id`, `type`, `content` | `metadata`, `namespace` |
| `get_context` | Get context items | - | `id`, `type`, `namespace`, `limit` |
| `search_context` | Search contexts | `query` | `type`, `namespace`, `limit` |
| `update_context` | Update context | `id` | `content`, `metadata`, `relevanceScore` |
| `delete_context` | Delete context | `id` | `namespace` |
| `export_context` | Export to file | - | `namespace`, `format`, `filename` |

### Memory MCP Server

| Tool | Description | Required Args | Optional Args |
|------|-------------|---------------|---------------|
| `start_thinking_process` | Start thinking | `id`, `topic` | `metadata` |
| `add_thought_step` | Add thought step | `processId`, `content`, `type` | `confidence`, `dependencies` |
| `complete_thinking_process` | Complete thinking | `processId` | `conclusion` |
| `add_to_memory` | Add to memory | `content`, `type`, `memoryType` | `metadata`, `relevanceScore` |
| `recall_memory` | Recall memories | `query` | `memoryType`, `limit`, `minRelevance` |
| `consolidate_memory` | Consolidate memory | - | `threshold` |

## Development

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## Architecture

The system is built with a modular architecture:

- **Base Types**: Common interfaces and types used across all servers
- **Utility Functions**: Shared functionality for logging, validation, and error handling
- **Individual Servers**: Each MCP server is independent and can run standalone
- **Coordinator**: Manages multiple servers and provides unified control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue in the GitHub repository.