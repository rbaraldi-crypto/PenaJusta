import { supabase } from '@/lib/supabase';

/**
 * Pena Justa Service
 * Integracao com APIs oficiais do CNJ para o programa Pena Justa.
 * 
 * Eixos implementados:
 * 1. Gestao de Processos
 * 2. Progressao de Regime
 * 3. Compliance
 * 4. Analise de Risco
 * 5. Distribuicao
 * 6. Precedentes
 * 7. Documentos
 * 8. Relatorios
 * 9. Integracoes Externas
 * 10. Vitimas
 * 11. Ponto 11
 * 12. HITL
 */

const API_BASE = import.meta.env.VITE_PENA_JUSTA_API_URL || 'https://api.penajusta.cnj.jus.br/v1';
const API_KEY = import.meta.env.VITE_PENA_JUSTA_API_KEY;

interface RequestOptions extends RequestInit {
  requireICP?: boolean;
}

class PenaJustaService {
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireICP, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY || '',
      ...fetchOptions.headers,
    };

    // Adiciona token JWT do usuario logado
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Para operacoes criticas, adiciona certificado ICP
    if (requireICP) {
      const icpToken = localStorage.getItem('icp_token');
      if (icpToken) {
        headers['X-ICP-Certificate'] = icpToken;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ==================== EIXO 1: PROCESSOS ====================
  
  async getProcessos(params?: {
    page?: number;
    limit?: number;
    status?: string;
    prioridade?: string;
    tipo?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.prioridade) query.set('prioridade', params.prioridade);
    if (params?.tipo) query.set('tipo', params.tipo);

    return this.request(`/processos?${query.toString()}`);
  }

  async getProcesso(id: string) {
    return this.request(`/processos/${id}`);
  }

  async createProcesso(data: any) {
    return this.request('/processos', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  async updateClassificacao(id: string, data: { tipo?: string; materia?: string; prioridade?: string }) {
    return this.request(`/processos/${id}/classificacao`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getMovimentacoes(processoId: string) {
    return this.request(`/processos/${processoId}/movimentacoes`);
  }

  // ==================== EIXO 2: APENADOS ====================

  async getApenado(cpf: string) {
    return this.request(`/apenados/${encodeURIComponent(cpf)}`);
  }

  async getComportamento(apenadoId: string) {
    return this.request(`/apenados/${apenadoId}/comportamento`);
  }

  // ==================== EIXO 3: PROGRESSAO ====================

  async calcularProgressao(data: { apenado_id: string; tipo_beneficio?: string }) {
    return this.request('/calculo/progressao', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async solicitarProgressao(data: { processo_id: string; tipo: string; fundamentacao?: string }) {
    return this.request('/progressao', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  async validarBeneficio(id: string, data: { tipo_beneficio: string; apenado_id: string }) {
    return this.request(`/beneficios/${id}/validar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async registrarDecisao(data: {
    processo_id: string;
    decisao: string;
    fundamentacao: string;
    tipo_documento?: string;
  }) {
    return this.request('/decisoes', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  // ==================== EIXO 4: COMPLIANCE ====================

  async getAlertas(params?: { tipo?: string; severidade?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.tipo) query.set('tipo', params.tipo);
    if (params?.severidade) query.set('severidade', params.severidade);
    if (params?.status) query.set('status', params.status);

    return this.request(`/alertas?${query.toString()}`);
  }

  async registrarCiencia(id: string, observacao?: string) {
    return this.request(`/alertas/${id}/ciencia`, {
      method: 'POST',
      body: JSON.stringify({ observacao }),
      requireICP: true,
    });
  }

  async delegarAlerta(id: string, data: { analista_id: string; prazo_dias?: number; instrucoes?: string }) {
    return this.request(`/alertas/${id}/delegar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async buscarLegislacao(termo: string, fonte?: string) {
    const query = new URLSearchParams({ termo });
    if (fonte) query.set('fonte', fonte);
    return this.request(`/legislacao/buscar?${query.toString()}`);
  }

  // ==================== EIXO 5: RISCO ====================

  async getRiscoReincidencia(inmateId: string) {
    return this.request(`/risco/${inmateId}`);
  }

  async getFatoresRisco(inmateId: string) {
    return this.request(`/risco/${inmateId}/fatores`);
  }

  async getVinculosCriminosos(cpf: string) {
    return this.request(`/inteligencia/vinculos/${encodeURIComponent(cpf)}`);
  }

  // ==================== EIXO 6: DISTRIBUICAO ====================

  async getMinhaFila(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/fila/meus-casos${query}`);
  }

  async alterarPrioridade(taskId: string, prioridade: string, motivo?: string) {
    return this.request(`/fila/${taskId}/prioridade`, {
      method: 'PATCH',
      body: JSON.stringify({ prioridade, motivo }),
    });
  }

  async delegarCaso(taskId: string, data: { destinatario_id: string; prazo_dias?: number }) {
    return this.request(`/fila/${taskId}/delegar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEstatisticasFila() {
    return this.request('/fila/estatisticas');
  }

  async getDisponibilidadeEquipe() {
    return this.request('/equipe/disponibilidade');
  }

  // ==================== EIXO 7: PRECEDENTES ====================

  async buscarJurisprudencia(data: {
    termo: string;
    tribunal?: string;
    tipo_crime?: string;
    pena_minima?: number;
    pena_maxima?: number;
  }) {
    return this.request('/jurisprudencia', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJurisprudencia(id: string) {
    return this.request(`/jurisprudencia/${id}`);
  }

  async getFatoresSimilaridade(id: string) {
    return this.request(`/jurisprudencia/${id}/fatores`);
  }

  // ==================== EIXO 8: DOCUMENTOS ====================

  async getDocumentos(processoId: string) {
    return this.request(`/documentos/${processoId}`);
  }

  async uploadDocumento(formData: FormData) {
    return this.request('/documentos', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type para multipart/form-data
    });
  }

  async assinarDocumento(id: string, certificado_base64?: string) {
    return this.request(`/documentos/${id}/assinar`, {
      method: 'POST',
      body: JSON.stringify({ certificado_base64 }),
      requireICP: true,
    });
  }

  async gerarDespacho(data: {
    processo_id: string;
    tipo_decisao: string;
    fundamentacao_adicional?: string;
    template?: string;
  }) {
    return this.request('/documentos/despacho', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async downloadDocumento(id: string) {
    const response = await fetch(`${API_BASE}/documentos/${id}/pdf`, {
      headers: {
        'X-API-Key': API_KEY || '',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });
    return response.blob();
  }

  // ==================== EIXO 9: RELATORIOS ====================

  async getDashboardStats() {
    return this.request('/relatorios/dashboard');
  }

  async getRelatorioProdutividade(dataInicio: string, dataFim: string, magistradoId?: string) {
    const query = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
    if (magistradoId) query.set('magistrado_id', magistradoId);
    return this.request(`/relatorios/produtividade?${query.toString()}`);
  }

  async getAuditoria(params?: { page?: number; tipo?: string; usuario_id?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.tipo) query.set('tipo', params.tipo);
    if (params?.usuario_id) query.set('usuario_id', params.usuario_id);
    return this.request(`/auditoria?${query.toString()}`);
  }

  async gerarDossie(data: { tipo: string; filtros?: Record<string, any> }) {
    return this.request('/relatorios/dossie', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  // ==================== EIXO 10: INTEGRACOES ====================

  async consultarBNMP(cpf: string) {
    return this.request(`/integracao/bnmp/${encodeURIComponent(cpf)}`);
  }

  async consultarSISBAJUD(cpf: string) {
    return this.request(`/integracao/sisbajud/${encodeURIComponent(cpf)}`);
  }

  async bloquearSISBAJUD(data: {
    cpf: string;
    valor: number;
    instituicao: string;
    tipo_conta?: string;
    processo_id: string;
    fundamentacao?: string;
  }) {
    return this.request('/integracao/sisbajud/bloquear', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  async consultarSISNAC(cpf?: string, nome?: string) {
    const query = new URLSearchParams();
    if (cpf) query.set('cpf', cpf);
    if (nome) query.set('nome', nome);
    return this.request(`/integracao/sisnac?${query.toString()}`);
  }

  async consultarONU(nome: string) {
    return this.request(`/integracao/onu/${encodeURIComponent(nome)}`);
  }

  async validarBiometria(data: {
    apenado_id: string;
    tipo: 'facial' | 'digital' | 'iris' | 'multimodal';
    imagem_base64?: string;
    template_base64?: string;
  }) {
    return this.request('/biometria/validar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== EIXO 11: VITIMAS ====================

  async getReparacoes(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/vitimas/reparacoes${query}`);
  }

  async getReparacaoDetalhe(id: string) {
    return this.request(`/vitimas/reparacoes/${id}`);
  }

  async validarTokenVitima(token: string) {
    return this.request('/vitimas/portal/validar', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getExtratoVitima(id: string) {
    return this.request(`/vitimas/${id}/extrato`);
  }

  // ==================== EIXO 12: PONTO 11 ====================

  async verificarPonto11(cpf: string) {
    return this.request(`/apenados/${encodeURIComponent(cpf)}/ponto11`);
  }

  async solicitarExcecaoPonto11(data: {
    apenado_id: string;
    processo_id?: string;
    motivo: string;
    fundamentacao?: string;
  }) {
    return this.request('/ponto11/excecao', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  async gerarJustificativaIA(data: { tipo_crime: string; apenado_id: string; contexto?: string }) {
    return this.request('/ponto11/justificativa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== EIXO 13: HITL ====================

  async registrarDecisaoHITL(data: {
    processo_id: string;
    decisao: string;
    fundamentacao: string;
    operador_id: string;
    certificado_icp?: string;
  }) {
    return this.request('/hitl/decisao', {
      method: 'POST',
      body: JSON.stringify(data),
      requireICP: true,
    });
  }

  async validarSandbox(data: { tipo_acao: string; apenado_id: string; is_ponto11?: boolean }) {
    return this.request('/hitl/sandbox/validar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validarOperador(data: { operador_id: string; certificado: string }) {
    return this.request('/hitl/biometria', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const penaJustaService = new PenaJustaService();
