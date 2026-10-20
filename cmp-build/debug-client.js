import {publicationURL,validateCredentials,encryptCredentials,loadPublicKey} from './credential-crypto.js';
const REPOSITORY='oOJohn6Oo/ohos-cmp-builder';
const API=`https://api.github.com/repos/${REPOSITORY}`;
const WORKFLOW_URL=`https://github.com/${REPOSITORY}/actions/workflows/debug.yml`;
const STORAGE_KEY='cmp-debug-request-v1';

export const normalizeSuffix=value=>value.trim().replace(/^-+/,'');
export const validSuffix=value=>/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)&&/[0-9]$/.test(value)&&!/^1\.(12\.0|9\.2)/.test(value);

export function buildDebugRequest(branches,dependencies,suffix,url){
 const sources={};
 for(const [key,repository] of Object.entries({core:'CPF-KMP-CMP/compose-multiplatform-core',cmp:'CPF-KMP-CMP/compose-multiplatform'})){
  const b=branches[key];
  if(!b?.name||! /^[0-9a-f]{40}$/.test(b.sha||''))throw new Error(`请选择 ${key==='core'?'CMP Core':'CMP'} 分支并获取提交 SHA`);
  if(b.repository!==repository)throw new Error('Debug 仅支持 CPF 的两个源码仓库');
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

export function getDebugAttempt(request,storage){
 const serialized=JSON.stringify(request);
 try{
  const old=JSON.parse(storage.getItem(STORAGE_KEY)||'null');
  if(old?.serialized===serialized&&/^[0-9a-f-]{36}$/.test(old.id))return old;
 }catch{}
 const attempt={id:crypto.randomUUID(),serialized};
 // Refuse to submit if retry identity cannot be retained for this tab.
 storage.setItem(STORAGE_KEY,JSON.stringify(attempt));
 return attempt;
}

export async function dispatchDebug(request,token,credentials,{fetcher=fetch,storage=sessionStorage,publicConfig}={}){
 if(!token.trim())throw new Error('请填写有 Actions 写入权限的 GitHub Token');
 validateCredentials(credentials.username,credentials.password);
 const attempt=getDebugAttempt(request,storage);
 const safeURL=url=>typeof url==='string'&&new RegExp(`^https://github\\.com/${REPOSITORY}/actions/(runs/\\d+|workflows/debug\\.yml)$`,'i').test(url);
 if(attempt.accepted&&safeURL(attempt.url))return {id:attempt.id,url:attempt.url,reused:true};
 const encrypted=await encryptCredentials(credentials.username,credentials.password,attempt.id,attempt.serialized,publicConfig||await loadPublicKey(fetcher));
 const headers={'Accept':'application/vnd.github+json','Authorization':`Bearer ${token.trim()}`,'X-GitHub-Api-Version':'2026-03-10'};
 const call=async(path,options={})=>{
  let response;
  try{response=await fetcher(API+path,{...options,headers:{...headers,...options.headers},credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});}
  catch{throw new Error('网络请求未确认，请重试；相同配置会沿用请求号，避免重复构建');}
  if(!response.ok){
   if(response.status===404)throw new Error('构建仓库或 Debug 工作流不可访问，请确认工作流已上传且 Token 有权限');
   if([401,403].includes(response.status))throw new Error('GitHub 授权失败，需要该构建仓库的 Actions 写入权限');
   throw new Error(`GitHub 请求失败（HTTP ${response.status}）`);
  }
  return response;
 };
 const repository=await (await call('')).json();
 if(typeof repository.default_branch!=='string')throw new Error('未获取到构建仓库默认分支');
 const response=await call('/actions/workflows/debug.yml/dispatches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:repository.default_branch,inputs:{request_id:attempt.id,request:attempt.serialized,credentials:encrypted}})});
 let result={};
 if(response.status!==204){try{result=await response.json();}catch{}}
 const url=safeURL(result.html_url)?result.html_url:WORKFLOW_URL;
 storage.setItem(STORAGE_KEY,JSON.stringify({...attempt,accepted:true,url}));
 return {id:attempt.id,url,reused:false};
}
