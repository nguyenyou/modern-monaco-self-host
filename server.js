import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression for better performance
app.use(compression());

// Configure CORS for cross-origin worker loading
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Configure proper MIME types for modern web modules
app.use((req, res, next) => {
  // Set MIME type for .mjs files (ES modules)
  if (req.path.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  
  // Set MIME type for .wasm files
  if (req.path.endsWith('.wasm')) {
    res.setHeader('Content-Type', 'application/wasm');
  }
  
  // Add cache headers for static assets
  if (req.path.match(/\.(mjs|wasm|js|css|html)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for immutable assets
  }
  
  // Add security headers
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Additional MIME type configuration
    if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// Serve modern-monaco distribution files
app.use('/monaco', express.static(path.join(__dirname, '../../dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    workers: 'enabled'
  });
});

// Debug endpoint to check file availability
app.get('/debug/files', (req, res) => {
  const files = [
    '/monaco/index.mjs',
    '/monaco/editor-core.mjs',
    '/monaco/lsp/index.mjs',
    '/monaco/lsp/typescript/worker.mjs',
    '/monaco/lsp/html/worker.mjs',
    '/monaco/lsp/css/worker.mjs',
    '/monaco/lsp/json/worker.mjs',
    '/monaco/onig.wasm'
  ];
  
  res.json({
    message: 'Check these URLs to verify file availability',
    files: files.map(file => ({
      path: file,
      url: `http://localhost:${PORT}${file}`
    }))
  });
});

// Handle specific file extensions properly
app.get('*.js', (req, res) => {
  // Don't serve HTML for JS requests
  res.status(404).send('JavaScript file not found');
});

app.get('*.mjs', (req, res) => {
  // Don't serve HTML for module requests
  res.status(404).send('Module file not found');
});

// Fallback to index.html only for HTML requests
app.get('*', (req, res) => {
  // Only serve index.html for navigation requests, not for assets
  if (req.accepts('html') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).send('File not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Self-hosted Modern Monaco server running on http://localhost:${PORT}`);
  console.log(`📁 Serving modern-monaco from: /monaco`);
  console.log(`🔧 Debug endpoint: http://localhost:${PORT}/debug/files`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
