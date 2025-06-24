import { debounce, throttle } from './linkedin-dom';

/**
 * Performance manager for handling LinkedIn's infinite scroll efficiently
 * Uses Intersection Observer and throttling to minimize performance impact
 * Extended to support messaging and connection request tracking
 */

interface ManagedPost {
  element: Element;
  postId: string;
  hasButton: boolean;
  lastSeen: number;
}

interface ManagedInterface {
  element: Element;
  interfaceId: string;
  interfaceType: 'messaging' | 'connection_request' | 'post';
  hasTracking: boolean;
  lastSeen: number;
}

export class PerformanceManager {
  private observer: IntersectionObserver | null = null;
  private managedPosts = new Map<Element, ManagedPost>();
  private managedInterfaces = new Map<Element, ManagedInterface>();
  private isTabVisible = true;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private processQueue: Element[] = [];
  private readonly maxButtons = 50; // Maximum number of buttons to maintain

  // Callbacks for posts
  private onPostVisible: ((element: Element) => void) | null = null;
  private onPostHidden: ((element: Element) => void) | null = null;

  // Callbacks for messaging and connection interfaces
  private onMessagingInterfaceVisible: ((element: Element) => void) | null = null;
  private onConnectionInterfaceVisible: ((element: Element) => void) | null = null;

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
   * Initialize messaging interface tracking
   */
  public initializeMessagingTracking(onMessagingInterfaceVisible: (element: Element) => void) {
    this.onMessagingInterfaceVisible = onMessagingInterfaceVisible;
    console.log('[PerformanceManager] 💬 Messaging interface tracking initialized');
  }

  /**
   * Initialize connection request interface tracking
   */
  public initializeConnectionTracking(onConnectionInterfaceVisible: (element: Element) => void) {
    this.onConnectionInterfaceVisible = onConnectionInterfaceVisible;
    console.log('[PerformanceManager] 🤝 Connection request interface tracking initialized');
  }

