'use strict';
// Compila el componente REAL con su plantilla/SCSS; solo el contenedor y los datos son ficticios.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const sass = require('sass');
const root = path.resolve(__dirname, '../../../..');
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || !fs.statSync(output).isDirectory()) throw new Error('Indica una carpeta temporal existente.');
const styles = fs.readdirSync(path.join(root, 'dist/cuba')).find(name => /^styles\..*\.css$/.test(name));
if (!styles) throw new Error('Primero compilar Angular de producción.');
fs.copyFileSync(path.join(__dirname, 'preview.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'dist/cuba', styles), path.join(output, 'app-styles.css'));
for (const name of fs.readdirSync(path.join(root, 'dist/cuba')).filter(name => /\.(woff2?|ttf|eot)$/.test(name))) {
  fs.copyFileSync(path.join(root, 'dist/cuba', name), path.join(output, name));
}
fs.mkdirSync(path.join(output, 'assets/images/opttia'), { recursive: true });
fs.copyFileSync(path.join(root, 'src/assets/images/opttia/tuki-avatar-v1.webp'), path.join(output, 'assets/images/opttia/tuki-avatar-v1.webp'));
esbuild.build({ entryPoints: [path.join(__dirname, 'preview.ts')], bundle: true, outfile: path.join(output, 'preview.js'),
  target: 'es2020', tsconfig: path.join(root, 'tsconfig.json'), plugins: [{ name: 'actual-card-resources', setup(build) {
    // La UI usa un proveedor falso; no se construye ningún servicio HTTP o de identidad.
    build.onLoad({ filter: /opttia-chat\.service\.ts$/ }, () => ({ contents: 'export class OpttiaChatService {}', loader: 'ts' }));
    build.onLoad({ filter: /opttia-(support-ticket|chat|markdown)\.component\.ts$/ }, args => {
      const htmlPath = args.path.replace(/\.ts$/, '.html');
      const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : null;
      const css = sass.compile(args.path.replace(/\.ts$/, '.scss')).css;
      let source = fs.readFileSync(args.path, 'utf8').replace(/templateUrl:\s*'[^']*'/, 'template: ' + JSON.stringify(html))
        .replace(/styleUrls:\s*\[[^\]]*\]/, 'styles: [' + JSON.stringify(css) + ']');
      if (args.path.endsWith('opttia-chat.component.ts')) {
        // esbuild no emite metadata TS de DI: anotarla solo en el build JIT del fixture.
        source = source.replace('AfterViewChecked,', 'AfterViewChecked, Inject,')
          .replace('public readonly opttia: OpttiaChatService', '@Inject(OpttiaChatService) public readonly opttia: OpttiaChatService')
          .replace('private readonly cdr: ChangeDetectorRef', '@Inject(ChangeDetectorRef) private readonly cdr: ChangeDetectorRef');
      }
      return { contents: source, loader: 'ts' };
    });
  } }], logLevel: 'info' }).catch(() => { process.exitCode = 1; });
