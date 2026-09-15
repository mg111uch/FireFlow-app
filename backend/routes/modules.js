// Modules route — FireFlow A2 registry with live mount check.
// Express 5 hides mount prefixes, so liveness = the module's signature
// inner paths found in some mounted router's stack.
const express = require('express');
const { MODULES } = require('../lib/fireflowModules');

function livePaths(app) {
  const out = new Set();
  const router = (app && (app.router || app._router)) || null;
  const stack = (router && router.stack) || [];
  for (const layer of stack) {
    const inner = (layer.handle && layer.handle.stack) || [];
    for (const r of inner) {
      if (r.route && r.route.path !== undefined) out.add(String(r.route.path));
    }
  }
  return out;
}

module.exports = (app) => {
  const router = express.Router();
  router.get('/', (req, res) => {
    const live = livePaths(app);
    const modules = {};
    for (const [name, m] of Object.entries(MODULES)) {
      const sig = m.signature || [];
      modules[name] = {
        ...m,
        mounted: sig.length > 0 && sig.every((p) => live.has(p)),
      };
    }
    res.json({ modules });
  });
  return router;
};
