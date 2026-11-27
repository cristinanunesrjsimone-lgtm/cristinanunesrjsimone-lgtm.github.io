export type UnidadeVenda = { id?: string; unidade: string; ativa?: boolean };
export type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  unidade: string;
  imagemUrl?: string;
  ativo?: boolean;
  categoria?: { nome: string };
  unidadesVenda?: UnidadeVenda[];
};
export type Indicadores = { cotacoes: number; pedidos: number; entregas: number; vendasConvertidas: number; valorVendido: number; ticketMedio: number; taxaConversao: number };
export type DashboardData = { indicadores: Indicadores; cotacoesPorStatus: {status:string;total:number}[]; pedidosPorStatus:{status:string;total:number}[]; entregasPorStatus:{status:string;total:number}[]; vendasPorMes:{mes:string;vendas:number;pedidos:number}[]; entregasPorCidade:{cidade:string;total:number}[]; ultimosPedidos:{numero:string;cliente:string;status:string;valor:number;data:string;entrega:string}[]; ultimasCotacoes:{protocolo:string;cliente:string;status:string;valorProposto:number|null;data:string}[] };
