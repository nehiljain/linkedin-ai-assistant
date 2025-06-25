/**
 * LinkedIn messaging DOM utilities and selectors
 * These selectors target LinkedIn's messaging interfaces for DM tracking
 */

export const MESSAGING_SELECTORS = {
  // Main messaging interface containers
  messagingContainer: '.application-outlet, .msg-overlay-list-bubble, .msg-thread',
  conversationList: '.msg-conversations-container, .msg-overlay-conversation-bubble',
  activeConversation: '.msg-thread, .msg-overlay-bubble-header',

  // Message composition areas
  messageComposer: '.msg-form__contenteditable, .msg-form__msg-content-container',
  messageTextArea: '.msg-form__contenteditable[contenteditable="true"]',
  sendButton: '.msg-form__send-button, button[data-control-name="send"]',
  sendButtonEnabled: '.msg-form__send-button:not([disabled])',

  // Message thread and history
  messageThread: '.msg-s-message-list, .msg-thread__messages',
  messageItem: '.msg-s-message-list__event, .msg-s-event, .msg-s-event-listitem',
  sentMessage:
    '.msg-s-message-list__event--outgoing, .msg-s-event--outgoing, .msg-s-event-listitem:has(.msg-s-event-with-indicator__sending-indicator--sent)',
  messageContent: '.msg-s-event-listitem__body, .msg-s-message-group__content',
  messageText: '.msg-s-event-listitem__message, .msg-s-message__body',
  messageTimestamp: '.msg-s-message-list__time-heading, .msg-s-event__timestamp',

  // Recipient information
  conversationHeader:
    '.msg-thread-header, .msg-overlay-bubble-header, .msg-overlay-conversation-bubble-header',
  recipientName:
    '.msg-entity-lockup__entity-title, .msg-thread-header__title, .msg-overlay-bubble-header__title',
  recipientProfile: '.msg-entity-lockup__link, .msg-thread-header__profile-link',
  recipientAvatar: '.msg-entity-lockup__entity-image, .msg-thread-header__image',
  conversationTitle: '.msg-thread-header__title, .msg-overlay-bubble-header__title',

  // Message attachments and media
  messageAttachment: '.msg-s-event-listitem__attachment, .msg-attachment',
  imageAttachment: '.msg-s-event-listitem__image, .msg-attachment__image',
  documentAttachment: '.msg-s-event-listitem__document, .msg-attachment__document',
  linkAttachment: '.msg-s-event-listitem__link-preview, .msg-attachment__link',

  // Mini chat popups
  miniChatBubble: '.msg-overlay-list-bubble, .msg-overlay-bubble',
  miniChatHeader: '.msg-overlay-bubble-header',
  miniChatComposer: '.msg-overlay-bubble .msg-form',
  miniChatSendButton: '.msg-overlay-bubble .msg-form__send-button',

  // Profile messaging (when messaging from profile page)
  profileMessageModal: '.msg-s-modal, .msg-thread-modal',
  profileMessageComposer: '.msg-s-modal .msg-form',
  profileMessageSend: '.msg-s-modal .msg-form__send-button',

  // Group conversations
  groupConversationHeader: '.msg-thread-header--group',
  groupMembersList: '.msg-thread-header__participants',
  groupMember: '.msg-participant',

  // Message states and indicators
  messageDelivered: '.msg-s-event--delivered',
  messageRead: '.msg-s-event--read',
  messageTyping: '.msg-typing-indicator',
  messageDraft: '.msg-form__draft-indicator',

  // Connection request messaging
  connectionRequestMessage: '.connect-request-message, .invitation-card',
  connectionMessageText: '.connect-request-message__text, .invitation-card__message',

  // Voice/video message indicators
  voiceMessage: '.msg-s-event-listitem--voice, .msg-voice-message',
  videoMessage: '.msg-s-event-listitem--video, .msg-video-message',

  // React/emoji indicators
  messageReaction: '.msg-s-event__reactions, .msg-reactions',
  emojiReaction: '.msg-reaction, .emoji-reaction',
} as const;

export interface MessageData {
  messageId: string;
  conversationId: string;
  recipientName: string;
  recipientProfileUrl: string;
  messageText: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'document' | 'voice' | 'video' | 'link' | 'mixed';
  attachments: MessageAttachment[];
  isGroupMessage: boolean;
  groupMembers?: string[];
  conversationContext: 'main_messaging' | 'mini_chat' | 'profile_modal' | 'mobile';
}

export interface MessageAttachment {
  type: 'image' | 'document' | 'link' | 'voice' | 'video';
  url?: string;
  title?: string;
  description?: string;
  filename?: string;
  size?: string;
}

