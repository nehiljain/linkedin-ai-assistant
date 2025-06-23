import { getPostId, type MediaItem, type PostData } from './linkedin-dom';

/**
 * Extract all relevant data from a LinkedIn post container including all media types
 * Based on proven patterns from existing LinkedIn extension
 */
export function extractPostData(postContainer: Element): PostData | null {
  try {
    console.log('[Post Extractor] 🔍 Starting extraction for container:', postContainer);

    const postId = getPostId(postContainer);
    console.log('[Post Extractor] 🆔 Post ID:', postId);

    // Extract comprehensive post content including all media
    console.log('[Post Extractor] 📝 Extracting comprehensive content...');
    const content = extractComprehensivePostContent(postContainer);
    console.log('[Post Extractor] 📝 Content extracted:', content);

    // Extract author information using universal extraction
    console.log('[Post Extractor] 👤 Extracting author info...');
    const authorInfo = extractPostAuthorInfoUniversal(postContainer);
    console.log('[Post Extractor] 👤 Author info extracted:', authorInfo);

    // Extract post metadata
    console.log('[Post Extractor] 🔗 Extracting post URL...');
    const postUrl = extractPostUrlUniversal(postContainer);
    console.log('[Post Extractor] 🔗 Post URL:', postUrl);

    console.log('[Post Extractor] ⏰ Extracting timestamp...');
    const timestamp = extractTimestampUniversal(postContainer);
    console.log('[Post Extractor] ⏰ Timestamp:', timestamp);

    console.log('[Post Extractor] 🎬 Determining media type...');
    const mediaType = determineMediaType(content);
    console.log('[Post Extractor] 🎬 Media type:', mediaType);

    // Validate required fields
    if (!content.length || !authorInfo.post_author_name) {
      console.warn('[Post Extractor] ❌ Failed to extract required post data:', {
        contentLength: content.length,
        author: authorInfo.post_author_name,
        postId,
        hasContent: content.length > 0,
        hasAuthor: !!authorInfo.post_author_name,
      });
      return null;
    }

    return {
      postId,
      content,
      author: authorInfo.post_author_name,
      authorUrl: authorInfo.post_author_profile,
      authorTitle: undefined, // Not extracted in the reference implementation
      postUrl,
      timestamp,
      mediaType,
      isCompanyPost: false, // Simplified for now
      companyName: undefined,
    };
  } catch (error) {
    console.error('[LinkedIn AI Assistant] Error extracting post data:', error);
    return null;
  }
}

/**
 * Extract comprehensive post content including text, images, videos, documents, etc.
 * Based on proven patterns from existing LinkedIn extension
 */
function extractComprehensivePostContent(container: Element): MediaItem[] {
  if (!container) return [];

  const result: MediaItem[] = [];

  console.log('[Post Extractor] 📄 Extracting text content...');
  // Extract text content
  const textContent = extractTextContent(container);
  if (textContent) {
    result.push({
      type: 'text',
      data: textContent,
    });
  }

  console.log('[Post Extractor] 🖼️ Extracting images...');
  // Extract images
  const images = extractImages(container);
  result.push(...images);

  console.log('[Post Extractor] 🎥 Extracting videos...');
  // Extract videos
  const videos = extractVideos(container);
  result.push(...videos);

  console.log('[Post Extractor] 📎 Extracting documents...');
  // Extract documents and attachments
  const documents = extractDocuments(container);
  result.push(...documents);

  console.log('[Post Extractor] 📰 Extracting articles/links...');
  // Extract shared articles and links
  const articles = extractArticles(container);
  result.push(...articles);

  console.log('[Post Extractor] 🎠 Extracting carousels...');
  // Extract carousel content
  const carousels = extractCarousels(container);
  result.push(...carousels);

  console.log('[Post Extractor] 📊 Extracting polls...');
  // Extract polls
  const polls = extractPolls(container);
  result.push(...polls);

  console.log(`[Post Extractor] ✅ Total media items extracted: ${result.length}`);
  return result;
}

/**
 * Extract text content from post
 */
function extractTextContent(container: Element): string {
  // Try post page selector first
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
    // Extract text from spans and links within the content block
    text = Array.from(contentBlock.querySelectorAll('span, a'))
      .map(el => el.innerText?.trim())
      .filter(Boolean)
      .join(' ');

    // Fallback to direct text content if no spans/links found
    if (!text) {
      text = contentBlock.textContent?.trim() || '';
    }
  }

  return text;
}

/**
 * Extract images from post
 */
function extractImages(container: Element): MediaItem[] {
  const images: MediaItem[] = [];

  // Common image selectors in LinkedIn posts
  const imageSelectors = [
    '.feed-shared-image img',
    '.feed-shared-article__image img',
    '.media-image img',
    '.feed-shared-image-carousel img',
    '.image-container img',
    'img[src*="media.licdn.com"]',
    'img[src*="cdn.linkedin.com"]',
  ];

  imageSelectors.forEach(selector => {
    const imageElements = Array.from(container.querySelectorAll(selector));
    imageElements.forEach((img: HTMLImageElement) => {
      if (img.src && !img.src.includes('data:') && !img.src.includes('blob:')) {
        images.push({
          type: 'image',
          data: img.src,
          metadata: {
            alt: img.alt || undefined,
            title: img.title || undefined,
          },
        });
      }
    });
  });

  return images;
}

