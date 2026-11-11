// Only explicitly listed same-origin game images can be routed to the new art.
export function resolveSkinURL(request,paths,base){
 const original=new URL(request,base),origin=new URL(base);
 if(original.origin!==origin.origin)return request;
 const root=new URL('./',origin);let key;
 try{key=decodeURIComponent(original.pathname.slice(root.pathname.length));}catch{return request;}
 const replacement=paths[key];
 if(!replacement||!/^remake-skin\/[a-z0-9-]+\.png$/.test(replacement))return request;
 return new URL(replacement,root).href;
}