export interface ConnectionRequestData {
  requestId: string;
  recipientName: string;
  recipientProfileUrl: string;
  customMessage: string;
  timestamp: string;
  requestContext: 'profile_page' | 'search_results' | 'people_suggestions' | 'pymk' | 'other';
  recipientTitle?: string;
  recipientCompany?: string;
}

/**
 * Check if the current page is a LinkedIn messaging interface
 */
export function isLinkedInMessagingPage(): boolean {
  return (
    window.location.hostname === 'www.linkedin.com' &&
    (window.location.pathname.startsWith('/messaging/') ||
      window.location.pathname === '/messaging' ||
      document.querySelector(MESSAGING_SELECTORS.messagingContainer) !== null)
  );
}

/**
 * Find the active message composer on the page
 */
export function findActiveMessageComposer(): Element | null {
  // Check for main messaging composer first
  let composer = document.querySelector(MESSAGING_SELECTORS.messageComposer);

  // Check for mini chat composer
  if (!composer) {
    composer = document.querySelector(MESSAGING_SELECTORS.miniChatComposer);
  }

  // Check for profile modal composer
  if (!composer) {
    composer = document.querySelector(MESSAGING_SELECTORS.profileMessageComposer);
  }

  return composer;
}

/**
 * Find the send button associated with a message composer
 */
export function findSendButton(composerElement?: Element): Element | null {
  if (composerElement) {
    // Look for send button within the composer's container
    const container = composerElement.closest('.msg-form, .msg-overlay-bubble, .msg-s-modal');
    if (container) {
      return container.querySelector(MESSAGING_SELECTORS.sendButton);
    }
  }

  // Fallback: find any active send button
  return document.querySelector(MESSAGING_SELECTORS.sendButtonEnabled);
}

/**
 * Get conversation context from DOM structure
 */
export function getConversationContext(): MessageData['conversationContext'] {
  if (document.querySelector('.msg-overlay-bubble')) {
    return 'mini_chat';
  }
  if (document.querySelector('.msg-s-modal, .msg-thread-modal')) {
    return 'profile_modal';
  }
  if (window.innerWidth < 768) {
    return 'mobile';
  }
  return 'main_messaging';
}

/**
 * Find the conversation header to extract recipient information
 */
export function findConversationHeader(fromElement?: Element): Element | null {
  console.log('[Messaging DOM] 🔍 Looking for conversation header...');

  if (fromElement) {
    // Find header within the same conversation container
    const container = fromElement.closest('.msg-thread, .msg-overlay-bubble, .msg-s-modal');
    console.log('[Messaging DOM] 🔍 Container found:', !!container);
    if (container) {
      const header = container.querySelector(MESSAGING_SELECTORS.conversationHeader);
      console.log('[Messaging DOM] 🔍 Header in container:', !!header);
      if (header) return header;
    }
  }

  // Fallback: find any active conversation header
  const header = document.querySelector(MESSAGING_SELECTORS.conversationHeader);
  console.log('[Messaging DOM] 🔍 Fallback header found:', !!header);

  // If still not found, try more specific selectors
  if (!header) {
    console.log('[Messaging DOM] 🔍 Trying additional header selectors...');
    const additionalSelectors = [
      'header.msg-overlay-conversation-bubble-header',
      '.msg-overlay-conversation-bubble-header',
      'header[class*="msg-overlay"]',
      'header[class*="bubble-header"]',
    ];

    for (const selector of additionalSelectors) {
      const altHeader = document.querySelector(selector);
      if (altHeader) {
        console.log(`[Messaging DOM] ✅ Found header with selector: ${selector}`);
        return altHeader;
      }
    }
  }

  return header;
}

/**
 * Check if a conversation is a group conversation
 */
export function isGroupConversation(conversationElement?: Element): boolean {
  const element =
    conversationElement || document.querySelector(MESSAGING_SELECTORS.conversationHeader);
  if (!element) return false;

  return (
    element.querySelector(MESSAGING_SELECTORS.groupConversationHeader) !== null ||
    element.querySelector(MESSAGING_SELECTORS.groupMembersList) !== null ||
    element.textContent?.includes('group') === true
  );
}

/**
 * Extract message ID from message element
 */
