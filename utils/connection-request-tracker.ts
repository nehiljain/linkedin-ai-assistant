import { sendToBackground } from '@plasmohq/messaging';

import {
  CONNECTION_REQUEST_SELECTORS,
  debounceConnectionRequest,
  findConnectionSendButton,
  isConnectionRequestModalOpen,
  waitForConnectionModalReady,
  type ConnectionRequestData,
} from './connection-request-dom';
import {
  extractConfirmedConnectionRequestData,
  extractDirectConnectionRequestData,
  extractPreSendConnectionRequestData,
  validateConnectionRequestDataComplete,
} from './connection-request-extractor';

/**
 * ConnectionRequestTracker class for tracking LinkedIn connection requests with messages
 * Integrates with the existing LinkedInAiAssistant architecture
 */
export class ConnectionRequestTracker {
  private isInitialized = false;
  private trackedConnectButtons = new Set<Element>();
  private trackedSendButtons = new Set<Element>();
  private lastRequestCapture = new Map<string, number>(); // Prevent duplicate captures
  private cleanupInterval: NodeJS.Timeout | null = null;
  private modalObserver: MutationObserver | null = null;

  constructor() {
    this.setupCleanupInterval();
  }

  /**
   * Initialize connection request tracking
   */
  public async initialize() {
    if (this.isInitialized) return;

    console.log('[Connection Request Tracker] 🤝 Initializing...');

    this.startTracking();
    this.setupModalObserver();
    this.isInitialized = true;
    console.log(
      '[Connection Request Tracker] ✅ Connection request tracking initialized successfully',
    );
  }

