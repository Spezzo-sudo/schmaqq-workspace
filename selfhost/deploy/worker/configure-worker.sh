#!/bin/bash
# First-time configuration of the installed server worker. Root only.
# Registers the worker as a device of the Studio owner, writes the root-owned
# runner configuration (token never printed) and creates a self-contained pilot
# repository with a local origin, so no GitHub credential is placed on the server.
# Usage: configure-worker.sh PILOT_PROJECT_ID
set -euo pipefail
PROJECT="$1"
[[ "$PROJECT" =~ ^[A-Za-z0-9_-]{1,100}$ ]] || { echo "Invalid project id" >&2; exit 1; }
CONFIG_DIR=/etc/schmaqq-worker
CONFIG=$CONFIG_DIR/runner.json
DATA=/var/lib/schmaqq-worker
LIB=/usr/local/lib/schmaqq-worker
NODE=$LIB/node/bin/node
[ ! -e "$CONFIG" ] || { echo "Worker already configured: $CONFIG" >&2; exit 1; }

# Pilot repository: origin is a local bare repository on the worker volume.
sudo -u schmaqq-worker -H env HOME="$DATA" PATH="$LIB/node/bin:/usr/bin:/bin" bash -euo pipefail -c '
 cd "$HOME/repos"
 git config --global user.name "SCHMAQQ VPS-Worker"
 git config --global user.email "worker@schmaqq.invalid"
 git config --global init.defaultBranch main
 rm -rf pilot.seed pilot-origin.git pilot
 mkdir pilot.seed && cd pilot.seed && git init -q
 mkdir -p test
 printf "%s\n" "{\"name\":\"schmaqq-worker-pilot\",\"private\":true,\"type\":\"module\"}" > package.json
 printf "%s\n" "<!doctype html><html lang=\"de\"><meta charset=\"utf-8\"><title>SCHMAQQ Worker-Pilot</title><h1>Gebaut auf dem SCHMAQQ-Server-Worker</h1></html>" > index.html
 printf "%s\n" "import {mkdirSync,copyFileSync} from \"node:fs\";mkdirSync(\"dist\",{recursive:true});copyFileSync(\"index.html\",\"dist/index.html\");" > build.mjs
 printf "%s\n" "import test from \"node:test\";import assert from \"node:assert/strict\";import {readFileSync} from \"node:fs\";" "test(\"page has a title\",()=>assert.match(readFileSync(\"index.html\",\"utf8\"),/<title>.+<\\/title>/));" > test/site.test.mjs
 printf "%s\n" "dist/" > .gitignore
 git add -A && git commit -q -m "Worker-Pilot: erste Seite mit Test"
 cd .. && git clone -q --bare pilot.seed pilot-origin.git && git clone -q pilot-origin.git pilot && rm -rf pilot.seed
'

# Device registration in the Studio database (as the Studio service account).
REG=$(cd /opt/schmaqq-studio/current && sudo -u schmaqq-studio env STUDIO_DATA_DIR=/var/lib/schmaqq-studio "$NODE" selfhost/deploy/worker/register-worker.mjs "SCHMAQQ-VPS Server-Worker")
install -d -m 750 -o root -g schmaqq-worker "$CONFIG_DIR"
umask 027
printf '%s' "$REG" | PROJECT="$PROJECT" "$NODE" -e '
 let input="";process.stdin.on("data",d=>input+=d).on("end",()=>{
  const {token}=JSON.parse(input);
  const config={server:"https://studio.schmaqq.com",token,kind:"server",label:"SCHMAQQ-VPS",stateDir:"/var/lib/schmaqq-worker/state",
   projects:{[process.env.PROJECT]:{repo:"/var/lib/schmaqq-worker/repos/pilot",base:"main",check:["node","--test"],publish:false,workflow:"direct",allowCodex:false,preview:{build:["node","build.mjs"],directory:"dist"}}}};
  require("node:fs").writeFileSync("/etc/schmaqq-worker/runner.json",JSON.stringify(config,null,1),{mode:0o640});
 });'
chown root:schmaqq-worker "$CONFIG"; chmod 640 "$CONFIG"
printf '%s' "$REG" | "$NODE" -e 'let i="";process.stdin.on("data",d=>i+=d).on("end",()=>console.log("Registered device "+JSON.parse(i).device))'
