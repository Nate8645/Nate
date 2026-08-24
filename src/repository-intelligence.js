'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  } catch {
    return '';
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch {
    return null;
  }
}

function listFiles(relativeDir, predicate = () => true) {
  const dir = path.join(ROOT, relativeDir);
  try {
    return fs.readdirSync(dir)
      .filter((name) => predicate(name))
      .map((name) => path.join(relativeDir, name).replaceAll('\\', '/'))
      .sort();
  } catch {
    return [];
  }
}

function walkFiles(relativeDir = '.', predicate = () => true, limit = 500) {
  const out = [];
  const ignored = new Set(['.git', 'node_modules', '.cache', 'data', 'public/videos']);
  function visit(rel) {
    if (out.length >= limit) return;
    const abs = path.join(ROOT, rel);
    let entries = [];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = path.join(rel, entry.name).replaceAll('\\', '/');
      const normalized = child.startsWith('./') ? child.slice(2) : child;
      if (ignored.has(normalized) || ignored.has(entry.name)) continue;
      if (entry.isDirectory()) visit(child);
      else if (predicate(normalized)) out.push(normalized);
      if (out.length >= limit) return;
    }
  }
  visit(relativeDir);
  return out.sort();
}

function parseFrontMatter(text) {
  if (!text.startsWith('---')) return { meta: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const meta = {};
  let currentKey = null;
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      meta[currentKey] = match[2].replace(/^>-?\s*/, '').trim();
    } else if (currentKey && line.trim()) {
      meta[currentKey] = `${meta[currentKey]} ${line.trim()}`.trim();
    }
  }
  return { meta, body };
}

