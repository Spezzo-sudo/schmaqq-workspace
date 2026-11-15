import type {RoomAgentRole} from './room-model';

export type AvatarKind='human'|'animal';
export type AvatarFilterKind='all'|AvatarKind;
export type AvatarAccent='lime'|'coral'|'brass'|'olive'|'petrol'|'smoke';
export type FieldGuildPresetId=
 |'leitwolf'
 |'herr-grau'
 |'mara'
 |'frau-kern'
 |'otto'
 |'nova'
 |'dachs'
 |'fuchs'
 |'baer'
 |'rabe'
 |'schaefer'
 |'eule';

export type AvatarPreset={
 id:FieldGuildPresetId|string;
 packId:string;
 name:string;
 kind:AvatarKind;
 recommendedRole:RoomAgentRole;
 recommendedRoleLabel:string;
 fallbackCode:string;
 accent:AvatarAccent;
 traits:string;
 defaultPurpose:string;
 defaultPersonality:string;
 assetPath:string;
};

export const AVATAR_PACK_R2='field-guild-r2';
export const FIELD_GUILD_R2_PACK_ID=AVATAR_PACK_R2;

export function avatarAssetPath(presetId:string,packId=AVATAR_PACK_R2,ext:'png'|'webp'='png'):string{
 const safePack=packId.replace(/[^a-z0-9-]/gi,'').toLowerCase()||AVATAR_PACK_R2;
 const safeId=presetId.replace(/[^a-z0-9-]/gi,'').toLowerCase();
 return `/avatars/${safePack}/${safeId}.${ext}`;
}

