#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { initializeDatabase, listenForChanges } from './db/index.js';
import { generateConfigFile } from './services/configGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mcpHubProcess = null;
let configSyncClient = null;

/**
 * Starts the MCP-Hub process
 * @returns {Promise<void>}
 */
const startMcpHub = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting MCP-Hub...');
      
      const configFilePath = path.join(__dirname, '..', 'mcp-servers.json');
      const args = [
        'mcp-hub',
        '--config', configFilePath,
        '--port', process.env.PORT || '3000',
        '--watch'
      ];
      
      mcpHubProcess = spawn('npx', args, {
        stdio: 'inherit',
        shell: true
      });
      
      mcpHubProcess.on('error', (error) => {
        console.error('Failed to start MCP-Hub process:', error);
        reject(error);
      });
      
      mcpHubProcess.on('exit', (code, signal) => {
        if (code !== 0) {
          console.error(`MCP-Hub process exited with code ${code} and signal ${signal}`);
        } else {
          console.log('MCP-Hub process exited successfully');
        }
        mcpHubProcess = null;
      });
      
      setTimeout(() => {
        if (mcpHubProcess) {
          console.log('MCP-Hub started successfully');
          resolve();
        } else {
          reject(new Error('MCP-Hub process failed to start'));
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting MCP-Hub:', error);
      reject(error);
    }
  });
};

/**
 * Stops the MCP-Hub process
 * @returns {Promise<void>}
 */
const stopMcpHub = () => {
  return new Promise((resolve) => {
    if (mcpHubProcess) {
      console.log('Stopping MCP-Hub...');
      
      const forceKillTimeout = setTimeout(() => {
        if (mcpHubProcess) {
          console.log('Force killing MCP-Hub process...');
          mcpHubProcess.kill('SIGKILL');
        }
      }, 5000);
      
      mcpHubProcess.on('exit', () => {
        clearTimeout(forceKillTimeout);
        mcpHubProcess = null;
        console.log('MCP-Hub stopped successfully');
        resolve();
      });
      
      mcpHubProcess.kill('SIGTERM');
    } else {
      console.log('No MCP-Hub process to stop');
      resolve();
    }
  });
};

/**
 * Sets up the Postgres LISTEN/NOTIFY mechanism
 * @returns {Promise<Object>} - The database client for the listener
 */
const setupDatabaseListener = async () => {
  try {
    console.log('Setting up database change listener...');
    
    await generateConfigFile();
    
    const client = await listenForChanges('userMcpServersChanged', async () => {
      console.log('Received notification of userMcpServers change, regenerating configuration file...');
      await generateConfigFile();
    });
    
    console.log('Database listener set up successfully');
    return client;
  } catch (error) {
    console.error('Error setting up database listener:', error);
    throw error;
  }
};

/**
 * Stops the database listener
 * @param {Object} client - The database client for the listener
 * @returns {Promise<void>}
 */
const stopDatabaseListener = async (client) => {
  if (client) {
    try {
      await client.end();
      console.log('Database listener stopped');
    } catch (error) {
      console.error('Error stopping database listener:', error);
    }
  }
};

/**
 * Main function to start the application
 */
const main = async () => {
  try {
    console.log('Starting Multi-tenant MCP-Hub...');
    
    console.log('Initializing database schema...');
    await initializeDatabase();
    
    console.log('Setting up database listener...');
    configSyncClient = await setupDatabaseListener();
    
    await startMcpHub();
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down...');
      await stopMcpHub();
      await stopDatabaseListener(configSyncClient);
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down...');
      await stopMcpHub();
      await stopDatabaseListener(configSyncClient);
      process.exit(0);
    });
    
    console.log(`Multi-tenant MCP-Hub running on port ${process.env.PORT || '3000'}`);
  } catch (error) {
    console.error('Failed to start Multi-tenant MCP-Hub:', error);
    await stopDatabaseListener(configSyncClient);
    process.exit(1);
  }
};

main();
