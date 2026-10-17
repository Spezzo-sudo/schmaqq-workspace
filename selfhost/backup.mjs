import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const source=path.resolve(process.env.STUDIO_DATA_DIR??'.studio','studio.sqlite'),destination=path.resolve(process.argv[2]??path.join(process.env.STUDIO_DATA_DIR??'.studio','backups',`studio-${Date.now()}.sqlite`));
if(!existsSync(source))throw new Error('Studio-Datenbank fehlt.');
if(existsSync(destination))throw new Error('Backup-Ziel existiert bereits.');
mkdirSync(path.dirname(destination),{recursive:true});
const db=new DatabaseSync(source);db.prepare('VACUUM INTO ?').run(destination);db.close();console.log('SQLite-Snapshot erstellt: '+destination);
