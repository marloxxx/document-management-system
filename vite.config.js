import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    // Without this, a build without tsconfig (e.g. Docker assets stage) falls back to
    // the classic JSX transform and emits React.createElement without importing React.
    esbuild: {
        jsx: 'automatic',
    },
    server: {
        host: '127.0.0.1', // Force IPv4
        port: 5173,
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './resources/js'),
        },
    }
});
