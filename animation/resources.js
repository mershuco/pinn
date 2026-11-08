// The hosted game loads ordinary files. The portable HTML supplies the same
// resources from its embedded bundle, without fetch or a local web server.
export function assetUrl(path) {
 return globalThis.PINN_WEB_ASSETS?.[path] || path;
}
export async function readJson(path) {
 const data=globalThis.PINN_WEB_DATA;
 if(data&&Object.prototype.hasOwnProperty.call(data,path))return data[path];
 const response=await fetch(path);
 if(!response.ok)throw Error(path);
 return response.json();
}
