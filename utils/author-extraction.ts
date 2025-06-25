// Shared author extraction utilities for LinkedIn AI Assistant
// Consolidates duplicated author extraction logic between post and comment tracking

export interface AuthorInfo {
  name: string;
  profile: string;
}

/**
 * Universal author extraction from LinkedIn DOM elements
 * Works for both posts and comments with fallback strategies
 */
export function extractAuthorInfoUniversal(container: Element | null): AuthorInfo {
  if (!container) {
    return { name: '', profile: '' };
  }

  // Strategy 1: Post page selectors
  let authorLink = container.querySelector(
    '.update-components-actor__meta-link[href]',
  ) as HTMLAnchorElement;
  let authorName = container.querySelector('.update-components-actor__title span[dir="ltr"]');
  if (authorLink && authorName) {
    return {
      name: authorName.textContent?.trim() || '',
      profile: authorLink.href || '',
    };
  }

  // Strategy 2: Feed selectors
  authorLink = container.querySelector(
    'span.feed-shared-actor__name a, a.update-components-actor__meta-link, a.update-components-actor__image',
  ) as HTMLAnchorElement;
  authorName = container.querySelector(
    'span.feed-shared-actor__name, .update-components-actor__title',
  );
  if (authorLink && authorName) {
    return {
      name: authorName.textContent?.trim() || '',
      profile: authorLink.href || '',
    };
  }

  // Strategy 3: Comment-specific selectors
  const commentAuthorLink = container.querySelector(
    '.comments-comment-meta__description-container[href], .comments-comment-meta__image-link[href]',
  ) as HTMLAnchorElement;
  const commentAuthorName = container.querySelector(
    '.comments-comment-meta__description-title, h3',
  );
  if (commentAuthorLink && commentAuthorName) {
    return {
      name: commentAuthorName.textContent?.trim() || '',
      profile: commentAuthorLink.href || '',
    };
  }

  // Strategy 4: Hidden JSON data extraction
  const jsonAuthor = extractAuthorFromHiddenJSON();
  if (jsonAuthor.name || jsonAuthor.profile) {
    return jsonAuthor;
  }

  // Strategy 5: Logged-in user detection (for comments)
  const userInfo = detectLoggedInUser();
  if (userInfo.name || userInfo.profile) {
    return userInfo;
  }

  return { name: '', profile: '' };
}

/**
 * Extract author info from hidden JSON MiniProfile data
 */
function extractAuthorFromHiddenJSON(): AuthorInfo {
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
                name: `${firstName} ${lastName}`.trim(),
                profile: `https://www.linkedin.com/in/${publicIdentifier}`,
              };
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return { name: '', profile: '' };
}

/**
 * Detect currently logged-in user from DOM
 */
function detectLoggedInUser(): AuthorInfo {
  // Strategy 1: Navigation bar
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

  // Strategy 2: Profile links
  const profileLink = document.querySelector('a[href^="/in/"]') as HTMLAnchorElement;
  if (profileLink) {
    const name = profileLink.textContent?.trim() || '';
    const profile = profileLink.getAttribute('href') || '';
    if (name || profile) return { name, profile };
  }

  // Strategy 3: Profile card
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

  return { name: '', profile: '' };
}
