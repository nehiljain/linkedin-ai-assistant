import { sendToBackground } from '@plasmohq/messaging';

import {
  extractMessageData,
  extractPreSendMessageData,
  validateMessageData,
} from './message-extractor';
import {
  debounceMessaging,
  findActiveMessageComposer,
  findSendButton,
  isLinkedInMessagingPage,
  MESSAGING_SELECTORS,
  waitForMessagingReady,
  type MessageData,
} from './messaging-dom';

/**
 * MessageTracker class for tracking LinkedIn direct messages
 * Integrates with the existing LinkedInAiAssistant architecture
 */
export class MessageTracker {
  private isInitialized = false;
  private trackedSendButtons = new Set<Element>();
  private lastMessageCapture = new Map<string, number>(); // Prevent duplicate captures
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupCleanupInterval();
  }

  /**
   * Initialize message tracking
   */
  public async initialize() {
    if (this.isInitialized) return;

    console.log('[Message Tracker] 💬 Initializing...');

    // Only run on LinkedIn messaging pages or if messaging interfaces are present
    if (
      !isLinkedInMessagingPage() &&
      !document.querySelector(MESSAGING_SELECTORS.messagingContainer)
    ) {
      console.log('[Message Tracker] ❌ Not a messaging interface, skipping initialization');
      return;
    }

    // Wait for messaging interface to be ready
    await waitForMessagingReady();

    this.startTracking();
    this.isInitialized = true;
    console.log('[Message Tracker] ✅ Message tracking initialized successfully');
  }

  /**
   * Start tracking messaging activities
   */
  private startTracking() {
    // Initial scan for existing send buttons
    this.scanForSendButtons();

    // Listen for DOM changes to detect new messaging interfaces
    const debouncedScan = debounceMessaging(this.scanForSendButtons.bind(this), 1000);

    // Use MutationObserver to detect new messaging interfaces
    const mutationObserver = new MutationObserver(mutations => {
      const hasMessagingChanges = mutations.some(
        mutation =>
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(
            node =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches(
                '.msg-form, .msg-overlay-bubble, .msg-s-modal, .msg-thread',
              ),
          ),
      );

      if (hasMessagingChanges) {
        console.log('[Message Tracker] 🔍 Detected messaging interface changes');
        debouncedScan();
      }
    });

    // Observe the main document for messaging changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for navigation changes (LinkedIn SPA)
    let currentUrl = window.location.href;
    const checkNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('[Message Tracker] 🧭 Navigation detected, rescanning...');
        setTimeout(() => this.scanForSendButtons(), 1000);
      }
    };

    setInterval(checkNavigation, 2000);

    // Listen for keyboard events (Enter key in message composer)
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this), true);

    console.log('[Message Tracker] 🎯 Message tracking listeners established');
  }

  /**
   * Scan for send buttons and attach event listeners
   */
  private scanForSendButtons() {
    console.log('[Message Tracker] 🔍 Scanning for send buttons...');

    // Find all send buttons in different messaging contexts
    const sendButtonSelectors = [
      MESSAGING_SELECTORS.sendButton,
      MESSAGING_SELECTORS.sendButtonEnabled,
      MESSAGING_SELECTORS.miniChatSendButton,
      MESSAGING_SELECTORS.profileMessageSend,
    ];

    const allSendButtons = new Set<Element>();

    sendButtonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => allSendButtons.add(button));
    });

    console.log(`[Message Tracker] 🔍 Found ${allSendButtons.size} send buttons`);

    allSendButtons.forEach(button => {
      if (!this.trackedSendButtons.has(button)) {
        console.log('[Message Tracker] 🎯 Adding listener to send button:', button);
        this.attachSendButtonListener(button);
        this.trackedSendButtons.add(button);
      }
    });

    // Clean up listeners for buttons that no longer exist
    this.trackedSendButtons.forEach(button => {
      if (!document.contains(button)) {
        console.log('[Message Tracker] 🧹 Removing listener from removed button');
        this.trackedSendButtons.delete(button);
      }
    });
  }

  /**
   * Attach event listener to a send button
   */
  private attachSendButtonListener(sendButton: Element) {
    const handleSendClick = async (_event: Event) => {
      console.log('[Message Tracker] 🚀 Send button clicked:', sendButton);

      try {
        // Find the associated message composer
        const composer = this.findComposerForSendButton(sendButton);
        if (!composer) {
          console.warn('[Message Tracker] ❌ No composer found for send button');
          return;
        }

        // Extract message data before sending
        const preSendData = extractPreSendMessageData(composer);
        if (!preSendData) {
          console.warn('[Message Tracker] ❌ No valid pre-send data extracted');
          return;
        }

        console.log('[Message Tracker] 📊 Pre-send data extracted:', preSendData);

        // Check for duplicate capture prevention
        const captureKey = `${preSendData.conversationId}-${preSendData.messageText?.substring(0, 50)}`;
        const lastCapture = this.lastMessageCapture.get(captureKey);
        const now = Date.now();

        if (lastCapture && now - lastCapture < 5000) {
          // 5 second debounce
          console.log('[Message Tracker] ⏭️ Skipping duplicate message capture');
          return;
        }

        this.lastMessageCapture.set(captureKey, now);

        // Wait a bit for the message to be sent and appear in the thread
        setTimeout(async () => {
          await this.captureMessageFromThread(preSendData, composer);
        }, 1500);
      } catch (error) {
        console.error('[Message Tracker] 💥 Error handling send button click:', error);
      }
    };

    // Add click event listener
    sendButton.addEventListener('click', handleSendClick, { capture: true });

    // Also listen for form submission
    const form = sendButton.closest('form, .msg-form');
    if (form) {
      form.addEventListener('submit', handleSendClick, { capture: true });
    }
  }

  /**
   * Handle keyboard shortcuts (e.g., Ctrl+Enter or Enter to send)
   */
  private handleKeyboardShortcuts(event: KeyboardEvent) {
    // Check for Enter key in message composer
    if (event.key === 'Enter' && !event.shiftKey) {
      const target = event.target as Element;

      // Check if we're in a message composer
      if (target.matches(MESSAGING_SELECTORS.messageTextArea)) {
        console.log('[Message Tracker] ⌨️ Enter key detected in message composer');

        // Find the associated send button
        const composer = target.closest('.msg-form, .msg-overlay-bubble, .msg-s-modal');
        if (composer) {
          const sendButton = findSendButton(composer);
          if (sendButton && !sendButton.hasAttribute('disabled')) {
            console.log('[Message Tracker] ⌨️ Triggering send via keyboard shortcut');
            setTimeout(() => {
              this.handleMessageSent(composer, target);
            }, 500);
          }
        }
      }
    }
  }

  /**
   * Handle message sent via keyboard shortcut
   */
  private async handleMessageSent(composer: Element, _textArea: Element) {
    try {
      const preSendData = extractPreSendMessageData(composer);
      if (!preSendData) {
        console.warn('[Message Tracker] ❌ No valid keyboard shortcut data extracted');
        return;
      }

      // Check for duplicate prevention
      const captureKey = `${preSendData.conversationId}-${preSendData.messageText?.substring(0, 50)}`;
      const lastCapture = this.lastMessageCapture.get(captureKey);
      const now = Date.now();

      if (lastCapture && now - lastCapture < 5000) {
        console.log('[Message Tracker] ⏭️ Skipping duplicate keyboard message capture');
        return;
      }

      this.lastMessageCapture.set(captureKey, now);

      setTimeout(async () => {
        await this.captureMessageFromThread(preSendData, composer);
      }, 1500);
    } catch (error) {
      console.error('[Message Tracker] 💥 Error handling keyboard message:', error);
    }
  }

  /**
   * Capture the actual sent message from the message thread
   */
  private async captureMessageFromThread(
    preSendData: Partial<MessageData>,
    composerElement: Element,
  ) {
    try {
      console.log('[Message Tracker] 📡 Capturing message from thread...');

      // Find the message thread container
      const threadContainer =
        composerElement.closest('.msg-thread, .msg-overlay-bubble, .msg-s-modal') ||
        document.querySelector(MESSAGING_SELECTORS.messageThread);

      if (!threadContainer) {
        console.warn('[Message Tracker] ❌ No message thread found');
        return;
      }

      // Find the most recent outgoing message
      const sentMessages = threadContainer.querySelectorAll(MESSAGING_SELECTORS.sentMessage);
      const latestMessage = sentMessages[sentMessages.length - 1];

      if (!latestMessage) {
        console.warn('[Message Tracker] ❌ No sent message found in thread');
        // Fallback: use pre-send data
        await this.sendMessageToBackground(preSendData);
        return;
      }

      // Extract full message data from the sent message
      const messageData = extractMessageData(latestMessage, composerElement);

      if (!validateMessageData(messageData)) {
        console.warn('[Message Tracker] ❌ Invalid message data extracted from thread');
        // Fallback: use pre-send data
        await this.sendMessageToBackground(preSendData);
        return;
      }

      console.log('[Message Tracker] ✅ Valid message data extracted:', messageData);
      await this.sendMessageToBackground(messageData);
    } catch (error) {
      console.error('[Message Tracker] 💥 Error capturing from thread:', error);
      // Fallback: use pre-send data
      await this.sendMessageToBackground(preSendData);
    }
  }

  /**
   * Send message data to background script
   */
  private async sendMessageToBackground(messageData: MessageData | Partial<MessageData>) {
    try {
      console.log('[Message Tracker] 📡 Sending message data to background...');

      const response = await sendToBackground({
        name: 'captureMessage',
        body: messageData,
      });

      console.log('[Message Tracker] 📡 Background response:', response);

      if (!response.success) {
        console.error('[Message Tracker] ❌ Background script failed:', response.error);
        throw new Error(response.error || 'Failed to capture message');
      }

      console.log('[Message Tracker] 🎉 Message captured successfully!');
    } catch (error) {
      console.error('[Message Tracker] 💥 Error sending to background:', error);
      throw error;
    }
  }

  /**
   * Find the composer element associated with a send button
   */
  private findComposerForSendButton(sendButton: Element): Element | null {
    // Look for composer in the same container as the send button
    const container = sendButton.closest(
      '.msg-form, .msg-overlay-bubble, .msg-s-modal, .msg-thread',
    );
    if (container) {
      const composer = container.querySelector(MESSAGING_SELECTORS.messageComposer);
      if (composer) return composer;
    }

    // Fallback: find any active composer
    return findActiveMessageComposer();
  }

  /**
   * Cleanup resources and stop tracking
   */
  public cleanup() {
    console.log('[Message Tracker] 🧹 Cleaning up...');

    this.trackedSendButtons.clear();
    this.lastMessageCapture.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isInitialized = false;
    console.log('[Message Tracker] ✅ Message tracker cleaned up');
  }

  /**
   * Setup periodic cleanup of old capture data
   */
  private setupCleanupInterval() {
    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes

        // Clean up old capture records
        this.lastMessageCapture.forEach((timestamp, key) => {
          if (now - timestamp > maxAge) {
            this.lastMessageCapture.delete(key);
          }
        });

        console.log(
          `[Message Tracker] 🧹 Cleanup completed. Tracking ${this.trackedSendButtons.size} buttons, ${this.lastMessageCapture.size} recent captures.`,
        );
      },
      5 * 60 * 1000,
    ); // Run every 5 minutes
  }

  /**
   * Get current tracking stats for debugging
   */
  public getStats() {
    return {
      isInitialized: this.isInitialized,
      trackedSendButtons: this.trackedSendButtons.size,
      recentCaptures: this.lastMessageCapture.size,
      isMessagingPage: isLinkedInMessagingPage(),
      hasMessagingContainer: !!document.querySelector(MESSAGING_SELECTORS.messagingContainer),
    };
  }
}
