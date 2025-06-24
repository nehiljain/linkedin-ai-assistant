import { sendToBackground } from '@plasmohq/messaging';
import AiCaptureButton from '~components/ai-capture-button';
import { findActionBar, isLinkedInFeedPage } from '~utils/linkedin-dom';
import { PerformanceManager } from '~utils/performance-manager';
import { extractPostData, validatePostData } from '~utils/post-extractor';
import { createRoot } from 'react-dom/client';

console.log('[LinkedIn AI Assistant] [DEBUG] AiCaptureButton import:', AiCaptureButton);

export const config: PlasmoCSConfig = {
  matches: ['https://www.linkedin.com/*'],
  all_frames: false,
};

class LinkedInAiAssistant {
  private performanceManager: PerformanceManager;
  private isInitialized = false;

  constructor() {
    console.log('[LinkedIn AI Assistant] [DEBUG] LinkedInAiAssistant constructor called');
    this.performanceManager = new PerformanceManager();
  }

  /**
   * Initialize the extension
   */
  public async initialize() {
    console.log('[LinkedIn AI Assistant] [DEBUG] initialize() called');
    if (this.isInitialized) return;

    console.log('[LinkedIn AI Assistant] Initializing...');

    // Only run on LinkedIn feed pages
    if (!isLinkedInFeedPage()) {
      console.log(
        '[LinkedIn AI Assistant] [DEBUG] Not a LinkedIn feed page, skipping initialization',
      );
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
    console.log('[LinkedIn AI Assistant] [DEBUG] initializeAfterReady() called');
    // Wait a bit for LinkedIn to finish loading
    setTimeout(() => {
      this.setupPerformanceManager();
      this.isInitialized = true;
      console.log('[LinkedIn AI Assistant] Initialized successfully');
    }, 2000);
  }

  /**
   * Setup the performance manager with callbacks
   */
  private setupPerformanceManager() {
    console.log('[LinkedIn AI Assistant] [DEBUG] setupPerformanceManager() called');
    this.performanceManager.initialize(
      this.handlePostVisible.bind(this),
      this.handlePostHidden.bind(this),
    );

    this.performanceManager.startObserving();

    // Log stats periodically for debugging
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const stats = this.performanceManager.getStats();
        console.log('[LinkedIn AI Assistant] Stats:', stats);
      }, 30000);
    }
  }

  /**
   * Handle when a post becomes hidden
   */
  private handlePostHidden(postElement: Element) {
    console.log('[LinkedIn AI Assistant] [DEBUG] handlePostHidden() called with:', postElement);
    // Optional: Clean up any post-specific resources if needed
    // For now, we'll just log it
  }

  /**
   * Handle when a post becomes visible
   */
  private async handlePostVisible(postElement: Element) {
    console.log('[LinkedIn AI Assistant] [DEBUG] handlePostVisible() called with:', postElement);
    try {
      console.log('[LinkedIn AI Assistant] 🔍 Processing visible post:', postElement);

      // Check if we already processed this post
      if (this.performanceManager.hasButton(postElement)) {
        console.log('[LinkedIn AI Assistant] [DEBUG] Post already processed, skipping');
        return;
      }

      // Find the action bar within this post
      const actionBar = findActionBar(postElement);
      console.log('[LinkedIn AI Assistant] [DEBUG] findActionBar result:', actionBar);
      if (!actionBar) {
        console.warn('[LinkedIn AI Assistant] ❌ No action bar found in post');
        return;
      }

      // CRITICAL: Double-check for existing buttons with multiple selectors
      const existingButtons = actionBar.querySelectorAll(
        '[data-ai-capture-container], .ai-capture-button, [data-post-id]',
      );
      console.log('[LinkedIn AI Assistant] [DEBUG] existingButtons found:', existingButtons.length);
      if (existingButtons.length > 0) {
        console.log(
          '[LinkedIn AI Assistant] [DEBUG] Button already exists in action bar, skipping',
        );
        this.performanceManager.markPostAsProcessed(postElement, 'existing-button');
        return;
      }

      // Extract post data to validate it's a valid post
      const postData = extractPostData(postElement);
      console.log('[LinkedIn AI Assistant] [DEBUG] extractPostData result:', postData);
      if (!validatePostData(postData)) {
        console.warn('[LinkedIn AI Assistant] ❌ Invalid post data, skipping');
        return;
      }

      console.log('[LinkedIn AI Assistant] ✅ Injecting button for post:', postData.postId);

      // Mark as processed BEFORE injection to prevent race conditions
      this.performanceManager.markPostAsProcessed(postElement, postData.postId);

      // Inject the AI capture button
      await this.injectAiCaptureButton(actionBar, postData.postId);

      console.log('[LinkedIn AI Assistant] ✅ Button injection completed for:', postData.postId);
    } catch (error) {
      console.error('[LinkedIn AI Assistant] 💥 Error handling visible post:', error);
    }
  }

  /**
   * Inject the AI capture button into the action bar
   */
  private async injectAiCaptureButton(actionBar: Element, postId: string) {
    console.log(
      '[LinkedIn AI Assistant] [DEBUG] injectAiCaptureButton() called with:',
      actionBar,
      postId,
    );
    try {
      // FINAL CHECK: Make sure no button exists before injecting
      const finalCheck = actionBar.querySelector('[data-ai-capture-container]');
      console.log('[LinkedIn AI Assistant] [DEBUG] finalCheck for existing button:', finalCheck);
      if (finalCheck) {
        console.log(
          '[LinkedIn AI Assistant] ⚠️ Final check failed - button already exists, aborting injection',
        );
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
      console.log('[LinkedIn AI Assistant] [DEBUG] sendButton found:', sendButton);

      if (sendButton) {
        // Insert after the Send button
        sendButton.insertAdjacentElement('afterend', buttonContainer);
        console.log('[LinkedIn AI Assistant] [DEBUG] Inserted buttonContainer after sendButton');
      } else {
        // Fallback: append to the end
        actionBar.appendChild(buttonContainer);
        console.log('[LinkedIn AI Assistant] [DEBUG] Appended buttonContainer to actionBar');
      }

      // Create React root and render our button
      console.log('[LinkedIn AI Assistant] [DEBUG] AiCaptureButton value:', AiCaptureButton);
      const root = createRoot(buttonContainer);
      console.log('[LinkedIn AI Assistant] [DEBUG] Rendering AiCaptureButton for post:', postId);
      root.render(
        <AiCaptureButton postId={postId} onCapture={this.handleCapturePost.bind(this)} />,
      );

      console.log(`[LinkedIn AI Assistant] [DEBUG] AiCaptureButton rendered for post ${postId}`);

      console.log(`[LinkedIn AI Assistant] ✅ Button successfully injected for post ${postId}`);
    } catch (error) {
      console.error('[LinkedIn AI Assistant] 💥 Error injecting button:', error);
    }
  }

  /**
   * Handle when user clicks the capture button
   */
  private async handleCapturePost(postId: string): Promise<void> {
    console.log('[LinkedIn AI Assistant] [DEBUG] handleCapturePost() called with:', postId);
    try {
      console.log(`[LinkedIn AI Assistant] 🚀 Starting capture for post: ${postId}`);

      // Find the post container
      console.log(`[LinkedIn AI Assistant] 🔍 Looking for post container with ID: ${postId}`);
      const postContainer = document.querySelector(`[data-id="${postId}"], [data-urn="${postId}"]`);
      if (!postContainer) {
        console.error(`[LinkedIn AI Assistant] ❌ Post container not found for ID: ${postId}`);
        console.log(
          `[LinkedIn AI Assistant] 🔍 Available post containers:`,
          document.querySelectorAll('[data-id], [data-urn]'),
        );
        throw new Error(`Post container not found for ID: ${postId}`);
      }

      console.log(`[LinkedIn AI Assistant] ✅ Found post container:`, postContainer);

      // Extract full post data
      console.log(`[LinkedIn AI Assistant] 📊 Extracting post data...`);
      const postData = extractPostData(postContainer);
      console.log(`[LinkedIn AI Assistant] 📊 Raw extracted data:`, postData);

      if (!validatePostData(postData)) {
        console.error(`[LinkedIn AI Assistant] ❌ Post data validation failed:`, postData);
        throw new Error('Failed to extract valid post data');
      }

      console.log('[LinkedIn AI Assistant] ✅ Post data validated successfully:', postData);

      // Send to background script for API call
      console.log('[LinkedIn AI Assistant] 📡 Sending to background script...');
      const response = await sendToBackground({
        name: 'capturePost',
        body: postData,
      });

      console.log('[LinkedIn AI Assistant] 📡 Background response:', response);

      if (!response.success) {
        console.error(`[LinkedIn AI Assistant] ❌ Background script failed:`, response.error);
        throw new Error(response.error || 'Failed to capture post');
      }

      console.log('[LinkedIn AI Assistant] 🎉 Post captured successfully!');
    } catch (error) {
      console.error('[LinkedIn AI Assistant] 💥 Error capturing post:', error);
      console.error('[LinkedIn AI Assistant] 💥 Error stack:', error?.stack);
      throw error; // Re-throw so the button can show error state
    }
  }

  /**
   * Cleanup when the extension is disabled or page is unloaded
   */
  public cleanup() {
    console.log('[LinkedIn AI Assistant] [DEBUG] cleanup() called');
    this.performanceManager.stopObserving();
    this.isInitialized = false;
    console.log('[LinkedIn AI Assistant] Cleaned up');
  }
}

// Global instance
let aiAssistant: LinkedInAiAssistant | null = null;

// Initialize when script loads
const initializeExtension = () => {
  console.log('[LinkedIn AI Assistant] [DEBUG] initializeExtension() called');
  if (!aiAssistant) {
    aiAssistant = new LinkedInAiAssistant();
  }
  aiAssistant.initialize();
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('[LinkedIn AI Assistant] [DEBUG] beforeunload event - cleanup');
  if (aiAssistant) {
    aiAssistant.cleanup();
  }
});

// Handle navigation in Single Page Applications
let currentUrl = window.location.href;
const checkForNavigation = () => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log('[LinkedIn AI Assistant] Navigation detected, reinitializing...');

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
  console.log('[LinkedIn AI Assistant] [DEBUG] Exposed aiAssistant to window');
}
