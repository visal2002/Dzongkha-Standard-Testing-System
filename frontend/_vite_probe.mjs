console.log('STEP0: start');
import('vite').then(async (vite) => {
  console.log('STEP1: vite module loaded', vite.version);
  try {
    const server = await vite.createServer({
      root: process.cwd(),
      configFile: 'D:/Dzongkha-Standard-Testing-System/frontend/vite.config.js',
      server: { host: '0.0.0.0', port: 5000, strictPort: true },
    });
    console.log('STEP2: server created');
    await server.listen();
    console.log('STEP3: server listening');
    server.printUrls();
    console.log('STEP4: urls printed');
  } catch (e) {
    console.log('ERROR:', e.stack || e.message);
  }
}).catch(e => console.log('IMPORT_ERROR:', e.stack || e.message));
