// Optimized comment tracking utilities using shared extractors
import {
  detectCurrentUser,
  extractCommentAuthorInfo,
  extractPostAuthorInfo,
  extractPostContent,
  findPostContainer,
} from './linkedin-extractors';

export interface CommentData {
  type: 'comment';
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

/**
 * Creates an optimized comment submission event listener
 */
export function createCommentListener(
  callback: (commentData: CommentData) => void,
  debug = false,
): (event: Event) => void {
  return function handleCommentSubmission(event: Event) {
    const target = event.target as Element;

    // Use closest() to find submit button (handles clicks on child elements)
    const submitButton = target.closest('button[class*="comments-comment-box__submit-button"]');
    if (!submitButton) return;

    if (debug) console.log('[Comment Tracker] Submit button clicked:', submitButton);

    // Find comment editor
    const editorContainer = submitButton.closest('.comments-comment-texteditor');
    if (!editorContainer) {
      if (debug) console.warn('[Comment Tracker] No editor container found');
      return;
    }

    const editor = editorContainer.querySelector('.ql-editor[contenteditable="true"]');
    if (!editor) {
      if (debug) console.warn('[Comment Tracker] No editor found');
      return;
    }

    const commentText = editor.textContent?.trim() || '';
    if (!commentText) {
      if (debug) console.log('[Comment Tracker] Empty comment, skipping');
      return;
    }

    // Find post container using shared utility
    const postContainer = findPostContainer(editorContainer);
    if (!postContainer) {
      if (debug) console.warn('[Comment Tracker] No post container found');
      return;
    }

    // Extract data using shared utilities
    const postContent = extractPostContent(postContainer);
    const postAuthor = extractPostAuthorInfo(postContainer);

    if (debug) {
      console.log('[Comment Tracker] Extracted post data:', { postContent, postAuthor });
    }

    // Wait for comment to appear in DOM, then extract author info
    setTimeout(() => {
      const commentNodes = Array.from(document.querySelectorAll('.comments-comment-entity'));
      const newCommentNode = commentNodes.find(node => {
        const content = node.querySelector(
          '.comments-comment-item__main-content, .update-components-text, span[dir="ltr"]',
        );
        return content && content.textContent?.trim() === commentText;
      });

      let comment_author_name = '';
      let comment_author_profile = '';

      if (newCommentNode) {
        const authorInfo = extractCommentAuthorInfo(newCommentNode);
        comment_author_name = authorInfo.comment_author_name;
        comment_author_profile = authorInfo.comment_author_profile;
        if (debug) console.log('[Comment Tracker] Author from comment node:', authorInfo);
      } else {
        // Fallback to current user detection
        const userInfo = detectCurrentUser();
        comment_author_name = userInfo.name;
        comment_author_profile = userInfo.profile;
        if (debug) console.log('[Comment Tracker] Fallback to current user:', userInfo);
      }

      const commentData: CommentData = {
        type: 'comment',
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

      if (debug) console.log('[Comment Tracker] Final comment data:', commentData);
      callback(commentData);
    }, 200);
  };
}
