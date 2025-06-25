import React, { useState } from 'react';

import '~style.css';

// Authentic Lucide SVG icons - 2x bigger (w-8 h-8)
const RabbitIcon = () => (
  <svg
    className="plasmo-w-8 plasmo-h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 16a3 3 0 0 1 2.24 5" />
    <path d="M18 12h.01" />
    <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3" />
    <path d="M20 8.54V4a2 2 0 1 0-4 0v3" />
    <path d="M7.612 12.524a3 3 0 1 0-1.6 4.3" />
  </svg>
);

const LoaderIcon = () => (
  <svg
    className="plasmo-w-8 plasmo-h-8 plasmo-animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2v4" />
    <path d="m16.2 7.8 2.9-2.9" />
    <path d="M18 12h4" />
    <path d="m16.2 16.2 2.9 2.9" />
    <path d="M12 18v4" />
    <path d="m4.9 19.1 2.9-2.9" />
    <path d="M2 12h4" />
    <path d="m4.9 4.9 2.9 2.9" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="plasmo-w-8 plasmo-h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AlertIcon = () => (
  <svg
    className="plasmo-w-8 plasmo-h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="9" x2="15" y1="15" y2="9" />
  </svg>
);

export interface AiCaptureButtonProps {
  postId: string;
  onCapture: (postId: string) => Promise<void>;
}

type ButtonState = 'default' | 'loading' | 'success' | 'error' | 'captured';

const AiCaptureButton: React.FC<AiCaptureButtonProps> = ({ postId, onCapture }) => {
  const [state, setState] = useState<ButtonState>('default');

  const handleClick = async () => {
    if (state === 'loading' || state === 'captured') return;

    setState('loading');
    try {
      await onCapture(postId);
      setState('success');
      // After showing success for 1.5 seconds, permanently change to "captured"
      setTimeout(() => setState('captured'), 1500);
    } catch (error) {
      console.error('[AI Capture Button] Failed to capture post:', error);
      setState('error');
      // Reset to default after 3 seconds if there's an error
      setTimeout(() => setState('default'), 3000);
    }
  };

  const getButtonConfig = () => {
    switch (state) {
      case 'loading':
        return {
          icon: <LoaderIcon />,
          glowClass: 'plasmo-from-blue-400 plasmo-via-cyan-400 plasmo-to-blue-600',
          buttonClass: 'plasmo-bg-gray-800 plasmo-text-blue-400',
          disabled: true,
          ariaLabel: 'Capturing post...',
        };
      case 'success':
        return {
          icon: <CheckIcon />,
          glowClass: 'plasmo-from-green-400 plasmo-via-emerald-400 plasmo-to-green-600',
          buttonClass: 'plasmo-bg-gray-800 plasmo-text-green-400',
          disabled: true,
          ariaLabel: 'Post captured successfully!',
        };
      case 'captured':
        return {
          icon: <CheckIcon />,
          glowClass:
            'plasmo-from-green-300 plasmo-via-emerald-300 plasmo-to-green-500 plasmo-opacity-60',
          buttonClass: 'plasmo-bg-gray-700 plasmo-text-green-300 plasmo-opacity-80',
          disabled: true,
          ariaLabel: 'Post already captured',
        };
      case 'error':
        return {
          icon: <AlertIcon />,
          glowClass: 'plasmo-from-red-400 plasmo-via-pink-400 plasmo-to-red-600',
          buttonClass: 'plasmo-bg-gray-800 plasmo-text-red-400',
          disabled: false,
          ariaLabel: 'Failed to capture - click to retry',
        };
      default:
        return {
          icon: <RabbitIcon />,
          glowClass: 'plasmo-from-[#44BCFF] plasmo-via-[#FF44EC] plasmo-to-[#FF675E]',
          buttonClass: 'plasmo-bg-gray-900 plasmo-text-white hover:plasmo-text-gray-100',
          disabled: false,
          ariaLabel: 'Capture post for AI commenting',
        };
    }
  };

  const config = getButtonConfig();

  return (
    <div className="plasmo-relative plasmo-inline-flex plasmo-group">
      {/* Gradient glow background */}
      <div
        className={`
          plasmo-absolute plasmo-transition-all plasmo-duration-1000 plasmo-opacity-70 
          plasmo--inset-px plasmo-bg-gradient-to-r ${config.glowClass}
          plasmo-rounded-xl plasmo-blur-lg 
          group-hover:plasmo-opacity-100 group-hover:plasmo--inset-1 
          group-hover:plasmo-duration-200
          ${!config.disabled ? 'plasmo-animate-pulse' : ''}
        `}
      />

      {/* Main button */}
      <button
        role="button"
        aria-label={config.ariaLabel}
        tabIndex={0}
        className={`
          plasmo-relative plasmo-inline-flex plasmo-items-center plasmo-justify-center
          plasmo-w-12 plasmo-h-12
          plasmo-transition-all plasmo-duration-200 
          plasmo-rounded-xl plasmo-border-0
          ${config.buttonClass}
          ${config.disabled ? 'plasmo-cursor-not-allowed' : 'plasmo-cursor-pointer'}
        `}
        onClick={handleClick}
        disabled={config.disabled}
        data-post-id={postId}
      >
        {config.icon}
      </button>
    </div>
  );
};

export default AiCaptureButton;
