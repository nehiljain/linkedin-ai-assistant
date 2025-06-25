// Unified webhook testing utility to eliminate options page duplication

export interface TestPayload {
  [key: string]: unknown;
}

export interface TestResult {
  success: boolean;
  error?: string;
  status?: number;
  responseBody?: string;
}

/**
 * Generic webhook tester for both post and comment webhooks
 */
export async function testWebhook(
  webhookUrl: string,
  payload: TestPayload,
  debug = false,
): Promise<TestResult> {
  if (!webhookUrl.trim()) {
    throw new Error('Webhook URL is required');
  }

  if (debug) {
    console.log('Testing webhook:', webhookUrl);
    console.log('Payload:', payload);
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-AI-Assistant-Extension/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (debug) {
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }

    if (response.ok) {
      return { success: true };
    } else {
      // Try to get response body for better error details
      let responseBody = '';
      try {
        responseBody = await response.text();
        if (debug) console.log('Error response body:', responseBody);
      } catch {
        // Ignore error reading response body
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        responseBody,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create test payload for post webhook
 */
export function createPostTestPayload(): TestPayload {
  return {
    postId: 'test-post-id',
    content: 'This is a test post to verify API connectivity',
    author: 'Test Author',
    authorUrl: 'https://linkedin.com/in/test',
    postUrl: 'https://linkedin.com/feed/test',
    timestamp: new Date().toISOString(),
    mediaType: 'text',
    capturedAt: new Date().toISOString(),
    source: 'linkedin-ai-assistant',
    isTest: true,
  };
}

/**
 * Create test payload for comment webhook
 */
export function createCommentTestPayload(): TestPayload {
  return {
    text: 'This is a test comment to verify API connectivity',
    comment_author_name: 'Test User',
    comment_author_profile: 'https://linkedin.com/in/test-user',
    timestamp: new Date().toISOString(),
    comment_url: 'https://linkedin.com/feed/test-comment',
    postId: 'test-post-id',
    post_author_name: 'Test Post Author',
    post_author_profile: 'https://linkedin.com/in/test-post-author',
    post_content: [{ type: 'text', data: 'This is test post content' }],
  };
}
