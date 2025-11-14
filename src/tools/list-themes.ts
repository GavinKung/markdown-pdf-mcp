/**
 * List available themes tool
 */

import type { ListThemesInput, ThemeInfo } from '../types/schemas.js';
import { getAvailableThemes } from '../utils/theme-loader.js';

/**
 * List all available themes
 */
export async function listThemes(input: ListThemesInput): Promise<{
  status: 'success';
  themes: ThemeInfo[];
}> {
  const themes = getAvailableThemes(input.include_preview);

  return {
    status: 'success',
    themes,
  };
}
