import {
  CONNECTION_REQUEST_SELECTORS,
  determineConnectionRequestContext,
  extractCompanyInfo,
  extractConnectionMessage,
  extractInvitationLimits,
  extractRecipientInfo,
  generateConnectionRequestId,
  hasCustomMessage,
  validateConnectionRequestData,
  type ConnectionRequestData,
} from './connection-request-dom';

/**
 * Extract comprehensive connection request data from LinkedIn invitation flow
 * Handles all connection request contexts: profile, search, PYMK, suggestions
 */
export function extractConnectionRequestData(): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] 🔍 Starting extraction...');

    // Generate unique request ID
    const requestId = generateConnectionRequestId();
    console.log('[Connection Request Extractor] 🆔 Request ID:', requestId);

    // Extract recipient information
    console.log('[Connection Request Extractor] 👤 Extracting recipient info...');
    const recipientInfo = extractRecipientInfo();
    console.log('[Connection Request Extractor] 👤 Recipient info:', recipientInfo);

    // Extract custom message
    console.log('[Connection Request Extractor] 📝 Extracting custom message...');
    const customMessage = extractConnectionMessage();
    console.log('[Connection Request Extractor] 📝 Custom message:', customMessage);

    // Determine request context
    console.log('[Connection Request Extractor] 🔍 Determining context...');
    const requestContext = determineConnectionRequestContext();
    console.log('[Connection Request Extractor] 🔍 Context:', requestContext);

    // Extract additional information
    console.log('[Connection Request Extractor] 🏢 Extracting company info...');
    const recipientCompany = extractCompanyInfo();
    console.log('[Connection Request Extractor] 🏢 Company:', recipientCompany);

    // Extract invitation limits
    console.log('[Connection Request Extractor] 📊 Extracting invitation limits...');
    const invitationLimitRemaining = extractInvitationLimits();
    console.log('[Connection Request Extractor] 📊 Limits remaining:', invitationLimitRemaining);

    // Check if message is custom
    const hasMessage = hasCustomMessage();
    console.log('[Connection Request Extractor] ✍️ Has custom message:', hasMessage);

    // Create timestamp
    const timestamp = new Date().toISOString();

    // Validate required fields
    if (!recipientInfo.name) {
      console.warn('[Connection Request Extractor] ❌ No recipient name found');
      return null;
    }

    const connectionRequestData: ConnectionRequestData = {
      requestId,
      recipientName: recipientInfo.name,
      recipientProfileUrl: recipientInfo.profileUrl,
      recipientTitle: recipientInfo.title,
      recipientCompany,
      customMessage,
      timestamp,
      requestContext,
      hasCustomMessage: hasMessage,
      invitationLimitRemaining,
    };

    // Validate the extracted data
    if (!validateConnectionRequestData(connectionRequestData)) {
      console.warn('[Connection Request Extractor] ❌ Data validation failed');
      return null;
    }

    console.log('[Connection Request Extractor] ✅ Extraction successful:', connectionRequestData);
    return connectionRequestData;
  } catch (error) {
    console.error(
      '[Connection Request Extractor] 💥 Error extracting connection request data:',
      error,
    );
    return null;
  }
}

/**
 * Extract connection request data from pre-send state (before clicking send)
 * This captures the intention to send a connection request
 */
export function extractPreSendConnectionRequestData(): Partial<ConnectionRequestData> | null {
  try {
    console.log('[Connection Request Extractor] 🚀 Extracting pre-send data...');

    // Check if modal is open and ready
    const modal = document.querySelector(CONNECTION_REQUEST_SELECTORS.connectionModal);
    if (!modal) {
      console.warn('[Connection Request Extractor] ❌ No connection modal found');
      return null;
    }

    // Extract basic data before sending
    const recipientInfo = extractRecipientInfo();
    const customMessage = extractConnectionMessage();
    const requestContext = determineConnectionRequestContext();
    const requestId = generateConnectionRequestId();

    console.log('[Connection Request Extractor] 🚀 Pre-send data:', {
      recipientName: recipientInfo.name,
      customMessage,
      requestContext,
      hasMessage: customMessage.length > 0,
    });

    if (!recipientInfo.name) {
      console.warn('[Connection Request Extractor] ❌ No recipient found in pre-send');
      return null;
    }

    return {
      requestId,
      recipientName: recipientInfo.name,
      recipientProfileUrl: recipientInfo.profileUrl,
      recipientTitle: recipientInfo.title,
      recipientCompany: extractCompanyInfo(),
      customMessage,
      timestamp: new Date().toISOString(),
      requestContext,
      hasCustomMessage: customMessage.length > 0,
      invitationLimitRemaining: extractInvitationLimits(),
    };
  } catch (error) {
    console.error('[Connection Request Extractor] 💥 Error extracting pre-send data:', error);
    return null;
  }
}

/**
 * Extract connection request data from confirmation/success state
 * This captures the actual sent connection request
 */
