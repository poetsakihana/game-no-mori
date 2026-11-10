const vm = require('node:vm');
function harness(script,seed={},blocked=false) {
 const values = new Map(Object.entries(seed)), nodes=new Map(),events={};let frame;
 const context=new Proxy({}, {get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});return ()=>{};},set(t,k,v){t[k]=v;return true;}});
 function node(id){const classes=new Set(['hud','pauseScreen','resultScreen','storyScreen'].includes(id)?['hidden']:[]),handlers={};return {id,open:false,style:{},dataset:{},textContent:'',innerHTML:'',classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,force){if(force??!classes.has(k))classes.add(k);else classes.delete(k)}},getContext:()=>context,getBoundingClientRect:()=>({width:960,height:540}),querySelector:()=>({textContent:''}),setAttribute(){},setPointerCapture(){},addEventListener(n,fn){handlers[n]=fn;events[id+':'+n]=fn},showModal(){this.open=true;},close(){if(this.open){this.open=false;handlers.close?.();}}};}
 const buttons=['left','right','up','down','attack','jump','pick','guard','special','heal'].map(k=>{const n=node(k);n.dataset.key=k;nodes.set(k,n);return n});
 const document={hidden:false,body:{},getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},querySelector:s=>node(s),querySelectorAll(s){return s==='[data-key]'?buttons:[]},addEventListener(n,fn){events['document:'+n]=fn}};
 const window={devicePixelRatio:1,addEventListener(n,fn){events['window:'+n]=fn}};
 const sandbox={window,document,console,localStorage:{getItem(k){if(blocked)throw Error('blocked');return values.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');values.set(k,v)}},requestAnimationFrame(fn){frame=fn},setTimeout(){},Math,Date};
 const ctx=vm.createContext(sandbox);vm.runInContext(script,ctx);
 return {run:s=>window.__test(s),nodes,values,events,document,frame:t=>frame(t)};
}
module.exports = harness;
