# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use pnpm instead of npm for all commands:**

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting

## Architecture Overview

### Extension Structure

This is a Plasmo-based Chrome extension for LinkedIn that injects AI capture buttons into LinkedIn posts. The extension uses a three-layer architecture:

1. **Content Script** (`content.tsx`) - Main entry point that runs on LinkedIn pages
2. **Background Script** (`background/messages/capturePost.ts`) - Handles API communication
3. **Components** (`components/`) - React UI components

### Key Classes and Flow

- **LinkedInAiAssistant** - Main orchestrator class that manages the entire extension lifecycle
- **PerformanceManager** - Handles efficient post detection using Intersection Observer for LinkedIn's infinite scroll
- **AiCaptureButton** - React component that renders the rabbit icon button with state management

### Performance Architecture

The extension uses a sophisticated performance optimization system:

- Intersection Observer monitors when posts enter/exit viewport
- Throttled processing queue prevents overwhelming the DOM
- Button deduplication prevents duplicate injections
- Cleanup intervals manage memory usage for long-running sessions

### Data Flow

1. PerformanceManager detects visible posts via Intersection Observer
2. LinkedInAiAssistant validates and processes posts
3. AiCaptureButton components are injected into LinkedIn's action bars
4. User clicks trigger data extraction and background messaging
5. Background script sends post data to configured API endpoint

### Key Dependencies

- **Plasmo** - Extension framework with messaging and storage
- **React/ReactDOM** - For UI components
- **@plasmohq/messaging** - Inter-script communication
- **@plasmohq/storage** - Chrome extension storage wrapper

## Development Setup

1. Load extension in Chrome from `build/chrome-mv3-dev` after running `pnpm dev`
2. Configure API endpoint via extension options page
3. Extension only operates on LinkedIn feed pages (`https://www.linkedin.com/*`)

## Critical Implementation Details

- The `handlePostHidden` method in LinkedInAiAssistant is required for PerformanceManager initialization
- AiCaptureButton uses default export, import accordingly
- Extension matches LinkedIn's UI styling with custom CSS classes prefixed with `plasmo-`
- Post extraction logic handles various LinkedIn post types (text, image, video, document, article, poll)
