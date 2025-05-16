import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import { mcpServers, userMcpServers } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Renders a template string with variables
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Object containing variable values
 * @returns {string} - Rendered string
 */
const renderTemplate = (template, variables) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
};

/**
 * Renders an array of template strings with variables
 * @param {Array} templates - Array of template strings
 * @param {Object} variables - Object containing variable values
 * @returns {Array} - Array of rendered strings
 */
const renderArrayTemplate = (templates, variables) => {
  return templates.map(template => {
    if (typeof template === 'string') {
      return renderTemplate(template, variables);
    }
    return template;
  });
};

/**
 * Generates the MCP servers configuration file
 * @returns {Promise<void>}
 */
export const generateConfigFile = async () => {
  try {
    const servers = await mcpServers.getAll();
    const userConfigs = await userMcpServers.getAll();
    
    const configuration = {
      mcpServers: {}
    };
    
    for (const userConfig of userConfigs) {
      const server = servers.find(s => s.mcpServerId === userConfig.mcpServerId);
      
      if (server) {
        const uniqueServerId = `${server.mcpServerId}-${userConfig.userId}`;
        
        const args = renderArrayTemplate(server.argsTemplate, userConfig.configVars);
        
        configuration.mcpServers[uniqueServerId] = {
          command: server.command,
          args
        };
      }
    }
    
    const configFilePath = config.configFilePath;
    await fs.writeFile(configFilePath, JSON.stringify(configuration, null, 2));
    
    console.log(`MCP servers configuration file generated at ${configFilePath}`);
    return configuration;
  } catch (error) {
    console.error('Error generating MCP servers configuration file:', error);
    throw error;
  }
};

export default {
  generateConfigFile,
  renderTemplate,
  renderArrayTemplate
};
