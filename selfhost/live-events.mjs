// Live connection to the browsers: a small "something changed" signal per person.
//
// The signal carries no content, only where to look (project, and whether messages or agent runs
// changed). The browser then asks for the data through the normal, permission-checked routes.

const HEARTBEAT_MS = 15000;
const MAX_CONNECTIONS_PER_MEMBER = 6;

export function createLiveEvents({ canSee }) {
  const connections = new Map(); // member id -> Set of open responses

  function subscribe(member, req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no' // reverse proxies must pass each signal on at once
    });
    res.write('retry: 3000\n\n');
    const open = connections.get(member) ?? new Set();
    connections.set(member, open);
    if (open.size >= MAX_CONNECTIONS_PER_MEMBER) open.values().next().value.end(); // oldest tab reconnects later
    open.add(res);
    const heartbeat = setInterval(() => res.write(': still here\n\n'), HEARTBEAT_MS);
    heartbeat.unref();
    const leave = () => {
      clearInterval(heartbeat);
      open.delete(res);
      if (!open.size && connections.get(member) === open) connections.delete(member);
    };
    res.on('close', leave);
    req.on('close', leave);
  }

  /**
   * Tell everyone who may see the project, or only the named people (private chats, own agent runs).
   * type: 'room' = messages, tasks or team changed; 'runs' = an agent run of this person moved on.
   */
  function publish({ type, project, only = null }) {
    const line = 'data: ' + JSON.stringify({ type, project }) + '\n\n';
    for (const [member, open] of connections) {
      if (only ? !only.includes(member) : !canSee(member, project)) continue;
      for (const res of open) res.write(line);
    }
  }

  function close() {
    for (const open of connections.values()) for (const res of open) res.end();
    connections.clear();
  }

  return { subscribe, publish, close, count: () => [...connections.values()].reduce((n, open) => n + open.size, 0) };
}
