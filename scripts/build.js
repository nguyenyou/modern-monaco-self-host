import { build } from 'esbuild';
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
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
}

async function buildProject() {
    console.log('🔨 Building self-hosted Modern Monaco example...');

    try {
        // Ensure output directories exist
        await ensureDir(path.join(projectRoot, 'public'));
        await ensureDir(path.join(projectRoot, 'public/dist'));

        // Build JavaScript with esbuild
        console.log('📦 Building JavaScript bundle...');
        await build({
            entryPoints: [path.join(projectRoot, 'src/app.js')],
            bundle: true,
            format: 'esm',
            target: 'es2022',
            platform: 'browser',
            outfile: path.join(projectRoot, 'public/dist/app.js'),
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            define: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
            },
            external: [
                'modern-monaco',
                'modern-monaco/*'
            ],
            loader: {
                '.js': 'js',
                '.ts': 'ts',
                '.jsx': 'jsx',
                '.tsx': 'tsx'
            },
            logLevel: 'info'
        });

        // Copy HTML file
        console.log('📄 Copying HTML file...');
        await copyFile(
            path.join(projectRoot, 'src/index.html'),
            path.join(projectRoot, 'public/index.html')
        );

        console.log('✅ Build completed successfully!');
        console.log('📁 Output directory: public/');
        console.log('🚀 Run "npm start" to serve the application');

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

// Run build if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    buildProject();
}

export { buildProject };