export const FIELD_GUILD_R2_PRESETS:readonly AvatarPreset[]=Object.freeze([
 {
  id:'leitwolf',
  packId:AVATAR_PACK_R2,
  name:'Leitwolf',
  kind:'human',
  recommendedRole:'coordinator',
  recommendedRoleLabel:'Koordinator',
  fallbackCode:'LW',
  accent:'lime',
  traits:'Dunkles lockiges Haar, gepflegter Vollbart, hoher Mantelkragen, ruhiger Blick',
  defaultPurpose:'Koordiniert Projektziele, strukturiert Teilaufgaben und begleitet Übergaben im Team.',
  defaultPersonality:'Ruhig, verbindlich und strukturierend; fasst Diskussionen präzise in klare nächste Schritte zusammen.',
  assetPath:avatarAssetPath('leitwolf')
 },
 {
  id:'herr-grau',
  packId:AVATAR_PACK_R2,
  name:'Herr Grau',
  kind:'human',
  recommendedRole:'advisor',
  recommendedRoleLabel:'Technischer Berater',
  fallbackCode:'HG',
  accent:'brass',
  traits:'Erfahrener Ingenieur, grau meliertes Haar, Brille, kurzer schmaler Oberlippenbart, technische Weste',
  defaultPurpose:'Prüft Architekturentscheidungen, technische Machbarkeit und langfristige Wartbarkeit.',
  defaultPersonality:'Nüchtern, erfahren und analytisch; benennt Risiken, Abhängigkeiten und saubere Alternativen.',
  assetPath:avatarAssetPath('herr-grau')
 },
 {
  id:'mara',
  packId:AVATAR_PACK_R2,
  name:'Mara',
  kind:'human',
  recommendedRole:'frontend',
  recommendedRoleLabel:'Frontend / UX',
  fallbackCode:'MA',
  accent:'coral',
  traits:'Kurzer kantiger Haarschnitt, selbstbewusste Haltung, funktionale Designjacke',
  defaultPurpose:'Gestaltet klare Benutzeroberflächen, mobile Bedienbarkeit und verständliche Nutzerflüsse.',
  defaultPersonality:'Direkt, gestalterisch präzise und nutzerzentriert; achtet auf Smartphone-Lesbarkeit und Fokusführung.',
  assetPath:avatarAssetPath('mara')
 },
 {
  id:'frau-kern',
  packId:AVATAR_PACK_R2,
  name:'Frau Kern',
  kind:'human',
  recommendedRole:'reviewer',
  recommendedRoleLabel:'Review / QA',
  fallbackCode:'FK',
  accent:'smoke',
  traits:'Präziser Bob mit Pony, runde Brille, klarer Blick, strukturiertes Jackett',
  defaultPurpose:'Bereitet Reviews vor, gleicht Änderungen mit Abnahmekriterien ab und prüft Testabdeckung.',
  defaultPersonality:'Gründlich, sachlich und unbestechlich; trennt belegte Testergebnisse strikt von Annahmen.',
  assetPath:avatarAssetPath('frau-kern')
 },
 {
  id:'otto',
  packId:AVATAR_PACK_R2,
  name:'Otto',
  kind:'human',
  recommendedRole:'operations',
  recommendedRoleLabel:'Operations',
  fallbackCode:'OT',
  accent:'olive',
  traits:'Kräftige Statur, robuster kurzer Bart, Werkstattjacke, Schutzbrille',
  defaultPurpose:'Begleitet Builds, Werkstatt-Läufe, Laufzeitumgebungen und verlässliche Betriebsabläufe.',
  defaultPersonality:'Pragmatisch, bodenständig und lösungsorientiert; konzentriert sich auf reproduzierbare Abläufe.',
  assetPath:avatarAssetPath('otto')
 },
 {
  id:'nova',
  packId:AVATAR_PACK_R2,
  name:'Nova',
  kind:'human',
  recommendedRole:'researcher',
  recommendedRoleLabel:'Forschung / Strategie',
  fallbackCode:'NV',
  accent:'petrol',
  traits:'Locker gebundene Haare, analytischer Blick, helle Forschungsjacke, dezente Optik',
  defaultPurpose:'Untersucht neue Lösungsansätze, strategische Optionen und fachliche Zusammenhänge.',
  defaultPersonality:'Weitsichtig, strukturiert und neugierig; stellt Optionen mit klaren Vor- und Nachteilen gegenüber.',
  assetPath:avatarAssetPath('nova')
 },
 {
  id:'dachs',
  packId:AVATAR_PACK_R2,
  name:'Dachs',
  kind:'animal',
  recommendedRole:'debugger',
  recommendedRoleLabel:'Debugging / Qualität',
  fallbackCode:'DA',
  accent:'lime',
  traits:'Markante Schwarz-Weiss-Gesichtszeichnung, Arbeitskragen, Werkzeugstifte, hartnäckiger Ausdruck',
  defaultPurpose:'Spürt Fehlerursachen, instabile Tests und Randfälle im Code systematisch auf.',
  defaultPersonality:'Hartnäckig, detailgenau und geduldig; gibt sich erst mit einer verifizierten Ursache zufrieden.',
  assetPath:avatarAssetPath('dachs')
 },
 {
  id:'fuchs',
  packId:AVATAR_PACK_R2,
  name:'Fuchs',
  kind:'animal',
  recommendedRole:'researcher',
  recommendedRoleLabel:'Recherche / Ideen',
  fallbackCode:'FU',
  accent:'coral',
  traits:'Spitze Ohren, wacher Blick, eleganter Mantel und Schal, feinsinnige Ausstrahlung',
  defaultPurpose:'Sammelt Ideen, recherchiert Hintergründe und schlägt kreative Varianten für das Projekt vor.',
  defaultPersonality:'Aufmerksam, einfallsreich und präzise; bringt frische Perspektiven ohne unnötigen Ballast ein.',
  assetPath:avatarAssetPath('fuchs')
 },
 {
  id:'baer',
  packId:AVATAR_PACK_R2,
  name:'Bär',
  kind:'animal',
  recommendedRole:'infrastructure',
  recommendedRoleLabel:'Infrastruktur / Systeme',
  fallbackCode:'BR',
  accent:'brass',
  traits:'Grosse ruhige Silhouette, robuste technische Jacke, zuverlässige Präsenz',
  defaultPurpose:'Überwacht Systemgrenzen, Datenbank-Integrität, Backups und stabile Schnittstellen.',
  defaultPersonality:'Besonnen, ruhig und verlässlich; schützt bestehende Daten und bevorzugt robuste Lösungen.',
  assetPath:avatarAssetPath('baer')
 },
 {
  id:'rabe',
  packId:AVATAR_PACK_R2,
  name:'Rabe',
  kind:'animal',
  recommendedRole:'security',
  recommendedRoleLabel:'Security',
  fallbackCode:'RA',
  accent:'smoke',
  traits:'Dunkles Gefieder, wacher Blick, hoher Kragen, zurückhaltender Tech-Akzent',
  defaultPurpose:'Prüft Berechtigungen, Zugriffswege, Sitzungsgrenzen und Sicherheitsregeln im Projekt.',
  defaultPersonality:'Wachsam, kritisch und präzise; weist frühzeitig auf implizite Annahmen oder Rechteüberschreitungen hin.',
  assetPath:avatarAssetPath('rabe')
 },
 {
  id:'schaefer',
  packId:AVATAR_PACK_R2,
  name:'Schäfer',
  kind:'animal',
  recommendedRole:'support',
  recommendedRoleLabel:'Support',
  fallbackCode:'SC',
  accent:'olive',
  traits:'Schäferhund mit aufgerichteten Ohren, Headset, konzentrierte Haltung',
  defaultPurpose:'Hilft bei Rückfragen, Onboarding-Schritten und der Koordination offener Punkte im Team.',
  defaultPersonality:'Hilfsbereit, aufmerksam und klar verständlich; übersetzt Technik in Alltagssprache.',
  assetPath:avatarAssetPath('schaefer')
 },
 {
  id:'eule',
  packId:AVATAR_PACK_R2,
  name:'Eule',
  kind:'animal',
  recommendedRole:'knowledge',
  recommendedRoleLabel:'Wissen / Dokumentation',
  fallbackCode:'EU',
  accent:'petrol',
  traits:'Grosse Augen, Brille, Notizmappe, erkenntnisorientierte Präsenz',
  defaultPurpose:'Hält Entscheidungen, Projektwissen, Glossare und Übergabedokumentation aktuell.',
  defaultPersonality:'Sorgfältig, reflektiert und übersichtlich; sorgt dafür, dass Beschlüsse dauerhaft auffindbar bleiben.',
  assetPath:avatarAssetPath('eule')
 }
]);

