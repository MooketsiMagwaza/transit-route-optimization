"use client";

/** One-use developer password reset form; existing sessions are invalidated server-side. */

import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import { developerApi } from "../../lib/developer-api";
import { EXTERNAL_AUTH, identity, sessionFromHash } from "../../lib/identity";

export default function ResetPage(){const[token,setToken]=useState("");const[password,setPassword]=useState("");const[message,setMessage]=useState("");const[error,setError]=useState("");useEffect(()=>{if(!EXTERNAL_AUTH)return;const result=sessionFromHash(window.location.hash);window.history.replaceState(null,"",window.location.pathname);setTimeout(()=>{if(result?.accessToken)setToken(result.accessToken);else setError(result?.error??"Open the recovery link from your email to continue.");},0);},[]);async function submit(event:React.FormEvent){event.preventDefault();setError("");try{if(EXTERNAL_AUTH)await identity.updatePassword(token,password);else await developerApi.resetPassword(token,password);setMessage("Password updated. Sign in again.");}catch(requestError:unknown){setError(requestError instanceof Error?requestError.message:"Reset failed");}}return <main className="auth-page"><div className="auth-intro"><p className="eyebrow">SECURE RESET</p><h1>Choose a new password.</h1><p>Recovery tokens expire after 30 minutes and work once.</p><Link href="/login">← Back to sign in</Link></div><div className="auth-card"><form onSubmit={submit}>{!EXTERNAL_AUTH&&<label>Recovery token<input value={token} onChange={(event)=>setToken(event.target.value)} required minLength={20}/></label>}<label>New password<input type="password" value={password} onChange={(event)=>setPassword(event.target.value)} minLength={10} required/></label>{error&&<div className="auth-error">{error}</div>}<button className="console-primary">Update password</button></form>{message&&<p className="auth-hint">{message}</p>}</div></main>}
