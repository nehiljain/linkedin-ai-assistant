// Configuration validation utilities for LinkedIn AI Assistant
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

export interface ExtensionConfig {
  postWebhook: string;
  commentWebhook: string;
  hasPostCapture: boolean;
  hasCommentCapture: boolean;
}

/**
 * Check current extension configuration
 */
export async function getExtensionConfig(): Promise<ExtensionConfig> {
  const [postWebhook, commentWebhook] = await Promise.all([
    storage.get('apiEndpoint'),
    storage.get('commentWebhook'),
  ]);

  return {
    postWebhook: postWebhook || '',
    commentWebhook: commentWebhook || '',
    hasPostCapture: !!postWebhook?.trim(),
    hasCommentCapture: !!commentWebhook?.trim(),
  };
}

/**
 * Check if any capture features are enabled
 */
export async function isAnyCaptureEnabled(): Promise<boolean> {
  const config = await getExtensionConfig();
  return config.hasPostCapture || config.hasCommentCapture;
}

/**
 * Check if comment capture specifically is enabled
 */
export async function isCommentCaptureEnabled(): Promise<boolean> {
  const config = await getExtensionConfig();
  return config.hasCommentCapture;
}
