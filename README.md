# LinkedIn AI Comment Assistant

A Chrome extension built with Plasmo that helps capture LinkedIn posts for AI-assisted commenting. The extension injects a "Capture for AI Comment" button alongside LinkedIn's native social action buttons (Like, Comment, Repost, Send).

## Features

- ✨ Seamlessly integrates with LinkedIn's UI
- 🚀 Performance-optimized for infinite scroll feeds
- 🎯 Captures post content, author, and metadata
- 🔌 Configurable API endpoint for backend integration
- 💾 Uses Chrome storage for configuration

## Getting Started

```bash
pnpm install
pnpm dev
```

Then load the extension in Chrome from the `build/chrome-mv3-dev` directory.

## Configuration

1. Right-click the extension icon and select "Options"
2. Enter your API endpoint URL
3. The extension will POST captured data to your configured endpoint

## API Payload

The extension sends POST requests with this structure:

```json
{
  "postId": "string",
  "content": "string",
  "author": "string",
  "authorUrl": "string",
  "postUrl": "string",
  "timestamp": "string",
  "mediaType": "text|image|video|document"
}
```

## Development

This extension uses:

- Intersection Observer for performance optimization
- React components for UI
- Plasmo messaging for background communication
- Chrome storage for configuration persistence
