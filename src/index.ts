#!/usr/bin/env node

/**
 * Markdown to PDF MCP Server
 * Entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  MarkdownToPdfInputSchema,
  ListThemesInputSchema,
} from './types/schemas.js';
import { convertMarkdownToPdf } from './tools/convert.js';
import { listThemes } from './tools/list-themes.js';
import { closeBrowser } from './renderer/pdf-generator.js';

// ============================================================================
// Server Initialization
// ============================================================================

const server = new Server(
  {
    name: 'markdown-pdf',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool Registration
// ============================================================================

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'markdown_to_pdf',
        description: `Convert Markdown documents to PDF with customizable styling and formatting.

**Purpose:** Transform markdown files or content into professional PDF documents with support for themes, code highlighting, table of contents, and custom page layouts.

**When to use:**
- Converting documentation to shareable PDF format
- Generating reports from markdown content
- Creating printable versions of markdown documents
- Exporting markdown with custom styling

**When NOT to use:**
- For simple HTML to PDF conversion (use a dedicated HTML-to-PDF tool)
- For complex LaTeX documents (use pandoc with LaTeX backend)
- For editing existing PDFs (use a PDF editor tool)

**Input sources (choose exactly one):**
- \`markdown_content\`: Direct markdown string
- \`markdown_file_path\`: Path to local .md file (absolute path recommended)
- \`markdown_url\`: URL to remote markdown file

**Output configuration:**
- \`output_path\`: Required. Path where PDF will be saved (e.g., "/path/to/output.pdf")

**Styling options:**
- \`theme\`: Choose from 'github', 'github-dark', 'minimal', 'academic' (default: 'github')
- \`custom_css\`: Optional custom CSS to override theme styles
- \`code_theme\`: Syntax highlighting theme: 'github', 'monokai', 'nord', 'dracula'

**Page layout:**
- \`page_format\`: 'A4', 'Letter', 'Legal', 'A3' (default: 'A4')
- \`page_orientation\`: 'portrait' or 'landscape' (default: 'portrait')
- \`margin\`: Custom margins (e.g., {top: "2cm", bottom: "2cm", left: "2cm", right: "2cm"})

**Content options:**
- \`include_toc\`: Generate table of contents (default: false)
- \`toc_depth\`: Heading depth for TOC, 1-6 (default: 3)

**Headers/Footers:**
- \`header\`: {left, center, right} with variables: {page}, {total}, {date}, {title}
- \`footer\`: {left, center, right} with variables: {page}, {total}, {date}, {title}

**Advanced options:**
- \`scale\`: Page scale factor 0.1-2.0 (default: 1)
- \`wait_for_network_idle\`: Wait for images to load (default: true)
- \`base_url\`: Base URL for resolving relative paths
- \`response_format\`: 'concise' or 'detailed' (default: 'concise')

**Examples:**
1. Convert README with GitHub theme:
   {markdown_file_path: "README.md", output_path: "output.pdf", theme: "github"}

2. Generate doc with TOC:
   {markdown_content: "# Title\\n...", output_path: "doc.pdf", include_toc: true}

3. Custom styling:
   {markdown_file_path: "doc.md", output_path: "styled.pdf", custom_css: "body { font-family: serif; }"}

4. With footer showing page numbers:
   {markdown_file_path: "doc.md", output_path: "doc.pdf", footer: {right: "Page {page} of {total}"}}

**Error handling:**
- File not found → Check path and ensure file exists
- Invalid markdown → Review markdown syntax
- Missing images → PDF generated with warnings
- Permission denied → Check output path write permissions
- Browser error → Ensure Playwright Chromium is installed`,

        inputSchema: {
          type: 'object',
          properties: {
            markdown_content: {
              type: 'string',
              description: 'Direct markdown string content to convert',
            },
            markdown_file_path: {
              type: 'string',
              description: 'Path to local .md file to convert (absolute path recommended)',
            },
            markdown_url: {
              type: 'string',
              description: 'URL to remote markdown file to convert',
            },
            output_path: {
              type: 'string',
              description: 'Path where the PDF file will be saved (required)',
            },
            theme: {
              type: 'string',
              enum: ['github', 'github-dark', 'minimal', 'academic'],
              description: 'CSS theme for styling the PDF (default: github)',
              default: 'github',
            },
            custom_css: {
              type: 'string',
              description: 'Custom CSS to override or extend theme styles',
            },
            page_format: {
              type: 'string',
              enum: ['A4', 'Letter', 'Legal', 'A3'],
              description: 'Page size format (default: A4)',
              default: 'A4',
            },
            page_orientation: {
              type: 'string',
              enum: ['portrait', 'landscape'],
              description: 'Page orientation (default: portrait)',
              default: 'portrait',
            },
            margin: {
              type: 'object',
              properties: {
                top: { type: 'string', description: 'Top margin (e.g., "2cm")' },
                bottom: { type: 'string', description: 'Bottom margin (e.g., "2cm")' },
                left: { type: 'string', description: 'Left margin (e.g., "2cm")' },
                right: { type: 'string', description: 'Right margin (e.g., "2cm")' },
              },
              description: 'Custom page margins',
            },
            include_toc: {
              type: 'boolean',
              description: 'Generate table of contents (default: false)',
              default: false,
            },
            toc_depth: {
              type: 'number',
              description: 'Maximum heading depth for TOC, 1-6 (default: 3)',
              default: 3,
              minimum: 1,
              maximum: 6,
            },
            code_theme: {
              type: 'string',
              enum: ['github', 'monokai', 'nord', 'dracula'],
              description: 'Syntax highlighting theme for code blocks (default: github)',
              default: 'github',
            },
            header: {
              type: 'object',
              properties: {
                left: { type: 'string' },
                center: { type: 'string' },
                right: { type: 'string' },
              },
              description: 'Header configuration. Supports variables: {page}, {total}, {date}, {title}',
            },
            footer: {
              type: 'object',
              properties: {
                left: { type: 'string' },
                center: { type: 'string' },
                right: { type: 'string' },
              },
              description: 'Footer configuration. Supports variables: {page}, {total}, {date}, {title}',
            },
            scale: {
              type: 'number',
              description: 'Page scale factor, 0.1-2.0 (default: 1)',
              default: 1,
              minimum: 0.1,
              maximum: 2,
            },
            wait_for_network_idle: {
              type: 'boolean',
              description: 'Wait for all network resources to load (default: true)',
              default: true,
            },
            base_url: {
              type: 'string',
              description: 'Base URL for resolving relative paths in markdown',
            },
            response_format: {
              type: 'string',
              enum: ['concise', 'detailed'],
              description: 'Level of detail in response (default: concise)',
              default: 'concise',
            },
          },
          required: ['output_path'],
        },
      },
      {
        name: 'list_themes',
        description: `List all available CSS themes for PDF generation.

**Purpose:** Discover available themes and their descriptions.

**Returns:** Array of theme objects with name, displayName, and description.

**Available themes:**
- github: GitHub-style markdown (clean, professional)
- github-dark: Dark mode GitHub theme
- minimal: Minimalist with clean typography
- academic: Academic paper style with serif fonts`,

        inputSchema: {
          type: 'object',
          properties: {
            include_preview: {
              type: 'boolean',
              description: 'Include CSS preview snippets for each theme (default: false)',
              default: false,
            },
          },
        },
      },
    ],
  };
});

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Handle tool execution requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'markdown_to_pdf': {
        // Validate input with Zod
        const validatedInput = MarkdownToPdfInputSchema.parse(args);

        // Execute conversion
        const result = await convertMarkdownToPdf(validatedInput);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_themes': {
        // Validate input with Zod
        const validatedInput = ListThemesInputSchema.parse(args || {});

        // Execute list themes
        const result = await listThemes(validatedInput);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'error',
                error: error.message,
                suggestion: 'Check the input parameters and try again',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
});

// ============================================================================
// Server Lifecycle
// ============================================================================

/**
 * Cleanup on shutdown
 */
async function cleanup() {
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('Markdown PDF MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
