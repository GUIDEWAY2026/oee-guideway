/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { 
  Settings, 
  Activity, 
  Clock, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Info,
  ChevronRight,
  Droplets,
  Gauge,
  Sparkles,
  RefreshCw,
  Download,
  Users,
  LogOut,
  Trash2,
  BarChart3,
  Calendar,
  Box,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { supabase } from '@/lib/supabase';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 text-white font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 p-8 rounded-3xl shadow-2xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Algo deu errado</h1>
            <p className="text-slate-400 mb-6 text-sm">Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.</p>
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 mb-6 overflow-auto max-h-40">
              <code className="text-[10px] text-red-400 font-mono">{this.state.error?.toString()}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Types for our OEE data
interface StopEntry {
  id: string;
  code: number;
  duration: number; // minutos
}

interface OEEInputs {
  date: string; // Data do Relatório
  sku: string; // Nome do Produto (SKU)
  line: string; // Linha de Produção
  A: number; // Tempo Total (h)
  B: number; // % Projeto (%)
  C: number; // Fator de Conversão (Garrafas/Fardo)
  D: number; // Velocidade Nominal (gph)
  H: number; // Produção Real (fardos)
  K: number; // Turnos de Produção
  stops: StopEntry[]; // Paradas detalhadas
  U: number; // Perda por Qualidade (garrafas)
}

const STOP_CODES = [
  { code: 1, description: 'Problema no RINSER', category: 'NP' },
  { code: 2, description: 'Problema na ENCHEDORA', category: 'NP' },
  { code: 3, description: 'Problema no ROSQUEADOR', category: 'NP' },
  { code: 21, description: 'GARRAFA AMASSADA', category: 'NP' },
  { code: 22, description: 'TAMPA AGARRADA', category: 'NP' },
  { code: 23, description: 'REGULAGEM DE TORQUE', category: 'NP' },
  { code: 24, description: 'REGULAGEM DEVIDO A TROCA DE KIT', category: 'NP' },
  { code: 31, description: 'SOPRADORA', category: 'NP' },
  { code: 32, description: 'ROTULADORA', category: 'NP' },
  { code: 33, description: 'EMPACOTADORA', category: 'NP' },
  { code: 41, description: 'FALTA DE ÁGUA', category: 'NP' },
  { code: 42, description: 'FALTA DE ENERGIA', category: 'NP' },
  { code: 43, description: 'FALTA DE AR COMPRIMIDO', category: 'NP' },
  { code: 44, description: 'FALTA DE TAMPA', category: 'NP' },
  { code: 45, description: 'FALTA DE GARRAFA', category: 'NP' },
  { code: 46, description: 'FALTA DE MATERIAL DE EMBALAGEM', category: 'NP' },
  { code: 47, description: 'FALTA DE PALETS', category: 'NP' },
  { code: 101, description: 'REFEIÇÃO', category: 'P' },
  { code: 102, description: 'CAFÉ', category: 'P' },
  { code: 103, description: 'CIP', category: 'P' },
  { code: 104, description: 'MANUTENÇÃO PLANEJADA', category: 'P' },
  { code: 105, description: 'TROCA DE PRODUTO', category: 'P' },
  { code: 106, description: 'INICIO DE PRODUÇÃO', category: 'P' },
  { code: 107, description: 'FINAL DE PRODUÇÃO', category: 'P' },
  { code: 108, description: 'REUNIÃO', category: 'P' },
  { code: 109, description: 'TREINAMENTO', category: 'P' },
  { code: 110, description: 'TESTES DE EQUIPAMENTOS / MATERIAIS', category: 'P' },
  { code: 111, description: 'TROCA DE KIT', category: 'P' },
  { code: 500, description: 'OUTROS', category: 'NP' },
];

interface OEEResults {
  F: number; // Velocidade de Projeto
  G: number; // Produção Teórica
  I: number; // Tempo em Produção
  L: number; // Tempo Total do Turno
  M: number; // Tempo Turno Não Programado
  O: number; // Total das Paradas Programadas
  P: number; // Tempo Programado
  R: number; // Tempo de Operação
  S: number; // Perda por Redução de Velocidade
  T: number; // Tempo Líquido
  V: number; // Tempo Qualidade
  X: number; // Tempo Útil
  N: number; // Paradas Programadas (h)
  Q: number; // Paradas Não Programadas (h)
  disponibilidade: number;
  performance: number;
  qualidade: number;
  oee: number;
}

// Types for Authentication
interface User {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

// --- CONFIGURAÇÃO DE ACESSOS PADRÃO ---
// Agora os usuários são gerenciados via Supabase.
// O administrador principal será verificado pelo e-mail.
const MAIN_ADMIN_EMAIL = 'josemarcelolustosa@gmail.com';
// ---------------------------------------------------------------

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Initial state based on the provided example image
  const [inputs, setInputs] = useState<OEEInputs>({
    date: new Date().toISOString().split('T')[0],
    sku: 'Água Mineral 500ml',
    line: 'Linha 01',
    A: 24,
    B: 80,
    C: 12,
    D: 22000,
    H: 10000,
    K: 2,
    stops: [],
    U: 2500
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inputs' | 'evolution'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [lineFilter, setLineFilter] = useState<string>('Todas');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

  // Buscar usuários do Supabase (Apenas para ADM)
  const ensureAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', MAIN_ADMIN_EMAIL)
        .single();
      
      if (error && error.code === 'PGRST116') { // PGRST116 = Not Found
        console.log('Criando usuário administrador inicial...');
        await supabase.from('users').insert([{
          name: 'Administrador Guideway',
          email: MAIN_ADMIN_EMAIL,
          password: 'admin', // Senha padrão inicial
          is_admin: true
        }]);
      }
    } catch (err) {
      console.error('Erro ao verificar administrador:', err);
    }
  };

  const fetchUsers = async () => {
    if (!currentUser?.isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) setUsers(data.map(u => ({
        name: u.name,
        email: u.email,
        password: u.password,
        isAdmin: u.is_admin
      })));
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      fetchUsers();
    }
  }, [showAdminPanel]);

  // Carregar histórico do Supabase
  const fetchHistory = async () => {
    setHistoryError(null);
    try {
      let query = supabase
        .from('oee_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (lineFilter !== 'Todas') {
        query = query.eq('machine_name', lineFilter);
      }

      // Filtro de Mês
      const year = parseInt(monthFilter.split('-')[0]);
      const month = parseInt(monthFilter.split('-')[1]);
      const startDate = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      
      query = query.gte('created_at', startDate).lte('created_at', endDate);

      const { data, error } = await query.limit(31);
      
      if (error) throw error;
      if (data) setHistory(data);
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      setHistoryError(error.message || 'Erro de conexão com o banco de dados');
    }
  };

  // Excluir registro do Supabase
  const deleteRecord = async (id: string) => {
    if (!currentUser?.isAdmin) {
      alert('Apenas administradores podem excluir registros.');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    
    try {
      const { error } = await supabase
        .from('oee_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado local removendo o item
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      console.error('Erro ao excluir registro:', error);
      alert('Erro ao excluir: ' + error.message);
    }
  };

  // Salvar registro no Supabase
  const saveRecord = async () => {
    setIsSaving(true);
    try {
      const record = {
        machine_name: inputs.line,
        sku: inputs.sku,
        availability: results.disponibilidade,
        performance: results.performance,
        quality: results.qualidade,
        oee_score: results.oee,
        shift: `Turnos: ${inputs.K}`,
        notes: `Produção Real: ${inputs.H}`,
        downtime_data: JSON.stringify(inputs.stops) // Novo campo para paradas detalhadas
      };

      const { error } = await supabase
        .from('oee_records')
        .insert([record]);

      if (error) throw error;
      
      alert('Registro salvo com sucesso no banco de dados!');
      fetchHistory(); // Atualiza a lista após salvar
    } catch (error: any) {
      console.error('Erro ao salvar registro:', error);
      alert('Erro ao salvar registro: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [lineFilter, monthFilter]);

  // Calculation logic based on the provided formulas
  const results = useMemo((): OEEResults => {
    const { A, B, C, D, H, K, U, stops = [] } = inputs;

    // Calcular N e Q a partir das paradas
    const N = stops.filter(s => {
      const config = STOP_CODES.find(c => c.code === Number(s.code));
      return config?.category === 'P';
    }).reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0) / 60;

    const Q = stops.filter(s => {
      const config = STOP_CODES.find(c => c.code === Number(s.code));
      return config?.category === 'NP';
    }).reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0) / 60;

    // F = D * (B/100)
    const F = D * (B / 100);
    
    // L = K * 8
    const L = K * 8;
    
    // M = A - L
    const M = A - L;
    
    // O = M + N
    const O = M + N;
    
    // P = A - O
    const P = A - O;
    
    // R = P - Q
    const R = P - Q;
    
    // G = (F/C) * R
    const G = C > 0 ? (F / C) * R : 0;
    
    // I = (H*C) / F
    const I = F > 0 ? (H * C) / F : 0;
    
    // S = R - I
    const S = R - I;
    
    // T = R - S
    const T = R - S;
    
    // V = U / F
    const V = F > 0 ? U / F : 0;
    
    // X = T - V
    const X = T - V;

    const disponibilidade = P > 0 ? R / P : 0;
    const performance = R > 0 ? T / R : 0;
    const qualidade = T > 0 ? X / T : 0;
    const oee = disponibilidade * performance * qualidade;

    return {
      F, G, I, L, M, O, P, R, S, T, V, X, N, Q,
      disponibilidade: Math.max(0, disponibilidade * 100),
      performance: Math.max(0, performance * 100),
      qualidade: Math.max(0, qualidade * 100),
      oee: Math.max(0, oee * 100)
    };
  }, [inputs]);

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(''); // Limpa análise anterior
    try {
      // Em Vite/Netlify, usamos import.meta.env.VITE_...
      // process.env é para o ambiente do AI Studio
      const apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || 
                     (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY);
      
      if (!apiKey) {
        throw new Error('Chave de API não encontrada. Certifique-se de que VITE_GEMINI_API_KEY está configurada no Netlify e que você fez um novo Deploy.');
      }

      const ai = new GoogleGenAI({ apiKey });
      // Usando o modelo flash mais estável
      const model = "gemini-3-flash-preview";
      
      const prompt = `Você é um especialista em eficiência industrial (OEE) da OEE GUIDEWAY. 
      Analise os seguintes dados da ${inputs.line} produzindo o SKU ${inputs.sku}:
      
      CONTEXTO:
      - Linha: ${inputs.line}
      - Produto (SKU): ${inputs.sku}
      - Data: ${inputs.date}
      
      MÉTRICAS PRINCIPAIS:
      - OEE Global: ${results.oee.toFixed(1)}%
      - Disponibilidade: ${results.disponibilidade.toFixed(1)}%
      - Performance: ${results.performance.toFixed(1)}%
      - Qualidade: ${results.qualidade.toFixed(1)}%
      
      DADOS DE PRODUÇÃO:
      - Produção Real: ${inputs.H} fardos
      - Produção Teórica: ${results.G.toFixed(1)} fardos
      - Paradas Não Programadas: ${results.Q.toFixed(1)}h
      - Perda por Qualidade: ${inputs.U} garrafas
      - Redução de Velocidade (Perda de Performance): ${results.S.toFixed(1)}h
      
      GUIA DE CALIBRAÇÃO DE TOM (REFERÊNCIA):
      - EXCELENTE (Classe Mundial): OEE > 85%, Disp > 90%, Perf > 95%, Qual > 99.5%.
        * Tom: Elogioso, focado em manutenção de padrão e ajustes finos. Use termos como "Alta Performance", "Estabilidade", "Classe Mundial".
      - BOM: OEE 75-85%, Disp 85-90%, Perf 90-95%, Qual 98-99.5%.
        * Tom: Positivo, mas identifica oportunidades claras de otimização. Use "Bom desempenho", "Operação consistente".
      - ACEITÁVEL: OEE 65-75%, Disp 80-85%, Perf 85-90%, Qual 97-98%.
        * Tom: Neutro, focado em perdas moderadas. Use "Desempenho regular", "Necessita monitoramento".
      - RUIM / CRÍTICO: Abaixo dos níveis acima.
        * Tom: Alerta, focado em perdas severas. Use "Gargalo crítico", "Impacto severo".

      ESTRUTURA DA RESPOSTA:
      1. Título: **<u>DIAGNÓSTICO TÉCNICO E CAUSAS-RAIZ</u>**
         (Abaixo do título, identifique o gargalo principal e analise os problemas técnicos baseados nos dados, respeitando a calibração de tom acima).
      2. Título: **<u>CONCLUSÃO</u>**
         (Abaixo do título, escreva um parágrafo final objetivo).
      
      REGRAS CRÍTICAS:
      - NÃO seja alarmista com números altos. Se a Disponibilidade é 91.9%, NÃO diga que foi "severamente comprometida". Diga que é um "excelente índice com pequenas oportunidades de ajuste".
      - NÃO repita as instruções dentro dos títulos ou no texto final.
      - Use EXATAMENTE os títulos acima em negrito e sublinhado usando as tags HTML <u> e Markdown **.
      - NÃO sugira tratativas ou ações de melhoria.
      - Responda em Português, de forma executiva e profissional.`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response.text;
      if (!text) {
        throw new Error('A IA retornou uma resposta vazia.');
      }

      setAiAnalysis(text);
    } catch (error: any) {
      console.error('Erro na análise IA:', error);
      const errorMessage = error.message || 'Erro desconhecido';
      setAiAnalysis(`### ⚠️ Erro na Análise\n\nNão foi possível gerar o insight. Detalhes: ${errorMessage}\n\n**Dica:** Verifique se a chave de API no Netlify está correta e se você limpou o cache no último deploy.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const consolidatedMetrics = useMemo(() => {
    if (history.length === 0) return { oee: 0, disponibilidade: 0, performance: 0, qualidade: 0, paretoNP: [], paretoP: [] };
    
    const sum = history.reduce((acc, curr) => ({
      oee: acc.oee + curr.oee_score,
      disponibilidade: acc.disponibilidade + curr.availability,
      performance: acc.performance + curr.performance,
      qualidade: acc.qualidade + curr.quality,
    }), { oee: 0, disponibilidade: 0, performance: 0, qualidade: 0 });

    // Consolidar dados para o Pareto
    const stopsMap: { [key: number]: number } = {};
    history.forEach(record => {
      if (record.downtime_data) {
        try {
          const stops: StopEntry[] = JSON.parse(record.downtime_data);
          stops.forEach(stop => {
            stopsMap[stop.code] = (stopsMap[stop.code] || 0) + stop.duration;
          });
        } catch (e) {
          console.error("Erro ao processar downtime_data", e);
        }
      }
    });

    const allPareto = Object.entries(stopsMap)
      .map(([code, duration]) => {
        const config = STOP_CODES.find(c => c.code === parseInt(code));
        return {
          name: config ? `${config.code} - ${config.description}` : `Código ${code}`,
          duration,
          category: config?.category || 'NP'
        };
      })
      .sort((a, b) => b.duration - a.duration);
    
    const paretoNP = allPareto.filter(item => item.category === 'NP');
    const paretoP = allPareto.filter(item => item.category === 'P');
    
    return {
      oee: sum.oee / history.length,
      disponibilidade: sum.disponibilidade / history.length,
      performance: sum.performance / history.length,
      qualidade: sum.qualidade / history.length,
      paretoNP,
      paretoP
    };
  }, [history]);

  const currentParetoData = useMemo(() => {
    const stopsMap: { [key: number]: number } = {};
    inputs.stops.forEach(stop => {
      const code = Number(stop.code);
      stopsMap[code] = (stopsMap[code] || 0) + (Number(stop.duration) || 0);
    });

    const allPareto = Object.entries(stopsMap)
      .map(([code, duration]) => {
        const config = STOP_CODES.find(c => c.code === Number(code));
        return {
          name: config ? `${config.code} - ${config.description}` : `Código ${code}`,
          duration,
          category: config?.category || 'NP'
        };
      })
      .sort((a, b) => b.duration - a.duration);

    return {
      np: allPareto.filter(item => item.category === 'NP'),
      p: allPareto.filter(item => item.category === 'P')
    };
  }, [inputs.stops]);

  const chartData = [
    { name: 'TEMPO TOTAL', value: inputs.A, color: '#7e22ce' },
    { name: 'TEMPO PROGRAMADO', value: results.P, color: '#0ea5e9' },
    { name: 'TEMPO DE OPERAÇÃO', value: results.R, color: '#15803d' },
    { name: 'TEMPO LÍQUIDO', value: results.T, color: '#ea580c' },
    { name: 'TEMPO ÚTIL', value: results.X, color: '#0369a1' },
  ];

  // Initialize session
  useEffect(() => {
    ensureAdminExists();
    const session = localStorage.getItem('oee_guide_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginEmail)
        .eq('password', loginPassword)
        .single();

      if (error || !data) {
        setLoginError('E-mail ou senha incorretos.');
        return;
      }

      const user: User = {
        name: data.name,
        email: data.email,
        password: data.password,
        isAdmin: data.is_admin
      };

      setCurrentUser(user);
      localStorage.setItem('oee_guide_session', JSON.stringify(user));
    } catch (error) {
      console.error('Erro no login:', error);
      setLoginError('Erro ao conectar com o servidor.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('oee_guide_session');
    setShowAdminPanel(false);
  };

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          is_admin: newUserIsAdmin
        }]);

      if (error) throw error;

      alert('Usuário criado com sucesso!');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserIsAdmin(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário: ' + error.message);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === MAIN_ADMIN_EMAIL) {
      alert('O administrador principal não pode ser excluído.');
      return;
    }
    
    if (!confirm(`Deseja realmente excluir o usuário ${email}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', email);

      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleInputChange = (key: keyof OEEInputs, value: string) => {
    if (key === 'date' || key === 'sku' || key === 'line') {
      setInputs(prev => ({ ...prev, [key]: value }));
    } else {
      const numValue = parseFloat(value) || 0;
      setInputs(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const handleDownloadReport = () => {
    const markdownToHtml = (text: string) => {
      let html = text
        .replace(/^### (.*$)/gim, '<h3 style="color: #10b981; margin-top: 25px; margin-bottom: 12px; font-weight: bold; border-left: 4px solid #10b981; padding-left: 10px;">$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4 style="color: #10b981; margin-top: 20px; margin-bottom: 10px; font-weight: bold;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #065f46;">$1</strong>')
        .replace(/<u>(.*?)<\/u>/g, '<u style="text-decoration: underline;">$1</u>')
        .replace(/^\* (.*$)/gim, '<div style="margin-left: 20px; margin-bottom: 8px; display: flex; gap: 8px;"><span>•</span><span>$1</span></div>');

      // Handle tables
      const lines = html.split('\n');
      let inTable = false;
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">';
      const processedLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          if (!inTable) {
            inTable = true;
          }
          const cells = line.split('|').filter(c => c.trim() !== '' || line.indexOf('|'+c+'|') !== -1).map(c => c.trim());
          // Skip separator line
          if (cells.every(c => c.match(/^:?-+:?$/))) continue;
          
          tableHtml += '<tr>';
          cells.forEach(cell => {
            const tag = i === 0 || (lines[i-1] && !lines[i-1].trim().startsWith('|')) ? 'th' : 'td';
            const style = tag === 'th' ? 'background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; padding: 8px;' : 'border: 1px solid #e2e8f0; padding: 8px;';
            tableHtml += `<${tag} style="${style}">${cell}</${tag}>`;
          });
          tableHtml += '</tr>';
        } else {
          if (inTable) {
            tableHtml += '</table>';
            processedLines.push(tableHtml);
            tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">';
            inTable = false;
          }
          processedLines.push(line);
        }
      }
      if (inTable) {
        tableHtml += '</table>';
        processedLines.push(tableHtml);
      }

      return processedLines.join('<br>');
    };

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <title>Relatório OEE GUIDEWAY - ${inputs.date}</title>
          <style>
              body { font-family: sans-serif; color: #333; line-height: 1.6; padding: 40px; }
              .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
              .title { font-size: 24px; font-weight: bold; color: #1e293b; }
              .date { color: #64748b; font-size: 14px; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .card { border: 1px solid #e2e8f0; padding: 20px; rounded: 12px; }
              .card-title { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 10px; }
              .card-value { font-size: 28px; font-weight: bold; color: #2563eb; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
              th { background-color: #f8fafc; font-size: 12px; color: #64748b; }
              .chart-sim { margin-top: 20px; }
              .bar-container { display: flex; align-items: center; margin-bottom: 10px; }
              .bar-label { width: 150px; font-size: 10px; font-weight: bold; }
              .bar-outer { flex: 1; background: #f1f5f9; height: 20px; border-radius: 4px; overflow: hidden; }
              .bar-inner { height: 100%; }
              .ai-box { background: #f5f3ff; border: 1px solid #ddd6fe; padding: 20px; border-radius: 12px; margin-top: 30px; }
          </style>
      </head>
      <body>
          <div class="header">
              <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 15px;">
                  <img src="https://i.imgur.com/BRL62KM_d.jpeg?maxwidth=520&shape=thumb&fidelity=high" style="width: 180px; height: auto; object-fit: contain;" />
                  <div class="title">OEE GUIDEWAY - Relatório de Eficiência</div>
              </div>
              <div style="text-align: right;">
                  <div class="date">Data: ${new Date(inputs.date).toLocaleDateString('pt-BR')}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-top: 5px;">Linha: ${inputs.line}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: bold;">Produto: ${inputs.sku}</div>
              </div>
          </div>

          <div class="grid">
              <div class="card">
                  <div class="card-title">OEE Global</div>
                  <div class="card-value">${results.oee.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Disponibilidade</div>
                  <div class="card-value">${results.disponibilidade.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Performance</div>
                  <div class="card-value">${results.performance.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Qualidade</div>
                  <div class="card-value">${results.qualidade.toFixed(1)}%</div>
              </div>
          </div>

          <div class="section-title">Decomposição de Tempos (h)</div>
          <div class="chart-sim">
              ${chartData.map(d => `
                  <div class="bar-container">
                      <div class="bar-label">${d.name}</div>
                      <div class="bar-outer">
                          <div class="bar-inner" style="width: ${(d.value / inputs.A) * 100}%; background: ${d.color};"></div>
                      </div>
                      <div style="margin-left: 10px; font-size: 12px; font-weight: bold;">${d.value.toFixed(1)}h</div>
                  </div>
              `).join('')}
          </div>

          <div class="section-title" style="margin-top: 40px;">Dados de Produção</div>
          <table>
              <thead>
                  <tr>
                      <th>Indicador</th>
                      <th>Valor</th>
                      <th>Unidade</th>
                  </tr>
              </thead>
              <tbody>
                  <tr><td>Produção Real</td><td>${formatNumber(inputs.H)}</td><td>fardos</td></tr>
                  <tr><td>Produção Teórica</td><td>${formatNumber(results.G)}</td><td>fardos</td></tr>
                  <tr><td>Velocidade de Projeto</td><td>${formatNumber(results.F)}</td><td>gph</td></tr>
                  <tr><td>Paradas Não Programadas</td><td>${formatNumber(results.Q)}</td><td>h</td></tr>
                  <tr><td>Perda por Qualidade</td><td>${inputs.U}</td><td>garrafas</td></tr>
              </tbody>
          </table>

          ${aiAnalysis ? `
          <div class="ai-box">
              <div style="font-weight: bold; color: #4338ca; margin-bottom: 15px; font-size: 18px; border-bottom: 1px solid #ddd6fe; padding-bottom: 10px;">Análise Crítica Guideway AI</div>
              <div style="font-size: 14px; color: #4b5563;">${markdownToHtml(aiAnalysis)}</div>
          </div>
          ` : ''}

          <div style="margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center;">
              Gerado automaticamente por OEE GUIDEWAY Industrial Solutions
          </div>
      </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_OEE_Guideway_${inputs.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatNumber = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-10">
            <div className="flex justify-center mb-10">
              <div className="flex flex-col items-center gap-4">
                <img 
                  src="https://i.imgur.com/AIrsvfE_d.png?maxwidth=520&shape=thumb&fidelity=high" 
                  alt="Guideway Logo" 
                  className="w-32 h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-2xl font-bold text-white tracking-tight">OEE <span className="text-blue-500">GUIDEWAY</span></h1>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-8 text-center">Acesso ao Sistema</h2>
            
            <form onSubmit={handleLogin} className="space-y-5 flex flex-col">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {loginError && (
                <p className="text-red-400 text-xs text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20">
                  {loginError}
                </p>
              )}
              
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 mt-4"
              >
                ENTRAR NO SISTEMA
              </button>
            </form>
          </div>
          <div className="bg-white/5 p-5 text-center border-t border-white/5">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">© 2024 OEE GUIDEWAY - Inteligência Industrial</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <aside className="w-full md:w-80 bg-zinc-900 border-r border-white/10 flex flex-col shrink-0 z-20">
        <div className="p-8 border-b border-white/5 flex flex-col items-center text-center gap-4">
          <img 
            src="https://i.imgur.com/AIrsvfE_d.png?maxwidth=520&shape=thumb&fidelity=high" 
            alt="Guideway Logo" 
            className="w-40 h-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="font-bold text-xl leading-tight text-white tracking-tight">OEE GUIDEWAY</h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black mt-1">Industrial Solutions</p>
          </div>
        </div>

        <nav className="flex md:flex-col p-4 gap-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setShowAdminPanel(false); }}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' && !showAdminPanel ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Activity size={20} />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('evolution'); setShowAdminPanel(false); fetchHistory(); }}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'evolution' && !showAdminPanel ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <TrendingUp size={20} />
            <span className="hidden md:inline">Evolução</span>
          </button>
          <button 
            onClick={() => { setActiveTab('inputs'); setShowAdminPanel(false); }}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inputs' && !showAdminPanel ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Settings size={20} />
            <span className="hidden md:inline">Parâmetros</span>
          </button>
          
          {currentUser.isAdmin && (
            <button 
              onClick={() => setShowAdminPanel(true)}
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${showAdminPanel ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Users size={20} />
              <span className="hidden md:inline">Usuários</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-red-500/10 hover:text-red-400 mt-auto"
          >
            <LogOut size={20} />
            <span className="hidden md:inline">Sair</span>
          </button>
        </nav>

        <div className="hidden md:block p-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs">
              {currentUser.name[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{currentUser.isAdmin ? 'Admin' : 'Operador'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <AnimatePresence mode="wait">
          {showAdminPanel && currentUser.isAdmin ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white">Gestão de Acessos</h2>
                  <p className="text-slate-400 mt-1">Controle de usuários e permissões do sistema.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
                    <h3 className="text-lg font-bold text-white mb-6">Novo Usuário</h3>
                    <form onSubmit={handleCreateUser} className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome Completo</label>
                        <input 
                          type="text" 
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="Nome do colaborador"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail</label>
                        <input 
                          type="email" 
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="email@exemplo.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha</label>
                        <input 
                          type="text" 
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="Defina a senha"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-3 px-2">
                        <input 
                          type="checkbox" 
                          id="isAdmin"
                          checked={newUserIsAdmin}
                          onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50"
                        />
                        <label htmlFor="isAdmin" className="text-xs font-bold text-slate-400 cursor-pointer">
                          Este usuário é Administrador?
                        </label>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all"
                      >
                        CRIAR USUÁRIO NO BANCO
                      </button>
                    </form>
                  </div>
                </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="px-8 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Usuários Cadastrados no Supabase</h3>
                    <button 
                      onClick={fetchUsers}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <RefreshCw size={16} className={isLoadingUsers ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perfil</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senha</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {isLoadingUsers ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                            Carregando usuários...
                          </td>
                        </tr>
                      ) : users.map((user) => (
                        <tr key={user.email} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 text-sm font-bold text-white">{user.name}</td>
                          <td className="px-8 py-5 text-sm text-slate-400">{user.email}</td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${user.isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-slate-400'}`}>
                              {user.isAdmin ? 'Admin' : 'Operador'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-mono text-slate-500">{user.password}</td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => handleDeleteUser(user.email)}
                              className="text-slate-600 hover:text-red-400 transition-colors p-2"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!isLoadingUsers && users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                            Nenhum usuário encontrado no banco.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">
                      {inputs.line}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">
                      {inputs.sku}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-white">Monitoramento de Eficiência</h2>
                  <p className="text-slate-400 mt-1">Dados consolidados da linha de produção atual.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/10"
                  >
                    <Download size={14} />
                    Download Relatório
                  </button>
                  <button 
                    onClick={generateAIAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isAnalyzing ? 'Analisando...' : 'Gerar Insight IA'}
                  </button>
                  <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full border border-white/10 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Real</span>
                  </div>
                </div>
              </header>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                  title="Disponibilidade" 
                  value={results.disponibilidade} 
                  icon={<Clock className="text-blue-400" />} 
                  color="blue"
                  description="Tempo Operação / Tempo Programado"
                />
                <KPICard 
                  title="Performance" 
                  value={results.performance} 
                  icon={<TrendingUp className="text-orange-400" />} 
                  color="orange"
                  description="Tempo Líquido / Tempo Operação"
                />
                <KPICard 
                  title="Qualidade" 
                  value={results.qualidade} 
                  icon={<CheckCircle2 className="text-emerald-400" />} 
                  color="emerald"
                  description="Tempo Útil / Tempo Líquido"
                />
                <KPICard 
                  title="OEE Global" 
                  value={results.oee} 
                  icon={<Gauge className="text-indigo-400" />} 
                  color="indigo"
                  isMain
                  description="Eficiência Global do Equipamento"
                />
              </div>

              {/* Charts and Details Section */}
              <div className="grid grid-cols-1 gap-8">
                {/* Chart Card */}
                <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                      <Activity size={20} className="text-blue-400" />
                      Decomposição de Tempos (h)
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                        barSize={50}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={150} 
                          tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [value.toFixed(1), 'Valor']}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList dataKey="value" position="right" formatter={(v: number) => v.toFixed(1)} style={{ fill: '#cbd5e1', fontSize: 14, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm">
                    <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Produção & Velocidade</h3>
                    <div className="space-y-4">
                      <StatRow label="Produção Teórica" value={formatNumber(results.G)} unit="fardos" />
                      <StatRow label="Produção Real" value={formatNumber(inputs.H)} unit="fardos" highlight />
                      <StatRow label="Velocidade Projeto" value={formatNumber(results.F)} unit="gph" />
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm">
                    <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Análise de Perdas</h3>
                    <div className="space-y-4">
                      <StatRow label="Redução Velocidade" value={formatNumber(results.S)} unit="h" color="text-orange-400" />
                      <StatRow label="Perda Qualidade" value={formatNumber(results.V)} unit="h" color="text-red-400" />
                      <StatRow label="Paradas Não Prog." value={formatNumber(results.Q)} unit="h" color="text-red-400" />
                    </div>
                  </div>

                  <div className="bg-zinc-800 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative border border-white/5">
                    <div className="relative z-10">
                      <h3 className="font-bold text-[10px] opacity-50 uppercase tracking-widest mb-2">Status Operacional</h3>
                      <p className="text-2xl font-bold mb-4">
                        {results.oee >= 85 ? 'Classe Mundial' : results.oee >= 65 ? 'Aceitável' : 'Crítico'}
                      </p>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${results.oee}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full ${results.oee >= 85 ? 'bg-emerald-400' : results.oee >= 65 ? 'bg-blue-400' : 'bg-red-400'}`}
                        />
                      </div>
                    </div>
                    <Activity className="absolute -right-4 -bottom-4 opacity-[0.03]" size={120} />
                  </div>
                </div>

                {/* AI Analysis Section */}
                <AnimatePresence>
                  {(aiAnalysis || isAnalyzing) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-zinc-900 rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/5 overflow-hidden"
                    >
                      <div className="bg-indigo-600/10 px-8 py-4 border-b border-indigo-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-600 rounded-lg">
                            <Sparkles size={18} className="text-white" />
                          </div>
                          <h3 className="font-bold text-indigo-100">Análise Crítica Guideway AI</h3>
                        </div>
                        {isAnalyzing && (
                          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold animate-pulse">
                            Processando dados...
                          </div>
                        )}
                      </div>
                      <div className="p-8">
                        {isAnalyzing ? (
                          <div className="space-y-4">
                            <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                            <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none 
                            prose-headings:text-emerald-400 prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3 
                            prose-strong:text-white prose-strong:font-bold 
                            prose-p:text-slate-200 prose-p:leading-relaxed prose-p:mb-4
                            prose-hr:border-white/10 prose-hr:my-6
                            prose-table:text-xs prose-th:text-emerald-400 prose-td:text-slate-300">
                            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiAnalysis}</Markdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : activeTab === 'evolution' ? (
              <motion.div 
                key="evolution"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto space-y-8"
              >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white">Evolução Histórica</h2>
                  <p className="text-slate-400 mt-1">Acompanhamento do desempenho OEE ao longo do tempo.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Filtrar Mês</span>
                    <input 
                      type="month"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Filtrar Linha</span>
                    <select 
                      value={lineFilter}
                      onChange={(e) => setLineFilter(e.target.value)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer min-w-[140px]"
                    >
                      <option value="Todas">Todas as Linhas</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <option key={num} value={`Linha 0${num}`}>Linha 0{num}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={fetchHistory}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10 mt-5"
                  >
                    <RefreshCw size={14} />
                    Atualizar
                  </button>
                </div>
              </header>

              {/* Gráfico de Evolução */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm">
                <h3 className="font-bold text-lg flex items-center gap-2 text-white mb-8">
                  <BarChart3 size={20} className="text-indigo-400" />
                  Tendência de OEE Global (%)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...history].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="created_at" 
                        tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                        labelFormatter={(label) => new Date(label).toLocaleString('pt-BR')}
                        formatter={(value: number) => [value.toFixed(1) + '%', 'OEE']}
                      />
                      <Bar dataKey="oee_score" radius={[4, 4, 0, 0]}>
                        {history.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.oee_score >= 85 ? '#10b981' : entry.oee_score >= 65 ? '#3b82f6' : '#ef4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pareto de Paradas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-red-400 mb-8">
                    <AlertTriangle size={20} />
                    Pareto Não Programadas (Minutos Acumulados)
                  </h3>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={consolidatedMetrics.paretoNP}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                          formatter={(value: number) => [value + ' min', 'Duração']}
                        />
                        <Bar dataKey="duration" fill="#ef4444" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="duration" position="top" style={{ fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-blue-400 mb-8">
                    <Clock size={20} />
                    Pareto Programadas (Minutos Acumulados)
                  </h3>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={consolidatedMetrics.paretoP}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                          formatter={(value: number) => [value + ' min', 'Duração']}
                        />
                        <Bar dataKey="duration" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="duration" position="top" style={{ fill: '#3b82f6', fontSize: 11, fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* KPI Cards Consolidados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                  title="Disponibilidade Média" 
                  value={consolidatedMetrics.disponibilidade} 
                  icon={<Clock className="text-blue-400" />} 
                  color="blue"
                  description="Média do período filtrado"
                />
                <KPICard 
                  title="Performance Média" 
                  value={consolidatedMetrics.performance} 
                  icon={<TrendingUp className="text-orange-400" />} 
                  color="orange"
                  description="Média do período filtrado"
                />
                <KPICard 
                  title="Qualidade Média" 
                  value={consolidatedMetrics.qualidade} 
                  icon={<CheckCircle2 className="text-emerald-400" />} 
                  color="emerald"
                  description="Média do período filtrado"
                />
                <KPICard 
                  title="OEE Global Médio" 
                  value={consolidatedMetrics.oee} 
                  icon={<Gauge className="text-indigo-400" />} 
                  color="indigo"
                  isMain
                  description="Média do período filtrado"
                />
              </div>

              {/* Histórico Recente Section */}
              <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
                <div className="px-8 py-5 bg-white/5 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" />
                    Registros Detalhados
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data/Hora</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Linha</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Disp.</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Perf.</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Qual.</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">OEE</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {historyError ? (
                        <tr>
                          <td colSpan={8} className="px-8 py-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-red-400">
                              <AlertTriangle size={24} />
                              <p className="text-sm font-bold">Erro ao carregar histórico</p>
                              <p className="text-[10px] opacity-70">{historyError}</p>
                            </div>
                          </td>
                        </tr>
                      ) : history.length > 0 ? (
                        history.map((record) => (
                          <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-8 py-4 text-xs text-slate-400">
                              {new Date(record.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-8 py-4 text-xs font-bold text-white">{record.machine_name}</td>
                            <td className="px-8 py-4 text-xs text-slate-400">{record.sku}</td>
                            <td className="px-8 py-4 text-center text-xs text-slate-300">{record.availability.toFixed(1)}%</td>
                            <td className="px-8 py-4 text-center text-xs text-slate-300">{record.performance.toFixed(1)}%</td>
                            <td className="px-8 py-4 text-center text-xs text-slate-300">{record.quality.toFixed(1)}%</td>
                            <td className="px-8 py-4 text-center">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                record.oee_score >= 85 ? 'bg-emerald-500/20 text-emerald-400' : 
                                record.oee_score >= 65 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {record.oee_score.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right">
                              {currentUser.isAdmin && (
                                <button 
                                  onClick={() => deleteRecord(record.id)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Excluir Registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                            Nenhum registro encontrado para esta linha.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'inputs' ? (
            <motion.div 
              key="inputs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <header className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white">Parâmetros de Entrada</h2>
                <p className="text-slate-400 mt-1">Configure os dados base para o cálculo do OEE.</p>
              </header>

              <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-blue-400" />
                        Data do Relatório
                      </label>
                      <input 
                        type="date" 
                        value={inputs.date} 
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-white text-sm"
                      />
                    </div>
                    <InputField 
                      label="Linha de Produção" 
                      value={inputs.line} 
                      onChange={(v) => handleInputChange('line', v)} 
                      icon={<Activity size={16} />}
                      type="text"
                    />
                    <InputField 
                      label="Nome do Produto (SKU)" 
                      value={inputs.sku} 
                      onChange={(v) => handleInputChange('sku', v)} 
                      icon={<Package size={16} />}
                      type="text"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                  <InputGroup title="Configuração da Linha">
                    <InputField 
                      label="A - Tempo Total do Dia (h)" 
                      value={inputs.A} 
                      onChange={(v) => handleInputChange('A', v)} 
                      icon={<Clock size={16} />}
                    />
                    <InputField 
                      label="B - % Eficiência Projeto (%)" 
                      value={inputs.B} 
                      onChange={(v) => handleInputChange('B', v)} 
                      icon={<TrendingUp size={16} />}
                    />
                    <InputField 
                      label="C - Garrafas por Fardo" 
                      value={inputs.C} 
                      onChange={(v) => handleInputChange('C', v)} 
                      icon={<Package size={16} />}
                    />
                    <InputField 
                      label="D - Velocidade Nominal (gph)" 
                      value={inputs.D} 
                      onChange={(v) => handleInputChange('D', v)} 
                      icon={<Activity size={16} />}
                    />
                  </InputGroup>

                  <InputGroup title="Resultados de Turno">
                    <InputField 
                      label="H - Produção Real (fardos)" 
                      value={inputs.H} 
                      onChange={(v) => handleInputChange('H', v)} 
                      icon={<CheckCircle2 size={16} />}
                    />
                    <InputField 
                      label="K - Turnos de Produção" 
                      value={inputs.K} 
                      onChange={(v) => handleInputChange('K', v)} 
                      icon={<Clock size={16} />}
                    />
                    <InputField 
                      label="U - Perda por Qualidade (garrafas)" 
                      value={inputs.U} 
                      onChange={(v) => handleInputChange('U', v)} 
                      icon={<AlertTriangle size={16} />}
                    />
                  </InputGroup>

                  <InputGroup title="Registro de Paradas (Conforme Formulário)" fullWidth>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">Insira cada parada individualmente com seu respectivo código.</p>
                        {inputs.stops.length > 0 && (
                          <button 
                            onClick={() => setInputs(prev => ({ ...prev, stops: [] }))}
                            className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            Limpar Tudo
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {inputs.stops.map((stop, index) => {
                          const stopConfig = STOP_CODES.find(c => c.code === stop.code);
                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={stop.id} 
                              className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-all"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                                {index + 1}
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Código e Descrição</label>
                                  <select 
                                    value={stop.code}
                                    onChange={(e) => {
                                      const newStops = [...inputs.stops];
                                      newStops[index].code = parseInt(e.target.value);
                                      setInputs(prev => ({ ...prev, stops: newStops }));
                                    }}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                                  >
                                    {STOP_CODES.map(c => (
                                      <option key={c.code} value={c.code}>{c.code} - {c.description} ({c.category})</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Duração (Minutos)</label>
                                  <div className="relative">
                                    <input 
                                      type="number"
                                      value={stop.duration}
                                      onChange={(e) => {
                                        const newStops = [...inputs.stops];
                                        newStops[index].duration = parseFloat(e.target.value) || 0;
                                        setInputs(prev => ({ ...prev, stops: newStops }));
                                      }}
                                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all pr-12"
                                      placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">min</span>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const newStops = inputs.stops.filter((_, i) => i !== index);
                                  setInputs(prev => ({ ...prev, stops: newStops }));
                                }}
                                className="p-2 text-slate-600 hover:text-red-400 transition-colors bg-white/5 rounded-lg"
                              >
                                <Trash2 size={18} />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                      
                      <button 
                        onClick={() => {
                          const newStop: StopEntry = {
                            id: crypto.randomUUID(),
                            code: 1,
                            duration: 0
                          };
                          setInputs(prev => ({ ...prev, stops: [...prev.stops, newStop] }));
                        }}
                        className="w-full py-6 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-3 font-bold text-sm"
                      >
                        <RefreshCw size={18} className="text-blue-500" />
                        Adicionar Parada do Formulário
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 tracking-widest">Soma Paradas Programadas (N)</p>
                            <p className="text-2xl font-black text-white">{results.N.toFixed(2)}<span className="text-xs ml-1 text-slate-500">h</span></p>
                          </div>
                          <Clock size={24} className="text-blue-500/30" />
                        </div>
                        <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/10 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-red-400 uppercase mb-1 tracking-widest">Soma Paradas Não Programadas (Q)</p>
                            <p className="text-2xl font-black text-white">{results.Q.toFixed(2)}<span className="text-xs ml-1 text-slate-500">h</span></p>
                          </div>
                          <AlertTriangle size={24} className="text-red-500/30" />
                        </div>
                      </div>
                    </div>
                  </InputGroup>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                <button 
                  onClick={saveRecord}
                  disabled={isSaving}
                  className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Box size={20} />}
                  {isSaving ? 'Salvando...' : 'Salvar Registro no Banco'}
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
                >
                  Calcular e Ver Dashboard
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
    </ErrorBoundary>
  );
}

function KPICard({ title, value, icon, color, isMain = false, description }: { 
  title: string, 
  value: number, 
  icon: React.ReactNode, 
  color: string,
  isMain?: boolean,
  description: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
  }[color as 'blue' | 'orange' | 'emerald' | 'indigo'];

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between relative overflow-hidden ${isMain ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-black' : ''}`}
    >
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${colorClasses}`}>
          {icon}
        </div>
        <div className="text-right">
          <span className={`text-3xl font-black tracking-tighter ${isMain ? 'text-white' : 'text-white'}`}>
            {value.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="font-bold text-slate-200">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{description}</p>
      </div>
      {isMain && (
        <div className="absolute -right-4 -bottom-4 opacity-[0.05] text-white">
          <Gauge size={100} />
        </div>
      )}
    </motion.div>
  );
}

function StatRow({ label, value, unit, highlight = false, color = 'text-white' }: { 
  label: string, 
  value: string, 
  unit: string, 
  highlight?: boolean,
  color?: string
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${highlight ? 'bg-white/5 -mx-3 px-3 rounded-xl' : ''}`}>
      <span className="text-xs text-slate-500 font-semibold">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm font-bold ${highlight ? 'text-blue-400' : color}`}>{value}</span>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{unit}</span>
      </div>
    </div>
  );
}

function InputGroup({ title, children, fullWidth = false }: { title: string, children: React.ReactNode, fullWidth?: boolean }) {
  return (
    <div className={`bg-zinc-900 p-8 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">{title}</h3>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, icon, type = "number" }: { label: string, value: number | string, onChange: (v: string) => void, icon: React.ReactNode, type?: string }) {
  return (
    <div className="space-y-2.5">
      <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
        <span className="text-blue-400 opacity-70">{icon}</span>
        {label}
      </label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-white text-sm"
      />
    </div>
  );
}
