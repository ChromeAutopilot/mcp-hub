import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  port: process.env.PORT || 3000,
  
  databaseUrl: process.env.DATABASE_URL,
  
  mcpHubSecret: process.env.MCP_HUB_SECRET,
  
  configFilePath: process.env.CONFIG_FILE_PATH || path.join(__dirname, '..', 'mcp-servers.json'),
  
  autoShutdown: process.env.AUTO_SHUTDOWN === 'true',
  shutdownDelay: parseInt(process.env.SHUTDOWN_DELAY || '0', 10),
  
  watchConfig: process.env.WATCH_CONFIG === 'true'
};
