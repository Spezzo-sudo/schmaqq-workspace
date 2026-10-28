import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createPluginAuth} from './studio-plugin-auth.mjs';

function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-plugin-auth-')),file=path.join(dir,'private.sqlite');
 const db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys=ON; CREATE TABLE members(id TEXT PRIMARY KEY); INSERT INTO members VALUES(\'marco\'),(\'markus\');');
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 let time=1000000000000;
 const issuer='https://studio.fixture.invalid',redirect='https://chat.fixture.invalid/callback';
 const auth=createPluginAuth({db,issuer,clients:[{id:'chat',name:'Personal Chat',redirectUris:[redirect]},{id:'other',name:'Other Client',redirectUris:['https://other.fixture.invalid/callback']}],now:()=>time});
 const verifier='a'.repeat(64),challenge=createHash('sha256').update(verifier).digest('base64url');
 const params={response_type:'code',client_id:'chat',redirect_uri:redirect,state:'original-state',resource:issuer+'/mcp',scope:'studio:read studio:code',code_challenge:challenge,code_challenge_method:'S256'};
 const grant=(member='marco',changes={})=>auth.authorize(auth.validateAuthorization({...params,...changes}),member);
 const exchange=(code,changes={})=>auth.exchange({grant_type:'authorization_code',client_id:'chat',redirect_uri:redirect,code,code_verifier:verifier,resource:issuer+'/mcp',...changes});
 return {db,file,issuer,redirect,auth,params,grant,exchange,advance:ms=>time+=ms};
}
const error=(fn,code)=>assert.throws(fn,e=>e.oauthError===code&&e.error===code&&e.status>=400);

test('personal PKCE grant, discovery, hashed credentials, own revocation and membership checks',t=>{
 const f=fixture(t),code=f.grant(),tokens=f.exchange(code.code),identity=f.auth.resolve(tokens.access_token);
 assert.deepEqual(f.auth.metadata().code_challenge_methods_supported,['S256']);
 assert.equal(f.auth.metadata().client_id_metadata_document_supported,undefined);
 assert.equal(f.auth.resourceMetadata().resource,f.params.resource);
 assert.equal(code.state,'original-state');assert.equal(code.iss,f.issuer);
 assert.equal(identity.memberId,'marco');assert.deepEqual(identity.scopes,['studio:read','studio:code']);assert.equal(tokens.expires_in,3600);
 const listed=f.auth.listGrants('marco');assert.equal(listed.length,1);assert.equal(listed[0].id,identity.grantId);assert.equal(f.auth.listGrants('markus').length,0);
 for(const secret of [code.code,tokens.access_token,tokens.refresh_token])assert.ok(!readFileSync(f.file).includes(Buffer.from(secret)),'plain credential must not enter SQLite');
 error(()=>f.auth.revoke(identity.grantId,'markus'),'access_denied');assert.ok(f.auth.resolve(tokens.access_token));
 f.auth.revoke(identity.grantId,'marco');assert.equal(f.auth.resolve(tokens.access_token),null);
 error(()=>f.grant('missing-person'),'access_denied');
});

test('authorization rejects PKCE downgrade, unknown scopes, duplicated parameters and open redirects',t=>{
 const f=fixture(t);
 for(const changes of [{client_id:'missing'},{redirect_uri:'https://attacker.invalid/'},{resource:'https://attacker.invalid/mcp'},{code_challenge_method:'plain'},{code_challenge:'short'},{state:'x'.repeat(513)},{state:'a\nb'},{scope:'studio:code'},{scope:'studio:read arbitrary'},{scope:'studio:read studio:read'}])assert.throws(()=>f.auth.validateAuthorization({...f.params,...changes}));
 // OAuth 2.1 with PKCE: state, scope and resource may be omitted; defaults are this resource and all scopes shown on consent.
 const {state,scope,resource,...minimal}=f.params,defaults=f.auth.validateAuthorization(minimal);
 assert.equal(defaults.state,'');assert.deepEqual(defaults.scopes,['studio:read','studio:code']);assert.equal(defaults.resource,f.params.resource);
 const duplicated=new URLSearchParams(f.params);duplicated.append('client_id','other');error(()=>f.auth.validateAuthorization(duplicated),'invalid_request');
 assert.throws(()=>createPluginAuth({db:f.db,issuer:'https://studio.fixture.invalid/path',clients:[]}));
 assert.throws(()=>createPluginAuth({db:f.db,issuer:'http://public.fixture.invalid',clients:[]}));
 assert.throws(()=>createPluginAuth({db:f.db,issuer:f.issuer,clients:[{id:'wildcard',name:'Bad',redirectUris:['https://client.fixture.invalid/*']}]}));
});

