/**
 * LinkedIn DOM utilities and selectors
 * These selectors target LinkedIn's feed structure for post interaction
 */

export const LINKEDIN_SELECTORS = {
  // Main feed and post containers
  feedContainer: '[role="main"]',
  postContainer:
    '.feed-shared-update-v2, [data-id^="urn:li:activity"], [data-urn^="urn:li:activity"]',

  // Social action bar (where we'll inject our button)
  actionBar: '.feed-shared-social-action-bar',
  actionBarFullWidth: '.feed-shared-social-action-bar--full-width',
  actionButton: '.feed-shared-social-action-bar__action-button',

  // Existing social buttons
  likeButton: '.react-button__trigger',
  commentButton: '.comment-button',
  repostButton: '.social-reshare-button',
  sendButton: '.send-privately-button',

  // Post content elements
  postText: '.feed-shared-text, .feed-shared-update-v2__description',
  postContent: '.feed-shared-update-v2__description-wrapper',

  // Author information
  authorName: '.feed-shared-actor__name, .update-components-actor__name',
  authorTitle: '.feed-shared-actor__description, .update-components-actor__description',
  authorLink: '.feed-shared-actor__container-link, .update-components-actor__container-link',

  // Post metadata
  postTimestamp:
    '.feed-shared-actor__sub-description time, .update-components-actor__sub-description time',
  postLink: '.feed-shared-control-menu__trigger',

  // Media indicators
  imagePost: '.feed-shared-image',
  videoPost: '.feed-shared-video',
  documentPost: '.feed-shared-document',
  articlePost: '.feed-shared-article',
  pollPost: '.feed-shared-poll',

  // Company/organization posts
  companyName: '.feed-shared-actor__name .feed-shared-actor__title',
  companyLogo: '.feed-shared-actor__avatar .feed-shared-actor__avatar-image',
} as const;

export interface MediaItem {
  type: 'text' | 'image' | 'video' | 'document' | 'article' | 'poll' | 'link' | 'carousel';
  data: string;
  metadata?: {
    alt?: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    size?: string;
    filename?: string;
    url?: string;
  };
}

export interface PostData {
  postId: string;
  content: MediaItem[]; // Changed from string to array of media items
  author: string;
  authorUrl: string;
  authorTitle?: string;
  postUrl: string;
  timestamp: string;
  mediaType: 'text' | 'image' | 'video' | 'document' | 'article' | 'poll' | 'mixed';
  isCompanyPost?: boolean;
  companyName?: string;
}

/**
 * Find the closest post container element from any child element
 */
export function findPostContainer(element: Element): Element | null {
  return element.closest(LINKEDIN_SELECTORS.postContainer);
}

/**
 * Get the post ID from a post container element
 */
export function getPostId(postContainer: Element): string {
  const dataId = postContainer.getAttribute('data-id') || postContainer.getAttribute('data-urn');
  return dataId || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find the action bar within a post container
 */
export function findActionBar(postContainer: Element): Element | null {
  return postContainer.querySelector(LINKEDIN_SELECTORS.actionBar);
}

/**
 * Check if our AI capture button already exists in the action bar
 */
export function hasAiCaptureButton(actionBar: Element): boolean {
  // Check multiple selectors to be absolutely sure
  const selectors = [
    '[data-ai-capture-container]',
    '.ai-capture-button',
    '[data-post-id]',
    '[data-ai-capture-post-id]',
  ];

  for (const selector of selectors) {
    if (actionBar.querySelector(selector)) {
      console.log(`[LinkedIn AI Assistant] 🔍 Found existing button with selector: ${selector}`);
      return true;
    }
  }

  return false;
}

/**
 * Determine the media type of a post
 */
export function getPostMediaType(postContainer: Element): PostData['mediaType'] {
  if (postContainer.querySelector(LINKEDIN_SELECTORS.imagePost)) return 'image';
  if (postContainer.querySelector(LINKEDIN_SELECTORS.videoPost)) return 'video';
  if (postContainer.querySelector(LINKEDIN_SELECTORS.documentPost)) return 'document';
  if (postContainer.querySelector(LINKEDIN_SELECTORS.articlePost)) return 'article';
  if (postContainer.querySelector(LINKEDIN_SELECTORS.pollPost)) return 'poll';
  return 'text';
}

/**
 * Check if the current page is a LinkedIn feed page (including search results)
 */
export function isLinkedInFeedPage(): boolean {
  return (
    window.location.hostname === 'www.linkedin.com' &&
    (window.location.pathname === '/feed/' ||
      window.location.pathname === '/' ||
      window.location.pathname.startsWith('/feed') ||
      window.location.pathname.startsWith('/search/results/content/'))
  );
}

/**
 * Get all visible post containers in the current viewport
 */
export function getVisiblePostContainers(): Element[] {
  const posts = document.querySelectorAll(LINKEDIN_SELECTORS.postContainer);
  return Array.from(posts).filter(post => {
    const rect = post.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  });
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
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
 * Debounce function to delay execution until after delay period
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
