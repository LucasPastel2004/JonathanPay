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

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) {
          const errData = await res.json().catch(()=>({}));
          alert("Erro no Servidor ao carregar grupo: " + (errData.error || "Grupo não encontrado ou id inválido."));
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
    
    // Add to backend
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
      // Refresh Data via inline fetch basically
      const d = await fetch(`/api/groups/${groupId}`);
      const data = await d.json();
      setGroupMembersList(data.membersList || []);
      setCart(data.cart || []);
      setMemberPixKeys(data.memberPixKeys || {});
    } catch(err) {
      alert(err.message);
    }
  };

  const toggleMemberInItem = async (itemId, memberName) => {
    try {
      await fetch(`/api/groups/${groupId}/items/${itemId}/consume`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: memberName })
      });
      
      // Optimização Otimista
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
    alert("Link de convite copiado!\n\nEnvie para seus amigos acessarem e entrarem direto no grupo: " + link);
  };

  const generatePix = async (trx) => {
    const receiverKey = memberPixKeys[trx.to];
    if (!receiverKey) {
      alert(`O membro ${trx.to} não tem chave Pix cadastrada!`);
      return;
    }

    setLoadingPix(true);
    setPaymentModal({ ...trx, qrData: null });
    try {
      const url = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(trx.to)}&cidade=SaoPaulo&valor=${trx.amount.toFixed(2)}&chave=${encodeURIComponent(receiverKey)}`;
      const res = await fetch(url);
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

  if (loadingPage || !currentUser) return <div style={{padding: '40px', color: 'white'}}>Carregando do banco de dados...</div>;

  return (
    <div className="app-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
      
      {/* Pix Modal */}
      {paymentModal && paymentModal.qrData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{background: '#1f2937', textAlign: 'center', width: '90%', maxWidth: '400px'}}>
            <h2 style={{marginBottom: '16px', color: 'white'}}>Pagamento para {paymentModal.to}</h2>
            <div style={{background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px'}}>
              <img src={paymentModal.qrData.qrcode} alt="QR Code Pix" style={{width: '200px', height: '200px'}} />
            </div>
            <p style={{color: 'white', fontWeight: 'bold', fontSize: '24px', marginBottom: '8px'}}>R$ {paymentModal.amount.toFixed(2)}</p>
            <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px'}}>Código "Pix Copia e Cola":</p>
            <textarea 
              readOnly 
              value={paymentModal.qrData.brcode} 
              style={{width: '100%', height: '80px', fontSize: '12px', marginBottom: '16px'}} 
              onClick={(e) => { e.target.select(); navigator.clipboard.writeText(paymentModal.qrData.brcode); alert("Copiado!") }}
            />
            <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => setPaymentModal(null)}>Fechar</button>
          </div>
        </div>
      )}

      {loadingPix && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{color: 'white', fontSize: '20px'}}>Gerando QR Code Pix...</div>
        </div>
      )}

      <header className="header" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-secondary" style={{padding: '8px 16px', marginBottom: '16px', fontSize: '14px'}} onClick={() => router.push('/dashboard')}>
            ← Voltar
          </button>
          <h1 style={{fontSize: '28px', fontWeight: 600}}>{group.name}</h1>
          <p style={{color: 'var(--text-secondary)'}}>Total das Compras: <span style={{color: 'var(--success)', fontWeight:'bold'}}>R$ {total.toFixed(2)}</span></p>
        </div>
        <div>
          <button className="btn btn-primary" style={{padding: '8px 16px', fontSize: '14px', background: 'var(--success)'}} onClick={copyInviteLink}>
            🔗 Convidar Pessoas
          </button>
        </div>
      </header>

      <div style={{display: 'grid', gridTemplateColumns: 'reap', gap: '24px'}}>
        
        {/* Members & Pix Keys Config */}
        <div className="glass-panel" style={{borderColor: 'var(--primary-hover)'}}>
          <h3 style={{marginBottom: '16px', fontSize: '18px'}}>Participantes e Chaves Pix</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {groupMembersList.map(m => {
              const isMe = m === currentUser.name;
              const hasKey = !!memberPixKeys[m];
              
              return (
                <div key={m} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isMe ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
                  <div style={{fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--primary-color)' : 'white'}}>
                    {m} {isMe && "(Você)"}
                  </div>
                  <div>
                    {isMe ? (
                      <input 
                        type="text" 
                        placeholder="Na nuvem, chave pix salva real" 
                        value={memberPixKeys[m] || ''} 
                        onChange={e => setMemberPixKeys({ ...memberPixKeys, [m]: e.target.value })}
                        onBlur={e => handleUpdatePixKey(e.target.value)}
                        style={{padding: '6px 12px', fontSize: '14px', width: '250px'}}
                      />
                    ) : (
                      <span style={{fontSize: '12px', color: hasKey ? 'var(--success)' : 'var(--text-secondary)'}}>
                        {hasKey ? "Chave Cadastrada" : "Aguardando chave"}
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
          <h3 style={{marginBottom: '16px', fontSize: '18px'}}>Colocar no Carrinho</h3>
          <form onSubmit={handleAddItem} style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            <input 
              type="text" 
              placeholder="Produto (ex: Refrigerante)"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
              style={{flex: '1 1 200px'}}
            />
            <input 
              type="number" 
              placeholder="R$ 0,00"
              value={newItem.price}
              onChange={e => setNewItem({...newItem, price: e.target.value})}
              style={{flex: '1 1 100px'}}
              step="0.01"
            />
            <select 
              value={newItem.paidBy} 
              onChange={e => setNewItem({...newItem, paidBy: e.target.value})}
              style={{flex: '1 1 150px'}}
            >
              <option value={currentUser.name}>Eu paguei</option>
              {groupMembersList.filter(m => m !== currentUser.name).map(m => (
                <option key={m} value={m}>{m} pagou</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" style={{flex: '1 1 120px'}}>Adicionar Item Real</button>
          </form>
        </div>

        {/* List Cart Items */}
        <div className="glass-panel">
          <h3 style={{marginBottom: '16px', fontSize: '18px'}}>Itens no Carrinho</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {cart.map(item => (
              <div key={item.id} style={{padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid var(--primary-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '16px'}}>{item.name}</div>
                    <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Pago por {item.paidBy}</div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <div style={{fontWeight: 600, color: 'white'}}>R$ {item.price.toFixed(2)}</div>
                    <button onClick={() => removeItem(item.id)} style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '20px'}}>×</button>
                  </div>
                </div>
                
                {/* Member Toggle */}
                <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px'}}>Quem consumiu este item?</div>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  {groupMembersList.map(member => {
                    const isSelected = item.splitAmong.includes(member);
                    return (
                      <button 
                        type="button"
                        key={member}
                        onClick={() => toggleMemberInItem(item.id, member)}
                        style={{
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--surface-border)'}`,
                          background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0,0,0,0.3)',
                          color: isSelected ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: '12px'
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{member}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {cart.length === 0 && <div style={{color:'var(--text-secondary)'}}>O carrinho está vazio. Adicione os primeiros itens na nuvem!</div>}
          </div>
        </div>

        {/* Split Summary Calc */}
        <div className="glass-panel" style={{borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.05)'}}>
          <h3 style={{marginBottom: '16px', fontSize: '18px'}}>Como Acertar as Contas</h3>
          <p style={{color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px'}}>Cálculo automático reduzindo transações desnecessárias:</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
             {calculateDebts.map((trx, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', alignItems: 'center'}}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span><strong style={{color: 'var(--danger)'}}>{trx.from}</strong> deve para <strong style={{color: 'var(--success)'}}>{trx.to}</strong></span>
                    <span style={{fontWeight: 600}}>R$ {trx.amount.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => generatePix(trx)}
                    className="btn btn-primary" 
                    style={{padding: '8px 16px', fontSize: '12px', borderRadius: '8px'}}
                  >
                    Gerar Pix
                  </button>
                </div>
             ))}
             {calculateDebts.length === 0 && (
               <div style={{color: 'var(--text-secondary)', padding: '12px'}}>Tudo certo! Ninguém deve nada no momento.</div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