function summarizeBody(body, max = 220) {
  return body.replace(/[#*_`>|-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) || 'No description available.';
}

function skillRecords() {
  return listFiles('.claude/skills', () => true)
    .flatMap((dir) => listFiles(dir, (name) => name === 'SKILL.md'))
    .map((file) => {
      const parsed = parseFrontMatter(readText(file));
      const name = parsed.meta.name || path.basename(path.dirname(file));
      return {
        type: 'skill',
        key: name,
        name,
        path: file,
        description: parsed.meta.description || summarizeBody(parsed.body),
        dependencies: name === 'cod' ? ['Node/npm for project tests', 'git diff/status'] : ['Claude Code skill runtime', 'Repo files'],
        permissions: name === 'cod' ? ['Read code', 'Edit code', 'Run tests'] : ['Read repo', 'Spawn relevant Claude agents when available'],
        apis: [],
        compatibility: 'integrated_adapter',
        value: name === 'cod'
          ? 'Converted into the platform quality gates for Developer, QA, Security, and Docs agents.'
          : 'Converted into the AI Command Center operating protocol and AI Company orchestration model.',
        risk: 'No runtime secret access. These are instruction assets; web-app execution remains permission-gated.',
      };
    });
}

function agentRecords() {
  return listFiles('.claude/agents', (name) => name.endsWith('.md')).map((file) => {
    const parsed = parseFrontMatter(readText(file));
    const name = parsed.meta.name || path.basename(file, '.md');
    const tools = String(parsed.meta.tools || '').split(',').map((tool) => tool.trim()).filter(Boolean);
    return {
      type: 'agent_instruction',
      key: name,
      name,
      path: file,
      description: parsed.meta.description || summarizeBody(parsed.body),
      dependencies: ['Claude Code agent runtime when used outside the SaaS', 'Repo read access'],
      permissions: tools.length ? tools : ['Read repo'],
      apis: tools.filter((tool) => ['WebSearch', 'WebFetch'].includes(tool)),
      compatibility: 'integrated_adapter',
      value: `Mapped as a source instruction for related UltraLaunch AI agents. Tools detected: ${tools.join(', ') || 'implicit repo tools'}.`,
      risk: tools.includes('Bash') || tools.includes('Write') || tools.includes('Edit') ? 'Can be powerful in Claude Code; web-app usage is reduced to plans/tasks unless approved.' : 'Low-risk instruction source.',
    };
  });
}

function commandRecords() {
  return listFiles('.claude/commands', (name) => name.endsWith('.md')).map((file) => {
    const parsed = parseFrontMatter(readText(file));
    const name = path.basename(file, '.md');
    return {
      type: 'command',
      key: name,
      name: `/${name}`,
      path: file,
      description: parsed.meta.description || summarizeBody(parsed.body),
      dependencies: ['Claude Code command runtime for direct slash-command execution'],
      permissions: name.includes('review') ? ['Read diff', 'Run tests', 'Security review'] : ['Read repo', 'Plan work'],
      apis: [],
      compatibility: 'adapter_only',
      value: 'Converted into web-app playbooks and quality-gate descriptions; not claimed as executable slash commands inside the SaaS.',
      risk: 'Safe when treated as a playbook. Direct command execution still belongs to Claude Code, not the customer web app.',
    };
  });
}

function pluginRecords() {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const plugin = readJson('ultra-enterprise-os/.claude-plugin/plugin.json');
  const records = [];
  if (marketplace) {
    records.push({
      type: 'plugin_marketplace',
      key: marketplace.name || 'nate-marketplace',
      name: marketplace.name || 'Nate marketplace',
      path: '.claude-plugin/marketplace.json',
      description: marketplace.metadata?.description || 'Private Claude plugin marketplace.',
      dependencies: ['Claude Code plugin marketplace support', 'GitHub repo access'],
      permissions: ['Install Claude plugin in Claude Code only'],
      apis: ['GitHub repository source'],
      compatibility: 'documented_not_runtime',
      value: 'Marketplace metadata is preserved and surfaced in the SaaS as a developer-tools inventory.',
      risk: 'Not installed by the SaaS runtime. No customer permissions are granted automatically.',
    });
  }
  if (plugin) {
    records.push({
      type: 'plugin',
      key: plugin.name || 'ultra-enterprise-os',
      name: plugin.name || 'ultra-enterprise-os',
      path: 'ultra-enterprise-os/.claude-plugin/plugin.json',
      description: plugin.description || 'Claude Code plugin manifest.',
      dependencies: ['Claude Code plugin runtime'],
      permissions: ['Skill/agent/command registration in Claude Code'],
      apis: [],
      compatibility: 'integrated_adapter',
      value: 'Its org-chart, agents, and operating protocol inform the web-app AI OS model.',
      risk: 'Instruction-only inside this SaaS unless a future official Claude plugin bridge is added.',
    });
  }
  return records;
}

function scriptRecords() {
  const pkg = readJson('package.json') || {};
  return Object.entries(pkg.scripts || {}).map(([key, command]) => ({
    type: 'script',
    key,
    name: `npm run ${key}`,
    path: 'package.json',
    description: command,
    dependencies: ['Node.js >= 22.5.0', 'npm dependencies from package-lock.json'],
    permissions: command.includes('stripe') ? ['Environment secrets for Stripe when used'] : ['Local process execution'],
    apis: command.includes('stripe') ? ['Stripe API when STRIPE_SECRET_KEY is set'] : [],
    compatibility: 'integrated_runtime',
    value: key === 'lint' || key === 'test' ? 'Used as quality gates after integrations.' : 'Available operational script.',
    risk: command.includes('stripe') ? 'Requires real Stripe secrets; do not run against live mode without owner approval.' : 'Local execution only.',
  }));
}

function workflowRecords() {
  const files = listFiles('.github/workflows', (name) => name.endsWith('.yml') || name.endsWith('.yaml'));
  if (!files.length) {
    return [{
      type: 'workflow',
      key: 'github-actions',
      name: 'GitHub Actions',
      path: '.github/workflows',
      description: 'No active GitHub Actions workflow files are present in this branch.',
      dependencies: ['GitHub Actions permissions if reintroduced'],
      permissions: ['Repository workflow permission required'],
      apis: ['GitHub Actions'],
      compatibility: 'not_present',
      value: 'CI can be reintroduced later when workflow permissions allow it. Local lint/test remain the active gates.',
      risk: 'Earlier pushes failed when workflow files were present without GitHub App workflow permission.',
    }];
  }
  return files.map((file) => ({
    type: 'workflow', key: path.basename(file), name: path.basename(file), path: file,
    description: summarizeBody(readText(file)), dependencies: ['GitHub Actions'], permissions: ['Repository workflow permission'], apis: ['GitHub Actions'], compatibility: 'review_required', value: 'Potential CI/CD automation.', risk: 'Must validate permissions before editing.',
  }));
}

function mcpRecords() {
  const matches = walkFiles('.', (name) => /(^|[/._-])mcp([._/-]|$)/i.test(name) || /claude_desktop_config\.json$/i.test(name) || /model-context-protocol/i.test(name), 80);
  if (!matches.length) {
    return [{
      type: 'mcp',
      key: 'mcp-configs',
      name: 'MCP configurations',
      path: 'repo scan',
      description: 'No concrete MCP server configuration file was found in the current branch. The product already has an MCP-style integration catalog and marketplace readiness layer.',
      dependencies: ['Future official MCP servers per provider'],
      permissions: ['Per-connector OAuth/API scopes', 'User approval for critical actions'],
      apis: [],
      compatibility: 'not_present',
      value: 'Documented honestly; no false claim that MCP servers are connected.',
      risk: 'Do not invent MCP availability. Add one provider at a time with official docs and secrets via env.',
    }];
  }
  return matches.map((file) => ({ type: 'mcp', key: file, name: file, path: file, description: 'MCP-related file detected.', dependencies: ['Review required'], permissions: ['Review required'], apis: [], compatibility: 'review_required', value: 'Potential MCP configuration.', risk: 'Must inspect before enabling.' }));
}

const bindingMap = [
  ['developer-agent', ['cod', 'ultra-fullstack', 'ultra-architect', '/ultra-review'], ['Code implementation', 'Architecture review', 'Test-driven changes']],
  ['qa-agent', ['cod', 'ultra-qa', '/ultra-review'], ['Regression tests', 'Smoke tests', 'Acceptance gates']],
  ['security-agent', ['ultra-security', '/ultra-review'], ['Defensive review', 'Secret scanning', 'Permission audits']],
  ['marketing-agent', ['ultra-business', 'ultra-enterprise-os'], ['Campaign planning', 'SEO/content playbooks', 'Positioning']],
  ['seo-agent', ['ultra-business'], ['Organic growth research', 'Content briefs']],
  ['research-agent', ['ultra-business', 'ultra-data-ml'], ['Evidence gathering', 'Data analysis']],
  ['design-agent', ['ultra-design'], ['Premium UI/UX review', 'Accessibility checks']],
  ['documentation-agent', ['ultra-docs'], ['README updates', 'Operator docs', 'Audit summaries']],
  ['devops-agent', ['ultra-devops', 'cod'], ['Deployment readiness', 'Cost/rollback notes']],
  ['ceo-agent', ['ultra-enterprise-os', 'ultra-orchestrator', '/ultra-team'], ['Task decomposition', 'AI company orchestration']],
];

function repositoryExtensionAudit() {
  const records = [
    ...pluginRecords(),
    ...skillRecords(),
    ...agentRecords(),
    ...commandRecords(),
    ...mcpRecords(),
    ...workflowRecords(),
    ...scriptRecords(),
  ];
  return {
    scannedAt: new Date().toISOString(),
    summary: {
      total: records.length,
      integrated: records.filter((r) => r.compatibility.includes('integrated')).length,
      adapters: records.filter((r) => r.compatibility.includes('adapter')).length,
      notPresent: records.filter((r) => r.compatibility === 'not_present').length,
      reviewRequired: records.filter((r) => r.compatibility === 'review_required').length,
    },
    records,
    bindings: bindingMap.map(([agentKey, sources, tools]) => ({ agentKey, sources, tools })),
    neededEnvironment: [
      ['OPENAI_API_KEY', 'Optional external LLM provider for launch kits and future orchestrator responses.'],
      ['GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET', 'Future GitHub OAuth connector; not required for current prepared inventory.'],
      ['SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET', 'Future Shopify OAuth connector.'],
      ['STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_*', 'Existing billing integration.'],
      ['GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET', 'Future Google Drive/Calendar/Gmail connectors.'],
    ],
    integrationPolicy: [
      'Instruction assets are integrated as playbooks and agent tool bindings, not blindly executed.',
      'No MCP server was found in the current branch; none is claimed as live.',
      'Secrets remain environment-driven; no API keys are stored in code or chat.',
      'GitHub Actions workflows are not reintroduced because the GitHub App may lack workflow permissions.',
    ],
  };
}

module.exports = { repositoryExtensionAudit };
