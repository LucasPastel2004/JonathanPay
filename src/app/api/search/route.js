import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    // 1. Busca os produtos por nome na Paguei Barato API
    const response = await fetch(`http://localhost:8080/produto`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
      const produtos = await response.json();
      
      // Filtra pelo termo buscado
      const query = q.toLowerCase();
      let results = produtos.filter(p => p.nome && p.nome.toLowerCase().includes(query));
      
      // Limita a 5 resultados para não estourar requisições
      results = results.slice(0, 5);

      // 2. Busca o preço médio (levantamento) para cada produto encontrado
      const shoppingResults = await Promise.all(results.map(async (p) => {
        try {
          const resLevantamento = await fetch(`http://localhost:8080/produto/${p.id}/levantamento`, {
             headers: { "Content-Type": "application/json" }
          });
          if (resLevantamento.ok) {
             const levantamento = await resLevantamento.json();
             // A API retorna o valor x100 ou como float? Segundo o código, o preço é float e já deve estar tratado em ResponseLevantamentoProduto, mas em SugestaoController eles dividiam por 100.
             // Assumimos que precoMedio vem como float legível ou inteiro de centavos. Se for > 1000 para coisas muito fracas, é centavos.
             let avgPrice = levantamento.precoMedio || 0;
             if (avgPrice === 0 && levantamento.menorPreco > 0) avgPrice = levantamento.menorPreco;
             
             return {
                title: p.nome,
                price: avgPrice > 0 ? `R$ ${(avgPrice / 100).toFixed(2)}` : "Preço Indisponível",
                extracted_price: avgPrice > 0 ? (avgPrice / 100) : 0,
                source: p.marca || "Desconhecido"
             };
          }
        } catch (e) {
             // Ignora erro de levantamento individual
        }
        return {
           title: p.nome,
           price: "Preço Indisponível",
           extracted_price: 0,
           source: p.marca || "Desconhecido"
        };
      }));

      return NextResponse.json({
        search_parameters: { q, engine: "paguei-barato-api" },
        shopping_results: shoppingResults
      });
    }
  } catch (error) {
    console.warn("PagueiBarato API não está rodando no localhost:8080 ou falhou. Usando Mock Fallback.");
  }

  // MOCK FALLBACK (apenas se a API estiver desligada)
  const mockDatabase = [
    { name: "Picanha (1kg) Premium", price: 79.90, store: "Supermercado Local" },
    { name: "Cerveja Heineken (Lata 350ml)", price: 4.50, store: "Adega" },
    { name: "Cerveja Heineken (Garrafa 600ml)", price: 12.50, store: "Mercado Central" },
    { name: "Refrigerante Cola (2L)", price: 8.90, store: "Conveniência" },
    { name: "Carvão Vegetal (3kg)", price: 15.00, store: "Açougue" },
    { name: "Pão de Alho (pct)", price: 14.90, store: "Padaria" },
    { name: "Queijo Coalho (Palito)", price: 22.50, store: "Supermercado" },
  ];

  const query = q.toLowerCase();
  const results = mockDatabase.filter(m => m.name.toLowerCase().includes(query));

  return NextResponse.json({
    search_parameters: { q, engine: "paguei-barato-api-mock" },
    shopping_results: results.map(r => ({
      title: r.name,
      price: `R$ ${r.price.toFixed(2)}`,
      extracted_price: r.price,
      source: r.store
    }))
  });
}
