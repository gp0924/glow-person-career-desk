import {draft,lineURL,isShareable} from './message.mjs';
import {startSync} from './sync-monitor.mjs';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,view='active',selected=null;
const toast=t=>{$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)};
document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
$('#theme').onclick=()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
function render(){
 const q=$('#search').value.normalize('NFKC').toLowerCase().trim();
 const rows=data.records.filter(r=>r.current===(view==='active')&&(!$('#year').value||r.year===$('#year').value)&&(!$('#kind').value||r.kind===$('#kind').value)&&`${r.name} ${r.area} ${r.education} ${r.conditions} ${r.headline}`.normalize('NFKC').toLowerCase().includes(q));
 $('#count').textContent=`${rows.length}件`;
 $('#cards').innerHTML=rows.length?rows.map(r=>`<article class="card ${selected?.id===r.id?'selected':''}" data-card="${r.id}"><div class="card-top"><span class="year">${esc(r.year)}</span><span class="tag">${r.kind}</span><span class="status ${r.current?'':'paused'}">${r.current?'許可確認が必要':'停止一覧・要確認'}</span></div><h3>${esc(r.name)}</h3><p class="headline">${esc(r.headline)}</p><dl><div><dt>エリア</dt><dd>${esc(r.area.split('\n')[0]||'未記載・要確認')}</dd></div><div><dt>学歴条件</dt><dd class="clamp">${esc(r.education||'未記載・要確認')}</dd></div></dl>${r.conflict?'<div class="conflict">現行・停止一覧に重複あり。要確認</div>':''}<div class="card-foot"><button class="detail-btn subtle" data-id="${r.id}">条件・原文を見る ↗</button>${r.current?`<button class="create" data-id="${r.id}">紹介文を作る →</button>`:'<small>共有機能は無効</small>'}</div></article>`).join(''):'<div class="no-results"><h3>条件に一致する案件がありません</h3><p>キーワードや卒年度の絞り込みを変更してください。</p><button id="empty-reset">条件をリセット</button></div>';
 document.querySelectorAll('.create').forEach(b=>b.onclick=()=>select(data.records.find(r=>r.id===b.dataset.id)));
 document.querySelectorAll('.detail-btn').forEach(b=>b.onclick=()=>detail(data.records.find(r=>r.id===b.dataset.id)));
 if($('#empty-reset'))$('#empty-reset').onclick=reset;
}
function detail(r){
 const fields=[['原文ステータス',r.status],['学歴',r.education],['院生',r.graduate],['理系',r.science],['海外国籍',r.nationality],['短大',r.junior],['専門',r.vocational],['求人対応エリア',r.area],['その他セグメント（社内用）',r.conditions],['申込欄の原文（社内用）',r.linkNotes],['サービス資料・原文',r.resources]];
 $('#detail-content').innerHTML=`<span class="eyebrow">INTERNAL REFERENCE</span><h2>${esc(r.name)} · ${r.year}</h2><p class="warning">社内確認用です。この原文をそのまま学生へ転送しないでください。${r.conflict?'現行と停止の両一覧に掲載されています。担当者へ状況をご確認ください。':''}</p><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">元シートの該当行を開く ↗</a><dl class="detail-fields">${fields.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'未記載・要確認')}</dd></div>`).join('')}</dl>`;
 $('#detail').showModal();
}
$('#detail-close').onclick=()=>$('#detail').close();
$('#detail').onclick=e=>{if(e.target===$('#detail'))$('#detail').close()};
function select(r){
 if(selected&&$('#message')&&$('#message').value!==$('#message').dataset.generated&&!confirm('編集した紹介文を破棄して別の案件に切り替えますか？'))return;
 selected=r;render();
 const labels=r.name==='irodas'?['総合職','ITエンジニア職']:r.links.map((_,i)=>`申込先 ${i+1}`);
 $('#composer').innerHTML=`<div class="composer-head"><div><span class="eyebrow">MESSAGE STUDIO</span><h2>学生向け紹介文</h2></div><span class="draft-badge">下書き</span></div><div class="chosen"><span>${r.year} / ${r.kind}</span><b>${esc(r.name)}</b></div><div class="composer-body"><label>文章の長さ<select id="format"><option value="standard">標準 · 条件も簡潔に</option><option value="short">短め · LINEで読みやすく</option></select></label><label>冒頭のひとこと <small>任意</small><input id="intro" placeholder="こんにちは！就活サービスのご案内です。"></label><label>申込リンク<select id="link"><option value="">リンクを載せない（担当者へ相談）</option>${r.links.map((l,i)=>`<option value="${esc(l)}">${labels[i]||`申込先 ${i+1}`} · ${new URL(l).hostname}</option>`).join('')}</select></label><p class="hint">${r.links.length?'専用リンク・職種別の窓口を確認してから選択してください。':'現行行に申込URLがありません。別年度や停止案件のURLは流用しません。'}</p><label>締めのひとこと <small>任意</small><input id="closing" placeholder="気になったら、気軽に返信してください！"></label><button id="regenerate" class="subtle regenerate">設定から文章を作り直す ↻</button><div class="preview-label"><label for="message">送信する文章 <small>直接編集できます</small></label><span id="length"></span></div><textarea id="message" spellcheck="false"></textarea><p class="hint">成果条件・否認条件・管理者用URLは自動挿入しません。編集内容は再読み込みで消えます。</p>${r.conflict?'<p class="warning">現行・停止一覧で状態が重複しています。紹介可否を担当者に確認してください。</p>':''}<label class="review"><input type="checkbox" id="review"><span>最新の受付状況・紹介許可・学生の対象条件・リンク・本文を確認しました</span></label><div class="share-actions"><button id="copy">文章をコピー</button><button id="line" class="line">LINEで共有 ↗</button><button id="other" class="subtle">その他のアプリで共有</button></div><p class="hint">LINEはスマホアプリ向け。PCではコピーをご利用ください。送信先の選択・送信はご自身で行います。</p></div>`;
 if(r.summaryNeedsReview)$('#composer .chosen').insertAdjacentHTML('beforeend','<p class="warning">新規または条件変更あり。古い紹介文を使わず、確認用の簡潔な文章に切り替えています。</p>');
 function refreshDraft(){const t=draft(r,{format:$('#format').value,intro:$('#intro').value,closing:$('#closing').value,link:$('#link').value});$('#message').value=t;$('#message').dataset.generated=t;$('#review').checked=false;update();}
 function update(){const text=$('#message').value;$('#length').textContent=`${text.length.toLocaleString()} / 4,000字`;const ok=isShareable(r,$('#review').checked,text);['copy','line','other'].forEach(id=>$('#'+id).disabled=!ok);$('#length').classList.toggle('over',text.length>4000);}
 $('#regenerate').onclick=()=>{if($('#message').value!==$('#message').dataset.generated&&!confirm('手動編集を破棄し、設定から文章を作り直しますか？'))return;refreshDraft()};
 ['format','intro','closing','link'].forEach(id=>$('#'+id).addEventListener('change',()=>{if($('#message').value===$('#message').dataset.generated)refreshDraft();else{$('#review').checked=false;update();toast('設定を反映するには「文章を作り直す」を押してください');}}));
 $('#message').oninput=()=>{$('#review').checked=false;update()};
 $('#review').onchange=update;
 $('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#message').value);toast('紹介文をコピーしました');}catch{$('#message').focus();$('#message').select();try{if(document.execCommand('copy')){toast('紹介文をコピーしました');return}}catch{}toast('文章を選択しました。手動でコピーしてください');}};
 $('#line').onclick=()=>{window.open(lineURL($('#message').value),'_blank','noopener,noreferrer')};
 $('#other').onclick=async()=>{if(!navigator.share){toast('この環境では共有メニューを使えません。コピーをご利用ください。');return}try{await navigator.share({title:`${r.name} ${r.year}`,text:$('#message').value})}catch(e){if(e.name!=='AbortError')toast('共有できませんでした。コピーをご利用ください。')}};
 refreshDraft();
 if(innerWidth<1100)$('#composer').scrollIntoView({behavior:'smooth',block:'start'});
}
function reset(){['search','year','kind'].forEach(id=>$('#'+id).value='');render()}
$('#reset').onclick=reset;
['search','year','kind'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>data&&render()));
function navigate(next){
 view=next;$('#workspace').hidden=next==='guide';$('#guide').hidden=next!=='guide';
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.id===`nav-${next}`));
 $('#crumb').textContent=next==='active'?'案件を探す':'資料・運用ガイド';
 $('#title').textContent=next==='active'?'学生の次の一歩に、ぴったりの案件を。':'資料とルールを、ひとつの場所に。';
 $('#subtitle').textContent=next==='guide'?'元データの確認と、安心して案内するための運用ルール。':'条件を確認しながら、伝わる紹介文をすばやく作成。';
 $('#composer').hidden=next!=='active';if(next!=='guide')reset();
}
['active','guide'].forEach(v=>$('#nav-'+v).onclick=()=>data&&navigate(v));
async function init(){try{
 const res=await fetch('./data.json',{cache:'no-store'});if(!res.ok)throw Error(res.status);data=await res.json();
 if(!Array.isArray(data.records)||data.records.some(r=>!/^\d{2}卒$/.test(r.year)))throw Error('卒年度の形式が不正です。安全のため表示を停止します。');
 $('#year').innerHTML='<option value="">すべての卒年度</option>'+[...new Set(data.records.map(r=>r.year))].sort().map(y=>`<option>${esc(y)}</option>`).join('');
 const active=data.records.filter(r=>r.current);
 $('#source-top').href=data.source;$('#nav-count').textContent=active.length;
 $('#stat-active').textContent=active.length;$('#stat-27').textContent=active.filter(r=>r.year==='27卒').length;$('#stat-28').textContent=active.filter(r=>r.year==='28卒').length;
 $('#date').textContent=new Date(data.importedAt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
 $('#guide').innerHTML=`<div class="guide-grid"><article><h2>紹介前のチェックリスト</h2><ol><li>担当者に最新の受付状況・紹介許可を確認する。</li><li>対象卒年度・学歴・勤務地・個別条件を原文で確認する。</li><li>申込URLが当社用・該当卒年度用であることを確認する。</li><li>文章を読み直してからコピー・LINE共有する。</li></ol><h3>データの扱い</h3><p>取得時点のスナップショットです。元シートは変更しません。現行タブと停止タブの重複は解消せず警告を表示します。その他の資料は参考用で、現行条件に自動統合しません。</p><p>元シート冒頭の表記：${esc(data.sourceDate)}。行内には別の日付もあり、シート全体の最新更新日とは断定できません。</p><h3>安全な共有</h3><p>このページ自体にはログイン機能はありません。非公開プレビューと非公開GitHub内で利用し、外部公開しないでください。本運用でチーム共有する際は認証付きホスティングが必要です。</p><p>紹介文は定型テンプレートで生成します。外部AIに案件データを送信しません。LINE等への共有を押した時だけ、確認した紹介文をその共有先へ渡します。</p></article><article><h2>元シート・参考資料</h2><p>全7タブの取得内容を参照できます。過去の広告表現・成果条件も含むため、そのまま学生へ転送しないでください。</p>${data.sheets.map(s=>`<details><summary>${esc(s.name)}</summary><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">元タブを開く ↗</a><div class="raw-sheet">${s.rows.map((r,i)=>r.some(v=>v)?`<details><summary>${i+1}行目 · ${esc(r.filter(Boolean).slice(0,3).join(' / ').slice(0,100))}</summary><dl>${r.map((v,j)=>v?`<dt>${column(j)}列</dt><dd>${esc(v)}</dd>`:'').join('')}</dl></details>`:'').join('')}</div></details>`).join('')}</article></div>`;
 const guideData=$('#guide .guide-grid article p');
 $('#guide .guide-grid article:nth-child(2)>p').textContent='実施中案件の原文のみ参照できます。停止・要確認案件と停止案件を含む過去の参考データは、公開側の配信データから除外しています。元のGoogleシートは変更していません。';
 $('#guide .guide-grid article').querySelectorAll('p')[2].textContent='このアプリは所有者の指定により公開リンクで提供しています。リンクを知っている人は、社内条件・成果条件・専用申込URLを含む取得済みデータを閲覧できます。今後の同期内容も同じ公開範囲になります。元のGoogleシートやリンク先資料へのアクセス権は別管理です。閲覧者を制限したい場合は、所有者がPerplexityの共有設定を変更してください。GitHubリポジトリは非公開のままです。';
 guideData.textContent='1時間ごとに元シートを読み取り、実施中の案件だけを非公開GitHubとこのアプリへ反映します。停止・要確認案件は毎回除外します。ページを開いている間は1分ごとに配置済みデータの更新を確認します。「更新を確認」はシートへの即時同期ではありません。変更時は再読み込みを案内し、編集中の文章は勝手に上書きしません。3時間以上同期されない場合は共有を停止します。元シートは変更しません。現行と停止の両方にある案件は、現行の実施中行だけを残して要確認の警告を表示します。';
 render();startSync(data);
}catch(e){$('#error').hidden=false;$('#error').innerHTML='<h2>案件データを読み込めませんでした</h2><p>接続を確認して、ページを再読み込みしてください。</p>';$('#workspace').hidden=true;console.error(e)}}
function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
init();
