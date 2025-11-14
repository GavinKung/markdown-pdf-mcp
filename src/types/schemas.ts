/**
 * Type definitions and Zod schemas for the Markdown to PDF MCP server
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

/**
 * Margin configuration schema
 */
export const MarginSchema = z.object({
  top: z.string().optional().describe('Top margin (e.g., "2cm", "1in")'),
  bottom: z.string().optional().describe('Bottom margin (e.g., "2cm", "1in")'),
  left: z.string().optional().describe('Left margin (e.g., "2cm", "1in")'),
  right: z.string().optional().describe('Right margin (e.g., "2cm", "1in")'),
}).strict();

/**
 * Header/Footer configuration schema
 */
export const HeaderFooterSchema = z.object({
  left: z.string().optional().describe('Left section content. Supports variables: {page}, {total}, {date}, {title}'),
  center: z.string().optional().describe('Center section content. Supports variables: {page}, {total}, {date}, {title}'),
  right: z.string().optional().describe('Right section content. Supports variables: {page}, {total}, {date}, {title}'),
}).strict();

/**
 * Main input schema for markdown_to_pdf tool
 */
export const MarkdownToPdfInputSchema = z.object({
  // Input source (exactly one must be provided)
  markdown_content: z.string().optional().describe('Direct markdown string content to convert'),
  markdown_file_path: z.string().optional().describe('Path to local .md file to convert'),
  markdown_url: z.string().url().optional().describe('URL to remote markdown file to convert'),

  // Output configuration
  output_path: z.string().describe('Path where the PDF file will be saved (e.g., "/path/to/output.pdf")'),

  // Styling options
  theme: z.enum(['github', 'github-dark', 'minimal', 'academic']).default('github').describe('CSS theme for styling the PDF'),
  custom_css: z.string().optional().describe('Custom CSS to override or extend the theme styles'),

  // Page layout
  page_format: z.enum(['A4', 'Letter', 'Legal', 'A3']).default('A4').describe('Page size format'),
  page_orientation: z.enum(['portrait', 'landscape']).default('portrait').describe('Page orientation'),
  margin: MarginSchema.optional().describe('Custom page margins'),

  // Content options
  include_toc: z.boolean().default(false).describe('Generate a table of contents at the beginning'),
  toc_depth: z.number().min(1).max(6).default(3).describe('Maximum heading depth to include in TOC (1-6)'),
  code_theme: z.enum(['github', 'monokai', 'nord', 'dracula']).default('github').describe('Syntax highlighting theme for code blocks'),

  // Headers and footers
  header: HeaderFooterSchema.optional().describe('Header configuration'),
  footer: HeaderFooterSchema.optional().describe('Footer configuration'),

  // Advanced options
  scale: z.number().min(0.1).max(2).default(1).describe('Page scale factor (0.1-2.0)'),
  wait_for_network_idle: z.boolean().default(true).describe('Wait for all network resources (images) to load before generating PDF'),
  base_url: z.string().optional().describe('Base URL for resolving relative paths in markdown'),

  // Output control
  response_format: z.enum(['concise', 'detailed']).default('concise').describe('Level of detail in the response'),
}).strict();

/**
 * Schema for list_themes tool
 */
export const ListThemesInputSchema = z.object({
  include_preview: z.boolean().default(false).describe('Include CSS preview snippets for each theme'),
}).strict();

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type Margin = z.infer<typeof MarginSchema>;
export type HeaderFooter = z.infer<typeof HeaderFooterSchema>;
export type MarkdownToPdfInput = z.infer<typeof MarkdownToPdfInputSchema>;
export type ListThemesInput = z.infer<typeof ListThemesInputSchema>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Base response interface
 */
export interface BaseResponse {
  status: 'success' | 'error';
}

/**
 * Success response (concise mode)
 */
export interface ConciseSuccessResponse extends BaseResponse {
  status: 'success';
  output_path: string;
  file_size: string;
  pages: number;
  duration_ms: number;
}

/**
 * Success response (detailed mode)
 */
export interface DetailedSuccessResponse extends ConciseSuccessResponse {
  metadata: {
    theme: string;
    page_format: string;
    includes_toc: boolean;
    code_blocks: number;
    images: number;
    headings: number;
    warnings: string[];
  };
}

/**
 * Error response
 */
export interface ErrorResponse extends BaseResponse {
  status: 'error';
  error: string;
  suggestion: string;
  details?: unknown;
}

/**
 * Union type for all possible responses
 */
export type MarkdownToPdfResponse = ConciseSuccessResponse | DetailedSuccessResponse | ErrorResponse;

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Configuration for PDF generation
 */
export interface PdfGenerationConfig {
  markdownContent: string;
  outputPath: string;
  theme: string;
  customCss?: string;
  pageFormat: string;
  pageOrientation: string;
  margin?: Margin;
  includeToc: boolean;
  tocDepth: number;
  codeTheme: string;
  header?: HeaderFooter;
  footer?: HeaderFooter;
  scale: number;
  waitForNetworkIdle: boolean;
  baseUrl?: string;
  responseFormat: 'concise' | 'detailed';
}

/**
 * Statistics gathered during PDF generation
 */
export interface PdfStats {
  pages: number;
  codeBlocks: number;
  images: number;
  headings: number;
  missingImages: string[];
  warnings: string[];
}

/**
 * Theme information
 */
export interface ThemeInfo {
  name: string;
  displayName: string;
  description: string;
  preview?: string;
}
