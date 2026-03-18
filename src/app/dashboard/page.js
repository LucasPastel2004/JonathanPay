"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([""]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user) {
      setCurrentUser(session.user);
      
      fetch(`/api/groups?userId=${session.user.id}`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) setGroups(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load groups", err);
          setLoading(false);
        });
    }
  }, [status, session, router]);

  const handleAddMemberInput = () => {
    setNewGroupMembers([...newGroupMembers, ""]);
  };

  const updateMemberName = (index, value) => {
    const arr = [...newGroupMembers];
    arr[index] = value;
    setNewGroupMembers(arr);
  };

  const removeMemberInput = (index) => {
    setNewGroupMembers(newGroupMembers.filter((_, i) => i !== index));
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return alert("O grupo precisa de um nome.");
    
    const validMembers = [
      ...new Set(newGroupMembers.map(m => m.trim()).filter(m => m !== ""))
    ];

    setCreating(true);
    try {
      if (!currentUser.id) {
         throw new Error("Seu perfil não está no Banco de Dados. Acesse /api/init e faça login novamente.");
      }

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          ownerId: currentUser.id,
          participants: validMembers
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro no servidor");
      }
      
      const newGroup = await res.json();
      setShowModal(false);
      router.push(`/group/${newGroup.id}`);

    } catch (err) {
      alert("Falha: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  if (!currentUser) {
    return (
      <div style={{width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px'}}>
        <div className="spinner" />
        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="app-container animate-fade">
      <header className="header" style={{alignItems: 'flex-start'}}>
        <div>
          <h1 style={{fontSize: '26px', fontWeight: 700, marginBottom: '4px'}}>Meus Grupos</h1>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Olá, <strong style={{color: 'var(--primary-color)'}}>{currentUser.name}</strong> 👋</p>
        </div>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Novo Grupo
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {/* New Group Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="glass-panel animate-slide" style={{background: 'rgba(15, 17, 28, 0.95)', width: '90%', maxWidth: '480px'}}>
            <h2 style={{marginBottom: '4px', color: 'white', fontSize: '20px'}}>Criar Novo Grupo</h2>
            <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px'}}>Adicione um nome e convide participantes iniciais.</p>
            
            <form onSubmit={handleCreateGroup} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500}}>Nome do Grupo</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  placeholder="Ex: Viagem para Ubatuba"
                  autoFocus
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500}}>Participantes (Opcional)</label>
                <p style={{fontSize: '12px', color: 'rgba(148,163,184,0.6)', marginBottom: '10px'}}>Você já está incluído. Amigos podem entrar depois pelo link de convite.</p>
                {newGroupMembers.map((m, i) => (
                  <div key={i} style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                    <input 
                      type="text" 
                      value={m} 
                      onChange={e => updateMemberName(i, e.target.value)} 
                      placeholder={`Nome do amigo`}
                      style={{flex: 1}}
                    />
                    <button type="button" onClick={() => removeMemberInput(i)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '20px', cursor: 'pointer', padding: '0 8px'}}>×</button>
                  </div>
                ))}
                <button type="button" onClick={handleAddMemberInput} className="btn btn-secondary" style={{fontSize: '12px', padding: '6px 14px'}}>
                  + Adicionar
                </button>
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
                <button type="button" className="btn btn-secondary" style={{flex: 1}} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{flex: 1}} disabled={creating}>
                  {creating ? 'Criando...' : '✨ Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
          <div className="spinner" />
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Buscando grupos na nuvem...</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
          {groups.map(g => (
            <div key={g.id} className="glass-panel group-card" onClick={() => router.push(`/group/${g.id}`)}>
              <h2 style={{fontSize: '18px', marginBottom: '12px', fontWeight: 600}}>{g.name}</h2>
              <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '13px', marginTop: 'auto', alignItems: 'center'}}>
                <span>👥 {g.members} {g.members === 1 ? 'membro' : 'membros'}</span>
                <span className="badge badge-success">Ver contas →</span>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>📋</div>
              <h3 style={{color: 'var(--text-main)', marginBottom: '8px', fontWeight: 600}}>Nenhum grupo ainda</h3>
              <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px'}}>Crie seu primeiro grupo e comece a dividir contas com seus amigos!</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Criar meu primeiro grupo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
