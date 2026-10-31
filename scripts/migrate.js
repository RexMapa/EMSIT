import { readFile } from 'node:fs/promises';
import { database } from '../lib/db.js';
const sql = database();
const statements = (await readFile(new URL('../database/schema.sql', import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
await sql.transaction(statements.map(statement=>sql.query(statement)));
console.log('EMSIT schema applied successfully.');
