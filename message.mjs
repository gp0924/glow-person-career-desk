export function draft(record,{format='standard',intro='',closing='',link=''}={}){
 const area=record.area.split('\n')[0]||'担当者にご確認ください';
 const body=format==='short' ? `${record.year}の方へ、${record.name.replace('＊登録','')}のご案内です。\n${record.summary}` : `【${record.name.replace('＊登録','')}｜${record.year}】\n\n${record.summary}\n\n■ 対象卒年度\n${record.year}\n\n■ 求人対応エリア\n${area}`;
 return [intro.trim(),body,link?`■ ${record.kind==='登録'?'登録':'申し込み'}はこちら\n${link}`:'詳細・申込方法は担当者にお問い合わせください。','※利用条件・最新の受付状況は事前にご確認ください。求人の紹介・内定を保証するものではありません。',closing.trim()].filter(Boolean).join('\n\n');
}
export const lineURL=text=>'https://line.me/R/share?text='+encodeURIComponent(text);
let syncGate=true;
export const setSyncGate=value=>{syncGate=value};
export function isShareable(record,reviewed,text){
 return Boolean(syncGate&&record?.current&&reviewed&&text.trim()&&text.length<=4000);
}
