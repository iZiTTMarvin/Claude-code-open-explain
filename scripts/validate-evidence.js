#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const researchRoot = path.join(repoRoot, 'research');
const evidenceRoot = path.join(researchRoot, 'evidence');
const registryPath = path.join(evidenceRoot, 'registry.json');
const manifestsRoot = path.join(researchRoot, 'section-manifests');

function resolveSourceRepoRoot() {
  const candidates = [
    process.env.CLAUDE_CODE_OPEN_ROOT,
    path.resolve(repoRoot, '..', 'Claude-code-open'),
    'D:\\visual_ProgrammingSoftware\\毕设and简历Projects\\Claude-code-open'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const sourceRepoRoot = resolveSourceRepoRoot();

const allowedStatuses = new Set([
  'draft',
  'verified',
  'contested',
  'published',
  'stale',
  'superseded'
]);

const allowedConfidence = new Set(['high', 'medium', 'low']);
const allowedMainFlowSteps = new Set([
  'MF-01',
  'MF-02',
  'MF-03',
  'MF-04',
  'MF-05',
  'MF-06',
  'MF-07',
  'MF-08',
  'MF-09',
  'MF-10'
]);

function walkJsonFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...walkJsonFiles(fullPath));
      continue;
    }
    if (item.isFile() && item.name.endsWith('.json') && item.name !== 'registry.json') {
      files.push(fullPath);
    }
  }

  return files;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateAnchor(anchor, relPath, label, errors) {
  if (!anchor || typeof anchor !== 'object') {
    errors.push(`${relPath}: ${label} must be an object`);
    return;
  }

  const anchorKeys = ['snapshotCommit', 'filePath', 'stableSymbol', 'excerptHash'];
  for (const key of anchorKeys) {
    if (!anchor[key] || typeof anchor[key] !== 'string') {
      errors.push(`${relPath}: ${label}.${key} is required`);
    }
  }

  if (typeof anchor.filePath === 'string') {
    const sourceFile = path.join(sourceRepoRoot, anchor.filePath);
    if (!fs.existsSync(sourceFile)) {
      errors.push(`${relPath}: source file not found -> ${anchor.filePath}`);
    }
  }

  if (anchor.lineRange !== undefined && !/^\d+-\d+$/.test(String(anchor.lineRange))) {
    errors.push(`${relPath}: ${label}.lineRange must match 123-456`);
  }
}

function fail(errors) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

