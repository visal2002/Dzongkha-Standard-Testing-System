console.log('A: start');
import('@vitejs/plugin-react').then(m => console.log('B: react plugin loaded', typeof m.default))
  .catch(e => console.log('B_ERR:', e.stack));
import('@tailwindcss/vite').then(m => console.log('C: tailwind plugin loaded', typeof m.default))
  .catch(e => console.log('C_ERR:', e.stack));
import('vite').then(async vite => {
  console.log('D: loading config via loadConfigFromFile...');
  const result = await vite.loadConfigFromFile({command:'serve', mode:'development'}, 'D:/Dzongkha-Standard-Testing-System/frontend/vite.config.js');
  console.log('E: config loaded', !!result);
}).catch(e => console.log('D_ERR:', e.stack));
