/** Operator step: register the server worker as a device of the Studio owner.
 * Runs as the Studio service account against its database. The device belongs
 * to that one person, so the own-device boundary for code jobs is unchanged;
 * the owner sees and can revoke it in Studio like any PC. The token is written
 * to stdout once (for the root-owned worker configuration) and stored hashed.
 * Usage: STUDIO_DATA_DIR=... node register-worker.mjs "Device name"
 */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {digest,token} from '../../store.mjs';

const name=process.argv[2];
if(typeof name!=='string'||!/^[\p{L}\p{N} ._()-]{3,80}$/u.test(name))throw new Error('Device name required.');
const db=new DatabaseSync(path.join(path.resolve(process.env.STUDIO_DATA_DIR??'.studio'),'studio.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
try{
 const owners=db.prepare("SELECT id FROM members WHERE role='owner'").all();
 if(owners.length!==1)throw new Error('Exactly one Studio owner is required; register the worker in the UI instead.');
 if(db.prepare('SELECT id FROM devices WHERE owner=? AND name=? AND revoked=0').get(owners[0].id,name))throw new Error('An active device with this name exists; revoke it in Studio before registering again.');
 const value=token(),id=randomUUID();
 db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run(id,owners[0].id,name,digest(value));
 process.stdout.write(JSON.stringify({device:id,token:value}));
}finally{db.close();}
