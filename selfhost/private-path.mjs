import {execFileSync} from 'node:child_process';
import {chmodSync, lstatSync} from 'node:fs';
import path from 'node:path';

// NTFS mode bits do not describe the DACL. Never treat chmod(0600) as a
// confidentiality check on Windows. Names are avoided so this works on
// localized Windows installations; SYSTEM/Administrators remain trusted.
function windowsAcl(location, protect = false) {
  const script = `
$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$p=$env:SCHMAQQ_PRIVATE_PATH
$me=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
$item=Get-Item -LiteralPath $p -Force
if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Linked path refused'}
$acl=Get-Acl -LiteralPath $p
if($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $me.Value){throw 'Current-user ownership required'}
if($env:SCHMAQQ_PROTECT_NEW_PATH -eq '1'){
  if($item.PSIsContainer){$acl=New-Object System.Security.AccessControl.DirectorySecurity}
  else{$acl=New-Object System.Security.AccessControl.FileSecurity}
  $acl.SetOwner($me)
  $acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @($me.Value,'S-1-5-18','S-1-5-32-544')){
    $identity=New-Object System.Security.Principal.SecurityIdentifier($sid)
    if($item.PSIsContainer){$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')}
    else{$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($identity,'FullControl','Allow')}
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $p -AclObject $acl
  $acl=Get-Acl -LiteralPath $p
}
$trusted=@($me.Value,'S-1-5-18','S-1-5-32-544','S-1-3-4')
$ownerAccess=$false
foreach($rule in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])){
  if($rule.AccessControlType -eq 'Allow'){
    if($rule.IdentityReference.Value -notin $trusted){throw 'Access granted to another principal'}
    if($rule.IdentityReference.Value -in @($me.Value,'S-1-3-4') -and ($rule.PropagationFlags -band [System.Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0){$ownerAccess=$true}
  }
}
if(-not $ownerAccess){throw 'Explicit current-user access required'}
`;
  const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    execFileSync(executable, ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: {...process.env, SCHMAQQ_PRIVATE_PATH:path.resolve(location), SCHMAQQ_PROTECT_NEW_PATH:protect?'1':'0'},
      windowsHide:true, timeout:15000, stdio:'pipe'
    });
  } catch { throw new Error('Private Windows DACL validation failed.'); }
}

export function assertPrivatePath(location) {
  const info = lstatSync(location);
  if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()) || (info.isFile() && info.nlink !== 1)) throw new Error('Private path must be a regular nonlinked file or directory.');
  if (process.platform === 'win32') windowsAcl(location);
  else if ((info.mode & 0o077) !== 0) throw new Error('Private POSIX permissions required.');
}

// Call only for newly created paths, never to silently repair existing data.
export function protectNewPrivatePath(location) {
  const info = lstatSync(location);
  if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()) || (info.isFile() && info.nlink !== 1)) throw new Error('Refusing to protect linked or special path.');
  if (process.platform === 'win32') {
    // Python 3.13+ can already create an owner-private DACL using OWNER RIGHTS.
    // Validate that DACL without rewriting security descriptors unnecessarily.
    try { assertPrivatePath(location); return; } catch {}
    windowsAcl(location, true);
  }
  else chmodSync(location, info.isDirectory()?0o700:0o600);
  assertPrivatePath(location);
}