/**
 * Extract videos from post
 */
function extractVideos(container: Element): MediaItem[] {
  const videos: MediaItem[] = [];

  // Video selectors
  const videoSelectors = ['video', '.feed-shared-video video', '.media-video video'];

  videoSelectors.forEach(selector => {
    const videoElements = Array.from(container.querySelectorAll(selector));
    videoElements.forEach((video: HTMLVideoElement) => {
      const videoData: MediaItem = {
        type: 'video',
        data: video.src || video.currentSrc || '',
        metadata: {
          thumbnail: video.poster || undefined,
          duration: video.duration ? video.duration.toString() : undefined,
          title: video.title || undefined,
        },
      };

      // If no direct src, try to get from source elements
      if (!videoData.data) {
        const sources = video.querySelectorAll('source');
        if (sources.length > 0) {
          videoData.data = (sources[0] as HTMLSourceElement).src;
        }
      }

      if (videoData.data) {
        videos.push(videoData);
      }
    });
  });

  // Also check for embedded video previews with poster images
  const videoPreviews = container.querySelectorAll('.feed-shared-video, .media-video');
  videoPreviews.forEach(preview => {
    const posterImg = preview.querySelector('img');
    if (posterImg && posterImg.src) {
      videos.push({
        type: 'video',
        data: posterImg.src,
        metadata: {
          thumbnail: posterImg.src,
          alt: posterImg.alt || 'Video preview',
          description: 'Video thumbnail/preview',
        },
      });
    }
  });

  return videos;
}

/**
 * Extract documents and attachments
 */
function extractDocuments(container: Element): MediaItem[] {
  const documents: MediaItem[] = [];

  // Document attachment selectors
  const documentSelectors = ['.feed-shared-document', '.document-attachment', '.feed-shared-file'];

  documentSelectors.forEach(selector => {
    const docElements = Array.from(container.querySelectorAll(selector));
    docElements.forEach(doc => {
      const titleElement = doc.querySelector('.feed-shared-document__title, .document-title');
      const linkElement = doc.querySelector('a[href]');
      const thumbnail = doc.querySelector('img');

      if (titleElement || linkElement) {
        documents.push({
          type: 'document',
          data: (linkElement as HTMLAnchorElement)?.href || titleElement?.textContent || '',
          metadata: {
            title: titleElement?.textContent?.trim() || undefined,
            thumbnail: (thumbnail as HTMLImageElement)?.src || undefined,
            url: (linkElement as HTMLAnchorElement)?.href || undefined,
          },
        });
      }
    });
  });

  return documents;
}

/**
 * Extract shared articles and links
 */
function extractArticles(container: Element): MediaItem[] {
  const articles: MediaItem[] = [];

  // Article/link preview selectors
  const articleElements = Array.from(
    container.querySelectorAll('.feed-shared-article, .feed-shared-link-post'),
  );

  articleElements.forEach(article => {
    const titleElement = article.querySelector('.feed-shared-article__title, .link-post-title');
    const descElement = article.querySelector(
      '.feed-shared-article__description, .link-post-description',
    );
    const linkElement = article.querySelector('a[href]');
    const thumbnail = article.querySelector(
      '.feed-shared-article__image img, .link-preview-image img',
    );

    const title = titleElement?.textContent?.trim();
    const description = descElement?.textContent?.trim();
    const url = (linkElement as HTMLAnchorElement)?.href;

    if (title || url) {
      articles.push({
        type: 'article',
        data: url || title || '',
        metadata: {
          title: title || undefined,
          description: description || undefined,
          url: url || undefined,
          thumbnail: (thumbnail as HTMLImageElement)?.src || undefined,
        },
      });
    }
  });

  return articles;
}

/**
 * Extract carousel content (multiple images/media)
 */
function extractCarousels(container: Element): MediaItem[] {
  const carousels: MediaItem[] = [];

  // Carousel container selectors
  const carouselContainers = Array.from(
    container.querySelectorAll('.feed-shared-image-carousel, .media-carousel'),
  );

  carouselContainers.forEach((carousel, index) => {
    const carouselImages = Array.from(carousel.querySelectorAll('img'));
    const carouselData = carouselImages.map((img: HTMLImageElement) => ({
      src: img.src,
      alt: img.alt || undefined,
    }));

    if (carouselData.length > 0) {
      carousels.push({
        type: 'carousel',
        data: JSON.stringify(carouselData),
        metadata: {
          title: `Image carousel ${index + 1}`,
          description: `Carousel with ${carouselData.length} images`,
        },
      });
    }
  });

  return carousels;
}

