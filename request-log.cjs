'use strict';
// Request log preload: `node -r ./request-log.cjs <server>`. No dependencies.
//
// KEEP THIS: one log line per request (status + duration) is what the workspace Monitoring tab charts.
//
// Wraps the 'request' event of every node http/https server in this process and, when the
// response is done, writes ONE JSON line to stdout:
//   {"status":200,"durationMs":3.2,"method":"GET","path":"/health","ua":"curl/8.5.0"}
// Health checks are logged too (the platform filters the kubelet's probes itself). Never logs
// bodies, cookies, headers other than the user agent, or the query string.
const http = require('http');
const https = require('https');

const MARK = Symbol.for('fleet.requestLog');

function logLine(req, res, start) {
  const url = typeof req.url === 'string' ? req.url : '';
  const q = url.indexOf('?');
  const line = {
    status: res.statusCode,
    durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
    method: req.method,
    path: (q === -1 ? url : url.slice(0, q)).slice(0, 512),
    ua: String(req.headers['user-agent'] || '').slice(0, 256),
  };
  try {
    process.stdout.write(JSON.stringify(line) + '\n');
  } catch {
    // logging must never break a response
  }
}

function patch(Server) {
  if (!Server || !Server.prototype || Server.prototype[MARK]) return;
  const emit = Server.prototype.emit;
  Server.prototype[MARK] = true;
  Server.prototype.emit = function (event, req, res) {
    if (event === 'request' && req && res && !res[MARK]) {
      res[MARK] = true;
      const start = process.hrtime.bigint();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        logLine(req, res, start);
      };
      res.once('finish', finish);
      res.once('close', finish);
    }
    return emit.apply(this, arguments);
  };
}

patch(http.Server);
patch(https.Server);
