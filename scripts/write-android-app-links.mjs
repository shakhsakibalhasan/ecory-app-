import {mkdir,writeFile} from 'node:fs/promises';
const value=(process.argv[2]||'').toUpperCase();
if(!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))throw new Error('Supply the SHA-256 certificate fingerprint of the APK signing certificate (32 colon-separated byte pairs). Do not supply a private key or password.');
await mkdir('public/.well-known',{recursive:true});
await writeFile('public/.well-known/assetlinks.json',JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:'com.ecory.consumer.test',sha256_cert_fingerprints:[value]}}],null,2)+'\n');
console.log('Generated public/.well-known/assetlinks.json. Publish it at https://ecory.app/.well-known/assetlinks.json with this APK signing fingerprint.');
