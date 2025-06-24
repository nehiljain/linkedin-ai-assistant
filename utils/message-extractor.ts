import {
  determineMessageType,
  findConversationHeader,
  getConversationContext,
  getConversationId,
  getMessageId,
  isGroupConversation,
  MESSAGING_SELECTORS,
  type MessageAttachment,
  type MessageData,
} from './messaging-dom';

/**
 * Extract comprehensive message data from LinkedIn messaging interfaces
 * Handles all messaging contexts: main chat, mini-chat, profile modal
 */
export function extractMessageData(
  messageElement: Element,
  composerElement?: Element,
): MessageData | null {
  try {
    console.log('[Message Extractor] 🔍 Starting extraction for message:', messageElement);

    const messageId = getMessageId(messageElement);
    const conversationId = getConversationId(messageElement);
    const conversationContext = getConversationContext();

    console.log('[Message Extractor] 🆔 Message ID:', messageId);
    console.log('[Message Extractor] 🆔 Conversation ID:', conversationId);
    console.log('[Message Extractor] 📱 Context:', conversationContext);

    // Extract message text content
    console.log('[Message Extractor] 📝 Extracting message text...');
    const messageText = extractMessageText(messageElement, composerElement);
    console.log('[Message Extractor] 📝 Message text:', messageText);

    // Extract recipient information
    console.log('[Message Extractor] 👤 Extracting recipient info...');
    const recipientInfo = extractRecipientInfo(messageElement);
    console.log('[Message Extractor] 👤 Recipient info:', recipientInfo);

    // Extract timestamp
    console.log('[Message Extractor] ⏰ Extracting timestamp...');
    const timestamp = extractMessageTimestamp(messageElement);
    console.log('[Message Extractor] ⏰ Timestamp:', timestamp);

    // Extract attachments
    console.log('[Message Extractor] 📎 Extracting attachments...');
    const attachments = extractMessageAttachments(messageElement);
    console.log('[Message Extractor] 📎 Attachments:', attachments);

    // Determine message type
    console.log('[Message Extractor] 🎬 Determining message type...');
    const messageType = determineMessageType(messageElement);
    console.log('[Message Extractor] 🎬 Message type:', messageType);

    // Check if it's a group conversation
    console.log('[Message Extractor] 👥 Checking if group conversation...');
    const isGroup = isGroupConversation();
    console.log('[Message Extractor] 👥 Is group:', isGroup);

    // Extract group members if applicable
    let groupMembers: string[] | undefined;
    if (isGroup) {
      console.log('[Message Extractor] 👥 Extracting group members...');
      groupMembers = extractGroupMembers(messageElement);
      console.log('[Message Extractor] 👥 Group members:', groupMembers);
    }

    // Validate required fields
    if (!messageText && attachments.length === 0) {
      console.warn('[Message Extractor] ❌ No message content found');
      return null;
    }

    if (!recipientInfo.recipientName) {
      console.warn('[Message Extractor] ❌ No recipient information found');
      return null;
    }

    return {
      messageId,
      conversationId,
      recipientName: recipientInfo.recipientName,
      recipientProfileUrl: recipientInfo.recipientProfileUrl,
      messageText,
      timestamp,
      messageType,
      attachments,
      isGroupMessage: isGroup,
      groupMembers,
      conversationContext,
    };
  } catch (error) {
    console.error('[Message Extractor] 💥 Error extracting message data:', error);
    return null;
  }
}

/**
 * Extract message text from either sent message or composer
 */
function extractMessageText(messageElement: Element, composerElement?: Element): string {
  // If we have a composer element, extract text from it (for outgoing messages)
  if (composerElement) {
    const textArea = composerElement.querySelector(MESSAGING_SELECTORS.messageTextArea);
    if (textArea) {
      // For contenteditable divs, use textContent or innerText
      const text = textArea.textContent || textArea.getAttribute('data-text') || '';
      if (text.trim()) {
        return sanitizeMessageText(text.trim());
      }
    }
  }

  // Extract from existing message element (for sent messages in thread)
  const messageTextSelectors = [
    MESSAGING_SELECTORS.messageText,
    MESSAGING_SELECTORS.messageContent,
    '.msg-s-event-listitem__message-body',
    '.msg-s-message-bubble__content',
    '.artdeco-entity-lockup__caption',
  ];

  for (const selector of messageTextSelectors) {
    const textElement = messageElement.querySelector(selector);
    if (textElement) {
      const text = textElement.textContent?.trim() || textElement.innerHTML?.trim() || '';
      if (text) {
        return sanitizeMessageText(text);
      }
    }
  }

  // Fallback: extract any text content from the message element
  const fallbackText = messageElement.textContent?.trim() || '';
  return sanitizeMessageText(fallbackText);
}

/**
 * Extract recipient information from conversation header
 */
