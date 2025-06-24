/**
 * LinkedIn connection request DOM utilities and selectors
 * These selectors target LinkedIn's connection invitation interfaces for tracking
 */

export const CONNECTION_REQUEST_SELECTORS = {
  // Connection request modal (from provided HTML)
  connectionModal: '[data-test-modal][role="dialog"].send-invite',
  modalHeader: '.artdeco-modal__header',
  modalContent: '.artdeco-modal__content',
  modalActionBar: '.artdeco-modal__actionbar',

  // Modal title and content
  modalTitle: '#send-invite-modal',
  modalDismiss: '[data-test-modal-close-btn]',
  premiumUpsellMessage: '.connect-button-send-invite__premium-upsell-message',

  // Message composition in connection request
  messageTextArea: '#custom-message, .connect-button-send-invite__custom-message',
  messageLabel: 'label[for="custom-message"]',
  characterCount: '.t-14.t-black--light.flex-1.text-align-right',
  messageContainer: '.relative',

  // Action buttons in modal
  sendButton: 'button[aria-label="Send invitation"]',
  cancelButton: 'button[aria-label="Cancel adding a note"]',
  sendButtonEnabled: 'button[aria-label="Send invitation"]:not([disabled])',
  sendButtonDisabled: 'button[aria-label="Send invitation"][disabled]',

  // Connect buttons on profiles and search results
  connectButton:
    'button[aria-label*="Invite"][aria-label*="to connect"], .artdeco-button--2[aria-label*="Connect"]',
  connectButtonPrimary: '.connect-button, button[data-control-name*="connect"]',
  moreActionsButton: 'button[aria-label="More actions"]',

  // Profile page elements for context
  profileHeader: '.pv-top-card, .profile-top-card',
  profileName: '.text-heading-xlarge, .pv-top-card--list-bullet h1',
  profileTitle: '.text-body-medium, .pv-top-card--list-bullet .text-body-medium',
  profileUrl: 'link[rel="canonical"], .pv-top-card--list-bullet a[href*="/in/"]',

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
  recipientCompany?: string;
  customMessage: string;
  timestamp: string;
  requestContext: 'profile_page' | 'search_results' | 'people_suggestions' | 'pymk' | 'other';
  hasCustomMessage: boolean;
  invitationLimitRemaining?: string;
}

export interface RecipientInfo {
  name: string;
  profileUrl: string;
  title?: string;
  company?: string;
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
 * Extract the custom message from the connection request modal
 */
export function extractConnectionMessage(): string {
  const textArea = findConnectionMessageTextArea();
  return textArea?.value?.trim() || '';
}

/**
 * Extract recipient information from current context
 */
export function extractRecipientInfo(): RecipientInfo {
  // Try to get from profile page context
  let recipientInfo = extractRecipientFromProfile();

  // If not on profile, try to get from search results or other contexts
  if (!recipientInfo.name) {
    recipientInfo = extractRecipientFromContext();
  }

  return recipientInfo;
}

/**
 * Extract recipient information from profile page
 */
function extractRecipientFromProfile(): RecipientInfo {
  const profileHeader = document.querySelector(CONNECTION_REQUEST_SELECTORS.profileHeader);

  if (!profileHeader) {
    return { name: '', profileUrl: '' };
  }

  // Extract name
  const nameElement = profileHeader.querySelector(CONNECTION_REQUEST_SELECTORS.profileName);
  const name = nameElement?.textContent?.trim() || '';

  // Extract title
  const titleElement = profileHeader.querySelector(CONNECTION_REQUEST_SELECTORS.profileTitle);
  const title = titleElement?.textContent?.trim() || '';

  // Extract profile URL
  let profileUrl = window.location.href;
  const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (canonicalLink) {
    profileUrl = canonicalLink.href;
  }

  return {
    name,
    profileUrl,
    title,
  };
}

/**
 * Extract recipient information from search results or other contexts
 */
function extractRecipientFromContext(): RecipientInfo {
  // Try to find recently clicked connect button to get context

  // Look for search result cards
  const searchCards = document.querySelectorAll(CONNECTION_REQUEST_SELECTORS.searchResultCard);
  for (const card of searchCards) {
    const connectButton = card.querySelector(CONNECTION_REQUEST_SELECTORS.connectButton);
    if (connectButton) {
      const nameElement = card.querySelector(CONNECTION_REQUEST_SELECTORS.searchResultName);
      const titleElement = card.querySelector(CONNECTION_REQUEST_SELECTORS.searchResultTitle);
      const linkElement = card.querySelector('a[href*="/in/"]') as HTMLAnchorElement;

      if (nameElement) {
        return {
          name: nameElement.textContent?.trim() || '',
          profileUrl: linkElement?.href || '',
          title: titleElement?.textContent?.trim() || '',
        };
      }
    }
  }

  // Look for PYMK cards
  const pymkCards = document.querySelectorAll(CONNECTION_REQUEST_SELECTORS.pymkCard);
  for (const card of pymkCards) {
    const connectButton = card.querySelector(CONNECTION_REQUEST_SELECTORS.pymkConnectButton);
    if (connectButton) {
      const nameElement = card.querySelector(CONNECTION_REQUEST_SELECTORS.pymkName);
      const titleElement = card.querySelector(CONNECTION_REQUEST_SELECTORS.pymkTitle);
      const linkElement = card.querySelector('a[href*="/in/"]') as HTMLAnchorElement;

      if (nameElement) {
        return {
          name: nameElement.textContent?.trim() || '',
          profileUrl: linkElement?.href || '',
          title: titleElement?.textContent?.trim() || '',
        };
      }
    }
  }

  return { name: '', profileUrl: '' };
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
