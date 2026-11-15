// "Startklar" is proven, not believed: a Werkstatt is ready for a project once it has a
// test command and a trial run (tests, and the preview build if configured) passed on the
// shared main state. Computed on the server, the same for everyone who sees the Werkstatt.
export function lastProbe(db,device,project){
 const j=db.prepare("SELECT id,status,created,result FROM jobs WHERE device=? AND project=? AND action='probe' ORDER BY created DESC,rowid DESC LIMIT 1").get(device,project);
 if(!j)return null;
 let result={};try{result=JSON.parse(j.result??'{}')??{};}catch{}
 const state=j.status==='completed'&&result.ready===true?'ok':['queued','running','cancelling'].includes(j.status)?'running':'failed';
 return {id:j.id,state,at:j.created,...(state==='failed'?{error:typeof result.error==='string'?result.error.slice(0,1800):'Der Probelauf wurde abgebrochen.'}:{})};
}
export function workshopReadiness(db,device,entry){
 const probe=lastProbe(db,device,entry.id);
 if(!entry.check)return {ready:false,probe,missing:'Für diese Werkstatt ist noch kein Testbefehl eingerichtet.'};
 if(!probe)return {ready:false,probe,missing:'Noch kein Probelauf: Studio hat Tests und Vorschau hier noch nie ausprobiert.'};
 if(probe.state==='running')return {ready:false,probe,missing:'Der Probelauf läuft gerade.'};
 if(probe.state==='failed')return {ready:false,probe,missing:'Der letzte Probelauf ist fehlgeschlagen: '+probe.error};
 return {ready:true,probe,missing:''};
}
