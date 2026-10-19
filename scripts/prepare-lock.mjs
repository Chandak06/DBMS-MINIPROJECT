import { readFile,writeFile,mkdir } from "node:fs/promises";
const pkg=JSON.parse(await readFile("package.json","utf8"));
for(const group of ["dependencies","devDependencies"])for(const name of Object.keys(pkg[group])){
 const installed=JSON.parse(await readFile("node_modules/"+name+"/package.json","utf8"));pkg[group][name]=installed.version;
}
pkg.scripts.dev="next dev --hostname 127.0.0.1";
pkg.scripts.start="next start --hostname 127.0.0.1";
await writeFile("package.json",JSON.stringify(pkg,null,2)+"\n");
await mkdir("artifacts/local/lockfile",{recursive:true});
await writeFile("artifacts/local/lockfile/package.json",JSON.stringify(pkg,null,2)+"\n");
console.log("Pinned direct dependencies to installed and tested versions.");
