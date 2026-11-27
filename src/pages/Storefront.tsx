import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { imageUrl, api } from '../services/api';
import type { Produto } from '../types';
import { MessageCircle, Search, Trash2 } from 'lucide-react';

const whatsapp = import.meta.env.VITE_WHATSAPP || '5521991473130';
type CartItem = { produto: Produto; quantidade: number; unidade: string };
const unitLabels: Record<string, string> = {
  KG: 'Quilo (kg)', UNIDADE: 'Unidade', CAIXA: 'Caixa fechada', BANDEJA: 'Bandeja', SACO: 'Saco',
  DUZIA: 'Dúzia', MACO: 'Maço', PACOTE: 'Pacote', FARDO: 'Fardo', POTE: 'Pote', EMBALAGEM: 'Embalagem', TONEL: 'Tonel',
};
const unitsFor = (p: Produto) => { const configured = p.unidadesVenda?.filter(u => u.ativa !== false).map(u => u.unidade) ?? []; return configured.length ? configured : [p.unidade]; };

export default function Storefront() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [form, setForm] = useState({ razaoSocial: '', nomeFantasia: '', cnpj: '', telefone: '', email: '', observacoes: '', logradouro: '', numero: '', bairro: '', cidade: '', cep: '', uf: 'RJ', complemento: '' });
  const [cepStatus, setCepStatus] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});
  useEffect(() => {
    const cep = form.cep.replace(/\D/g, '');
    setCepStatus('');
    setCepLoading(false);
    if (cep.length !== 8) return;
    const controller = new AbortController();
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (controller.signal.aborted) return; if (d.erro) { setCepStatus('CEP não encontrado. Confira ou preencha manualmente.'); return; } setForm(old => ({...old, logradouro: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || ''})); setCepStatus(d.uf === 'RJ' ? 'Endereço localizado. Informe número e complemento.' : 'Entrega disponível somente no Rio de Janeiro.'); })
      .catch(() => { if (!controller.signal.aborted) setCepStatus('Consulta indisponível. Preencha manualmente.'); })
      .finally(() => { if (!controller.signal.aborted) setCepLoading(false); });
    return () => controller.abort();
  }, [form.cep]);

  useEffect(() => {
    api<Produto[]>('/produtos').then(setProdutos).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria?.nome || 'Hortifruti')))], [produtos]);
  const visibleProducts = useMemo(() => produtos.filter(p =>
    (category === 'Todos' || (p.categoria?.nome || 'Hortifruti') === category) &&
    `${p.nome} ${p.descricao || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  ), [produtos, category, search]);
  const totalItems = useMemo(() => cart.reduce((n, i) => n + i.quantidade, 0), [cart]);

  function add(p: Produto) {
    const unidade = selectedUnits[p.id] || p.unidade;
    setCart(old => {
      const found = old.find(x => x.produto.id === p.id && x.unidade === unidade);
      return found
        ? old.map(x => x.produto.id === p.id && x.unidade === unidade ? { ...x, quantidade: x.quantidade + (selectedQty[p.id] || 1) } : x)
        : [...old, { produto: p, quantidade: selectedQty[p.id] || 1, unidade }];
    });
  }
  function quantity(id: string, unidade: string, q: number) {
    setCart(old => old.map(i => i.produto.id === id && i.unidade === unidade ? { ...i, quantidade: q } : i).filter(i => i.quantidade > 0));
  }
  function removeItem(id: string, unidade: string) { setCart(old => old.filter(i => !(i.produto.id === id && i.unidade === unidade))); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cart.length || cepLoading) return;
    if (form.uf !== 'RJ') { alert('Entrega disponível somente no Rio de Janeiro.'); return; }
    try {
      const result = await api<{ protocolo: string }>('/cotacoes', {
        method: 'POST',
        body: JSON.stringify({
          razaoSocial: form.razaoSocial, nomeFantasia: form.nomeFantasia, cnpj: form.cnpj,
          telefone: form.telefone, email: form.email || undefined, observacoes: form.observacoes,
          endereco: { logradouro: form.logradouro, numero: form.numero, bairro: form.bairro, cidade: form.cidade, cep: form.cep, uf: form.uf, complemento: form.complemento },
          itens: cart.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade, unidade: i.unidade })),
        }),
      });
      const message = `*Nova solicitação de cotação Sanes Fruit*\n*Protocolo:* ${result.protocolo}\n*Empresa:* ${form.razaoSocial}\n*WhatsApp:* ${form.telefone}\n\n*Itens:*\n${cart.map(i => `• ${i.produto.nome} — ${i.quantidade} ${unitLabels[i.unidade] || i.unidade}`).join('\n')}\n\n*Entrega:* ${form.bairro}, ${form.cidade}/${form.uf}\n*Observações:* ${form.observacoes || 'Não informadas'}\n\nSolicito retorno com proposta comercial.`;
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      setCart([]);
      alert(`Solicitação registrada! Protocolo: ${result.protocolo}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível enviar a cotação.');
    }
  }

  return <>
    <div className="sf-top"><div className="sf-wrap"><span><strong>Ceasa RJ:</strong> Av. Brasil, 19.001 - Irajá, Rio de Janeiro - RJ, 21230-000 • <strong>Pavilhão 77, Box 16</strong></span><span>WhatsApp: <a href="https://wa.me/5521991473130">+55 21 99147-3130</a></span></div></div>
