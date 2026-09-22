export function draft(record,{format='full',intro='',closing='',link=''}={}){
 const area=record.area.split('\n')[0]||'担当者にご確認ください';
 const body=format==='full'
  ? `【${record.name.replace('＊登録','')}｜${record.year}】\n\n${record.summary}\n\n■ 対象卒年度\n${record.year}\n\n${detailFields(record).map(([label,value])=>`■ ${label}\n${value}`).join('\n\n')}`
  : format==='short' ? `${record.year}の方へ、${record.name.replace('＊登録','')}のご案内です。\n${record.summary}` : `【${record.name.replace('＊登録','')}｜${record.year}】\n\n${record.summary}\n\n■ 対象卒年度\n${record.year}\n\n■ 求人対応エリア\n${area}`;
 return [intro.trim(),body,link?`■ ${record.kind==='登録'?'登録':'申し込み'}はこちら\n${link}`:'詳細・申込方法は担当者にお問い合わせください。','※利用条件・最新の受付状況は事前にご確認ください。求人の紹介・内定を保証するものではありません。',closing.trim()].filter(Boolean).join('\n\n');
}
export const lineURL=text=>'https://line.me/R/share?text='+encodeURIComponent(text);
export function detailFields(record){
 return [
  ['学歴','education'],['院生可否','graduate'],['理系可否','science'],['海外国籍','nationality'],
  ['短大可否','junior'],['専門可否','vocational'],['求人対応エリア','area'],['その他セグメント','conditions']
 ].map(([label,key])=>[label,String(record[key]??'').trim()?String(record[key]):'未記載・要確認']);
}
export function detailText(record,index=null){
 const fields=detailFields(record);
 if(index!==null){
  if(!Number.isInteger(index)||index<0||index>=fields.length)throw new RangeError('Unknown detail field');
  return fields[index].join('\n');
 }
 return [`【${record.name}｜${record.year}】`,...fields.map(([label,value])=>`■ ${label}\n${value}`)].join('\n\n');
}
let syncGate=true,syncReason='',validUntil=Infinity;
export const setSyncGate=(value,reason='',deadline=Infinity)=>{syncGate=value;syncReason=reason;validUntil=deadline};
export const getSyncBlockReason=()=>!syncGate?(syncReason||'データの更新確認が必要です。'):Date.now()>=validUntil?'最終同期から3時間以上経過したため、コピー・共有を停止しています。管理者によるシート同期が必要です。':'';
export const detailCopyBlockReason=record=>getSyncBlockReason()||(!record?.current?'停止中の案件はコピーできません。':'');
export function shareBlockReason(record,reviewed,text){
 return getSyncBlockReason()||(!record?.current?'停止中の案件は共有できません。':!text.trim()?'紹介文を入力してください。':text.length>4000?'紹介文を4,000字以内にしてください。':!reviewed?'最新条件と本文を確認し、確認欄にチェックしてください。':'');
}
export function isShareable(record,reviewed,text){
 return !shareBlockReason(record,reviewed,text);
}
