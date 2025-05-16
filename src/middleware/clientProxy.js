import axios from 'axios';
import config from '../config.js';

/**
 * Client proxy middleware for forwarding requests from the main app to MCP-Hub
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export const clientProxyMiddleware = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    const mcpServerId = req.params.mcpServerId || req.body.mcpServerId;
    
    if (!mcpServerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing MCP server ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const uniqueServerId = `${mcpServerId}-${userId}`;
    
    const mcpHubUrl = `http://localhost:${process.env.PORT || 3000}/api`;
    
    const requestData = {
      ...req.body,
      server_name: uniqueServerId
    };
    
    const response = await axios.post(`${mcpHubUrl}${req.path}`, requestData, {
      headers: {
        'Authorization': `Bearer ${config.mcpHubSecret}`,
        'Content-Type': 'application/json'
      }
    });
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Client proxy error:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'MCP-Hub Error',
        message: error.response.data.message || 'Error from MCP-Hub',
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'MCP-Hub service is unavailable',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred in the client proxy',
        timestamp: new Date().toISOString()
      });
    }
  }
};

export default clientProxyMiddleware;
