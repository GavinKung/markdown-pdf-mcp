/**
 * Theme loading utilities
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ThemeInfo } from '../types/schemas.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Available themes
 */
export const AVAILABLE_THEMES: ThemeInfo[] = [
  {
    name: 'github',
    displayName: 'GitHub',
    description: 'GitHub-style markdown theme with clean, professional appearance',
  },
  {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    description: 'Dark mode GitHub theme for reduced eye strain',
  },
  {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Minimalist theme with clean typography and ample whitespace',
  },
  {
    name: 'academic',
    displayName: 'Academic',
    description: 'Academic paper style with serif fonts and formal layout',
  },
];

/**
 * Load theme CSS from file
 */
export async function loadTheme(themeName: string): Promise<string> {
  try {
    // Theme files are in the themes/ directory at project root
    const themePath = join(__dirname, '../../themes', `${themeName}.css`);
    return await readFile(themePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load theme "${themeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load code highlighting theme CSS
 * Uses highlight.js CDN
 */
export async function loadCodeTheme(codeTheme: string): Promise<string> {
  const cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${codeTheme}.min.css`;

  try {
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn(`Failed to load code theme from CDN, using fallback: ${error}`);
    // Return minimal fallback CSS
    return `
      pre code {
        display: block;
        padding: 1em;
        background: #f6f8fa;
        border-radius: 6px;
        overflow-x: auto;
      }
    `;
  }
}

/**
 * Get list of available themes
 */
export function getAvailableThemes(includePreview: boolean = false): ThemeInfo[] {
  if (includePreview) {
    // Future: could add preview CSS snippets
    return AVAILABLE_THEMES;
  }
  return AVAILABLE_THEMES;
}

/**
 * Validate theme name
 */
export function isValidTheme(themeName: string): boolean {
  return AVAILABLE_THEMES.some(theme => theme.name === themeName);
}
