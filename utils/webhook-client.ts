// Unified webhook client for LinkedIn AI Assistant
// Consolidates common webhook communication patterns

import { Storage } from '@plasmohq/storage';

const storage = new Storage();

export interface WebhookOptions {
  endpoint: string;
  userAgent?: string;
  timeout?: number;
}

export interface WebhookResponse {
  success: boolean;
  error?: string;
  statusCode?: number;
  responseBody?: string;
}

/**
 * Generic webhook client with error handling and analytics
 */
export class WebhookClient {
  private defaultUserAgent = 'LinkedIn-AI-Assistant-Extension/1.0';
  private defaultTimeout = 10000; // 10 seconds

  /**
   * Send payload to webhook with consistent error handling
   */
  async sendToWebhook(
    payload: Record<string, unknown>,
    options: WebhookOptions,
  ): Promise<WebhookResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout || this.defaultTimeout,
      );

      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': options.userAgent || this.defaultUserAgent,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // Ignore response body reading errors
        }

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          statusCode: response.status,
          responseBody: errorBody,
        };
      }

      // Optional: Read response body for debugging
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        // Ignore response body parsing errors
      }

      return {
        success: true,
        statusCode: response.status,
        responseBody,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Increment analytics counter in storage
   */
  async incrementCounter(counterName: string): Promise<void> {
    try {
      const currentCount = Number(await storage.get(counterName)) || 0;
      await storage.set(counterName, currentCount + 1);
    } catch (error) {
      console.error(`Failed to increment ${counterName}:`, error);
    }
  }

  /**
   * Get webhook endpoint from storage with validation
   */
  async getWebhookEndpoint(storageKey: string): Promise<string> {
    const endpoint = await storage.get(storageKey);
    if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
      throw new Error(`${storageKey} not configured. Please set it in the extension options.`);
    }
    return endpoint.trim();
  }
}
