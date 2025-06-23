import type { MediaItem, PostData } from './linkedin-dom';

/**
 * Convert LinkedIn post data to markdown format for documentation
 */
export function formatPostAsMarkdown(postData: PostData): string {
  const sections: string[] = [];

  // Header
  sections.push('# LinkedIn Post');
  sections.push('');

  // Author Information
  sections.push('## Author Information');
  sections.push(`**Author:** ${postData.author}`);
  if (postData.authorUrl) {
    sections.push(`**Profile:** ${postData.authorUrl}`);
  }
  if (postData.authorTitle) {
    sections.push(`**Title:** ${postData.authorTitle}`);
  }
  if (postData.postUrl) {
    sections.push(`**Post URL:** ${postData.postUrl}`);
  }
  sections.push(`**Timestamp:** ${postData.timestamp}`);
  sections.push(`**Media Type:** ${postData.mediaType}`);
  if (postData.isCompanyPost && postData.companyName) {
    sections.push(`**Company:** ${postData.companyName}`);
  }
  sections.push('');
  sections.push('---');
  sections.push('');

  // Post Content
  sections.push('## Post Content');
  sections.push('');

  // Group content by type
  const contentByType = groupContentByType(postData.content);

  // Text content first
  if (contentByType.text.length > 0) {
    sections.push('### Text Content');
    contentByType.text.forEach(item => {
      sections.push(item.data);
      sections.push('');
    });
  }

  // Media items
  if (hasNonTextContent(contentByType)) {
    sections.push('### Media Items');
    sections.push('');

    // Images
    if (contentByType.image.length > 0) {
      sections.push('#### Images');
      contentByType.image.forEach((item, index) => {
        const altText = item.metadata?.alt || `Image ${index + 1}`;
        sections.push(`![${altText}](${item.data})`);
        if (item.metadata?.title || item.metadata?.description) {
          sections.push(`*${item.metadata.title || item.metadata.description}*`);
        }
        sections.push('');
      });
    }

    // Videos
    if (contentByType.video.length > 0) {
      sections.push('#### Videos');
      contentByType.video.forEach((item, index) => {
        sections.push(`🎥 **Video ${index + 1}**`);
        sections.push(`- **URL:** ${item.data}`);
        if (item.metadata?.thumbnail) {
          sections.push(`- **Thumbnail:** ${item.metadata.thumbnail}`);
        }
        if (item.metadata?.duration) {
          sections.push(`- **Duration:** ${item.metadata.duration}`);
        }
        if (item.metadata?.title || item.metadata?.description) {
          sections.push(`- **Description:** ${item.metadata.title || item.metadata.description}`);
        }
        sections.push('');
      });
    }

    // Documents
    if (contentByType.document.length > 0) {
      sections.push('#### Documents');
      contentByType.document.forEach((item, index) => {
        sections.push(`📎 **Document ${index + 1}**`);
        if (item.metadata?.title) {
          sections.push(`- **Title:** ${item.metadata.title}`);
        }
        sections.push(`- **URL:** ${item.data}`);
        if (item.metadata?.filename) {
          sections.push(`- **Filename:** ${item.metadata.filename}`);
        }
        if (item.metadata?.size) {
          sections.push(`- **Size:** ${item.metadata.size}`);
        }
        if (item.metadata?.description) {
          sections.push(`- **Description:** ${item.metadata.description}`);
        }
        sections.push('');
      });
    }

    // Articles/Links
    if (contentByType.article.length > 0) {
      sections.push('#### Articles/Links');
      contentByType.article.forEach((item, index) => {
        sections.push(`🔗 **Shared Article ${index + 1}**`);
        if (item.metadata?.title) {
          sections.push(`- **Title:** ${item.metadata.title}`);
        }
        sections.push(`- **URL:** ${item.data}`);
        if (item.metadata?.description) {
          sections.push(`- **Description:** ${item.metadata.description}`);
        }
        if (item.metadata?.thumbnail) {
          sections.push(`- **Thumbnail:** ${item.metadata.thumbnail}`);
        }
        sections.push('');
      });
    }

    // Carousels
    if (contentByType.carousel.length > 0) {
      sections.push('#### Carousels');
      contentByType.carousel.forEach((item, index) => {
        sections.push(`🎠 **Image Carousel ${index + 1}**`);
        try {
          const carouselData = JSON.parse(item.data) as Array<{
            src: string;
            alt?: string;
          }>;
          if (Array.isArray(carouselData)) {
            carouselData.forEach((img, imgIndex) => {
              sections.push(
                `- **Image ${imgIndex + 1}:** ${img.src}${img.alt ? ` - *${img.alt}*` : ''}`,
              );
            });
          }
        } catch {
          sections.push(`- **Data:** ${item.data}`);
        }
        if (item.metadata?.description) {
          sections.push(`- **Description:** ${item.metadata.description}`);
        }
        sections.push('');
      });
    }

    // Polls
    if (contentByType.poll.length > 0) {
      sections.push('#### Polls');
      contentByType.poll.forEach((item, index) => {
        try {
          const pollData = JSON.parse(item.data) as {
            question?: string;
            options?: string[];
          };
          sections.push(`📊 **Poll ${index + 1}:** ${pollData.question || 'Poll Question'}`);
          if (pollData.options && Array.isArray(pollData.options)) {
            pollData.options.forEach((option: string, optIndex: number) => {
              sections.push(`- Option ${optIndex + 1}: ${option}`);
            });
          }
        } catch {
          sections.push(`📊 **Poll ${index + 1}**`);
          sections.push(`- **Data:** ${item.data}`);
        }
        sections.push('');
      });
    }

    // Generic/Other media types
    if (contentByType.other.length > 0) {
      sections.push('#### Other Media');
      contentByType.other.forEach((item, index) => {
        sections.push(`📋 **${item.type} ${index + 1}**`);
        sections.push(`- **Data:** ${item.data}`);
        if (item.metadata) {
          Object.entries(item.metadata).forEach(([key, value]) => {
            if (value) {
              sections.push(`- **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`);
            }
          });
        }
        sections.push('');
      });
    }
  }

  // Footer
  sections.push('---');
  sections.push('');
  sections.push(`*Post extracted on ${new Date().toISOString()}*`);

  return sections.join('\\n');
}

