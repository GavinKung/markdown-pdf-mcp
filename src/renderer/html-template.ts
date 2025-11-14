/**
 * HTML template generation for PDF rendering
 */

import type { HeaderFooter } from '../types/schemas.js';
import { replaceTemplateVariables } from '../utils/format-utils.js';

/**
 * Options for HTML template generation
 */
export interface HtmlTemplateOptions {
  content: string;
  themeCss: string;
  codeHighlightCss: string;
  customCss: string;
  includeToc: boolean;
  tocDepth: number;
}

/**
 * Heading information for TOC generation
 */
interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Generate table of contents from HTML content
 */
export function generateToc(htmlContent: string, maxDepth: number): string {
  // Extract headings using regex
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    if (level <= maxDepth) {
      // Remove HTML tags from heading text
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      // Generate ID from text (simple slug)
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      headings.push({ level, text, id });
    }
  }

  if (headings.length === 0) {
    return '';
  }

  // Build nested TOC HTML
  let tocHtml = '<nav class="toc"><div class="toc-title">Table of Contents</div><ul>';
  let currentLevel = 1;

  for (const heading of headings) {
    // Open nested lists as needed
    while (currentLevel < heading.level) {
      tocHtml += '<ul>';
      currentLevel++;
    }
    // Close nested lists as needed
    while (currentLevel > heading.level) {
      tocHtml += '</ul>';
      currentLevel--;
    }
    // Add TOC item
    tocHtml += `<li><a href="#${heading.id}">${heading.text}</a></li>`;
  }

  // Close remaining lists
  while (currentLevel > 1) {
    tocHtml += '</ul>';
    currentLevel--;
  }

  tocHtml += '</ul></nav>';
  return tocHtml;
}

/**
 * Add IDs to headings in HTML content for TOC linking
 */
export function addHeadingIds(htmlContent: string): string {
  return htmlContent.replace(
    /<h([1-6])[^>]*>(.*?)<\/h\1>/gi,
    (_match, level, text) => {
      const plainText = text.replace(/<[^>]*>/g, '').trim();
      const id = plainText
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );
}

/**
 * Generate complete HTML document
 */
export function generateHtmlTemplate(options: HtmlTemplateOptions): string {
  // Add IDs to headings for TOC linking
  const contentWithIds = addHeadingIds(options.content);

  // Generate TOC if requested
  const toc = options.includeToc
    ? generateToc(contentWithIds, options.tocDepth)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown PDF</title>
  <style>
    /* Theme styles */
    ${options.themeCss}

    /* Code highlighting */
    ${options.codeHighlightCss}

    /* Custom CSS */
    ${options.customCss}

    /* TOC styling */
    .toc {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      page-break-after: avoid;
    }
    .toc-title {
      font-size: 1.2em;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .toc ul {
      list-style: none;
      padding-left: 16px;
      margin: 4px 0;
    }
    .toc ul ul {
      padding-left: 20px;
    }
    .toc li {
      margin: 4px 0;
    }
    .toc a {
      text-decoration: none;
      color: #0969da;
    }
    .toc a:hover {
      text-decoration: underline;
    }

    /* Print optimizations */
    @media print {
      .page-break {
        page-break-before: always;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      pre {
        page-break-inside: avoid;
      }
      img {
        max-width: 100%;
        page-break-inside: avoid;
      }
      table {
        page-break-inside: avoid;
      }
      a {
        color: #0969da;
        text-decoration: underline;
      }
    }
  </style>

  <!-- Highlight.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Apply syntax highlighting to all code blocks
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    });
  </script>
</head>
<body>
  <div class="markdown-body">
    ${toc}
    ${contentWithIds}
  </div>
</body>
</html>`;
}

/**
 * Format header/footer template for Playwright
 */
export function formatHeaderFooter(
  config: HeaderFooter,
  style: string = 'font-size: 10px; padding: 5px 20px; width: 100%;'
): string {
  const left = replaceTemplateVariables(config.left || '', {});
  const center = replaceTemplateVariables(config.center || '', {});
  const right = replaceTemplateVariables(config.right || '', {});

  return `
    <div style="${style}">
      <table style="width: 100%; border: none;">
        <tr>
          <td style="text-align: left; width: 33%;">${left}</td>
          <td style="text-align: center; width: 34%;">${center}</td>
          <td style="text-align: right; width: 33%;">${right}</td>
        </tr>
      </table>
    </div>
  `;
}
