console.log('start @tailwindcss/node import');
const t0 = Date.now();
import('@tailwindcss/node').then(m => { console.log('OK @tailwindcss/node', Date.now()-t0, 'ms', Object.keys(m)); process.exit(0); }).catch(e=>{console.log('ERR', e.stack); process.exit(1);});
