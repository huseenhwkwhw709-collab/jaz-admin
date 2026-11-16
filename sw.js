importScripts('./push-config.js');

function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('jaz-push-events',1);request.onupgradeneeded=()=>request.result.createObjectStore('events',{keyPath:'eventId'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function firstTime(eventId){const db=await database();return new Promise((resolve,reject)=>{const transaction=db.transaction('events','readwrite'),store=transaction.objectStore('events'),request=store.get(eventId);let fresh=false;const cursor=store.openCursor();cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;if(item.value.at<Date.now()-90*86400000)item.delete();item.continue();};request.onsuccess=()=>{if(!request.result){fresh=true;store.put({eventId,at:Date.now()});}};transaction.oncomplete=()=>{db.close();resolve(fresh);};transaction.onerror=()=>reject(transaction.error);});}
async function show(data){if(!data?.eventId)return;const fresh=await firstTime(data.eventId);if(!fresh)return;await self.registration.showNotification(String(data.title||'جاهز'),{body:'افتح جاهز لمراجعة التفاصيل',icon:data.scope==='admin'?'./admin-icon-192.png':'./jaz-blue-icon-192.png',tag:data.eventId,renotify:false,data:{eventId:data.eventId,scope:data.scope==='admin'?'admin':'customer'}});for(const client of await clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type:'JAZ_PUSH_RECEIVED',eventId:data.eventId});}
if(self.JAZ_FIREBASE_CONFIG){importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');firebase.initializeApp(self.JAZ_FIREBASE_CONFIG);firebase.messaging().onBackgroundMessage(payload=>show(payload.data));}
self.addEventListener('message',event=>{if(event.data?.type==='JAZ_FOREGROUND_NOTIFICATION')event.waitUntil(show(event.data.data));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const data=event.notification.data||{},url=new URL(data.scope==='admin'?'./index.html':'./mobile.html',self.registration.scope);url.searchParams.set('event',String(data.eventId||''));const windows=await clients.matchAll({type:'window',includeUncontrolled:true}),existing=windows.find(c=>new URL(c.url).origin===url.origin&&new URL(c.url).pathname===url.pathname);if(existing){await existing.navigate(url.href);await existing.focus();}else await clients.openWindow(url.href);})());});
self.addEventListener('activate',event=>event.waitUntil(clients.claim()));

// Cache only a public connection screen, never administrative pages or data.
const ADMIN_OFFLINE_CACHE='jaz-admin-offline-v1';
const adminOfflineUrl=new URL('./admin-offline.html',self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(ADMIN_OFFLINE_CACHE).then(cache=>cache.add(adminOfflineUrl)).then(()=>self.skipWaiting()).catch(()=>{})));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate'||event.request.method!=='GET')return;
 const url=new URL(event.request.url),root=new URL('./',self.registration.scope);
 if(url.origin!==root.origin||![root.pathname,root.pathname+'index.html'].includes(url.pathname))return;
 event.respondWith(fetch(event.request).catch(async()=>await caches.match(adminOfflineUrl)||Response.error()));
});
