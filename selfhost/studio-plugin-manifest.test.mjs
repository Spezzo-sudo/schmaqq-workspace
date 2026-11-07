import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

test('portable plugin declares the planned OAuth endpoint and coding scopes without credentials or hooks',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../plugins/schmaqq-studio');
 const plugin=JSON.parse(readFileSync(path.join(root,'plugin.json'),'utf8'));
 const mcp=JSON.parse(readFileSync(path.join(root,'mcp.json'),'utf8'));
 assert.equal(plugin.$schema,'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
 assert.equal(plugin.name,'schmaqq-studio');
 assert.ok(existsSync(path.join(root,'skills/studio-project-work/SKILL.md')));
 assert.equal(mcp.$schema,'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
 const server=mcp.mcpServers['schmaqq-studio'];assert.equal(server.type,'streamable-http');
 const url=new URL(server.url);assert.equal(url.protocol,'https:');assert.equal(url.pathname,'/mcp');
 const auth=server.extensions['com.openai'].auth;
 assert.equal(auth.type,'oauth');assert.equal(auth.client.tokenEndpointAuthMethod,'none');
 assert.deepEqual(auth.baseScopes,['studio:read','studio:code']);
 assert.equal(new URL(auth.authorizationUrl).origin,url.origin);assert.equal(new URL(auth.tokenUrl).origin,url.origin);
 assert.ok(!JSON.stringify(mcp).includes('clientSecret'));assert.equal(plugin.extensions?.['com.openai']?.hooks,undefined);
 // This is a packaging contract check, not a live endpoint/directory approval.
});
