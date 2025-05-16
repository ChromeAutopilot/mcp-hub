
CREATE TABLE IF NOT EXISTS "mcpServers" (
  "mcpServerId" TEXT PRIMARY KEY,
  "description" TEXT,
  "command" TEXT NOT NULL DEFAULT 'npx',
  "argsTemplate" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "userMcpServers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "mcpServerId" TEXT NOT NULL REFERENCES "mcpServers" ("mcpServerId") ON DELETE CASCADE,
  "configVars" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION notify_user_mcp_servers_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('userMcpServersChanged', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_mcp_servers_changed ON "userMcpServers";

CREATE TRIGGER user_mcp_servers_changed
AFTER INSERT OR UPDATE OR DELETE ON "userMcpServers"
FOR EACH STATEMENT
EXECUTE FUNCTION notify_user_mcp_servers_changed();
