console.log('start');
import('@tailwindcss/node');
setTimeout(() => {
  console.log('--- after 4s, active handles ---');
  const handles = process._getActiveHandles();
  console.log('handle count:', handles.length);
  for (const h of handles) {
    console.log(' -', h.constructor?.name, JSON.stringify(Object.keys(h)).slice(0,200));
  }
  console.log('--- active requests ---');
  const reqs = process._getActiveRequests();
  console.log('request count:', reqs.length);
  for (const r of reqs) {
    console.log(' -', r.constructor?.name);
  }
}, 4000).unref();
setTimeout(()=>{ console.log('force exit'); process.exit(2); }, 6000);
