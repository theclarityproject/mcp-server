#!/usr/bin/env node
// Reverted imports: Removed express, cors. Added back StdioServerTransport.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  // Removed unused types
} from '@modelcontextprotocol/sdk/types.js';
// Removed crypto import as hashing/validation moved

// --- Environment Variables ---
const NEXTJS_APP_URL = 'https://gigahard.org/'
const GIGHARD_API_KEY = process.env.GIGAHARD_API_KEY; // API Key for authenticating with the Next.js backend

if (!NEXTJS_APP_URL || !GIGHARD_API_KEY) {
  // console.error('[MCP-SERVER] Missing NEXTJS_APP_URL or GIGHARD_API_KEY environment variables.'); // Removed log
  process.exit(1);
}

// Removed MCP_SERVER_PORT as it's not needed for stdio

// --- Types ---
// No specific types needed here anymore

// --- Helper Functions ---
// Removed hashApiKey and validateApiKey

// --- MCP Server Implementation ---

class GigahardMcpServer {
  private server: Server;
  // Removed SSE transports store

  constructor() {
    this.server = new Server(
      {
        name: 'gigahard-mcp-server',
        version: '0.1.0',
        description: 'Smuggle your HAR requests and turn them into MCP-usable tools',
      },
      {
        capabilities: {
          resources: {},
          tools: {}, // Tools are dynamically listed by the Next.js backend
        },
      }
    );

    this.setupRequestHandlers();

    // Error handling
    this.server.onerror = (error) => {}; // Removed log, keep handler structure if needed
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers() {
    // --- List Tools Handler ---
    this.server.setRequestHandler(ListToolsRequestSchema, async (request, context) => {
      // No longer need to check incoming API key from context
      // console.log(`[MCP-SERVER] ListTools request received. Forwarding to Next.js backend.`); // Removed log

      // Forward the request to the Next.js backend
      const listToolsUrl = `${NEXTJS_APP_URL}/api/mcp/list-tools`;
      // console.log(`[MCP-SERVER] Forwarding ListTools request to: ${listToolsUrl}`); // Removed log

      try {
        const response = await fetch(listToolsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Use the API key from the environment variable
            'X-MCP-API-Key': GIGHARD_API_KEY!,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          // console.error(`[MCP-SERVER] Error from Next.js /list-tools (${response.status}): ${errorBody}`); // Removed log
          throw new McpError(ErrorCode.InternalError, `Backend error: ${response.statusText} - ${errorBody}`);
        }

        const responseData = await response.json();
        // console.log(`[MCP-SERVER] Received ${responseData.tools?.length ?? 0} tools from Next.js backend.`); // Removed log
        return responseData; // Forward the response directly

      } catch (error: any) {
        // console.error(`[MCP-SERVER] Failed to forward ListTools request to Next.js:`, error); // Removed log
        throw new McpError(ErrorCode.InternalError, `Failed to connect to backend: ${error.message}`);
      }
    });

    // --- Call Tool Handler ---
    this.server.setRequestHandler(CallToolRequestSchema, async (request, context) => {
      // No longer need to check incoming API key from context
      const toolName = request.params.name;
      const toolArgs = request.params.arguments;

      // console.log(`[MCP-SERVER] CallTool request received for tool: ${toolName}. Forwarding to Next.js backend.`); // Removed log

      // Forward the request to the Next.js backend
      const callToolUrl = `${NEXTJS_APP_URL}/api/mcp/call-tool`;
      // console.log(`[MCP-SERVER] Forwarding CallTool request for "${toolName}" to: ${callToolUrl}`); // Removed log

      try {
        const response = await fetch(callToolUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Use the API key from the environment variable
            'X-MCP-API-Key': GIGHARD_API_KEY!,
          },
          body: JSON.stringify({
            toolName: toolName,
            arguments: toolArgs,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          // console.error(`[MCP-SERVER] Error from Next.js /call-tool (${response.status}): ${errorBody}`); // Removed log
          let backendError = `Backend error: ${response.statusText}`;
          try {
              const jsonError = JSON.parse(errorBody);
              backendError = jsonError.error || backendError;
          } catch { /* Ignore parsing error */ }
          throw new McpError(ErrorCode.InternalError, backendError);
        }

        const responseData = await response.json();
        // console.log(`[MCP-SERVER] Received execution result for "${toolName}" from Next.js backend.`); // Removed log
        return responseData; // Forward the response directly

      } catch (error: any) {
        // console.error(`[MCP-SERVER] Failed to forward CallTool request to Next.js:`, error); // Removed log
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Failed to connect to backend: ${error.message}`);
      }
    });
  }

  async run() {
    // Reverted to StdioServerTransport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // NOTE: Logs were removed to prevent JSON parsing errors when client connects via stdio
    // console.error('[MCP-SERVER] Gigahard MCP server running on stdio');
    // console.error(`[MCP-SERVER] Forwarding requests to Next.js backend: ${NEXTJS_APP_URL}`);
    // console.error(`[MCP-SERVER] Using configured API Key: ${GIGHARD_API_KEY ? 'Loaded' : 'MISSING!'}`);
  }
}

// --- Start the Server ---
const serverInstance = new GigahardMcpServer();
serverInstance.run().catch(error => {
  // console.error('[MCP-SERVER] Failed to start:', error); // Removed log
  process.exit(1);
});
