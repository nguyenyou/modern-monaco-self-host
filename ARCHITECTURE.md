# Modern Monaco Self-Hosted Architecture

This document explains the technical architecture of the self-hosted Modern Monaco example, focusing on how web workers are properly configured and loaded.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Environment                       │
├─────────────────────────────────────────────────────────────────┤
│  Main Thread                    │  Web Workers                   │
│  ┌─────────────────────────────┐│  ┌───────────────────────────┐ │
│  │ index.html                  ││  │ editor-worker-main.mjs    │ │
│  │ ├─ Import Map               ││  │ (Core editor functions)   │ │
│  │ ├─ Monaco Custom Element    ││  └───────────────────────────┘ │
│  │ └─ App Logic                ││  ┌───────────────────────────┐ │
│  └─────────────────────────────┘│  │ typescript/worker.mjs     │ │
│  ┌─────────────────────────────┐│  │ (TypeScript LSP)          │ │
│  │ Modern Monaco Core          ││  └───────────────────────────┘ │
│  │ ├─ Lazy Loading             ││  ┌───────────────────────────┐ │
│  │ ├─ Workspace Management     ││  │ html/worker.mjs           │ │
│  │ └─ Worker Coordination      ││  │ (HTML LSP)                │ │
│  └─────────────────────────────┘│  └───────────────────────────┘ │
│                                 │  ┌───────────────────────────┐ │
│                                 │  │ css/worker.mjs            │ │
│                                 │  │ (CSS LSP)                 │ │
│                                 │  └───────────────────────────┘ │
│                                 │  ┌───────────────────────────┐ │
│                                 │  │ json/worker.mjs           │ │
│                                 │  │ (JSON LSP)                │ │
│                                 │  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        Express Server                           │
├─────────────────────────────────────────────────────────────────┤
│  Static File Serving            │  MIME Type Configuration       │
│  ┌─────────────────────────────┐│  ┌───────────────────────────┐ │
│  │ /public/                    ││  │ .mjs → application/       │ │
│  │ ├─ index.html               ││  │        javascript         │ │
│  │ ├─ dist/app.js              ││  │ .wasm → application/wasm  │ │
│  │ └─ monaco/ (all files)      ││  └───────────────────────────┘ │
│  └─────────────────────────────┘│  ┌───────────────────────────┐ │
│                                 │  │ CORS Headers              │ │
│                                 │  │ ├─ Access-Control-*       │ │
│                                 │  │ └─ Cross-Origin-*         │ │
│                                 │  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Worker Loading Sequence

### 1. Initial Page Load

```javascript
// 1. HTML loads with import map
<script type="importmap">
{
    "imports": {
        "modern-monaco": "/monaco/index.mjs",
        "modern-monaco/editor-core": "/monaco/editor-core.mjs",
        // ... other mappings
    }
}
</script>

// 2. App.js imports modern-monaco
import { lazy, Workspace } from 'modern-monaco';

// 3. Lazy loading initializes
await lazy({ workspace, theme: 'vitesse-dark' });
```

### 2. Monaco Environment Setup

```javascript
// Modern Monaco sets up MonacoEnvironment
Reflect.set(globalThis, "MonacoEnvironment", {
    getWorker: async (_workerId: string, label: string) => {
        if (label === "editorWorkerService") {
            return monaco.createEditorWorkerMain();
        }
    },
    getLanguageIdFromUri: (uri) => getLanguageIdFromPath(uri.path),
    getExtnameFromLanguageId: getExtnameFromLanguageId,
});
```

### 3. Language-Specific Worker Loading

```javascript
// When a language is first used (e.g., JavaScript)
languages.onLanguage('javascript', async () => {
    // 1. Load syntax highlighting
    registerShikiMonacoTokenizer(monaco, highlighter, 'javascript');
    
    // 2. Check for LSP provider
    const lspProvider = lspProviderMap['typescript']; // JS uses TS worker
    
    // 3. Dynamically import setup module
    const { setup } = await lspProvider.import(); // → lsp/typescript/setup.js
    
    // 4. Setup creates the worker
    await setup(monaco, 'javascript', settings, formatting, workspace);
});
```

### 4. Worker Creation Process

```javascript
// In lsp/typescript/setup.js
function createWebWorker(): Worker {
    const workerUrl = new URL("./worker.mjs", import.meta.url);
    
    // Handle cross-origin scenarios
    if (workerUrl.origin !== location.origin) {
        return new Worker(
            URL.createObjectURL(new Blob([`import "${workerUrl.href}"`], 
            { type: "application/javascript" })),
            { type: "module", name: "typescript-worker" }
        );
    }
    
    return new Worker(workerUrl, { type: "module", name: "typescript-worker" });
}

function getWorker(createData) {
    const worker = createWebWorker();
    worker.postMessage(createData); // Initialize worker with data
    return worker;
}
```

### 5. Worker Initialization

