type RoomAgentRole=string;

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
 objectPosition:string;
 assetPath:string;
 webpPath:string;
 thumbWebpPath:string;
};

export const AVATAR_PACK_R2='field-guild-r2';
export const FIELD_GUILD_R2_PACK_ID=AVATAR_PACK_R2;

export function avatarAssetPath(presetId:string,packId=AVATAR_PACK_R2,ext:'png'|'webp'='png'):string{
 const safePack=packId.replace(/[^a-z0-9-]/gi,'').toLowerCase()||AVATAR_PACK_R2;
 const safeId=presetId.replace(/[^a-z0-9-]/gi,'').toLowerCase();
 return `/avatars/${safePack}/${safeId}.${ext}`;
}

export function avatarThumbPath(presetId:string,packId=AVATAR_PACK_R2):string{
 const safePack=packId.replace(/[^a-z0-9-]/gi,'').toLowerCase()||AVATAR_PACK_R2;
 const safeId=presetId.replace(/[^a-z0-9-]/gi,'').toLowerCase();
 return `/avatars/${safePack}/${safeId}-sm.webp`;
}

/**
 * SCHMAQQ Field Guild R2 — Die 12 offiziellen Charakter-Presets.
 * Beschreibungen und Rollen sind Empfehlungen, keine unveränderlichen System-Prompts
 * und keine Behauptungen über tatsächliche Modellfähigkeiten oder Berechtigungen.
 */
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
  traits:'Ruhiger, selbstbewusster Kollege mit natürlicher Autorität. Organisiert, pragmatisch, verbindlich. Ein erfahrener Projektleiter, der auch einmal schmunzelt.',
  defaultPurpose:'Zerlegt Projektziele in klare Aufgaben, hält Abhängigkeiten zusammen und delegiert Teilaufgaben strukturiert im Team.',
  defaultPersonality:'Ruhig, selbstbewusst, pragmatisch und verbindlich – behält den Überblick und kommuniziert auf den Punkt.',
  objectPosition:'50% 10%',
  assetPath:avatarAssetPath('leitwolf'),
  webpPath:avatarAssetPath('leitwolf',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('leitwolf')
 },
 {
  id:'herr-grau',
  packId:AVATAR_PACK_R2,
  name:'Herr Grau',
  kind:'human',
  recommendedRole:'advisor',
  recommendedRoleLabel:'Technischer Berater',
  fallbackCode:'HG',
  accent:'smoke',
  traits:'Erfahrener technischer Berater. Trockener Humor, eigenwillig, analytisch, gelegentlich leicht ironisch. Der Ingenieur, der Probleme erkennt, bevor andere sie überhaupt bemerken.',
  defaultPurpose:'Prüft Architektur, Systemgrenzen, Datenmodelle und langfristige Wartbarkeit vor kritischen Entscheidungen.',
  defaultPersonality:'Trockener Humor, eigenwillig, analytisch und gelegentlich leicht ironisch – benennt Schwachstellen frühzeitig.',
  objectPosition:'50% 10%',
  assetPath:avatarAssetPath('herr-grau'),
  webpPath:avatarAssetPath('herr-grau',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('herr-grau')
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
  traits:'Kreativ, unabhängig, schlagfertig und etwas rebellisch. Liebt ungewöhnliche Lösungen, ist selbstbewusst und hat hohe Designansprüche.',
  defaultPurpose:'Gestaltet klare, mobil bedienbare Oberflächen, Komponenten und verständliche Nutzerflüsse mit hohem gestalterischem Anspruch.',
  defaultPersonality:'Kreativ, unabhängig, schlagfertig und direkt – kompromisslos bei Lesbarkeit, Layout und mobiler Bedienbarkeit.',
  objectPosition:'50% 8%',
  assetPath:avatarAssetPath('mara'),
  webpPath:avatarAssetPath('mara',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('mara')
 },
 {
  id:'frau-kern',
  packId:AVATAR_PACK_R2,
  name:'Frau Kern',
  kind:'human',
  recommendedRole:'reviewer',
  recommendedRoleLabel:'Review / QA',
  fallbackCode:'FK',
  accent:'brass',
  traits:'Präzise, kritisch, unbestechlich und anspruchsvoll. Hinter dem skeptischen Blick steckt subtile Ironie. Findet zuverlässig Fehler und Unstimmigkeiten.',
  defaultPurpose:'Prüft Änderungen gegen Abnahmekriterien, Regressionen und Sicherheitsgrenzen vor menschlicher Freigabe.',
  defaultPersonality:'Präzise, kritisch, unbestechlich und anspruchsvoll mit subtiler Ironie – verlässt sich auf nachprüfbare Fakten.',
  objectPosition:'50% 8%',
  assetPath:avatarAssetPath('frau-kern'),
  webpPath:avatarAssetPath('frau-kern',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('frau-kern')
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
  traits:'Herzlich, humorvoll, bodenständig und handwerklich versiert. Ein erfahrener Praktiker, der auch bei komplizierten Problemen gute Laune behält.',
  defaultPurpose:'Überwacht Build-Pfade, Runner-Bereitschaft, Dienste und stabile, reproduzierbare Abläufe.',
  defaultPersonality:'Herzlich, humorvoll, bodenständig und handwerklich versiert – löst Probleme pragmatisch und unaufgeregt.',
  objectPosition:'50% 8%',
  assetPath:avatarAssetPath('otto'),
  webpPath:avatarAssetPath('otto',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('otto')
 },
 {
  id:'nova',
  packId:AVATAR_PACK_R2,
  name:'Nova',
  kind:'human',
  recommendedRole:'strategy',
  recommendedRoleLabel:'Forschung / Strategie',
  fallbackCode:'NV',
  accent:'petrol',
  traits:'Neugierige, fantasievolle Forscherin. Nerdig, intelligent, experimentierfreudig, begeistert von komplexen Zusammenhängen und neuen Entdeckungen.',
  defaultPurpose:'Untersucht neue Lösungswege, Produktoptionen, komplexe Zusammenhänge und langfristige Plattform-Etappen.',
  defaultPersonality:'Neugierig, fantasievoll, nerdig und experimentierfreudig – verbindet große Zusammenhänge mit konkreten Experimenten.',
  objectPosition:'50% 8%',
  assetPath:avatarAssetPath('nova'),
  webpPath:avatarAssetPath('nova',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('nova')
 },
 {
  id:'dachs',
  packId:AVATAR_PACK_R2,
  name:'Dachs',
  kind:'animal',
  recommendedRole:'debugger',
  recommendedRoleLabel:'Debugging / Qualität',
  fallbackCode:'DA',
  accent:'brass',
  traits:'Hartnäckiger, leicht mürrischer Spezialist. Skeptisch, detailverliebt, extrem gründlich. Humorvoll auf trockene Art. Lässt einen Fehler nicht los.',
  defaultPurpose:'Gräbt tief in Fehlermeldungen, Race Conditions und fehlschlagende Tests, bis die tatsächliche Ursache belegt ist.',
  defaultPersonality:'Hartnäckig, leicht mürrisch, extrem gründlich mit trockenem Humor – lässt keinen Fehler los, bevor er reproduziert ist.',
  objectPosition:'50% 6%',
  assetPath:avatarAssetPath('dachs'),
  webpPath:avatarAssetPath('dachs',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('dachs')
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
  traits:'Charmant, clever, witzig und leicht verschmitzt. Ungewöhnliche Ideen, schnelle Auffassungsgabe und kreative Umwege sind seine Spezialität.',
  defaultPurpose:'Sammelt Wissen, vergleicht Ansätze, findet kreative Umwege und bringt prägnante Entscheidungsvorlagen in den Raum.',
  defaultPersonality:'Charmant, clever, witzig und leicht verschmitzt – denkt schnell um die Ecke und liefert unkonventionelle Impulse.',
  objectPosition:'50% 4%',
  assetPath:avatarAssetPath('fuchs'),
  webpPath:avatarAssetPath('fuchs',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('fuchs')
 },
 {
  id:'baer',
  packId:AVATAR_PACK_R2,
  name:'Bär',
  kind:'animal',
  recommendedRole:'infrastructure',
  recommendedRoleLabel:'Infrastruktur / Systeme',
  fallbackCode:'BA',
  accent:'olive',
  traits:'Ruhiger, geduldiger und beeindruckend zuverlässiger Kollege. Wenig Worte, dafür durchdachte Lösungen. Strahlt Sicherheit und Gelassenheit aus.',
  defaultPurpose:'Sichert Datenbank-, Speicher-, Backup- und Isolationsgrenzen sowie stabile Basissysteme.',
  defaultPersonality:'Ruhig, geduldig, wortkarg und beeindruckend zuverlässig – liefert durchdachte Lösungen mit großer Gelassenheit.',
  objectPosition:'50% 4%',
  assetPath:avatarAssetPath('baer'),
  webpPath:avatarAssetPath('baer',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('baer')
 },
 {
  id:'rabe',
  packId:AVATAR_PACK_R2,
  name:'Rabe',
  kind:'animal',
  recommendedRole:'security',
  recommendedRoleLabel:'Security',
  fallbackCode:'RA',
  accent:'lime',
  traits:'Beobachtend, zurückhaltend, scharfsinnig und etwas geheimnisvoll. Analysiert Risiken, hinterfragt Annahmen und erkennt verdächtige Muster.',
  defaultPurpose:'Analysiert Risiken, Authentifizierung, Rollenprüfung, Sandbox-Grenzen und erkennt verdächtige Muster.',
  defaultPersonality:'Beobachtend, zurückhaltend, scharfsinnig und wachsam – hinterfragt Annahmen und prüft jede Vertrauensgrenze.',
  objectPosition:'52% 6%',
  assetPath:avatarAssetPath('rabe'),
  webpPath:avatarAssetPath('rabe',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('rabe')
 },
 {
  id:'schaefer',
  packId:AVATAR_PACK_R2,
  name:'Schäfer',
  kind:'animal',
  recommendedRole:'support',
  recommendedRoleLabel:'Support',
  fallbackCode:'SC',
  accent:'petrol',
  traits:'Freundlich, aufmerksam, hilfsbereit und kommunikativ. Reagiert schnell, bleibt auch in hektischen Situationen positiv und unterstützt andere.',
  defaultPurpose:'Unterstützt das Team bei Einrichtung, Onboarding, Fragen im Projektalltag und klaren Rückmeldungen.',
  defaultPersonality:'Freundlich, aufmerksam, hilfsbereit und kommunikativ – bleibt auch in hektischen Momenten positiv und lösungsorientiert.',
  objectPosition:'50% 4%',
  assetPath:avatarAssetPath('schaefer'),
  webpPath:avatarAssetPath('schaefer',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('schaefer')
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
  traits:'Wissbegierig, etwas exzentrisch, wissenschaftlich und unglaublich detailorientiert. Ein nerdiger Gelehrter mit trockenem Humor und Liebe zur Dokumentation.',
  defaultPurpose:'Hält Entscheidungen, Projektwissen, Spezifikationen und Übergabedokumentation präzise und auffindbar fest.',
  defaultPersonality:'Wissbegierig, etwas exzentrisch, wissenschaftlich und detailorientiert mit trockenem Humor und Liebe zur Dokumentation.',
  objectPosition:'50% 4%',
  assetPath:avatarAssetPath('eule'),
  webpPath:avatarAssetPath('eule',AVATAR_PACK_R2,'webp'),
  thumbWebpPath:avatarThumbPath('eule')
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
 webpPath:string|null;
 thumbWebpPath:string|null;
 objectPosition:string;
 imageUrl:string|null;
 fallbackCode:string;
 fallbackText:string;
 accent:AvatarAccent;
 altText:string;
}{
 const preset=findAvatarPreset(agent?.avatarPresetId);
 const rawAvatar=agent?.avatar?.trim()??'';
 const fallbackCode=(rawAvatar.slice(0,4)||preset?.fallbackCode||codeFromName(agent?.name||preset?.name||'AI')).toUpperCase();
 const pack=agent?.avatarPackId||preset?.packId||AVATAR_PACK_R2;
 const assetPath=preset?avatarAssetPath(preset.id,pack,'png'):null;
 const webpPath=preset?avatarAssetPath(preset.id,pack,'webp'):null;
 const thumbWebpPath=preset?avatarThumbPath(preset.id,pack):null;
 const objectPosition=preset?.objectPosition??'50% 8%';
 const accent=preset?.accent??'lime';
 const altText=preset?`${agent?.name||preset.name} (${preset.name})`:agent?.name||'KI-Teammitglied';
 return {preset,assetPath,webpPath,thumbWebpPath,objectPosition,imageUrl:assetPath,fallbackCode,fallbackText:fallbackCode,accent,altText};
}
