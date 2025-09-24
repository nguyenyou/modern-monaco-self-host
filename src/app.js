import { lazy, Workspace } from 'modern-monaco';

// Main application class
class ModernMonacoApp {
    constructor() {
        this.workspace = null;
        this.fileTree = null;
        this.editor = null;
        
        this.init();
    }

    async init() {
        try {

            // Create workspace with sample files
            await this.createWorkspace();
            
            
            // Initialize Monaco with lazy loading
            await this.initializeMonaco();
            
            // Hide loading overlay

            // Open the entry file
            this.openFile('index.html');

        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    async createWorkspace() {
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


    }

    async initializeMonaco() {
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
        } catch (error) {
            throw error;
        }
    }

    async openFile(filename) {
        try {

            await this.workspace.openTextDocument(filename);
            this.fileTree.selectFile(filename);

        } catch (error) {

        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ModernMonacoApp();
});
