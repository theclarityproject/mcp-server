# gigahard-mcp-server MCP Server

[![smithery badge](https://smithery.ai/badge/@lekt9/gigahard-mcp)](https://smithery.ai/server/@lekt9/gigahard-mcp)

Smuggle your HAR requests and turn them into MCP-usable tools

This is a TypeScript-based MCP server that implements a simple notes system. It demonstrates core MCP concepts by providing:

- Resources representing text notes with URIs and metadata
- Tools for creating new notes
- Prompts for generating summaries of notes

## Features

### Resources
- List and access notes via `note://` URIs
- Each note has a title, content and metadata
- Plain text mime type for simple content access

### Tools
- `create_note` - Create new text notes
  - Takes title and content as required parameters
  - Stores note in server state

### Prompts
- `summarize_notes` - Generate a summary of all stored notes
  - Includes all note contents as embedded resources
  - Returns structured prompt for LLM summarization

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

### Installing via Smithery

To install gigahard-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@lekt9/gigahard-mcp):

```bash
npx -y @smithery/cli install @lekt9/gigahard-mcp --client claude
```

### Installing Manually
To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gigahard-mcp-server": {
      "command": "/path/to/gigahard-mcp-server/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
