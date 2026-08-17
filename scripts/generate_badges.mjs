#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, '..');
const outputDirectory = join(repositoryRoot, 'assets', 'badges');
const tokenSource = await readFile(join(repositoryRoot, 'tokens.css'), 'utf8');

const requiredTokens = [
  '--color-paper-dark',
  '--color-surface-dark',
  '--color-rule-dark',
  '--color-ink-dark',
  '--color-muted-dark',
  '--color-accent',
  '--font-mono',
];

const tokens = Object.fromEntries(
  requiredTokens.map((name) => {
    const match = tokenSource.match(new RegExp(`${name}:\\s*([^;]+);`));
    if (!match) throw new Error(`Missing design token: ${name}`);
    return [name, match[1].trim()];
  }),
);

const revisions = {
  devicon: '7330accdbc47e2dc0c19789a48533c4a3c50fe58',
  litert: 'd9f242b4e548205601911bfe271a6f01d7b5752b',
  lobe: '4aaf4ee1fb2678a7f989ea570f0f6ce14a9abf75',
  mlx: '06f154bcf55f5a6be304f1aad2e85ed5b7a39316',
  orca: 'b2612de157d58320f2b90fa319d04c4f8bbab2cd',
};

function raw(repository, revision, path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${repository}/${revision}/${encodedPath}`;
}

const mlxLogo = raw('ml-explore/mlx', revisions.mlx, 'docs/logo/mlx_logo.svg');

const badges = [
  { slug: 'mlx', label: 'MLX', width: 82, source: mlxLogo, viewBox: '290.57 0 136.33 139.72' },
  {
    slug: 'litert-lm',
    label: 'LiteRT-LM',
    width: 124,
    source: raw('google-ai-edge/LiteRT-LM', revisions.litert, 'js/apps/chat/public/assets/LiteRT_Logo_Symbol-only_RGB_Color_Teal.svg'),
  },
  { slug: 'qwen', label: 'Qwen', width: 92, source: raw('lobehub/lobe-icons', revisions.lobe, 'packages/static-svg/icons/qwen-color.svg') },
  {
    slug: 'unsloth',
    label: 'Unsloth',
    width: 116,
    source: raw('lobehub/lobe-icons', revisions.lobe, 'src/Unsloth/components/Mono.tsx'),
    type: 'tsx',
  },
  { slug: 'python', label: 'Python', width: 104, source: raw('devicons/devicon', revisions.devicon, 'icons/python/python-original.svg') },
  { slug: 'pytorch', label: 'PyTorch', width: 112, source: raw('devicons/devicon', revisions.devicon, 'icons/pytorch/pytorch-original.svg') },
  { slug: 'mlx-serve', label: 'MLX Serve', width: 128, source: mlxLogo, viewBox: '290.57 0 136.33 139.72', decorator: true },
  { slug: 'spring-boot', label: 'Spring Boot', width: 142, source: raw('devicons/devicon', revisions.devicon, 'icons/spring/spring-original.svg') },
  { slug: 'postgresql', label: 'PostgreSQL', width: 126, source: raw('devicons/devicon', revisions.devicon, 'icons/postgresql/postgresql-original.svg') },
  {
    slug: 'aws',
    label: 'AWS',
    width: 82,
    iconWidth: 21,
    monochrome: true,
    source: raw('devicons/devicon', revisions.devicon, 'icons/amazonwebservices/amazonwebservices-original-wordmark.svg'),
  },
  { slug: 'gcp', label: 'GCP', width: 82, source: raw('devicons/devicon', revisions.devicon, 'icons/googlecloud/googlecloud-original.svg') },
  { slug: 'docker', label: 'Docker', width: 100, source: raw('devicons/devicon', revisions.devicon, 'icons/docker/docker-original.svg') },
  { slug: 'codex', label: 'Codex', width: 96, source: raw('lobehub/lobe-icons', revisions.lobe, 'packages/static-svg/icons/codex-color.svg') },
  { slug: 'orca', label: 'Orca', width: 88, source: raw('stablyai/orca', revisions.orca, 'resources/logo.svg') },
  { slug: 'cpp', label: 'C++', width: 82, source: raw('devicons/devicon', revisions.devicon, 'icons/cplusplus/cplusplus-original.svg') },
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function cleanSvgBody(body) {
  return body.replace(/[ \t]+$/gm, '').trim();
}

function parseSvg(source) {
  const normalized = source
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+=(['"])[\s\S]*?\1/gi, '');
  const root = normalized.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/i);
  if (!root) throw new Error('Fetched asset is not a complete SVG document');

  const attributes = root[1];
  const viewBox = attributes.match(/viewBox=(['"])(.*?)\1/i)?.[2];
  if (viewBox) return { body: cleanSvgBody(root[2]), viewBox };

  const width = Number.parseFloat(attributes.match(/width=(['"])(.*?)\1/i)?.[2] ?? '24');
  const height = Number.parseFloat(attributes.match(/height=(['"])(.*?)\1/i)?.[2] ?? '24');
  return { body: cleanSvgBody(root[2]), viewBox: `0 0 ${width} ${height}` };
}

function parseTsxIcon(source) {
  const root = source.match(/<svg\b[\s\S]*?viewBox="([^"]+)"[\s\S]*?>([\s\S]*?)<\/svg>/i);
  if (!root) throw new Error('Fetched component does not contain an SVG');

  const body = root[2]
    .replace(/<title>\{TITLE\}<\/title>/g, '')
    .replaceAll('fillRule=', 'fill-rule=')
    .replaceAll('clipRule=', 'clip-rule=')
    .replaceAll('fillOpacity=', 'fill-opacity=');
  return { body: cleanSvgBody(body), viewBox: root[1] };
}

async function loadIcon(badge) {
  const response = await fetch(badge.source, { headers: { 'user-agent': 'pysunn14-profile-badge-generator' } });
  if (!response.ok) throw new Error(`${badge.slug}: ${response.status} ${response.statusText}`);

  const source = await response.text();
  const parsed = badge.type === 'tsx' ? parseTsxIcon(source) : parseSvg(source);
  const viewBox = badge.viewBox ?? parsed.viewBox;
  const body = badge.monochrome
    ? parsed.body.replace(/\sfill=(['"])(?!none)[^'"]*\1/gi, ' fill="var(--color-icon)"')
    : parsed.body;
  return `<svg x="0" y="0" width="24" height="24" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" fill="var(--color-icon)" color="var(--color-icon)" aria-hidden="true">${body}</svg>`;
}

