/**
 * Main conversion tool
 * Orchestrates the markdown to PDF conversion process
 */

import type {
  MarkdownToPdfInput,
  MarkdownToPdfResponse,
  PdfGenerationConfig,
} from '../types/schemas.js';
import { validateInputSource, createErrorResponse } from '../utils/error-handler.js';
import { readMarkdownFile, fetchMarkdownUrl } from '../utils/file-utils.js';
import { generatePdf } from '../renderer/pdf-generator.js';

/**
 * Convert markdown to PDF
 * Main entry point for the conversion process
 */
export async function convertMarkdownToPdf(
  input: MarkdownToPdfInput
): Promise<MarkdownToPdfResponse> {
  try {
    // 1. Validate input source (exactly one must be provided)
    const validation = validateInputSource(
      input.markdown_content,
      input.markdown_file_path,
      input.markdown_url
    );

    if (!validation.valid) {
      return {
        status: 'error',
        error: validation.error!,
        suggestion: validation.suggestion!,
      };
    }

    // 2. Get markdown content from the specified source
    let markdownContent: string;

    if (input.markdown_content) {
      markdownContent = input.markdown_content;
    } else if (input.markdown_file_path) {
      try {
        markdownContent = await readMarkdownFile(input.markdown_file_path);
      } catch (error) {
        return createErrorResponse(error as Error);
      }
    } else if (input.markdown_url) {
      try {
        markdownContent = await fetchMarkdownUrl(input.markdown_url);
      } catch (error) {
        return createErrorResponse(error as Error);
      }
    } else {
      // This should never happen due to validation above
      return {
        status: 'error',
        error: 'No input source provided',
        suggestion: 'Provide one of: markdown_content, markdown_file_path, or markdown_url',
      };
    }

    // 3. Validate markdown content is not empty
    if (!markdownContent.trim()) {
      return {
        status: 'error',
        error: 'Markdown content is empty',
        suggestion: 'Provide non-empty markdown content to convert',
      };
    }

    // 4. Build PDF generation configuration
    const config: PdfGenerationConfig = {
      markdownContent,
      outputPath: input.output_path,
      theme: input.theme,
      customCss: input.custom_css,
      pageFormat: input.page_format,
      pageOrientation: input.page_orientation,
      margin: input.margin,
      includeToc: input.include_toc,
      tocDepth: input.toc_depth,
      codeTheme: input.code_theme,
      header: input.header,
      footer: input.footer,
      scale: input.scale,
      waitForNetworkIdle: input.wait_for_network_idle,
      baseUrl: input.base_url,
      responseFormat: input.response_format,
    };

    // 5. Generate PDF
    const result = await generatePdf(config);

    return result;
  } catch (error) {
    // Handle any unexpected errors
    if (error instanceof Error) {
      return createErrorResponse(error, process.env.DEBUG === 'true');
    }

    return {
      status: 'error',
      error: 'An unexpected error occurred',
      suggestion: 'Check the input parameters and try again',
    };
  }
}
