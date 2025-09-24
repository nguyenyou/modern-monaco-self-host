import { lazy, Workspace } from 'modern-monaco';

// Debug logging utility
class DebugLogger {
    constructor() {
        this.logElement = document.getElementById('debugLog');
        this.maxLogs = 50;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = type;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logElement.appendChild(logEntry);
        
        // Keep only the last N logs
        while (this.logElement.children.length > this.maxLogs) {
            this.logElement.removeChild(this.logElement.firstChild);
        }
        
        // Auto-scroll to bottom
        this.logElement.scrollTop = this.logElement.scrollHeight;
        
        // Also log to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    success(message) { this.log(message, 'success'); }
    error(message) { this.log(message, 'error'); }
    info(message) { this.log(message, 'info'); }
}

// Status indicator utility
class StatusIndicator {
    constructor() {
        this.indicator = document.getElementById('statusIndicator');
        this.text = document.getElementById('statusText');
    }

    setStatus(status, message) {
        this.indicator.className = `status-indicator ${status}`;
        this.text.textContent = message;
    }

    loading(message = 'Loading...') {
        this.setStatus('', message);
    }

    ready(message = 'Ready') {
        this.setStatus('ready', message);
    }

    error(message = 'Error') {
        this.setStatus('error', message);
    }
}

// File tree management
class FileTreeManager {
    constructor(workspace, onFileSelect) {
        this.workspace = workspace;
        this.onFileSelect = onFileSelect;
        this.treeElement = document.getElementById('fileTree');
        this.activeFile = null;
    }

    render() {
        this.treeElement.innerHTML = '';
        
        // const files = this.workspace.getFiles();
        // Object.keys(files).sort().forEach(filename => {
        //     const item = document.createElement('li');
        //     item.className = 'file-item';
        //     if (filename === this.activeFile) {
        //         item.classList.add('active');
        //     }

        //     const icon = this.getFileIcon(filename);
        //     const iconElement = document.createElement('span');
        //     iconElement.innerHTML = icon;
        //     iconElement.className = 'file-icon';

        //     const nameElement = document.createElement('span');
        //     nameElement.textContent = filename;

        //     item.appendChild(iconElement);
        //     item.appendChild(nameElement);

        //     item.addEventListener('click', () => {
        //         this.selectFile(filename);
        //     });

        //     this.treeElement.appendChild(item);
        // });
    }

    selectFile(filename) {
        this.activeFile = filename;
        this.render();
        this.onFileSelect(filename);
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'html': '🌐',
            'js': '📜',
            'ts': '📘',
            'jsx': '⚛️',
            'tsx': '⚛️',
            'css': '🎨',
            'scss': '🎨',
            'less': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄'
        };
        return icons[ext] || '📄';
    }
}

// Worker debugging utility
class WorkerDebugger {
    constructor(logger) {
        this.logger = logger;
        this.setupWorkerInterception();
    }

    setupWorkerInterception() {
        const originalWorker = window.Worker;
        const logger = this.logger;

        window.Worker = function(scriptURL, options) {
            logger.info(`🔧 Creating worker: ${scriptURL}`);
            logger.info(`   Options: ${JSON.stringify(options)}`);

            const worker = new originalWorker(scriptURL, options);

            worker.addEventListener('error', (error) => {
                logger.error(`❌ Worker error (${options?.name || 'unknown'}): ${error.message}`);
                logger.error(`   URL: ${scriptURL}`);
            });

            worker.addEventListener('message', (event) => {
                logger.success(`📨 Worker message from ${options?.name || 'unknown'}`);
            });

            // Log successful worker creation
            setTimeout(() => {
                logger.success(`✅ Worker created successfully: ${options?.name || 'unknown'}`);
            }, 100);

            return worker;
        };
    }
}

// Main application class
class ModernMonacoApp {
    constructor() {
        this.logger = new DebugLogger();
        this.status = new StatusIndicator();
        this.workerDebugger = new WorkerDebugger(this.logger);
        this.workspace = null;
        this.fileTree = null;
        this.editor = null;
        
        this.init();
    }

    async init() {
        try {
            this.logger.info('🚀 Starting Modern Monaco self-hosted example');
            this.status.loading('Initializing workspace...');

            // Create workspace with sample files
            await this.createWorkspace();
            
            // Initialize file tree
            this.fileTree = new FileTreeManager(this.workspace, (filename) => {
                this.openFile(filename);
            });
            this.fileTree.render();

            this.status.loading('Loading Monaco Editor...');
            
            // Initialize Monaco with lazy loading
            await this.initializeMonaco();
            
            this.status.ready('Monaco Editor Ready');
            this.logger.success('✅ Application initialized successfully');

            // Hide loading overlay
            document.getElementById('loadingOverlay').classList.add('hidden');

            // Open the entry file
            this.openFile('index.html');

        } catch (error) {
            this.logger.error(`❌ Initialization failed: ${error.message}`);
            this.status.error('Initialization Failed');
            console.error('Initialization error:', error);
        }
    }

