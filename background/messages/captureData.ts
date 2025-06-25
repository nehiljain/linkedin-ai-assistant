import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

// Union type for all capture requests
type CaptureRequest = PostCaptureRequest | CommentCaptureRequest;

interface PostCaptureRequest {
  type: 'post';
  postId: string;
  content: string;
  author: string;
  authorUrl: string;
  postUrl: string;
  timestamp: string;
  mediaType: 'text' | 'image' | 'video' | 'document' | 'article' | 'poll';
}

interface CommentCaptureRequest {
  type: 'comment';
  text: string;
  comment_author_name: string;
  comment_author_profile: string;
  timestamp: string;
  comment_url: string;
  postId: string;
  post_author_name: string;
  post_author_profile: string;
  post_content: Array<{ type: string; data: string }>;
}

interface CaptureResponse {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<CaptureRequest, CaptureResponse> = async (
  req,
  res,
) => {
  try {
    const isPost = req.body?.type === 'post';
    const dataType = isPost ? 'post' : 'comment';

    console.log(`[LinkedIn AI Assistant] 🎯 Background: Received ${dataType} capture request`);

    if (!req.body) {
      throw new Error(`No ${dataType} data provided`);
    }

    // Get the appropriate webhook URL
    const webhookKey = isPost ? 'apiEndpoint' : 'commentWebhook';
    const webhook = await storage.get(webhookKey);

    if (!webhook) {
      throw new Error(
        `${isPost ? 'Post' : 'Comment'} webhook not configured. Please set it in the extension options.`,
      );
    }

    // Prepare payload (remove the type field)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...payload } = req.body;

    console.log(
      `[LinkedIn AI Assistant] Background: Sending ${dataType} payload to webhook:`,
      payload,
    );

    // Make the HTTP POST request
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-AI-Assistant-Extension/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorDetails += `: ${errorBody}`;
        }
      } catch {
        // Ignore error reading response body
      }
      throw new Error(`${isPost ? 'Post' : 'Comment'} webhook request failed: ${errorDetails}`);
    }

    // Increment success counter
    const countKey = isPost ? 'captureCount' : 'commentCount';
    const currentCount = Number(await storage.get(countKey)) || 0;
    await storage.set(countKey, currentCount + 1);

    console.log(`[LinkedIn AI Assistant] Background: ${dataType} captured successfully`);

    res.send({ success: true });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Background: Error capturing data:', error);

    // Increment error counter
    const currentErrors = Number(await storage.get('errorCount')) || 0;
    await storage.set('errorCount', currentErrors + 1);

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
