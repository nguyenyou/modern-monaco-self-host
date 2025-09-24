import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

class SetupTester {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.successes = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        switch (type) {
            case 'success':
                console.log(`✅ ${formattedMessage}`);
                this.successes.push(message);
                break;
            case 'error':
                console.error(`❌ ${formattedMessage}`);
                this.errors.push(message);
                break;
            case 'warning':
                console.warn(`⚠️  ${formattedMessage}`);
                this.warnings.push(message);
                break;
            default:
                console.log(`ℹ️  ${formattedMessage}`);
        }
    }

    async testFileExists(filePath, description) {
        try {
            await fs.access(filePath);
            this.log(`${description} exists`, 'success');
            return true;
        } catch (error) {
            this.log(`${description} missing: ${filePath}`, 'error');
            return false;
        }
    }

    async testFileContent(filePath, description, expectedContent) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (content.includes(expectedContent)) {
                this.log(`${description} contains expected content`, 'success');
                return true;
            } else {
                this.log(`${description} missing expected content: "${expectedContent}"`, 'warning');
                return false;
            }
        } catch (error) {
            this.log(`Cannot read ${description}: ${error.message}`, 'error');
            return false;
        }
    }

    async testHttpEndpoint(url, description) {
        return new Promise((resolve) => {
            const request = http.get(url, (response) => {
                if (response.statusCode === 200) {
                    this.log(`${description} responds correctly (${response.statusCode})`, 'success');
                    resolve(true);
                } else {
                    this.log(`${description} returns ${response.statusCode}`, 'warning');
                    resolve(false);
                }
            });

            request.on('error', (error) => {
                this.log(`${description} not accessible: ${error.message}`, 'error');
                resolve(false);
            });

            request.setTimeout(5000, () => {
                this.log(`${description} timeout`, 'error');
                request.destroy();
                resolve(false);
            });
        });
    }

    async runTests() {
        console.log('🧪 Running Modern Monaco Self-Hosted Setup Tests');
        console.log('=================================================\n');

        // Test 1: Check project structure
        this.log('Testing project structure...', 'info');
        await this.testFileExists(path.join(projectRoot, 'package.json'), 'package.json');
        await this.testFileExists(path.join(projectRoot, 'server.js'), 'server.js');
        await this.testFileExists(path.join(projectRoot, 'src/index.html'), 'src/index.html');
        await this.testFileExists(path.join(projectRoot, 'src/app.js'), 'src/app.js');

        // Test 2: Check build outputs
        this.log('\nTesting build outputs...', 'info');
        await this.testFileExists(path.join(projectRoot, 'public/index.html'), 'Built HTML file');
        await this.testFileExists(path.join(projectRoot, 'public/dist/app.js'), 'Built JavaScript bundle');

        // Test 3: Check modern-monaco files
        this.log('\nTesting modern-monaco distribution files...', 'info');
        const monacoFiles = [
            'index.mjs',
            'editor-core.mjs',
            'editor-worker-main.mjs',
            'lsp/index.mjs',
            'lsp/typescript/worker.mjs',
            'lsp/html/worker.mjs',
            'lsp/css/worker.mjs',
            'lsp/json/worker.mjs',
            'onig.wasm'
        ];

        for (const file of monacoFiles) {
            await this.testFileExists(
                path.join(projectRoot, 'public/monaco', file),
                `Monaco file: ${file}`
            );
        }

        // Test 4: Check import map configuration
        this.log('\nTesting import map configuration...', 'info');
        await this.testFileContent(
            path.join(projectRoot, 'public/index.html'),
            'Import map in HTML',
            '"modern-monaco": "/monaco/index.mjs"'
        );

        // Test 5: Check server configuration
        this.log('\nTesting server configuration...', 'info');
        await this.testFileContent(
            path.join(projectRoot, 'server.js'),
            'Server MIME type configuration',
            'application/javascript'
        );
        await this.testFileContent(
            path.join(projectRoot, 'server.js'),
            'Server CORS configuration',
            'cors'
        );

        // Test 6: Check if server is running (optional)
        this.log('\nTesting server endpoints (if running)...', 'info');
        await this.testHttpEndpoint('http://localhost:3000/health', 'Health endpoint');
        await this.testHttpEndpoint('http://localhost:3000/monaco/index.mjs', 'Monaco main file');
        await this.testHttpEndpoint('http://localhost:3000/monaco/editor-worker-main.mjs', 'Editor worker');

        // Test 7: Check package.json scripts
        this.log('\nTesting package.json scripts...', 'info');
        try {
            const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
            const requiredScripts = ['build', 'dev', 'start', 'setup', 'copy-monaco'];
            
            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    this.log(`Script "${script}" defined`, 'success');
                } else {
                    this.log(`Script "${script}" missing`, 'error');
                }
            }
        } catch (error) {
            this.log(`Cannot read package.json: ${error.message}`, 'error');
        }

        // Generate report
        this.generateReport();
    }

    generateReport() {
        console.log('\n📊 Test Report');
        console.log('==============');
        console.log(`✅ Successes: ${this.successes.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n❌ Critical Issues:');
            this.errors.forEach(error => console.log(`   • ${error}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.forEach(warning => console.log(`   • ${warning}`));
        }

        console.log('\n🎯 Recommendations:');
        
        if (this.errors.length > 0) {
            console.log('   • Fix critical errors before proceeding');
            console.log('   • Run "npm run setup" to rebuild the project');
        }

        if (this.warnings.length > 0) {
            console.log('   • Address warnings for optimal functionality');
            console.log('   • Check server is running for endpoint tests');
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('   • Setup appears to be complete! 🎉');
            console.log('   • Run "npm run dev" to start development');
            console.log('   • Open http://localhost:3000 in your browser');
        }

        console.log('\n📚 For more help, see README.md');
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new SetupTester();
    tester.runTests().catch((error) => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}
