import { buildProject } from './build.js';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

class DevServer {
    constructor() {
        this.serverProcess = null;
        this.isBuilding = false;
        this.buildQueue = false;
    }

    async start() {
        console.log('🚀 Starting development server...');

        // Initial build
        await this.build();

        // Start file watcher
        this.startWatcher();

        // Start server
        this.startServer();

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down development server...');
            this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            this.stop();
            process.exit(0);
        });
    }

    async build() {
        if (this.isBuilding) {
            this.buildQueue = true;
            return;
        }

        this.isBuilding = true;
        console.log('🔨 Building project...');

        try {
            await buildProject();
            console.log('✅ Build completed');
        } catch (error) {
            console.error('❌ Build failed:', error);
        } finally {
            this.isBuilding = false;

            // Process queued build if any
            if (this.buildQueue) {
                this.buildQueue = false;
                setTimeout(() => this.build(), 100);
            }
        }
    }

    startWatcher() {
        console.log('👀 Starting file watcher...');

        const watcher = chokidar.watch([
            path.join(projectRoot, 'src/**/*'),
            path.join(projectRoot, 'scripts/**/*')
        ], {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', (filePath) => {
            const relativePath = path.relative(projectRoot, filePath);
            console.log(`📝 File changed: ${relativePath}`);
            this.build();
        });

        watcher.on('add', (filePath) => {
            const relativePath = path.relative(projectRoot, filePath);
            console.log(`➕ File added: ${relativePath}`);
            this.build();
        });

        watcher.on('unlink', (filePath) => {
            const relativePath = path.relative(projectRoot, filePath);
            console.log(`➖ File removed: ${relativePath}`);
            this.build();
        });

        watcher.on('error', (error) => {
            console.error('👀 Watcher error:', error);
        });

        console.log('✅ File watcher started');
    }

    startServer() {
        console.log('🌐 Starting Express server...');

        this.serverProcess = spawn('node', ['server.js'], {
            cwd: projectRoot,
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: 'development'
            }
        });

        this.serverProcess.on('error', (error) => {
            console.error('❌ Server error:', error);
        });

        this.serverProcess.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                console.error(`❌ Server exited with code ${code}`);
            }
            if (signal) {
                console.log(`🛑 Server killed with signal ${signal}`);
            }
        });
    }

    stop() {
        if (this.serverProcess) {
            console.log('🛑 Stopping server...');
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
        }
    }
}

// Start development server if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const devServer = new DevServer();
    devServer.start().catch((error) => {
        console.error('❌ Failed to start development server:', error);
        process.exit(1);
    });
}
