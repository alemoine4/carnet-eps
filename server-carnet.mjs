// Mini serveur statique de dev — Carnet EPS (aucune dépendance).
// Usage : node server-carnet.mjs [port]   (défaut : 8160) — sert le dossier app/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const PORT = Number(process.argv[2]) || 8160;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.csv': 'text/csv; charset=utf-8',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const fichier = normalize(join(RACINE, chemin === '/' ? 'index.html' : chemin));
    if (fichier !== RACINE && !fichier.startsWith(RACINE + sep)) {
      res.writeHead(403);
      return res.end();
    }
    const corps = await readFile(fichier);
    res.writeHead(200, {
      'Content-Type': MIME[extname(fichier).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(corps);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}).listen(PORT, () => console.log(`Carnet EPS → http://localhost:${PORT}`));
