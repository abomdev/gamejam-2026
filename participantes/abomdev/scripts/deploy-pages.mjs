// Publica el build en la rama gh-pages del fork.
//
// El juego vive en una subcarpeta de un repo de la game jam, donde solo se puede
// escribir dentro de participantes/abomdev/. Por eso no se usa un workflow de
// GitHub Actions (iría en .github/, fuera de esa carpeta y contaminaría los PRs):
// en su lugar se publica solo el contenido de dist/ en una rama aparte, que queda
// completamente separada de la rama de trabajo.
//
// Uso: npm run deploy

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectDir, 'dist');
const BRANCH = 'gh-pages';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();

if (!existsSync(distDir)) {
  console.error('No existe dist/. Corré primero: npm run build');
  process.exit(1);
}

// La URL sale del repo, así no queda hardcodeada y sigue al fork de quien lo use.
const remote = run('git remote get-url origin', projectDir);
console.log(`Publicando dist/ en la rama ${BRANCH} de ${remote}`);

// GitHub Pages procesa el sitio con Jekyll salvo que exista este archivo; sin él,
// las carpetas que empiezan con guion bajo se ignoran al servir.
writeFileSync(resolve(distDir, '.nojekyll'), '');

// Repo temporal dentro de dist/: se arma, se empuja y se borra. Así la rama gh-pages
// contiene solo el build, sin el historial ni el código fuente.
rmSync(resolve(distDir, '.git'), { recursive: true, force: true });
run('git init -q', distDir);
run('git checkout -q -B main', distDir);
run('git add -A', distDir);
run('git -c user.name=deploy -c user.email=deploy@local commit -q -m "deploy"', distDir);

// force porque esta rama se regenera entera en cada publicación: no guarda trabajo
// propio, es siempre el reflejo del último build.
run(`git push -q --force ${remote} main:${BRANCH}`, distDir);
rmSync(resolve(distDir, '.git'), { recursive: true, force: true });

const [, user, repo] = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/) || [];
console.log('\nListo.');
if (user && repo) {
  console.log(`URL: https://${user}.github.io/${repo}/`);
  console.log(`Si es la primera vez, activá Pages en:`);
  console.log(`https://github.com/${user}/${repo}/settings/pages  (Source: Deploy from a branch → ${BRANCH} → /root)`);
}
