import { Worker } from 'node:worker_threads';
console.log('creating worker...');
const w = new Worker("import('node:worker_threads').then(({parentPort})=>parentPort.postMessage('hello'));", { eval: true });
w.on('message', (msg) => { console.log('WORKER MSG:', msg); process.exit(0); });
w.on('error', (e) => { console.log('WORKER ERROR:', e.message); process.exit(1); });
setTimeout(() => { console.log('WORKER TIMEOUT - no message received in 5s'); process.exit(3); }, 5000);
