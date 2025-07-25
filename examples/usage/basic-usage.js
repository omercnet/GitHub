#!/usr/bin/env node

// Example usage of the Web Development MCP Servers
// This demonstrates how to use the servers programmatically

import { WebDevelopmentMCPCoordinator } from '../../dist/index.js';

async function exampleUsage() {
  // Create coordinator with custom config
  const coordinator = new WebDevelopmentMCPCoordinator({
    github: {
      token: process.env.GITHUB_TOKEN || 'your_token_here',
    },
    playwright: {
      headless: true,
      screenshotPath: './example_screenshots',
    },
    context7: {
      maxContextItems: 500,
      contextStoragePath: './example_context',
    },
    memory: {
      maxShortTermItems: 50,
      memoryStoragePath: './example_memory',
    },
  });

  try {
    // Start all servers
    console.log('Starting MCP servers...');
    await coordinator.startAll();
    
    // Check status
    console.log('Server status:', coordinator.getServerStatus());
    
    // Example: Start individual servers
    // await coordinator.startServer('github');
    // await coordinator.startServer('playwright');
    
    console.log('All servers started successfully!');
    console.log('Available servers:', coordinator.getServerNames());
    
    // Keep running for demonstration
    console.log('Servers are running. Press Ctrl+C to stop...');
    
    // Wait for interrupt
    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('Stopping servers...');
    await coordinator.stopAll();
    console.log('All servers stopped.');
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}