import {
  determineConnectionRequestContext,
  extractRecipientInfo,
  generateConnectionRequestId,
  validateConnectionRequestData,
  type ConnectionRequestData,
} from './connection-request-dom';

/**
 * Extract connection request data from any connect button click
 * Simplified approach: focus on profile page data extraction
 */
export function extractConnectionRequestData(
  connectElement?: Element,
  connectionType: 'direct' | 'with_note' | 'dropdown' = 'direct',
): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] 🔍 Starting simplified extraction...');
    console.log('[Connection Request Extractor] 🔗 Connection type:', connectionType);

    // Generate unique request ID
    const requestId = generateConnectionRequestId();
    console.log('[Connection Request Extractor] 🆔 Request ID:', requestId);

    // Extract recipient information from current page
    console.log('[Connection Request Extractor] 👤 Extracting recipient from current page...');
    const recipientInfo = extractRecipientInfo(connectElement);
    console.log('[Connection Request Extractor] 👤 Recipient info:', recipientInfo);

    // Determine request context
    console.log('[Connection Request Extractor] 🔍 Determining context...');
    const requestContext = determineConnectionRequestContext();
    console.log('[Connection Request Extractor] 🔍 Context:', requestContext);

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
      recipientLocation: recipientInfo.location,
      recipientCompany: recipientInfo.company,
      timestamp,
      requestContext,
      connectionType,
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
 * Extract connection request data when modal send button is clicked
 * Simplified: just capture current profile data
 */
export function extractModalConnectionRequestData(): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] 🚀 Extracting modal connection data...');

    // Use the simplified extraction with modal type
    return extractConnectionRequestData(undefined, 'with_note');
  } catch (error) {
    console.error('[Connection Request Extractor] 💥 Error extracting modal data:', error);
    return null;
  }
}

/**
 * Extract connection request data from dropdown connect click (from HTML you provided)
 * This handles clicks on "Invite [Name] to connect" in the more actions dropdown
 */
export function extractDropdownConnectionRequestData(
  dropdownElement: Element,
): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] 📋 Extracting dropdown connection data...');

    // Use the simplified extraction with dropdown type
    return extractConnectionRequestData(dropdownElement, 'dropdown');
  } catch (error) {
    console.error('[Connection Request Extractor] 💥 Error extracting dropdown data:', error);
    return null;
  }
}

/**
 * Extract connection request data from direct connect button click
 * Simplified: use current page data
 */
export function extractDirectConnectionRequestData(
  connectButton: Element,
): ConnectionRequestData | null {
  try {
    console.log('[Connection Request Extractor] ⚡ Extracting direct connection data...');

    // Use the simplified extraction with direct type
    return extractConnectionRequestData(connectButton, 'direct');
  } catch (error) {
    console.error(
      '[Connection Request Extractor] 💥 Error extracting direct connection data:',
      error,
    );
    return null;
  }
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
  connectionType: string;
  context: string;
  isProfileConnection: boolean;
  isSearchConnection: boolean;
  hasTitle: boolean;
  hasCompany: boolean;
  hasLocation: boolean;
} {
  return {
    connectionType: data.connectionType,
    context: data.requestContext,
    isProfileConnection: data.requestContext === 'profile_page',
    isSearchConnection: data.requestContext === 'search_results',
    hasTitle: !!data.recipientTitle,
    hasCompany: !!data.recipientCompany,
    hasLocation: !!data.recipientLocation,
  };
}
