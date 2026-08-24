const t0 = Date.now();
console.log('importing enhanced-resolve...');
import('enhanced-resolve').then(m=>console.log('OK enhanced-resolve', Date.now()-t0)).catch(e=>console.log('ERR enhanced-resolve', e.message));
