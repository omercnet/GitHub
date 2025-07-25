# MCP Tool Call Examples

This directory contains examples of how to call the various MCP tools provided by the web development servers.

## GitHub Server Examples

### Get Repository Information
```json
{
  "tool": "get_repository",
  "arguments": {
    "owner": "microsoft",
    "repo": "vscode"
  }
}
```

### List Issues
```json
{
  "tool": "list_issues",
  "arguments": {
    "owner": "facebook",
    "repo": "react",
    "state": "open",
    "per_page": 10
  }
}
```

### Search Repositories
```json
{
  "tool": "search_repositories",
  "arguments": {
    "q": "machine learning python",
    "sort": "stars",
    "order": "desc",
    "per_page": 5
  }
}
```

## Playwright Server Examples

### Navigate and Take Screenshot
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
    "filename": "example-homepage.png"
  }
}
```

### Fill Form and Submit
```json
{
  "tool": "fill",
  "arguments": {
    "selector": "#search-input",
    "value": "web development"
  }
}
```

```json
{
  "tool": "click",
  "arguments": {
    "selector": "#search-button"
  }
}
```

## Context7 Server Examples

### Add Context Item
```json
{
  "tool": "add_context",
  "arguments": {
    "id": "user_story_login",
    "type": "documentation",
    "content": "As a user, I want to be able to log in with my email and password so that I can access my account.",
    "namespace": "project_alpha",
    "metadata": {
      "priority": "high",
      "epic": "authentication"
    }
  }
}
```

### Search Context
```json
{
  "tool": "search_context",
  "arguments": {
    "query": "authentication login",
    "namespace": "project_alpha",
    "limit": 5
  }
}
```

### Export Context
```json
{
  "tool": "export_context",
  "arguments": {
    "namespace": "project_alpha",
    "format": "markdown",
    "filename": "project_requirements.md"
  }
}
```

## Memory Server Examples

### Start Thinking Process
```json
{
  "tool": "start_thinking_process",
  "arguments": {
    "id": "debug_performance_issue",
    "topic": "Investigate slow page load times in the user dashboard",
    "metadata": {
      "priority": "high",
      "assigned_to": "dev_team"
    }
  }
}
```

### Add Thought Steps
```json
{
  "tool": "add_thought_step",
  "arguments": {
    "processId": "debug_performance_issue",
    "content": "I notice that the dashboard makes 15 API calls on initial load",
    "type": "observation",
    "confidence": 0.9
  }
}
```

```json
{
  "tool": "add_thought_step",
  "arguments": {
    "processId": "debug_performance_issue",
    "content": "The slow performance might be caused by too many sequential API calls",
    "type": "hypothesis",
    "confidence": 0.7,
    "dependencies": ["debug_performance_issue_step_1"]
  }
}
```

### Add to Memory
```json
{
  "tool": "add_to_memory",
  "arguments": {
    "content": "Dashboard performance issue resolved by implementing API call batching",
    "type": "task",
    "memoryType": "long_term",
    "metadata": {
      "resolution": "api_batching",
      "performance_gain": "60%"
    },
    "relevanceScore": 0.9
  }
}
```

### Recall Memory
```json
{
  "tool": "recall_memory",
  "arguments": {
    "query": "performance optimization",
    "memoryType": "all",
    "limit": 10,
    "minRelevance": 0.5
  }
}
```

## Combined Workflow Example

Here's an example of how you might use multiple servers together:

1. **Research Phase**: Use GitHub server to analyze similar projects
2. **Context Building**: Use Context7 to store requirements and findings  
3. **Implementation**: Use Playwright for testing the web interface
4. **Reflection**: Use Memory server to record learnings and decisions

### Step 1: Research
```json
{
  "tool": "search_repositories",
  "arguments": {
    "q": "user authentication webapp",
    "sort": "stars",
    "per_page": 5
  }
}
```

### Step 2: Store Context
```json
{
  "tool": "add_context",
  "arguments": {
    "id": "auth_research_findings",
    "type": "documentation",
    "content": "Found 5 popular authentication libraries: Auth0, Firebase Auth, Passport.js, NextAuth.js, and Supabase Auth",
    "namespace": "auth_project"
  }
}
```

### Step 3: Test Implementation
```json
{
  "tool": "navigate",
  "arguments": {
    "url": "http://localhost:3000/login"
  }
}
```

### Step 4: Record Decision
```json
{
  "tool": "add_to_memory",
  "arguments": {
    "content": "Decided to use NextAuth.js for authentication due to excellent Next.js integration and extensive provider support",
    "type": "task",
    "memoryType": "long_term",
    "relevanceScore": 0.8
  }
}
```