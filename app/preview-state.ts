/** A built preview is a dated snapshot. Never call it current without matching evidence. */
export function previewState({status,changedAfter,freshness,dirty}:{status?:string;changedAfter?:boolean;freshness?:string;dirty:boolean}){
 if(dirty)return {tone:'warning',text:'Du hast ungespeicherte Änderungen. Die Vorschau zeigt sie noch nicht. Speichere zuerst und erstelle sie anschließend neu.'};
 if(!status)return {tone:'info',text:'Noch keine Vorschau erstellt. Baue den gespeicherten Stand, um ihn im Browser auszuprobieren.'};
 if(['queued','running','cancelling'].includes(status))return {tone:'info',text:'Die Vorschau wird auf dem Ausführungs-PC vorbereitet. Das Ergebnis erscheint hier.'};
 if(status!=='completed')return {tone:'warning',text:'Die letzte Vorschau wurde nicht erfolgreich erstellt. Sieh dir den Auftrag im Verlauf an.'};
 if(changedAfter||freshness==='changed')return {tone:'warning',text:'Diese Vorschau gehört zu einem früheren Projektstand. Erstelle sie bei Bedarf neu, um den aktuellen Stand zu sehen.'};
 if(freshness!=='same')return {tone:'warning',text:'Ob diese Vorschau zum aktuellen Dateistand passt, ist noch nicht bestätigt. Erstelle sie bei Bedarf neu.'};
 return {tone:'info',text:'Diese Vorschau passt zum zuletzt abgeglichenen Dateistand. Änderungen außerhalb von Studio können danach erfolgt sein.'};
}