test('codes are single-use, bound to client/redirect/resource and expire; invalid verifier guesses are bounded',t=>{
 const f=fixture(t),issued=f.grant();
 error(()=>f.exchange(issued.code,{resource:'https://wrong.invalid/mcp'}),'invalid_target');
 error(()=>f.exchange(issued.code,{client_id:'other'}),'invalid_grant');
 error(()=>f.exchange(issued.code,{redirect_uri:'https://attacker.invalid/callback'}),'invalid_grant');
 error(()=>f.exchange(issued.code,{code_verifier:'b'.repeat(64)}),'invalid_grant');
 const good=f.exchange(issued.code);assert.ok(f.auth.resolve(good.access_token));error(()=>f.exchange(issued.code),'invalid_grant');
 const guessed=f.grant();for(let n=0;n<5;n++)error(()=>f.exchange(guessed.code,{code_verifier:'b'.repeat(64)}),'invalid_grant');error(()=>f.exchange(guessed.code),'invalid_grant');
 const expired=f.grant();f.advance(300000);error(()=>f.exchange(expired.code),'invalid_grant');
 const later=f.grant(),access=f.exchange(later.code);f.advance(3600000);assert.equal(f.auth.resolve(access.access_token),null);
});

test('refresh rotates credentials, preserves grant identity, rejects replay and widens no scopes',t=>{
 const f=fixture(t),first=f.exchange(f.grant().code),original=f.auth.resolve(first.access_token);
 const refresh=(token,changes={})=>f.auth.exchange({grant_type:'refresh_token',client_id:'chat',resource:f.params.resource,refresh_token:token,...changes});
 error(()=>refresh(first.refresh_token,{client_id:'other'}),'invalid_grant');assert.ok(f.auth.resolve(first.access_token));
 const second=refresh(first.refresh_token);assert.notEqual(second.access_token,first.access_token);assert.notEqual(second.refresh_token,first.refresh_token);
 assert.equal(f.auth.resolve(first.access_token),null);assert.equal(f.auth.resolve(second.access_token).grantId,original.grantId);
 error(()=>refresh(first.refresh_token),'invalid_grant');assert.equal(f.auth.resolve(second.access_token),null,'reused refresh invalidates grant family');error(()=>refresh(second.refresh_token),'invalid_grant');
 const fresh=f.exchange(f.grant('markus',{scope:'studio:read'}).code);assert.deepEqual(f.auth.resolve(fresh.access_token).scopes,['studio:read']);
 error(()=>refresh(fresh.refresh_token,{scope:'studio:read studio:code'}),'invalid_scope');assert.ok(f.auth.resolve(fresh.access_token));
 f.advance(30*86400000);assert.equal(f.auth.resolve(fresh.access_token),null);error(()=>refresh(fresh.refresh_token),'invalid_grant');
});

test('removing member or client invalidates access, and outstanding consent is revalidated',t=>{
 const f=fixture(t),first=f.exchange(f.grant().code);
 const changed=createPluginAuth({db:f.db,issuer:f.issuer,clients:[]});assert.equal(changed.resolve(first.access_token),null);
 f.db.prepare('DELETE FROM members WHERE id=?').run('marco');assert.equal(f.auth.resolve(first.access_token),null);
 const tampered={...f.auth.validateAuthorization(f.params),resource:'https://wrong.invalid/mcp'};error(()=>f.auth.authorize(tampered,'markus'),'invalid_request');
});

test('stored grants remain bound to their original resource after an issuer configuration change',t=>{
 const f=fixture(t),issued=f.grant(),tokens=f.exchange(f.grant().code),otherIssuer='https://new.fixture.invalid';
 const changed=createPluginAuth({db:f.db,issuer:otherIssuer,clients:[{id:'chat',name:'Same client',redirectUris:[f.redirect]}]});
 error(()=>changed.exchange({grant_type:'authorization_code',client_id:'chat',redirect_uri:f.redirect,code:issued.code,code_verifier:'a'.repeat(64),resource:otherIssuer+'/mcp'}),'invalid_grant');
 error(()=>changed.exchange({grant_type:'refresh_token',client_id:'chat',refresh_token:tokens.refresh_token,resource:otherIssuer+'/mcp'}),'invalid_grant');
 assert.ok(f.auth.resolve(tokens.access_token));assert.equal(changed.resolve(tokens.access_token),null);
});