function extractRecipientInfo(fromElement?: Element): {
  recipientName: string;
  recipientProfileUrl: string;
} {
  const conversationHeader = findConversationHeader(fromElement);

  if (!conversationHeader) {
    console.warn('[Message Extractor] ❌ No conversation header found');
    return { recipientName: '', recipientProfileUrl: '' };
  }

  // Extract recipient name
  let recipientName = '';
  const nameSelectors = [
    MESSAGING_SELECTORS.recipientName,
    MESSAGING_SELECTORS.conversationTitle,
    '.msg-entity-lockup__entity-title',
    '.msg-thread-header__title',
    '.msg-overlay-bubble-header__title',
  ];

  for (const selector of nameSelectors) {
    const nameElement = conversationHeader.querySelector(selector);
    if (nameElement) {
      recipientName = nameElement.textContent?.trim() || '';
      if (recipientName) break;
    }
  }

  // Extract recipient profile URL
  let recipientProfileUrl = '';
  const profileSelectors = [
    MESSAGING_SELECTORS.recipientProfile,
    '.msg-entity-lockup__link',
    '.msg-thread-header__profile-link',
    'a[href*="/in/"]',
  ];

  for (const selector of profileSelectors) {
    const profileElement = conversationHeader.querySelector(selector) as HTMLAnchorElement;
    if (profileElement?.href) {
      recipientProfileUrl = profileElement.href;
      break;
    }
  }

  // If no direct profile link, try to construct from name or other indicators
  if (!recipientProfileUrl && recipientName) {
    // Look for profile identifier in conversation context
    const profileMatch = window.location.href.match(/thread\/([^/]+)/);
    if (profileMatch) {
      recipientProfileUrl = `https://www.linkedin.com/in/${profileMatch[1]}/`;
    }
  }

  return { recipientName, recipientProfileUrl };
}

/**
 * Extract message timestamp
 */
function extractMessageTimestamp(messageElement: Element): string {
  const timestampSelectors = [
    MESSAGING_SELECTORS.messageTimestamp,
    '.msg-s-message-list__time-heading time',
    '.msg-s-event__timestamp',
    'time[datetime]',
    '.msg-timestamp',
  ];

  for (const selector of timestampSelectors) {
    const timestampElement = messageElement.querySelector(selector);
    if (timestampElement) {
      // Try to get datetime attribute first
      const datetime = timestampElement.getAttribute('datetime');
      if (datetime) return datetime;

      // Fallback to text content
      const timeText = timestampElement.textContent?.trim();
      if (timeText) return timeText;
    }
  }

  // Look in the broader message context for timestamp
  const messageContainer = messageElement.closest('.msg-s-message-list__event, .msg-s-event');
  if (messageContainer) {
    for (const selector of timestampSelectors) {
      const timestampElement = messageContainer.querySelector(selector);
      if (timestampElement) {
        const datetime =
          timestampElement.getAttribute('datetime') || timestampElement.textContent?.trim();
        if (datetime) return datetime;
      }
    }
  }

  return new Date().toISOString(); // Fallback to current time
}

/**
 * Extract message attachments and media
 */
function extractMessageAttachments(messageElement: Element): MessageAttachment[] {
  const attachments: MessageAttachment[] = [];

  // Extract images
  const images = extractImageAttachments(messageElement);
  attachments.push(...images);

  // Extract documents
  const documents = extractDocumentAttachments(messageElement);
  attachments.push(...documents);

  // Extract links
  const links = extractLinkAttachments(messageElement);
  attachments.push(...links);

  // Extract voice messages
  const voiceMessages = extractVoiceAttachments(messageElement);
  attachments.push(...voiceMessages);

  // Extract video messages
  const videoMessages = extractVideoAttachments(messageElement);
  attachments.push(...videoMessages);

  return attachments;
}

/**
 * Extract image attachments
 */
function extractImageAttachments(messageElement: Element): MessageAttachment[] {
  const images: MessageAttachment[] = [];

  const imageElements = messageElement.querySelectorAll(MESSAGING_SELECTORS.imageAttachment);
  imageElements.forEach(img => {
    const image = img as HTMLImageElement;
    if (image.src && !image.src.includes('data:') && !image.src.includes('blob:')) {
      images.push({
        type: 'image',
        url: image.src,
        title: image.alt || image.title || undefined,
        description: 'Image attachment',
      });
    }
  });

  return images;
}

/**
 * Extract document attachments
 */
function extractDocumentAttachments(messageElement: Element): MessageAttachment[] {
  const documents: MessageAttachment[] = [];

  const docElements = messageElement.querySelectorAll(MESSAGING_SELECTORS.documentAttachment);
  docElements.forEach(doc => {
    const titleElement = doc.querySelector('.msg-attachment__title, .document-title');
    const linkElement = doc.querySelector('a[href]') as HTMLAnchorElement;
    const sizeElement = doc.querySelector('.msg-attachment__size, .document-size');

    if (titleElement || linkElement) {
      documents.push({
        type: 'document',
        url: linkElement?.href || undefined,
        title: titleElement?.textContent?.trim() || undefined,
        description: 'Document attachment',
        size: sizeElement?.textContent?.trim() || undefined,
      });
    }
  });

  return documents;
}

/**
 * Extract link attachments
 */
