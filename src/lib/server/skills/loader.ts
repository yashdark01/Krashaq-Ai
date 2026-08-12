import fs from 'fs';
import path from 'path';

interface SkillMeta {
  name: string;
  description: string;
  triggers: string[];
  body: string;
}

function parseSkillFile(filePath: string): SkillMeta | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const front = match[1];
    const body = match[2].trim();
    const name = front.match(/name:\s*(.+)/)?.[1]?.trim() ?? '';
    const description = front.match(/description:\s*(.+)/)?.[1]?.trim() ?? '';
    const triggersLine = front.match(/triggers:\s*\[(.*)\]/)?.[1] ?? '';
    const triggers = triggersLine
      .split(',')
      .map((t) => t.trim().replace(/['"]/g, ''))
      .filter(Boolean);
    return { name, description, triggers, body };
  } catch {
    return null;
  }
}

function loadSkills(): SkillMeta[] {
  const skillsDir = path.join(process.cwd(), 'lib/skills');
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => parseSkillFile(path.join(skillsDir, d.name, 'SKILL.md')))
    .filter((s): s is SkillMeta => s !== null);
}

export function loadSkillSnippet(message: string): string {
  const msg = message.toLowerCase();
  for (const skill of loadSkills()) {
    if (skill.triggers.some((t) => msg.includes(t.toLowerCase()))) {
      return `Active skill: ${skill.name}\n${skill.description}\n\n${skill.body.slice(0, 1500)}`;
    }
  }
  return '';
}
