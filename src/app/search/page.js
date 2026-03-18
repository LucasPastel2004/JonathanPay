"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.shopping_results || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
      <header className="header" style={{ marginBottom: '24px' }}>
        <div>
          <button className="btn btn-secondary" style={{padding: '8px 16px', marginBottom: '16px', fontSize: '14px'}} onClick={() => router.push('/dashboard')}>
            ← Voltar
          </button>
          <h1 style={{fontSize: '28px', fontWeight: 600}}>Google Shopping API (Mock)</h1>
          <p style={{color: 'var(--text-secondary)'}}>Confira o preço médio na sua região antes de adicionar à conta.</p>
        </div>
      </header>

      <div className="glass-panel" style={{marginBottom: '24px'}}>
        <form onSubmit={handleSearch} style={{display: 'flex', gap: '12px'}}>
          <input 
            type="text" 
            placeholder="Buscar produto (ex: Pão de Alho)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{flex: 1}}
          />
          <button type="submit" className="btn btn-primary" style={{padding: '0 24px'}} disabled={loading}>
            {loading ? 'Buscando...' : 'Pesquisar'}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="glass-panel">
          <h3 style={{marginBottom: '16px', fontSize: '18px'}}>Resultados encontrados</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {results.map((r, i) => (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', alignItems: 'center'}}>
                <div>
                  <div style={{fontWeight: 500}}>{r.title}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Loja: {r.source}</div>
                </div>
                <div style={{fontWeight: 600, color: 'var(--success)'}}>R$ {r.extracted_price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <div style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px'}}>
          Nenhum produto encontrado para "{query}". Tente buscar por "Picanha" ou "Cerveja".
        </div>
      )}

    </div>
  );
}
