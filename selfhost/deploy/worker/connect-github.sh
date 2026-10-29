#!/bin/bash
# Connect one Studio project on the server worker to its GitHub repository with a
# deploy key that belongs to that one repository only. No extra GitHub account,
# token or paid service: the key is added in the existing repository under
# Settings -> Deploy keys. The private key stays on the worker volume (jobs cannot
# see it). Git uses SSH on port 443 through the allowlist egress proxy, and
# GitHub's host key is pinned to the published fingerprint.
#
#   connect-github.sh key   <project-id>
#       Creates the key (once) and prints the public key to add as deploy key.
#   connect-github.sh clone <project-id> <owner/repo> [base-branch] [check-json] [publish]
#       Clones the repository for the worker and registers the project in runner.json.
#       check-json defaults to ["npm","test"]; publish (true|false) allows pushing
#       task branches for pull requests and needs a deploy key with write access.
set -euo pipefail
ACTION=${1:-}; PROJECT=${2:-}
[[ "$PROJECT" =~ ^[A-Za-z0-9_-]{1,100}$ ]] || { echo "Usage: connect-github.sh key|clone <project-id> ..." >&2; exit 1; }
WORKER=schmaqq-worker; DATA=/var/lib/schmaqq-worker; LIB=/usr/local/lib/schmaqq-worker; NODE=$LIB/node/bin/node
KEYDIR=$DATA/keys/$PROJECT; KEY=$KEYDIR/id_ed25519; DEPLOY=$LIB/current/selfhost/deploy/worker
SSHCMD="ssh -i $KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$DEPLOY/github_known_hosts -o HostKeyAlias=github.com -o HostName=ssh.github.com -o Port=443 -o ProxyCommand=\"$NODE $DEPLOY/ssh-connect-proxy.mjs %h %p\""

case "$ACTION" in
 key)
  install -d -o "$WORKER" -g "$WORKER" -m 700 "$DATA/keys" "$KEYDIR"
  [ -f "$KEY" ] || sudo -u "$WORKER" ssh-keygen -q -t ed25519 -N '' -C "schmaqq-worker $PROJECT" -f "$KEY"
  echo "Add this public key in the repository: Settings -> Deploy keys -> Add deploy key"
  echo "(tick 'Allow write access' only if the worker should push task branches):"
  echo; cat "$KEY.pub"
  ;;
 clone)
  REPO=${3:-}; BASE=${4:-main}; CHECK=${5:-'["npm","test"]'}; PUBLISH=${6:-false}
  [[ "$REPO" =~ ^[A-Za-z0-9-]{1,39}/[A-Za-z0-9_.-]{1,100}$ ]] || { echo "Repository must be owner/name." >&2; exit 1; }
  [[ "$BASE" =~ ^[A-Za-z0-9._/-]{1,100}$ && "$BASE" != -* ]] || { echo "Invalid base branch." >&2; exit 1; }
  [[ "$PUBLISH" == true || "$PUBLISH" == false ]] || { echo "publish must be true or false." >&2; exit 1; }
  [ -f "$KEY" ] || { echo "Run 'connect-github.sh key $PROJECT' first." >&2; exit 1; }
  DEST=$DATA/repos/$PROJECT
  [ ! -e "$DEST" ] || { echo "Repository folder exists already: $DEST" >&2; exit 1; }
  sudo -u "$WORKER" env HOME="$DATA" HTTPS_PROXY=http://127.0.0.60:3128 GIT_SSH_COMMAND="$SSHCMD" \
   git clone --quiet --branch "$BASE" "git@github.com:$REPO" "$DEST"
  # Every later git command of the runner in this repository and its copies uses the same key.
  sudo -u "$WORKER" git -C "$DEST" config core.sshCommand "$SSHCMD"
  PROJECT="$PROJECT" DEST="$DEST" BASE="$BASE" CHECK="$CHECK" PUBLISH="$PUBLISH" "$NODE" -e '
   const fs=require("node:fs"),f="/etc/schmaqq-worker/runner.json",c=JSON.parse(fs.readFileSync(f,"utf8"));
   const check=JSON.parse(process.env.CHECK);
   if(!Array.isArray(check)||!check.length||!check.every(x=>typeof x==="string"))throw new Error("check must be a JSON array of strings");
   c.projects={...c.projects,[process.env.PROJECT]:{repo:process.env.DEST,base:process.env.BASE,check,publish:process.env.PUBLISH==="true",workflow:"pull-request",allowCodex:false}};
   fs.writeFileSync(f,JSON.stringify(c,null,1),{mode:0o640});'
  chown root:"$WORKER" /etc/schmaqq-worker/runner.json; chmod 640 /etc/schmaqq-worker/runner.json
  systemctl restart schmaqq-studio-worker
  echo "Project $PROJECT connected to $REPO ($BASE) on the server worker."
  ;;
 *) echo "Usage: connect-github.sh key|clone <project-id> ..." >&2; exit 1;;
esac
