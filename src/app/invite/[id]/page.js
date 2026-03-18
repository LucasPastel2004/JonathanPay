"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";

export default function InvitePage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;
  const [status, setStatus] = useState("Verificando identificação...");

  useEffect(() => {
    const processInvite = async () => {
      // Check Auth
      const userStr = localStorage.getItem("@splitbill:currentUser");
      if (!userStr) {
        // Redireciona pro Login com o Redirect path
        router.push(`/?redirect=/invite/${groupId}`);
        return;
      }
      
      const user = JSON.parse(userStr);
      setStatus(`Olá ${user.name}! Processando convite...`);

      try {
        const res = await fetch(`/api/groups/${groupId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        
        if (res.ok) {
          setStatus("Tudo certo! Redirecionando para o carrinho...");
          setTimeout(() => router.push(`/group/${groupId}`), 1000);
        } else {
          setStatus("Oops! Grupo não existe ou link incorreto.");
        }
      } catch(err) {
        setStatus("Erro de conexão no convite.");
      }
    };

    processInvite();
  }, [groupId, router]);

  return (
    <div className="login-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px", width: "100%", maxWidth: "400px" }}>
         <h1 style={{ marginBottom: "16px", fontSize: "28px" }}>Link de Convite 🔗</h1>
         <p style={{ color: "var(--text-secondary)" }}>{status}</p>
         {status.includes("Oops") || status.includes("Erro") ? (
           <button className="btn btn-secondary" style={{marginTop: '24px', width: '100%'}} onClick={() => router.push('/dashboard')}>Voltar pro Início</button>
         ) : null}
      </div>
    </div>
  );
}
