import path from 'node:path';
import { openStore,createInvite } from './store.mjs';
const email=process.argv[2];if(!email||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Aufruf: node selfhost/admin.mjs EMAIL [--owner]');
const db=openStore(path.resolve(process.env.STUDIO_DATA_DIR??'.studio','studio.sqlite'));
if(db.prepare('SELECT id FROM members WHERE email=?').get(email.toLowerCase()))throw new Error('Konto existiert bereits.');
const invite=createInvite(db,email,process.argv.includes('--owner')?'owner':'member');
console.log((process.env.STUDIO_ORIGIN??'http://127.0.0.1:4310')+'/?invite='+invite);db.close();
