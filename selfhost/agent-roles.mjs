// Studio is a company: agents are employees, and the role decides the job. One table, enforced by the server; the
// app shows the same table. The project lead (Herr Grau) runs the company: plans, hands out work and hires. He does
// not program or research himself; that is what the team is for.

export const ROLE_JOBS = Object.freeze({
  code: Object.freeze(['developer', 'frontend', 'debugger', 'infrastructure']),
  web: Object.freeze(['researcher', 'strategy', 'knowledge']),
  review: Object.freeze(['reviewer', 'security'])
});
export const TEAM_LIMIT = 6; // active agents per project, the lead included

const active = agent => agent && agent.active !== false && agent.permissions?.readProject !== false;
const isLead = agent => agent?.lead === true;

export const canCode = agent => active(agent) && !isLead(agent) && ROLE_JOBS.code.includes(agent.role);
export const canResearch = agent => active(agent) && !isLead(agent) && ROLE_JOBS.web.includes(agent.role);
export const canReview = agent => active(agent) && !isLead(agent) && ROLE_JOBS.review.includes(agent.role);
/** Only the lead hands out work to colleagues and hires. */
export const canLead = agent => active(agent) && isLead(agent);

/** Roles the lead may hire, with a short German job title and a default face. */
export const HIRABLE = Object.freeze({
  developer: { title: 'Entwicklung', face: 'otto' },
  frontend: { title: 'Oberflächen', face: 'mara' },
  researcher: { title: 'Recherche', face: 'eule' },
  reviewer: { title: 'Prüfung', face: 'frau-kern' },
  security: { title: 'Sicherheit', face: 'dachs' },
  strategy: { title: 'Strategie', face: 'fuchs' },
  creative: { title: 'Gestaltung und Text', face: 'nova' },
  support: { title: 'Kundendienst', face: 'baer' }
});

/** Who in the team does a kind of work (for the lead's view of the company). */
export function jobOf(agent) {
  if (isLead(agent)) return 'leitet, verteilt Arbeit, stellt ein';
  if (ROLE_JOBS.code.includes(agent.role)) return 'ändert Code';
  if (ROLE_JOBS.web.includes(agent.role)) return 'sucht und liest im Web';
  if (ROLE_JOBS.review.includes(agent.role)) return 'prüft Änderungen';
  return 'berät im Gespräch';
}
