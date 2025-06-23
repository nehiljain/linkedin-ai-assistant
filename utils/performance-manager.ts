import { debounce, throttle } from './linkedin-dom';

/**
 * Performance manager for handling LinkedIn's infinite scroll efficiently
 * Uses Intersection Observer and throttling to minimize performance impact
 */

interface ManagedPost {
  element: Element;
  postId: string;
  hasButton: boolean;
  lastSeen: number;
}

export class PerformanceManager {
  private observer: IntersectionObserver | null = null;
  private managedPosts = new Map<Element, ManagedPost>();
  private isTabVisible = true;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private processQueue: Element[] = [];
  private readonly maxButtons = 50; // Maximum number of buttons to maintain

  // Callbacks
  private onPostVisible: ((element: Element) => void) | null = null;
  private onPostHidden: ((element: Element) => void) | null = null;

  constructor() {
    this.setupVisibilityListener();
    this.setupCleanupInterval();
  }

  /**
   * Initialize the performance manager with callbacks
   */
  public initialize(
    onPostVisible: (element: Element) => void,
    onPostHidden?: (element: Element) => void,
  ) {
    this.onPostVisible = onPostVisible;
    this.onPostHidden = onPostHidden || null;
    this.setupIntersectionObserver();
  }

  /**
   * Start observing posts for visibility changes
   */
  public startObserving() {
    if (!this.observer) {
      this.setupIntersectionObserver();
    }

    // Initial scan for existing posts
    this.scanForPosts();

    // Set up periodic scanning for new posts (throttled)
    const throttledScan = throttle(this.scanForPosts.bind(this), 2000);

    // Listen for scroll events to trigger scanning
    document.addEventListener('scroll', throttledScan, { passive: true });

    // Listen for DOM changes (but throttled to avoid performance issues)
    const debouncedScan = debounce(this.scanForPosts.bind(this), 1000);

    // Use a minimal MutationObserver just for detecting new posts
    const mutationObserver = new MutationObserver(mutations => {
      // Only trigger if we detect significant DOM changes (new posts likely added)
      const hasSignificantChanges = mutations.some(
        mutation =>
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(
            node =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches('[data-id^="urn:li:activity"], .feed-shared-update-v2'),
          ),
      );

      if (hasSignificantChanges && this.isTabVisible) {
        debouncedScan();
      }
    });

    // Observe the main feed container for new posts
    const feedContainer = document.querySelector('[role="main"], .scaffold-finite-scroll__content');
    if (feedContainer) {
      mutationObserver.observe(feedContainer, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Stop observing and cleanup
   */
  public stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.managedPosts.clear();
  }

  /**
   * Mark a post as having a button to avoid duplicate injection
   */
  public markPostAsProcessed(element: Element, postId: string) {
    const managed = this.managedPosts.get(element);
    if (managed) {
      managed.hasButton = true;
      managed.lastSeen = Date.now();
    } else {
      this.managedPosts.set(element, {
        element,
        postId,
        hasButton: true,
        lastSeen: Date.now(),
      });
    }
  }

  /**
   * Check if a post already has a button
   */
  public hasButton(element: Element): boolean {
    return this.managedPosts.get(element)?.hasButton || false;
  }

  /**
   * Get current stats for debugging
   */
  public getStats() {
    return {
      observedPosts: this.managedPosts.size,
      postsWithButtons: Array.from(this.managedPosts.values()).filter(p => p.hasButton).length,
      isTabVisible: this.isTabVisible,
      queueSize: this.processQueue.length,
    };
  }

  /**
   * Setup Intersection Observer for efficient visibility detection
   */
  private setupIntersectionObserver() {
    const options: IntersectionObserverInit = {
      root: null, // Use viewport as root
      rootMargin: '100px 0px', // Start processing 100px before entering viewport
      threshold: 0.1, // Trigger when 10% of the post is visible
    };

    this.observer = new IntersectionObserver(entries => {
      if (!this.isTabVisible) return;

      entries.forEach(entry => {
        const element = entry.target;
        const managed = this.managedPosts.get(element);

        if (entry.isIntersecting) {
          // Post is becoming visible
          if (managed) {
            managed.lastSeen = Date.now();
          }

          if (!this.hasButton(element) && this.onPostVisible) {
            this.processQueue.push(element);
            this.processQueueThrottled();
          }
        } else {
          // Post is becoming hidden
          if (this.onPostHidden) {
            this.onPostHidden(element);
          }
        }
      });
    }, options);
  }

  /**
   * Scan for new posts and start observing them
   */
  private scanForPosts() {
    if (!this.observer || !this.isTabVisible) return;

    // Find all post containers
    const postSelectors = [
      '[data-id^="urn:li:activity"]',
      '[data-urn^="urn:li:activity"]',
      '.feed-shared-update-v2',
    ];

    const posts = document.querySelectorAll(postSelectors.join(', '));

    posts.forEach(post => {
      if (!this.managedPosts.has(post)) {
        // New post found, start observing it
        this.observer!.observe(post);
        this.managedPosts.set(post, {
          element: post,
          postId:
            post.getAttribute('data-id') || post.getAttribute('data-urn') || `post-${Date.now()}`,
          hasButton: false,
          lastSeen: Date.now(),
        });
      }
    });
  }

  /**
   * Process the queue of visible posts (throttled)
   */
  private processQueueThrottled = throttle(() => {
    if (!this.onPostVisible || this.processQueue.length === 0) return;

    // Process up to 5 posts at a time to avoid blocking
    const batch = this.processQueue.splice(0, 5);
    batch.forEach(element => {
      if (this.onPostVisible) {
        this.onPostVisible(element);
      }
    });
  }, 500);

  /**
   * Setup tab visibility listener to pause processing when tab is hidden
   */
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;

      if (this.isTabVisible) {
        // Tab became visible, resume scanning
        setTimeout(() => this.scanForPosts(), 500);
      }
    });
  }

  /**
   * Setup periodic cleanup of old/invisible posts
   */
  private setupCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldPosts();
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Remove tracking for posts that are no longer in the DOM or haven't been seen recently
   */
  private cleanupOldPosts() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const toRemove: Element[] = [];

    this.managedPosts.forEach((managed, element) => {
      // Remove if element is no longer in DOM or hasn't been seen recently
      if (!document.contains(element) || now - managed.lastSeen > maxAge) {
        toRemove.push(element);
      }
    });

    toRemove.forEach(element => {
      if (this.observer) {
        this.observer.unobserve(element);
      }
      this.managedPosts.delete(element);
    });

    // If we have too many buttons, remove the oldest ones
    if (this.managedPosts.size > this.maxButtons) {
      const sorted = Array.from(this.managedPosts.entries()).sort(
        ([, a], [, b]) => a.lastSeen - b.lastSeen,
      );

      const toRemoveCount = this.managedPosts.size - this.maxButtons;
      for (let i = 0; i < toRemoveCount; i++) {
        const [element] = sorted[i];
        this.managedPosts.delete(element);
        if (this.observer) {
          this.observer.unobserve(element);
        }
      }
    }

    console.log(
      `[PerformanceManager] Cleanup completed. Removed ${toRemove.length} posts. Currently managing ${this.managedPosts.size} posts.`,
    );
  }
}
