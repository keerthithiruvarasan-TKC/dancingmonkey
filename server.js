
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
// Vite builds to the 'dist' folder
const PUBLIC_DIR = path.join(__dirname, 'dist');

console.log(`[Server] Starting on port ${PORT}`);
console.log(`[Server] Serving files from ${PUBLIC_DIR}`);

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    // 1. Sanitize request
    const safeUrl = req.url.split('?')[0];
    let filePath = path.join(PUBLIC_DIR, safeUrl);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // 2. Default to index.html for root
    if (safeUrl === '/' || safeUrl === '') {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    // 3. Serve File or Fallback
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // If file missing, check if it's an asset (has extension) or a route
            const ext = path.extname(safeUrl);
            if (ext) {
                // It's a missing asset (e.g., logo.png), return 404
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // It's a route (e.g., /my-enquiries), serve index.html for SPA
                const index = path.join(PUBLIC_DIR, 'index.html');
                serveFile(res, index);
            }
        } else {
            serveFile(res, filePath);
        }
    });
});

function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err);
            res.writeHead(500);
            res.end('Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening at http://0.0.0.0:${PORT}`);
});