```javascript
// In lsp/typescript/worker.js
import { initializeWorker } from "../../editor-worker.js";

class TypeScriptWorker extends WorkerBase {
    constructor(ctx, createData) {
        super(ctx, createData);
        // Initialize TypeScript language service
        this.#languageService = ts.createLanguageService(this);
    }
    
    // Implement language service methods
    async doComplete(uri, position) { /* ... */ }
    async doDiagnostics(uri) { /* ... */ }
    // ... other methods
}

// Register the worker
initializeWorker(TypeScriptWorker);
```

## 🛠️ Critical Configuration Points

### 1. Import Map Resolution

The import map is crucial for resolving module paths:

```html
<script type="importmap">
{
    "imports": {
        "modern-monaco": "/monaco/index.mjs",
        "modern-monaco/editor-core": "/monaco/editor-core.mjs",
        "modern-monaco/lsp": "/monaco/lsp/index.mjs"
    }
}
</script>
```

**Why it matters:**
- Workers use `import.meta.url` to resolve relative paths
- Without proper mapping, worker imports fail
- Each worker needs access to its dependencies

### 2. MIME Type Configuration

```javascript
// In server.js
app.use((req, res, next) => {
    if (req.path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    if (req.path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
    }
    next();
});
```

**Why it matters:**
- Browsers require correct MIME types for ES modules
- Workers won't load if MIME type is incorrect
- WASM files need proper content type

### 3. CORS Headers

```javascript
// Enable CORS for cross-origin worker loading
app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Why it matters:**
- Workers may be loaded from different origins
- CORS prevents worker loading failures
- Required for CDN deployments

## 🔍 Debugging Worker Issues

### 1. Worker Creation Monitoring

```javascript
// Override Worker constructor to monitor creation
const originalWorker = window.Worker;
window.Worker = function(scriptURL, options) {
    console.log('🔧 Creating worker:', { url: scriptURL, name: options?.name });
    
    const worker = new originalWorker(scriptURL, options);
    
    worker.addEventListener('error', (error) => {
        console.error('❌ Worker error:', error);
    });
    
    return worker;
};
```

### 2. Network Monitoring

Check these requests in DevTools Network tab:
- `editor-worker-main.mjs` (should load immediately)
- `lsp/typescript/worker.mjs` (loads when JS/TS is used)
- `lsp/html/worker.mjs` (loads when HTML is used)
- `onig.wasm` (loads for syntax highlighting)

### 3. Common Failure Points

1. **Import Resolution Failures**
   - Worker can't find its dependencies
   - Import map paths are incorrect
   - Relative path resolution fails

2. **MIME Type Issues**
   - Server serves `.mjs` as `text/plain`
   - Browser rejects module loading
   - Worker creation fails silently

3. **CORS Violations**
   - Cross-origin requests blocked
   - Missing CORS headers
   - Preflight requests fail

## 🚀 Performance Optimizations

### 1. Lazy Loading Strategy

Modern Monaco implements intelligent lazy loading:

```javascript
// Syntax highlighting loads immediately (Shiki)
const prerenderedHTML = render(highlighter, code, { language });

// Language services load in background
languages.onLanguage(id, async () => {
    // This only runs when language is actually used
    await setupLanguageService(id);
});
```

### 2. Worker Reuse

Workers are created once and reused:

```javascript
// In typescript/setup.js
let worker: Promise<MonacoWebWorker> | MonacoWebWorker | null = null;

export async function setup(...args) {
    if (!worker) {
        worker = createWorker(...args);
    }
    if (worker instanceof Promise) {
        worker = await worker;
    }
    return worker;
}
```

### 3. Caching Strategy

```javascript
// Server-side caching
app.use((req, res, next) => {
    if (req.path.match(/\.(mjs|wasm|js)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    next();
});
```

## 📊 File Size Analysis

| Component | Size | Purpose |
|-----------|------|---------|
| `editor-core.mjs` | ~800KB | Core Monaco functionality |
| `editor-worker-main.mjs` | ~50KB | Base editor worker |
| `lsp/typescript/worker.mjs` | ~2MB | TypeScript language service |
| `lsp/html/worker.mjs` | ~200KB | HTML language service |
| `lsp/css/worker.mjs` | ~150KB | CSS language service |
| `lsp/json/worker.mjs` | ~100KB | JSON language service |
| `onig.wasm` | ~600KB | Regex engine for syntax highlighting |

**Total:** ~4MB (loaded progressively)

## 🎯 Best Practices

1. **Always use import maps** for module resolution
2. **Configure proper MIME types** on your server
3. **Enable CORS** for cross-origin scenarios
4. **Monitor worker creation** in development
5. **Test with different languages** to verify all workers load
6. **Use compression** for production deployments
7. **Implement proper error handling** for worker failures
8. **Cache static assets** for better performance

This architecture ensures that Modern Monaco works reliably in self-hosted environments while maintaining the performance benefits of web workers and lazy loading.