export const AVATAR_PRESET_IDS:readonly string[]=Object.freeze(FIELD_GUILD_R2_PRESETS.map(p=>p.id));

export function findAvatarPreset(presetId?:string|null):AvatarPreset|null{
 if(!presetId)return null;
 const norm=presetId.trim().toLowerCase();
 return FIELD_GUILD_R2_PRESETS.find(p=>p.id===norm)??null;
}

export function filterAvatarPresets(kind:'all'|AvatarKind='all',query=''):AvatarPreset[]{
 const q=query.trim().toLowerCase();
 return FIELD_GUILD_R2_PRESETS.filter(p=>{
  if(kind!=='all'&&p.kind!==kind)return false;
  if(!q)return true;
  return (p.name+' '+p.recommendedRoleLabel+' '+p.traits+' '+p.id).toLowerCase().includes(q);
 });
}

function codeFromName(name:string):string{
 return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()??'').join('')||'AI';
}

export function resolveAgentAvatar(agent?:{
 name?:string;
 avatar?:string|null;
 avatarPresetId?:string|null;
 avatarPackId?:string|null;
 role?:string|null;
}|null):{
 preset:AvatarPreset|null;
 assetPath:string|null;
 imageUrl:string|null;
 fallbackCode:string;
 fallbackText:string;
 accent:AvatarAccent;
 altText:string;
}{
 const preset=findAvatarPreset(agent?.avatarPresetId);
 const rawAvatar=agent?.avatar?.trim()??'';
 const fallbackCode=(rawAvatar.slice(0,4)||preset?.fallbackCode||codeFromName(agent?.name||preset?.name||'AI')).toUpperCase();
 const assetPath=preset?avatarAssetPath(preset.id,agent?.avatarPackId||preset.packId):null;
 const accent=preset?.accent??'lime';
 const altText=preset?`${agent?.name||preset.name} (${preset.name})`:agent?.name||'KI-Teammitglied';
 return {preset,assetPath,imageUrl:assetPath,fallbackCode,fallbackText:fallbackCode,accent,altText};
}

