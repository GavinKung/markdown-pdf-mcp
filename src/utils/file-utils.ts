/**
 * File operation utilities
 */

import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

/**
 * Read markdown content from file
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Markdown file not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Fetch markdown content from URL
 */
export async function fetchMarkdownUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text') && !contentType.includes('markdown')) {
      console.warn(`Warning: Content-Type is "${contentType}", expected text or markdown`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch markdown from URL: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Ensure output directory exists
 */
export async function ensureOutputDirectory(outputPath: string): Promise<void> {
  const dir = dirname(outputPath);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
      throw new Error(`Failed to create output directory: ${error.message}`);
    }
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
