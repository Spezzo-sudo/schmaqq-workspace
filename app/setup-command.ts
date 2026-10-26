/** Parse a command into arguments without invoking a shell. Legacy arrays remain accepted. */
export function parseCommand(value:string):string[]{
 const text=value.trim();if(!text)throw Error('Bitte einen Befehl eingeben.');
 if(text.startsWith('[')){
  let result;try{result=JSON.parse(text);}catch{throw Error('Die Argumentliste ist ungültig.');}
  if(!Array.isArray(result)||!result.length||!result.every(x=>typeof x==='string'&&x.length>0))throw Error('Die Argumentliste benötigt einen Programmnamen.');
  return result;
 }
 const args:string[]=[];let token='',quote='',started=false;
 for(const c of text){
  if(quote){if(c===quote)quote='';else token+=c;started=true;}
  else if(c==='"'||c==="'"){quote=c;started=true;}
  else if(/\s/.test(c)){if(started){args.push(token);token='';started=false;}}
  else{if(/[|&;<>`]/.test(c))throw Error('Bitte einen einzelnen Befehl ohne Shell-Verknüpfungen eingeben.');token+=c;started=true;}
 }
 if(quote)throw Error('Ein Anführungszeichen ist noch offen.');
 if(started)args.push(token);if(!args.length||!args[0])throw Error('Ein Programmname fehlt.');return args;
}
