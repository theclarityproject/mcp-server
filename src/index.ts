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
const GIGAHARD_API_KEY = process.env.GIGAHARD_API_KEY; // API Key for authenticating with the Next.js backend
const GIGAHARD_MCP_ID = process.env.GIGAHARD_MCP_ID; // Optional MCP ID to specify which MCP to use

if (!NEXTJS_APP_URL) {
  // console.error('[MCP-SERVER] Missing NEXTJS_APP_URL environment variable.'); // Removed log
  process.exit(1);
}
// If GIGAHARD_API_KEY is missing, continue running. Tools will still be listable, but API key will be empty.
// GIGAHARD_MCP_ID is optional - if provided, it will be used to specify which MCP to use

// Removed MCP_SERVER_PORT as it's not needed for stdio

// --- Types ---
// No specific types needed here anymore

// --- Helper Functions ---
// Helper function to convert a string with spaces to snake_case
function toSnakeCase(str: string): string {
  // Handle potential non-string inputs gracefully
  if (typeof str !== 'string' || !str) {
    return str;
  }
  return str
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, '_') // Replace one or more spaces with a single underscore
    .toLowerCase(); // Convert the entire string to lowercase
}

// Helper function to convert snake_case to Word With Space
function snakeToWordWithSpace(str: string): string {
  // Handle potential non-string inputs gracefully
  if (typeof str !== 'string' || !str) {
    return str;
  }
  return str
    .split('_') // Split by underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
    .join(' '); // Join with spaces
}

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
    this.server.onerror = (error) => { }; // Removed log, keep handler structure if needed
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
      let listToolsUrl = `${NEXTJS_APP_URL}/api/mcp/list-tools`;

      // Add MCP ID to the URL if specified
      if (GIGAHARD_MCP_ID) {
        listToolsUrl += `?mcpId=${encodeURIComponent(GIGAHARD_MCP_ID)}`;
      }
      // console.log(`[MCP-SERVER] Forwarding ListTools request to: ${listToolsUrl}`); // Removed log

      try {
        const response = await fetch(listToolsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Use the API key from the environment variable if present, else send empty string
            'X-MCP-API-Key': GIGAHARD_API_KEY || '',
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          // console.error(`[MCP-SERVER] Error from Next.js /list-tools (${response.status}): ${errorBody}`); // Removed log
          throw new McpError(ErrorCode.InternalError, `Backend error: ${response.statusText} - ${errorBody}`);
        }

        const responseData = await response.json();
        // console.log(`[MCP-SERVER] Received ${responseData.tools?.length ?? 0} tools from Next.js backend.`); // Removed log

        // Transform tool names to snake_case
        if (responseData.tools && Array.isArray(responseData.tools)) {
          responseData.tools = responseData.tools.map((tool: any) => ({
            ...tool,
            name: toSnakeCase(tool.name),
          }));
          // console.log(`[MCP-SERVER] Transformed tool names to snake_case.`); // Optional: Add log if needed
        }

        return responseData; // Return the modified response

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

      // Transform incoming snake_case tool name to "Word With Space" for the backend
      const backendToolName = snakeToWordWithSpace(toolName);
      // console.log(`[MCP-SERVER] Transformed tool name for backend: ${backendToolName}`); // Optional log

      // Forward the request to the Next.js backend
      let callToolUrl = `${NEXTJS_APP_URL}/api/mcp/call-tool`;

      // Add MCP ID to the URL if specified
      if (GIGAHARD_MCP_ID) {
        callToolUrl += `?mcpId=${encodeURIComponent(GIGAHARD_MCP_ID)}`;
      }
      // console.log(`[MCP-SERVER] Forwarding CallTool request for "${backendToolName}" to: ${callToolUrl}`); // Removed log

      try {
        const response = await fetch(callToolUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Use the API key from the environment variable if present, else send empty string
            'X-MCP-API-Key': GIGAHARD_API_KEY || '',
          },
          body: JSON.stringify({
            toolName: backendToolName, // Send the transformed name
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
        // console.log(`[MCP-SERVER] Received execution result for "${backendToolName}" from Next.js backend.`); // Removed log
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
    // console.error(`[MCP-SERVER] Using configured API Key: ${GIGAHARD_API_KEY ? 'Loaded' : 'MISSING!'}`);
    // console.error(`[MCP-SERVER] Using configured MCP ID: ${GIGAHARD_MCP_ID || 'Not specified - using default'}`);
  }
}

// --- Start the Server ---
const serverInstance = new GigahardMcpServer();
serverInstance.run().catch(error => {
  // console.error('[MCP-SERVER] Failed to start:', error); // Removed log
  process.exit(1);
});