function arraysEqualAsSets(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

const errors = [];

if (!fs.existsSync(researchRoot)) {
  errors.push('missing research/ directory');
}

if (!fs.existsSync(registryPath)) {
  errors.push('missing research/evidence/registry.json');
}

if (!fs.existsSync(sourceRepoRoot)) {
  errors.push(`source repo not found: ${sourceRepoRoot}`);
}

if (errors.length > 0) {
  fail(errors);
}

const registry = readJson(registryPath);

if (registry.registryVersion !== 1) {
  errors.push('registryVersion must be 1');
}

if (!Array.isArray(registry.truthChain) || registry.truthChain.join('>') !== 'snapshot>evidence>section-manifest>chapter') {
  errors.push('registry truthChain must be snapshot -> evidence -> section-manifest -> chapter');
}

const evidenceFiles = walkJsonFiles(evidenceRoot);
const seenIds = new Set();
const evidenceById = new Map();

for (const filePath of evidenceFiles) {
  const relPath = path.relative(repoRoot, filePath);
  const data = readJson(filePath);
  const requiredKeys = [
    'schemaVersion',
    'evidenceId',
    'status',
    'waveId',
    'agentRole',
    'snapshotRef',
    'lastVerifiedCommit',
    'lastVerifiedAt',
    'mainFlowStepId',
    'chapterIds',
    'sourceAnchor',
    'observed',
    'evidenceSummary',
    'inference',
    'confidence',
    'conflictFlag',
    'readyForChapterBackfill',
    'openQuestions'
  ];

  for (const key of requiredKeys) {
    if (!(key in data)) {
      errors.push(`${relPath}: missing required key "${key}"`);
    }
  }

  if (data.schemaVersion !== 1) {
    errors.push(`${relPath}: schemaVersion must be 1`);
  }

  if (typeof data.evidenceId !== 'string' || !/^EV-W\d{2}-[A-Z0-9-]+-\d{3}$/.test(data.evidenceId)) {
    errors.push(`${relPath}: invalid evidenceId`);
  } else if (seenIds.has(data.evidenceId)) {
    errors.push(`${relPath}: duplicate evidenceId ${data.evidenceId}`);
  } else {
    seenIds.add(data.evidenceId);
    evidenceById.set(data.evidenceId, {
      filePath,
      relativePath: relPath,
      data
    });
  }

  if (!allowedStatuses.has(data.status)) {
    errors.push(`${relPath}: invalid status "${data.status}"`);
  }

  if (!allowedConfidence.has(data.confidence)) {
    errors.push(`${relPath}: invalid confidence "${data.confidence}"`);
  }

  if (!allowedMainFlowSteps.has(data.mainFlowStepId)) {
    errors.push(`${relPath}: invalid mainFlowStepId "${data.mainFlowStepId}"`);
  }

  if (!Array.isArray(data.chapterIds) || data.chapterIds.length === 0) {
    errors.push(`${relPath}: chapterIds must be a non-empty array`);
  }

  validateAnchor(data.sourceAnchor, relPath, 'sourceAnchor', errors);

  if (data.relatedAnchors !== undefined) {
    if (!Array.isArray(data.relatedAnchors)) {
      errors.push(`${relPath}: relatedAnchors must be an array when provided`);
    } else {
      for (const [index, anchor] of data.relatedAnchors.entries()) {
        validateAnchor(anchor, relPath, `relatedAnchors[${index}]`, errors);
      }
    }
  }

  if (typeof data.lastVerifiedCommit !== 'string' || !/^[a-f0-9]{40}$/.test(data.lastVerifiedCommit)) {
    errors.push(`${relPath}: lastVerifiedCommit must be a 40-char sha`);
  }

  if (Number.isNaN(Date.parse(data.lastVerifiedAt))) {
    errors.push(`${relPath}: lastVerifiedAt must be a valid date-time string`);
  }

  if (typeof data.observed !== 'string' || !data.observed.trim()) {
    errors.push(`${relPath}: observed must be non-empty`);
  }

  if (typeof data.evidenceSummary !== 'string' || !data.evidenceSummary.trim()) {
    errors.push(`${relPath}: evidenceSummary must be non-empty`);
  }

  if (typeof data.inference !== 'string' || !data.inference.trim()) {
    errors.push(`${relPath}: inference must be non-empty`);
  }

  if (!Array.isArray(data.openQuestions)) {
    errors.push(`${relPath}: openQuestions must be an array`);
  }
}

if (!Array.isArray(registry.artifacts)) {
  errors.push('registry.artifacts must be an array');
} else {
  for (const [index, artifact] of registry.artifacts.entries()) {
    const label = `registry.artifacts[${index}]`;
    if (!artifact || typeof artifact !== 'object') {
      errors.push(`${label}: must be an object`);
      continue;
    }

    const required = ['evidenceId', 'path', 'status', 'mainFlowStepId', 'chapterIds'];
    for (const key of required) {
      if (!(key in artifact)) {
        errors.push(`${label}: missing required key "${key}"`);
      }
    }

    if (typeof artifact.evidenceId !== 'string') {
      errors.push(`${label}: evidenceId must be a string`);
      continue;
    }

    const evidenceEntry = evidenceById.get(artifact.evidenceId);
    if (!evidenceEntry) {
      errors.push(`${label}: evidenceId ${artifact.evidenceId} not found in evidence files`);
      continue;
    }

    const expectedPath = evidenceEntry.relativePath.replaceAll('/', '\\');
    const registryPathNormalized = String(artifact.path).replaceAll('/', '\\');
    if (registryPathNormalized !== expectedPath) {
      errors.push(`${label}: path mismatch for ${artifact.evidenceId} -> registry=${registryPathNormalized}, actual=${expectedPath}`);
    }

    if (artifact.status !== evidenceEntry.data.status) {
      errors.push(`${label}: status mismatch for ${artifact.evidenceId}`);
    }

    if (artifact.mainFlowStepId !== evidenceEntry.data.mainFlowStepId) {
      errors.push(`${label}: mainFlowStepId mismatch for ${artifact.evidenceId}`);
    }

    const registryChapters = Array.isArray(artifact.chapterIds) ? artifact.chapterIds : [];
    const evidenceChapters = Array.isArray(evidenceEntry.data.chapterIds) ? evidenceEntry.data.chapterIds : [];
    if (!arraysEqualAsSets(registryChapters, evidenceChapters)) {
      errors.push(`${label}: chapterIds mismatch for ${artifact.evidenceId}`);
    }
  }
}

if (fs.existsSync(manifestsRoot)) {
  const manifestFiles = fs
    .readdirSync(manifestsRoot, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.endsWith('.yml'))
    .map(item => path.join(manifestsRoot, item.name));

  for (const manifestPath of manifestFiles) {
    const relPath = path.relative(repoRoot, manifestPath);
    const text = fs.readFileSync(manifestPath, 'utf8');

    const chapterIdMatch = text.match(/^chapter_id:\s*"([^"]+)"/m);
    if (!chapterIdMatch) {
      errors.push(`${relPath}: missing chapter_id`);
      continue;
    }

    const chapterPathMatch = text.match(/^chapter_path:\s*"([^"]+)"/m);
    if (!chapterPathMatch) {
      errors.push(`${relPath}: missing chapter_path`);
    } else {
      const chapterAbsPath = path.join(repoRoot, chapterPathMatch[1]);
      if (!fs.existsSync(chapterAbsPath)) {
        errors.push(`${relPath}: chapter_path not found -> ${chapterPathMatch[1]}`);
      }
    }

    const requiredIds = [];
    const sectionIds = [];
    const lines = text.split(/\r?\n/);
    let inRequired = false;
    let inSectionEvidence = false;
    for (const line of lines) {
      if (/^required_evidence_ids:\s*$/.test(line)) {
        inRequired = true;
        inSectionEvidence = false;
        continue;
      }

      if (/^\s*evidence_ids:\s*$/.test(line)) {
        inSectionEvidence = true;
        inRequired = false;
        continue;
      }

      if (inRequired) {
        const match = line.match(/^\s*-\s*"([^"]+)"/);
        if (match) {
          requiredIds.push(match[1]);
          continue;
        }
        if (/^\S/.test(line) && !/^\s/.test(line)) {
          inRequired = false;
        }
      }

      if (inSectionEvidence) {
        const match = line.match(/^\s*-\s*"([^"]+)"/);
        if (match) {
          sectionIds.push(match[1]);
          continue;
        }
        if (/^\S/.test(line) && !/^\s/.test(line)) {
          inSectionEvidence = false;
        }
      }
    }

    if (requiredIds.length === 0) {
      errors.push(`${relPath}: required_evidence_ids is empty`);
      continue;
    }

    for (const evidenceId of requiredIds) {
      if (!evidenceById.has(evidenceId)) {
        errors.push(`${relPath}: required evidence not found -> ${evidenceId}`);
      }
    }

    for (const evidenceId of sectionIds) {
      if (!requiredIds.includes(evidenceId)) {
        errors.push(`${relPath}: section evidence not declared in required_evidence_ids -> ${evidenceId}`);
      }
      const evidenceEntry = evidenceById.get(evidenceId);
      if (!evidenceEntry) {
        errors.push(`${relPath}: section evidence not found -> ${evidenceId}`);
        continue;
      }
      if (!evidenceEntry.data.chapterIds.includes(chapterIdMatch[1])) {
        errors.push(`${relPath}: evidence chapterIds missing ${chapterIdMatch[1]} -> ${evidenceId}`);
      }
      const registryEntry = Array.isArray(registry.artifacts)
        ? registry.artifacts.find(item => item.evidenceId === evidenceId)
        : undefined;
      if (registryEntry && !registryEntry.chapterIds.includes(chapterIdMatch[1])) {
        errors.push(`${relPath}: registry chapterIds missing ${chapterIdMatch[1]} -> ${evidenceId}`);
      }
    }
  }
}

if (errors.length > 0) {
  fail(errors);
}

console.log(`Validated ${evidenceFiles.length} evidence file(s).`);
console.log(`Registry: ${path.relative(repoRoot, registryPath)}`);
console.log(`Source repo: ${sourceRepoRoot}`);
if (fs.existsSync(manifestsRoot)) {
  const manifestCount = fs
    .readdirSync(manifestsRoot, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.endsWith('.yml')).length;
  console.log(`Section manifests: ${manifestCount}`);
}
