const t0 = Date.now();
console.log('importing tailwindcss...');
import('tailwindcss').then(m=>console.log('OK tailwindcss', Date.now()-t0, Object.keys(m))).catch(e=>console.log('ERR tailwindcss', e.message));
