import { sendToBackground } from '@plasmohq/messaging';
import AiCaptureButton from '~components/ai-capture-button';
import { createCommentSubmissionListener, type CommentData } from '~utils/comment-tracker';
import { ConnectionRequestTracker } from '~utils/connection-request-tracker';
import { findActionBar, isLinkedInFeedPage } from '~utils/linkedin-dom';
import { MessageTracker } from '~utils/message-tracker';
import { PerformanceManager } from '~utils/performance-manager';
import { extractPostData, validatePostData } from '~utils/post-extractor';
import { createRoot } from 'react-dom/client';

export const config: PlasmoCSConfig = {
  matches: ['https://www.linkedin.com/*'],
  all_frames: false,
};

class LinkedInAiAssistant {
  private performanceManager: PerformanceManager;
  private messageTracker: MessageTracker;
  private connectionRequestTracker: ConnectionRequestTracker;
  private isInitialized = false;
  private commentListener: ((event: Event) => void) | null = null;

  constructor() {
    this.performanceManager = new PerformanceManager();
    this.messageTracker = new MessageTracker();
    this.connectionRequestTracker = new ConnectionRequestTracker();
  }

  /**
   * Initialize the extension
   */
  public async initialize() {
    if (this.isInitialized) return;

    // Initialize on all LinkedIn pages (not just feed)
    if (window.location.hostname !== 'www.linkedin.com') {
      return;
    }

    // Wait for the page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeAfterReady());
    } else {
      this.initializeAfterReady();
    }
  }

  /**
   * Initialize after DOM is ready
   */
  private initializeAfterReady() {
    // Wait a bit for LinkedIn to finish loading
    setTimeout(() => {
      this.setupTracking();
      this.isInitialized = true;
      console.log('[LinkedIn AI Assistant] Extension initialized');
    }, 2000);
  }

  /**
   * Setup all tracking components
   */
  private setupTracking() {
    // Initialize post tracking (on feed pages)
    if (isLinkedInFeedPage()) {
      console.log('[LinkedIn AI Assistant] 📱 Setting up post tracking...');
      this.performanceManager.initialize(
        this.handlePostVisible.bind(this),
        this.handlePostHidden.bind(this),
      );
      this.performanceManager.startObserving();
    }

    // Initialize message tracking (on all LinkedIn pages)
    console.log('[LinkedIn AI Assistant] 💬 Setting up message tracking...');
    this.messageTracker.initialize();

    // Initialize connection request tracking (on all LinkedIn pages)
    console.log('[LinkedIn AI Assistant] 🤝 Setting up connection request tracking...');
    this.connectionRequestTracker.initialize();

    // Initialize comment tracking (on all LinkedIn pages)
    this.setupCommentTracking();

    // Setup performance manager to handle messaging and connection interfaces
    this.performanceManager.initializeMessagingTracking(
      this.handleMessagingInterfaceVisible.bind(this),
    );
    this.performanceManager.initializeConnectionTracking(
      this.handleConnectionInterfaceVisible.bind(this),
    );

    // Log stats periodically in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const performanceStats = this.performanceManager.getStats();
        const messageStats = this.messageTracker.getStats();
        const connectionStats = this.connectionRequestTracker.getStats();

        console.log('[LinkedIn AI Assistant] Stats:', {
          performance: performanceStats,
          messaging: messageStats,
          connections: connectionStats,
        });
      }, 30000);
    }
  }

  /**
   * Setup comment tracking to automatically capture comments
   */
  private setupCommentTracking() {
    if (this.commentListener) {
      document.removeEventListener('click', this.commentListener);
    }

    this.commentListener = createCommentSubmissionListener(this.handleCaptureComment.bind(this));
    document.addEventListener('click', this.commentListener);
    console.log('[LinkedIn AI Assistant] Comment tracking initialized');
  }

  /**
   * Handle when a comment is captured
   */
  private async handleCaptureComment(commentData: CommentData): Promise<void> {
    try {
      // Send to background script for webhook call
      const response = await sendToBackground({
        name: 'captureComment',
        body: commentData,
      });

      if (!response.success) {
        console.error(`[LinkedIn AI Assistant] Comment capture failed:`, response.error);
        throw new Error(response.error || 'Failed to capture comment');
      }
    } catch (error) {
      console.error('[LinkedIn AI Assistant] Error capturing comment:', error);
      // Don't re-throw to avoid disrupting the user's LinkedIn experience
    }
  }

  /**
   * Handle when a messaging interface becomes visible
   */
  private handleMessagingInterfaceVisible(interfaceElement: Element) {
    console.log('[LinkedIn AI Assistant] 💬 Messaging interface detected:', interfaceElement);
    // The MessageTracker handles its own interface detection and tracking
    // This callback is for future extensibility if needed
  }

  /**
   * Handle when a connection request interface becomes visible
   */
  private handleConnectionInterfaceVisible(interfaceElement: Element) {
    console.log('[LinkedIn AI Assistant] 🤝 Connection interface detected:', interfaceElement);
    // The ConnectionRequestTracker handles its own interface detection and tracking
    // This callback is for future extensibility if needed
  }

  /**
   * Handle when a post becomes hidden
   */
  private handlePostHidden(_postElement: Element) {
    // Optional: Clean up any post-specific resources if needed
  }

  /**
   * Handle when a post becomes visible
   */
  private async handlePostVisible(postElement: Element) {
    try {
      // Check if we already processed this post
      if (this.performanceManager.hasButton(postElement)) {
        return;
      }

      // Find the action bar within this post
      const actionBar = findActionBar(postElement);
      if (!actionBar) {
        return;
      }

      // Double-check for existing buttons
      const existingButtons = actionBar.querySelectorAll(
        '[data-ai-capture-container], .ai-capture-button, [data-post-id]',
      );
      if (existingButtons.length > 0) {
        this.performanceManager.markPostAsProcessed(postElement, 'existing-button');
        return;
      }

      // Extract post data to validate it's a valid post
      const postData = extractPostData(postElement);
      if (!validatePostData(postData)) {
        return;
      }

      // Mark as processed BEFORE injection to prevent race conditions
      this.performanceManager.markPostAsProcessed(postElement, postData.postId);

      // Inject the AI capture button
      await this.injectAiCaptureButton(actionBar, postData.postId);
    } catch (error) {
      console.error('[LinkedIn AI Assistant] Error handling visible post:', error);
    }
  }

  /**
   * Inject the AI capture button into the action bar
   */
  private async injectAiCaptureButton(actionBar: Element, postId: string) {
    try {
      // Final check: Make sure no button exists before injecting
      const finalCheck = actionBar.querySelector('[data-ai-capture-container]');
      if (finalCheck) {
        return;
      }

      // Create a container for our button that matches LinkedIn's structure
      const buttonContainer = document.createElement('div');
      buttonContainer.className =
        'feed-shared-social-action-bar__action-button feed-shared-social-action-bar--new-padding';
      buttonContainer.setAttribute('data-ai-capture-container', 'true');
      buttonContainer.setAttribute('data-ai-capture-post-id', postId);
      buttonContainer.setAttribute('data-ai-capture-timestamp', Date.now().toString());

      // Find the best insertion point (after Send button, or at the end)
      const sendButton = actionBar
        .querySelector('.send-privately-button')
        ?.closest('.feed-shared-social-action-bar__action-button');

      if (sendButton) {
        sendButton.insertAdjacentElement('afterend', buttonContainer);
      } else {
        actionBar.appendChild(buttonContainer);
      }

      // Create React root and render our button
      const root = createRoot(buttonContainer);
      root.render(
        <AiCaptureButton postId={postId} onCapture={this.handleCapturePost.bind(this)} />,
      );
    } catch (error) {
      console.error('[LinkedIn AI Assistant] Error injecting button:', error);
    }
  }

  /**
   * Handle when user clicks the capture button
   */
  private async handleCapturePost(postId: string): Promise<void> {
    try {
      // Find the post container
      const postContainer = document.querySelector(`[data-id="${postId}"], [data-urn="${postId}"]`);
      if (!postContainer) {
        throw new Error(`Post container not found for ID: ${postId}`);
      }

      // Extract full post data
      const postData = extractPostData(postContainer);
      if (!validatePostData(postData)) {
        throw new Error('Failed to extract valid post data');
      }

      // Send to background script for API call
      const response = await sendToBackground({
        name: 'capturePost',
        body: postData,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to capture post');
      }
    } catch (error) {
      console.error('[LinkedIn AI Assistant] Error capturing post:', error);
      throw error; // Re-throw so the button can show error state
    }
  }

  /**
   * Cleanup when the extension is disabled or page is unloaded
   */
  public cleanup() {
    console.log('[LinkedIn AI Assistant] Starting cleanup...');

    // Cleanup all tracking components
    this.performanceManager.stopObserving();
    this.messageTracker.cleanup();
    this.connectionRequestTracker.cleanup();

    // Remove comment listener
    if (this.commentListener) {
      document.removeEventListener('click', this.commentListener);
      this.commentListener = null;
    }

    this.isInitialized = false;
    console.log('[LinkedIn AI Assistant] ✅ All components cleaned up');
  }
}

// Global instance
let aiAssistant: LinkedInAiAssistant | null = null;

// Initialize when script loads
const initializeExtension = () => {
  if (!aiAssistant) {
    aiAssistant = new LinkedInAiAssistant();
  }
  aiAssistant.initialize();
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (aiAssistant) {
    aiAssistant.cleanup();
  }
});

// Handle navigation in Single Page Applications
let currentUrl = window.location.href;
const checkForNavigation = () => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;

    // Cleanup existing instance
    if (aiAssistant) {
      aiAssistant.cleanup();
    }

    // Reinitialize after a short delay
    setTimeout(initializeExtension, 1000);
  }
};

// Check for navigation changes
setInterval(checkForNavigation, 2000);

// Initial initialization
initializeExtension();

// Export for debugging
if (process.env.NODE_ENV === 'development') {
  (window as unknown as { linkedinAiAssistant: typeof aiAssistant }).linkedinAiAssistant =
    aiAssistant;
}
