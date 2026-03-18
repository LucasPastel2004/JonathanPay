"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // If the user's real session is available, redirect them securely
    if (status === "authenticated") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/dashboard";
      router.push(redirect);
    }
  }, [status, router]);

  const handleGoogleLogin = () => {
    // Calling next-auth provider internally
    signIn("google");
  };

  if (status === "loading") {
    return <div style={{width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white'}}>Carregando acesso seguro...</div>;
  }

  return (
    <div style={{
      animation: 'fadeIn 0.5s ease-out',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)'
    }}>
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px", width: "90%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "16px", fontSize: "32px", fontWeight: "700" }}>Jonathan Pay 💸</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          Suas contas divididas com a nuvem. Entre para começar de verdade:
        </p>
          
        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-primary" 
          style={{ width: "100%", padding: "14px", fontSize: "16px", marginTop: "8px", display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
        >
          <img src="https://authjs.dev/img/providers/google.svg" width="24" height="24" alt="Google Logo" />
          Entrar com o Google
        </button>

        <p style={{ color: "var(--text-secondary)", marginTop: "24px", fontSize: "12px" }}>
          Ao iniciar você concorda que o Jonathan Pay usa AuthJS do Google Cloud para proteção dos seus dados online.
        </p>
      </div>
    </div>
  );
}
