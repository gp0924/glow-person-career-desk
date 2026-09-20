import {setSyncGate} from './message.mjs';
export function startSync(initial){
 let active=initial,pending=false,busy=false,lastAllow=true,lastError=false;
 const box=document.querySelector('#sync-status'),button=document.querySelector('#sync-check'),load=document.querySelector('#sync-load');
 const stamp=()=>new Date(active.importedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 function gate(allow,reason,deadline){
  setSyncGate(allow,reason,deadline);
  if(!allow&&lastAllow){
   const review=document.querySelector('#review');if(review)review.checked=false;
   for(const id of ['copy','line','other']){const b=document.getElementById(id);if(b)b.disabled=true;}
  }
  lastAllow=allow;
 }
 function status(error=false){
  lastError=error;
  const deadline=Date.parse(active.importedAt)+3*60*60*1000;
  const stale=!Number.isFinite(deadline)||Date.now()>=deadline;
  const reason=pending?'新しい案件データがあります。「最新データを読み込む」で切り替え、条件と本文を再確認してください。':stale?'最終同期から3時間以上経過したため、コピー・共有を停止しています。管理者によるシート同期が必要です。':'';
  gate(!pending&&!stale,reason,deadline);
  box.textContent=pending?'新しい案件データがあります。再読み込みして条件を確認してください。':stale?`最終同期 ${stamp()} · 3時間以上更新されていません。安全のため共有を停止中。`:error?`更新確認に失敗しました。最終同期 ${stamp()}。再確認できます。`:`最終同期 ${stamp()}（日本時間） · 配信済みデータを1分ごとに確認`;
  box.classList.toggle('sync-warning',pending||stale||error);
  load.hidden=!pending;
  document.querySelector('#date').textContent=stamp();
  document.dispatchEvent(new Event('sync-state'));
 }
 async function check(){
  if(busy||document.hidden)return;busy=true;button.disabled=true;
  try{
   const response=await fetch(`./data.json?check=${Date.now()}`,{cache:'no-store'});
   if(!response.ok)throw Error('fetch');
   const next=await response.json();
   if(!next.contentHash||!Array.isArray(next.records)||!Number.isFinite(Date.parse(next.importedAt)))throw Error('invalid');
   if(next.contentHash!==initial.contentHash){pending=true;}
   else{active=next;}
   status();
  }catch{status(true)}finally{busy=false;button.disabled=false}
 }
 button.onclick=check;
 load.onclick=()=>{if(document.querySelector('#message')&&!confirm('再読み込みすると編集中の紹介文は消えます。最新データに切り替えますか？'))return;location.reload()};
 status();setInterval(()=>status(lastError),15000);setInterval(check,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){status(lastError);check()}});
}
