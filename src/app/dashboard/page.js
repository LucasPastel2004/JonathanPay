"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // New Group State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([""]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("@splitbill:currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Fetch from backend API
    fetch(`/api/groups?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setGroups(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load generic groups", err);
        setLoading(false);
      });
  }, [router]);

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
    
    // Inclui e limpa strings
    const validMembers = [
      ...new Set(newGroupMembers.map(m => m.trim()).filter(m => m !== ""))
    ];

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          ownerId: currentUser.id,
          participants: validMembers
        })
      });

      if (!res.ok) throw new Error("Erro ao criar");
      const newGroup = await res.json();
      
      // Reset Modal & redirect
      setShowModal(false);
      router.push(`/group/${newGroup.id}`);

    } catch (err) {
      alert("Falha de comunicação: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("@splitbill:currentUser");
    router.push("/");
  };

  if (!currentUser) return null;

  return (
    <div className="app-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
      <header className="header" style={{alignItems: 'flex-start'}}>
        <div>
          <h1 style={{fontSize: '28px', fontWeight: 700}}>Meus Grupos</h1>
          <p style={{color: 'var(--text-secondary)'}}>Bem-vindo, {currentUser.name}!</p>
        </div>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
          <button className="btn btn-secondary" onClick={() => router.push('/search')}>
            🔍 Preços Médios
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Novo Grupo
          </button>
          <button className="btn btn-danger" onClick={handleLogout} style={{background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)'}}>
            Sair
          </button>
        </div>
      </header>

      {/* New Group Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{background: '#1f2937', width: '90%', maxWidth: '500px'}}>
            <h2 style={{marginBottom: '16px', color: 'white'}}>Criar Novo Grupo</h2>
            
            <form onSubmit={handleCreateGroup} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>Nome do Grupo</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  placeholder="Ex: Viagem para Ubatuba"
                  style={{width: '100%'}}
                  autoFocus
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>Participantes Iniciais (Opcional)</label>
                <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px'}}>Você já está no grupo. Seus amigos também poderão entrar depois por um Link de Convite.</p>
                {newGroupMembers.map((m, i) => (
                  <div key={i} style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                    <input 
                      type="text" 
                      value={m} 
                      onChange={e => updateMemberName(i, e.target.value)} 
                      placeholder={`Amigo (ex: Maria)`}
                      style={{flex: 1}}
                    />
                    <button type="button" onClick={() => removeMemberInput(i)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '20px', cursor: 'pointer'}}>×</button>
                  </div>
                ))}
                <button type="button" onClick={handleAddMemberInput} className="btn btn-secondary" style={{fontSize: '12px', padding: '6px 12px', marginTop: '4px'}}>
                  + Adicionar nome
                </button>
              </div>

              <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                <button type="button" className="btn btn-secondary" style={{flex: 1}} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{flex: 1}}>Criar Grupo no Servidor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign: 'center', padding: '40px', color: 'white'}}>Buscando grupos online...</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
          {groups.map(g => (
            <div key={g.id} className="glass-panel" style={{cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column'}} onClick={() => router.push(`/group/${g.id}`)}>
              <h2 style={{fontSize: '20px', marginBottom: '8px'}}>{g.name}</h2>
              <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '14px', marginTop: 'auto'}}>
                <span>👥 {g.members} membros</span>
                <span style={{color: 'var(--success)', fontWeight: 600}}>Ver contas →</span>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)'}}>
              Você ainda não tem grupos ou não foi convidado para nenhum. Crie um para começar a dividir!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
