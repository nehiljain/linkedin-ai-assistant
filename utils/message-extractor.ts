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
    if ((!messageText || messageText.trim() === '') && attachments.length === 0) {
      console.warn(
        '[Message Extractor] ❌ No message content found or text is empty after sanitization',
      );
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
  console.log('[Message Extractor] 📝 Extracting message text...', {
    hasComposer: !!composerElement,
    hasMessageElement: !!messageElement,
  });

  // If we have a composer element, extract text from it (for outgoing messages)
  if (composerElement) {
    console.log('[Message Extractor] 📝 Extracting from composer...');

    const textAreaSelectors = [
      // Specific selector based on the provided DOM structure
      '.msg-form__contenteditable.t-14.t-black--light.t-normal.flex-grow-1.full-height.notranslate[contenteditable="true"]',
      '.msg-form__contenteditable[contenteditable="true"]',
      MESSAGING_SELECTORS.messageTextArea,
      '.msg-form__contenteditable',
      '[contenteditable="true"]',
      '.msg-form__msg-content-container [contenteditable]',
    ];

    for (const selector of textAreaSelectors) {
      const textArea = composerElement.querySelector(selector);
      if (textArea) {
        console.log(`[Message Extractor] 📝 Found text area with selector: ${selector}`);
        console.log(`[Message Extractor] 📝 Text area HTML:`, textArea.outerHTML.substring(0, 200));

        // For contenteditable divs, try multiple extraction methods
        let text = '';

        // Method 1: Get text from paragraph elements inside
        const paragraphs = textArea.querySelectorAll('p');
        if (paragraphs.length > 0) {
          text = Array.from(paragraphs)
            .map(p => p.textContent?.trim())
            .filter(t => t && t !== '')
            .join(' ');
          console.log(`[Message Extractor] 📝 Extracted text from paragraphs: ${text}`);
        }

        // Method 2: Use textContent directly
        if (!text) {
          text = textArea.textContent || textArea.getAttribute('data-text') || '';
          console.log(`[Message Extractor] 📝 Extracted text from textContent: ${text}`);
        }

        // Method 3: Use innerText
        if (!text && 'innerText' in textArea) {
          text = (textArea as HTMLElement).innerText || '';
          console.log(`[Message Extractor] 📝 Extracted text from innerText: ${text}`);
        }

        // Clean up common placeholder text and UI elements
        text = text
          .replace(/Write a message…/g, '')
          .replace(/Drag your file here\./g, '')
          .replace(/Select your file/g, '')
          .replace(/Or drag & drop next time/g, '')
          .replace(/Open Emoji Keyboard/g, '')
          .replace(/Send/g, '')
          .replace(/Open send options/g, '')
          .replace(/Maximize compose field/g, '')
          .replace(/Attach an image to your conversation with/g, '')
          .replace(/Attach a file to your conversation with/g, '')
          .replace(/Add an emoji/g, '')
          .replace(/Record a voice message/g, '')
          .replace(/Send a video message/g, '')
          .replace(/GIF/g, '')
          .trim();

        if (text) {
          console.log(`[Message Extractor] 📝 Final extracted composer text: ${text}`);
          return sanitizeMessageText(text);
        }
      }
    }

    console.log('[Message Extractor] 📝 No text found in composer');
  }

  // Extract from existing message element (for sent messages in thread)
  // Updated selectors based on the actual DOM structure
  const messageTextSelectors = [
    // Specific selector for message body based on DOM structure
    '.msg-s-event-listitem__body.t-14.t-black--light.t-normal',
    '.msg-s-event-listitem__body',
    'p.msg-s-event-listitem__body',
    MESSAGING_SELECTORS.messageText,
    MESSAGING_SELECTORS.messageContent,
    '.msg-s-event-listitem__message-body',
    '.msg-s-message-bubble__content',
    '.artdeco-entity-lockup__caption',
    '.msg-s-event__content p',
    '.msg-s-event__content',
  ];

  for (const selector of messageTextSelectors) {
    const textElement = messageElement.querySelector(selector);
    if (textElement) {
      const text = textElement.textContent?.trim() || textElement.innerHTML?.trim() || '';
      console.log(`[Message Extractor] 📝 Found text with selector '${selector}': ${text}`);
      if (text) {
        return sanitizeMessageText(text);
      }
    }
  }

  // Fallback: extract any text content from the message element
  const fallbackText = messageElement.textContent?.trim() || '';
  console.log(`[Message Extractor] 📝 Fallback text: ${fallbackText}`);
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

  console.log('[Message Extractor] 👤 Found conversation header:', conversationHeader);

  // Extract recipient name - Updated based on actual DOM structure
  let recipientName = '';
  const nameSelectors = [
    // Specific selectors based on the actual DOM structure
    '.msg-overlay-bubble-header__title .t-14.t-bold.hoverable-link-text.t-black',
    '.msg-overlay-bubble-header__title span.t-14.t-bold.hoverable-link-text',
    '.msg-overlay-bubble-header__title a span',
    '.msg-overlay-bubble-header__title .hoverable-link-text',
    // Original selectors as fallbacks
    MESSAGING_SELECTORS.recipientName,
    MESSAGING_SELECTORS.conversationTitle,
    '.msg-entity-lockup__entity-title',
    '.msg-thread-header__title',
    '.msg-overlay-bubble-header__title',
    '.msg-overlay-bubble-header__title span',
  ];

  for (const selector of nameSelectors) {
    const nameElement = conversationHeader.querySelector(selector);
    if (nameElement) {
      recipientName = nameElement.textContent?.trim() || '';
      if (recipientName) {
        console.log(
          `[Message Extractor] 👤 Found recipient name with selector '${selector}': ${recipientName}`,
        );
        break;
      }
    }
  }

  // If still no name found, try alternative extraction methods
  if (!recipientName) {
    console.log('[Message Extractor] 👤 Trying alternative name extraction methods...');
    console.log(
      '[Message Extractor] 👤 Header HTML:',
      conversationHeader.outerHTML.substring(0, 500),
    );

    // Try to extract from any link within the header
    const linkElement = conversationHeader.querySelector('a[href*="/in/"] span');
    if (linkElement) {
      recipientName = linkElement.textContent?.trim() || '';
      console.log(`[Message Extractor] 👤 Found recipient name from link: ${recipientName}`);
    }

    // Try to extract from h2 title element (based on DOM structure)
    if (!recipientName) {
      const h2Element = conversationHeader.querySelector('h2.msg-overlay-bubble-header__title');
      if (h2Element) {
        recipientName = h2Element.textContent?.trim() || '';
        console.log(`[Message Extractor] 👤 Found recipient name from h2: ${recipientName}`);
      }
    }

    // Try to extract from title attributes
    if (!recipientName) {
      const titleElement = conversationHeader.querySelector('[title*=","]');
      if (titleElement) {
        recipientName = titleElement.getAttribute('title')?.trim() || '';
        console.log(`[Message Extractor] 👤 Found recipient name from title: ${recipientName}`);
      }
    }

    // Last resort: extract from any text content that looks like a name
    if (!recipientName) {
      const allTextContent = conversationHeader.textContent || '';
      const nameMatch = allTextContent.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:, [A-Z-]+)*)/);
      if (nameMatch) {
        recipientName = nameMatch[1].trim();
        console.log(
          `[Message Extractor] 👤 Found recipient name from text content: ${recipientName}`,
        );
      }
    }
  }

  // Extract recipient profile URL
  let recipientProfileUrl = '';
  const profileSelectors = [
    MESSAGING_SELECTORS.recipientProfile,
    '.msg-entity-lockup__link',
    '.msg-thread-header__profile-link',
    'a[href*="/in/"]',
    'a[href*="ACoA"]', // LinkedIn profile format
  ];

  for (const selector of profileSelectors) {
    const profileElement = conversationHeader.querySelector(selector) as HTMLAnchorElement;
    if (profileElement?.href) {
      recipientProfileUrl = profileElement.href;
      console.log(
        `[Message Extractor] 👤 Found profile URL with selector '${selector}': ${recipientProfileUrl}`,
      );
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

  console.log('[Message Extractor] 👤 Final extraction result:', {
    recipientName,
    recipientProfileUrl,
  });
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
  const cleaned = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();

  // Filter out known UI placeholder text patterns
  const uiPlaceholderPatterns = [
    /^Drag your file here\.\s*Select your file/,
    /Or drag & drop next time/,
    /Maximize compose field/,
    /Attach an image to your conversation with/,
    /Attach a file to your conversation with/,
    /Open Emoji Keyboard/,
    /Send Open send options/,
    /^Write a message…$/,
    /^Send$/,
    /^GIF$/,
    /Add an emoji/,
    /Record a voice message/,
    /Send a video message/,
  ];

  // Check if the text matches any UI placeholder pattern
  for (const pattern of uiPlaceholderPatterns) {
    if (pattern.test(cleaned)) {
      console.log(`[Message Extractor] 🚫 Filtered out UI placeholder text: "${cleaned}"`);
      return ''; // Return empty string for UI placeholders
    }
  }

  // Additional check for combined UI text that contains multiple placeholder elements
  const combinedUIPattern = /Drag your file here.*Select your file.*Or drag.*drop.*time/;
  if (combinedUIPattern.test(cleaned)) {
    console.log(`[Message Extractor] 🚫 Filtered out combined UI placeholder text: "${cleaned}"`);
    return '';
  }

  return cleaned;
}

/**
 * Extract message data from a composer before sending
 * This is called when user clicks send button
 */
export function extractPreSendMessageData(composerElement: Element): Partial<MessageData> | null {
  try {
    console.log('[Message Extractor] 🚀 Extracting pre-send message data');
    console.log('[Message Extractor] 🚀 Composer element:', composerElement);

    // First, try to find the actual text input area within the composer
    const textInputSelectors = [
      '.msg-form__contenteditable[contenteditable="true"]',
      '.msg-form__contenteditable',
      '[contenteditable="true"]',
      'div[role="textbox"]',
    ];

    let messageText = '';
    for (const selector of textInputSelectors) {
      const textInput = composerElement.querySelector(selector);
      if (textInput) {
        console.log(`[Message Extractor] 🚀 Found text input with selector: ${selector}`);
        console.log(
          `[Message Extractor] 🚀 Text input HTML:`,
          textInput.outerHTML.substring(0, 300),
        );

        // Try multiple extraction methods
        const paragraphs = textInput.querySelectorAll('p');
        if (paragraphs.length > 0) {
          messageText = Array.from(paragraphs)
            .map(p => p.textContent?.trim())
            .filter(t => t && t !== '')
            .join(' ');
          console.log(`[Message Extractor] 🚀 Extracted from paragraphs: "${messageText}"`);
        }

        if (!messageText) {
          messageText = textInput.textContent?.trim() || '';
          console.log(`[Message Extractor] 🚀 Extracted from textContent: "${messageText}"`);
        }

        if (!messageText && 'innerText' in textInput) {
          messageText = (textInput as HTMLElement).innerText?.trim() || '';
          console.log(`[Message Extractor] 🚀 Extracted from innerText: "${messageText}"`);
        }

        if (messageText) break;
      }
    }

    // Fallback: try to extract from the full composer element
    if (!messageText) {
      messageText = extractMessageText(composerElement, composerElement);
    }

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
      (!messageText || !messageText.trim()) &&
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