function extractLinkAttachments(messageElement: Element): MessageAttachment[] {
  const links: MessageAttachment[] = [];

  const linkElements = messageElement.querySelectorAll(MESSAGING_SELECTORS.linkAttachment);
  linkElements.forEach(link => {
    const titleElement = link.querySelector('.msg-attachment__title, .link-preview-title');
    const descElement = link.querySelector(
      '.msg-attachment__description, .link-preview-description',
    );
    const urlElement = link.querySelector('a[href]') as HTMLAnchorElement;

    if (titleElement || urlElement) {
      links.push({
        type: 'link',
        url: urlElement?.href || undefined,
        title: titleElement?.textContent?.trim() || undefined,
        description: descElement?.textContent?.trim() || 'Link attachment',
      });
    }
  });

  return links;
}

/**
 * Extract voice message attachments
 */
function extractVoiceAttachments(messageElement: Element): MessageAttachment[] {
  const voiceMessages: MessageAttachment[] = [];

  const voiceElements = messageElement.querySelectorAll(MESSAGING_SELECTORS.voiceMessage);
  voiceElements.forEach(voice => {
    const audioElement = voice.querySelector('audio') as HTMLAudioElement;
    const durationElement = voice.querySelector('.voice-duration, .msg-voice-duration');

    voiceMessages.push({
      type: 'voice',
      url: audioElement?.src || undefined,
      title: 'Voice message',
      description: `Voice message${durationElement ? ` (${durationElement.textContent?.trim()})` : ''}`,
    });
  });

  return voiceMessages;
}

/**
 * Extract video message attachments
 */
function extractVideoAttachments(messageElement: Element): MessageAttachment[] {
  const videoMessages: MessageAttachment[] = [];

  const videoElements = messageElement.querySelectorAll(MESSAGING_SELECTORS.videoMessage);
  videoElements.forEach(video => {
    const videoElement = video.querySelector('video') as HTMLVideoElement;
    const thumbnailElement = video.querySelector('img') as HTMLImageElement;

    videoMessages.push({
      type: 'video',
      url: videoElement?.src || videoElement?.currentSrc || thumbnailElement?.src || undefined,
      title: 'Video message',
      description: 'Video attachment',
    });
  });

  return videoMessages;
}

/**
 * Extract group conversation members
 */
function extractGroupMembers(fromElement?: Element): string[] {
  const members: string[] = [];

  const conversationHeader = findConversationHeader(fromElement);
  if (!conversationHeader) return members;

  const memberElements = conversationHeader.querySelectorAll(MESSAGING_SELECTORS.groupMember);
  memberElements.forEach(member => {
    const nameElement = member.querySelector('.msg-participant__name, .entity-name');
    if (nameElement) {
      const memberName = nameElement.textContent?.trim();
      if (memberName) {
        members.push(memberName);
      }
    }
  });

  return members;
}

/**
 * Validate that the extracted message data is complete and valid
 */
export function validateMessageData(data: MessageData | null): data is MessageData {
  if (!data) return false;

  // Check required fields
  if (!data.messageId || !data.conversationId || !data.recipientName) {
    console.warn('[Message Extractor] ❌ Missing required fields:', {
      messageId: !!data.messageId,
      conversationId: !!data.conversationId,
      recipientName: !!data.recipientName,
    });
    return false;
  }

  // Check that we have either message text or attachments
  if (!data.messageText && (!data.attachments || data.attachments.length === 0)) {
    console.warn('[Message Extractor] ❌ No message content or attachments found');
    return false;
  }

  return true;
}

/**
 * Sanitize extracted message text
 */
function sanitizeMessageText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Extract message data from a composer before sending
 * This is called when user clicks send button
 */
export function extractPreSendMessageData(composerElement: Element): Partial<MessageData> | null {
  try {
    console.log('[Message Extractor] 🚀 Extracting pre-send message data');

    const messageText = extractMessageText(composerElement, composerElement);
    const recipientInfo = extractRecipientInfo(composerElement);
    const conversationContext = getConversationContext();
    const conversationId = getConversationId(composerElement);
    const isGroup = isGroupConversation();

    console.log('[Message Extractor] 🚀 Pre-send data:', {
      messageText,
      recipientName: recipientInfo.recipientName,
      conversationContext,
      isGroup,
    });

    if (
      !messageText.trim() &&
      !composerElement.querySelector(MESSAGING_SELECTORS.messageAttachment)
    ) {
      console.warn('[Message Extractor] ❌ No message content to extract pre-send');
      return null;
    }

    return {
      conversationId,
      recipientName: recipientInfo.recipientName,
      recipientProfileUrl: recipientInfo.recipientProfileUrl,
      messageText,
      timestamp: new Date().toISOString(),
      messageType: 'text', // Default, will be updated based on actual content
      attachments: [], // Will be extracted after send
      isGroupMessage: isGroup,
      conversationContext,
    };
  } catch (error) {
    console.error('[Message Extractor] 💥 Error extracting pre-send message data:', error);
    return null;
  }
}
