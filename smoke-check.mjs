import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync(new URL('./public/sample-contract.json', import.meta.url)));
const payload = JSON.parse(fs.readFileSync(new URL('./public/findings.json', import.meta.url)));
const paragraphs = new Map(contract.sections.flatMap((s) => s.paragraphs.map((p) => [p.id, p])));
const failures = [];
for (const finding of payload.findings) {
  if (!finding.id || !finding.title) failures.push(`${finding.id}: missing id/title`);
  if (!['high','medium','low'].includes(finding.severity)) failures.push(`${finding.id}: invalid severity`);
  if (finding.anchor) {
    const p = paragraphs.get(finding.anchor.paragraphId);
    if (!p) failures.push(`${finding.id}: missing start paragraph ${finding.anchor.paragraphId}`);
    if (finding.anchor.endParagraphId && !paragraphs.has(finding.anchor.endParagraphId)) failures.push(`${finding.id}: missing end paragraph ${finding.anchor.endParagraphId}`);
  }
}
if (payload.findings.length !== 24) failures.push(`Expected 24 findings, found ${payload.findings.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Smoke check passed: ${payload.findings.length} findings, ${paragraphs.size} paragraphs.`);
