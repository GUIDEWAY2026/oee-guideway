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
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Types for our OEE data
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
  N: number; // Paradas Programadas (h)
  Q: number; // Paradas Não Programadas (h)
  U: number; // Perda por Qualidade (garrafas)
}

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

// --- CONFIGURAÇÃO DE ACESSOS PADRÃO (ALTERE AQUI SE PRECISAR) ---
const DEFAULT_USERS: User[] = [
  { name: 'Operador 01', email: 'Usuario01@guideway.com.br', password: 'G7w2K9pL', isAdmin: false },
  { name: 'Operador 02', email: 'Usuario02@guideway.com.br', password: 'X4v8M1nR', isAdmin: false },
  { name: 'Operador 03', email: 'Usuario03@guideway.com.br', password: 'B5z9T2qW', isAdmin: false },
  { name: 'Operador 04', email: 'Usuario04@guideway.com.br', password: 'H1k7J4sD', isAdmin: false },
  { name: 'Operador 05', email: 'Usuario05@guideway.com.br', password: 'Y3m9N6tF', isAdmin: false },
  { name: 'Operador 06', email: 'Usuario06@guideway.com.br', password: 'C2b8V5xG', isAdmin: false },
  { name: 'Operador 07', email: 'Usuario07@guideway.com.br', password: 'P9l1K4jH', isAdmin: false },
  { name: 'Operador 08', email: 'Usuario08@guideway.com.br', password: 'R7f3D6sA', isAdmin: false },
  { name: 'Operador 09', email: 'Usuario09@guideway.com.br', password: 'W2q8E5rT', isAdmin: false },
  { name: 'Operador 10', email: 'Usuario10@guideway.com.br', password: 'Z1x7C4vB', isAdmin: false },
];
// ---------------------------------------------------------------

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

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
    N: 2.5,
    Q: 1.5,
    U: 2500
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inputs'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculation logic based on the provided formulas
  const results = useMemo((): OEEResults => {
    const { A, B, C, D, H, K, N, Q, U } = inputs;

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
      F, G, I, L, M, O, P, R, S, T, V, X,
      disponibilidade: Math.max(0, disponibilidade * 100),
      performance: Math.max(0, performance * 100),
      qualidade: Math.max(0, qualidade * 100),
      oee: Math.max(0, oee * 100)
    };
  }, [inputs]);

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3.1-flash-lite-preview";
      
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
      - Paradas Não Programadas: ${inputs.Q}h
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
        contents: prompt,
      });

      setAiAnalysis(response.text || 'Não foi possível gerar a análise no momento.');
    } catch (error) {
      console.error('Erro na análise IA:', error);
      setAiAnalysis('Erro ao conectar com o serviço de IA. Verifique sua conexão e tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [
    { name: 'TEMPO TOTAL', value: inputs.A, color: '#7e22ce' },
    { name: 'TEMPO PROGRAMADO', value: results.P, color: '#0ea5e9' },
    { name: 'TEMPO DE OPERAÇÃO', value: results.R, color: '#15803d' },
    { name: 'TEMPO LÍQUIDO', value: results.T, color: '#ea580c' },
    { name: 'TEMPO ÚTIL', value: results.X, color: '#0369a1' },
  ];

  // Initialize users and check session
  useEffect(() => {
    const savedUsers = localStorage.getItem('oee_guide_users');
    const adminUser: User = {
      name: 'José Marcelo',
      email: 'josemarcelolustosa@gmail.com',
      password: 'papapipi1',
      isAdmin: true
    };

    let finalUsers = [adminUser, ...DEFAULT_USERS];

    if (savedUsers) {
      const parsed = JSON.parse(savedUsers);
      // Filter out any users that are already in the default or admin list to avoid duplicates
      const customUsers = parsed.filter((u: User) => 
        u.email !== adminUser.email && 
        !DEFAULT_USERS.some(def => def.email === u.email)
      );
      finalUsers = [...finalUsers, ...customUsers];
    }
    
    setUsers(finalUsers);

    const session = localStorage.getItem('oee_guide_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('oee_guide_users', JSON.stringify(users));
  }, [users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === loginEmail && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('oee_guide_session', JSON.stringify(user));
      setLoginError('');
    } else {
      setLoginError('E-mail ou senha incorretos.');
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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.find(u => u.email === newUserEmail)) {
      alert('Este e-mail já está cadastrado.');
      return;
    }
    const newUser: User = {
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      isAdmin: false
    };
    setUsers([...users, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
  };

  const handleDeleteUser = (email: string) => {
    if (email === 'josemarcelolustosa@gmail.com') {
      alert('O administrador principal não pode ser excluído.');
      return;
    }
    if (DEFAULT_USERS.some(u => u.email === email)) {
      alert('Usuários padrão do sistema não podem ser excluídos via interface.');
      return;
    }
    setUsers(users.filter(u => u.email !== email));
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
                  <tr><td>Paradas Não Programadas</td><td>${inputs.Q}</td><td>h</td></tr>
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
                          type="password" 
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="Senha do usuário"
                          required
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all"
                      >
                        CRIAR USUÁRIO
                      </button>
                    </form>
                  </div>
                </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="px-8 py-5 bg-white/5 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Contas de Acesso Padrão (Código)</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {DEFAULT_USERS.map((user) => (
                        <tr key={user.email} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-4 text-sm font-bold text-white">{user.name}</td>
                          <td className="px-8 py-4 text-sm text-slate-400">{user.email}</td>
                          <td className="px-8 py-4 text-sm font-mono text-emerald-400">{user.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden mt-8">
                  <div className="px-8 py-5 bg-white/5 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Usuários Personalizados (Navegador)</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perfil</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.filter(u => u.email !== 'josemarcelolustosa@gmail.com' && !DEFAULT_USERS.some(d => d.email === u.email)).map((user) => (
                        <tr key={user.email} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 text-sm font-bold text-white">{user.name}</td>
                          <td className="px-8 py-5 text-sm text-slate-400">{user.email}</td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-zinc-800 text-slate-400">
                              Operador
                            </span>
                          </td>
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
                      {users.filter(u => u.email !== 'josemarcelolustosa@gmail.com' && !DEFAULT_USERS.some(d => d.email === u.email)).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                            Nenhum usuário personalizado criado.
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Card */}
                <div className="lg:col-span-2 bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
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
                        margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                        barSize={50}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={150} 
                          tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
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
                          <LabelList dataKey="value" position="right" formatter={(v: number) => v.toFixed(1)} style={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="space-y-6">
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
                      <StatRow label="Paradas Não Prog." value={formatNumber(inputs.Q)} unit="h" color="text-red-400" />
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
          ) : (
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

                  <InputGroup title="Paradas Registradas" fullWidth>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputField 
                        label="N - Paradas Programadas (h)" 
                        value={inputs.N} 
                        onChange={(v) => handleInputChange('N', v)} 
                        icon={<Clock size={16} />}
                      />
                      <InputField 
                        label="Q - Paradas Não Programadas (h)" 
                        value={inputs.Q} 
                        onChange={(v) => handleInputChange('Q', v)} 
                        icon={<AlertTriangle size={16} />}
                      />
                    </div>
                  </InputGroup>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 group"
                >
                  Calcular e Ver Dashboard
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
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