  /**
   * Start observing posts for visibility changes
   */
  public startObserving() {
    if (!this.observer) {
      this.setupIntersectionObserver();
    }

    // Initial scan for existing content
    this.scanForPosts();
    this.scanForInterfaces();

    // Set up periodic scanning for new content (throttled)
    const throttledScanPosts = throttle(this.scanForPosts.bind(this), 2000);

    // Listen for scroll events to trigger scanning
    document.addEventListener('scroll', throttledScanPosts, { passive: true });

    // Listen for DOM changes (but throttled to avoid performance issues)
    const debouncedScanPosts = debounce(this.scanForPosts.bind(this), 1000);
    const debouncedScanInterfaces = debounce(this.scanForInterfaces.bind(this), 1000);

    // Use a minimal MutationObserver just for detecting new content
    const mutationObserver = new MutationObserver(mutations => {
      // Check for new posts
      const hasNewPosts = mutations.some(
        mutation =>
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(
            node =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches('[data-id^="urn:li:activity"], .feed-shared-update-v2'),
          ),
      );

      // Check for new messaging/connection interfaces
      const hasNewInterfaces = mutations.some(
        mutation =>
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(
            node =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches(
                '.msg-form, .msg-overlay-bubble, .send-invite, .artdeco-modal, .connect-button, .discover-cohort-card',
              ),
          ),
      );

      if (this.isTabVisible) {
        if (hasNewPosts) {
          debouncedScanPosts();
        }
        if (hasNewInterfaces) {
          debouncedScanInterfaces();
        }
      }
    });

    // Observe the main document for new content
    const observeContainer = document.querySelector(
      '[role="main"], .scaffold-finite-scroll__content, body',
    );
    if (observeContainer) {
      mutationObserver.observe(observeContainer, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Scan for messaging and connection interfaces
   */
  private scanForInterfaces() {
    if (!this.isTabVisible) return;

    // Scan for messaging interfaces
    this.scanForMessagingInterfaces();

    // Scan for connection request interfaces
    this.scanForConnectionInterfaces();
  }

  /**
   * Scan for messaging interfaces
   */
  private scanForMessagingInterfaces() {
    if (!this.onMessagingInterfaceVisible) return;

    const messagingSelectors = ['.msg-form', '.msg-overlay-bubble', '.msg-thread', '.msg-s-modal'];

    const messagingInterfaces = document.querySelectorAll(messagingSelectors.join(', '));

    messagingInterfaces.forEach(msgInterface => {
      if (!this.managedInterfaces.has(msgInterface)) {
        const interfaceId = this.generateInterfaceId(msgInterface, 'messaging');

        this.managedInterfaces.set(msgInterface, {
          element: msgInterface,
          interfaceId,
          interfaceType: 'messaging',
          hasTracking: false,
          lastSeen: Date.now(),
        });

        // Trigger callback for new messaging interface
        this.onMessagingInterfaceVisible(msgInterface);

        console.log('[PerformanceManager] 💬 New messaging interface detected:', interfaceId);
      } else {
        // Update last seen time
        const managed = this.managedInterfaces.get(msgInterface);
        if (managed) {
          managed.lastSeen = Date.now();
        }
      }
    });
  }

  /**
   * Scan for connection request interfaces
   */
  private scanForConnectionInterfaces() {
    if (!this.onConnectionInterfaceVisible) return;

    const connectionSelectors = [
      '.send-invite[data-test-modal]',
      '.connect-button',
      '.discover-cohort-card',
      '.people-connect-card',
      '.reusable-search__result-container',
    ];

    const connectionInterfaces = document.querySelectorAll(connectionSelectors.join(', '));

    connectionInterfaces.forEach(connInterface => {
      if (!this.managedInterfaces.has(connInterface)) {
        const interfaceId = this.generateInterfaceId(connInterface, 'connection_request');

        this.managedInterfaces.set(connInterface, {
          element: connInterface,
          interfaceId,
          interfaceType: 'connection_request',
          hasTracking: false,
          lastSeen: Date.now(),
        });

        // Trigger callback for new connection interface
        this.onConnectionInterfaceVisible(connInterface);

        console.log('[PerformanceManager] 🤝 New connection interface detected:', interfaceId);
      } else {
        // Update last seen time
        const managed = this.managedInterfaces.get(connInterface);
        if (managed) {
          managed.lastSeen = Date.now();
        }
      }
    });
  }

  /**
   * Generate unique interface ID
   */
  private generateInterfaceId(element: Element, type: 'messaging' | 'connection_request'): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);

    // Try to get a meaningful identifier from the element
    const dataId =
      element.getAttribute('data-id') ||
      element.getAttribute('data-urn') ||
      element.getAttribute('id');

    if (dataId) {
      return `${type}-${dataId}`;
    }

    return `${type}-${timestamp}-${randomSuffix}`;
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
    this.managedInterfaces.clear();
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
   * Mark an interface as having tracking enabled
   */
  public markInterfaceAsTracked(
    element: Element,
    _interfaceType: 'messaging' | 'connection_request',
  ) {
    const managed = this.managedInterfaces.get(element);
    if (managed) {
      managed.hasTracking = true;
      managed.lastSeen = Date.now();
    }
  }

  /**
   * Check if an interface already has tracking
   */
  public hasInterfaceTracking(element: Element): boolean {
    return this.managedInterfaces.get(element)?.hasTracking || false;
  }

  /**
   * Get current stats for debugging
   */
  public getStats() {
    const interfacesByType = Array.from(this.managedInterfaces.values()).reduce(
      (acc, iface) => {
        acc[iface.interfaceType] = (acc[iface.interfaceType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      observedPosts: this.managedPosts.size,
      postsWithButtons: Array.from(this.managedPosts.values()).filter(p => p.hasButton).length,
      managedInterfaces: this.managedInterfaces.size,
      interfacesByType,
      interfacesWithTracking: Array.from(this.managedInterfaces.values()).filter(i => i.hasTracking)
        .length,
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
        console.log('[LinkedIn AI Assistant] [DEBUG] IntersectionObserver entry:', {
          element,
          isIntersecting: entry.isIntersecting,
          boundingClientRect: entry.boundingClientRect,
        });

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
    console.log('[LinkedIn AI Assistant] [DEBUG] scanForPosts found:', posts.length, posts);

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
        console.log('[LinkedIn AI Assistant] [DEBUG] Observing new post:', post);
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

    // Cleanup posts
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

    // Cleanup interfaces
    const interfacesToRemove: Element[] = [];

    this.managedInterfaces.forEach((managed, element) => {
      // Remove if element is no longer in DOM or hasn't been seen recently
      if (!document.contains(element) || now - managed.lastSeen > maxAge) {
        interfacesToRemove.push(element);
      }
    });

    interfacesToRemove.forEach(element => {
      this.managedInterfaces.delete(element);
    });

    // If we have too many interfaces, remove the oldest ones
    if (this.managedInterfaces.size > this.maxButtons) {
      const sortedInterfaces = Array.from(this.managedInterfaces.entries()).sort(
        ([, a], [, b]) => a.lastSeen - b.lastSeen,
      );

      const interfacesToRemoveCount = this.managedInterfaces.size - this.maxButtons;
      for (let i = 0; i < interfacesToRemoveCount; i++) {
        const [element] = sortedInterfaces[i];
        this.managedInterfaces.delete(element);
      }
    }

    console.log(
      `[PerformanceManager] Cleanup completed. Removed ${toRemove.length} posts and ${interfacesToRemove.length} interfaces. Currently managing ${this.managedPosts.size} posts and ${this.managedInterfaces.size} interfaces.`,
    );
  }
}
