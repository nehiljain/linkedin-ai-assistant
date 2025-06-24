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
  extractDirectConnectionRequestData,
  extractDropdownConnectionRequestData,
  extractModalConnectionRequestData,
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
  private isDryRunMode = false;
  private detectedConnections = new Map<string, unknown>();
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

    // Find primary connect buttons
    const connectButtons = document.querySelectorAll(CONNECTION_REQUEST_SELECTORS.connectButton);

    // Find dropdown connect items (like the HTML you provided)
    const dropdownConnectItems = document.querySelectorAll(
      CONNECTION_REQUEST_SELECTORS.connectDropdownItem,
    );

    const allConnectElements = new Set<Element>();

    // Add primary connect buttons
    connectButtons.forEach(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      if (
        ariaLabel.toLowerCase().includes('connect') ||
        ariaLabel.toLowerCase().includes('invite')
      ) {
        allConnectElements.add(button);
      }
    });

    // Add dropdown connect items
    dropdownConnectItems.forEach(item => {
      const ariaLabel = item.getAttribute('aria-label') || '';
      if (
        ariaLabel.toLowerCase().includes('connect') ||
        ariaLabel.toLowerCase().includes('invite')
      ) {
        allConnectElements.add(item);
      }
    });

    console.log(
      `[Connection Request Tracker] 🔍 Found ${allConnectElements.size} connect elements`,
    );

    allConnectElements.forEach(element => {
      if (!this.trackedConnectButtons.has(element)) {
        console.log('[Connection Request Tracker] 🎯 Adding listener to connect element:', element);
        this.attachConnectElementListener(element);
        this.trackedConnectButtons.add(element);
      }
    });

    // Clean up listeners for elements that no longer exist
    this.trackedConnectButtons.forEach(element => {
      if (!document.contains(element)) {
        console.log('[Connection Request Tracker] 🧹 Removing listener from removed element');
        this.trackedConnectButtons.delete(element);
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
   * Attach event listener to a connect element (button or dropdown item)
   */
  private attachConnectElementListener(connectElement: Element) {
    const handleConnectClick = async (_event: Event) => {
      console.log('[Connection Request Tracker] 🚀 Connect element clicked:', connectElement);

      try {
        // Determine the type of connect element
        const isDropdownItem =
          connectElement.getAttribute('role') === 'button' &&
          connectElement.classList.contains('artdeco-dropdown__item');
        const isModalButton = connectElement.tagName === 'BUTTON';

        let connectionData: ConnectionRequestData | null = null;

        if (isDropdownItem) {
          console.log('[Connection Request Tracker] 📋 Processing dropdown connect item');
          connectionData = extractDropdownConnectionRequestData(connectElement);
        } else if (isModalButton) {
          // Check if this will open a modal or is direct
          if (this.willOpenModal(connectElement)) {
            console.log(
              '[Connection Request Tracker] 📱 Connect button will open modal, waiting...',
            );
            // Modal will be handled by modal observer
            return;
          } else {
            console.log('[Connection Request Tracker] ⚡ Processing direct connection button');
            connectionData = extractDirectConnectionRequestData(connectElement);
          }
        }

        if (connectionData) {
          console.log('[Connection Request Tracker] 📊 DETECTED CONNECTION REQUEST:');
          console.log('  👤 Recipient:', connectionData.recipientName);
          console.log('  🔗 Profile URL:', connectionData.recipientProfileUrl);
          console.log('  💼 Title:', connectionData.recipientTitle);
          console.log('  📏 Location:', connectionData.recipientLocation);
          console.log('  🏢 Company:', connectionData.recipientCompany);
          console.log('  🔗 Connection Type:', connectionData.connectionType);
          console.log('  📍 Context:', connectionData.requestContext);

          // Capture the data
          await this.sendConnectionRequestToBackground(connectionData);
        }
      } catch (error) {
        console.error(
          '[Connection Request Tracker] 💥 Error handling connect element click:',
          error,
        );
      }
    };

    // Add click event listener with high priority in capture phase
    connectElement.addEventListener('click', handleConnectClick, { capture: true, passive: false });
  }

  /**
   * Attach event listener to modal send button
   */
  private attachModalSendButtonListener(sendButton: Element) {
    const handleModalSendClick = async (_event: Event) => {
      console.log('[Connection Request Tracker] 🚀 Modal send button clicked:', sendButton);

      try {
        // Extract data from current page (simplified approach)
        const connectionData = extractModalConnectionRequestData();
        if (!connectionData) {
          console.warn(
            '[Connection Request Tracker] ❌ No valid connection data extracted from modal',
          );
          return;
        }

        console.log('[Connection Request Tracker] 📊 DETECTED MODAL CONNECTION REQUEST:');
        console.log('  👤 Recipient:', connectionData.recipientName);
        console.log('  🔗 Profile URL:', connectionData.recipientProfileUrl);
        console.log('  💼 Title:', connectionData.recipientTitle);
        console.log('  📏 Location:', connectionData.recipientLocation);
        console.log('  🏢 Company:', connectionData.recipientCompany);
        console.log('  🔗 Connection Type:', connectionData.connectionType);
        console.log('  📍 Context:', connectionData.requestContext);

        // Check for duplicate capture prevention
        const captureKey = `${connectionData.recipientProfileUrl}-${connectionData.timestamp}`;
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

        // Capture immediately since we have all the data
        await this.sendConnectionRequestToBackground(connectionData);
      } catch (error) {
        console.error(
          '[Connection Request Tracker] 💥 Error handling modal send button click:',
          error,
        );
      }
    };

    // Add click event listener with high priority in capture phase
    sendButton.addEventListener('click', handleModalSendClick, { capture: true, passive: false });

    // Also listen for form submission
    const form = sendButton.closest('form');
    if (form) {
      form.addEventListener('submit', handleModalSendClick, { capture: true, passive: false });
    }
  }

  /**
   * Check if a connect button will open a modal
   */
  private willOpenModal(button: Element): boolean {
    // Most connect buttons on profile pages open a modal
    // Direct connects are typically on cards/search results
    const isInProfileContext = window.location.href.includes('/in/');
    const isInCard = button.closest(
      '.discover-cohort-card, .people-connect-card, .pymk-card, .reusable-search__result-container',
    );

    // If we're on a profile page and not in a card, it likely opens a modal
    return isInProfileContext && !isInCard;
  }

  // Removed handleDirectConnection method as it's now handled in attachConnectElementListener

  // Removed captureConfirmedConnectionRequest method as we now capture immediately

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
   * Show a visual notification for dry-run mode
   */
  private showDryRunNotification(connectionData: Partial<ConnectionRequestData>) {
    // Create a temporary notification overlay
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b35;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🛑 DRY-RUN MODE ACTIVE</div>
      <div>Connection request to <strong>${connectionData.recipientName ?? ''}</strong> was intercepted and NOT sent.</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">Data captured for testing. Check console for details.</div>
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Enable or disable dry-run mode
   */
  public setDryRunMode(enabled: boolean) {
    this.isDryRunMode = enabled;
    localStorage.setItem('linkedinAiAssistant:dryRunMode', enabled.toString());
    console.log(`[Connection Request Tracker] 🧪 Dry-run mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get detected connections for testing review
   */
  public getDetectedConnections() {
    return Array.from(this.detectedConnections.values());
  }

  /**
   * Clear detected connections
   */
  public clearDetectedConnections() {
    this.detectedConnections.clear();
    console.log('[Connection Request Tracker] 🧹 Cleared detected connections');
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
      isDryRunMode: this.isDryRunMode,
      detectedConnectionsCount: this.detectedConnections.size,
    };
  }
}
