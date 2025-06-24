/**
 * LinkedIn connection request DOM utilities and selectors
 * These selectors target LinkedIn's connection invitation interfaces for tracking
 */

export const CONNECTION_REQUEST_SELECTORS = {
  // Connection buttons on profiles - simplified approach
  connectButton: 'button[aria-label*="Connect"], button[aria-label*="Invite"]',
  connectDropdownItem:
    'div[aria-label*="Invite"][aria-label*="to connect"], div[aria-label*="Connect"]',
  moreActionsButton: 'button[aria-label="More actions"]',
  connectButtonPrimary: '.connect-button, button[data-control-name*="connect"]',

  // Connection request modal (if needed for send interception)
  connectionModal: '[data-test-modal][role="dialog"].send-invite, .artdeco-modal[aria-labelledby]',
  sendButton: 'button[aria-label="Send invitation"], button[aria-label*="Send"]',
  cancelButton: 'button[aria-label="Cancel"], button[aria-label*="Cancel"]',

  // Profile page elements for extracting person information
  profileHeader: '.pv-top-card, .profile-top-card, .ph5.pb5, .pv-profile-section',
  profileName:
    '.text-heading-xlarge, .pv-top-card--list-bullet h1, h1.text-heading-xlarge, .pv-text-details__left-panel h1',
  profileTitle:
    '.text-body-medium.break-words, .pv-top-card--list-bullet .text-body-medium, .text-body-medium, .pv-text-details__left-panel .text-body-medium:first-of-type',
  profileLocation:
    '.text-body-small.inline.t-black--light, .pv-text-details__left-panel .text-body-small',
  profileCompany:
    '.pv-text-details__left-panel .text-body-medium:not(:first-of-type), .experience-section .pv-entity__company-summary-info h3',

  // Search results context
  searchResultCard: '.reusable-search__result-container, .search-result__wrapper',
  searchResultName: '.entity-result__title-text a, .actor-name',
  searchResultTitle: '.entity-result__primary-subtitle, .subline-level-1',
  searchResultConnectButton: '.search-result__actions button[aria-label*="Invite"]',

  // People You May Know (PYMK) cards
  pymkCard: '.ember-view.artdeco-card, .discover-cohort-card',
  pymkName: '.discover-person-card__name, .actor-name-with-distance',
  pymkTitle: '.discover-person-card__occupation, .subline-level-1',
  pymkConnectButton: '.discover-person-card__connect-btn, button[data-control-name*="connect"]',

  // Connection suggestion cards
  suggestionCard: '.discovery-cohort-card, .people-connect-card',
  suggestionName: '.discovery-cohort-card__name, .people-connect-card__name',
  suggestionTitle: '.discovery-cohort-card__headline, .people-connect-card__headline',
  suggestionConnectButton: 'button[data-control-name="people_connect"]',

  // Premium indicators and upsell
  premiumUpsell: '.connect-button-send-invite__premium-upsell-message',
  premiumLink: 'a[href*="premium/products"]',
  premiumIcon: '[data-test-icon="premium-chip-v2-medium"]',

  // Invitation limits and warnings
  invitationLimit: '.connect-button-send-invite__premium-upsell-message',
  invitationWarning: '.invitation-warning, .connect-limit-warning',

  // Follow-up modal elements
  confirmationModal: '.send-invite-success-modal, .invitation-sent-modal',
  confirmationMessage: '.send-invite-success-modal__message',
} as const;

export interface ConnectionRequestData {
  requestId: string;
  recipientName: string;
  recipientProfileUrl: string;
  recipientTitle?: string;
  recipientLocation?: string;
  recipientCompany?: string;
  timestamp: string;
  requestContext: 'profile_page' | 'search_results' | 'people_suggestions' | 'pymk' | 'other';
  connectionType: 'direct' | 'with_note' | 'dropdown';
}

export interface RecipientInfo {
  name: string;
  profileUrl: string;
  title?: string;
  company?: string;
  location?: string;
}

/**
 * Check if a connection request modal is currently open
 */
export function isConnectionRequestModalOpen(): boolean {
  return document.querySelector(CONNECTION_REQUEST_SELECTORS.connectionModal) !== null;
}

/**
 * Find the active connection request modal
 */
export function findConnectionRequestModal(): Element | null {
  return document.querySelector(CONNECTION_REQUEST_SELECTORS.connectionModal);
}

/**
 * Find the message textarea in the connection request modal
 */
export function findConnectionMessageTextArea(): HTMLTextAreaElement | null {
  return document.querySelector(
    CONNECTION_REQUEST_SELECTORS.messageTextArea,
  ) as HTMLTextAreaElement;
}

/**
 * Find the send button in the connection request modal
 */
export function findConnectionSendButton(): Element | null {
  return document.querySelector(CONNECTION_REQUEST_SELECTORS.sendButton);
}

/**
 * Check if the send button is enabled
 */
export function isConnectionSendButtonEnabled(): boolean {
  const button = findConnectionSendButton();
  return button !== null && !button.hasAttribute('disabled');
}

/**
 * Extract the person's name from aria-label or profile page
 */
export function extractPersonNameFromContext(element?: Element): string {
  // First try to extract from aria-label (like "Invite Navin Chaddha to connect")
  if (element) {
    const ariaLabel = element.getAttribute('aria-label') || '';
    const inviteMatch = ariaLabel.match(/Invite ([^\s]+ [^\s]+) to connect/i);
    if (inviteMatch) {
      return inviteMatch[1];
    }

    const connectMatch = ariaLabel.match(/Connect with ([^\s]+ [^\s]+)/i);
    if (connectMatch) {
      return connectMatch[1];
    }
  }

  // Fallback to profile page extraction
  return extractRecipientFromProfile().name;
}

