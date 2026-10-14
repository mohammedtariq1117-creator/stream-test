const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(__dirname));

app.get('/health', (_, res) => res.send('relay ok'));

const viewers = new Set();

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  ws.ip = ip;
  ws.role = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'role') {
      ws.role = msg.role;
      if (ws.role === 'viewer') {
        viewers.add(ws);
        console.log('[+] viewer ' + ip);
      } else {
        console.log('[+] source ' + ip);
        for (const v of viewers) {
          if (v.readyState === 1) v.send(JSON.stringify({ type: 'source_new', ip }));
        }
      }
      return;
    }

    if (ws.role === 'source' && msg.type === 'frame') {
      const packet = JSON.stringify({ type: 'frame', ip: ws.ip, data: msg.data, ts: Date.now() });
      for (const v of viewers) {
        if (v.readyState === 1) v.send(packet);
      }
    }
  });

  ws.on('close', () => {
    viewers.delete(ws);
    console.log('[-] ' + ws.role + ' ' + ip);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log('relay on :' + PORT));
