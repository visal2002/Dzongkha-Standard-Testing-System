console.log('before import debug module');
import('./_tw_node_debug.mjs').then(() => console.log('IMPORT DONE')).catch(e => console.log('IMPORT ERR', e.stack));
