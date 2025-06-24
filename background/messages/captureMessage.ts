import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

interface CaptureMessageRequest {
  messageId: string;
  conversationId: string;
  recipientName: string;
  recipientProfileUrl: string;
  messageText: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'document' | 'voice' | 'video' | 'link' | 'mixed';
  attachments: Array<{
    type: 'image' | 'document' | 'link' | 'voice' | 'video';
    url?: string;
    title?: string;
    description?: string;
    filename?: string;
    size?: string;
  }>;
  isGroupMessage: boolean;
  groupMembers?: string[];
  conversationContext: 'main_messaging' | 'mini_chat' | 'profile_modal' | 'mobile';
}

interface CaptureMessageResponse {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<
  CaptureMessageRequest,
  CaptureMessageResponse
> = async (req, res) => {
  try {
    console.log('[LinkedIn AI Assistant] 💬 Background: Received message capture request');
    console.log('[LinkedIn AI Assistant] 💬 Background: Request body:', req.body);

    if (!req.body) {
      console.error('[LinkedIn AI Assistant] ❌ Background: No message data provided');
      throw new Error('No message data provided');
    }

    console.log('[LinkedIn AI Assistant] 💬 Background: Message ID:', req.body.messageId);
    console.log('[LinkedIn AI Assistant] 💬 Background: Recipient:', req.body.recipientName);

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
      type: 'message',
      messageId: req.body.messageId,
      conversationId: req.body.conversationId,
      recipientName: req.body.recipientName,
      recipientProfileUrl: req.body.recipientProfileUrl,
      messageText: req.body.messageText,
      timestamp: req.body.timestamp,
      messageType: req.body.messageType,
      attachments: req.body.attachments,
      isGroupMessage: req.body.isGroupMessage,
      groupMembers: req.body.groupMembers,
      conversationContext: req.body.conversationContext,
      capturedAt: new Date().toISOString(),
      source: 'linkedin-ai-assistant',
      platform: 'linkedin',
      action: 'message_sent',
    };

    console.log('[LinkedIn AI Assistant] 💬 Background: Sending message payload to API:', payload);

    // Make the HTTP POST request to the configured endpoint
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-AI-Assistant-Extension/1.0',
        'X-Data-Type': 'linkedin-message',
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

    console.log(
      '[LinkedIn AI Assistant] 💬 Background: Message API call successful:',
      responseData,
    );

    // Increment message capture counter for analytics
    const currentMessageCount = Number(await storage.get('messageCaptureCount')) || 0;
    await storage.set('messageCaptureCount', currentMessageCount + 1);

    // Track message analytics by recipient (for tracking how many messages sent to someone)
    const recipientKey = `messageCount_${req.body.recipientProfileUrl}`;
    const recipientMessageCount = Number(await storage.get(recipientKey)) || 0;
    await storage.set(recipientKey, recipientMessageCount + 1);

    // Track conversation analytics
    const conversationKey = `conversationActivity_${req.body.conversationId}`;
    const conversationData = (await storage.get(conversationKey)) || {
      recipientName: req.body.recipientName,
      recipientProfileUrl: req.body.recipientProfileUrl,
      messageCount: 0,
      isGroupConversation: req.body.isGroupMessage,
      lastMessageAt: req.body.timestamp,
      firstMessageAt: req.body.timestamp,
    };

    conversationData.messageCount = (conversationData.messageCount || 0) + 1;
    conversationData.lastMessageAt = req.body.timestamp;
    if (!conversationData.firstMessageAt) {
      conversationData.firstMessageAt = req.body.timestamp;
    }

    await storage.set(conversationKey, conversationData);

    // Track daily message statistics
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dailyKey = `dailyMessages_${today}`;
    const dailyCount = Number(await storage.get(dailyKey)) || 0;
    await storage.set(dailyKey, dailyCount + 1);

    console.log('[LinkedIn AI Assistant] 💬 Background: Message analytics updated');

    res.send({
      success: true,
    });
  } catch (error) {
    console.error('[LinkedIn AI Assistant] 💬 Background: Error capturing message:', error);

    // Increment error counter for analytics
    const currentErrors = Number(await storage.get('messageErrorCount')) || 0;
    await storage.set('messageErrorCount', currentErrors + 1);

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
