/**
 * PDF generation using Playwright
 * Core conversion logic: Markdown → HTML → PDF
 */

import { chromium, Browser, Page } from 'playwright';
import { marked } from 'marked';
import type {
  PdfGenerationConfig,
  PdfStats,
  ConciseSuccessResponse,
  DetailedSuccessResponse,
} from '../types/schemas.js';
import { loadTheme, loadCodeTheme } from '../utils/theme-loader.js';
import { generateHtmlTemplate, formatHeaderFooter } from './html-template.js';
import { formatFileSize } from '../utils/format-utils.js';
import { ensureOutputDirectory, getFileSize } from '../utils/file-utils.js';

// ============================================================================
// Browser Instance Management (Performance Optimization + Concurrency Safety)
// ============================================================================

let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let activePages = 0;
const MAX_CONCURRENT_PAGES = 10; // Limit concurrent pages to prevent memory issues

/**
 * Verify if browser instance is still healthy
 */
async function isBrowserHealthy(browser: Browser): Promise<boolean> {
  try {
    // Try to get browser contexts - will fail if browser crashed
    const contexts = browser.contexts();
    return contexts !== undefined && browser.isConnected();
  } catch {
    return false;
  }
}

/**
 * Get or create browser instance (singleton pattern with race condition protection)
 */
