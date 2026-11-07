export function sourceEvidence(value){
 if(!value||!Number.isSafeInteger(value.observedAt)||value.observedAt<0)return null;
 const revision=typeof value.revision==='string'&&/^[a-f0-9]{64}$/.test(value.revision)?value.revision:null;
 return {revision,observedAt:value.observedAt};
}
