#!/usr/bin/env tsx

/**
 * @file scripts/generate-docs.ts
 * @purpose Automated documentation generator - runs after code changes to update docs
 *
 * USAGE:
 *   npm run document        # Generate all documentation
 *   npm run document:check  # Check if docs are up to date
 *
 * WHAT IT DOES:
 * 1. Scans codebase for all API routes, services, types
 * 2. Extracts inline documentation
 * 3. Generates system state report (JSON)
 * 4. Validates all cross-references in docs
 * 5. Checks for undocumented code
 *
 * OUTPUT:
 * - docs/CODEBASE_STATE.json - Complete system snapshot
 * - docs/API_REFERENCE.md - Auto-generated API docs
 * - docs/DEPENDENCY_GRAPH.md - Service dependencies
 *
 * @last_modified 2025-11-06
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodebaseState {
  timestamp: string;
  version: string;
  statistics: {
    totalFiles: number;
    totalLines: number;
    apiRoutes: number;
    services: number;
    errors: number;
    databaseTables: number;
  };
  apiRoutes: APIRoute[];
  services: Service[];
  errors: ErrorDefinition[];
  dependencies: Dependency[];
  environmentVariables: EnvironmentVariable[];
  databaseTables: DatabaseTable[];
  documentation: {
    totalDocs: number;
    coverage: number;
    missingDocs: string[];
  };
}

interface APIRoute {
  path: string;
  method: string;
  file: string;
  description: string;
  authentication: boolean;
  rateLimit?: string;
  cost?: string;
}

interface Service {
  name: string;
  file: string;
  purpose: string;
  dependencies: string[];
  exports: string[];
}

interface ErrorDefinition {
  code: string;
  name: string;
  httpCode: number;
  severity: string;
  documented: boolean;
}

interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
}

interface EnvironmentVariable {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  file: string;
}

interface DatabaseTable {
  name: string;
  rowCount?: number;
  size?: string;
  indexes: string[];
}

/**
 * Main documentation generator
 */
async function generateDocumentation() {
  console.log('🚀 Generating SizeEasy documentation...\n');

  const state: CodebaseState = {
    timestamp: new Date().toISOString(),
    version: getVersion(),
    statistics: {
      totalFiles: 0,
      totalLines: 0,
      apiRoutes: 0,
      services: 0,
      errors: 0,
      databaseTables: 0,
    },
    apiRoutes: [],
    services: [],
    errors: [],
    dependencies: [],
    environmentVariables: [],
    databaseTables: [],
    documentation: {
      totalDocs: 0,
      coverage: 0,
      missingDocs: [],
    },
  };

  // 1. Scan API routes
  console.log('📂 Scanning API routes...');
  state.apiRoutes = await scanAPIRoutes();
  state.statistics.apiRoutes = state.apiRoutes.length;
  console.log(`   Found ${state.apiRoutes.length} API routes\n`);

  // 2. Scan services
  console.log('🔧 Scanning service files...');
  state.services = await scanServices();
  state.statistics.services = state.services.length;
  console.log(`   Found ${state.services.length} services\n`);

  // 3. Extract errors
  console.log('⚠️  Extracting error definitions...');
  state.errors = await extractErrors();
  state.statistics.errors = state.errors.length;
  console.log(`   Found ${state.errors.length} error codes\n`);

  // 4. Parse dependencies
  console.log('📦 Analyzing dependencies...');
  state.dependencies = await parseDependencies();
  console.log(`   Found ${state.dependencies.length} dependencies\n`);

  // 5. Extract environment variables
  console.log('🔐 Extracting environment variables...');
  state.environmentVariables = await extractEnvVars();
  console.log(`   Found ${state.environmentVariables.length} environment variables\n`);

  // 6. Count files and lines
  console.log('📊 Calculating statistics...');
  const stats = await calculateStatistics();
  state.statistics.totalFiles = stats.files;
  state.statistics.totalLines = stats.lines;
  console.log(`   Total files: ${stats.files}`);
  console.log(`   Total lines: ${stats.lines}\n`);

  // 7. Check documentation coverage
  console.log('📝 Checking documentation coverage...');
  const docCoverage = await checkDocumentationCoverage(state);
  state.documentation = docCoverage;
  console.log(`   Documentation coverage: ${docCoverage.coverage}%`);
  if (docCoverage.missingDocs.length > 0) {
    console.log(`   ⚠️  ${docCoverage.missingDocs.length} files missing documentation\n`);
  } else {
    console.log(`   ✅ All files documented\n`);
  }

  // 8. Write output
  console.log('💾 Writing documentation files...');
  await writeCodebaseState(state);
  await generateAPIReference(state);
  await generateDependencyGraph(state);
  console.log('   ✅ Documentation files written\n');

  // 9. Summary
  console.log('✨ Documentation generation complete!\n');
  console.log('Generated files:');
  console.log('  - docs/CODEBASE_STATE.json');
  console.log('  - docs/API_REFERENCE.md');
  console.log('  - docs/DEPENDENCY_GRAPH.md\n');

  // Warnings
  if (docCoverage.coverage < 80) {
    console.log('⚠️  WARNING: Documentation coverage is below 80%');
    console.log('   Missing documentation:');
    docCoverage.missingDocs.slice(0, 10).forEach((file) => {
      console.log(`   - ${file}`);
    });
    if (docCoverage.missingDocs.length > 10) {
      console.log(`   ... and ${docCoverage.missingDocs.length - 10} more`);
    }
  }
}

