import type { PlasmoMessaging } from '@plasmohq/messaging';
import { WebhookClient } from '~utils/webhook-client';

const webhookClient = new WebhookClient();

interface CapturePostRequest {
  postId: string;
  content: string;
  author: string;
  authorUrl: string;
  postUrl: string;
  timestamp: string;
  mediaType: 'text' | 'image' | 'video' | 'document' | 'article' | 'poll';
}

interface CapturePostResponse {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<CapturePostRequest, CapturePostResponse> = async (
  req,
  res,
) => {
  try {
    if (!req.body) {
      throw new Error('No post data provided');
    }

    // Get the configured API endpoint from storage
    const apiEndpoint = await webhookClient.getWebhookEndpoint('apiEndpoint');

    // Prepare the payload for the backend API
    const payload = {
      postId: req.body.postId,
      content: req.body.content,
      author: req.body.author,
      authorUrl: req.body.authorUrl,
      postUrl: req.body.postUrl,
      timestamp: req.body.timestamp,
      mediaType: req.body.mediaType,
      capturedAt: new Date().toISOString(),
      source: 'linkedin-ai-assistant',
    };

    // Send to webhook using unified client
    const webhookResponse = await webhookClient.sendToWebhook(payload, {
      endpoint: apiEndpoint,
    });

    if (!webhookResponse.success) {
      throw new Error(webhookResponse.error || 'API request failed');
    }

    // Increment success counter for analytics
    await webhookClient.incrementCounter('captureCount');

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Background: Error capturing post:', error);

    // Increment error counter for analytics
    await webhookClient.incrementCounter('errorCount');

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