function renderBadge(badge, icon) {
  const iconWidth = badge.iconWidth ?? 18;
  const iconX = 10 + (21 - iconWidth) / 2;
  const labelX = 38;
  const decorator = badge.decorator
    ? '\n  <circle class="status" cx="27" cy="23" r="3.5" /><circle class="status-core" cx="27" cy="23" r="1.5" />'
    : '';

  return `<!-- Hallmark · component: badge · genre: modern-minimal · theme: Cobalt · state: static -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${badge.width}" height="32" viewBox="0 0 ${badge.width} 32" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(badge.label)}</title>
  <style>
    :root {
      --color-paper: ${tokens['--color-paper-dark']};
      --color-surface: ${tokens['--color-surface-dark']};
      --color-rule: ${tokens['--color-rule-dark']};
      --color-ink: ${tokens['--color-ink-dark']};
      --color-muted: ${tokens['--color-muted-dark']};
      --color-accent: ${tokens['--color-accent']};
      --color-icon: ${tokens['--color-ink-dark']};
      --font-mono: ${tokens['--font-mono']};
    }
    .surface { fill: var(--color-surface); stroke: var(--color-rule); }
    .label { fill: var(--color-ink); font-family: var(--font-mono); font-size: 12px; font-style: normal; font-weight: 600; }
    .status { fill: var(--color-paper); }
    .status-core { fill: var(--color-accent); }
  </style>
  <rect class="surface" x="0.5" y="0.5" width="${badge.width - 1}" height="31" rx="6" />
  <g transform="translate(${iconX} 7) scale(${iconWidth / 24} 0.75)">${icon}</g>${decorator}
  <text class="label" x="${labelX}" y="20.5">${escapeXml(badge.label)}</text>
</svg>
`;
}

await mkdir(outputDirectory, { recursive: true });

for (const badge of badges) {
  const icon = await loadIcon(badge);
  await writeFile(join(outputDirectory, `${badge.slug}.svg`), renderBadge(badge, icon), 'utf8');
  process.stdout.write(`generated ${badge.slug}.svg\n`);
}
