console.log('before registerHooks');
import * as M from 'module';
const t0 = Date.now();
M.registerHooks({ resolve(spec, ctx, next) { return next(spec, ctx); } });
console.log('after registerHooks', Date.now()-t0, 'ms');
