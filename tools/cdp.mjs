import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

export class Cdp {
  constructor(proc, ws, port) {
    this.proc = proc;
    this.ws = ws;
    this.port = port;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        const subs = this.listeners.get(msg.method) || [];
        for (const fn of subs) fn(msg.params);
      }
    });
  }

  static async launch() {
    const exe = CHROME_CANDIDATES.find((p) => existsSync(p)) ?? CHROME_CANDIDATES[CHROME_CANDIDATES.length - 1];
    const profileDir = mkdtempSync(join(tmpdir(), 'ffasm3d-chrome-'));
    const args = [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--disable-gpu',
      '--enable-unsafe-swiftshader',
      '--disable-extensions',
      '--no-managed-user-acknowledgment-check',
      'about:blank',
    ];
    const proc = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('chrome did not expose DevTools socket')), 20000);
      const onData = (d) => {
        buf += d.toString();
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
          clearTimeout(timer);
          proc.stderr.off('data', onData);
          resolve(m[1]);
        }
      };
      proc.stderr.on('data', onData);
      proc.once('exit', () => { clearTimeout(timer); reject(new Error('chrome exited early')); });
    });
    const port = Number(wsUrl.match(/:(\d+)\//)[1]);
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    const cdp = new Cdp(proc, ws, port);
    cdp.profileDir = profileDir;
    return cdp;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  async evaluate(expression, { awaitPromise = false } = {}) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (res.exceptionDetails) throw new Error('evaluate failed: ' + JSON.stringify(res.exceptionDetails).slice(0, 500));
    return res.result.value;
  }

  async screenshot(path) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const fsmod = await import('node:fs');
    fsmod.writeFileSync(path, Buffer.from(res.data, 'base64'));
  }

  async close() {
    try { await this.send('Browser.close'); } catch {}
    try { this.ws.close(); } catch {}
    await new Promise((r) => setTimeout(r, 400));
    try { this.proc.kill(); } catch {}
    try { rmSync(this.profileDir, { recursive: true, force: true }); } catch {}
  }
}
