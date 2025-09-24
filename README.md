# Modern Monaco Self-Hosted Example

A complete reference implementation for self-hosting modern-monaco with proper web worker configuration and language services.

## 🚀 Features

- **Complete Self-Hosting**: Serves modern-monaco from your own server
- **Proper Worker Configuration**: All language service workers load correctly
- **Lazy Loading**: Syntax highlighting appears immediately, language services load in background
- **Multiple Language Support**: TypeScript, JavaScript, HTML, CSS, JSON with full IntelliSense
- **Development Server**: Hot reloading with file watching
- **Debug Console**: Real-time worker loading and error monitoring
- **Production Ready**: Optimized builds with compression and caching

## 📁 Project Structure

```
examples/self-hosted/
├── package.json              # Dependencies and scripts
├── server.js                 # Express server with proper MIME types and CORS
├── src/
│   ├── index.html            # Main HTML with import map configuration
│   └── app.js                # Application logic with workspace setup
├── scripts/
│   ├── build.js              # esbuild configuration
│   ├── dev.js                # Development server with hot reloading
│   └── copy-monaco.js        # Copies modern-monaco dist files
├── public/                   # Built assets (generated)
│   ├── index.html
│   ├── dist/
│   │   └── app.js
│   └── monaco/               # Modern-monaco distribution files
│       ├── index.mjs
│       ├── editor-core.mjs
│       ├── editor-worker-main.mjs
│       ├── lsp/
│       │   ├── typescript/worker.mjs
│       │   ├── html/worker.mjs
│       │   ├── css/worker.mjs
│       │   └── json/worker.mjs
│       └── onig.wasm
└── README.md                 # This file
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Build modern-monaco first** (from repository root):
   ```bash
   cd ../../
   npm install
   npm run prepublishOnly
   ```

2. **Install dependencies**:
   ```bash
   cd examples/self-hosted
   npm install
   ```

### Development Mode

1. **Setup and start development server**:
   ```bash
   npm run setup
   npm run dev
   ```

2. **Open your browser**:
   ```
   http://localhost:3000
   ```

The development server includes:
- Hot reloading when source files change
- Automatic rebuilding with esbuild
- File watching for `src/` and `scripts/` directories
- Real-time error reporting

### Production Mode

1. **Build for production**:
   ```bash
   NODE_ENV=production npm run build
   npm run copy-monaco
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## 🔧 Configuration Details

### Server Configuration

The Express server (`server.js`) includes:

- **MIME Types**: Proper `application/javascript` for `.mjs` files
- **CORS Headers**: Enables cross-origin worker loading
- **Compression**: Gzip compression for better performance
- **Security Headers**: COEP and COOP headers for worker isolation
- **Static Serving**: Serves modern-monaco from `/monaco` path

### Import Map Configuration

The HTML file includes a critical import map:

```html
<script type="importmap">
{
    "imports": {
        "modern-monaco": "/monaco/index.mjs",
        "modern-monaco/editor-core": "/monaco/editor-core.mjs",
        "modern-monaco/lsp": "/monaco/lsp/index.mjs",
        "modern-monaco/workspace": "/monaco/workspace.mjs",
        "modern-monaco/cache": "/monaco/cache.mjs",
        "modern-monaco/editor-worker": "/monaco/editor-worker.mjs",
        "modern-monaco/editor-worker-main": "/monaco/editor-worker-main.mjs"
    }
}
</script>
```

### Worker Loading

The application demonstrates:

- **Base Editor Worker**: `editor-worker-main.mjs` for core functionality
- **Language Workers**: TypeScript, HTML, CSS, JSON workers load on demand
- **Cross-Origin Handling**: Automatic blob URL creation for cross-origin scenarios
- **Error Handling**: Comprehensive worker error detection and reporting

## 🐛 Debugging

### Debug Console

The application includes a real-time debug console that shows:

- Worker creation events
- File loading status
- Error messages
- Language service initialization

### Debug Endpoints

- **Health Check**: `http://localhost:3000/health`
- **File Verification**: `http://localhost:3000/debug/files`
- **Monaco Verification**: `http://localhost:3000/monaco/verification.json`

### Common Issues

1. **"Could not create web worker(s)" Error**:
   - Check that `editor-worker-main.mjs` is accessible
   - Verify MIME type is `application/javascript`
   - Ensure import map paths are correct

2. **Language Services Not Working**:
   - Check that language-specific workers are loading
   - Verify TypeScript/HTML/CSS/JSON worker files exist
   - Check browser console for import errors

3. **CORS Errors**:
   - Ensure server has proper CORS headers
   - Check that all files are served from same origin or with proper headers

### Manual Verification

Test worker files directly:

```bash
# Check if files are accessible
curl -I http://localhost:3000/monaco/editor-worker-main.mjs
curl -I http://localhost:3000/monaco/lsp/typescript/worker.mjs
curl -I http://localhost:3000/monaco/onig.wasm
```

## 📚 Sample Files

The workspace includes sample files demonstrating:

- **HTML**: Modern HTML5 with import maps
- **JavaScript**: ES modules with async/await
- **CSS**: Modern CSS with custom properties
- **TypeScript**: JSDoc annotations for type checking
- **JSON**: Package.json with proper structure

## 🎯 Key Learning Points

1. **Import Maps Are Critical**: Modern-monaco relies on import maps for module resolution
2. **Worker Loading Is Lazy**: Language workers only load when needed
3. **MIME Types Matter**: `.mjs` files must be served as `application/javascript`
4. **CORS Is Required**: For cross-origin worker loading
5. **Error Handling**: Proper error handling helps debug worker issues

## 🚀 Next Steps

- Customize the workspace with your own files
- Add more language configurations
- Implement custom language services
- Add authentication and user management
- Deploy to production with proper CDN setup

## 📖 Additional Resources

- [Modern Monaco Documentation](../../README.md)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/docs.html)
- [Web Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
