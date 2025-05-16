import { listenForChanges } from '../db/index.js';
import { generateConfigFile } from './configGenerator.js';
import config from '../config.js';

/**
 * Initializes the configuration synchronization process
 * - Generates the initial configuration file
 * - Sets up a listener for database changes
 * - Regenerates the configuration file when changes occur
 * @returns {Promise<Object>} - The database client for the listener
 */
export const initConfigSync = async () => {
  try {
    console.log('Generating initial MCP servers configuration file...');
    await generateConfigFile();
    
    console.log('Setting up database change listener...');
    const client = await listenForChanges('userMcpServersChanged', async () => {
      console.log('Received notification of userMcpServers change, regenerating configuration file...');
      await generateConfigFile();
    });
    
    console.log('Configuration synchronization initialized successfully');
    return client;
  } catch (error) {
    console.error('Error initializing configuration synchronization:', error);
    throw error;
  }
};

/**
 * Stops the configuration synchronization process
 * @param {Object} client - The database client for the listener
 * @returns {Promise<void>}
 */
export const stopConfigSync = async (client) => {
  if (client) {
    try {
      await client.end();
      console.log('Configuration synchronization stopped');
    } catch (error) {
      console.error('Error stopping configuration synchronization:', error);
    }
  }
};

export default {
  initConfigSync,
  stopConfigSync
};
