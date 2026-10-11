// Run tests and both production builds first. Generates artifacts, never credentials.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const root = path.resolve(__dirname, '../..');
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding:'utf8'}).trim();
const out = path.join(root, 'tmp', `release-${version}`);
const services = ['identity-service','registration-service','assessment-content-service','result-service','appeal-certificate-service','notification-service','reporting-service','integration-service'];
const copy = (from, to) => fs.cpSync(path.join(root, from), to, {recursive:true});
fs.mkdirSync(path.join(out, 'runtime'), {recursive:true});
for (const file of ['package.json','package-lock.json']) copy(`backend/${file}`,path.join(out,'runtime',file));
copy('deploy/release/Dockerfile.runtime',path.join(out,'runtime','Dockerfile'));
for (const service of services) {
  const dir=path.join(out,service);fs.mkdirSync(path.join(dir,'assets'),{recursive:true});
  copy(`backend/dist/apps/${service}/main.js`,path.join(dir,'main.js'));
  const assets=path.join(root,'backend/apps',service,'assets');
  if(fs.existsSync(assets))fs.cpSync(assets,path.join(dir,'assets'),{recursive:true});
  copy('deploy/release/Dockerfile.service',path.join(dir,'Dockerfile'));
  fs.writeFileSync(path.join(dir,'assets','release.json'),JSON.stringify({version,revision,service}));
}
fs.mkdirSync(path.join(out,'frontend'),{recursive:true});
copy('frontend/dist',path.join(out,'frontend','dist'));
copy('frontend/nginx.staging.conf',path.join(out,'frontend','nginx.staging.conf'));
copy('deploy/release/Dockerfile.frontend',path.join(out,'frontend','Dockerfile'));
fs.writeFileSync(path.join(out,'frontend','dist','release.json'),JSON.stringify({version,revision,service:'frontend'}));
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({version,revision,services:['frontend',...services]},null,2));
console.log(JSON.stringify({version,revision,output:out}));
