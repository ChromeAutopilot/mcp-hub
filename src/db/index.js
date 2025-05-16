import pg from 'pg';
import config from '../config.js';

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: {
    require: process.env.NODE_ENV === 'production',
    rejectUnauthorized: false,
  },
});

export const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err.message, text, params);
    throw err;
  }
};

export const initializeDatabase = async () => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await query(schema);
    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database schema:', err.message);
    throw err;
  }
};

export const listenForChanges = async (channel, callback) => {
  const client = new pg.Client({
    connectionString: config.databaseUrl,
    ssl: {
      require: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    
    client.on('notification', (msg) => {
      if (msg.channel === channel) {
        callback(msg.payload);
      }
    });
    
    await client.query(`LISTEN ${channel}`);
    console.log(`Listening for notifications on channel: ${channel}`);
    
    return client;
  } catch (err) {
    console.error(`Failed to listen on channel ${channel}:`, err.message);
    throw err;
  }
};

export const mcpServers = {
  getAll: async () => {
    const result = await query('SELECT * FROM "mcpServers" ORDER BY "mcpServerId"');
    return result.rows;
  },
  
  getById: async (mcpServerId) => {
    const result = await query('SELECT * FROM "mcpServers" WHERE "mcpServerId" = $1', [mcpServerId]);
    return result.rows[0];
  },
  
  create: async (server) => {
    const { mcpServerId, description, command, argsTemplate } = server;
    const result = await query(
      'INSERT INTO "mcpServers" ("mcpServerId", "description", "command", "argsTemplate") VALUES ($1, $2, $3, $4) RETURNING *',
      [mcpServerId, description, command, argsTemplate]
    );
    return result.rows[0];
  },
  
  update: async (mcpServerId, updates) => {
    const { description, command, argsTemplate } = updates;
    const result = await query(
      'UPDATE "mcpServers" SET "description" = $2, "command" = $3, "argsTemplate" = $4, "updatedAt" = NOW() WHERE "mcpServerId" = $1 RETURNING *',
      [mcpServerId, description, command, argsTemplate]
    );
    return result.rows[0];
  },
  
  delete: async (mcpServerId) => {
    const result = await query('DELETE FROM "mcpServers" WHERE "mcpServerId" = $1 RETURNING *', [mcpServerId]);
    return result.rows[0];
  }
};

export const userMcpServers = {
  getAll: async () => {
    const result = await query('SELECT * FROM "userMcpServers" ORDER BY "createdAt" DESC');
    return result.rows;
  },
  
  getByUserId: async (userId) => {
    const result = await query('SELECT * FROM "userMcpServers" WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return result.rows;
  },
  
  getById: async (id) => {
    const result = await query('SELECT * FROM "userMcpServers" WHERE "id" = $1', [id]);
    return result.rows[0];
  },
  
  create: async (userMcpServer) => {
    const { userId, mcpServerId, configVars } = userMcpServer;
    const result = await query(
      'INSERT INTO "userMcpServers" ("userId", "mcpServerId", "configVars") VALUES ($1, $2, $3) RETURNING *',
      [userId, mcpServerId, configVars]
    );
    return result.rows[0];
  },
  
  update: async (id, updates) => {
    const { configVars } = updates;
    const result = await query(
      'UPDATE "userMcpServers" SET "configVars" = $2, "updatedAt" = NOW() WHERE "id" = $1 RETURNING *',
      [id, configVars]
    );
    return result.rows[0];
  },
  
  delete: async (id) => {
    const result = await query('DELETE FROM "userMcpServers" WHERE "id" = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

export default {
  query,
  initializeDatabase,
  listenForChanges,
  mcpServers,
  userMcpServers
};
