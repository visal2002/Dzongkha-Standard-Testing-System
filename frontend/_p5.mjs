const t0 = Date.now();
console.log('importing jiti...');
import('jiti').then(m=>console.log('OK jiti', Date.now()-t0, Object.keys(m))).catch(e=>console.log('ERR jiti', e.message));
