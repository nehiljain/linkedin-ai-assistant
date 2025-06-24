import type { PlasmoMessaging } from '@plasmohq/messaging';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

interface CaptureConnectionRequestRequest {
  requestId: string;
  recipientName: string;
  recipientProfileUrl: string;
  recipientTitle?: string;
  recipientCompany?: string;
  customMessage: string;
  timestamp: string;
  requestContext: 'profile_page' | 'search_results' | 'people_suggestions' | 'pymk' | 'other';
  hasCustomMessage: boolean;
  invitationLimitRemaining?: string;
}

interface CaptureConnectionRequestResponse {
  success: boolean;
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<
  CaptureConnectionRequestRequest,
  CaptureConnectionRequestResponse
> = async (req, res) => {
  try {
    console.log('[LinkedIn AI Assistant] 🤝 Background: Received connection request capture');
    console.log('[LinkedIn AI Assistant] 🤝 Background: Request body:', req.body);

    if (!req.body) {
      console.error('[LinkedIn AI Assistant] ❌ Background: No connection request data provided');
      throw new Error('No connection request data provided');
    }

    console.log('[LinkedIn AI Assistant] 🤝 Background: Request ID:', req.body.requestId);
    console.log('[LinkedIn AI Assistant] 🤝 Background: Recipient:', req.body.recipientName);

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
      type: 'connection_request',
      requestId: req.body.requestId,
      recipientName: req.body.recipientName,
      recipientProfileUrl: req.body.recipientProfileUrl,
      recipientTitle: req.body.recipientTitle,
      recipientCompany: req.body.recipientCompany,
      customMessage: req.body.customMessage,
      timestamp: req.body.timestamp,
      requestContext: req.body.requestContext,
      hasCustomMessage: req.body.hasCustomMessage,
      invitationLimitRemaining: req.body.invitationLimitRemaining,
      capturedAt: new Date().toISOString(),
      source: 'linkedin-ai-assistant',
      platform: 'linkedin',
      action: 'connection_request_sent',
    };

    console.log(
      '[LinkedIn AI Assistant] 🤝 Background: Sending connection request payload to API:',
      payload,
    );

    // Make the HTTP POST request to the configured endpoint
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-AI-Assistant-Extension/1.0',
        'X-Data-Type': 'linkedin-connection-request',
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
      '[LinkedIn AI Assistant] 🤝 Background: Connection request API call successful:',
      responseData,
    );

    // Increment connection request counter for analytics
    const currentConnectionCount = Number(await storage.get('connectionRequestCaptureCount')) || 0;
    await storage.set('connectionRequestCaptureCount', currentConnectionCount + 1);

    // Track connection request analytics by recipient (for tracking how many requests sent to someone)
    const recipientKey = `connectionRequestCount_${req.body.recipientProfileUrl}`;
    const recipientConnectionCount = Number(await storage.get(recipientKey)) || 0;
    await storage.set(recipientKey, recipientConnectionCount + 1);

    // Track connection request analytics by context
    const contextKey = `connectionContext_${req.body.requestContext}`;
    const contextConnectionCount = Number(await storage.get(contextKey)) || 0;
    await storage.set(contextKey, contextConnectionCount + 1);

    // Track custom message usage
    if (req.body.hasCustomMessage) {
      const customMessageCount = Number(await storage.get('customMessageConnectionCount')) || 0;
      await storage.set('customMessageConnectionCount', customMessageCount + 1);
    }

    // Track daily connection request statistics
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const dailyKey = `dailyConnectionRequests_${today}`;
    const dailyCount = Number(await storage.get(dailyKey)) || 0;
    await storage.set(dailyKey, dailyCount + 1);

    // Track invitation limits monitoring
    if (req.body.invitationLimitRemaining) {
      await storage.set('lastKnownInvitationLimit', req.body.invitationLimitRemaining);
      await storage.set('lastInvitationLimitCheck', new Date().toISOString());
    }

    // Store recent connection requests for analytics (keep last 100)
    const recentConnectionsKey = 'recentConnectionRequests';
    let recentConnections = (await storage.get(recentConnectionsKey)) || [];

    // Add new connection request to the beginning
    recentConnections.unshift({
      requestId: req.body.requestId,
      recipientName: req.body.recipientName,
      recipientProfileUrl: req.body.recipientProfileUrl,
      requestContext: req.body.requestContext,
      hasCustomMessage: req.body.hasCustomMessage,
      timestamp: req.body.timestamp,
    });

    // Keep only the last 100 requests
    if (recentConnections.length > 100) {
      recentConnections = recentConnections.slice(0, 100);
    }

    await storage.set(recentConnectionsKey, recentConnections);

    console.log('[LinkedIn AI Assistant] 🤝 Background: Connection request analytics updated');

    res.send({
      success: true,
    });
  } catch (error) {
    console.error(
      '[LinkedIn AI Assistant] 🤝 Background: Error capturing connection request:',
      error,
    );

    // Increment error counter for analytics
    const currentErrors = Number(await storage.get('connectionRequestErrorCount')) || 0;
    await storage.set('connectionRequestErrorCount', currentErrors + 1);

    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

export default handler;