<header className="sf-header"><div className="sf-wrap"><a className="sf-brand" href="/index.html"><img src="/uploads/institucional/sanes3.png" alt="Logotipo Sanes Fruit" /><span>SANES <b>FRUIT</b><small>Distribuidora de Hortifruti</small></span></a><nav className="sf-nav" aria-label="Menu principal"><a href="/index.html#quem-somos">Quem Somos</a><a href="/galeria.html">Galeria</a><a href="/compras.html">Compras</a><a href="/index.html#diretrizes">Diretrizes</a><a href="/index.html#beneficios">Benefícios</a><a href="/admin.html">Área Administrativa</a><a className="sf-cta" href="/index.html#contato">Solicitar Cotação</a></nav></div></header>
    <div className="container" style={{paddingTop:16,textAlign:"right"}}><a className="button button-green" href="#cotacao">Carrinho ({totalItems})</a></div>



    <section id="catalogo" className="catalog-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">NOSSO MIX</span><h2>Frutas, legumes e verduras</h2><p>Escolha a apresentação de cada produto — quilo, unidade, caixa fechada, maço, bandeja, saco e outras opções.</p></div><span className="count-pill">{visibleProducts.length} produtos</span></div>
      <div className="catalog-tools"><div className="search-box"><Search size={17}/><input aria-label="Buscar produto" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Carregando catálogo...</p> : visibleProducts.length === 0 ? <div className="empty-state">Nenhum produto encontrado. Entre em contato pelo WhatsApp para consultar a disponibilidade.</div> : <div className="product-grid">{visibleProducts.map(p => <article className="product-card" key={p.id}><div className="product-image">{p.imagemUrl ? <img src={imageUrl(p.imagemUrl)} alt={p.nome} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentText('beforeend', p.nome); }}/> : <span>{p.nome}</span>}</div><div className="product-info"><small>{p.categoria?.nome || 'Hortifruti'}</small><h3>{p.nome}</h3><p>{p.descricao || 'Produto selecionado para fornecimento no atacado.'}</p><div className="unit-select"><label htmlFor={`unit-${p.id}`}>Apresentação para cotação</label><select id={`unit-${p.id}`} value={selectedUnits[p.id] || p.unidade} onChange={e => setSelectedUnits(old => ({ ...old, [p.id]: e.target.value }))}>{unitsFor(p).map(u => <option value={u} key={u}>{unitLabels[u] || u}</option>)}</select></div><div className="quick-qty" aria-label="Quantidade rápida">{[1,10,100,400].map(q => <button type="button" key={q} aria-pressed={(selectedQty[p.id] || 1) === q} onClick={() => setSelectedQty(old => ({...old,[p.id]:q}))}>{q}</button>)}<span>Quantidade: {selectedQty[p.id] || 1}</span></div><div className="product-bottom"><span>Preço<b>Sob cotação</b></span><button className="button button-purple" onClick={() => add(p)}>Adicionar</button></div></div></article>)}</div>}
    </div></section>



    <section id="cotacao" className="quote-section"><div className="container quote-layout"><div><span className="eyebrow">FAÇA SEU PEDIDO</span><h2>Solicite sua cotação</h2><p>Informe os dados da empresa e os itens desejados. Nossa equipe comercial analisará seu pedido e retornará com uma proposta personalizada.</p><div className="quote-note"><MessageCircle/> Após registrar a solicitação, você poderá continuar o atendimento pelo WhatsApp.</div><h3>Seu carrinho ({totalItems} itens)</h3>{cart.length === 0 ? <p className="muted">Adicione produtos ao carrinho no catálogo.</p> : cart.map(i => <div className="cart-row" key={`${i.produto.id}-${i.unidade}`}><span><b>{i.produto.nome}</b><small>{unitLabels[i.unidade] || i.unidade}</small></span><div><div className="quick-qty">{[10,100,400].map(q => <button type="button" key={q} onClick={() => quantity(i.produto.id,i.unidade,q)}>{q}</button>)}</div><div className="cart-controls"><button type="button" onClick={() => quantity(i.produto.id, i.unidade, i.quantidade - 1)} aria-label="Diminuir">−</button><input aria-label={`Quantidade de ${i.produto.nome}`} type="number" min="1" step="0.1" value={i.quantidade} onChange={e => quantity(i.produto.id, i.unidade, Number(e.target.value))}/><button type="button" onClick={() => quantity(i.produto.id, i.unidade, i.quantidade + 1)} aria-label="Aumentar">+</button><button type="button" className="remove-item" onClick={() => removeItem(i.produto.id, i.unidade)} aria-label="Remover item"><Trash2 size={15}/></button></div></div></div>)}</div>
      <form className="quote-form" onSubmit={submit}><h3>Dados para cotação</h3><div className="form-grid"><label>Razão social *<input required value={form.razaoSocial} onChange={e => setForm({...form, razaoSocial:e.target.value})}/></label><label>Nome fantasia<input value={form.nomeFantasia} onChange={e => setForm({...form,nomeFantasia:e.target.value})}/></label><label>CNPJ<input value={form.cnpj} onChange={e => setForm({...form,cnpj:e.target.value})}/></label><label>WhatsApp *<input required value={form.telefone} onChange={e => setForm({...form,telefone:e.target.value})}/></label><label className="full">E-mail<input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label><label className="full">CEP *<input required inputMode="numeric" pattern="[0-9]{5}-?[0-9]{3}" maxLength={9} value={form.cep} onChange={e => { const v=e.target.value.replace(/\D/g, "").slice(0,8); setForm(old => ({...old,cep:v.length>5?v.slice(0,5)+"-"+v.slice(5):v,logradouro:"",bairro:"",cidade:"",uf:"RJ"})); }}/><span className="cep-status" role="status">{cepLoading ? "Consultando CEP..." : cepStatus}</span></label><label className="full">Endereço de entrega *<input required value={form.logradouro} onChange={e => setForm({...form,logradouro:e.target.value})} placeholder="Rua / Avenida"/></label><label>Número<input value={form.numero} onChange={e => setForm({...form,numero:e.target.value})}/></label><label>Complemento<input value={form.complemento} onChange={e => setForm({...form,complemento:e.target.value})}/></label><label>UF<input required maxLength={2} value={form.uf} onChange={e => setForm({...form,uf:e.target.value.toUpperCase()})}/></label><label>Bairro<input required value={form.bairro} onChange={e => setForm({...form,bairro:e.target.value})}/></label><label>Cidade *<input required value={form.cidade} onChange={e => setForm({...form,cidade:e.target.value})}/></label><label className="full">Observações<textarea rows={3} value={form.observacoes} onChange={e => setForm({...form,observacoes:e.target.value})} placeholder="Informe frequência, detalhes do pedido ou orientações de entrega."/></label></div><button className="button button-green full-button" disabled={!cart.length || cepLoading}>Enviar solicitação de cotação</button><small className="muted">O envio não representa compra confirmada nem reserva de estoque. Valores e condições serão confirmados pela equipe comercial.</small></form>
    </div></section>
    <footer className="sf-footer"><div className="sf-wrap"><div><strong className="sf-name">Sanes Fruit</strong><p>CNPJ: 57.931.153/0001-70</p><p className="sf-address">Av. Brasil, 19.001 - Irajá, Rio de Janeiro - RJ, 21230-000 | Ceasa RJ — Pavilhão 77, Box 16</p><p>Qualidade, Pontualidade e Transparência no Rio de Janeiro</p></div><div className="sf-contact"><p><a href="https://wa.me/5521991473130">WhatsApp: +55 21 99147-3130</a></p><p><a href="https://www.instagram.com/sanesfruit/" target="_blank" rel="noopener noreferrer">Instagram: @sanesfruit</a></p><p><a href="/admin.html">Área Administrativa</a></p><p>© 2026 Distribuidora de Alimentos LTDA.</p></div></div></footer>
    <a href="https://wa.me/5521991473130" className="whatsapp-float" target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp"><MessageCircle size={25}/></a>
  </>;
}
