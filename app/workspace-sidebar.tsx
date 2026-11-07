'use client';

import type { RefObject } from 'react';
import { LayoutDashboard, FolderKanban, CheckCheck, MessagesSquare, FileText, Users, GitBranch, Sparkles, Plus, ChevronDown, Globe, ArrowUpRight, LogOut, X, Wrench, CircleHelp } from 'lucide-react';
import StudioBrand from './studio-brand';
import { hasDrafts, clearDrafts } from './editor-drafts';
import { initials, short } from './workspace-model';
import { activeNav, navGroups, navDescriptions } from './navigation';
import type { Project } from './workspace-model';
import type { ChatGPTUser } from './chatgpt-auth';
export const workspaceNav = [['overview', 'Start', LayoutDashboard], ['projects', 'Projekte', FolderKanban], ['tasks', 'Aufgaben', CheckCheck], ['chat', 'Team-Chat', MessagesSquare], ['docs', 'Wissen', FileText], ['team', 'Team', Users], ['development', 'Weitere Werkzeuge', GitBranch], ['settings', 'Einrichtung & Verbindungen', Wrench], ['help', 'So funktioniert Studio', CircleHelp], ['setup', 'PC & Projekt einrichten', Wrench], ['models', 'Verbindungen', Sparkles], ['ai', 'KI-Arbeitsplatz', Sparkles]] as const;
type SidebarProps = {
  sidebarRef: RefObject<HTMLElement | null>;
  modalOpen: boolean;
  mobile: boolean;
  demoMode: boolean;
  selfHosted: boolean;
  view: string;
  selectedProject: string;
  activeCount: number;
  projects: Project[];
  user: ChatGPTUser;
  hasComments: boolean;
  onNavigate: (view: string) => void;
  onCloseMobile: () => void;
  onCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onError: (message: string) => void;
};

/** Navigation, projects and safe sign-out; changes stay owned by Workspace. */
export function WorkspaceSidebar({
  sidebarRef,
  modalOpen,
  mobile,
  demoMode,
  selfHosted,
  view,
  selectedProject,
  activeCount,
  projects,
  user,
  hasComments,
  onNavigate,
  onCloseMobile,
  onCreateProject,
  onSelectProject,
  onError
}: SidebarProps) {
  const selectedView=selfHosted?activeNav(view,selectedProject):view;
  return <aside id="studio-sidebar" ref={sidebarRef} inert={modalOpen} className={`sidebar ${mobile ? 'mobile-open' : ''}`}><button type="button" className="sidebar-mobile-close" aria-label="Navigation schliessen" onClick={onCloseMobile}><X size={20}/></button><div className="studio-sidebar-brand"><StudioBrand /></div><div className="workspace-switch"><span className="workspace-icon">Q.</span><div><strong>Schmaqq Studio</strong><small>{demoMode ? 'Lokaler Probelauf' : 'Gemeinsam entwickeln'}</small></div><ChevronDown size={15} /></div><nav aria-label="Hauptnavigation">{navGroups.map(group => {
          const items = group.views.map(key => workspaceNav.find(n => n[0] === (!selfHosted&&key==='settings'?'ai':key))).filter((n): n is typeof workspaceNav[number] => !!n && (selfHosted ? n[0] !== 'ai' : n[0] !== 'development' && n[0] !== 'models' && n[0] !== 'setup'));
          return items.length ? <div className="nav-group" role="group" aria-label={group.label} key={group.id}><div className="nav-label">{group.label}</div>{items.map(([key, label, Icon]) => <button key={key} onClick={() => onNavigate(key)} className={selectedView === key ? 'active' : ''} aria-current={selectedView === key ? 'page' : undefined}><Icon size={18} /><span className="nav-entry-text"><strong>{label}</strong><small>{navDescriptions[key]??'Persönlichen Arbeitsplatz öffnen'}</small></span>{key === 'tasks' && activeCount > 0 && <span className="nav-count">{activeCount}</span>}</button>)}</div> : null;
        })}</nav><details className="sidebar-projects"><summary>Projekte direkt öffnen</summary><div className="sidebar-project-head"><span className="nav-label">UNSERE PROJEKTE</span><button className="icon-button" aria-label="Projekt hinzufügen" onClick={onCreateProject}><Plus size={15} /></button></div><div className="project-nav">{projects.map(p => <button key={p.id} onClick={() => onSelectProject(p.id)}><span className={`project-dot ${p.color}`} />{p.title}</button>)}</div></details><div className="sidebar-bottom"><div className="small-note"><span className="tiny-star">✳</span><strong>Gute Ideen. Gemeinsam gebaut.</strong><p>Ein Ort für alles, was als Nächstes kommt.</p></div><a href="https://schmaqq.com" target="_blank" rel="noreferrer" className="website-link"><Globe size={16} /> schmaqq.com <ArrowUpRight size={15} /></a><div className="profile"><span className="avatar sage">{initials(user.displayName)}</span><div><strong>{short(user.displayName)}</strong><small>{selfHosted ? 'Studio-Konto' : 'Mit ChatGPT angemeldet'}</small></div><a href={selfHosted ? '#' : '/signout-with-chatgpt?return_to=/'} onClick={selfHosted ? async e => {
          e.preventDefault();
          if ((hasDrafts() || hasComments) && !window.confirm('Du hast ungespeicherte Entwürfe. Trotzdem abmelden und diese verwerfen?')) return;
          const logout = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: '{}'
          });
          if (!logout.ok) {
            onError('Abmelden fehlgeschlagen. Bitte erneut versuchen.');
            return;
          }
          clearDrafts();
          location.reload();
        } : undefined} target="_top" aria-label="Abmelden"><LogOut size={16} /></a></div></div></aside>;
}
