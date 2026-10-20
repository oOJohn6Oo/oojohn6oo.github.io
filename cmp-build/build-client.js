import {publicationURL,validateCredentials,encryptCredentials,loadPublicKey} from './credential-crypto.js';
const REPOSITORY='oOJohn6Oo/ohos-cmp-builder';
const API='https://vjmzpjoqgjuvlaubmjgm.supabase.co/functions/v1/submit-build';
const attempts=new Map();

export const normalizeSuffix=value=>value.trim().replace(/^-+/,'');
export const validSuffix=value=>/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)&&/[0-9]$/.test(value)&&!/^1\.(12\.0|9\.2)/.test(value);

export function buildRequest(branches,dependencies,suffix,url){
 const sources={};
 for(const [key,repository] of Object.entries({core:'CPF-KMP-CMP/compose-multiplatform-core',cmp:'CPF-KMP-CMP/compose-multiplatform'})){
  const b=branches[key];
  if(!b?.name||! /^[0-9a-f]{40}$/.test(b.sha||''))throw new Error(`请选择 ${key==='core'?'CMP Core':'CMP'} 分支并获取提交 SHA`);
  if(b.repository!==repository)throw new Error('仅支持 CPF 的两个源码仓库');
  sources[key]={repository,branch:b.name,sha:b.sha};
 }
 suffix=normalizeSuffix(suffix);
 if(!validSuffix(suffix))throw new Error('请填写有效后缀，并以数字结尾');
 const destination=publicationURL(url);
 const choices={};
 for(const [key,item] of Object.entries(dependencies)){
  if(!['default','latest','custom'].includes(item.mode))throw new Error('依赖模式无效');
  choices[key]={mode:item.mode};
  if(item.mode==='custom'){
   const v=(item.version||'').trim();
   if(!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/.test(v))throw new Error(`请填写 ${key} 的有效版本`);
   choices[key].version=v;
  }
 }
 return {schema_version:1,sources,suffix,publish_url:destination,dependencies:choices};
}

export function workflowURL(mode){
 return `https://github.com/${REPOSITORY}/actions/workflows/${mode==='debug'?'debug':'build'}.yml`;
}

export async function submitBuild(mode,request,credentials,{fetcher=fetch,publicConfig}={}){
 if(!['debug','publish'].includes(mode))throw new Error('构建模式无效');
 validateCredentials(credentials.username,credentials.password);
 const serialized=JSON.stringify(request);
 // 只用摘要关联当前页面的提交；修改配置或账号密码后视为新的任务。
 const bytes=new TextEncoder().encode(JSON.stringify([mode,serialized,credentials.username,credentials.password]));
 const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
 bytes.fill(0);
 const now=Math.floor(Date.now()/1000);
 for(const [key,attempt] of attempts)if(attempt.expiresAt<=now)attempts.delete(key);
 let attempt=attempts.get(key);
 if(!attempt){
  attempt={expiresAt:now+86400};
  attempts.set(key,attempt);
  // 同一次提交重试时复用加密包，服务端据此识别重复请求；不写入浏览器存储。
  attempt.encrypted=(async()=>JSON.parse(await encryptCredentials(credentials.username,credentials.password,serialized,publicConfig||await loadPublicKey(fetcher),attempt.expiresAt)))();
  attempt.encrypted.catch(()=>attempts.delete(key));
 }
 if(attempt.result)return {...attempt.result,reused:true};
 if(attempt.failed)throw attempt.failed;
 if(attempt.pending)return attempt.pending;
 attempt.pending=(async()=>{
  const encrypted=await attempt.encrypted;
  let response;
  try{
   response=await fetcher(API,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode,request_json:serialized,credentials:encrypted}),
    credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000),
   });
  }catch{throw new Error('提交结果未确认，请在当前页面重试');}
  let result;
  try{result=await response.json();}catch{throw new Error('提交结果未确认，请在当前页面重试');}
  if(!result||typeof result!=='object')throw new Error('任务响应不完整，请在当前页面重试');
  const id=typeof result.id==='string'&&/^[1-9][0-9]*$/.test(result.id)?result.id:null;
  if(!response.ok){
   const message=typeof result.error==='string'?result.error:`提交失败（HTTP ${response.status}）`;
   const error=new Error(id?`任务 #${id}：${message}`:message);
   error.id=id;error.status=result.status;
   if(id&&result.status==='failed')attempt.failed=error;
   throw error;
  }
  if(!id||!['pending','running','succeeded','failed'].includes(result.status))throw new Error('任务响应不完整，请在当前页面重试');
  attempt.result={id,status:result.status,url:workflowURL(mode)};
  return {...attempt.result,reused:false};
 })();
 try{return await attempt.pending;}finally{attempt.pending=null;}
}
