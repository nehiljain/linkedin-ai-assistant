// Consolidated LinkedIn data extraction utilities
// Used by both post capture and comment tracking

export interface PostAuthorInfo {
  post_author_name: string;
  post_author_profile: string;
}

export interface CommentAuthorInfo {
  comment_author_name: string;
  comment_author_profile: string;
}

/**
 * Universal post author extraction (consolidated from duplicated code)
 */
export function extractPostAuthorInfo(container: Element | null): PostAuthorInfo {
  if (!container) {
    return { post_author_name: '', post_author_profile: '' };
  }

  // Option 1: Post page selectors
  let authorLink = container.querySelector(
    '.update-components-actor__meta-link[href]',
  ) as HTMLAnchorElement;
  let authorName = container.querySelector('.update-components-actor__title span[dir="ltr"]');
  if (authorLink && authorName) {
    return {
      post_author_name: authorName.textContent?.trim() || '',
      post_author_profile: authorLink.href || '',
    };
  }

  // Option 2: Feed selectors
  authorLink = container.querySelector(
    'span.feed-shared-actor__name a, a.update-components-actor__meta-link, a.update-components-actor__image',
  ) as HTMLAnchorElement;
  authorName = container.querySelector(
    'span.feed-shared-actor__name, .update-components-actor__title',
  );
  if (authorLink && authorName) {
    return {
      post_author_name: authorName.textContent?.trim() || '',
      post_author_profile: authorLink.href || '',
    };
  }

  // Option 3: Hidden <code> block with MiniProfile JSON
  const codeBlocks = Array.from(document.querySelectorAll('code[id^="bpr-guid-"]'));
  for (const code of codeBlocks) {
    try {
      const json = JSON.parse(code.textContent || '');
      if (json.included && Array.isArray(json.included)) {
        for (const obj of json.included) {
          if (obj.$type && obj.$type.includes('MiniProfile')) {
            const firstName = obj.firstName || '';
            const lastName = obj.lastName || '';
            const publicIdentifier = obj.publicIdentifier || '';
            if (publicIdentifier) {
              return {
                post_author_name: `${firstName} ${lastName}`.trim(),
                post_author_profile: `https://www.linkedin.com/in/${publicIdentifier}`,
              };
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { post_author_name: '', post_author_profile: '' };
}

/**
 * Universal post content extraction (consolidated from duplicated code)
 */
export function extractPostContent(
  container: Element | null,
): Array<{ type: string; data: string }> {
  if (!container) return [];

  // Try post page selector
  let contentBlock = container.querySelector(
    '.feed-shared-inline-show-more-text .update-components-text',
  );
  if (!contentBlock) {
    // Fallback to feed selector
    contentBlock = container.querySelector(
      '.feed-shared-update-v2__description, .update-components-text',
    );
  }

  let text = '';
  if (contentBlock) {
    text = Array.from(contentBlock.querySelectorAll('span, a'))
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join(' ');
  }

  // Extract images
  const images = Array.from(container.querySelectorAll('img')).map(img => ({
    type: 'image',
    data: (img as HTMLImageElement).src,
  }));

  // Extract videos (poster or video src)
  const videos = Array.from(container.querySelectorAll('video')).map(video => ({
    type: 'video',
    data: (video as HTMLVideoElement).src || (video as HTMLVideoElement).poster,
  }));

  const result: Array<{ type: string; data: string }> = [];
  if (text) result.push({ type: 'text', data: text });
  result.push(...images, ...videos);
  return result;
}

/**
 * Universal comment author extraction
 */
export function extractCommentAuthorInfo(commentNode: Element | null): CommentAuthorInfo {
  if (!commentNode) {
    return { comment_author_name: '', comment_author_profile: '' };
  }

  // Prefer the description container for name and profile
  let authorLink = commentNode.querySelector(
    '.comments-comment-meta__description-container[href]',
  ) as HTMLAnchorElement;
  let authorName = commentNode.querySelector('.comments-comment-meta__description-title');

  // Fallback to image link
  if (!authorLink) {
    authorLink = commentNode.querySelector(
      '.comments-comment-meta__image-link[href]',
    ) as HTMLAnchorElement;
  }

  // Fallbacks for name
  if (!authorName) {
    authorName = commentNode.querySelector('h3, .comments-comment-meta__description-title');
  }

  return {
    comment_author_name: authorName?.textContent?.trim() || '',
    comment_author_profile: authorLink?.href || '',
  };
}

/**
 * Find the post container for any element (works for feed and post pages)
 */
export function findPostContainer(element: Element): Element | null {
  // Try closest feed-shared-update-v2 (main feed and post page)
  let container = element.closest('.feed-shared-update-v2');
  if (container) {
    return container;
  }

  // Try post-specific page: section.feed-detail-update__container .feed-shared-update-v2
  container = document.querySelector(
    'section.feed-detail-update__container .feed-shared-update-v2',
  );
  if (container) {
    return container;
  }

  // Try fallback: any .feed-shared-update-v2 on page
  container = document.querySelector('.feed-shared-update-v2');
  if (container) {
    return container;
  }

  return null;
}

/**
 * Robust logged-in user detection from DOM
 */
export function detectCurrentUser(): { name: string; profile: string } {
  // Try navbar
  const meNav = document.querySelector(
    'a.global-nav__me-photo, a[data-control-name="nav_settings_profile"]',
  ) as HTMLAnchorElement;
  if (meNav) {
    let name = meNav.getAttribute('aria-label') || meNav.getAttribute('alt') || '';
    if (!name) {
      const nameNode = meNav.closest('li')?.querySelector('.t-16.t-black.t-bold');
      if (nameNode) name = nameNode.textContent?.trim() || '';
    }
    const profile = meNav.href || meNav.getAttribute('href') || '';
    if (name || profile) return { name, profile };
  }

  // Try profile dropdown
  const profileLink = document.querySelector('a[href^="/in/"]') as HTMLAnchorElement;
  if (profileLink) {
    const name = profileLink.textContent?.trim() || '';
    const profile = profileLink.getAttribute('href') || '';
    if (name || profile) return { name, profile };
  }

  // Try profile card
  const cards = Array.from(document.querySelectorAll('.profile-card-member-details'));
  for (const card of cards) {
    const links = Array.from(card.querySelectorAll('a[href^="/in/"]'));
    for (const link of links) {
      const nameNode = link.querySelector('h3.profile-card-name');
      if (nameNode) {
        const name = nameNode.textContent?.trim() || '';
        const href = (link as HTMLAnchorElement).getAttribute('href');
        const profile = href ? new URL(href, window.location.origin).href : '';
        if (name || profile) {
          return { name, profile };
        }
      }
    }
  }

  // Try hidden code block
  const codeBlocks = Array.from(document.querySelectorAll('code[id^="bpr-guid-"]'));
  for (const code of codeBlocks) {
    try {
      const json = JSON.parse(code.textContent || '');
      if (json.included && Array.isArray(json.included)) {
        for (const obj of json.included) {
          if (obj.$type && obj.$type.includes('MiniProfile')) {
            const firstName = obj.firstName || '';
            const lastName = obj.lastName || '';
            const publicIdentifier = obj.publicIdentifier || '';
            const name = `${firstName} ${lastName}`.trim();
            const profile = publicIdentifier
              ? `https://www.linkedin.com/in/${publicIdentifier}`
              : '';
            if (name || profile) return { name, profile };
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { name: '', profile: '' };
}
