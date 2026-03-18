"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, use } from "react";
import { useSession } from "next-auth/react";

export default function GroupPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;
  const { data: session, status } = useSession();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [groupMembersList, setGroupMembersList] = useState([]);
  
  const [cart, setCart] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', paidBy: '' });
  const [memberPixKeys, setMemberPixKeys] = useState({});
  const [paymentModal, setPaymentModal] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) {
          const errData = await res.json().catch(()=>({}));
          alert("Erro: " + (errData.error || "Grupo não encontrado."));
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        setGroup({ id: data.id, name: data.name });
        setGroupMembersList(data.membersList || []);
        setCart(data.cart || []);
        setMemberPixKeys(data.memberPixKeys || {});
        setLoadingPage(false);
      } catch(e) {
        alert("Falha de conexão.");
        router.push("/dashboard");
      }
    };

    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user) {
      setCurrentUser(session.user);
      setNewItem(prev => ({ ...prev, paidBy: session.user.name }));
      fetchGroupData();
    }
  }, [groupId, router, status, session]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    
    setAddingItem(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          price: parseFloat(newItem.price),
          paidByName: newItem.paidBy,
          consumersNames: groupMembersList
        })
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setNewItem({ name: '', price: '', paidBy: currentUser?.name || '' });
      const d = await fetch(`/api/groups/${groupId}`);
      const data = await d.json();
      setGroupMembersList(data.membersList || []);
      setCart(data.cart || []);
      setMemberPixKeys(data.memberPixKeys || {});
    } catch(err) {
      alert(err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const toggleMemberInItem = async (itemId, memberName) => {
    try {
      await fetch(`/api/groups/${groupId}/items/${itemId}/consume`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: memberName })
      });
      
      setCart(cart.map(item => {
        if (item.id !== itemId) return item;
        const isIncluded = item.splitAmong.includes(memberName);
        const newSplit = isIncluded 
          ? item.splitAmong.filter(m => m !== memberName) 
          : [...item.splitAmong, memberName];
        return { ...item, splitAmong: newSplit.length > 0 ? newSplit : [memberName] };
      }));
    } catch(err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await fetch(`/api/groups/${groupId}/items/${itemId}`, { method: 'DELETE' });
      setCart(cart.filter(item => item.id !== itemId));
    } catch(err) {
      alert("Erro ao excluir.");
    }
  };

  const handleUpdatePixKey = async (key) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: currentUser.name, pixKey: key })
      });
      if (res.ok) {
        setMemberPixKeys({ ...memberPixKeys, [currentUser.name]: key });
      }
    } catch(err) {
      console.error("Falha ao atualizar PIX");
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite/${groupId}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado! Envie para seus amigos:\n\n" + link);
  };

  const generatePix = async (trx) => {
    const receiverKey = memberPixKeys[trx.to];
    if (!receiverKey) {
      alert(`${trx.to} não tem chave Pix cadastrada!`);
      return;
    }

    setLoadingPix(true);
    setPaymentModal({ ...trx, qrData: null });
    try {
      const url = `/api/pix?nome=${encodeURIComponent(trx.to)}&cidade=SaoPaulo&valor=${trx.amount.toFixed(2)}&chave=${encodeURIComponent(receiverKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao gerar PIX");
      const data = await res.json();
      setPaymentModal({ ...trx, qrData: data });
    } catch (err) {
      alert("Erro ao gerar QR Code: " + err.message);
      setPaymentModal(null);
    } finally {
      setLoadingPix(false);
    }
  };

  const total = cart.reduce((acc, curr) => acc + curr.price, 0);

  const calculateDebts = useMemo(() => {
    let balances = {};
    groupMembersList.forEach(m => balances[m] = 0);
    
    cart.forEach(item => {
      balances[item.paidBy] = (balances[item.paidBy] || 0) + item.price;
      const splitAmount = item.price / item.splitAmong.length;
      item.splitAmong.forEach(consumer => {
        balances[consumer] = (balances[consumer] || 0) - splitAmount;
      });
    });

    const debtors = [];
    const creditors = [];

    Object.keys(balances).forEach(person => {
      if (balances[person] < -0.01) debtors.push({ person, amount: Math.abs(balances[person]) });
      else if (balances[person] > 0.01) creditors.push({ person, amount: balances[person] });
    });

    let transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];
      
      let amount = Math.min(debtor.amount, creditor.amount);
      transactions.push({ from: debtor.person, to: creditor.person, amount });
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return transactions;
  }, [cart, groupMembersList]);

  if (loadingPage || !currentUser) {
    return (
      <div style={{width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px'}}>
        <div className="spinner" />
        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Carregando grupo...</p>
      </div>
    );
  }

  return (
    <div className="app-container animate-fade">
      
      {/* Pix Payment Modal */}
      {paymentModal && paymentModal.qrData && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPaymentModal(null)}>
          <div className="glass-panel animate-slide" style={{background: 'rgba(15, 17, 28, 0.95)', textAlign: 'center', width: '90%', maxWidth: '400px'}}>
            <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px'}}>Pagamento via Pix para</p>
            <h2 style={{marginBottom: '20px', color: 'var(--success)', fontSize: '20px'}}>{paymentModal.to}</h2>
            <div style={{background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px'}}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentModal.qrData.brcode)}`} alt="QR Code Pix" style={{width: '200px', height: '200px', display: 'block'}} />
            </div>
            <p style={{color: 'white', fontWeight: 'bold', fontSize: '28px', marginBottom: '4px'}}>R$ {paymentModal.amount.toFixed(2)}</p>
            <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px'}}>Toque no campo abaixo para copiar:</p>
            <textarea 
              readOnly 
              value={paymentModal.qrData.brcode} 
              style={{width: '100%', height: '70px', fontSize: '11px', marginBottom: '16px', resize: 'none', borderRadius: '8px', cursor: 'pointer'}} 
              onClick={(e) => { e.target.select(); navigator.clipboard.writeText(paymentModal.qrData.brcode); alert("Código PIX copiado! ✅") }}
            />
            <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => setPaymentModal(null)}>Fechar</button>
          </div>
        </div>
      )}

      {/* Loading Pix Overlay */}
      {loadingPix && (
        <div className="modal-overlay">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
            <div className="spinner" style={{width: '48px', height: '48px', borderWidth: '4px'}} />
            <p style={{color: 'white', fontSize: '16px'}}>Gerando QR Code Pix...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-secondary" style={{padding: '6px 14px', marginBottom: '12px', fontSize: '13px'}} onClick={() => router.push('/dashboard')}>
            ← Voltar
          </button>
          <h1 style={{fontSize: '26px', fontWeight: 600, marginBottom: '4px'}}>{group.name}</h1>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>
            Total: <span style={{color: 'var(--success)', fontWeight: 700, fontSize: '16px'}}>R$ {total.toFixed(2)}</span>
          </p>
        </div>
        <div>
          <button className="btn btn-primary" style={{padding: '10px 16px', fontSize: '13px', background: 'linear-gradient(135deg, var(--success), #059669)'}} onClick={copyInviteLink}>
            🔗 Convidar
          </button>
        </div>
      </header>

      <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
        
        {/* Members & Pix Keys */}
        <div className="glass-panel" style={{borderColor: 'var(--primary-hover)'}}>
          <h3 style={{marginBottom: '14px', fontSize: '16px', fontWeight: 600}}>👥 Participantes</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {groupMembersList.map(m => {
              const isMe = m === currentUser.name;
              const hasKey = !!memberPixKeys[m];
              
              return (
                <div key={m} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: isMe ? 'rgba(139, 92, 246, 0.08)' : 'rgba(0,0,0,0.2)', borderRadius: '10px', border: isMe ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent'}}>
                  <div style={{fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--primary-color)' : 'white', fontSize: '14px'}}>
                    {m} {isMe && <span className="badge badge-success" style={{marginLeft: '6px'}}>Você</span>}
                  </div>
                  <div>
                    {isMe ? (
                      <input 
                        type="text" 
                        placeholder="Sua chave Pix" 
                        value={memberPixKeys[m] || ''} 
                        onChange={e => setMemberPixKeys({ ...memberPixKeys, [m]: e.target.value })}
                        onBlur={e => handleUpdatePixKey(e.target.value)}
                        style={{padding: '6px 12px', fontSize: '13px', width: '200px'}}
                      />
                    ) : (
                      <span className={`badge ${hasKey ? 'badge-success' : 'badge-warning'}`}>
                        {hasKey ? "✓ Chave salva" : "⏳ Aguardando"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Item Form */}
        <div className="glass-panel">
          <h3 style={{marginBottom: '14px', fontSize: '16px', fontWeight: 600}}>🛒 Adicionar Item</h3>
          <form onSubmit={handleAddItem} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <input 
              type="text" 
              placeholder="Produto (ex: Refrigerante)"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
              style={{flex: '1 1 180px'}}
            />
            <input 
              type="number" 
              placeholder="R$ 0,00"
              value={newItem.price}
              onChange={e => setNewItem({...newItem, price: e.target.value})}
              style={{flex: '1 1 90px'}}
              step="0.01"
            />
            <select 
              value={newItem.paidBy} 
              onChange={e => setNewItem({...newItem, paidBy: e.target.value})}
              style={{flex: '1 1 130px'}}
            >
              <option value={currentUser.name}>Eu paguei</option>
              {groupMembersList.filter(m => m !== currentUser.name).map(m => (
                <option key={m} value={m}>{m} pagou</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" style={{flex: '1 1 110px', fontSize: '14px'}} disabled={addingItem}>
              {addingItem ? 'Salvando...' : '+ Adicionar'}
            </button>
          </form>
        </div>

        {/* Cart Items */}
        <div className="glass-panel">
          <h3 style={{marginBottom: '14px', fontSize: '16px', fontWeight: 600}}>📦 Itens no Carrinho ({cart.length})</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {cart.map(item => (
              <div key={item.id} className="item-card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '15px'}}>{item.name}</div>
                    <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px'}}>Pago por <strong style={{color: 'var(--primary-color)'}}>{item.paidBy}</strong></div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{fontWeight: 600, color: 'white', fontSize: '15px'}}>R$ {item.price.toFixed(2)}</div>
                    <button onClick={() => removeItem(item.id)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px', borderRadius: '6px', transition: 'background 0.2s'}} onMouseOver={e => e.target.style.background = 'var(--danger-glow)'} onMouseOut={e => e.target.style.background = 'transparent'}>✕</button>
                  </div>
                </div>
                
                <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px'}}>Quem consumiu:</div>
                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                  {groupMembersList.map(member => {
                    const isSelected = item.splitAmong.includes(member);
                    return (
                      <button 
                        type="button"
                        key={member}
                        onClick={() => toggleMemberInItem(item.id, member)}
                        className={`pill-btn ${isSelected ? 'active' : ''}`}
                      >
                        {isSelected ? '✓ ' : ''}{member}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                <div style={{fontSize: '32px', marginBottom: '8px'}}>🛒</div>
                Carrinho vazio. Adicione o primeiro item!
              </div>
            )}
          </div>
        </div>

        {/* Debt Settlement */}
        <div className="glass-panel" style={{borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.03)'}}>
          <h3 style={{marginBottom: '6px', fontSize: '16px', fontWeight: 600}}>⚡ Acerto de Contas</h3>
          <p style={{color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '13px'}}>Transações otimizadas para o menor número de transferências:</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
             {calculateDebts.map((trx, i) => (
                <div key={i} className="debt-row">
                  <div>
                    <div style={{fontSize: '14px', marginBottom: '2px'}}>
                      <strong style={{color: 'var(--danger)'}}>{trx.from}</strong>
                      <span style={{color: 'var(--text-secondary)', margin: '0 6px'}}>→</span>
                      <strong style={{color: 'var(--success)'}}>{trx.to}</strong>
                    </div>
                    <span style={{fontWeight: 700, fontSize: '16px'}}>R$ {trx.amount.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => generatePix(trx)}
                    className="btn btn-primary" 
                    style={{padding: '8px 16px', fontSize: '13px'}}
                  >
                    💸 Gerar Pix
                  </button>
                </div>
             ))}
             {calculateDebts.length === 0 && (
               <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                 <div style={{fontSize: '32px', marginBottom: '8px'}}>✅</div>
                 Tudo certo! Ninguém deve nada.
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