    async createWorkspace() {
        this.logger.info('📁 Creating workspace with sample files');

        const initialFiles = {
            'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Project</title>
    <link rel="stylesheet" href="styles.css">
    <script type="importmap">
    {
        "imports": {
            "react": "https://esm.sh/react@18",
            "react-dom": "https://esm.sh/react-dom@18"
        }
    }
    </script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="main.js"></script>
</body>
</html>`,

            'main.js': `// Modern JavaScript with ES modules
import { createApp } from './app.js';
import { utils } from './utils.js';

console.log('🚀 Application starting...');

// Initialize the application
const app = createApp({
    target: '#root',
    title: 'Modern Monaco Demo',
    features: ['syntax-highlighting', 'intellisense', 'error-checking']
});

// Use utility functions
const greeting = utils.formatGreeting('Modern Monaco');
console.log(greeting);

// Demonstrate async/await
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        app.setData(data);
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

loadData();`,

            'app.js': `// Application module with TypeScript-style JSDoc
/**
 * @typedef {Object} AppConfig
 * @property {string} target - CSS selector for the target element
 * @property {string} title - Application title
 * @property {string[]} features - List of enabled features
 */

/**
 * Creates a new application instance
 * @param {AppConfig} config - Application configuration
 * @returns {Object} Application instance
 */
export function createApp(config) {
    const element = document.querySelector(config.target);
    
    if (!element) {
        throw new Error(\`Target element not found: \${config.target}\`);
    }

    return {
        setData(data) {
            element.innerHTML = \`
                <h1>\${config.title}</h1>
                <p>Features: \${config.features.join(', ')}</p>
                <pre>\${JSON.stringify(data, null, 2)}</pre>
            \`;
        },
        
        destroy() {
            element.innerHTML = '';
        }
    };
}`,

            'utils.js': `// Utility functions
export const utils = {
    /**
     * Formats a greeting message
     * @param {string} name - Name to greet
     * @returns {string} Formatted greeting
     */
    formatGreeting(name) {
        const time = new Date().getHours();
        const timeOfDay = time < 12 ? 'morning' : time < 18 ? 'afternoon' : 'evening';
        return \`Good \${timeOfDay}, \${name}! 👋\`;
    },

    /**
     * Debounces a function call
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};`,

            'styles.css': `/* Modern CSS with custom properties */
:root {
    --primary-color: #007acc;
    --secondary-color: #1e1e1e;
    --text-color: #d4d4d4;
    --background-color: #252526;
    --border-color: #3e3e42;
    --success-color: #4caf50;
    --warning-color: #ff9800;
    --error-color: #f44336;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}

#root {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

h1 {
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-size: 2.5rem;
    font-weight: 300;
}

p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
}

pre {
    background-color: var(--secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.9rem;
}

/* Responsive design */
@media (max-width: 768px) {
    #root {
        padding: 1rem;
    }
    
    h1 {
        font-size: 2rem;
    }
}`,

            'package.json': `{
  "name": "sample-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}`
        };

        this.workspace = new Workspace({
            name: 'self-hosted-example',
            initialFiles,
            entryFile: 'index.html'
        });

        this.logger.success(`📁 Workspace created with ${Object.keys(initialFiles).length} files`);
    }

    async initializeMonaco() {
        this.logger.info('🎨 Initializing Monaco Editor with lazy loading');

        try {
            // Initialize Monaco with lazy loading and workspace
            await lazy({
                workspace: this.workspace,
                theme: 'vitesse-dark',
                lsp: {
                    typescript: {
                        compilerOptions: {
                            target: 'ES2022',
                            module: 'ESNext',
                            moduleResolution: 'bundler',
                            allowImportingTsExtensions: true,
                            strict: true,
                            jsx: 'react-jsx'
                        }
                    }
                }
            });

            this.logger.success('✅ Monaco Editor initialized with lazy loading');
            this.logger.info('🔧 Language services will load on demand');

        } catch (error) {
            this.logger.error(`❌ Monaco initialization failed: ${error.message}`);
            throw error;
        }
    }

    async openFile(filename) {
        try {
            this.logger.info(`📂 Opening file: ${filename}`);
            await this.workspace.openTextDocument(filename);
            this.fileTree.selectFile(filename);
            this.logger.success(`✅ File opened: ${filename}`);
        } catch (error) {
            this.logger.error(`❌ Failed to open file ${filename}: ${error.message}`);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ModernMonacoApp();
});
