import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

interface CaptureCommentRequest {
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

interface CaptureCommentResponse {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<
  CaptureCommentRequest,
  CaptureCommentResponse
> = async (req, res) => {
  try {
    if (!req.body) {
      throw new Error('No comment data provided');
    }

    // Get the configured comment webhook from storage
    const commentWebhook = await storage.get('commentWebhook');

    if (!commentWebhook) {
      throw new Error('Comment webhook not configured. Please set it in the extension options.');
    }

    // Prepare the payload for the webhook (matching old code format exactly)
    const payload = {
      text: req.body.text,
      comment_author_name: req.body.comment_author_name,
      comment_author_profile: req.body.comment_author_profile,
      timestamp: req.body.timestamp,
      comment_url: req.body.comment_url,
      postId: req.body.postId,
      post_author_name: req.body.post_author_name,
      post_author_profile: req.body.post_author_profile,
      post_content: req.body.post_content,
    };

    // Make the HTTP POST request to the configured webhook
    const response = await fetch(commentWebhook, {
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
      } catch (e) {
        console.log('Error reading response body:', e);
      }
      throw new Error(`Comment webhook request failed: ${errorDetails}`);
    }

    // Optional: Read response body for debugging
    try {
      await response.text();
    } catch {
      // Ignore response body parsing errors
    }

    // Increment comment counter for analytics
    const currentCount = Number(await storage.get('commentCount')) || 0;
    await storage.set('commentCount', currentCount + 1);

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Background: Error capturing comment:', error);

    // Increment error counter for analytics
    const currentErrors = Number(await storage.get('errorCount')) || 0;
    await storage.set('errorCount', currentErrors + 1);

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
