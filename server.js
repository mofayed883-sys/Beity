const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split('?')[0]);
  if (relative.startsWith('/api/')) {
    const apiRoute = {
      '/api/config': './api/config.js',
      '/api/projects': './api/projects.js',
      '/api/image-sign': './api/image-sign.js'
    }[relative];
    if (!apiRoute) {
      response.writeHead(404);
      return response.end('Not Found');
    }
    return require(apiRoute)(request, response);
  }

  const filePath = path.resolve(root, `.${relative}`);
  const relativeFilePath = path.relative(root, filePath);
  if (relativeFilePath.startsWith('..') || path.isAbsolute(relativeFilePath)) {
    response.writeHead(403);
    return response.end('Forbidden');
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      response.writeHead(404);
      return response.end('Not Found');
    }
    const target = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(target, (readError, content) => {
      if (readError) {
        response.writeHead(404);
        return response.end('Not Found');
      }
      response.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] || 'application/octet-stream');
      response.end(content);
    });
  });
}).listen(8000, '127.0.0.1', () => {
  console.log('Beity is running at http://127.0.0.1:8000');
});
