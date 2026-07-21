const fs = require('fs');
const path = require('path');

const NODE_MODULES = path.resolve(__dirname, '..', 'node_modules');

function walkPackages(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) return [];

  const entries = fs.readdirSync(nodeModulesPath);
  const packages = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;

    const fullPath = path.join(nodeModulesPath, entry);

    if (!fs.statSync(fullPath).isDirectory()) continue;

    if (entry.startsWith('@')) {
      for (const scopedEntry of fs.readdirSync(fullPath)) {
        const scopedPath = path.join(fullPath, scopedEntry);
        if (fs.statSync(scopedPath).isDirectory()) {
          packages.push(scopedPath);
        }
      }
    } else {
      packages.push(fullPath);
    }
  }

  return packages;
}

function hasAndroidBlock(content) {
  return /\bandroid\s*\{/.test(content);
}

function hasNamespace(content) {
  return /\bnamespace\s*(=)?\s*["']/.test(content);
}

function readManifestPackage(packagePath) {
  const manifestPath = path.join(
    packagePath,
    'android',
    'src',
    'main',
    'AndroidManifest.xml',
  );

  if (!fs.existsSync(manifestPath)) return null;

  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const match = manifest.match(/\bpackage\s*=\s*["']([^"']+)["']/);

  return match?.[1] || null;
}

function findJavaPackage(packagePath) {
  const srcPath = path.join(packagePath, 'android', 'src', 'main', 'java');

  if (!fs.existsSync(srcPath)) return null;

  const stack = [srcPath];

  while (stack.length) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current)) {
      const fullPath = path.join(current, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.endsWith('.java') && !entry.endsWith('.kt')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(
        /\bpackage\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+)\s*/,
      );

      if (match?.[1]) return match[1];
    }
  }

  return null;
}

function namespaceFromPackageName(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const name = packageJson.name;

  if (!name) return null;

  return (
    'auto.namespace.' +
    name
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/(^\.|\.$)/g, '')
      .toLowerCase()
  );
}

function getNamespace(packagePath) {
  return (
    readManifestPackage(packagePath) ||
    findJavaPackage(packagePath) ||
    namespaceFromPackageName(packagePath)
  );
}

function patchGroovyBuildGradle(buildGradlePath, namespace) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');

  if (!hasAndroidBlock(content) || hasNamespace(content)) return false;

  const patched = content.replace(
    /\bandroid\s*\{/,
    match => `${match}\n    namespace "${namespace}"`,
  );

  fs.writeFileSync(buildGradlePath, patched);
  return true;
}

function patchKtsBuildGradle(buildGradlePath, namespace) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');

  if (!hasAndroidBlock(content) || hasNamespace(content)) return false;

  const patched = content.replace(
    /\bandroid\s*\{/,
    match => `${match}\n    namespace = "${namespace}"`,
  );

  fs.writeFileSync(buildGradlePath, patched);
  return true;
}

function main() {
  const packages = walkPackages(NODE_MODULES);
  const patched = [];
  const skipped = [];

  for (const packagePath of packages) {
    const androidPath = path.join(packagePath, 'android');
    if (!fs.existsSync(androidPath)) continue;

    const groovyGradle = path.join(androidPath, 'build.gradle');
    const ktsGradle = path.join(androidPath, 'build.gradle.kts');

    const buildGradlePath = fs.existsSync(groovyGradle)
      ? groovyGradle
      : fs.existsSync(ktsGradle)
        ? ktsGradle
        : null;

    if (!buildGradlePath) continue;

    const content = fs.readFileSync(buildGradlePath, 'utf8');

    if (!hasAndroidBlock(content) || hasNamespace(content)) continue;

    const namespace = getNamespace(packagePath);

    if (!namespace) {
      skipped.push(packagePath.replace(`${NODE_MODULES}/`, ''));
      continue;
    }

    const didPatch = buildGradlePath.endsWith('.kts')
      ? patchKtsBuildGradle(buildGradlePath, namespace)
      : patchGroovyBuildGradle(buildGradlePath, namespace);

    if (didPatch) {
      patched.push({
        package: packagePath.replace(`${NODE_MODULES}/`, ''),
        namespace,
      });
    }
  }

  if (patched.length) {
    console.log('\nPatched Android namespaces:');
    for (const item of patched) {
      console.log(`- ${item.package} -> ${item.namespace}`);
    }
  } else {
    console.log('No Android namespaces needed patching.');
  }

  if (skipped.length) {
    console.log('\nSkipped packages because namespace could not be inferred:');
    for (const item of skipped) {
      console.log(`- ${item}`);
    }
  }
}

main();
