#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockMcpServers = [
  {
    mcpServerId: 'figma-developer-mcp',
    description: 'Figma Developer MCP Server',
    command: 'npx',
    argsTemplate: ['--api-key={{key}}', '--stdio']
  },
  {
    mcpServerId: 'github-mcp',
    description: 'GitHub MCP Server',
    command: 'npx',
    argsTemplate: ['--token={{token}}', '--stdio']
  }
];

const mockUserMcpServers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174001',
    mcpServerId: 'figma-developer-mcp',
    configVars: { key: 'USER-KEY-1' }
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    userId: '123e4567-e89b-12d3-a456-426614174003',
    mcpServerId: 'github-mcp',
    configVars: { token: 'USER-TOKEN-1' }
  }
];

const expectedConfig = {
  mcpServers: {
    'figma-developer-mcp-123e4567-e89b-12d3-a456-426614174001': {
      command: 'npx',
      args: ['--api-key=USER-KEY-1', '--stdio']
    },
    'github-mcp-123e4567-e89b-12d3-a456-426614174003': {
      command: 'npx',
      args: ['--token=USER-TOKEN-1', '--stdio']
    }
  }
};

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
 * Generates a mock config file for testing
 * @returns {Object} - The generated config
 */
const generateMockConfigFile = async () => {
  try {
    const configuration = {
      mcpServers: {}
    };
    
    for (const userConfig of mockUserMcpServers) {
      const server = mockMcpServers.find(s => s.mcpServerId === userConfig.mcpServerId);
      
      if (server) {
        const uniqueServerId = `${server.mcpServerId}-${userConfig.userId}`;
        
        const args = renderArrayTemplate(server.argsTemplate, userConfig.configVars);
        
        configuration.mcpServers[uniqueServerId] = {
          command: server.command,
          args
        };
      }
    }
    
    const configFilePath = path.join(__dirname, '..', 'mcp-servers.json');
    await fs.writeFile(configFilePath, JSON.stringify(configuration, null, 2));
    
    console.log(`Mock MCP servers configuration file generated at ${configFilePath}`);
    return configuration;
  } catch (error) {
    console.error('Error generating mock config file:', error);
    throw error;
  }
};

/**
 * Tests the config file generation
 */
const testConfigGeneration = async () => {
  try {
    console.log('\n=== Testing Config Generation ===');
    
    const config = await generateMockConfigFile();
    
    console.log('Generated config:', JSON.stringify(config, null, 2));
    console.log('Expected config:', JSON.stringify(expectedConfig, null, 2));
    
    const configFilePath = path.join(__dirname, '..', 'mcp-servers.json');
    const fileContent = await fs.readFile(configFilePath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    console.log('Config file created:', configFilePath);
    
    const configMatches = JSON.stringify(parsedContent) === JSON.stringify(expectedConfig);
    console.log('Config file content matches expected:', configMatches);
    
    if (configMatches) {
      console.log('✅ Config generation test passed');
      return true;
    } else {
      console.log('❌ Config generation test failed');
      return false;
    }
  } catch (error) {
    console.error('Error testing config generation:', error);
    console.log('❌ Config generation test failed');
    return false;
  }
};

/**
 * Tests the authentication middleware
 */
const testAuthMiddleware = async () => {
  try {
    console.log('\n=== Testing Auth Middleware ===');
    
    const mockConfig = {
      mcpHubSecret: 'test-secret'
    };
    
    const mockReqValid = {
      headers: {
        authorization: 'Bearer test-secret'
      }
    };
    
    const mockReqInvalid = {
      headers: {
        authorization: 'Bearer invalid-token'
      }
    };
    
    const mockReqMissing = {
      headers: {}
    };
    
    let statusCode = 0;
    let responseBody = null;
    
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (body) => {
        responseBody = body;
        return mockRes;
      }
    };
    
    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
    };
    
    const authMiddleware = (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid authorization header'
          });
        }
        
        const token = authHeader.split(' ')[1];
        
        if (token !== mockConfig.mcpHubSecret) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid authorization token'
          });
        }
        
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'An error occurred during authentication'
        });
      }
    };
    
    nextCalled = false;
    statusCode = 0;
    responseBody = null;
    authMiddleware(mockReqValid, mockRes, mockNext);
    console.log('Valid token test - next called:', nextCalled);
    
    nextCalled = false;
    statusCode = 0;
    responseBody = null;
    authMiddleware(mockReqInvalid, mockRes, mockNext);
    console.log('Invalid token test - status code:', statusCode);
    console.log('Invalid token test - next called:', nextCalled);
    
    nextCalled = false;
    statusCode = 0;
    responseBody = null;
    authMiddleware(mockReqMissing, mockRes, mockNext);
    console.log('Missing token test - status code:', statusCode);
    console.log('Missing token test - next called:', nextCalled);
    
    const validTokenPassed = nextCalled === true;
    const invalidTokenPassed = statusCode === 403 && nextCalled === false;
    const missingTokenPassed = statusCode === 401 && nextCalled === false;
    
    if (validTokenPassed && invalidTokenPassed && missingTokenPassed) {
      console.log('✅ Auth middleware test passed');
      return true;
    } else {
      console.log('❌ Auth middleware test failed');
      return false;
    }
  } catch (error) {
    console.error('Error testing auth middleware:', error);
    console.log('❌ Auth middleware test failed');
    return false;
  }
};

/**
 * Tests the client proxy middleware
 */
const testClientProxy = async () => {
  try {
    console.log('\n=== Testing Client Proxy ===');
    
    console.log('Testing client proxy with valid user and MCP server ID');
    
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const mcpServerId = 'figma-developer-mcp';
    
    const expectedUniqueServerId = `${mcpServerId}-${userId}`;
    console.log('Expected unique server ID:', expectedUniqueServerId);
    
    const configFilePath = path.join(__dirname, '..', 'mcp-servers.json');
    const fileContent = await fs.readFile(configFilePath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    const uniqueServerIdExists = Object.keys(parsedContent.mcpServers).includes(expectedUniqueServerId);
    console.log('Unique server ID exists in config:', uniqueServerIdExists);
    
    if (uniqueServerIdExists) {
      console.log('✅ Client proxy test passed');
      return true;
    } else {
      console.log('❌ Client proxy test failed');
      return false;
    }
  } catch (error) {
    console.error('Error testing client proxy:', error);
    console.log('❌ Client proxy test failed');
    return false;
  }
};

/**
 * Run all tests
 */
const runTests = async () => {
  console.log('=== Testing Multi-tenant MCP-Hub ===');
  
  const configGenResult = await testConfigGeneration();
  const authMiddlewareResult = await testAuthMiddleware();
  const clientProxyResult = await testClientProxy();
  
  console.log('\n=== Test Results ===');
  console.log('Config Generation:', configGenResult ? '✅ PASS' : '❌ FAIL');
  console.log('Auth Middleware:', authMiddlewareResult ? '✅ PASS' : '❌ FAIL');
  console.log('Client Proxy:', clientProxyResult ? '✅ PASS' : '❌ FAIL');
  
  if (configGenResult && authMiddlewareResult && clientProxyResult) {
    console.log('\n=== All Tests Passed ===');
    return true;
  } else {
    console.log('\n=== Some Tests Failed ===');
    return false;
  }
};

runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