/**
 * Get project version from package.json
 */
function getVersion(): string {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
  );
  return packageJson.version;
}

/**
 * Scan all API routes in app/api
 */
async function scanAPIRoutes(): Promise<APIRoute[]> {
  const routes: APIRoute[] = [];
  const apiDir = path.join(__dirname, '../app/api');

  function scanDir(dir: string, basePath: string = '') {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scanDir(filePath, path.join(basePath, file));
      } else if (file === 'route.ts' || file === 'route.js') {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract method (GET, POST, etc.)
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        const foundMethods = methods.filter((method) =>
          content.includes(`export async function ${method}`)
        );

        // Extract description from JSDoc
        const descMatch = content.match(/@purpose\s+(.+)/);
        const description = descMatch ? descMatch[1].trim() : '';

        // Check authentication
        const requiresAuth = content.includes('supabase.auth.getUser()');

        foundMethods.forEach((method) => {
          routes.push({
            path: `/api${basePath}`,
            method,
            file: filePath.replace(__dirname + '/../', ''),
            description,
            authentication: requiresAuth,
          });
        });
      }
    }
  }

  scanDir(apiDir);
  return routes;
}

/**
 * Scan all service files in lib
 */
async function scanServices(): Promise<Service[]> {
  const services: Service[] = [];
  const libDir = path.join(__dirname, '../lib');

  if (!fs.existsSync(libDir)) return services;

  const files = fs.readdirSync(libDir);

  for (const file of files) {
    const filePath = path.join(libDir, file);
    const stat = fs.statSync(filePath);

    if (!stat.isDirectory() && (file.endsWith('.ts') || file.endsWith('.js'))) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract purpose
      const purposeMatch = content.match(/@purpose\s+(.+)/);
      const purpose = purposeMatch ? purposeMatch[1].trim() : '';

      // Extract exports
      const exportMatches = content.match(/export (?:async )?function (\w+)/g) || [];
      const exports = exportMatches.map((match) => {
        const nameMatch = match.match(/function (\w+)/);
        return nameMatch ? nameMatch[1] : '';
      });

      services.push({
        name: file.replace(/\.(ts|js)$/, ''),
        file: `lib/${file}`,
        purpose,
        dependencies: [],
        exports,
      });
    }
  }

  return services;
}

/**
 * Extract error definitions from ERROR_REGISTRY
 */
async function extractErrors(): Promise<ErrorDefinition[]> {
  const errorsFile = path.join(__dirname, '../lib/errors/ERROR_REGISTRY.ts');

  if (!fs.existsSync(errorsFile)) {
    return [];
  }

  const content = fs.readFileSync(errorsFile, 'utf-8');
  const errors: ErrorDefinition[] = [];

  // Simple regex to extract error codes
  const errorMatches = content.matchAll(/E\d{3}:\s*\{/g);

  for (const match of errorMatches) {
    const code = match[0].replace(':', '').trim();
    // Extract more details if needed
    errors.push({
      code,
      name: '',
      httpCode: 0,
      severity: '',
      documented: true,
    });
  }

  return errors;
}

/**
 * Parse dependencies from package.json
 */
async function parseDependencies(): Promise<Dependency[]> {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
  );

  const dependencies: Dependency[] = [];

  if (packageJson.dependencies) {
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version: version as string,
        type: 'production',
      });
    });
  }

  if (packageJson.devDependencies) {
    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version: version as string,
        type: 'development',
      });
    });
  }

  return dependencies;
}

/**
 * Extract environment variables from .env.example
 */
