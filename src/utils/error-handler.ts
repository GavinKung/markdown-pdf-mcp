/**
 * Error handling utilities
 * Provides LLM-friendly error messages with actionable suggestions
 */

import type { ErrorResponse } from '../types/schemas.js';

/**
 * Generate actionable suggestion based on error type
 */
export function getErrorSuggestion(error: Error): string {
  const message = error.message.toLowerCase();

  // File not found errors
  if (message.includes('enoent') || message.includes('no such file')) {
    return 'File not found. Check if the path is correct and the file exists. Use an absolute path for reliability.';
  }

  // Permission errors
  if (message.includes('eacces') || message.includes('permission denied')) {
    return 'Permission denied. Ensure you have write access to the output directory. Try a different output path.';
  }

  // Network errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Request timed out. Try setting wait_for_network_idle: false or check your network connection.';
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'Network error while fetching remote content. Check the URL and your internet connection.';
  }

  // Markdown parsing errors
  if (message.includes('markdown') || message.includes('parse')) {
    return 'Invalid markdown syntax. Review the markdown content for formatting errors.';
  }

  // Browser/Playwright errors
  if (message.includes('browser') || message.includes('chromium')) {
    return 'Browser error. Ensure Playwright Chromium is installed: pnpm exec playwright install chromium';
  }

  // Disk space errors
  if (message.includes('enospc') || message.includes('no space')) {
    return 'Not enough disk space. Free up some space and try again.';
  }

  // Invalid input errors
  if (message.includes('invalid') || message.includes('validation')) {
    return 'Invalid input parameters. Check the parameter values and try again.';
  }

  // Default suggestion
  return 'An unexpected error occurred. Check the error message for details and try again.';
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error,
  includeDetails: boolean = false
): ErrorResponse {
  return {
    status: 'error',
    error: error.message,
    suggestion: getErrorSuggestion(error),
    ...(includeDetails && { details: { stack: error.stack } }),
  };
}

/**
 * Validate that exactly one input source is provided
 */
export function validateInputSource(
  markdownContent?: string,
  markdownFilePath?: string,
  markdownUrl?: string
): { valid: boolean; error?: string; suggestion?: string } {
  const sources = [markdownContent, markdownFilePath, markdownUrl].filter(Boolean);

  if (sources.length === 0) {
    return {
      valid: false,
      error: 'No input source provided',
      suggestion: 'Provide one of: markdown_content, markdown_file_path, or markdown_url',
    };
  }

  if (sources.length > 1) {
    return {
      valid: false,
      error: 'Multiple input sources provided',
      suggestion: 'Provide only ONE of: markdown_content, markdown_file_path, or markdown_url',
    };
  }

  return { valid: true };
}