  /**
   * Start tracking connection request activities
   */
  private startTracking() {
    // Initial scan for existing connect buttons
    this.scanForConnectButtons();

    // Listen for DOM changes to detect new connect buttons
    const debouncedScan = debounceConnectionRequest(this.scanForConnectButtons.bind(this), 1000);

    // Use MutationObserver to detect new connection interfaces
    const mutationObserver = new MutationObserver(mutations => {
      const hasConnectionChanges = mutations.some(
        mutation =>
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(
            node =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches(
                '.artdeco-button, .connect-button, .reusable-search__result-container, .discover-cohort-card',
              ),
          ),
      );

      if (hasConnectionChanges) {
        console.log('[Connection Request Tracker] 🔍 Detected connection interface changes');
        debouncedScan();
      }
    });

    // Observe the main document for connection changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for navigation changes (LinkedIn SPA)
    let currentUrl = window.location.href;
    const checkNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('[Connection Request Tracker] 🧭 Navigation detected, rescanning...');
        setTimeout(() => this.scanForConnectButtons(), 1000);
      }
    };

    setInterval(checkNavigation, 2000);

    console.log(
      '[Connection Request Tracker] 🎯 Connection request tracking listeners established',
    );
  }

  /**
   * Setup modal observer to track connection request modals
   */
  private setupModalObserver() {
    this.modalObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if a connection request modal was added
            if (
              element.matches(CONNECTION_REQUEST_SELECTORS.connectionModal) ||
              element.querySelector(CONNECTION_REQUEST_SELECTORS.connectionModal)
            ) {
              console.log('[Connection Request Tracker] 📱 Connection modal detected');
              this.handleModalAppeared();
            }
          }
        });
      });
    });

    this.modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Handle when connection request modal appears
   */
  private async handleModalAppeared() {
    try {
      console.log('[Connection Request Tracker] 📱 Handling modal appearance...');

      // Wait for modal to be fully ready
      await waitForConnectionModalReady();

      // Find and track the send button
      const sendButton = findConnectionSendButton();
      if (sendButton && !this.trackedSendButtons.has(sendButton)) {
        console.log('[Connection Request Tracker] 🎯 Adding listener to modal send button');
        this.attachModalSendButtonListener(sendButton);
        this.trackedSendButtons.add(sendButton);
      }
    } catch (error) {
      console.error('[Connection Request Tracker] 💥 Error handling modal appearance:', error);
    }
  }

  /**
   * Scan for connect buttons and attach event listeners
   */
  private scanForConnectButtons() {
    console.log('[Connection Request Tracker] 🔍 Scanning for connect buttons...');

    // Find all connect buttons in different contexts
    const connectButtonSelectors = [
      CONNECTION_REQUEST_SELECTORS.connectButton,
      CONNECTION_REQUEST_SELECTORS.connectButtonPrimary,
      CONNECTION_REQUEST_SELECTORS.searchResultConnectButton,
      CONNECTION_REQUEST_SELECTORS.pymkConnectButton,
      CONNECTION_REQUEST_SELECTORS.suggestionConnectButton,
    ];

    const allConnectButtons = new Set<Element>();

    connectButtonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        // Filter to only connect buttons (not other action buttons)
        const ariaLabel = button.getAttribute('aria-label') || '';
        const textContent = button.textContent || '';
        if (
          ariaLabel.toLowerCase().includes('connect') ||
          ariaLabel.toLowerCase().includes('invite') ||
          textContent.toLowerCase().includes('connect')
        ) {
          allConnectButtons.add(button);
        }
      });
    });

    console.log(`[Connection Request Tracker] 🔍 Found ${allConnectButtons.size} connect buttons`);

    allConnectButtons.forEach(button => {
      if (!this.trackedConnectButtons.has(button)) {
        console.log('[Connection Request Tracker] 🎯 Adding listener to connect button:', button);
        this.attachConnectButtonListener(button);
        this.trackedConnectButtons.add(button);
      }
    });

    // Clean up listeners for buttons that no longer exist
    this.trackedConnectButtons.forEach(button => {
      if (!document.contains(button)) {
        console.log('[Connection Request Tracker] 🧹 Removing listener from removed button');
        this.trackedConnectButtons.delete(button);
      }
    });

    // Also scan for modal send buttons if modal is open
    if (isConnectionRequestModalOpen()) {
      const sendButton = findConnectionSendButton();
      if (sendButton && !this.trackedSendButtons.has(sendButton)) {
        console.log(
          '[Connection Request Tracker] 🎯 Adding listener to existing modal send button',
        );
        this.attachModalSendButtonListener(sendButton);
        this.trackedSendButtons.add(sendButton);
      }
    }
  }

  /**
   * Attach event listener to a connect button
   */
  private attachConnectButtonListener(connectButton: Element) {
    const handleConnectClick = async (_event: Event) => {
      console.log('[Connection Request Tracker] 🚀 Connect button clicked:', connectButton);

      try {
        // Determine if this is a direct connection or will open modal

        // If it's a direct connect (no modal), capture immediately
        if (this.isDirectConnectButton(connectButton)) {
          console.log('[Connection Request Tracker] ⚡ Processing direct connection');
          await this.handleDirectConnection(connectButton);
        } else {
          console.log('[Connection Request Tracker] 📱 Connect button will open modal, waiting...');
          // Modal will be handled by modal observer
        }
      } catch (error) {
        console.error(
          '[Connection Request Tracker] 💥 Error handling connect button click:',
          error,
        );
      }
    };

    // Add click event listener
    connectButton.addEventListener('click', handleConnectClick, { capture: true });
  }

  /**
   * Attach event listener to modal send button
   */
  private attachModalSendButtonListener(sendButton: Element) {
    const handleModalSendClick = async (_event: Event) => {
      console.log('[Connection Request Tracker] 🚀 Modal send button clicked:', sendButton);

      try {
        // Extract data before sending
        const preSendData = extractPreSendConnectionRequestData();
        if (!preSendData) {
          console.warn('[Connection Request Tracker] ❌ No valid pre-send data extracted');
          return;
        }

        console.log('[Connection Request Tracker] 📊 Pre-send data extracted:', preSendData);

        // Check for duplicate capture prevention
        const captureKey = `${preSendData.recipientProfileUrl}-${preSendData.customMessage?.substring(0, 50)}`;
        const lastCapture = this.lastRequestCapture.get(captureKey);
        const now = Date.now();

        if (lastCapture && now - lastCapture < 5000) {
          // 5 second debounce
          console.log(
            '[Connection Request Tracker] ⏭️ Skipping duplicate connection request capture',
          );
          return;
        }

        this.lastRequestCapture.set(captureKey, now);

        // Wait for the request to be sent and process
        setTimeout(async () => {
          await this.captureConfirmedConnectionRequest(preSendData);
        }, 1500);
      } catch (error) {
        console.error(
          '[Connection Request Tracker] 💥 Error handling modal send button click:',
          error,
        );
      }
    };

    // Add click event listener
    sendButton.addEventListener('click', handleModalSendClick, { capture: true });

    // Also listen for form submission
    const form = sendButton.closest('form');
    if (form) {
      form.addEventListener('submit', handleModalSendClick, { capture: true });
    }
  }

  /**
   * Check if a connect button is a direct connection (no modal)
   */
  private isDirectConnectButton(button: Element): boolean {
    // PYMK and suggestion cards typically use direct connect
    const container = button.closest('.discover-cohort-card, .people-connect-card, .pymk-card');
    return container !== null;
  }

  /**
   * Handle direct connection request (no modal)
   */
  private async handleDirectConnection(connectButton: Element) {
    try {
      const connectionData = extractDirectConnectionRequestData(connectButton);
      if (!validateConnectionRequestDataComplete(connectionData)) {
        console.warn('[Connection Request Tracker] ❌ Invalid direct connection data');
        return;
      }

      console.log(
        '[Connection Request Tracker] ⚡ Direct connection data extracted:',
        connectionData,
      );
      await this.sendConnectionRequestToBackground(connectionData);
    } catch (error) {
      console.error('[Connection Request Tracker] 💥 Error handling direct connection:', error);
    }
  }

  /**
   * Capture confirmed connection request after modal submission
   */
  private async captureConfirmedConnectionRequest(preSendData: Partial<ConnectionRequestData>) {
    try {
      console.log('[Connection Request Tracker] 📡 Capturing confirmed connection request...');

      const confirmedData = extractConfirmedConnectionRequestData(preSendData);

      if (!validateConnectionRequestDataComplete(confirmedData)) {
        console.warn('[Connection Request Tracker] ❌ Invalid confirmed connection data');
        // Fallback: use pre-send data
        await this.sendConnectionRequestToBackground(preSendData);
        return;
      }

      console.log(
        '[Connection Request Tracker] ✅ Confirmed connection data extracted:',
        confirmedData,
      );
      await this.sendConnectionRequestToBackground(confirmedData);
    } catch (error) {
      console.error(
        '[Connection Request Tracker] 💥 Error capturing confirmed connection request:',
        error,
      );
      // Fallback: use pre-send data
      await this.sendConnectionRequestToBackground(preSendData);
    }
  }

  /**
   * Send connection request data to background script
   */
  private async sendConnectionRequestToBackground(
    connectionData: ConnectionRequestData | Partial<ConnectionRequestData>,
  ) {
    try {
      console.log(
        '[Connection Request Tracker] 📡 Sending connection request data to background...',
      );

      const response = await sendToBackground({
        name: 'captureConnectionRequest',
        body: connectionData,
      });

      console.log('[Connection Request Tracker] 📡 Background response:', response);

      if (!response.success) {
        console.error('[Connection Request Tracker] ❌ Background script failed:', response.error);
        throw new Error(response.error || 'Failed to capture connection request');
      }

      console.log('[Connection Request Tracker] 🎉 Connection request captured successfully!');
    } catch (error) {
      console.error('[Connection Request Tracker] 💥 Error sending to background:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources and stop tracking
   */
  public cleanup() {
    console.log('[Connection Request Tracker] 🧹 Cleaning up...');

    this.trackedConnectButtons.clear();
    this.trackedSendButtons.clear();
    this.lastRequestCapture.clear();

    if (this.modalObserver) {
      this.modalObserver.disconnect();
      this.modalObserver = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isInitialized = false;
    console.log('[Connection Request Tracker] ✅ Connection request tracker cleaned up');
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
        this.lastRequestCapture.forEach((timestamp, key) => {
          if (now - timestamp > maxAge) {
            this.lastRequestCapture.delete(key);
          }
        });

        console.log(
          `[Connection Request Tracker] 🧹 Cleanup completed. Tracking ${this.trackedConnectButtons.size} connect buttons, ${this.trackedSendButtons.size} send buttons, ${this.lastRequestCapture.size} recent captures.`,
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
      trackedConnectButtons: this.trackedConnectButtons.size,
      trackedSendButtons: this.trackedSendButtons.size,
      recentCaptures: this.lastRequestCapture.size,
      isModalOpen: isConnectionRequestModalOpen(),
    };
  }
}