export function getMessageId(messageElement: Element): string {
  const dataId =
    messageElement.getAttribute('data-id') ||
    messageElement.getAttribute('data-message-id') ||
    messageElement.getAttribute('id');

  return dataId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract conversation ID from conversation context
 */
export function getConversationId(fromElement?: Element): string {
  const container =
    fromElement?.closest('.msg-thread, .msg-overlay-bubble, .msg-s-modal') ||
    document.querySelector('.msg-thread, .msg-overlay-bubble, .msg-s-modal');

  if (container) {
    const dataId =
      container.getAttribute('data-conversation-id') ||
      container.getAttribute('data-thread-id') ||
      container.getAttribute('data-id');

    if (dataId) return dataId;
  }

  // Extract from URL if available
  const urlMatch = window.location.pathname.match(/\/messaging\/thread\/([^/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a message element represents an outgoing (sent) message
 */
export function isOutgoingMessage(messageElement: Element): boolean {
  console.log('[Messaging DOM] 🔍 Checking if message is outgoing:', messageElement);

  // Check for explicit outgoing selectors first
  if (
    messageElement.matches(MESSAGING_SELECTORS.sentMessage) ||
    messageElement.closest(MESSAGING_SELECTORS.sentMessage) !== null
  ) {
    console.log('[Messaging DOM] ✅ Found outgoing message via explicit selectors');
    return true;
  }

  // Check for sent indicator (more reliable for newer LinkedIn DOM)
  const sentIndicator = messageElement.querySelector(
    '.msg-s-event-with-indicator__sending-indicator--sent',
  );
  if (sentIndicator) {
    console.log('[Messaging DOM] ✅ Found outgoing message via sent indicator');
    return true;
  }

  // Check for sent indicator within the message content area
  const contentArea = messageElement.querySelector('.msg-s-event-with-indicator');
  if (contentArea) {
    const indicator = contentArea.querySelector(
      '.msg-s-event-with-indicator__sending-indicator--sent',
    );
    if (indicator) {
      console.log('[Messaging DOM] ✅ Found outgoing message via content area sent indicator');
      return true;
    }
  }

  // Check if the message is from the current user by looking for profile links
  // This is a fallback method for cases where explicit indicators aren't present
  const profileLink = messageElement.querySelector('a[href*="/in/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    console.log('[Messaging DOM] 🔍 Found profile link:', href);

    // If the profile link matches the current user's profile pattern, it's outgoing
    // This is a heuristic based on LinkedIn's structure
    const isCurrentUser = messageElement
      .closest('.msg-s-event-listitem')
      ?.querySelector('.msg-s-event-with-indicator__sending-indicator');
    if (isCurrentUser) {
      console.log('[Messaging DOM] ✅ Found outgoing message via current user check');
      return true;
    }
  }

  // Additional check: if message has profile picture and text content but no received indicators
  // Look for messages that appear to be from current user (no other person's profile in message area)
  const messageContainer = messageElement.closest('.msg-s-event-listitem');
  if (messageContainer) {
    // Check if this message has a sent status indicator anywhere in its structure
    const anySentIndicator = messageContainer.querySelector('[title*="Sent at"]');
    if (anySentIndicator) {
      console.log('[Messaging DOM] ✅ Found outgoing message via sent status title');
      return true;
    }
  }

  console.log('[Messaging DOM] ❌ Message does not appear to be outgoing');
  return false;
}

/**
 * Determine message type based on content and attachments
 */
export function determineMessageType(messageElement: Element): MessageData['messageType'] {
  if (messageElement.querySelector(MESSAGING_SELECTORS.imageAttachment)) return 'image';
  if (messageElement.querySelector(MESSAGING_SELECTORS.voiceMessage)) return 'voice';
  if (messageElement.querySelector(MESSAGING_SELECTORS.videoMessage)) return 'video';
  if (messageElement.querySelector(MESSAGING_SELECTORS.documentAttachment)) return 'document';
  if (messageElement.querySelector(MESSAGING_SELECTORS.linkAttachment)) return 'link';

  // Check for multiple attachment types
  const attachmentTypes = [
    messageElement.querySelector(MESSAGING_SELECTORS.imageAttachment),
    messageElement.querySelector(MESSAGING_SELECTORS.documentAttachment),
    messageElement.querySelector(MESSAGING_SELECTORS.linkAttachment),
  ].filter(Boolean);

  if (attachmentTypes.length > 1) return 'mixed';

  return 'text';
}

/**
 * Wait for LinkedIn's messaging interface to be ready
 */
export function waitForMessagingReady(): Promise<void> {
  return new Promise(resolve => {
    const checkReady = () => {
      if (document.querySelector(MESSAGING_SELECTORS.messagingContainer)) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

/**
 * Throttle function for messaging events (reused from linkedin-dom.ts pattern)
 */
export function throttleMessaging<T extends (...args: unknown[]) => unknown>(
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
 * Debounce function for messaging events (reused from linkedin-dom.ts pattern)
 */
export function debounceMessaging<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
