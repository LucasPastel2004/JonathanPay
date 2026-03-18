"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the user is already logged in, redirect them
    const currentUser = localStorage.getItem("@splitbill:currentUser");
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Por favor, informe seu nome.");
    
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      if (!res.ok) throw new Error("Erro de conexão");
      
      const userData = await res.json();
      
      localStorage.setItem("@splitbill:currentUser", JSON.stringify(userData));
      
      // Redirect to requested path if it exists (e.g., from an invite)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      router.push(redirect || "/dashboard");
    } catch (err) {
      alert("Erro ao validar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "16px", fontSize: "32px", fontWeight: "700" }}>SplitBill 💸</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          Suas contas divididas com a nuvem. Entre para começar:
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>Como você se chama?</label>
            <input 
              type="text" 
              placeholder="Digite seu nome (Simulação de Login)" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              autoFocus
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "14px", fontSize: "16px", marginTop: "8px" }}>
            {loading ? "Entrando..." : "Continuar com o Google (Simulado)"}
          </button>
        </form>

        <p style={{ color: "var(--text-secondary)", marginTop: "24px", fontSize: "12px" }}>
          *Esta aplicação usa backend real (SQLite). Crie um perfil para testar online.
        </p>
      </div>
    </div>
  );
}