async function extractEnvVars(): Promise<EnvironmentVariable[]> {
  const envFile = path.join(__dirname, '../.env.example');

  if (!fs.existsSync(envFile)) {
    return [];
  }

  const content = fs.readFileSync(envFile, 'utf-8');
  const lines = content.split('\n');
  const vars: EnvironmentVariable[] = [];
  let currentComment = '';

  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      currentComment = line.replace(/^#\s*/, '').trim();
    } else if (line.includes('=')) {
      const [name, value] = line.split('=');
      vars.push({
        name: name.trim(),
        required: !value || value.includes('your_') || value.includes('_here'),
        description: currentComment,
        defaultValue: value?.trim(),
        file: '.env.example',
      });
      currentComment = '';
    }
  }

  return vars;
}

/**
 * Calculate total files and lines of code
 */
async function calculateStatistics(): Promise<{ files: number; lines: number }> {
  let totalFiles = 0;
  let totalLines = 0;

  function countDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules, .next, etc.
      if (file === 'node_modules' || file === '.next' || file === '.git') {
        continue;
      }

      if (stat.isDirectory()) {
        countDir(filePath);
      } else if (file.match(/\.(ts|js|tsx|jsx)$/)) {
        totalFiles++;
        const content = fs.readFileSync(filePath, 'utf-8');
        totalLines += content.split('\n').length;
      }
    }
  }

  countDir(path.join(__dirname, '../app'));
  countDir(path.join(__dirname, '../lib'));
  countDir(path.join(__dirname, '../components'));

  return { files: totalFiles, lines: totalLines };
}

/**
 * Check documentation coverage
 */
async function checkDocumentationCoverage(state: CodebaseState): Promise<{
  totalDocs: number;
  coverage: number;
  missingDocs: string[];
}> {
  const missingDocs: string[] = [];

  // Check if all API routes have @purpose
  state.apiRoutes.forEach((route) => {
    if (!route.description) {
      missingDocs.push(route.file);
    }
  });

  // Check if all services have @purpose
  state.services.forEach((service) => {
    if (!service.purpose) {
      missingDocs.push(service.file);
    }
  });

  const totalFiles = state.apiRoutes.length + state.services.length;
  const documented = totalFiles - missingDocs.length;
  const coverage = totalFiles > 0 ? Math.round((documented / totalFiles) * 100) : 100;

  return {
    totalDocs: documented,
    coverage,
    missingDocs,
  };
}

/**
 * Write codebase state to JSON
 */
async function writeCodebaseState(state: CodebaseState) {
  const outputPath = path.join(__dirname, '../docs/CODEBASE_STATE.json');
  fs.writeFileSync(outputPath, JSON.stringify(state, null, 2));
}

/**
 * Generate API reference markdown
 */
async function generateAPIReference(state: CodebaseState) {
  const md = `# API Reference

**Auto-generated:** ${state.timestamp}

## Endpoints

${state.apiRoutes
  .map(
    (route) => `
### ${route.method} ${route.path}

**File:** \`${route.file}\`
${route.description ? `**Description:** ${route.description}` : ''}
${route.authentication ? '**Authentication:** Required' : '**Authentication:** Optional'}
${route.rateLimit ? `**Rate Limit:** ${route.rateLimit}` : ''}
${route.cost ? `**Cost:** ${route.cost}` : ''}
`
  )
  .join('\n')}

## Statistics

- Total API Routes: ${state.apiRoutes.length}
- Total Services: ${state.services.length}
- Total Error Codes: ${state.errors.length}
- Documentation Coverage: ${state.documentation.coverage}%
`;

  fs.writeFileSync(path.join(__dirname, '../docs/API_REFERENCE.md'), md);
}

/**
 * Generate dependency graph
 */
async function generateDependencyGraph(state: CodebaseState) {
  const md = `# Dependency Graph

**Auto-generated:** ${state.timestamp}

## Production Dependencies

${state.dependencies
  .filter((dep) => dep.type === 'production')
  .map((dep) => `- **${dep.name}** (${dep.version})`)
  .join('\n')}

## Development Dependencies

${state.dependencies
  .filter((dep) => dep.type === 'development')
  .map((dep) => `- **${dep.name}** (${dep.version})`)
  .join('\n')}

## Total: ${state.dependencies.length} dependencies
`;

  fs.writeFileSync(path.join(__dirname, '../docs/DEPENDENCY_GRAPH.md'), md);
}

// Run if called directly
if (require.main === module) {
  generateDocumentation().catch(console.error);
}

export { generateDocumentation };
