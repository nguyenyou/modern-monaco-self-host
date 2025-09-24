import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

async function copyFile(src, dest) {
    try {
        await ensureDir(path.dirname(dest));
        await fs.copyFile(src, dest);
        return true;
    } catch (error) {
        console.warn(`⚠️  Could not copy ${src}: ${error.message}`);
        return false;
    }
}

async function copyDirectory(src, dest) {
    try {
        await ensureDir(dest);
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await copyFile(srcPath, destPath);
            }
        }
    } catch (error) {
        console.warn(`⚠️  Could not copy directory ${src}: ${error.message}`);
    }
}

async function copyModernMonaco() {
    console.log('📦 Copying modern-monaco distribution files...');
    console.log('projectRoot', projectRoot);
    const monacoPath = path.join(projectRoot, 'node_modules/modern-monaco');
    console.log('monacoPath', monacoPath);

    const monacoDistPath = path.resolve(monacoPath, 'dist');
    console.log('monacoDistPath', monacoDistPath);
    const publicMonacoPath = path.join(projectRoot, 'public/monaco');

    try {
        // Check if modern-monaco dist exists
        await fs.access(monacoDistPath);
        console.log('✅ Found modern-monaco dist directory');
    } catch (error) {
        console.error('❌ Modern-monaco dist directory not found!');
        console.error('   Please run "npm run prepublishOnly" in the root directory first');
        console.error(`   Looking for: ${monacoDistPath}`);
        process.exit(1);
    }

    // Copy the entire dist directory
    await copyDirectory(monacoDistPath, publicMonacoPath);

    // Verify critical files
    const criticalFiles = [
        'index.mjs',
        'editor-core.mjs',
        'editor-worker.mjs',
        'lsp/typescript/worker.mjs',
        'lsp/html/worker.mjs',
        'lsp/css/worker.mjs',
        'lsp/json/worker.mjs',
        'onig.wasm'
    ];

    console.log('🔍 Verifying critical files...');
    let allFilesPresent = true;

    for (const file of criticalFiles) {
        const filePath = path.join(publicMonacoPath, file);
        try {
            await fs.access(filePath);
            console.log(`✅ ${file}`);
        } catch (error) {
            console.error(`❌ Missing: ${file}`);
            allFilesPresent = false;
        }
    }

    if (!allFilesPresent) {
        console.error('❌ Some critical files are missing!');
        process.exit(1);
    }

    console.log('✅ Modern-monaco files copied successfully!');
    console.log(`📁 Copied to: ${publicMonacoPath}`);

    // Create a simple verification endpoint data
    const verificationData = {
        timestamp: new Date().toISOString(),
        files: criticalFiles,
        status: 'ready'
    };

    await fs.writeFile(
        path.join(publicMonacoPath, 'verification.json'),
        JSON.stringify(verificationData, null, 2)
    );

    console.log('📋 Created verification.json for debugging');
}

// Run copy if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    copyModernMonaco().catch((error) => {
        console.error('❌ Copy failed:', error);
        process.exit(1);
    });
}

export { copyModernMonaco };
