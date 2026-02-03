import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  base: '/runs/', // Base path for GitHub Pages
  plugins: [
    react(),
    {
      name: 'save-csv-middleware',
      configureServer(server) {
        server.middlewares.use('/api/save', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const filePath = path.resolve(__dirname, 'public/plan.csv');
                fs.writeFileSync(filePath, body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                console.log('CSV saved successfully');
              } catch (e) {
                console.error('Error saving CSV:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to write file' }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