/**
 * Extract recipient information from current page (simplified approach)
 */
export function extractRecipientInfo(connectElement?: Element): RecipientInfo {
  // Always try to get from current profile page first
  const profileInfo = extractRecipientFromProfile();

  // If we have a connect element, try to extract name from its aria-label
  if (connectElement && !profileInfo.name) {
    const nameFromElement = extractPersonNameFromContext(connectElement);
    if (nameFromElement) {
      return {
        name: nameFromElement,
        profileUrl: window.location.href,
        title: profileInfo.title,
        company: profileInfo.company,
        location: profileInfo.location,
      };
    }
  }

  return profileInfo;
}

/**
 * Extract recipient information from profile page
 */
function extractRecipientFromProfile(): RecipientInfo & { location?: string } {
  // Extract name - try multiple selectors
  const nameSelectors = [
    'h1.text-heading-xlarge',
    '.pv-text-details__left-panel h1',
    '.text-heading-xlarge',
    '.pv-top-card--list-bullet h1',
  ];

  let name = '';
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      name = element.textContent.trim();
      break;
    }
  }

  // Extract title - try multiple selectors
  const titleSelectors = [
    '.pv-text-details__left-panel .text-body-medium:first-of-type',
    '.text-body-medium.break-words',
    '.pv-top-card--list-bullet .text-body-medium:first-of-type',
  ];

  let title = '';
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      title = element.textContent.trim();
      break;
    }
  }

  // Extract location
  const locationSelectors = [
    '.pv-text-details__left-panel .text-body-small.inline.t-black--light',
    '.text-body-small.inline.t-black--light',
  ];

  let location = '';
  for (const selector of locationSelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      location = element.textContent.trim();
      break;
    }
  }

  // Extract company from experience section or other areas
  const companySelectors = [
    '.pv-text-details__left-panel .text-body-medium:not(:first-of-type)',
    '.experience-section .pv-entity__company-summary-info h3:first-child',
  ];

  let company = '';
  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      company = element.textContent.trim();
      break;
    }
  }

  // Get current page URL (this is the profile URL)
  const profileUrl = window.location.href;

  return {
    name,
    profileUrl,
    title,
    company,
    location,
  };
}

/**
 * Determine the context where the connection request was initiated
 */
export function determineConnectionRequestContext(): ConnectionRequestData['requestContext'] {
  const url = window.location.href;

  if (url.includes('/in/') && !url.includes('/search/')) {
    return 'profile_page';
  }

  if (url.includes('/search/results/people/')) {
    return 'search_results';
  }

  if (
    url.includes('/mynetwork/invite-connect/') ||
    document.querySelector('.discover-cohort-card, .people-connect-card')
  ) {
    return 'people_suggestions';
  }

  if (document.querySelector('.discovery-cohort-card')) {
    return 'pymk';
  }

  return 'other';
}

/**
 * Extract invitation limits information
 */
export function extractInvitationLimits(): string | undefined {
  const limitElement = document.querySelector(CONNECTION_REQUEST_SELECTORS.invitationLimit);
  if (limitElement) {
    const text = limitElement.textContent?.trim() || '';
    const match = text.match(/(\d+)\s+personalized\s+invitations?\s+remaining/i);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Check if the connection request has a custom message
 */
export function hasCustomMessage(): boolean {
  const message = extractConnectionMessage();
  return message.length > 0;
}

/**
 * Generate a unique request ID for tracking
 */
export function generateConnectionRequestId(): string {
  const recipientInfo = extractRecipientInfo();
  const timestamp = Date.now();
  const context = determineConnectionRequestContext();

  // Create ID based on recipient and timestamp
  const recipientIdentifier = recipientInfo.profileUrl || recipientInfo.name || 'unknown';
  const hash = btoa(recipientIdentifier)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 8);

  return `conn-req-${hash}-${timestamp}-${context}`;
}

/**
 * Wait for connection request modal to be ready
 */
export function waitForConnectionModalReady(): Promise<Element> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection modal timeout'));
    }, 10000); // 10 second timeout

    const checkModal = () => {
      const modal = findConnectionRequestModal();
      if (modal && modal.querySelector(CONNECTION_REQUEST_SELECTORS.messageTextArea)) {
        clearTimeout(timeout);
        resolve(modal);
      } else {
        setTimeout(checkModal, 100);
      }
    };

    checkModal();
  });
}

/**
 * Check if there's a premium upsell message
 */
export function hasPremiumUpsell(): boolean {
  return document.querySelector(CONNECTION_REQUEST_SELECTORS.premiumUpsell) !== null;
}

/**
 * Extract company information from profile context
 */
export function extractCompanyInfo(): string | undefined {
  // Look for company information in profile or search context
  const companySelectors = [
    '.pv-entity__company-summary-info h3', // Profile experience section
    '.entity-result__secondary-subtitle', // Search results
    '.discover-person-card__company', // PYMK cards
  ];

  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const companyText = element.textContent?.trim();
      if (companyText && companyText !== '-') {
        return companyText;
      }
    }
  }

  return undefined;
}

/**
 * Validate connection request data
 */
export function validateConnectionRequestData(data: Partial<ConnectionRequestData>): boolean {
  if (!data.recipientName || !data.requestId) {
    console.warn('[Connection Request] Missing required fields:', {
      recipientName: !!data.recipientName,
      requestId: !!data.requestId,
    });
    return false;
  }

  return true;
}

/**
 * Throttle function for connection request events
 */
export function throttleConnectionRequest<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function for connection request events
 */
export function debounceConnectionRequest<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
