// Comment tracking utilities for LinkedIn AI Assistant
// Handles detection and extraction of LinkedIn comment data

import { extractAuthorInfoUniversal } from './author-extraction';

export interface CommentData {
  text: string;
  comment_author_name: string;
  comment_author_profile: string;
  timestamp: string;
  comment_url: string;
  postId: string;
  post_author_name: string;
  post_author_profile: string;
  post_content: Array<{ type: string; data: string }>;
}

export interface PostAuthorInfo {
  post_author_name: string;
  post_author_profile: string;
}

export interface CommentAuthorInfo {
  comment_author_name: string;
  comment_author_profile: string;
}

/**
 * Detects if an element is a LinkedIn comment submit button
 */
export function isCommentSubmitButton(element: Element): boolean {
  return element.matches('button[class*="comments-comment-box__submit-button"]');
}

/**
 * Finds the comment text editor associated with a submit button
 */
export function findCommentEditor(submitButton: Element): Element | null {
  const editorContainer = submitButton.closest('.comments-comment-texteditor');
  if (!editorContainer) {
    console.warn(
      '[Comment Tracker] Could not find .comments-comment-texteditor for submit button:',
      submitButton,
    );
    return null;
  }

  const editor = editorContainer.querySelector('.ql-editor[contenteditable="true"]');
  if (!editor) {
    console.warn('[Comment Tracker] Could not find .ql-editor for submit button:', submitButton);
    return null;
  }

  return editor;
}

/**
 * Extracts comment text from the editor element
 */
export function extractCommentText(editor: Element): string {
  return editor.textContent?.trim() || '';
}

/**
 * Finds the post container for a comment element (works for feed and post pages)
 */
export function getPostContainerUniversal(commentElement: Element): Element | null {
  // Try closest feed-shared-update-v2 (main feed and post page)
  let container = commentElement.closest('.feed-shared-update-v2');
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
 * Extracts post author information from a post container
 */
export function extractPostAuthorInfoUniversal(container: Element | null): PostAuthorInfo {
  const authorInfo = extractAuthorInfoUniversal(container);
  return {
    post_author_name: authorInfo.name,
    post_author_profile: authorInfo.profile,
  };
}

/**
 * Extracts post content from a post container
 */
export function extractPostContentUniversal(
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
 * Extracts comment author information from a comment node
 */
export function extractCommentAuthorInfoUniversal(commentNode: Element | null): CommentAuthorInfo {
  const authorInfo = extractAuthorInfoUniversal(commentNode);
  return {
    comment_author_name: authorInfo.name,
    comment_author_profile: authorInfo.profile,
  };
}

/**
 * Robust logged-in user detection from DOM
 */
export function detectUserFromDOM(): { name: string; profile: string } {
  return extractAuthorInfoUniversal(document.body);
}

/**
 * Creates a comment submission event listener
 */
export function createCommentSubmissionListener(
  callback: (commentData: CommentData) => void,
): (event: Event) => void {
  return function handleCommentSubmission(event: Event) {
    const target = event.target as Element;

    // Use closest() like the old code, not matches()
    const postBtn = target.closest('button[class*="comments-comment-box__submit-button"]');
    if (!postBtn) {
      return;
    }

    // Find the comment editor in the same container (following old code pattern)
    const editorContainer = postBtn.closest('.comments-comment-texteditor');
    if (!editorContainer) {
      console.warn('[Comment Tracker] Could not find comment editor container');
      return;
    }

    const editor = editorContainer.querySelector('.ql-editor[contenteditable="true"]');
    if (!editor) {
      console.warn('[Comment Tracker] Could not find comment editor');
      return;
    }

    const commentText = editor.textContent?.trim() || '';
    if (!commentText) {
      return; // Skip empty comments silently
    }

    // Find the post container
    const postContainer = getPostContainerUniversal(editorContainer);
    if (!postContainer) {
      console.warn('[Comment Tracker] Could not find post container');
      return;
    }

    // Extract post and author info
    const postContent = extractPostContentUniversal(postContainer);
    const postAuthor = extractPostAuthorInfoUniversal(postContainer);

    // Wait for the new comment to appear in the DOM, then extract author info
    setTimeout(() => {
      // Find all comment nodes in the thread
      const commentNodes = Array.from(document.querySelectorAll('.comments-comment-entity'));
      // Find the one whose text matches what we just submitted
      const newCommentNode = commentNodes.find(node => {
        const content = node.querySelector(
          '.comments-comment-item__main-content, .update-components-text, span[dir="ltr"]',
        );
        return content && content.textContent?.trim() === commentText;
      });

      let comment_author_name = '';
      let comment_author_profile = '';

      if (newCommentNode) {
        const authorInfo = extractCommentAuthorInfoUniversal(newCommentNode);
        comment_author_name = authorInfo.comment_author_name;
        comment_author_profile = authorInfo.comment_author_profile;
      } else {
        // Fallback: try to detect user from DOM
        const userInfo = detectUserFromDOM();
        comment_author_name = userInfo.name;
        comment_author_profile = userInfo.profile;
      }

      // Compose the final comment data
      const commentData: CommentData = {
        text: commentText,
        comment_author_name,
        comment_author_profile,
        timestamp: new Date().toISOString(),
        comment_url: window.location.href,
        postId:
          postContainer.getAttribute('data-urn') || postContainer.getAttribute('data-id') || '',
        post_author_name: postAuthor.post_author_name,
        post_author_profile: postAuthor.post_author_profile,
        post_content: postContent,
      };

      callback(commentData);
    }, 200); // 200ms delay to allow DOM update
  };
}
