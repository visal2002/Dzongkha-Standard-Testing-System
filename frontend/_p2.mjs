console.log('start tailwind plugin import');
import('@tailwindcss/vite').then(m => { console.log('OK tailwind plugin', typeof m.default); process.exit(0); }).catch(e=>{console.log('ERR', e.stack); process.exit(1);});
