console.log('start react plugin import');
import('@vitejs/plugin-react').then(m => { console.log('OK react plugin', typeof m.default); process.exit(0); }).catch(e=>{console.log('ERR', e.stack); process.exit(1);});
