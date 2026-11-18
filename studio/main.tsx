import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudioApp from './ui/app';
import {Login,readResetToken} from './ui/login';
import './ui/ui.css';

// The Studio app: signed in it is the app from docs/OBERFLAECHE.md, otherwise the sign-in. Nothing else.
const resetToken=readResetToken();
type User={userId:string;displayName:string;email:string};

function App(){
 const [user,setUser]=useState<User|null>(null),[pending,setPending]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  fetch('/api/auth/session').then(async r=>{
   if(r.ok){const {user}=await r.json() as {user:{id:string;name:string;email:string}};setUser({userId:user.id,displayName:user.name,email:user.email});}
   else if(r.status!==401)throw new Error();
  }).catch(()=>setError('Studio ist gerade nicht erreichbar. Bitte die Seite neu laden.')).finally(()=>setPending(false));
 },[]);
 if(pending)return <main className="ui-loading" role="status">Studio wird geladen …</main>;
 if(error)return <main className="ui-loading" role="alert">{error}</main>;
 return user&&!resetToken?<StudioApp user={user}/>:<Login resetToken={resetToken}/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
