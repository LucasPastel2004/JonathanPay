"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const urlParams = new URLSearchParams(window.location.search);
      const rawRedirect = urlParams.get("redirect");
      const redirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
      router.push(redirect);
    }
  }, [status, router]);

  const handleGoogleLogin = () => {
    signIn("google");
  };

  if (status === "loading") {
    return (
      <div style={{width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px'}}>
        <div className="spinner" />
        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Carregando acesso seguro...</p>
      </div>
    );
  }

  return (
    <div style={{
      animation: 'fadeIn 0.5s ease-out',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ textAlign: "center", padding: "48px 40px", width: "100%", maxWidth: "420px" }}>
        
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>💸</div>
        <h1 style={{ marginBottom: "8px", fontSize: "28px", fontWeight: "700", background: 'linear-gradient(135deg, #f8fafc, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Jonathan Pay
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "36px", fontSize: "14px", lineHeight: '1.5' }}>
          Divida contas, rastreie gastos e gere Pix automaticamente — tudo sincronizado na nuvem.
        </p>
          
        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-google" 
          style={{ width: "100%", padding: "14px 24px", fontSize: "15px" }}
        >
          <img src="https://authjs.dev/img/providers/google.svg" width="20" height="20" alt="Google" />
          Continuar com o Google
        </button>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>🔒 Seguro</span>
          <span>☁️ Na nuvem</span>
          <span>⚡ Instantâneo</span>
        </div>

        <p style={{ color: "rgba(148,163,184,0.5)", marginTop: "24px", fontSize: "11px" }}>
          Protegido por Google OAuth e NextAuth.js
        </p>
      </div>
    </div>
  );
}