async function getBrowser(): Promise<Browser> {
  // 1. If browser is currently launching, wait for it (prevents duplicate launches)
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  // 2. Check if existing browser instance is healthy
  if (browserInstance) {
    const healthy = await isBrowserHealthy(browserInstance);
    if (healthy) {
      return browserInstance;
    }

    // Browser crashed or disconnected, clean up
    console.warn('Browser instance unhealthy, restarting...');
    browserInstance = null;
  }

  // 3. Launch new browser with lock to prevent race conditions
  browserLaunchPromise = (async () => {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      browserInstance = browser;

      // Set up cleanup handlers (only once)
      const cleanup = async () => {
        if (browserInstance) {
          await browserInstance.close().catch(() => {});
          browserInstance = null;
        }
        activePages = 0;
      };

      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      return browser;
    } catch (error) {
      browserInstance = null;
      throw new Error(
        `Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Ensure Playwright Chromium is installed: pnpm exec playwright install chromium'
      );
    } finally {
      // Release lock
      browserLaunchPromise = null;
    }
  })();

  return browserLaunchPromise;
}

/**
 * Acquire a page from the browser with concurrency limit
 */
async function acquirePage(): Promise<Page> {
  // Check concurrent page limit
  if (activePages >= MAX_CONCURRENT_PAGES) {
    throw new Error(
      `Maximum concurrent pages (${MAX_CONCURRENT_PAGES}) reached. ` +
      'Too many PDF conversions in progress. Please try again later.'
    );
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  activePages++;

  return page;
}

/**
 * Release a page back to the pool
 */
async function releasePage(page: Page): Promise<void> {
  try {
    await page.close();
  } catch (error) {
    // Page might already be closed, ignore error
    console.warn('Error closing page:', error);
  } finally {
    activePages = Math.max(0, activePages - 1);
  }
}

/**
 * Get current browser stats (for debugging)
 */
export function getBrowserStats(): {
  browserActive: boolean;
  activePages: number;
  maxPages: number;
} {
  return {
    browserActive: browserInstance !== null && browserInstance.isConnected(),
    activePages,
    maxPages: MAX_CONCURRENT_PAGES,
  };
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  browserLaunchPromise = null;
  activePages = 0;
}

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * Convert markdown to PDF
 */
export async function generatePdf(
  config: PdfGenerationConfig
): Promise<ConciseSuccessResponse | DetailedSuccessResponse> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    // 1. Ensure output directory exists
    await ensureOutputDirectory(config.outputPath);

    // 2. Convert markdown to HTML using marked
    const htmlContent = await marked(config.markdownContent, {
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
    });

    // 3. Load theme CSS
    const themeCss = await loadTheme(config.theme);
    const codeHighlightCss = await loadCodeTheme(config.codeTheme);

    // 4. Generate complete HTML document
    const fullHtml = generateHtmlTemplate({
      content: htmlContent,
      themeCss,
      codeHighlightCss,
      customCss: config.customCss || '',
      includeToc: config.includeToc,
      tocDepth: config.tocDepth,
    });

    // 5. Acquire page from pool (with concurrency limit)
    page = await acquirePage();

    // Set viewport for consistent rendering
    await page.setViewportSize({ width: 1200, height: 800 });

    // 6. Load HTML content
    const waitUntil = config.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded';
    await page.setContent(fullHtml, { waitUntil });

    // 7. Wait for syntax highlighting to complete
    try {
      await page.waitForFunction(
        () => {
          const codeBlocks = document.querySelectorAll('pre code');
          if (codeBlocks.length === 0) return true;
          return Array.from(codeBlocks).every(
            block => block.classList.length > 1 // hljs adds classes
          );
        },
        { timeout: 5000 }
      );
    } catch {
      // Timeout is not critical, continue anyway
      console.warn('Code highlighting timeout, proceeding with PDF generation');
    }

    // 8. Determine page format and margins
    const pageFormat = config.pageFormat as 'A4' | 'Letter' | 'Legal' | 'A3';
    const defaultMargin = { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' };
    const margin = config.margin || defaultMargin;

    // 9. Generate PDF
    const pdfBuffer = await page.pdf({
      path: config.outputPath,
      format: pageFormat,
      landscape: config.pageOrientation === 'landscape',
      margin: {
        top: margin.top || defaultMargin.top,
        bottom: margin.bottom || defaultMargin.bottom,
        left: margin.left || defaultMargin.left,
        right: margin.right || defaultMargin.right,
      },
      scale: config.scale,
      printBackground: true,
      displayHeaderFooter: !!(config.header || config.footer),
      headerTemplate: config.header ? formatHeaderFooter(config.header) : undefined,
      footerTemplate: config.footer ? formatHeaderFooter(config.footer) : undefined,
    });

    // 10. Gather statistics
    const stats = await gatherStats(page, config.responseFormat === 'detailed');

    // 11. Release page back to pool
    await releasePage(page);
    page = null;

    // 12. Calculate metrics
    const duration = Date.now() - startTime;
    const fileSize = formatFileSize(pdfBuffer.length);

    // 13. Build response based on format
    const baseResponse = {
      status: 'success' as const,
      output_path: config.outputPath,
      file_size: fileSize,
      pages: stats.pages,
      duration_ms: duration,
    };

    if (config.responseFormat === 'detailed') {
      return {
        ...baseResponse,
        metadata: {
          theme: config.theme,
          page_format: config.pageFormat,
          includes_toc: config.includeToc,
          code_blocks: stats.codeBlocks,
          images: stats.images,
          headings: stats.headings,
          warnings: stats.warnings,
        },
      };
    }

    return baseResponse;
  } catch (error) {
    // Clean up page on error and release back to pool
    if (page) {
      await releasePage(page);
    }

    throw error;
  } finally {
    // Ensure page is always released (defensive programming)
    if (page) {
      await releasePage(page).catch(() => {});
    }
  }
}

// ============================================================================
// Statistics Collection
// ============================================================================

/**
 * Gather statistics about the generated PDF
 */
async function gatherStats(page: Page, _detailed: boolean): Promise<PdfStats> {
  const stats = await page.evaluate(() => {
    const codeBlocks = document.querySelectorAll('pre code');
    const images = document.querySelectorAll('img');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    // Check for missing images
    const missingImages = Array.from(images)
      .filter(img => !img.complete || img.naturalHeight === 0)
      .map(img => img.getAttribute('src') || 'unknown')
      .filter(src => src !== 'unknown');

    return {
      codeBlocks: codeBlocks.length,
      images: images.length,
      headings: headings.length,
      missingImages,
    };
  });

  // Build warnings
  const warnings: string[] = [];
  if (stats.missingImages.length > 0) {
    warnings.push(
      `${stats.missingImages.length} image(s) failed to load: ${stats.missingImages.join(', ')}`
    );
  }

  return {
    pages: 0, // Playwright doesn't directly provide page count
    codeBlocks: stats.codeBlocks,
    images: stats.images,
    headings: stats.headings,
    missingImages: stats.missingImages,
    warnings,
  };
}

// ============================================================================
// Utility: Get rough page count estimate
// ============================================================================

/**
 * Estimate page count from file size (very rough approximation)
 * A typical A4 page in PDF is ~50-100KB depending on content
 */
export async function estimatePageCount(pdfPath: string): Promise<number> {
  const fileSize = await getFileSize(pdfPath);
  // Very rough estimate: 75KB per page average
  return Math.max(1, Math.ceil(fileSize / (75 * 1024)));
}