/**
 * Extract polls
 */
function extractPolls(container: Element): MediaItem[] {
  const polls: MediaItem[] = [];

  // Poll selectors
  const pollElements = Array.from(container.querySelectorAll('.feed-shared-poll, .poll-container'));

  pollElements.forEach(poll => {
    const question = poll
      .querySelector('.poll-question, .feed-shared-poll__question')
      ?.textContent?.trim();
    const options = Array.from(poll.querySelectorAll('.poll-option, .feed-shared-poll__option'))
      .map(option => option.textContent?.trim())
      .filter(Boolean);

    if (question || options.length > 0) {
      polls.push({
        type: 'poll',
        data: JSON.stringify({ question, options }),
        metadata: {
          title: question || 'Poll',
          description: `Poll with ${options.length} options`,
        },
      });
    }
  });

  return polls;
}

/**
 * Determine the overall media type of the post based on content
 */
function determineMediaType(content: MediaItem[]): PostData['mediaType'] {
  const types = content.map(item => item.type);

  if (types.length === 0) return 'text';
  if (types.length === 1) return types[0] as PostData['mediaType'];

  // Multiple types = mixed
  return 'mixed';
}

/**
 * Universal post author extraction (based on working LinkedIn extension)
 */
function extractPostAuthorInfoUniversal(container: Element): {
  post_author_name: string;
  post_author_profile: string;
} {
  // Option 1: Post page selectors
  let authorLink = container?.querySelector('.update-components-actor__meta-link[href]');
  let authorName = container?.querySelector('.update-components-actor__title span[dir="ltr"]');
  if (authorLink && authorName) {
    return {
      post_author_name: authorName.textContent?.trim() || '',
      post_author_profile: (authorLink as HTMLAnchorElement).href || '',
    };
  }

  // Option 2: Feed selectors
  authorLink = container?.querySelector(
    'span.feed-shared-actor__name a, a.update-components-actor__meta-link, a.update-components-actor__image',
  );
  authorName = container?.querySelector(
    'span.feed-shared-actor__name, .update-components-actor__title',
  );
  if (authorLink && authorName) {
    return {
      post_author_name: authorName.textContent?.trim() || '',
      post_author_profile: (authorLink as HTMLAnchorElement).href || '',
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
    } catch (e) {
      console.log('Parse error in post author extraction:', e);
    }
  }

  // Option 4: Empty fallback
  return { post_author_name: '', post_author_profile: '' };
}

/**
 * Extract post URL/permalink (simplified)
 */
function extractPostUrlUniversal(postContainer: Element): string {
  // Try to find a permalink to the post
  const postLinkSelectors = [
    '.feed-shared-actor__sub-description a',
    '.update-components-actor__sub-description a',
    'time[datetime]',
  ];

  for (const selector of postLinkSelectors) {
    const linkElement = postContainer.querySelector(selector) as HTMLAnchorElement;
    if (linkElement?.href) {
      return linkElement.href;
    }
  }

  // Fallback: try to construct URL from post ID
  const postId = getPostId(postContainer);
  if (postId.includes('urn:li:activity:')) {
    const activityId = postId.replace('urn:li:activity:', '');
    return `https://www.linkedin.com/feed/update/${activityId}/`;
  }

  return window.location.href; // Fallback to current page
}

/**
 * Extract post timestamp (simplified)
 */
function extractTimestampUniversal(postContainer: Element): string {
  const timestampSelectors = [
    '.feed-shared-actor__sub-description time',
    '.update-components-actor__sub-description time',
    'time[datetime]',
  ];

  for (const selector of timestampSelectors) {
    const timeElement = postContainer.querySelector(selector);
    if (timeElement) {
      // Try to get the datetime attribute first
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) return datetime;

      // Fallback to text content
      const timeText = timeElement.textContent?.trim();
      if (timeText) return timeText;
    }
  }

  return new Date().toISOString(); // Fallback to current time
}

/**
 * Validate that the extracted data is complete and valid
 */
export function validatePostData(data: PostData | null): data is PostData {
  if (!data) return false;

  // Check required fields
  if (!data.postId || !data.content || !data.author) {
    console.warn('[LinkedIn AI Assistant] Missing required fields:', {
      postId: !!data.postId,
      contentLength: data.content?.length || 0,
      author: !!data.author,
    });
    return false;
  }

  // Check that content array has at least one item
  if (!Array.isArray(data.content) || data.content.length === 0) {
    console.warn('[LinkedIn AI Assistant] Content array is empty:', data.content);
    return false;
  }

  // Check that at least one content item has meaningful data
  const hasValidContent = data.content.some(item => item.data && item.data.trim().length > 0);

  if (!hasValidContent) {
    console.warn('[LinkedIn AI Assistant] No valid content found in array:', data.content);
    return false;
  }

  return true;
}

/**
 * Sanitize extracted text content
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .trim();
}
