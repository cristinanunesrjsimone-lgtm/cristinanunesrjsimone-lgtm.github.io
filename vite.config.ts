import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendUrl = 'https://sanesfruitbe.onrender.com';

export default defineConfig({
    plugins: [react()],

    base: '/',

    server: {
        port: 5173,
        proxy: {
            '/uploads': {
                target: backendUrl,
                changeOrigin: true,
                secure: true
            },
            '/api': {
                target: backendUrl,
                changeOrigin: true,
                secure: true
            }
        }
    },

    preview: {
        port: 4173,
        proxy: {
            '/uploads': {
                target: backendUrl,
                changeOrigin: true,
                secure: true
            },
            '/api': {
                target: backendUrl,
                changeOrigin: true,
                secure: true
            }
        }
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,

        rollupOptions: {
            input: {
                home: 'index.html',
                galeria: 'galeria.html',
                compras: 'compras.html',
                admin: 'admin.html'
            }
        }
    }
});
