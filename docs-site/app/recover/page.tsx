"use client";

/** Developer password recovery screen with production-safe generic responses. */

import Link from "next/link";
import { useState } from "react";
import { developerApi } from "../../lib/developer-api";
import { EXTERNAL_AUTH, identity } from "../../lib/identity";

export default function RecoverPage() {
  const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [token,setToken]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setLoading(true);try{if(EXTERNAL_AUTH){await identity.recover(email,`${window.location.origin}/reset`).catch(()=>undefined);setMessage("If that account exists, a recovery link is on its way.");}else{const result=await developerApi.requestRecovery(email);setMessage(result.message);setToken(result.debugToken??"");}}finally{setLoading(false);}}
  return <main className="auth-page"><div className="auth-intro"><p className="eyebrow">Account recovery</p><h1>Return to your developer console.</h1><p>We never disclose whether an email is registered. Production delivery requires the selected auth/email provider.</p><Link href="/login">← Back to sign in</Link></div><div className="auth-card"><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/></label><button className="console-primary" disabled={loading}>{loading?"Preparing…":"Request reset"}</button></form>{message&&<p className="auth-hint">{message}</p>}{token&&<><label>Local debug token<input value={token} readOnly/></label><Link href="/reset">Continue to reset →</Link></>}</div></main>;
}
