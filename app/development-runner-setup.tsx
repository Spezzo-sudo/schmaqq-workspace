'use client';

import type { FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Project, LocalProfile } from './development-model';
type RunnerSetupProps = {
  profile: LocalProfile | null;
  profileProject: LocalProfile['projects'][string] | undefined;
  project: string;
  projects: Project[];
  pending: boolean;
  config: string;
  onImportProfile: (file: File | undefined) => Promise<void>;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDownload: () => void;
  onClose: () => void;
};

/**
 * Local runner setup is a separate view, never a background registration.
 * Runner token is shown only inside the actively opened setup panel.
 */
export default function RunnerSetupPanel({
  profile,
  profileProject,
  project,
  projects,
  pending,
  config,
  onImportProfile,
  onRegister,
  onDownload,
  onClose
}: RunnerSetupProps) {
  return <section className="panel runner-setup"><h2>Deinen PC verbinden</h2><p>Der Runner verbindet sich ausgehend mit eurem Studio. Nur hier lokal freigegebene Repositories und Befehle werden verwendet.</p><label>Vorbereitetes Projektprofil laden<input aria-label="Lokales Projektprofil" type="file" accept=".json,application/json" onChange={e => onImportProfile(e.target.files?.[0])} /></label>{profile && <p className="muted">Profil lokal geladen. Prüfe die Repository- und Befehlsangaben vor dem Verbinden.</p>}<form key={profileProject?.repo ?? 'manual'} onSubmit={onRegister}><div className="form-row"><label>Name deines PCs<input name="name" required maxLength={160} placeholder="Marcos PC" /></label><label>Projekt<select name="project" defaultValue={project}>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label></div><label>Bestehende lokale Git-Arbeitskopie<input name="repo" defaultValue={profileProject?.repo ?? ''} required placeholder="C:\Projekte\schmaqq oder /home/markus/projekte/schmaqq" /></label><div className="form-row"><label>Gemeinsamer Hauptzweig<input name="base" defaultValue={profileProject?.base ?? 'main'} required /></label><label>Testbefehl als Argumentliste<input name="check" defaultValue={JSON.stringify(profileProject?.check ?? ['node', '--test'])} required /></label></div><button className="button primary" disabled={pending}>Runner-Zugang erstellen <ArrowRight size={15} /></button></form>{config && <div className="runner-secret"><h3>Einmalige lokale Konfiguration</h3><p>Enthält deinen Gerätezugang. Auf deinem PC speichern und weder in Git noch im Team-Chat teilen.</p><button className="button" onClick={onDownload}>Konfiguration herunterladen</button><pre>node selfhost/runner.mjs PFAD_ZUR_KONFIGURATION</pre><p>Ohne vorbereitetes Profil ist Codex anfangs deaktiviert. Nach eigener Anmeldung mit <code>codex login</code> kannst du für dieses lokale Projekt <code>allowCodex: true</code> setzen. Vorschauen werden ebenfalls lokal konfiguriert.</p><button className="text-button" onClick={onClose}>Konfiguration gesichert · schließen</button></div>}</section>;
}