export function extractConfirmedConnectionRequestData(
  preSendData?: Partial<ConnectionRequestData>,
): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] ✅ Extracting confirmed data...');

    // Use pre-send data as base if available
    let baseData = preSendData || {};

    // If no pre-send data, extract fresh
    if (!baseData.recipientName) {
      baseData = extractPreSendConnectionRequestData() || {};
    }

    // Update with confirmed timestamp
    const confirmedData: ConnectionRequestData = {
      requestId: baseData.requestId || generateConnectionRequestId(),
      recipientName: baseData.recipientName || '',
      recipientProfileUrl: baseData.recipientProfileUrl || '',
      recipientTitle: baseData.recipientTitle,
      recipientCompany: baseData.recipientCompany,
      customMessage: baseData.customMessage || '',
      timestamp: new Date().toISOString(), // Update to actual send time
      requestContext: baseData.requestContext || determineConnectionRequestContext(),
      hasCustomMessage: baseData.hasCustomMessage || false,
      invitationLimitRemaining: baseData.invitationLimitRemaining,
    };

    // Validate the confirmed data
    if (!validateConnectionRequestData(confirmedData)) {
      console.warn('[Connection Request Extractor] ❌ Confirmed data validation failed');
      return null;
    }

    console.log('[Connection Request Extractor] ✅ Confirmed data extracted:', confirmedData);
    return confirmedData;
  } catch (error) {
    console.error('[Connection Request Extractor] 💥 Error extracting confirmed data:', error);
    return null;
  }
}

/**
 * Extract connection request data from different contexts without modal
 * For direct connect buttons that don't show a modal
 */
export function extractDirectConnectionRequestData(
  connectButton: Element,
): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] ⚡ Extracting direct connection data...');

    // Find the container context (search result, PYMK card, etc.)
    const container = connectButton.closest(
      '.reusable-search__result-container, .discover-cohort-card, .people-connect-card, .artdeco-card',
    );

    if (!container) {
      console.warn('[Connection Request Extractor] ❌ No container found for direct connection');
      return null;
    }

    // Extract recipient information from container
    const recipientInfo = extractRecipientFromContainer(container);
    if (!recipientInfo.name) {
      console.warn('[Connection Request Extractor] ❌ No recipient found in container');
      return null;
    }

    const connectionRequestData: ConnectionRequestData = {
      requestId: generateConnectionRequestId(),
      recipientName: recipientInfo.name,
      recipientProfileUrl: recipientInfo.profileUrl,
      recipientTitle: recipientInfo.title,
      recipientCompany: recipientInfo.company,
      customMessage: '', // Direct connections typically have no custom message
      timestamp: new Date().toISOString(),
      requestContext: determineConnectionRequestContext(),
      hasCustomMessage: false,
    };

    // Validate the data
    if (!validateConnectionRequestData(connectionRequestData)) {
      console.warn('[Connection Request Extractor] ❌ Direct connection data validation failed');
      return null;
    }

    console.log(
      '[Connection Request Extractor] ⚡ Direct connection data extracted:',
      connectionRequestData,
    );
    return connectionRequestData;
  } catch (error) {
    console.error(
      '[Connection Request Extractor] 💥 Error extracting direct connection data:',
      error,
    );
    return null;
  }
}

/**
 * Extract recipient information from a specific container element
 */
function extractRecipientFromContainer(container: Element): {
  name: string;
  profileUrl: string;
  title?: string;
  company?: string;
} {
  // Search result selectors
  const nameSelectors = [
    '.entity-result__title-text a',
    '.actor-name',
    '.discover-person-card__name',
    '.people-connect-card__name',
    '.search-result__info .actor-name',
  ];

  const titleSelectors = [
    '.entity-result__primary-subtitle',
    '.subline-level-1',
    '.discover-person-card__occupation',
    '.people-connect-card__headline',
  ];

  const linkSelectors = ['a[href*="/in/"]', '.app-aware-link[href*="/in/"]'];

  // Extract name
  let name = '';
  for (const selector of nameSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      name = element.textContent?.trim() || '';
      if (name) break;
    }
  }

  // Extract title
  let title = '';
  for (const selector of titleSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      title = element.textContent?.trim() || '';
      if (title && title !== '-') break;
    }
  }

  // Extract profile URL
  let profileUrl = '';
  for (const selector of linkSelectors) {
    const element = container.querySelector(selector) as HTMLAnchorElement;
    if (element && element.href) {
      profileUrl = element.href;
      break;
    }
  }

  return {
    name,
    profileUrl,
    title: title || undefined,
  };
}

/**
 * Validate connection request data completeness
 */
export function validateConnectionRequestDataComplete(
  data: ConnectionRequestData | null,
): data is ConnectionRequestData {
  if (!data) return false;

  // Check required fields
  if (!data.requestId || !data.recipientName || !data.timestamp) {
    console.warn('[Connection Request Extractor] ❌ Missing required fields:', {
      requestId: !!data.requestId,
      recipientName: !!data.recipientName,
      timestamp: !!data.timestamp,
    });
    return false;
  }

  return true;
}

/**
 * Sanitize extracted text content
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .trim();
}

/**
 * Get connection request analytics data
 */
export function getConnectionRequestAnalytics(data: ConnectionRequestData): {
  hasMessage: boolean;
  messageLength: number;
  context: string;
  isProfileConnection: boolean;
  isSearchConnection: boolean;
} {
  return {
    hasMessage: data.hasCustomMessage,
    messageLength: data.customMessage.length,
    context: data.requestContext,
    isProfileConnection: data.requestContext === 'profile_page',
    isSearchConnection: data.requestContext === 'search_results',
  };
}
