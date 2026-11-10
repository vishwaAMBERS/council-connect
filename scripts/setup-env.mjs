// Creates local .env files from the .env.example templates (never overwrites).
import fs from 'node:fs';
import crypto from 'node:crypto';

for (const dir of ['backend', 'web']) {
  const target = `${dir}/.env`;
  if (fs.existsSync(target)) {
    console.log(`${target} already exists, left untouched`);
    continue;
  }
  let text = fs.readFileSync(`${dir}/.env.example`, 'utf8');
  text = text.replace('replace_with_a_long_random_string', crypto.randomBytes(32).toString('hex'));
  fs.writeFileSync(target, text);
  console.log(`created ${target}`);
}
