/**
 * Formatting utilities
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Replace variables in header/footer template
 * Supports: {page}, {total}, {date}, {title}
 */
export function replaceTemplateVariables(
  template: string,
  variables: {
    page?: string | number;
    total?: string | number;
    date?: string;
    title?: string;
  }
): string {
  let result = template;

  result = result.replace(/\{page\}/g, String(variables.page || ''));
  result = result.replace(/\{total\}/g, String(variables.total || ''));
  result = result.replace(/\{date\}/g, variables.date || new Date().toLocaleDateString());
  result = result.replace(/\{title\}/g, variables.title || 'Document');

  return result;
}

/**
 * Sanitize filename to be safe for filesystem
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}