/**
 * Group content items by type for organized display
 */
function groupContentByType(content: MediaItem[]) {
  return {
    text: content.filter(item => item.type === 'text'),
    image: content.filter(item => item.type === 'image'),
    video: content.filter(item => item.type === 'video'),
    document: content.filter(item => item.type === 'document'),
    article: content.filter(item => item.type === 'article'),
    carousel: content.filter(item => item.type === 'carousel'),
    poll: content.filter(item => item.type === 'poll'),
    other: content.filter(
      item =>
        !['text', 'image', 'video', 'document', 'article', 'carousel', 'poll'].includes(item.type),
    ),
  };
}

/**
 * Check if there's any non-text content to display
 */
function hasNonTextContent(contentByType: ReturnType<typeof groupContentByType>): boolean {
  return (
    contentByType.image.length > 0 ||
    contentByType.video.length > 0 ||
    contentByType.document.length > 0 ||
    contentByType.article.length > 0 ||
    contentByType.carousel.length > 0 ||
    contentByType.poll.length > 0 ||
    contentByType.other.length > 0
  );
}

/**
 * Create a simplified markdown format for quick viewing
 */
export function formatPostAsSimpleMarkdown(postData: PostData): string {
  const sections: string[] = [];

  // Header with author
  sections.push(`# ${postData.author}`);
  sections.push(`*${postData.timestamp} • ${postData.mediaType}*`);
  sections.push('');

  // Text content
  const textContent = postData.content.filter(item => item.type === 'text');
  if (textContent.length > 0) {
    textContent.forEach(item => {
      sections.push(item.data);
      sections.push('');
    });
  }

  // Media summary
  const mediaItems = postData.content.filter(item => item.type !== 'text');
  if (mediaItems.length > 0) {
    sections.push('**Attachments:**');
    mediaItems.forEach(item => {
      sections.push(
        `- ${item.type}: ${item.metadata?.title || item.metadata?.alt || 'Attachment'}`,
      );
    });
    sections.push('');
  }

  // Links
  if (postData.postUrl) {
    sections.push(`[View Original Post](${postData.postUrl})`);
  }
  if (postData.authorUrl) {
    sections.push(`[Author Profile](${postData.authorUrl})`);
  }

  return sections.join('\\n');
}

/**
 * Export post data as JSON with clean structure
 */
export function formatPostAsCleanJSON(postData: PostData): string {
  const cleanData = {
    author: {
      name: postData.author,
      url: postData.authorUrl,
      title: postData.authorTitle,
      company: postData.isCompanyPost ? postData.companyName : undefined,
    },
    post: {
      id: postData.postId,
      url: postData.postUrl,
      timestamp: postData.timestamp,
      mediaType: postData.mediaType,
    },
    content: postData.content.map(item => ({
      type: item.type,
      data: item.data,
      ...item.metadata,
    })),
  };

  return JSON.stringify(cleanData, null, 2);
}
