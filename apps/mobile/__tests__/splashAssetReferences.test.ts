import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.join(__dirname, '..');

const FORBIDDEN_SPLASH_REFERENCES = ['splash-icon.png'];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.expo') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (/\.(json|js|ts|tsx|xml)$/i.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('splash asset references', () => {
  it('does not reference legacy splash-icon.png in app config or android splash xml', () => {
    const files = [
      path.join(mobileRoot, 'app.json'),
      path.join(mobileRoot, 'app.config.js'),
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const forbidden of FORBIDDEN_SPLASH_REFERENCES) {
        expect(content).not.toContain(forbidden);
      }
    }
  });
});
