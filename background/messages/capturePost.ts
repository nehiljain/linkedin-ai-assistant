import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

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
    console.log('[LinkedIn AI Assistant] 🎯 Background: Received capture request');
    console.log('[LinkedIn AI Assistant] 🎯 Background: Request body:', req.body);

    if (!req.body) {
      console.error('[LinkedIn AI Assistant] ❌ Background: No post data provided');
      throw new Error('No post data provided');
    }

    console.log('[LinkedIn AI Assistant] 🎯 Background: Post ID:', req.body.postId);

    // Get the configured API endpoint from storage
    console.log('[LinkedIn AI Assistant] 🔍 Background: Checking for API endpoint in storage...');
    const apiEndpoint = await storage.get('apiEndpoint');
    console.log('[LinkedIn AI Assistant] 🔍 Background: API endpoint from storage:', apiEndpoint);

    if (!apiEndpoint) {
      console.error('[LinkedIn AI Assistant] ❌ Background: API endpoint not configured');
      throw new Error('API endpoint not configured. Please set it in the extension options.');
    }

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

    console.log('[LinkedIn AI Assistant] Background: Sending payload to API:', payload);

    // Make the HTTP POST request to the configured endpoint
    const response = await fetch(apiEndpoint, {
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
      throw new Error(`API request failed: ${errorDetails}`);
    }

    // Optional: Read response body for debugging
    let responseData = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (e) {
      console.log('JSON parse error:', e);
    }

    console.log('[LinkedIn AI Assistant] Background: API call successful:', responseData);

    // Increment success counter for analytics (optional)
    const currentCount = Number(await storage.get('captureCount')) || 0;
    await storage.set('captureCount', currentCount + 1);

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Background: Error capturing post:', error);

    // Increment error counter for analytics (optional)
    const currentErrors = Number(await storage.get('errorCount')) || 0;
    await storage.set('errorCount', currentErrors + 1);

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
