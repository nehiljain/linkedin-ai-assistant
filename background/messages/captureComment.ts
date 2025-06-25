import type { PlasmoMessaging } from '@plasmohq/messaging';
import { WebhookClient } from '~utils/webhook-client';

const webhookClient = new WebhookClient();

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
    const commentWebhook = await webhookClient.getWebhookEndpoint('commentWebhook');

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

    // Send to webhook using unified client
    const webhookResponse = await webhookClient.sendToWebhook(payload, {
      endpoint: commentWebhook,
    });

    if (!webhookResponse.success) {
      throw new Error(webhookResponse.error || 'Comment webhook request failed');
    }

    // Increment comment counter for analytics
    await webhookClient.incrementCounter('commentCount');

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Background: Error capturing comment:', error);

    // Increment error counter for analytics
    await webhookClient.incrementCounter('errorCount');

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
