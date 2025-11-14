# Markdown to PDF MCP Server

An MCP (Model Context Protocol) server for converting Markdown documents to beautifully formatted PDF files with customizable styling.

## Features

- 🎨 Multiple built-in themes (GitHub, GitHub Dark, Minimal, Academic)
- 📝 Automatic table of contents generation
- 🌈 Syntax highlighting for code blocks
- 📄 Custom page layouts and margins
- 🔖 Headers and footers with variables
- 🖼️ Image and SVG support
- 📊 Future: Mermaid diagrams and Math formulas

## Installation

### Quick Install (Recommended)

Using Claude Code CLI:

```bash
claude mcp add markdown-pdf npx markdown-pdf-mcp
```

Or manually add to your Claude config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "markdown-pdf": {
      "command": "npx",
      "args": ["markdown-pdf-mcp"]
    }
  }
}
```

The Playwright Chromium browser will be automatically installed on first use.

### Manual Installation (For Development)

#### Using pnpm (Recommended)

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Install Playwright browsers
pnpm exec playwright install chromium
```

#### Using npm

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Install Playwright browsers
npx playwright install chromium
```

### Local Development Configuration

Add to your Claude config:

```json
{
  "mcpServers": {
    "markdown-pdf": {
      "command": "node",
      "args": ["/absolute/path/to/markdown-pdf-mcp/dist/index.js"]
    }
  }
}
```

## Project Structure

```
markdown-pdf-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   ├── convert.ts        # markdown_to_pdf tool
│   │   ├── batch.ts          # Batch conversion
│   │   ├── themes.ts         # Theme management
│   │   └── validate.ts       # Markdown validation
│   ├── renderer/
│   │   ├── markdown-parser.ts   # Markdown → HTML
│   │   ├── pdf-generator.ts     # HTML → PDF (Playwright)
│   │   └── html-template.ts     # HTML template generation
│   ├── themes/               # CSS theme utilities
│   ├── utils/                # Shared utilities
│   └── types/                # TypeScript types and Zod schemas
├── themes/                   # CSS theme files
│   ├── github.css
│   ├── github-dark.css
│   ├── minimal.css
│   └── academic.css
└── dist/                     # Build output
```

## Usage

Once configured in Claude, you can use it like this:

```
User: Convert my README.md to PDF with GitHub theme
Claude: [Uses markdown_to_pdf tool to convert the file]
```

## Development

### Using pnpm (Recommended)

```bash
# Watch mode for development
pnpm dev

# Build for production
pnpm build
```

### Using npm

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build
```

## License

MIT
