/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronDown,
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
  Cpu,
  Search,
  ArrowRight,
  Hash,
  Pencil,
  X,
  FileSpreadsheet,
  Database,
  Table,
  Wrench,
  FileText,
  Printer,
  Layers,
  ShieldCheck,
  Shield,
  Lock,
  Key,
  UserCheck,
  Laptop,
  Smartphone,
  ScanFace
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ExecutiveMobileApp } from '@/components/ExecutiveMobileApp';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  BiometricCredentialProfile,
  authenticateWithBiometricFaceId,
  detectBiometricPlatform,
  getEnrolledBiometricProfiles,
} from '@/lib/biometricAuth';

// Error Boundary Component
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
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

// Diretrizes de Cores do Indicador OEE
// < 50% (VERMELHO)
// 50% a 55% (AMARELO)
// 55% a 65% (VERDE MINT #99EDC3)
// 65% a 75% (VERDE GREEN #3CB043)
// > 75% (AZUL)
export interface OEEColorConfig {
  hex: string;
  name: string;
  label: string;
  rangeText: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const OEE_COLOR_THRESHOLDS = [
  { min: 0, max: 50, hex: '#ef4444', name: 'VERMELHO', label: 'Crítico', rangeText: '< 50%' },
  { min: 50, max: 55, hex: '#eab308', name: 'AMARELO', label: 'Atenção', rangeText: '50% a 55%' },
  { min: 55, max: 65, hex: '#99EDC3', name: 'VERDE MINT', label: 'Moderado', rangeText: '55% a 65%' },
  { min: 65, max: 75, hex: '#3CB043', name: 'VERDE GREEN', label: 'Bom', rangeText: '65% a 75%' },
  { min: 75, max: Infinity, hex: '#3b82f6', name: 'AZUL', label: 'Excelente', rangeText: '> 75%' }
];

export const getOEEColorInfo = (oee: number): OEEColorConfig => {
  if (oee < 50) {
    return {
      hex: '#ef4444',
      name: 'VERMELHO',
      label: 'Crítico',
      rangeText: '< 50%',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-400',
      borderClass: 'border-red-500/30',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeBorder: 'rgba(239, 68, 68, 0.35)',
      badgeText: '#ef4444'
    };
  }
  if (oee <= 55) {
    return {
      hex: '#eab308',
      name: 'AMARELO',
      label: 'Atenção',
      rangeText: '50% a 55%',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-400',
      borderClass: 'border-yellow-500/30',
      badgeBg: 'rgba(234, 179, 8, 0.15)',
      badgeBorder: 'rgba(234, 179, 8, 0.35)',
      badgeText: '#eab308'
    };
  }
  if (oee <= 65) {
    return {
      hex: '#99EDC3',
      name: 'VERDE MINT',
      label: 'Moderado',
      rangeText: '55% a 65%',
      bgClass: 'bg-[#99EDC3]/20',
      textClass: 'text-[#99EDC3]',
      borderClass: 'border-[#99EDC3]/30',
      badgeBg: 'rgba(153, 237, 195, 0.15)',
      badgeBorder: 'rgba(153, 237, 195, 0.35)',
      badgeText: '#99EDC3'
    };
  }
  if (oee <= 75) {
    return {
      hex: '#3CB043',
      name: 'VERDE GREEN',
      label: 'Bom',
      rangeText: '65% a 75%',
      bgClass: 'bg-[#3CB043]/20',
      textClass: 'text-[#3CB043]',
      borderClass: 'border-[#3CB043]/30',
      badgeBg: 'rgba(60, 176, 67, 0.15)',
      badgeBorder: 'rgba(60, 176, 67, 0.35)',
      badgeText: '#3CB043'
    };
  }
  return {
    hex: '#3b82f6',
    name: 'AZUL',
    label: 'Excelente',
    rangeText: '> 75%',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    badgeText: '#3b82f6'
  };
};

export const getOEEColorHex = (oee: number): string => {
  return getOEEColorInfo(oee).hex;
};

// Custom Tooltip for OEE Evolution Chart
const CustomOEEEvolutionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const oee = payload[0].value;
    const colorInfo = getOEEColorInfo(oee);
    return (
      <div className="bg-zinc-900 border border-white/10 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
          {new Date(label).toLocaleString('pt-BR')}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10" style={{ backgroundColor: colorInfo.hex }} />
          <p className="text-sm font-black" style={{ color: colorInfo.hex }}>
            OEE: {oee.toFixed(1)}%
          </p>
          <span 
            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border"
            style={{ 
              backgroundColor: colorInfo.badgeBg, 
              color: colorInfo.badgeText, 
              borderColor: colorInfo.badgeBorder 
            }}
          >
            {colorInfo.rangeText}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Types for our OEE data
interface StopEntry {
  id: string;
  code: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  duration: number;  // minutos (calculado)
  reasonCategory?: string; // Categoria do Motivo para OUTROS
  customReason?: string;   // Observação personalizada para OUTROS
}

// Helper to calculate duration in minutes between two HH:mm strings
const calculateDurationMinutes = (start: string, end: string): number => {
  if (!start || !end) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  
  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  
  // Handle overnight stops (e.g., 23:00 to 01:00)
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  return endTotal - startTotal;
};

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
  shiftStartTime: string; // HORA INÍCIO DO TURNO
  shiftEndTime: string;   // HORA DO TÉRMINO DO TURNO
  initialCounter: number; // CONTADOR INICIAL
  finalCounter: number;   // CONTADOR FINAL
}

interface StopCode {
  code: number;
  description: string;
  category: 'P' | 'NP';
}

const DEFAULT_STOP_CODES: StopCode[] = [
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
  { code: 34, description: 'TROCA DE RÓTULO (Rótulo)', category: 'NP' },
  { code: 35, description: 'TROCA DE BOBINA DE FILME (Empacotadora)', category: 'NP' },
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
  maintenanceIndex: number;
  teep: number;
  productivity: number;
}

// Types for Authentication
export type UserRole = 'admin' | 'operador' | 'usuario' | 'diretoria';

interface User {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  role: UserRole;
}

// --- CONFIGURAÇÃO DE ACESSOS PADRÃO ---
// Agora os usuários são gerenciados via Supabase.
// O administrador principal será verificado pelo e-mail.
const MAIN_ADMIN_EMAIL = 'josemarcelolustosa@gmail.com';
// ---------------------------------------------------------------

export const isUserAdmin = (u: User | null | undefined): boolean => {
  if (!u) return false;
  return u.isAdmin === true || u.role === 'admin' || (typeof u.email === 'string' && u.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase());
};

export const isUserViewer = (u: User | null | undefined): boolean => {
  if (!u) return false;
  return u.role === 'usuario' && !isUserAdmin(u);
};

export const isUserDiretoria = (u: User | null | undefined): boolean => {
  if (!u) return false;
  return u.role === 'diretoria' && !isUserAdmin(u);
};

export const canUserEdit = (u: User | null | undefined): boolean => {
  if (!u) return false;
  return !isUserViewer(u) && !isUserDiretoria(u);
};

export const normalizeUserRole = (rawRole: any, isAdminFlag?: boolean, email?: string): UserRole => {
  if (rawRole === 'admin' || rawRole === 'operador' || rawRole === 'usuario' || rawRole === 'diretoria') {
    return rawRole;
  }
  if (isAdminFlag || (typeof email === 'string' && email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase())) {
    return 'admin';
  }
  return 'operador';
};

// =========================================================================
// SISTEMA DE CRIPTOGRAFIA DE SENHAS (SHA-256 COM SALT SEGURO)
// =========================================================================
const PASSWORD_SALT = 'guideway_oee_secure_salt_v2';

export const hashPassword = async (plainPassword: string, salt: string = PASSWORD_SALT): Promise<string> => {
  if (!plainPassword) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${plainPassword}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  } catch (e) {
    let hash = 0;
    const combined = `${salt}:${plainPassword}:${salt}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:fb_${Math.abs(hash).toString(16)}`;
  }
};

export const verifyPassword = async (inputPassword: string, storedPasswordHash: string): Promise<boolean> => {
  if (!storedPasswordHash || !inputPassword) return false;
  // Suporte a senhas legadas em texto puro (migração automática transparente)
  if (!storedPasswordHash.startsWith('sha256:')) {
    return inputPassword === storedPasswordHash;
  }
  const computedHash = await hashPassword(inputPassword);
  return computedHash === storedPasswordHash;
};

// =========================================================================
// CONTROLE DE ACESSO & AUDITORIA DE LOGINS
// =========================================================================
export interface AccessLog {
  id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole | string;
  login_at: string;
  device_info: string;
  status: 'sucesso' | 'falha';
}

// --- CONFIGURAÇÃO DAS LINHAS DE PRODUÇÃO (LAYOUT DA FÁBRICA) ---
export const PRODUCTION_LINES = [
  'Linha 01',
  'Linha 02',
  'Linha 03',
  'Linha 04',
  'Linha 05',
  'Linha 06',
  'Linha 07',
  'Linha 08',
  'Linha 09'
];

export const LINE_MAPPING_DE_PARA: Record<string, string> = {
  'Linha 01': 'Linha 09',
  'Linha 02': 'Linha 07',
  'Linha 03': 'Linha 06',
  'Linha 04': 'Linha 05',
  'Linha 05': 'Linha 04',
  'Linha 06': 'Linha 03',
  'Linha 07': 'Linha 02',
  'Linha 08': 'Linha 01',
  'Linha 09': 'Linha 08',
  'Linha 1': 'Linha 09',
  'Linha 2': 'Linha 07',
  'Linha 3': 'Linha 06',
  'Linha 4': 'Linha 05',
  'Linha 5': 'Linha 04',
  'Linha 6': 'Linha 03',
  'Linha 7': 'Linha 02',
  'Linha 8': 'Linha 01',
  'Linha 9': 'Linha 08',
};

export const LINE_RENUMBERING_TABLE = [
  { de: 'Linha 01', deNum: 1, para: 'Linha 09', paraNum: 9 },
  { de: 'Linha 02', deNum: 2, para: 'Linha 07', paraNum: 7 },
  { de: 'Linha 03', deNum: 3, para: 'Linha 06', paraNum: 6 },
  { de: 'Linha 04', deNum: 4, para: 'Linha 05', paraNum: 5 },
  { de: 'Linha 05', deNum: 5, para: 'Linha 04', paraNum: 4 },
  { de: 'Linha 06', deNum: 6, para: 'Linha 03', paraNum: 3 },
  { de: 'Linha 07', deNum: 7, para: 'Linha 02', paraNum: 2 },
  { de: 'Linha 08', deNum: 8, para: 'Linha 01', paraNum: 1 },
  { de: 'Linha 09', deNum: 9, para: 'Linha 08', paraNum: 8 },
];

// Helper para migrar registros no localStorage
export const migrateLocalRecordsHelper = (): number => {
  try {
    const raw = localStorage.getItem('oee_local_records');
    if (!raw) return 0;
    const localRecords = JSON.parse(raw);
    if (!Array.isArray(localRecords) || localRecords.length === 0) return 0;
    
    let count = 0;
    const updated = localRecords.map(rec => {
      let changed = false;
      let newMachineName = rec.machine_name;
      if (rec.machine_name && LINE_MAPPING_DE_PARA[rec.machine_name]) {
        newMachineName = LINE_MAPPING_DE_PARA[rec.machine_name];
        changed = true;
      }
      
      let newDowntimeData = rec.downtime_data;
      if (rec.downtime_data) {
        try {
          const parsed = typeof rec.downtime_data === 'string' ? JSON.parse(rec.downtime_data) : rec.downtime_data;
          if (parsed && parsed.line && LINE_MAPPING_DE_PARA[parsed.line]) {
            parsed.line = LINE_MAPPING_DE_PARA[parsed.line];
            newDowntimeData = JSON.stringify(parsed);
            changed = true;
          }
        } catch (_) {}
      }

      if (changed) {
        count++;
        return {
          ...rec,
          machine_name: newMachineName,
          downtime_data: newDowntimeData
        };
      }
      return rec;
    });

    if (count > 0) {
      localStorage.setItem('oee_local_records', JSON.stringify(updated));
    }
    return count;
  } catch (err) {
    console.error("Erro na migração local:", err);
    return 0;
  }
};

// Safe localStorage helper to prevent JSON parsing crashes
const safeGetLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Erro ao ler/parsear a chave "${key}" do localStorage:`, e);
    try {
      localStorage.removeItem(key); // Remove para evitar erros subsequentes
    } catch (_) {}
    return defaultValue;
  }
};

const generateSampleLocalRecords = () => {
  const records = [];
  const lines = PRODUCTION_LINES;
  const skus = ['Água Mineral 500ml', 'Água Mineral 1.5L', 'Água com Gás 500ml'];
  
  const today = new Date();
  
  for (let i = 45; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12, 0, 0);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    lines.forEach((line, lineIdx) => {
      const avail = 75 + Math.random() * 20;
      const perf = 80 + Math.random() * 18;
      const qual = 95 + Math.random() * 4.9;
      
      const calculatedOee = (avail/100) * (perf/100) * (qual/100) * 100;
      const sku = skus[(i + lineIdx) % skus.length];
      
      const sampleInputs: OEEInputs = {
        date: dateStr,
        sku: sku,
        line: line,
        A: 24,
        B: 80,
        C: 12,
        D: 22000,
        H: Math.floor(8000 + Math.random() * 4000),
        K: 2,
        stops: [
          { id: 's1', code: 101, startTime: '12:00', endTime: '13:00', duration: 60 },
          { id: 's2', code: 2, startTime: '15:30', endTime: '16:00', duration: 30 }
        ],
        U: Math.floor(Math.random() * 100),
        shiftStartTime: '06:00',
        shiftEndTime: '22:00',
        initialCounter: 0,
        finalCounter: 120000
      };
      
      records.push({
        id: `local-sample-${i}-${lineIdx}`,
        created_at: date.toISOString(),
        machine_name: line,
        sku: sku,
        availability: avail,
        performance: perf,
        quality: qual,
        oee_score: calculatedOee,
        shift: 'Turnos: 2',
        notes: `Produção Real: ${sampleInputs.H}`,
        downtime_data: JSON.stringify(sampleInputs)
      });
    });
  }
  return records;
};

export default function App() {
  const [useLocalFallback, setUseLocalFallback] = useState(!isSupabaseConfigured);
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'access_logs' | 'stops' | 'lines' | 'export'>('users');
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() => {
    return safeGetLocalStorage<AccessLog[]>('oee_access_logs', []);
  });
  const [isLoadingAccessLogs, setIsLoadingAccessLogs] = useState(false);
  const [accessLogSearch, setAccessLogSearch] = useState('');
  const [accessLogFilterRole, setAccessLogFilterRole] = useState<'todos' | 'admin' | 'operador' | 'usuario' | 'diretoria'>('todos');
  const [accessLogFilterStatus, setAccessLogFilterStatus] = useState<'todos' | 'sucesso' | 'falha'>('todos');
  const [resettingUserEmail, setResettingUserEmail] = useState<string | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState<string>('');
  const [editingUserOriginalEmail, setEditingUserOriginalEmail] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserEmail, setEditUserEmail] = useState<string>('');
  const [editUserPassword, setEditUserPassword] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('operador');
  const [editUserError, setEditUserError] = useState<string>('');
  const [isSavingEditedUser, setIsSavingEditedUser] = useState<boolean>(false);
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [enrolledBiometrics, setEnrolledBiometrics] = useState<BiometricCredentialProfile[]>(() =>
    getEnrolledBiometricProfiles()
  );
  const [selectedBiometricEmail, setSelectedBiometricEmail] = useState<string>(() => {
    const list = getEnrolledBiometricProfiles();
    return list[0]?.userEmail || '';
  });
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginHomeGuide, setShowLoginHomeGuide] = useState(false);
  const { isInstallable: isPWAInstallable, isInstalled: isPWAInstalled, isIOS: isIOSDevice, install: installPWA } = usePWAInstall();
  const biometricPlatform = useMemo(() => detectBiometricPlatform(), []);
  const [users, setUsers] = useState<User[]>([]);
  const [stopCodes, setStopCodes] = useState<StopCode[]>(DEFAULT_STOP_CODES);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [editingStop, setEditingStop] = useState<StopCode | null>(null);
  const [newStop, setNewStop] = useState<Partial<StopCode>>({ category: 'NP' });
  const [isMigratingLines, setIsMigratingLines] = useState(false);
  const [migrationReport, setMigrationReport] = useState<string | null>(null);
  const [migrationStatusType, setMigrationStatusType] = useState<'success' | 'info' | 'error'>('info');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initial state based on the provided example image
  const [inputs, setInputs] = useState<OEEInputs>(() => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date: localDate,
      sku: 'Água Mineral 500ml',
      line: 'Linha 01',
      A: 24,
      B: 80,
      C: 12,
      D: 22000,
      H: 10000,
      K: 2,
      stops: [],
      U: 0,
      shiftStartTime: '06:00',
      shiftEndTime: '22:00',
      initialCounter: 0,
      finalCounter: 120000
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inputs' | 'evolution' | 'maintenance'>('dashboard');
  const [dashboardViewMode, setDashboardViewMode] = useState<'dia' | 'mes'>('dia');
  const [dashboardMonth, setDashboardMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [dashboardDate, setDashboardDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [dashboardLine, setDashboardLine] = useState('Linha 01');
  const [dashboardRecord, setDashboardRecord] = useState<any>(null);
  const [isFetchingDashboard, setIsFetchingDashboard] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [lineFilter, setLineFilter] = useState<string>('Todas');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedDates, setSelectedDates] = useState<string[]>(['Todas']);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState<boolean>(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Estados da aba Manutenção Industrial
  const [maintenanceMonth, setMaintenanceMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [maintenanceLine, setMaintenanceLine] = useState<string>('Todas');
  const [allSystemRecords, setAllSystemRecords] = useState<any[]>([]);
  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState(false);

  // Estados do One Page Report (OPR)
  const [showOnePageReport, setShowOnePageReport] = useState<boolean>(false);
  const [oprMonth, setOprMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);
  const oprPrintRef = useRef<HTMLDivElement>(null);

  // Fechar menu de datas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllDatesSelected = useMemo(() => {
    return selectedDates.length === 0 || selectedDates.includes('Todas');
  }, [selectedDates]);

  const getDateFilterLabel = () => {
    if (isAllDatesSelected) return 'Todas as Datas';
    if (selectedDates.length === 1) return `Dia ${selectedDates[0].padStart(2, '0')}`;
    
    const nums = selectedDates.map(d => parseInt(d)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (nums.length === 0) return 'Todas as Datas';
    
    let isContiguous = true;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] !== nums[i - 1] + 1) {
        isContiguous = false;
        break;
      }
    }
    
    if (isContiguous && nums.length > 1) {
      return `Dia ${nums[0].toString().padStart(2, '0')} a ${nums[nums.length - 1].toString().padStart(2, '0')}`;
    }
    
    if (nums.length <= 3) {
      return nums.map(n => `Dia ${n.toString().padStart(2, '0')}`).join(', ');
    }
    
    return `${nums.length} datas sel.`;
  };

  const toggleDateSelection = (dayStr: string) => {
    if (dayStr === 'Todas') {
      setSelectedDates(['Todas']);
      return;
    }

    let updated = selectedDates.filter(d => d !== 'Todas');
    if (updated.includes(dayStr)) {
      updated = updated.filter(d => d !== dayStr);
    } else {
      updated.push(dayStr);
    }

    if (updated.length === 0) {
      setSelectedDates(['Todas']);
    } else {
      setSelectedDates(updated);
    }
  };
  const [selectedStopTrace, setSelectedStopTrace] = useState<{
    code: number;
    description: string;
    category: 'P' | 'NP';
    occurrences: Array<{
      date: string;
      line: string;
      startTime?: string;
      endTime?: string;
      duration: number;
      reasonCategory?: string;
      customReason?: string;
      recordId: string;
    }>;
  } | null>(null);

  const handleStopClick = (data: any) => {
    if (!data || !data.code) return;
    
    const code = Number(data.code);
    const config = stopCodes.find(c => c.code === code);
    const description = config ? config.description : data.name.replace(/^\d+\s*-\s*/, '');
    
    const occurrences: any[] = [];
    
    history.forEach(record => {
      if (record.downtime_data) {
        try {
          const parsed = typeof record.downtime_data === 'string' 
            ? JSON.parse(record.downtime_data) 
            : record.downtime_data;
          
          const stops: StopEntry[] = Array.isArray(parsed) ? parsed : (parsed.stops || []);
          
          stops.forEach(stop => {
            if (Number(stop.code) === code) {
              const rDate = new Date(record.created_at);
              const formattedDate = `${String(rDate.getDate()).padStart(2, '0')}/${String(rDate.getMonth() + 1).padStart(2, '0')}/${rDate.getFullYear()}`;
              occurrences.push({
                date: formattedDate,
                line: record.machine_name,
                startTime: stop.startTime,
                endTime: stop.endTime,
                duration: stop.duration,
                reasonCategory: stop.reasonCategory,
                customReason: stop.customReason,
                recordId: record.id
              });
            }
          });
        } catch (e) {
          console.error("Erro ao processar downtime_data no clique da parada:", e);
        }
      }
    });
    
    occurrences.sort((a, b) => {
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0])).getTime();
      const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0])).getTime();
      return dateB - dateA;
    });

    setSelectedStopTrace({
      code,
      description,
      category: data.category || 'NP',
      occurrences
    });
  };

  // Buscar o último registro geral para inicializar o Dashboard
  const fetchLatestRecord = async () => {
    if (!currentUser) return;
    setIsFetchingDashboard(true);
    try {
      if (useLocalFallback) {
        const localRecordsStr = localStorage.getItem('oee_local_records');
        const localRecords = localRecordsStr ? JSON.parse(localRecordsStr) : [];
        if (localRecords.length > 0) {
          localRecords.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const latest = localRecords[0];
          const d = new Date(latest.created_at);
          const recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setDashboardDate(recordDate);
          setDashboardLine(latest.machine_name);
          setDashboardRecord(latest);
        }
        return;
      }

      const { data, error } = await supabase
        .from('oee_records')
        .select('id, created_at, machine_name, sku, availability, performance, quality, oee_score, shift, notes, downtime_data')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const latest = data[0];
        // Extrai apenas a parte da data YYYY-MM-DD (Local)
        const d = new Date(latest.created_at);
        const recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        setDashboardDate(recordDate);
        setDashboardLine(latest.machine_name);
        setDashboardRecord(latest);
      }
    } catch (err) {
      console.error('Erro ao buscar último registro para o dashboard, usando local:', err);
      const localRecordsStr = localStorage.getItem('oee_local_records');
      const localRecords = localRecordsStr ? JSON.parse(localRecordsStr) : [];
      if (localRecords.length > 0) {
        localRecords.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = localRecords[0];
        const d = new Date(latest.created_at);
        const recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setDashboardDate(recordDate);
        setDashboardLine(latest.machine_name);
        setDashboardRecord(latest);
      }
    } finally {
      setIsFetchingDashboard(false);
    }
  };

  // Buscar usuários do Supabase (Apenas para ADM)
  const ensureAdminExists = async () => {
    try {
      const defaultAdminPassHash = await hashPassword('admin');

      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        const adminIndex = localUsers.findIndex(u => u.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase());
        if (adminIndex === -1) {
          const newAdmin = {
            name: 'Administrador Guideway',
            email: MAIN_ADMIN_EMAIL,
            password: defaultAdminPassHash,
            is_admin: true,
            role: 'admin'
          };
          localStorage.setItem('oee_local_users', JSON.stringify([...localUsers, newAdmin]));
        } else {
          // Garante que o administrador local existente de fato tenha a flag is_admin: true, role: 'admin' e senha criptografada
          const existing = localUsers[adminIndex];
          const hasEncryptedPass = existing.password && existing.password.startsWith('sha256:');
          const updatedUsers = [...localUsers];
          updatedUsers[adminIndex] = {
            ...existing,
            is_admin: true,
            role: 'admin',
            password: hasEncryptedPass ? existing.password : defaultAdminPassHash
          };
          localStorage.setItem('oee_local_users', JSON.stringify(updatedUsers));
        }
        return;
      }

      // No Supabase, busca por correspondência insensível a maiúsculas/minúsculas
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', MAIN_ADMIN_EMAIL)
        .maybeSingle();
      
      if (!data) {
        console.log('Criando usuário administrador inicial com senha criptografada...');
        await supabase.from('users').insert([{
          name: 'Administrador Guideway',
          email: MAIN_ADMIN_EMAIL,
          password: defaultAdminPassHash,
          is_admin: true
        }]);
      } else {
        const updates: any = {};
        if (!data.is_admin) updates.is_admin = true;
        if (data.password && !data.password.startsWith('sha256:')) {
          updates.password = defaultAdminPassHash;
        }
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('users')
            .update(updates)
            .eq('email', data.email);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar administrador:', err);
    }
  };

  const fetchUsers = async () => {
    if (!isUserAdmin(currentUser)) return;
    setIsLoadingUsers(true);
    try {
      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        setUsers(localUsers.map(u => {
          const role = normalizeUserRole(u.role, u.is_admin, u.email);
          return {
            name: u.name,
            email: u.email,
            password: u.password,
            isAdmin: role === 'admin',
            role
          };
        }));
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        setUsers(data.map(u => {
          const localMatch = localUsers.find(lu => lu.email.toLowerCase() === u.email.toLowerCase());
          const role = normalizeUserRole(u.role || localMatch?.role, u.is_admin, u.email);
          return {
            name: u.name,
            email: u.email,
            password: u.password,
            isAdmin: role === 'admin',
            role
          };
        }));
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuários, usando local:', error);
      const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
      setUsers(localUsers.map(u => {
        const role = normalizeUserRole(u.role, u.is_admin, u.email);
        return {
          name: u.name,
          email: u.email,
          password: u.password,
          isAdmin: role === 'admin',
          role
        };
      }));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Gravar registro de acesso / login para auditoria do Administrador
  const recordAccessLog = async (logData: { user_name: string; user_email: string; user_role: string; status: 'sucesso' | 'falha'; device_info: string }) => {
    try {
      const newEntry: AccessLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_name: logData.user_name || 'Desconhecido',
        user_email: logData.user_email || 'sem-email',
        user_role: logData.user_role || 'operador',
        login_at: new Date().toISOString(),
        device_info: logData.device_info,
        status: logData.status
      };

      // Sempre armazena no cache local persistente
      const localLogs = safeGetLocalStorage<AccessLog[]>('oee_access_logs', []);
      const updated = [newEntry, ...localLogs].slice(0, 1000);
      localStorage.setItem('oee_access_logs', JSON.stringify(updated));
      setAccessLogs(updated);

      // Tenta gravar no Supabase caso a tabela access_logs exista
      if (!useLocalFallback) {
        try {
          await supabase.from('access_logs').insert([{
            user_name: newEntry.user_name,
            user_email: newEntry.user_email,
            user_role: newEntry.user_role,
            login_at: newEntry.login_at,
            device_info: newEntry.device_info,
            status: newEntry.status
          }]);
        } catch {
          // Falha silenciosa se tabela remota não existir ainda
        }
      }
    } catch (err) {
      console.error('Erro ao registrar log de acesso:', err);
    }
  };

  // Buscar histórico de acessos para o painel de auditoria do ADMIN
  const fetchAccessLogs = async () => {
    if (!isUserAdmin(currentUser)) return;
    setIsLoadingAccessLogs(true);
    try {
      const localLogs = safeGetLocalStorage<AccessLog[]>('oee_access_logs', []);
      if (useLocalFallback) {
        setAccessLogs(localLogs);
        return;
      }

      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(300);

      if (error || !data || data.length === 0) {
        setAccessLogs(localLogs);
      } else {
        // Mesclar dados do Supabase com os locais
        const map = new Map<string, AccessLog>();
        data.forEach(item => {
          const key = item.id || `${item.login_at}_${item.user_email}`;
          map.set(key, {
            id: item.id || `log-${item.login_at}`,
            user_name: item.user_name,
            user_email: item.user_email,
            user_role: item.user_role,
            login_at: item.login_at,
            device_info: item.device_info,
            status: item.status || 'sucesso'
          });
        });
        localLogs.forEach(item => {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime()
        );
        setAccessLogs(merged);
      }
    } catch (e) {
      const localLogs = safeGetLocalStorage<AccessLog[]>('oee_access_logs', []);
      setAccessLogs(localLogs);
    } finally {
      setIsLoadingAccessLogs(false);
    }
  };

  const fetchStopCodes = async () => {
    setIsLoadingStops(true);
    try {
      if (useLocalFallback) {
        const localStops = safeGetLocalStorage<StopCode[]>('oee_local_stop_codes', DEFAULT_STOP_CODES);
        setStopCodes(localStops);
        return;
      }

      const { data, error } = await supabase
        .from('stop_codes')
        .select('*')
        .order('code', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "stop_codes" does not exist')) {
          console.warn('Tabela stop_codes não existe. Usando defaults.');
          return;
        }
        throw error;
      }
      
      if (data && data.length > 0) {
        setStopCodes(data.map(s => ({
          code: s.code,
          description: s.description,
          category: s.category
        })));
      } else {
        // Se a tabela estiver vazia, tentar popular com os defaults
        console.log('Tabela stop_codes vazia. Populando com defaults...');
        await supabase.from('stop_codes').insert(DEFAULT_STOP_CODES);
        setStopCodes(DEFAULT_STOP_CODES);
      }
    } catch (error: any) {
      console.error('Erro ao buscar códigos de parada, usando defaults/local:', error);
      const localStops = safeGetLocalStorage<StopCode[]>('oee_local_stop_codes', DEFAULT_STOP_CODES);
      setStopCodes(localStops);
    } finally {
      setIsLoadingStops(false);
    }
  };

  const saveStopCode = async (stop: StopCode) => {
    try {
      if (useLocalFallback) {
        const localStops = safeGetLocalStorage<StopCode[]>('oee_local_stop_codes', DEFAULT_STOP_CODES);
        const index = localStops.findIndex(s => s.code === stop.code);
        if (index > -1) {
          localStops[index] = stop;
        } else {
          localStops.push(stop);
        }
        localStorage.setItem('oee_local_stop_codes', JSON.stringify(localStops));
        fetchStopCodes();
        setEditingStop(null);
        return;
      }

      const { error } = await supabase
        .from('stop_codes')
        .upsert([stop]);
      
      if (error) throw error;
      fetchStopCodes();
      setEditingStop(null);
    } catch (error: any) {
      console.error('Erro ao salvar código de parada:', error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const deleteStopCode = async (code: number) => {
    if (!confirm('Tem certeza que deseja excluir este código de parada?')) return;
    try {
      if (useLocalFallback) {
        const localStops = safeGetLocalStorage<StopCode[]>('oee_local_stop_codes', DEFAULT_STOP_CODES);
        const filtered = localStops.filter(s => s.code !== code);
        localStorage.setItem('oee_local_stop_codes', JSON.stringify(filtered));
        fetchStopCodes();
        return;
      }

      const { error } = await supabase
        .from('stop_codes')
        .delete()
        .eq('code', code);
      
      if (error) throw error;
      fetchStopCodes();
    } catch (error: any) {
      console.error('Erro ao excluir código de parada:', error);
      alert('Erro ao excluir: ' + error.message);
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      fetchUsers();
      fetchStopCodes();
    }
  }, [showAdminPanel]);

  useEffect(() => {
    fetchStopCodes(); // Carrega paradas logo no início para garantir que o inputs funcione
    
    // Auto-migração local inicial (para garantir que dados locais existentes na Linha 07, etc. passem para a Linha 02, etc.)
    const migrationKey = 'oee_lines_renumbered_2026_layout_v1';
    if (!localStorage.getItem(migrationKey)) {
      const count = migrateLocalRecordsHelper();
      localStorage.setItem(migrationKey, 'true');
      if (count > 0) {
        console.log(`Auto-migração local concluída: ${count} registros remapeados para novas linhas.`);
      }
    }
  }, []);

  const executeLineMigration = async () => {
    setIsMigratingLines(true);
    setMigrationReport(null);
    try {
      // 1. Migra dados locais primeiro
      const localMigratedCount = migrateLocalRecordsHelper();
      localStorage.setItem('oee_lines_renumbered_2026_layout_v1', 'true');

      if (useLocalFallback || !isSupabaseConfigured) {
        setMigrationStatusType('success');
        setMigrationReport(`Migração concluída com sucesso no armazenamento local! ${localMigratedCount} registro(s) foram remapeados para a nova numeração (ex: Linha 07 ➔ Linha 02, Linha 01 ➔ Linha 09).`);
        setIsMigratingLines(false);
        fetchHistory();
        if (activeTab === 'dashboard') fetchDashboardRecord();
        return;
      }

      // 2. Migra dados no Supabase
      const { data: allRecords, error: fetchErr } = await supabase
        .from('oee_records')
        .select('id, machine_name, downtime_data');
      
      if (fetchErr) throw fetchErr;

      if (!allRecords || allRecords.length === 0) {
        setMigrationStatusType('info');
        setMigrationReport(`Nenhum registro encontrado no Supabase para migrar. Localmente: ${localMigratedCount} registro(s) remapeado(s).`);
        setIsMigratingLines(false);
        return;
      }

      let supabaseMigratedCount = 0;
      for (const record of allRecords) {
        let needsUpdate = false;
        let newMachineName = record.machine_name;
        
        if (record.machine_name && LINE_MAPPING_DE_PARA[record.machine_name]) {
          newMachineName = LINE_MAPPING_DE_PARA[record.machine_name];
          needsUpdate = true;
        }

        let newDowntimeData = record.downtime_data;
        if (record.downtime_data) {
          try {
            const parsed = typeof record.downtime_data === 'string' ? JSON.parse(record.downtime_data) : record.downtime_data;
            if (parsed && parsed.line && LINE_MAPPING_DE_PARA[parsed.line]) {
              parsed.line = LINE_MAPPING_DE_PARA[parsed.line];
              newDowntimeData = JSON.stringify(parsed);
              needsUpdate = true;
            }
          } catch (_) {}
        }

        if (needsUpdate) {
          const { error: updateErr } = await supabase
            .from('oee_records')
            .update({
              machine_name: newMachineName,
              downtime_data: newDowntimeData
            })
            .eq('id', record.id);

          if (!updateErr) {
            supabaseMigratedCount++;
          }
        }
      }

      setMigrationStatusType('success');
      let reportMsg = `Migração concluída com sucesso! ${supabaseMigratedCount} registro(s) histórico(s) no Supabase foram remapeados para a nova numeração das linhas.`;
      if (localMigratedCount > 0) {
        reportMsg += ` (${localMigratedCount} registro(s) locais também atualizados).`;
      }
      setMigrationReport(reportMsg);

      // Recarrega histórico e dashboard imediatamente
      fetchHistory();
      if (activeTab === 'dashboard') {
        fetchDashboardRecord();
      }
    } catch (err: any) {
      console.error('Erro na migração de linhas:', err);
      setMigrationStatusType('error');
      setMigrationReport(`Erro durante a migração: ${err.message || 'Falha desconhecida'}`);
    } finally {
      setIsMigratingLines(false);
    }
  };

  // Carregar histórico do Supabase
  const fetchHistory = async () => {
    if (!currentUser) return;
    setHistoryError(null);
    try {
      const year = parseInt(monthFilter.split('-')[0]);
      const month = parseInt(monthFilter.split('-')[1]);

      if (useLocalFallback) {
        let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        if (localRecords.length === 0) {
          localRecords = generateSampleLocalRecords();
          localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
        }
        
        let filtered = [...localRecords];
        
        if (lineFilter !== 'Todas') {
          filtered = filtered.filter(r => r.machine_name === lineFilter);
        }
        
        filtered = filtered.filter(r => {
          const rDate = new Date(r.created_at);
          const rYear = rDate.getFullYear();
          const rMonth = rDate.getMonth() + 1;
          const rDay = rDate.getDate();
          
          const matchesMonth = rYear === year && rMonth === month;
          if (!matchesMonth) return false;

          const isAll = selectedDates.length === 0 || selectedDates.includes('Todas');
          if (!isAll) {
            return selectedDates.includes(rDay.toString());
          }

          return true;
        });
        
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistory(filtered.slice(0, 100));
        return;
      }

      let query = supabase
        .from('oee_records')
        .select('id, created_at, machine_name, sku, availability, performance, quality, oee_score, shift, notes, downtime_data')
        .order('created_at', { ascending: false });
      
      if (lineFilter !== 'Todas') {
        query = query.eq('machine_name', lineFilter);
      }

      const startDate = new Date(year, month - 1, 1, 0, 0, 0).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      
      query = query.gte('created_at', startDate).lte('created_at', endDate);

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      if (data) {
        const isAll = selectedDates.length === 0 || selectedDates.includes('Todas');
        if (!isAll) {
          const filteredData = data.filter(r => {
            const d = new Date(r.created_at);
            return selectedDates.includes(d.getDate().toString());
          });
          setHistory(filteredData);
        } else {
          setHistory(data);
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar histórico, usando local:', error);
      // Local fallback
      let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
      if (localRecords.length === 0) {
        localRecords = generateSampleLocalRecords();
        localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
      }
      
      const year = parseInt(monthFilter.split('-')[0]);
      const month = parseInt(monthFilter.split('-')[1]);

      let filtered = [...localRecords];
      if (lineFilter !== 'Todas') {
        filtered = filtered.filter(r => r.machine_name === lineFilter);
      }
      filtered = filtered.filter(r => {
        const rDate = new Date(r.created_at);
        const rYear = rDate.getFullYear();
        const rMonth = rDate.getMonth() + 1;
        const rDay = rDate.getDate();
        const matchesMonth = rYear === year && rMonth === month;
        if (!matchesMonth) return false;

        const isAll = selectedDates.length === 0 || selectedDates.includes('Todas');
        if (!isAll) {
          return selectedDates.includes(rDay.toString());
        }

        return true;
      });
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(filtered.slice(0, 100));
    }
  };

  // Exportação profissional para Planilha Excel (.xlsx / XML Spreadsheet)
  // Contendo TODOS os parâmetros de entrada, paradas calculadas, perdas e índices OEE
  const exportToExcelHandler = async (scope: 'filtered' | 'all' = 'all') => {
    if (!isUserAdmin(currentUser)) {
      alert('Acesso restrito: Apenas administradores podem realizar o download da base de dados.');
      return;
    }

    setIsExportingExcel(true);
    setExportFeedback(null);

    try {
      let recordsToExport: any[] = [];

      if (scope === 'filtered' && history.length > 0) {
        recordsToExport = history;
      } else {
        // Buscar todos os registros do banco ou fallback local
        if (useLocalFallback) {
          let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
          if (localRecords.length === 0) {
            localRecords = generateSampleLocalRecords();
            localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
          }
          recordsToExport = [...localRecords];
        } else {
          const { data, error } = await supabase
            .from('oee_records')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('Erro ao consultar Supabase para exportação, usando local:', error);
            let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
            recordsToExport = localRecords.length > 0 ? localRecords : history;
          } else if (data && data.length > 0) {
            recordsToExport = data;
          } else {
            recordsToExport = history;
          }
        }
      }

      if (recordsToExport.length === 0) {
        setExportFeedback({
          type: 'error',
          message: 'Nenhum registro encontrado no banco de dados para exportação.'
        });
        setIsExportingExcel(false);
        return;
      }

      // Ordenar por data cronológica crescente para análise temporal
      recordsToExport.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Helper para escapar strings no formato XML do Excel
      const escapeXml = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      // Cabeçalhos detalhados para Análise Crítica por IA
      const headers = [
        'ID_REGISTRO',
        'DATA_REGISTRO',
        'HORA_REGISTRO',
        'LINHA_PRODUCAO',
        'SKU_PRODUTO',
        'HORA_INICIO_TURNO',
        'HORA_TERMINO_TURNO',
        'CONTADOR_INICIAL_GARRAFAS',
        'CONTADOR_FINAL_GARRAFAS',
        'GARRAFAS_LIDAS_TOTAL',
        'PRODUCAO_REAL_FARDOS_H',
        'FATOR_CONVERSAO_GARRAFAS_FARDO_C',
        'PRODUCAO_REAL_GARRAFAS_HC',
        'PERDA_QUALIDADE_GARRAFAS_U',
        'TEMPO_TOTAL_TURNO_HORAS_A',
        'TURNOS_PRODUCAO_K',
        'VELOCIDADE_NOMINAL_GPH_D',
        'PERCENTUAL_PROJETO_B',
        'VELOCIDADE_PROJETO_GPH_F',
        'PRODUCAO_TEORICA_FARDOS_G',
        'TEMPO_PRODUCAO_HORAS_I',
        'TEMPO_TOTAL_TURNO_L',
        'TEMPO_TURNO_NAO_PROGRAMADO_M',
        'PARADAS_PROGRAMADAS_HORAS_N',
        'TOTAL_PARADAS_PROGRAMADAS_O',
        'TEMPO_PROGRAMADO_HORAS_P',
        'PARADAS_NAO_PROGRAMADAS_HORAS_Q',
        'TEMPO_OPERACAO_HORAS_R',
        'PERDA_VELOCIDADE_HORAS_S',
        'TEMPO_LIQUIDO_HORAS_T',
        'TEMPO_QUALIDADE_HORAS_V',
        'TEMPO_UTIL_HORAS_X',
        'DISPONIBILIDADE_PERCENT',
        'PERFORMANCE_PERCENT',
        'QUALIDADE_PERCENT',
        'OEE_SCORE_PERCENT',
        'FAIXA_OEE',
        'CLASSIFICACAO_OEE',
        'INDICE_MANUTENCAO_PERCENT',
        'TEEP_PERCENT',
        'PRODUTIVIDADE_FARDOS_HORA',
        'TOTAL_PARADAS_REGISTRADAS',
        'DETALHAMENTO_PARADAS_RESUMO',
        'OBSERVACOES_NOTAS'
      ];

      // Mapeamento e cálculo de cada linha
      const rowsXml = recordsToExport.map((rec) => {
        let inputsData: Partial<OEEInputs> = {};
        try {
          if (rec.downtime_data) {
            inputsData = typeof rec.downtime_data === 'string' 
              ? JSON.parse(rec.downtime_data) 
              : rec.downtime_data;
          }
        } catch (e) {
          inputsData = {};
        }

        const dateObj = new Date(rec.created_at);
        const dataFormatada = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('pt-BR')
          : (inputsData.date || '-');
        const horaFormatada = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '-';

        const initialCounter = Number(inputsData.initialCounter) || 0;
        const finalCounter = Number(inputsData.finalCounter) || 0;
        const garrafasLidas = Math.max(0, finalCounter - initialCounter);
        const H = Number(inputsData.H) || 0;
        const C = Number(inputsData.C) || 12;
        const totalProducaoGarrafas = H * C;
        const U = Number(inputsData.U) || (initialCounter === 0 || finalCounter === 0 ? 0 : Math.max(0, garrafasLidas - totalProducaoGarrafas));

        const A = Number(inputsData.A) || 24;
        const B = Number(inputsData.B) || 80;
        const D = Number(inputsData.D) || 22000;
        const K = Number(inputsData.K) || 2;
        const stops: StopEntry[] = Array.isArray(inputsData.stops) ? inputsData.stops : [];

        // Recalcular métricas para garantir completude máxima da planilha
        const calc = calculateOEEResults({
          date: inputsData.date || dataFormatada,
          sku: rec.sku || inputsData.sku || '',
          line: rec.machine_name || inputsData.line || '',
          A, B, C, D, H, K,
          stops,
          U,
          shiftStartTime: inputsData.shiftStartTime || '',
          shiftEndTime: inputsData.shiftEndTime || '',
          initialCounter,
          finalCounter
        }, stopCodes);

        const oeeScore = rec.oee_score !== undefined ? Number(rec.oee_score) : calc.oee;
        const colorInfo = getOEEColorInfo(oeeScore);

        // Resumo legível das paradas para a IA identificar causas-raiz
        const stopsSummary = stops.map(s => {
          const matched = stopCodes.find(c => c.code === Number(s.code));
          const desc = matched ? matched.description : `Código ${s.code}`;
          const cat = matched ? matched.category : 'NP';
          const dur = s.startTime && s.endTime ? calculateDurationMinutes(s.startTime, s.endTime) : (Number(s.duration) || 0);
          const extra = s.reasonCategory ? ` [${s.reasonCategory}: ${s.customReason || ''}]` : '';
          return `${s.code}-${desc}(${cat}, ${dur}min${s.startTime ? ` de ${s.startTime} às ${s.endTime}` : ''})${extra}`;
        }).join(' | ');

        const cells = [
          { type: 'String', val: rec.id || '' },
          { type: 'String', val: dataFormatada },
          { type: 'String', val: horaFormatada },
          { type: 'String', val: rec.machine_name || inputsData.line || '' },
          { type: 'String', val: rec.sku || inputsData.sku || '' },
          { type: 'String', val: inputsData.shiftStartTime || '-' },
          { type: 'String', val: inputsData.shiftEndTime || '-' },
          { type: 'Number', val: initialCounter },
          { type: 'Number', val: finalCounter },
          { type: 'Number', val: garrafasLidas },
          { type: 'Number', val: H },
          { type: 'Number', val: C },
          { type: 'Number', val: totalProducaoGarrafas },
          { type: 'Number', val: U },
          { type: 'Number', val: A },
          { type: 'Number', val: K },
          { type: 'Number', val: D },
          { type: 'Number', val: B },
          { type: 'Number', val: Number(calc.F.toFixed(2)) },
          { type: 'Number', val: Number(calc.G.toFixed(2)) },
          { type: 'Number', val: Number(calc.I.toFixed(2)) },
          { type: 'Number', val: Number(calc.L.toFixed(2)) },
          { type: 'Number', val: Number(calc.M.toFixed(2)) },
          { type: 'Number', val: Number(calc.N.toFixed(2)) },
          { type: 'Number', val: Number(calc.O.toFixed(2)) },
          { type: 'Number', val: Number(calc.P.toFixed(2)) },
          { type: 'Number', val: Number(calc.Q.toFixed(2)) },
          { type: 'Number', val: Number(calc.R.toFixed(2)) },
          { type: 'Number', val: Number(calc.S.toFixed(2)) },
          { type: 'Number', val: Number(calc.T.toFixed(2)) },
          { type: 'Number', val: Number(calc.V.toFixed(2)) },
          { type: 'Number', val: Number(calc.X.toFixed(2)) },
          { type: 'Number', val: Number((rec.availability !== undefined ? rec.availability : calc.disponibilidade).toFixed(2)) },
          { type: 'Number', val: Number((rec.performance !== undefined ? rec.performance : calc.performance).toFixed(2)) },
          { type: 'Number', val: Number((rec.quality !== undefined ? rec.quality : calc.qualidade).toFixed(2)) },
          { type: 'Number', val: Number(oeeScore.toFixed(2)) },
          { type: 'String', val: colorInfo.rangeText },
          { type: 'String', val: colorInfo.label },
          { type: 'Number', val: Number(calc.maintenanceIndex.toFixed(2)) },
          { type: 'Number', val: Number(calc.teep.toFixed(2)) },
          { type: 'Number', val: Number(calc.productivity.toFixed(2)) },
          { type: 'Number', val: stops.length },
          { type: 'String', val: stopsSummary || 'Nenhuma parada registrada' },
          { type: 'String', val: rec.notes || '' }
        ];

        return `<Row>\n${cells.map(c => `  <Cell><Data ss:Type="${c.type}">${escapeXml(c.val)}</Data></Cell>`).join('\n')}\n</Row>`;
      }).join('\n');

      const headerCellsXml = headers.map(h => `  <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('\n');

      // Geração de arquivo compatível com Excel (.xls XML Spreadsheet 2003 reconhecido universalmente pelo Excel, LibreOffice e Google Planilhas)
      const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Relatorio_OEE_Guideway_Banco_de_Dados</Title>
  <Subject>Exportacao Completa para Analise Critica por IA</Subject>
  <Author>${escapeXml(currentUser.name)}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Banco_OEE_Completo">
  <Table>
   <Row ss:Height="24">
${headerCellsXml}
   </Row>
${rowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane>
     <Number>3</Number>
    </Pane>
    <Pane>
     <Number>2</Number>
     <ActiveRow>0</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

      const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `OEE_GUIDEWAY_BANCO_DADOS_${timestamp}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportFeedback({
        type: 'success',
        message: `Planilha Excel gerada com sucesso! ${recordsToExport.length} registro(s) exportado(s) com todas as variáveis prontas para análise crítica com IA.`
      });
    } catch (err: any) {
      console.error('Falha ao exportar planilha:', err);
      setExportFeedback({
        type: 'error',
        message: `Erro ao gerar a planilha Excel: ${err?.message || 'Falha desconhecida'}`
      });
    } finally {
      setIsExportingExcel(false);
    }
  };


  const deleteRecord = async (id: string) => {
    if (!isUserAdmin(currentUser)) {
      alert('Apenas administradores podem excluir registros.');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    
    try {
      if (useLocalFallback) {
        const localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        const filtered = localRecords.filter(item => item.id !== id);
        localStorage.setItem('oee_local_records', JSON.stringify(filtered));
        setHistory(prev => prev.filter(item => item.id !== id));
        alert('Registro excluído com sucesso!');
        return;
      }

      const { error } = await supabase
        .from('oee_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado local removendo o item
      setHistory(prev => prev.filter(item => item.id !== id));
      alert('Registro excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir registro:', error);
      alert('Erro ao excluir: ' + error.message);
    }
  };

  // Salvar registro no Supabase
  const saveRecord = async () => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const editorName = currentUser?.name || 'Sistema';

      // Incluímos o nome do operador e a data real de salvamento no JSON de inputs
      // Além de quem editou por último
      const enrichedInputs = {
        ...inputs,
        operator_name: isEditing ? (inputs as any).operator_name : editorName,
        saved_at: isEditing ? (inputs as any).saved_at : now,
        last_edited_by: editorName,
        last_edited_at: now
      };

      const record = {
        id: isEditing && editingRecordId ? editingRecordId : 'local-' + Date.now(),
        created_at: isEditing ? (inputs as any).date_created_original || new Date(inputs.date + 'T12:00:00').toISOString() : new Date(inputs.date + 'T12:00:00').toISOString(),
        machine_name: inputs.line,
        sku: inputs.sku,
        availability: results.disponibilidade,
        performance: results.performance,
        quality: results.qualidade,
        oee_score: results.oee,
        shift: `Turnos: ${inputs.K}`,
        notes: `Produção Real: ${inputs.H}`,
        downtime_data: JSON.stringify(enrichedInputs)
      };

      if (useLocalFallback) {
        const localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        if (isEditing && editingRecordId) {
          const index = localRecords.findIndex(r => r.id === editingRecordId);
          if (index > -1) {
            localRecords[index] = { ...record, id: editingRecordId };
          }
          localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
          alert('Registro atualizado com sucesso!');
        } else {
          localRecords.push(record);
          localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
          alert('Registro salvo com sucesso!');
        }
        
        setIsEditing(false);
        setEditingRecordId(null);
        fetchHistory();
        return;
      }

      if (isEditing && editingRecordId) {
        const { error } = await supabase
          .from('oee_records')
          .update({
            created_at: record.created_at,
            machine_name: record.machine_name,
            sku: record.sku,
            availability: record.availability,
            performance: record.performance,
            quality: record.quality,
            oee_score: record.oee_score,
            shift: record.shift,
            notes: record.notes,
            downtime_data: record.downtime_data
          })
          .eq('id', editingRecordId);
        
        if (error) throw error;
        alert('Registro atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('oee_records')
          .insert([{
            created_at: record.created_at,
            machine_name: record.machine_name,
            sku: record.sku,
            availability: record.availability,
            performance: record.performance,
            quality: record.quality,
            oee_score: record.oee_score,
            shift: record.shift,
            notes: record.notes,
            downtime_data: record.downtime_data
          }]);
        
        if (error) throw error;
        alert('Registro salvo com sucesso!');
      }
      
      // Resetar estados de edição
      setIsEditing(false);
      setEditingRecordId(null);
      fetchHistory(); // Atualiza a lista após salvar
    } catch (error: any) {
      console.error('Erro ao salvar registro:', error);
      alert('Erro ao salvar registro: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRecord = (record: any) => {
    try {
      const sourceData = record.downtime_data;
      if (!sourceData) return;

      const parsed = typeof sourceData === 'string' 
        ? JSON.parse(sourceData) 
        : sourceData;
      
      if (parsed && typeof parsed === 'object') {
        // Preserva a data original do registro para não sobrescrever o created_at indesejadamente
        setInputs({
          ...parsed,
          date_created_original: record.created_at
        });
        setEditingRecordId(record.id);
        setIsEditing(true);
        setActiveTab('inputs');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error("Erro ao carregar registro para edição:", e);
      alert("Não foi possível carregar os dados detalhados deste registro para edição.");
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingRecordId(null);
  };

  useEffect(() => {
    fetchHistory();
  }, [lineFilter, monthFilter, selectedDates]);

  // Sincronizar Perda por Qualidade (U) com base na nova rotina de cálculo
  useEffect(() => {
    const totalGarrafasContador = inputs.finalCounter - inputs.initialCounter;
    const totalGarrafasProducao = inputs.H * inputs.C;
    
    // Regra: Se os contadores não forem informados (valor 0), a perda é 0
    const calculatedU = (inputs.initialCounter === 0 || inputs.finalCounter === 0)
      ? 0
      : Math.max(0, totalGarrafasContador - totalGarrafasProducao);
    
    if (inputs.U !== calculatedU) {
      setInputs(prev => ({ ...prev, U: calculatedU }));
    }
  }, [inputs.initialCounter, inputs.finalCounter, inputs.H, inputs.C, inputs.U]);

  // Calculation logic based on the provided formulas
  const calculateOEEResults = (data: OEEInputs, currentStopCodes: StopCode[]): OEEResults => {
    const { A, B, C, D, H, K, initialCounter, finalCounter, stops = [] } = data;

    // Nova rotina de cálculo para U (Perda por Qualidade)
    // 1) Valor líquido das garrafas = Contador Final - Contador Inicial
    const totalGarrafasContador = finalCounter - initialCounter;
    // 2) Total de garrafas da produção = Produção Real (H) * Garrafas por Fardo (C)
    const totalGarrafasProducao = H * C;
    // 3) Perda por Qualidade (U) = Total Contador - Total Produção
    // Regra: Se os contadores não forem informados (valor 0), a perda é 0
    const U = (initialCounter === 0 || finalCounter === 0)
      ? 0
      : Math.max(0, totalGarrafasContador - totalGarrafasProducao);

    // Calcular N e Q a partir das paradas
    const processedStops = stops.map(s => ({
      ...s,
      calculatedDuration: s.startTime && s.endTime ? calculateDurationMinutes(s.startTime, s.endTime) : (Number(s.duration) || 0)
    }));

    const N = processedStops.filter(s => {
      const config = currentStopCodes.find(c => c.code === Number(s.code));
      return config?.category === 'P';
    }).reduce((acc, curr) => acc + (curr.calculatedDuration || 0), 0) / 60;

    const Q = processedStops.filter(s => {
      const config = currentStopCodes.find(c => c.code === Number(s.code));
      return config?.category === 'NP';
    }).reduce((acc, curr) => acc + (curr.calculatedDuration || 0), 0) / 60;

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

    const maintenanceDowntime = processedStops.filter(s => 
      [1, 2, 3, 31, 32, 33, 34, 35].includes(Number(s.code))
    ).reduce((acc, curr) => acc + (curr.calculatedDuration || 0), 0) / 60;

    const maintenanceIndex = P > 0 ? (maintenanceDowntime / P) * 100 : 0;
    const teep = A > 0 ? (X / A) * 100 : 0;
    const productivity = P > 0 ? (H / P) : 0;

    return {
      F, G, I, L, M, O, P, R, S, T, V, X, N, Q,
      disponibilidade: Math.max(0, disponibilidade * 100),
      performance: Math.max(0, performance * 100),
      qualidade: Math.max(0, qualidade * 100),
      oee: Math.max(0, oee * 100),
      maintenanceIndex: Math.max(0, maintenanceIndex),
      teep: Math.max(0, teep),
      productivity: Math.max(0, productivity)
    };
  };

  const results = useMemo((): OEEResults => {
    return calculateOEEResults(inputs, stopCodes);
  }, [inputs, stopCodes]);

  const dashboardData = useMemo(() => {
    if (!dashboardRecord) return null;
    
    try {
      // Tenta pegar de raw_data ou de downtime_data (onde estamos salvando agora)
      const sourceData = dashboardRecord.raw_data || dashboardRecord.downtime_data;
      if (!sourceData) return null;

      const parsed = typeof sourceData === 'string' 
        ? JSON.parse(sourceData) 
        : sourceData;
      
      // Verifica se é o formato completo (objeto inputs)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'A' in parsed) {
        const inputs = parsed as OEEInputs;
        const results = calculateOEEResults(inputs, stopCodes);
        return { inputs, results };
      }
    } catch (e) {
      console.error("Erro ao processar dados do dashboard:", e);
    }
    return null;
  }, [dashboardRecord]);

  const dashboardChartData = useMemo(() => {
    if (!dashboardData) return [];
    
    const { inputs, results } = dashboardData;
    return [
      { name: 'TEMPO TOTAL', value: Number(inputs.A) || 0, color: '#7e22ce' },
      { name: 'TEMPO PROGRAMADO', value: Number(results.P) || 0, color: '#0ea5e9' },
      { name: 'TEMPO DE OPERAÇÃO', value: Number(results.R) || 0, color: '#15803d' },
      { name: 'TEMPO LÍQUIDO', value: Number(results.T) || 0, color: '#ea580c' },
      { name: 'TEMPO ÚTIL', value: Number(results.X) || 0, color: '#0369a1' },
    ];
  }, [dashboardData]);

  // Buscar todos os registros do sistema para Manutenção Industrial e One Page Report
  const fetchAllSystemRecords = async () => {
    if (!currentUser) return;
    setIsLoadingAllRecords(true);
    try {
      if (useLocalFallback) {
        let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        if (localRecords.length === 0) {
          localRecords = generateSampleLocalRecords();
          localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
        }
        setAllSystemRecords(localRecords);
        return;
      }

      const { data, error } = await supabase
        .from('oee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar todos os registros do Supabase, usando local:', error);
        let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        if (localRecords.length === 0) {
          localRecords = generateSampleLocalRecords();
          localStorage.setItem('oee_local_records', JSON.stringify(localRecords));
        }
        setAllSystemRecords(localRecords);
      } else if (data) {
        setAllSystemRecords(data);
      }
    } catch (err) {
      console.error('Erro na carga geral de registros:', err);
      let localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
      setAllSystemRecords(localRecords);
    } finally {
      setIsLoadingAllRecords(false);
    }
  };

  // Buscar registro específico para o Dashboard (diário ou consolidado do mês)
  const fetchDashboardRecord = async () => {
    if (!currentUser) return;
    setIsFetchingDashboard(true);
    try {
      if (useLocalFallback) {
        const localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
        const matched = localRecords.find(r => {
          const rDate = new Date(r.created_at);
          const formattedDate = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
          return formattedDate === dashboardDate && r.machine_name === dashboardLine;
        });
        setDashboardRecord(matched || null);
        return;
      }

      // Definir início e fim do dia no fuso horário local e converter para ISO para o Supabase
      const startDate = new Date(`${dashboardDate}T00:00:00`).toISOString();
      const endDate = new Date(`${dashboardDate}T23:59:59`).toISOString();

      const { data, error } = await supabase
        .from('oee_records')
        .select('id, created_at, machine_name, sku, availability, performance, quality, oee_score, shift, notes, downtime_data')
        .eq('machine_name', dashboardLine)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setDashboardRecord(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Erro ao buscar registro do dashboard, usando local:', err);
      // Fallback local
      const localRecords = safeGetLocalStorage<any[]>('oee_local_records', []);
      const matched = localRecords.find(r => {
        const rDate = new Date(r.created_at);
        const formattedDate = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
        return formattedDate === dashboardDate && r.machine_name === dashboardLine;
      });
      setDashboardRecord(matched || null);
    } finally {
      setIsFetchingDashboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardRecord();
      fetchAllSystemRecords();
    } else if (activeTab === 'maintenance') {
      fetchAllSystemRecords();
    }
  }, [dashboardDate, dashboardLine, activeTab, dashboardViewMode, dashboardMonth]);

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
      - Horário do Turno: ${inputs.shiftStartTime} às ${inputs.shiftEndTime}
      
      MÉTRICAS PRINCIPAIS:
      - OEE Global: ${results.oee.toFixed(1)}%
      - Disponibilidade: ${results.disponibilidade.toFixed(1)}%
      - Performance: ${results.performance.toFixed(1)}%
      - Qualidade: ${results.qualidade.toFixed(1)}%
      
      DADOS DE PRODUÇÃO:
      - Produção Real: ${inputs.H} fardos
      - Produção Teórica: ${results.G.toFixed(1)} fardos
      - Paradas Não Programadas: ${results.Q.toFixed(1)}h
      - Perda por Qualidade: ${inputs.U} garrafas (Calculada via Contador: ${inputs.initialCounter} -> ${inputs.finalCounter})
      - Redução de Velocidade (Perda de Performance): ${results.S.toFixed(1)}h
      
      GUIA DE CALIBRAÇÃO DE TOM (REFERÊNCIA SEGUNDO DIRETRIZES OEE):
      - EXCELENTE / CLASSE MUNDIAL (> 75% - AZUL):
        * Tom: Elogioso, focado em estabilidade, boas práticas e sustentação de resultados. Use termos como "Alta Performance", "Operação de Excelência".
      - BOM (65% a 75% - VERDE GREEN #3CB043):
        * Tom: Positivo, reconhecendo boa eficiência e sugerindo ajustes finos de produtividade. Use "Bom desempenho", "Operação consistente".
      - MODERADO / ACEITÁVEL (55% a 65% - VERDE MINT #99EDC3):
        * Tom: Neutro e construtivo, focando em oportunidades de ganhos e redução de pequenas paradas. Use "Desempenho moderado", "Potencial de otimização".
      - ATENÇÃO (50% a 55% - AMARELO):
        * Tom: Alerta preventivo, focando em perdas que demandam monitoramento próximo. Use "Ponto de atenção", "Necessidade de controle de perdas".
      - CRÍTICO (< 50% - VERMELHO):
        * Tom: Alerta urgente, focado em gargalos severos e impacto direto na disponibilidade/performance. Use "Gargalo crítico", "Impacto severo".

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
    if (history.length === 0) {
      return { 
        oee: 0, 
        disponibilidade: 0, 
        performance: 0, 
        qualidade: 0, 
        maintenanceIndex: 0,
        teep: 0,
        productivity: 0,
        paretoNP: [], 
        paretoP: [] 
      };
    }
    
    const sum = history.reduce((acc, curr) => ({
      oee: acc.oee + curr.oee_score,
      disponibilidade: acc.disponibilidade + curr.availability,
      performance: acc.performance + curr.performance,
      qualidade: acc.qualidade + curr.quality,
      teep: acc.teep + (curr.teep || 0)
    }), { oee: 0, disponibilidade: 0, performance: 0, qualidade: 0, teep: 0 });

    // Consolidar dados para o Pareto e Índice de Quebra
    const stopsMap: { [key: number]: number } = {};
    let totalMaintenanceMinutes = 0;
    let totalProgrammedHours = 0;
    let totalRealProduction = 0;
    let computedTeepSum = 0;
    let recordCountWithTeep = 0;

    history.forEach(record => {
      if (record.downtime_data) {
        try {
          const parsed = typeof record.downtime_data === 'string' 
            ? JSON.parse(record.downtime_data) 
            : record.downtime_data;
          
          // Se for o formato novo (objeto inputs), pegamos a propriedade stops
          // Se for o formato antigo (array), usamos diretamente
          const stops: StopEntry[] = Array.isArray(parsed) ? parsed : (parsed.stops || []);
          
          // Tenta calcular o tempo programado e quebras se for o formato novo
          if (!Array.isArray(parsed) && parsed.A !== undefined) {
            const res = calculateOEEResults(parsed as OEEInputs, stopCodes);
            totalProgrammedHours += res.P;
            totalRealProduction += Number(parsed.H) || 0;
            computedTeepSum += res.teep;
            recordCountWithTeep++;
            
            const maintenanceMins = stops
              .filter(s => [1, 2, 3, 31, 32, 33, 34, 35].includes(Number(s.code)))
              .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
            
            totalMaintenanceMinutes += maintenanceMins;
          }

          stops.forEach(stop => {
            stopsMap[stop.code] = (stopsMap[stop.code] || 0) + stop.duration;
          });
        } catch (e) {
          console.error("Erro ao processar downtime_data", e);
        }
      }
    });

    const maintenanceIndex = totalProgrammedHours > 0 ? (totalMaintenanceMinutes / 60 / totalProgrammedHours) * 100 : 0;
    const avgTeep = recordCountWithTeep > 0 ? computedTeepSum / recordCountWithTeep : 0;
    const avgProductivity = totalProgrammedHours > 0 ? (totalRealProduction / totalProgrammedHours) : 0;

    const allPareto = Object.entries(stopsMap)
      .map(([code, duration]) => {
        const config = stopCodes.find(c => c.code === parseInt(code));
        return {
          code: parseInt(code),
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
      maintenanceIndex,
      teep: avgTeep,
      productivity: avgProductivity,
      paretoNP,
      paretoP
    };
  }, [history, stopCodes]);

  // Registros consolidados para o Dashboard no modo MÊS
  const dashboardMonthlyData = useMemo(() => {
    if (dashboardViewMode !== 'mes') return null;

    const [filterYear, filterMonth] = dashboardMonth.split('-').map(Number);
    const filtered = allSystemRecords.filter(r => {
      const d = new Date(r.created_at);
      const matchMonth = d.getFullYear() === filterYear && (d.getMonth() + 1) === filterMonth;
      const matchLine = dashboardLine === 'Todas' || r.machine_name === dashboardLine;
      return matchMonth && matchLine;
    });

    if (filtered.length === 0) return null;

    let sumOee = 0;
    let sumDisp = 0;
    let sumPerf = 0;
    let sumQual = 0;
    let totalRealH = 0;
    let totalGarrafasU = 0;
    let totalMaintenanceMins = 0;
    let totalProgrammedH = 0;
    let totalTempoTotalA = 0;
    let totalTempoOperacaoR = 0;
    let totalTempoLiquidoT = 0;
    let totalTempoUtilX = 0;
    let totalPerdaS = 0;
    let totalPerdaV = 0;
    let totalPerdaQ = 0;
    let totalTeepSum = 0;
    let validTeepCount = 0;

    // Agrupamento diário do OEE no mês para o gráfico de evolução mensal
    const dailyMap: { [day: number]: { count: number; oeeSum: number; line: string } } = {};

    filtered.forEach(rec => {
      sumOee += Number(rec.oee_score) || 0;
      sumDisp += Number(rec.availability) || 0;
      sumPerf += Number(rec.performance) || 0;
      sumQual += Number(rec.quality) || 0;

      const dateObj = new Date(rec.created_at);
      const day = dateObj.getDate();
      if (!dailyMap[day]) {
        dailyMap[day] = { count: 0, oeeSum: 0, line: rec.machine_name };
      }
      dailyMap[day].count++;
      dailyMap[day].oeeSum += Number(rec.oee_score) || 0;

      let hasInputs = false;
      try {
        const raw = rec.raw_data || rec.downtime_data;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && !Array.isArray(parsed) && parsed.A !== undefined) {
            const res = calculateOEEResults(parsed as OEEInputs, stopCodes);
            totalTempoTotalA += Number(parsed.A) || 0;
            totalProgrammedH += res.P;
            totalTempoOperacaoR += res.R;
            totalTempoLiquidoT += res.T;
            totalTempoUtilX += res.X;
            totalRealH += Number(parsed.H) || 0;
            totalGarrafasU += Number(parsed.U) || 0;
            totalPerdaS += res.S;
            totalPerdaV += res.V;
            totalPerdaQ += res.Q;
            totalTeepSum += res.teep;
            validTeepCount++;
            hasInputs = true;

            const stops: StopEntry[] = Array.isArray(parsed.stops) ? parsed.stops : [];
            const mMins = stops
              .filter(s => [1, 2, 3, 31, 32, 33, 34, 35].includes(Number(s.code)))
              .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
            totalMaintenanceMins += mMins;
          }
        }
      } catch (e) {
        // ignora erro de parse
      }

      if (!hasInputs) {
        const a = 24;
        const p = a * 0.9;
        const r = p * ((Number(rec.availability) || 75) / 100);
        const t = r * ((Number(rec.performance) || 75) / 100);
        const x = t * ((Number(rec.quality) || 98) / 100);
        totalTempoTotalA += a;
        totalProgrammedH += p;
        totalTempoOperacaoR += r;
        totalTempoLiquidoT += t;
        totalTempoUtilX += x;
        totalRealH += 2500;
      }
    });

    const count = filtered.length;
    const avgOee = sumOee / count;
    const avgDisp = sumDisp / count;
    const avgPerf = sumPerf / count;
    const avgQual = sumQual / count;
    const maintenanceIndex = totalProgrammedH > 0 ? (totalMaintenanceMins / 60 / totalProgrammedH) * 100 : 0;
    const avgTeep = validTeepCount > 0 ? totalTeepSum / validTeepCount : 0;
    const productivity = totalProgrammedH > 0 ? (totalRealH / totalProgrammedH) : 0;

    const monthlyTrendChart = Object.entries(dailyMap).map(([dayStr, val]) => ({
      dia: `Dia ${dayStr.padStart(2, '0')}`,
      oee: Number((val.oeeSum / val.count).toFixed(1)),
      diaNum: Number(dayStr)
    })).sort((a, b) => a.diaNum - b.diaNum);

    const monthlyDecompChart = [
      { name: 'TEMPO TOTAL', value: Number(totalTempoTotalA.toFixed(1)), color: '#7e22ce' },
      { name: 'TEMPO PROGRAMADO', value: Number(totalProgrammedH.toFixed(1)), color: '#0ea5e9' },
      { name: 'TEMPO DE OPERAÇÃO', value: Number(totalTempoOperacaoR.toFixed(1)), color: '#15803d' },
      { name: 'TEMPO LÍQUIDO', value: Number(totalTempoLiquidoT.toFixed(1)), color: '#ea580c' },
      { name: 'TEMPO ÚTIL', value: Number(totalTempoUtilX.toFixed(1)), color: '#0369a1' },
    ];

    return {
      count,
      avgOee,
      avgDisp,
      avgPerf,
      avgQual,
      maintenanceIndex,
      avgTeep,
      productivity,
      totalRealH,
      totalGarrafasU,
      totalPerdaS,
      totalPerdaV,
      totalPerdaQ,
      monthlyTrendChart,
      monthlyDecompChart
    };
  }, [dashboardViewMode, dashboardMonth, dashboardLine, allSystemRecords, stopCodes]);

  // Dados consolidados para a aba Manutenção Industrial (Mensal e Diário)
  const maintenanceData = useMemo(() => {
    const [selectedYear, selectedMonth] = maintenanceMonth.split('-').map(Number);

    // 1) Gráfico 1: Índice de Quebra Consolidado por Mês (últimos 6 meses para visão evolutiva)
    const monthlyBreakdown: { [monthKey: string]: { monthName: string; progH: number; maintMins: number; monthKey: string } } = {};
    
    // 2) Gráfico 2: Variação Diária do Índice de Quebra no Mês Selecionado
    const dailyBreakdown: { [day: number]: { day: number; progH: number; maintMins: number; count: number } } = {};

    // 3) Indicadores agregados do mês selecionado
    let selectedMonthProgH = 0;
    let selectedMonthMaintMins = 0;
    let selectedMonthRecordsCount = 0;

    // Rastreamento dos motivos de quebra mecânica/elétrica
    const breakdownReasonMap: { [code: number]: { duration: number; count: number; name: string } } = {};

    allSystemRecords.forEach(rec => {
      const d = new Date(rec.created_at);
      if (isNaN(d.getTime())) return;

      const recYear = d.getFullYear();
      const recMonth = d.getMonth() + 1;
      const recDay = d.getDate();
      const monthKey = `${recYear}-${String(recMonth).padStart(2, '0')}`;

      // Aplica filtro de linha se selecionado
      if (maintenanceLine !== 'Todas' && rec.machine_name !== maintenanceLine) return;

      try {
        const raw = rec.downtime_data;
        if (!raw) return;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed || Array.isArray(parsed) || parsed.A === undefined) return;

        const res = calculateOEEResults(parsed as OEEInputs, stopCodes);
        const stops: StopEntry[] = Array.isArray(parsed.stops) ? parsed.stops : [];

        // Filtra somente códigos de quebra / manutenção
        const maintStops = stops.filter(s => [1, 2, 3, 31, 32, 33, 34, 35].includes(Number(s.code)));
        const maintMinutes = maintStops.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);

        // Agrupamento por Mês
        if (!monthlyBreakdown[monthKey]) {
          const mDate = new Date(recYear, recMonth - 1, 1);
          const monthName = mDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
          monthlyBreakdown[monthKey] = { monthName, progH: 0, maintMins: 0, monthKey };
        }
        monthlyBreakdown[monthKey].progH += res.P;
        monthlyBreakdown[monthKey].maintMins += maintMinutes;

        // Se pertence ao mês selecionado pelo usuário
        if (recYear === selectedYear && recMonth === selectedMonth) {
          selectedMonthProgH += res.P;
          selectedMonthMaintMins += maintMinutes;
          selectedMonthRecordsCount++;

          if (!dailyBreakdown[recDay]) {
            dailyBreakdown[recDay] = { day: recDay, progH: 0, maintMins: 0, count: 0 };
          }
          dailyBreakdown[recDay].progH += res.P;
          dailyBreakdown[recDay].maintMins += maintMinutes;
          dailyBreakdown[recDay].count++;

          // Detalhar causas de manutenção do mês
          maintStops.forEach(st => {
            const cCode = Number(st.code);
            const dur = Number(st.duration) || 0;
            const codeConfig = stopCodes.find(c => c.code === cCode);
            if (!breakdownReasonMap[cCode]) {
              breakdownReasonMap[cCode] = {
                duration: 0,
                count: 0,
                name: codeConfig ? `${codeConfig.code} - ${codeConfig.description}` : `Código ${cCode}`
              };
            }
            breakdownReasonMap[cCode].duration += dur;
            breakdownReasonMap[cCode].count += 1;
          });
        }
      } catch (e) {
        // ignora erro de registro individual
      }
    });

    // Formatar Gráfico 1: Meses ordenados cronologicamente
    const monthlyChartData = Object.values(monthlyBreakdown)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(item => {
        const indice = item.progH > 0 ? (item.maintMins / 60 / item.progH) * 100 : 0;
        return {
          mes: item.monthName,
          monthKey: item.monthKey,
          indiceQuebra: Number(indice.toFixed(1)),
          horasParadas: Number((item.maintMins / 60).toFixed(1)),
          horasProgramadas: Number(item.progH.toFixed(1))
        };
      });

    // Formatar Gráfico 2: Dias do mês selecionado ordenados
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyChartData: { dia: string; diaNum: number; indiceQuebra: number; horasParadas: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dataDay = dailyBreakdown[day];
      if (dataDay && dataDay.progH > 0) {
        const indice = (dataDay.maintMins / 60 / dataDay.progH) * 100;
        dailyChartData.push({
          dia: `Dia ${String(day).padStart(2, '0')}`,
          diaNum: day,
          indiceQuebra: Number(indice.toFixed(1)),
          horasParadas: Number((dataDay.maintMins / 60).toFixed(1))
        });
      } else if (dataDay && dataDay.maintMins > 0) {
        dailyChartData.push({
          dia: `Dia ${String(day).padStart(2, '0')}`,
          diaNum: day,
          indiceQuebra: 100,
          horasParadas: Number((dataDay.maintMins / 60).toFixed(1))
        });
      }
    }

    const overallMonthlyIndex = selectedMonthProgH > 0 ? (selectedMonthMaintMins / 60 / selectedMonthProgH) * 100 : 0;
    const topBreakdownCauses = Object.values(breakdownReasonMap).sort((a, b) => b.duration - a.duration);

    return {
      monthlyChartData,
      dailyChartData,
      overallMonthlyIndex,
      totalMaintHours: selectedMonthMaintMins / 60,
      totalProgHours: selectedMonthProgH,
      recordsCount: selectedMonthRecordsCount,
      topBreakdownCauses
    };
  }, [allSystemRecords, maintenanceMonth, maintenanceLine, stopCodes]);

  // Dados consolidados para o One Page Report (OPR)
  const oprData = useMemo(() => {
    const [selectedYear, selectedMonth] = oprMonth.split('-').map(Number);
    
    // Filtrar todos os registros do mês
    const monthRecords = allSystemRecords.filter(r => {
      const d = new Date(r.created_at);
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    if (monthRecords.length === 0) return null;

    let totalOee = 0;
    let totalDisp = 0;
    let totalPerf = 0;
    let totalQual = 0;
    let totalRealProduction = 0;
    let totalProgrammedHours = 0;
    let totalMaintenanceMins = 0;
    let totalAllStopsDurationMins = 0;

    // Agrupamento por Linha
    const lineMap: { 
      [line: string]: { 
        count: number; 
        oeeSum: number; 
        dispSum: number; 
        perfSum: number; 
        qualSum: number; 
        realProd: number; 
        progH: number; 
        maintMins: number; 
        stopsMins: number; 
      } 
    } = {};

    PRODUCTION_LINES.forEach(l => {
      lineMap[l] = {
        count: 0,
        oeeSum: 0,
        dispSum: 0,
        perfSum: 0,
        qualSum: 0,
        realProd: 0,
        progH: 0,
        maintMins: 0,
        stopsMins: 0
      };
    });

    // Agrupamento diário para o Gráfico OEE Global do mês
    const dailyOeeMap: { [day: number]: { sum: number; count: number } } = {};

    monthRecords.forEach(rec => {
      const oeeScore = Number(rec.oee_score) || 0;
      totalOee += oeeScore;
      totalDisp += Number(rec.availability) || 0;
      totalPerf += Number(rec.performance) || 0;
      totalQual += Number(rec.quality) || 0;

      const d = new Date(rec.created_at);
      const day = d.getDate();
      if (!dailyOeeMap[day]) {
        dailyOeeMap[day] = { sum: 0, count: 0 };
      }
      dailyOeeMap[day].sum += oeeScore;
      dailyOeeMap[day].count += 1;

      const lName = rec.machine_name;
      if (!lineMap[lName]) {
        lineMap[lName] = {
          count: 0, oeeSum: 0, dispSum: 0, perfSum: 0, qualSum: 0, realProd: 0, progH: 0, maintMins: 0, stopsMins: 0
        };
      }

      lineMap[lName].count++;
      lineMap[lName].oeeSum += oeeScore;
      lineMap[lName].dispSum += Number(rec.availability) || 0;
      lineMap[lName].perfSum += Number(rec.performance) || 0;
      lineMap[lName].qualSum += Number(rec.quality) || 0;

      let hasInputs = false;
      try {
        const raw = rec.raw_data || rec.downtime_data;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && !Array.isArray(parsed) && parsed.A !== undefined) {
            const res = calculateOEEResults(parsed as OEEInputs, stopCodes);
            const stops: StopEntry[] = Array.isArray(parsed.stops) ? parsed.stops : [];

            const hProd = Number(parsed.H) || 0;
            totalRealProduction += hProd;
            totalProgrammedHours += res.P;
            lineMap[lName].realProd += hProd;
            lineMap[lName].progH += res.P;

            const mMins = stops
              .filter(s => [1, 2, 3, 31, 32, 33, 34, 35].includes(Number(s.code)))
              .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
            totalMaintenanceMins += mMins;
            lineMap[lName].maintMins += mMins;

            const allMins = stops.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
            totalAllStopsDurationMins += allMins;
            lineMap[lName].stopsMins += allMins;
            hasInputs = true;
          }
        }
      } catch (e) {
        // ignore
      }

      if (!hasInputs) {
        const estProgH = 21.6;
        const estRealH = 2200;
        const estStopsH = estProgH * (1 - (Number(rec.availability) || 75) / 100);
        totalRealProduction += estRealH;
        totalProgrammedHours += estProgH;
        lineMap[lName].realProd += estRealH;
        lineMap[lName].progH += estProgH;
        const estMaintH = estStopsH * 0.35;
        totalMaintenanceMins += estMaintH * 60;
        lineMap[lName].maintMins += estMaintH * 60;
        totalAllStopsDurationMins += estStopsH * 60;
        lineMap[lName].stopsMins += estStopsH * 60;
      }
    });

    const totalCount = monthRecords.length;
    const globalOee = totalOee / totalCount;
    const globalDisp = totalDisp / totalCount;
    const globalPerf = totalPerf / totalCount;
    const globalQual = totalQual / totalCount;
    const globalMaintenanceIndex = totalProgrammedHours > 0 ? (totalMaintenanceMins / 60 / totalProgrammedHours) * 100 : 0;
    const globalProductivity = totalProgrammedHours > 0 ? (totalRealProduction / totalProgrammedHours) : 0;
    const totalStopsHours = totalAllStopsDurationMins / 60;

    // Gráfico do mês consolidado diário (Todas as Linhas)
    const monthlyDailyChart = Object.entries(dailyOeeMap).map(([dayStr, val]) => ({
      dia: `Dia ${dayStr.padStart(2, '0')}`,
      diaNum: Number(dayStr),
      oee: Number((val.sum / val.count).toFixed(1))
    })).sort((a, b) => a.diaNum - b.diaNum);

    // Linhas com indicadores e dados individuais
    const linesData = PRODUCTION_LINES.map(lineName => {
      const item = lineMap[lineName];
      const hasRecords = item && item.count > 0;
      const oee = hasRecords ? item.oeeSum / item.count : 0;
      const disp = hasRecords ? item.dispSum / item.count : 0;
      const perf = hasRecords ? item.perfSum / item.count : 0;
      const qual = hasRecords ? item.qualSum / item.count : 0;
      const mIdx = item.progH > 0 ? (item.maintMins / 60 / item.progH) * 100 : 0;
      const prod = item.progH > 0 ? item.realProd / item.progH : 0;
      const stopsH = item.stopsMins / 60;

      return {
        lineName,
        hasRecords,
        count: item.count,
        oee: Number(oee.toFixed(1)),
        disp: Number(disp.toFixed(1)),
        perf: Number(perf.toFixed(1)),
        qual: Number(qual.toFixed(1)),
        maintenanceIndex: Number(mIdx.toFixed(1)),
        productivity: Number(prod.toFixed(1)),
        totalStopsHours: Number(stopsH.toFixed(1))
      };
    });

    return {
      monthKey: oprMonth,
      monthFormatted: new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase(),
      totalRecords: totalCount,
      globalOee: Number(globalOee.toFixed(1)),
      globalDisp: Number(globalDisp.toFixed(1)),
      globalPerf: Number(globalPerf.toFixed(1)),
      globalQual: Number(globalQual.toFixed(1)),
      globalMaintenanceIndex: Number(globalMaintenanceIndex.toFixed(1)),
      globalProductivity: Number(globalProductivity.toFixed(1)),
      totalStopsHours: Number(totalStopsHours.toFixed(1)),
      monthlyDailyChart,
      linesData
    };
  }, [allSystemRecords, oprMonth, stopCodes]);

  // Função para Download do One Page Report em PDF formato Paisagem (Landscape) com fundo BRANCO
  // Função robusta para Download do One Page Report em PDF formato Paisagem (Landscape)
  const downloadOnePageReportPdf = async () => {
    if (!oprPrintRef.current) return;
    setIsExportingPdf(true);
    setPdfExportError(null);
    try {
      const element = oprPrintRef.current;

      let imgData = '';
      try {
        // Tenta gerar PNG via html-to-image (renderização nativa que suporta modern CSS, OKLCH, SVGs e grids)
        imgData = await toPng(element, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          quality: 0.98,
          cacheBust: true,
        });
      } catch (errHtmlToImage) {
        console.warn('html-to-image encontrou aviso, tentando fallback com html2canvas:', errHtmlToImage);
        const html2canvasFunc = typeof html2canvas === 'function' 
          ? html2canvas 
          : ((html2canvas as any).default || html2canvas);

        const canvas = await html2canvasFunc(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        imgData = canvas.toDataURL('image/png');
      }

      if (!imgData) {
        throw new Error('Falha ao renderizar imagem do relatório');
      }

      const JsPdfClass = typeof jsPDF === 'function' 
        ? jsPDF 
        : ((jsPDF as any).jsPDF || (jsPDF as any).default);

      // A4 Landscape: 297mm x 210mm
      const pdf = new JsPdfClass({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      // Obter dimensões reais da imagem renderizada
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = pdfWidth;
      const imgHeight = (img.height * imgWidth) / img.width;

      let renderWidth = imgWidth;
      let renderHeight = imgHeight;
      let posX = 0;
      let posY = 0;

      if (imgHeight > pdfHeight) {
        renderHeight = pdfHeight;
        renderWidth = (img.width * renderHeight) / img.height;
        posX = (pdfWidth - renderWidth) / 2;
        posY = 0;
      } else {
        posY = (pdfHeight - renderHeight) / 2;
      }

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      pdf.save(`ONE_PAGE_REPORT_OEE_${oprMonth || 'MENSAL'}.pdf`);
    } catch (err: any) {
      console.error('Erro ao gerar PDF do One Page Report:', err);
      setPdfExportError(`Não foi possível gerar o PDF diretamente. Você pode usar o botão "Imprimir (1 Página)" para salvar como PDF com facilidade.`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Função para Impressão Nativa isolada garantindo EXATAMENTE 1 página
  const printOnePageReport = () => {
    if (!oprPrintRef.current) return;

    try {
      const element = oprPrintRef.current;

      // Cria um iframe invisível para isolar completamente o relatório do restante do aplicativo
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      // Copia estilos e fontes da página principal
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const contentHtml = element.outerHTML;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ONE PAGE REPORT - OEE GUIDEWAY (${oprMonth})</title>
            ${styles}
            <style>
              @page {
                size: A4 landscape;
                margin: 4mm 6mm;
              }
              html, body {
                width: 100% !important;
                height: 100% !important;
                max-height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                overflow: hidden !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #opr-printable-report {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            </style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Erro na impressão por iframe, usando fallback:', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 400);
    } catch (e) {
      console.error('Falha ao abrir impressão isolada:', e);
      window.print();
    }
  };

  const currentParetoData = useMemo(() => {
    const stopsMap: { [key: number]: number } = {};
    inputs.stops.forEach(stop => {
      const code = Number(stop.code);
      stopsMap[code] = (stopsMap[code] || 0) + (Number(stop.duration) || 0);
    });

    const allPareto = Object.entries(stopsMap)
      .map(([code, duration]) => {
        const config = stopCodes.find(c => c.code === Number(code));
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
  }, [inputs.stops, stopCodes]);

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
      try {
        const parsed = JSON.parse(session);
        if (parsed) {
          // Garante que se o e-mail da sessão for o do admin principal, herda isAdmin true e role admin instantaneamente
          if (parsed.email && parsed.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()) {
            parsed.isAdmin = true;
            parsed.role = 'admin';
          } else if (!parsed.role) {
            parsed.role = parsed.isAdmin ? 'admin' : 'operador';
          }
          setCurrentUser(parsed);
        }
      } catch (e) {
        console.error("Erro ao ler sessão local:", e);
      }
    }
  }, []);

  // Proteção de rota para perfil USUÁRIO e DIRETORIA EXECUTIVA (Somente consulta)
  useEffect(() => {
    if (currentUser && (currentUser.role === 'usuario' || currentUser.role === 'diretoria')) {
      if (activeTab === 'inputs') {
        setActiveTab('dashboard');
      }
      if (showAdminPanel) {
        setShowAdminPanel(false);
      }
    }
  }, [currentUser, activeTab, showAdminPanel]);

  // Inicializar dados e atualizar lista de biometrias cadastradas
  useEffect(() => {
    if (currentUser) {
      fetchStopCodes(); // Recarrega códigos de parada após autenticação bem-sucedida no Supabase
      if (isUserDiretoria(currentUser)) {
        fetchAllSystemRecords();
      } else if (activeTab === 'dashboard' && !dashboardRecord) {
        fetchLatestRecord();
      }
    } else {
      const profiles = getEnrolledBiometricProfiles();
      setEnrolledBiometrics(profiles);
      if (profiles.length > 0 && !profiles.some(p => p.userEmail === selectedBiometricEmail)) {
        setSelectedBiometricEmail(profiles[0].userEmail);
      }
    }
  }, [currentUser, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const cleanEmail = loginEmail.trim();
      const clientDevice = typeof navigator !== 'undefined' 
        ? (navigator.userAgent.includes('Mobile') ? 'Mobile / Smartphone' : 'Desktop / Computador')
        : 'Desktop';
      
      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        
        // Se a lista estiver vazia, verifique e insira o admin principal padrão com senha criptografada
        const adminExists = localUsers.some(u => u.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase());
        let updatedUsers = [...localUsers];
        if (!adminExists) {
          const defaultAdminPassHash = await hashPassword('admin');
          const defaultAdmin = {
            name: 'Administrador Guideway',
            email: MAIN_ADMIN_EMAIL,
            password: defaultAdminPassHash,
            is_admin: true,
            role: 'admin'
          };
          updatedUsers = [...localUsers, defaultAdmin];
          localStorage.setItem('oee_local_users', JSON.stringify(updatedUsers));
        }

        const matched = updatedUsers.find(u => 
          u.email.toLowerCase() === cleanEmail.toLowerCase()
        );

        if (!matched) {
          recordAccessLog({
            user_name: 'Tentativa não autorizada',
            user_email: cleanEmail,
            user_role: 'desconhecido',
            status: 'falha',
            device_info: clientDevice
          });
          setLoginError('E-mail ou senha incorretos.');
          return;
        }

        const isPasswordValid = await verifyPassword(loginPassword, matched.password);
        if (!isPasswordValid) {
          recordAccessLog({
            user_name: matched.name,
            user_email: matched.email,
            user_role: matched.role || (matched.is_admin ? 'admin' : 'operador'),
            status: 'falha',
            device_info: clientDevice
          });
          setLoginError('E-mail ou senha incorretos.');
          return;
        }

        // Se a senha armazenada ainda for em texto puro legado, faz upgrade criptográfico automático imediato
        if (matched.password && !matched.password.startsWith('sha256:')) {
          const newHashed = await hashPassword(loginPassword);
          const migratedUsers = updatedUsers.map(u => 
            u.email.toLowerCase() === cleanEmail.toLowerCase() ? { ...u, password: newHashed } : u
          );
          localStorage.setItem('oee_local_users', JSON.stringify(migratedUsers));
          matched.password = newHashed;
        }

        const role = normalizeUserRole(matched.role, matched.is_admin, matched.email);

        const user: User = {
          name: matched.name,
          email: matched.email,
          password: matched.password,
          isAdmin: role === 'admin',
          role
        };

        // REGISTRAR LOGIN COM SUCESSO NO CONTROLE DE ACESSOS
        recordAccessLog({
          user_name: user.name,
          user_email: user.email,
          user_role: user.role,
          status: 'sucesso',
          device_info: clientDevice
        });

        setCurrentUser(user);
        localStorage.setItem('oee_guide_session', JSON.stringify(user));
        return;
      }

      // No Supabase, busca o usuário ignorando maiúsculas/minúsculas no e-mail
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error || !data) {
        recordAccessLog({
          user_name: 'Tentativa não autorizada',
          user_email: cleanEmail,
          user_role: 'desconhecido',
          status: 'falha',
          device_info: clientDevice
        });
        setLoginError('E-mail ou senha incorretos.');
        return;
      }

      const isPasswordValid = await verifyPassword(loginPassword, data.password);
      if (!isPasswordValid) {
        recordAccessLog({
          user_name: data.name,
          user_email: data.email,
          user_role: data.role || (data.is_admin ? 'admin' : 'operador'),
          status: 'falha',
          device_info: clientDevice
        });
        setLoginError('E-mail ou senha incorretos.');
        return;
      }

      // Se a senha no Supabase ainda for texto puro, faz upgrade criptográfico
      if (data.password && !data.password.startsWith('sha256:')) {
        const newHashed = await hashPassword(loginPassword);
        try {
          await supabase.from('users').update({ password: newHashed }).eq('id', data.id);
        } catch {}
        data.password = newHashed;
      }

      const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
      const localMatch = localUsers.find(lu => lu.email.toLowerCase() === cleanEmail.toLowerCase());
      const role = normalizeUserRole(data.role || localMatch?.role, data.is_admin, data.email);

      const user: User = {
        name: data.name,
        email: data.email,
        password: data.password,
        isAdmin: role === 'admin',
        role
      };

      // REGISTRAR LOGIN COM SUCESSO NO CONTROLE DE ACESSOS
      recordAccessLog({
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        status: 'sucesso',
        device_info: clientDevice
      });

      setCurrentUser(user);
      localStorage.setItem('oee_guide_session', JSON.stringify(user));
    } catch (error) {
      console.error('Erro no login:', error);
      setLoginError('Erro de conexão com o banco de dados. Verifique sua conexão de rede.');
    }
  };

  // Login via Leitura Facial (Face ID / Android Biometria)
  const handleBiometricLogin = async () => {
    setLoginError('');
    setIsBiometricLoggingIn(true);
    try {
      const targetEmail = selectedBiometricEmail || enrolledBiometrics[0]?.userEmail;
      const authResult = await authenticateWithBiometricFaceId(targetEmail);

      if (!authResult.success || !authResult.profile) {
        recordAccessLog({
          user_name: authResult.profile?.userName || 'Leitura Facial Recusada',
          user_email: targetEmail || 'desconhecido',
          user_role: authResult.profile?.userRole || 'diretoria',
          status: 'falha',
          device_info: `Mobile / ${biometricPlatform.shortLabel}`
        });
        setLoginError(authResult.error || 'Falha na autenticação facial.');
        return;
      }

      const profile = authResult.profile;
      let resolvedUser: User = {
        name: profile.userName,
        email: profile.userEmail,
        password: profile.passwordHash,
        isAdmin: profile.userRole === 'admin',
        role: normalizeUserRole(profile.userRole, profile.userRole === 'admin', profile.userEmail)
      };

      // Tenta sincronizar papel atualizado no banco caso online
      if (!useLocalFallback) {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .ilike('email', profile.userEmail)
            .maybeSingle();
          if (data) {
            const role = normalizeUserRole(data.role || profile.userRole, data.is_admin, data.email);
            resolvedUser = {
              name: data.name || profile.userName,
              email: data.email || profile.userEmail,
              password: data.password || profile.passwordHash,
              isAdmin: role === 'admin',
              role
            };
          }
        } catch {
          // Mantém dados da credencial biométrica vinculada
        }
      }

      recordAccessLog({
        user_name: resolvedUser.name,
        user_email: resolvedUser.email,
        user_role: resolvedUser.role,
        status: 'sucesso',
        device_info: `Mobile / Leitura Facial (${biometricPlatform.shortLabel})`
      });

      setCurrentUser(resolvedUser);
      localStorage.setItem('oee_guide_session', JSON.stringify(resolvedUser));
    } catch (err: any) {
      setLoginError(err?.message || 'Erro ao autenticar com Leitura Facial.');
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('oee_guide_session');
    setShowAdminPanel(false);
    setDashboardRecord(null);
    setAiAnalysis('');
  };

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operador');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanEmail = newUserEmail.trim();
      const isAdminRole = newUserRole === 'admin';
      const passwordHashed = await hashPassword(newUserPassword);

      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        if (localUsers.some(u => u.email.toLowerCase() === cleanEmail.toLowerCase())) {
          alert('Erro: Um usuário com este e-mail já existe.');
          return;
        }
        const newUser = {
          name: newUserName,
          email: cleanEmail,
          password: passwordHashed,
          is_admin: isAdminRole,
          role: newUserRole
        };
        localStorage.setItem('oee_local_users', JSON.stringify([...localUsers, newUser]));
        alert(`Usuário criado com sucesso com perfil ${newUserRole.toUpperCase()} e senha criptografada (SHA-256)!`);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('operador');
        fetchUsers();
        return;
      }

      // Tenta gravar com a coluna role se ela existir e com a senha criptografada
      const userPayload: any = {
        name: newUserName,
        email: cleanEmail,
        password: passwordHashed,
        is_admin: isAdminRole,
        role: newUserRole
      };

      const { error } = await supabase
        .from('users')
        .insert([userPayload]);

      if (error) {
        if (error.message?.includes('column "role"') || error.code === '42703') {
          const fallbackPayload = {
            name: newUserName,
            email: cleanEmail,
            password: passwordHashed,
            is_admin: isAdminRole
          };
          const { error: err2 } = await supabase.from('users').insert([fallbackPayload]);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }

      // Sincroniza no cache local
      const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
      const updatedLocal = localUsers.filter(u => u.email.toLowerCase() !== cleanEmail.toLowerCase());
      updatedLocal.push({
        name: newUserName,
        email: cleanEmail,
        password: passwordHashed,
        is_admin: isAdminRole,
        role: newUserRole
      });
      localStorage.setItem('oee_local_users', JSON.stringify(updatedLocal));

      alert(`Usuário criado com sucesso com perfil ${newUserRole.toUpperCase()} e senha criptografada (SHA-256)!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('operador');
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário: ' + error.message);
    }
  };

  // Redefinir senha com criptografia
  const handleResetPassword = async (email: string, plainNewPassword: string) => {
    if (!plainNewPassword.trim()) {
      alert('Por favor, informe a nova senha.');
      return;
    }
    try {
      const hashed = await hashPassword(plainNewPassword.trim());
      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        const updated = localUsers.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: hashed } : u);
        localStorage.setItem('oee_local_users', JSON.stringify(updated));
        alert('Senha redefinida com sucesso e protegida com criptografia SHA-256!');
        setResettingUserEmail(null);
        setNewPasswordForUser('');
        fetchUsers();
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ password: hashed })
        .ilike('email', email);

      if (error) throw error;

      const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
      const updated = localUsers.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: hashed } : u);
      localStorage.setItem('oee_local_users', JSON.stringify(updated));

      alert('Senha redefinida com sucesso e protegida com criptografia SHA-256!');
      setResettingUserEmail(null);
      setNewPasswordForUser('');
      fetchUsers();
    } catch (e: any) {
      console.error('Erro ao redefinir senha:', e);
      alert('Erro ao redefinir senha: ' + e.message);
    }
  };

  // Abrir modal de edição completa de usuário (Nome, Login/E-mail, Senha e Perfil)
  const openEditUserModal = (user: User) => {
    setEditingUserOriginalEmail(user.email);
    setEditUserName(user.name || '');
    setEditUserEmail(user.email || '');
    setEditUserPassword('');
    setEditUserRole(normalizeUserRole(user.role, user.isAdmin, user.email));
    setEditUserError('');
    setShowEditPassword(false);
  };

  // Salvar alterações de Login, Nome, Senha e Perfil do usuário
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserOriginalEmail) return;
    setEditUserError('');

    const trimmedName = editUserName.trim();
    const trimmedEmail = editUserEmail.trim();
    const trimmedPassword = editUserPassword.trim();

    if (!trimmedName || !trimmedEmail) {
      setEditUserError('Nome completo e e-mail (login) são obrigatórios.');
      return;
    }

    const isPrimaryAdmin = editingUserOriginalEmail.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
    const resolvedRole: UserRole = isPrimaryAdmin ? 'admin' : editUserRole;
    const isAdminRole = resolvedRole === 'admin';

    // Verifica duplicidade se o e-mail (login) foi alterado
    if (trimmedEmail.toLowerCase() !== editingUserOriginalEmail.toLowerCase()) {
      const duplicate = users.some(
        u => u.email.toLowerCase() === trimmedEmail.toLowerCase()
      );
      if (duplicate) {
        setEditUserError('Já existe outro usuário cadastrado com este e-mail/login.');
        return;
      }
    }

    setIsSavingEditedUser(true);
    try {
      const existingUserObj = users.find(
        u => u.email.toLowerCase() === editingUserOriginalEmail.toLowerCase()
      );
      const updatedPasswordHash = trimmedPassword
        ? await hashPassword(trimmedPassword)
        : (existingUserObj?.password || '');

      if (!useLocalFallback) {
        const updatePayload: any = {
          name: trimmedName,
          email: trimmedEmail,
          is_admin: isAdminRole,
          role: resolvedRole
        };
        if (trimmedPassword) {
          updatePayload.password = updatedPasswordHash;
        }

        const { error } = await supabase
          .from('users')
          .update(updatePayload)
          .ilike('email', editingUserOriginalEmail);

        if (error) {
          if (error.message?.includes('column "role"') || error.code === '42703') {
            const fallbackPayload: any = {
              name: trimmedName,
              email: trimmedEmail,
              is_admin: isAdminRole
            };
            if (trimmedPassword) {
              fallbackPayload.password = updatedPasswordHash;
            }
            const { error: err2 } = await supabase
              .from('users')
              .update(fallbackPayload)
              .ilike('email', editingUserOriginalEmail);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      }

      // Sincroniza no localStorage (oee_local_users)
      const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
      const foundLocally = localUsers.some(
        u => u.email.toLowerCase() === editingUserOriginalEmail.toLowerCase()
      );
      let updatedLocalUsers;
      if (foundLocally) {
        updatedLocalUsers = localUsers.map(u => {
          if (u.email.toLowerCase() === editingUserOriginalEmail.toLowerCase()) {
            return {
              ...u,
              name: trimmedName,
              email: trimmedEmail,
              password: trimmedPassword ? updatedPasswordHash : u.password,
              is_admin: isAdminRole,
              role: resolvedRole
            };
          }
          return u;
        });
      } else {
        updatedLocalUsers = [
          ...localUsers,
          {
            name: trimmedName,
            email: trimmedEmail,
            password: updatedPasswordHash,
            is_admin: isAdminRole,
            role: resolvedRole
          }
        ];
      }
      localStorage.setItem('oee_local_users', JSON.stringify(updatedLocalUsers));

      // Sincroniza credencial biométrica (Face ID) se houver cadastro neste dispositivo
      try {
        const bioProfiles = getEnrolledBiometricProfiles();
        const bioIndex = bioProfiles.findIndex(
          p => p.userEmail.toLowerCase() === editingUserOriginalEmail.toLowerCase()
        );
        if (bioIndex > -1) {
          const updatedBio = [...bioProfiles];
          updatedBio[bioIndex] = {
            ...updatedBio[bioIndex],
            userName: trimmedName,
            userEmail: trimmedEmail,
            userRole: resolvedRole,
            passwordHash: updatedPasswordHash || updatedBio[bioIndex].passwordHash
          };
          localStorage.setItem('oee_face_id_profiles', JSON.stringify(updatedBio));
          setEnrolledBiometrics(updatedBio);
        }
      } catch {}

      // Se o admin editou a própria conta logada, atualiza a sessão ativa
      if (currentUser && currentUser.email.toLowerCase() === editingUserOriginalEmail.toLowerCase()) {
        const updatedSessionUser: User = {
          ...currentUser,
          name: trimmedName,
          email: trimmedEmail,
          password: updatedPasswordHash || currentUser.password,
          isAdmin: isAdminRole,
          role: resolvedRole
        };
        setCurrentUser(updatedSessionUser);
        localStorage.setItem('oee_guide_session', JSON.stringify(updatedSessionUser));
      }

      setEditingUserOriginalEmail(null);
      setEditUserPassword('');
      fetchUsers();
      alert(`Dados do usuário "${trimmedName}" atualizados com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      setEditUserError('Erro ao salvar alterações: ' + (err?.message || 'Falha desconhecida'));
    } finally {
      setIsSavingEditedUser(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === MAIN_ADMIN_EMAIL) {
      alert('O administrador principal não pode ser excluído.');
      return;
    }
    
    if (!confirm(`Deseja realmente excluir o usuário ${email}?`)) return;

    try {
      if (useLocalFallback) {
        const localUsers = safeGetLocalStorage<any[]>('oee_local_users', []);
        const filtered = localUsers.filter(u => u.email !== email);
        localStorage.setItem('oee_local_users', JSON.stringify(filtered));
        alert('Usuário excluído com sucesso!');
        fetchUsers();
        return;
      }

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
    if (key === 'date') {
      const selectedDate = new Date(value + 'T00:00:00');
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (selectedDate > today) {
        alert('Não é permitido registrar dados para datas futuras.');
        return;
      }
      setInputs(prev => ({ ...prev, [key]: value }));
    } else if (key === 'sku' || key === 'line' || key === 'shiftStartTime' || key === 'shiftEndTime') {
      setInputs(prev => ({ ...prev, [key]: value }));
    } else {
      const numValue = parseFloat(value) || 0;
      setInputs(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const handleDownloadReport = (customInputs?: OEEInputs, customResults?: OEEResults) => {
    const reportData = customInputs || inputs;
    const reportResults = customResults || results;

    const markdownToHtml = (text: string) => {
      // ... (mantém a lógica interna igual)
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
          <title>Relatório OEE GUIDEWAY - ${reportData.date}</title>
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
                  <div class="date">Data: ${new Date(reportData.date).toLocaleDateString('pt-BR')}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-top: 5px;">Linha: ${reportData.line}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: bold;">Produto: ${reportData.sku}</div>
              </div>
          </div>

          <div class="grid">
              <div class="card">
                  <div class="card-title">OEE Global</div>
                  <div class="card-value">${reportResults.oee.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Disponibilidade</div>
                  <div class="card-value">${reportResults.disponibilidade.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Performance</div>
                  <div class="card-value">${reportResults.performance.toFixed(1)}%</div>
              </div>
              <div class="card">
                  <div class="card-title">Qualidade</div>
                  <div class="card-value">${reportResults.qualidade.toFixed(1)}%</div>
              </div>
          </div>

          <div class="section-title">Decomposição de Tempos (h)</div>
          <div class="chart-sim">
              ${[
                { name: 'TEMPO TOTAL', value: reportData.A, color: '#7e22ce' },
                { name: 'TEMPO PROGRAMADO', value: reportResults.P, color: '#0ea5e9' },
                { name: 'TEMPO DE OPERAÇÃO', value: reportResults.R, color: '#15803d' },
                { name: 'TEMPO LÍQUIDO', value: reportResults.T, color: '#ea580c' },
                { name: 'TEMPO ÚTIL', value: reportResults.X, color: '#0369a1' },
              ].map(d => `
                  <div class="bar-container">
                      <div class="bar-label">${d.name}</div>
                      <div class="bar-outer">
                          <div class="bar-inner" style="width: ${(d.value / reportData.A) * 100}%; background: ${d.color};"></div>
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
                  <tr><td>Produção Real</td><td>${formatNumber(reportData.H)}</td><td>fardos</td></tr>
                  <tr><td>Produção Teórica</td><td>${formatNumber(reportResults.G)}</td><td>fardos</td></tr>
                  <tr><td>Velocidade de Projeto</td><td>${formatNumber(reportResults.F)}</td><td>gph</td></tr>
                  <tr><td>Paradas Não Programadas</td><td>${formatNumber(reportResults.Q)}</td><td>h</td></tr>
                  <tr><td>Perda por Qualidade</td><td>${reportData.U}</td><td>garrafas</td></tr>
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
    a.download = `Relatorio_OEE_Guideway_${reportData.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatNumber = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  if (!currentUser) {
    const activeBioProfile = enrolledBiometrics.find(p => p.userEmail === selectedBiometricEmail) || enrolledBiometrics[0];

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex justify-center mb-8">
              <div className="flex flex-col items-center gap-3">
                <img 
                  src="https://i.imgur.com/AIrsvfE_d.png?maxwidth=520&shape=thumb&fidelity=high" 
                  alt="Guideway Logo" 
                  className="w-32 h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-2xl font-bold text-white tracking-tight">OEE <span className="text-blue-500">GUIDEWAY</span></h1>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-3 text-center">Acesso ao Sistema</h2>
            <div className="flex justify-center mb-6">
              {useLocalFallback ? (
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Modo Demonstrativo (Local)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Conectado ao Supabase
                </span>
              )}
            </div>

            {/* LOGIN VIA LEITURA FACIAL (Quando já cadastrado no dispositivo) */}
            {activeBioProfile && (
              <div className="mb-6 bg-zinc-900/90 border border-blue-500/35 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <ScanFace size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{activeBioProfile.userName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{activeBioProfile.userEmail}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 shrink-0">
                    {biometricPlatform.shortLabel}
                  </span>
                </div>

                {enrolledBiometrics.length > 1 && (
                  <select
                    value={activeBioProfile.userEmail}
                    onChange={(e) => setSelectedBiometricEmail(e.target.value)}
                    className="w-full min-h-[40px] bg-black border border-white/15 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {enrolledBiometrics.map((p) => (
                      <option key={p.userEmail} value={p.userEmail}>
                        {p.userName} ({p.userEmail})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={isBiometricLoggingIn}
                  className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ScanFace size={20} className={isBiometricLoggingIn ? 'animate-pulse' : ''} />
                  {isBiometricLoggingIn
                    ? 'Verificando Leitura Facial...'
                    : `Entrar com ${biometricPlatform.shortLabel}`}
                </button>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4 flex flex-col">
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 mt-2 cursor-pointer"
              >
                ENTRAR NO SISTEMA
              </button>
            </form>

            {/* Botão para Adicionar Ícone do APP na Tela de Início (iPhone / Android) */}
            {!isPWAInstalled && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (isPWAInstallable) {
                      installPWA();
                    } else {
                      setShowLoginHomeGuide(prev => !prev);
                    }
                  }}
                  className="w-full min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src="/pwa-192x192.png" alt="Ícone OEE Guideway" className="w-8 h-8 rounded-lg border border-white/15 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Adicionar Ícone na Tela Inicial</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {isIOSDevice ? 'iPhone (Safari)' : 'Celular Android / iPhone'}
                      </p>
                    </div>
                  </div>
                  <Smartphone size={17} className="text-blue-400 shrink-0" />
                </button>

                {showLoginHomeGuide && (
                  <div className="mt-3 bg-zinc-900 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-white">Como incluir o ícone na tela inicial:</p>
                    <p>• <strong>iPhone (Safari):</strong> Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
                    <p>• <strong>Android (Chrome):</strong> Toque no menu <strong>⋮</strong> e em <strong>Adicionar à tela inicial</strong>.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-white/5 p-5 text-center border-t border-white/5">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">© 2026 OEE GUIDEWAY - Inteligência Industrial</p>
          </div>
        </div>
      </div>
    );
  }

  // Direcionamento automático exclusivo para o perfil DIRETORIA EXECUTIVA -> App Mobile (Fundo Preto)
  if (isUserDiretoria(currentUser)) {
    return (
      <ErrorBoundary>
        <ExecutiveMobileApp
          currentUser={currentUser}
          allSystemRecords={allSystemRecords}
          isLoadingRecords={isLoadingAllRecords}
          productionLines={PRODUCTION_LINES}
          stopCodes={stopCodes}
          calculateOEEResults={calculateOEEResults}
          getOEEColorInfo={getOEEColorInfo}
          onRefresh={fetchAllSystemRecords}
          onLogout={handleLogout}
        />
      </ErrorBoundary>
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
            <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black mt-1 mb-2">Industrial Solutions</p>
            <div className="flex justify-center mt-2">
              {useLocalFallback ? (
                <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest">
                  Modo Local
                </span>
              ) : (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                  Supabase Online
                </span>
              )}
            </div>
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
            onClick={() => { setActiveTab('maintenance'); setShowAdminPanel(false); }}
            className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'maintenance' && !showAdminPanel ? 'bg-amber-600 text-white font-semibold shadow-lg shadow-amber-600/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Wrench size={20} />
            <span className="hidden md:inline">Manutenção Industrial</span>
          </button>
          {canUserEdit(currentUser) && (
            <button 
              onClick={() => { setActiveTab('inputs'); setShowAdminPanel(false); }}
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inputs' && !showAdminPanel ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Settings size={20} />
              <span className="hidden md:inline">Parâmetros</span>
            </button>
          )}
          
          {isUserAdmin(currentUser) && (
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
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {isUserAdmin(currentUser)
                  ? 'Admin'
                  : currentUser.role === 'diretoria'
                  ? 'Diretoria Executiva'
                  : currentUser.role === 'usuario'
                  ? 'Usuário (Visualizador)'
                  : 'Operador'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <AnimatePresence mode="wait">
          {showAdminPanel && isUserAdmin(currentUser) ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white">Painel Administrativo</h2>
                  <p className="text-slate-400 mt-1">Configurações globais e gestão de dados.</p>
                </div>
                <div className="flex bg-zinc-900 border border-white/10 p-1 rounded-2xl flex-wrap gap-1">
                  <button 
                    onClick={() => setAdminTab('users')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${adminTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Usuários
                  </button>
                  <button 
                    onClick={() => { setAdminTab('access_logs'); fetchAccessLogs(); }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${adminTab === 'access_logs' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-purple-400 hover:text-white hover:bg-purple-500/10'}`}
                  >
                    <ShieldCheck size={15} />
                    Controle de Acessos
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md font-mono">{accessLogs.length}</span>
                  </button>
                  <button 
                    onClick={() => setAdminTab('stops')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${adminTab === 'stops' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Tabela de Paradas
                  </button>
                  <button 
                    onClick={() => setAdminTab('lines')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${adminTab === 'lines' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
                  >
                    Layout & Linhas (DE ➔ PARA)
                  </button>
                  <button 
                    onClick={() => setAdminTab('export')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${adminTab === 'export' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-emerald-400 hover:text-white hover:bg-emerald-500/10'}`}
                  >
                    <FileSpreadsheet size={15} />
                    Exportar Excel (IA)
                  </button>
                </div>
              </header>

              <AnimatePresence mode="wait">
                {adminTab === 'users' ? (
                  <motion.div 
                    key="users-tab"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                  >
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
                      {/* Seletor de Perfil de Acesso */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Perfil de Acesso</label>
                        <div className="space-y-2">
                          <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${newUserRole === 'admin' ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                            <input 
                              type="radio" 
                              name="newUserRole" 
                              value="admin"
                              checked={newUserRole === 'admin'}
                              onChange={() => setNewUserRole('admin')}
                              className="mt-1 text-emerald-500 focus:ring-emerald-500/50"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-400">ADMIN (Administrador)</span>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono uppercase">Acesso Total</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Acesso irrestrito a todos os menus, Gestão de Usuários, One Page Report, Exportação Excel, Download Relatório e IA.
                              </p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${newUserRole === 'operador' ? 'bg-blue-500/10 border-blue-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                            <input 
                              type="radio" 
                              name="newUserRole" 
                              value="operador"
                              checked={newUserRole === 'operador'}
                              onChange={() => setNewUserRole('operador')}
                              className="mt-1 text-blue-500 focus:ring-blue-500/50"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-400">OPERADOR (Operador de Linha)</span>
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono uppercase">Apontamentos</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Acesso a Dashboard, Evolução, Manutenção e Parâmetros (apontamento e correção de dados da linha).
                              </p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${newUserRole === 'usuario' ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                            <input 
                              type="radio" 
                              name="newUserRole" 
                              value="usuario"
                              checked={newUserRole === 'usuario'}
                              onChange={() => setNewUserRole('usuario')}
                              className="mt-1 text-purple-500 focus:ring-purple-500/50"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-400">USUÁRIO (Visualizador)</span>
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono uppercase">Somente Leitura</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Somente visualização dos menus Dashboard, Evolução e Manutenção. Sem permissão de edição, sem Parâmetros e sem exportações.
                              </p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${newUserRole === 'diretoria' ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}>
                            <input 
                              type="radio" 
                              name="newUserRole" 
                              value="diretoria"
                              checked={newUserRole === 'diretoria'}
                              onChange={() => setNewUserRole('diretoria')}
                              className="mt-1 text-amber-500 focus:ring-amber-500/50"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-amber-400">DIRETORIA EXECUTIVA</span>
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono uppercase">App Mobile · Consulta</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Direciona automaticamente para o App Mobile em fundo preto, com filtros em lista suspensa (dia, mês, período, ano), leitura facial e ícone na tela inicial.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        CRIAR USUÁRIO NO BANCO
                      </button>
                    </form>
                  </div>
                </div>

              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="px-8 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Usuários Cadastrados</h3>
                    <button 
                      onClick={fetchUsers}
                      className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <RefreshCw size={16} className={isLoadingUsers ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perfil</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Senha</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
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
                          <td className="px-4 py-3 text-sm font-bold text-white">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                          <td className="px-4 py-3">
                            {user.role === 'admin' || user.isAdmin ? (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Admin
                              </span>
                            ) : user.role === 'diretoria' ? (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Diretoria Exec.
                              </span>
                            ) : user.role === 'usuario' ? (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                Usuário
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Operador
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-400 tracking-widest">••••••••</span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                <ShieldCheck size={10} />
                                SHA-256
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openEditUserModal(user)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all cursor-pointer"
                                title="Editar Usuário (Nome, Login, Senha e Perfil)"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => {
                                  setResettingUserEmail(user.email);
                                  setNewPasswordForUser('');
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all cursor-pointer"
                                title="Redefinir Senha (Criptografia SHA-256)"
                              >
                                <Key size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.email)}
                                className="text-slate-600 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
            </motion.div>
          ) : adminTab === 'access_logs' ? (
            <motion.div 
              key="access-logs-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Header do Controle de Acessos com KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Logins</span>
                    <Clock size={16} className="text-blue-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{accessLogs.length}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Acessos auditados no sistema</span>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acessos Autorizados</span>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{accessLogs.filter(l => l.status === 'sucesso').length}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Autenticações válidas</span>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tentativas Inválidas</span>
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                  <p className="text-2xl font-black text-red-400">{accessLogs.filter(l => l.status === 'falha').length}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Senha incorreta ou usuário inexistente</span>
                </div>

                <div className="bg-gradient-to-br from-indigo-950/40 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Criptografia Ativa</span>
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-white flex items-center gap-1.5">
                    SHA-256 + Salt
                  </p>
                  <span className="text-[10px] text-emerald-300/80 mt-1 block">Senhas protegidas e irreversíveis</span>
                </div>
              </div>

              {/* Filtros e Barra de Ações de Auditoria */}
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Search size={16} />
                    </div>
                    <input 
                      type="text"
                      value={accessLogSearch}
                      onChange={(e) => setAccessLogSearch(e.target.value)}
                      placeholder="Pesquisar por colaborador ou e-mail..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perfil:</span>
                      <select 
                        value={accessLogFilterRole}
                        onChange={(e: any) => setAccessLogFilterRole(e.target.value)}
                        className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                      >
                        <option value="todos">Todos os Perfis</option>
                        <option value="admin">ADMIN</option>
                        <option value="diretoria">DIRETORIA EXECUTIVA</option>
                        <option value="operador">OPERADOR</option>
                        <option value="usuario">USUÁRIO</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status:</span>
                      <select 
                        value={accessLogFilterStatus}
                        onChange={(e: any) => setAccessLogFilterStatus(e.target.value)}
                        className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                      >
                        <option value="todos">Todos</option>
                        <option value="sucesso">Sucesso</option>
                        <option value="falha">Falhas</option>
                      </select>
                    </div>

                    <button 
                      onClick={fetchAccessLogs}
                      disabled={isLoadingAccessLogs}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
                      title="Atualizar registros de acesso"
                    >
                      <RefreshCw size={14} className={isLoadingAccessLogs ? 'animate-spin' : ''} />
                    </button>

                    <button 
                      onClick={() => {
                        const filtered = accessLogs.filter(l => {
                          const matchesSearch = !accessLogSearch || 
                            l.user_name.toLowerCase().includes(accessLogSearch.toLowerCase()) || 
                            l.user_email.toLowerCase().includes(accessLogSearch.toLowerCase());
                          const matchesRole = accessLogFilterRole === 'todos' || l.user_role === accessLogFilterRole;
                          const matchesStatus = accessLogFilterStatus === 'todos' || l.status === accessLogFilterStatus;
                          return matchesSearch && matchesRole && matchesStatus;
                        });
                        const headers = "ID;USUÁRIO;E-MAIL;PERFIL;DATA;HORÁRIO;DISPOSITIVO;STATUS\n";
                        const rows = filtered.map(l => {
                          const dt = new Date(l.login_at);
                          const dateStr = dt.toLocaleDateString('pt-BR');
                          const timeStr = dt.toLocaleTimeString('pt-BR');
                          return `"${l.id}";"${l.user_name}";"${l.user_email}";"${String(l.user_role).toUpperCase()}";"${dateStr}";"${timeStr}";"${l.device_info}";"${l.status.toUpperCase()}"`;
                        }).join("\n");
                        const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `oee_controle_acessos_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                      title="Exportar registros filtrados em CSV"
                    >
                      <Download size={13} />
                      Exportar CSV
                    </button>

                    <button 
                      onClick={() => {
                        if (confirm('Deseja realmente limpar o histórico local de registros de acesso?')) {
                          localStorage.removeItem('oee_access_logs');
                          setAccessLogs([]);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                      title="Limpar histórico de acessos"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Tabela de Auditoria de Acessos */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Colaborador / E-mail</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perfil</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data do Login</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Horário do Login</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispositivo</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(() => {
                        const filtered = accessLogs.filter(l => {
                          const matchesSearch = !accessLogSearch || 
                            l.user_name.toLowerCase().includes(accessLogSearch.toLowerCase()) || 
                            l.user_email.toLowerCase().includes(accessLogSearch.toLowerCase());
                          const matchesRole = accessLogFilterRole === 'todos' || l.user_role === accessLogFilterRole;
                          const matchesStatus = accessLogFilterStatus === 'todos' || l.status === accessLogFilterStatus;
                          return matchesSearch && matchesRole && matchesStatus;
                        });

                        if (isLoadingAccessLogs) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                                Carregando histórico de acessos...
                              </td>
                            </tr>
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                                Nenhum registro de login encontrado com os filtros selecionados.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((log) => {
                          const loginDate = new Date(log.login_at);
                          const dateFormatted = !isNaN(loginDate.getTime()) ? loginDate.toLocaleDateString('pt-BR') : '-';
                          const timeFormatted = !isNaN(loginDate.getTime()) ? loginDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
                          
                          // Tempo decorrido relativo
                          const now = Date.now();
                          const diffMs = now - loginDate.getTime();
                          const diffMins = Math.floor(diffMs / (1000 * 60));
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          const relativeTime = diffMins < 1 
                            ? 'agora mesmo' 
                            : diffMins < 60 
                            ? `há ${diffMins} min` 
                            : diffHours < 24 
                            ? `há ${diffHours}h` 
                            : `há ${diffDays} dia(s)`;

                          const isMobile = log.device_info.toLowerCase().includes('mobile') || log.device_info.toLowerCase().includes('smartphone');

                          return (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    log.status === 'falha' 
                                      ? 'bg-red-500/20 text-red-400' 
                                      : log.user_role === 'admin' 
                                      ? 'bg-emerald-500/20 text-emerald-400' 
                                      : log.user_role === 'usuario' 
                                      ? 'bg-purple-500/20 text-purple-400' 
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {log.user_name ? log.user_name[0].toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white leading-tight">{log.user_name}</p>
                                    <p className="text-xs text-slate-400 font-mono">{log.user_email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {log.user_role === 'admin' ? (
                                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    ADMIN
                                  </span>
                                ) : log.user_role === 'diretoria' ? (
                                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    DIRETORIA EXEC.
                                  </span>
                                ) : log.user_role === 'usuario' ? (
                                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    USUÁRIO
                                  </span>
                                ) : log.user_role === 'operador' ? (
                                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    OPERADOR
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-slate-500">
                                    {log.user_role}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                                  <Calendar size={13} className="text-slate-400" />
                                  <span>{dateFormatted}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                    <Clock size={13} className="text-blue-400" />
                                    <span>{timeFormatted}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{relativeTime}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                  {isMobile ? <Smartphone size={14} className="text-amber-400 shrink-0" /> : <Laptop size={14} className="text-indigo-400 shrink-0" />}
                                  <span className="truncate max-w-[140px]" title={log.device_info}>{log.device_info}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-right">
                                {log.status === 'sucesso' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 size={11} />
                                    Sucesso
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                                    <AlertTriangle size={11} />
                                    Falha
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : adminTab === 'stops' ? (
                  <motion.div 
                    key="stops-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                  >
                    <div className="lg:col-span-1">
                      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6">
                          {editingStop ? 'Editar Código' : 'Novo Código de Parada'}
                        </h3>
                        <div className="space-y-5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Código (Número)</label>
                            <input 
                              type="number" 
                              value={editingStop ? editingStop.code : (newStop.code || '')}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (editingStop) setEditingStop({...editingStop, code: val});
                                else setNewStop({...newStop, code: val});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              placeholder="Ex: 501"
                              disabled={!!editingStop}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                            <input 
                              type="text" 
                              value={editingStop ? editingStop.description : (newStop.description || '')}
                              onChange={(e) => {
                                if (editingStop) setEditingStop({...editingStop, description: e.target.value});
                                else setNewStop({...newStop, description: e.target.value});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              placeholder="Descrição da parada"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                            <select 
                              value={editingStop ? editingStop.category : (newStop.category || 'NP')}
                              onChange={(e) => {
                                const val = e.target.value as 'P' | 'NP';
                                if (editingStop) setEditingStop({...editingStop, category: val});
                                else setNewStop({...newStop, category: val});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none bg-zinc-800"
                            >
                              <option value="NP">Não Programada (NP)</option>
                              <option value="P">Programada (P)</option>
                            </select>
                          </div>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                if (editingStop) saveStopCode(editingStop);
                                else if (newStop.code && newStop.description) saveStopCode(newStop as StopCode);
                              }}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all"
                            >
                              {editingStop ? 'SALVAR' : 'CADASTRAR'}
                            </button>
                            {editingStop && (
                              <button 
                                onClick={() => setEditingStop(null)}
                                className="px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
                              >
                                X
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
                        <div className="px-8 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Tabela de Paradas Revisada</h3>
                          <button 
                            onClick={fetchStopCodes}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                          >
                            <RefreshCw size={16} className={isLoadingStops ? 'animate-spin' : ''} />
                          </button>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                          <table className="w-full text-left">
                            <thead className="sticky top-0 bg-zinc-900 z-10">
                              <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">Código</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Categoria</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {isLoadingStops ? (
                                <tr>
                                  <td colSpan={4} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                                    Sincronizando banco de dados...
                                  </td>
                                </tr>
                              ) : stopCodes.map((stop) => (
                                <tr key={stop.code} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-4 py-3 text-sm font-mono font-bold text-blue-400">{stop.code}</td>
                                  <td className="px-4 py-3 text-sm text-slate-300">{stop.description}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${stop.category === 'P' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {stop.category === 'P' ? 'Programada' : 'Não Prog.'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => setEditingStop(stop)}
                                        className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                                      >
                                        <Settings size={16} />
                                      </button>
                                      <button 
                                        onClick={() => deleteStopCode(stop.code)}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : adminTab === 'lines' ? (
                  <motion.div
                    key="lines-tab"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    {/* Banner com Informações do Layout */}
                    <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-blue-900/40 border border-indigo-500/30 rounded-3xl p-8 shadow-xl">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                            <RefreshCw size={12} />
                            Layout da Fábrica Atualizado
                          </div>
                          <h3 className="text-2xl font-bold text-white tracking-tight">Renumeração das Linhas de Produção</h3>
                          <p className="text-slate-300 text-sm leading-relaxed">
                            Devido à alteração do layout fabril, as linhas de produção foram renumeradas. O mapeamento abaixo garante que <strong>todos os registros históricos (ex: dados da Linha 07) permaneçam intactos e migrem automaticamente para a nova Linha 02</strong>, preservando indicadores de OEE, paradas e turnos.
                          </p>
                        </div>
                        
                        <button
                          onClick={executeLineMigration}
                          disabled={isMigratingLines}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-3 shrink-0 active:scale-95 cursor-pointer"
                        >
                          <RefreshCw size={18} className={isMigratingLines ? 'animate-spin' : ''} />
                          {isMigratingLines ? 'Migrando Registros...' : 'Executar Migração DE ➔ PARA'}
                        </button>
                      </div>

                      {migrationReport && (
                        <div className={`mt-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
                          migrationStatusType === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                            : migrationStatusType === 'error'
                            ? 'bg-red-500/10 text-red-300 border-red-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}>
                          <CheckCircle2 size={16} className="shrink-0" />
                          <span>{migrationReport}</span>
                        </div>
                      )}
                    </div>

                    {/* Tabela Visual DE -> PARA */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-base font-bold text-white uppercase tracking-wider">Tabela de Mapeamento (DE ➔ PARA)</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Configuração ativa das 9 linhas da planta.</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                          9 Linhas Mapeadas
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {LINE_RENUMBERING_TABLE.map((item) => (
                          <div 
                            key={item.de}
                            className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                              item.de === 'Linha 07' 
                                ? 'bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/40' 
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-mono font-bold text-slate-300 border border-white/5 text-sm">
                                {item.deNum}
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Numeração Antiga</span>
                                <span className="text-sm font-bold text-slate-300">{item.de}</span>
                              </div>
                            </div>

                            <div className="text-indigo-400 px-2 font-black text-base">➔</div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Nova Numeração</span>
                                <span className="text-sm font-bold text-white">{item.para}</span>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-mono font-bold text-white shadow-lg shadow-indigo-600/30 text-sm">
                                {item.paraNum}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 text-xs text-slate-400">
                        <Activity size={16} className="text-indigo-400 shrink-0" />
                        <span>
                          <strong>Nota:</strong> Todos os novos lançamentos feitos na aba Parâmetros já utilizam a nova numeração. Os registros históricos anteriores foram sincronizados para manter a continuidade das análises.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="export-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                        <div className="flex items-start gap-4">
                          <div className="p-3.5 bg-emerald-500/15 text-emerald-400 rounded-2xl border border-emerald-500/25">
                            <FileSpreadsheet size={28} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                              Exportação do Banco de Dados para Excel
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Exclusivo Admin
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                              Gere uma planilha Excel (.xls / XML Spreadsheet 2003) contendo <strong>todas as 44 colunas</strong> de dados brutos e calculados: contadores, velocidades, tempos (A, L, M, N, O, P, Q, R, S, T, V, X), perdas de qualidade (U), paradas com causas e categorias (P e NP), e os índices OEE, Disponibilidade, Performance e Qualidade.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => exportToExcelHandler('filtered')}
                            disabled={isExportingExcel || history.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-bold transition-all border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            title="Exporta somente os registros visíveis com os filtros atuais aplicados"
                          >
                            <Download size={16} className="text-blue-400" />
                            <span>Exportar Filtro Atual ({history.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => exportToExcelHandler('all')}
                            disabled={isExportingExcel}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Exporta todos os apontamentos de todas as linhas e meses da base de dados"
                          >
                            {isExportingExcel ? (
                              <RefreshCw size={16} className="animate-spin text-white" />
                            ) : (
                              <FileSpreadsheet size={16} className="text-white" />
                            )}
                            <span>{isExportingExcel ? 'Gerando Planilha...' : 'Baixar Banco Completo (.xls)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Notificação de Feedback */}
                      {exportFeedback && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-6 p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
                            exportFeedback.type === 'success' 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : exportFeedback.type === 'error'
                              ? 'bg-red-500/10 border-red-500/30 text-red-300'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}
                        >
                          {exportFeedback.type === 'success' ? (
                            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                          ) : (
                            <AlertTriangle size={18} className="shrink-0 text-red-400" />
                          )}
                          <span className="flex-1">{exportFeedback.message}</span>
                          <button 
                            onClick={() => setExportFeedback(null)}
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      )}

                      {/* Cards com Instruções para IA e Metodologia */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                              <Sparkles size={16} />
                              Pronto para IA
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              Colunas padronizadas em maiúsculas (ex: <code>PERDA_QUALIDADE_GARRAFAS_U</code>, <code>DETALHAMENTO_PARADAS_RESUMO</code>) para você carregar diretamente no ChatGPT, Claude ou Gemini a cada fechamento de mês.
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-4 block">Formato: XML Spreadsheet 2003 (.xls)</span>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                              <Table size={16} />
                              44 Indicadores & Variáveis
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              Cada linha possui os contadores iniciais/finais, tempos detalhados de parada programada e não-programada, índices OEE, perdas de velocidade e notas de operação.
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-4 block">Compatível: Excel, Google Sheets, Calc</span>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                              <Database size={16} />
                              Segurança & Restrição
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              Apenas contas com perfil <strong>ADMIN</strong> possuem permissão para exportar os dados brutos e confidenciais do sistema.
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-4 block">Permissão: Perfil ADMIN</span>
                        </div>
                      </div>

                      {/* Prompt Sugerido para o Usuário usar com a IA */}
                      <div className="mt-6 p-5 bg-zinc-950/60 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-400" />
                            Prompt recomendado para análise crítica mensal com IA:
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono bg-black/40 p-3 rounded-xl border border-white/5 leading-relaxed select-all">
                          &quot;Atue como um Engenheiro Especialista em Confiabilidade e Manutenção Lean OEE. Analise esta planilha mensal da nossa fábrica de bebidas. Identifique: 1) As 3 linhas com maior perda por paradas não programadas (Q); 2) As maiores causas-raiz no detalhamento de paradas; 3) O impacto da perda de qualidade (U) no OEE Score; 4) Um plano de ação no ciclo PDCA para o próximo mês.&quot;
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              {/* Dashboard Filters & Controls */}
              <div className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Activity size={20} className="text-blue-400" />
                      Filtros do Dashboard
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Alterne entre visão <strong>Diária</strong> (apontamento detalhado) e <strong>Mensal</strong> (consolidado com evolução no mês).
                    </p>
                  </div>

                  {/* Botão ONE PAGE REPORT (Apenas Admin) & Seletor de Modo */}
                  <div className="flex flex-wrap items-center gap-3">
                    {isUserAdmin(currentUser) && (
                      <button
                        type="button"
                        onClick={() => setShowOnePageReport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all cursor-pointer"
                        title="Gerar Relatório Gerencial ONE PAGE REPORT em 1 página no formato Paisagem"
                      >
                        <FileText size={16} />
                        <span>One Page Report (OPR)</span>
                        <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded-md font-mono uppercase">PDF</span>
                      </button>
                    )}

                    {/* Switcher DIA / MÊS */}
                    <div className="flex bg-zinc-800/80 p-1 rounded-2xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setDashboardViewMode('dia')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${dashboardViewMode === 'dia' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'}`}
                      >
                        Visão Diária
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardViewMode('mes')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${dashboardViewMode === 'mes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'}`}
                      >
                        <Calendar size={13} />
                        Visão Mês
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 mt-6">
                  {/* Filtro Linha */}
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Linha de Produção</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                        <Activity size={18} />
                      </div>
                      <select 
                        value={dashboardLine}
                        onChange={(e) => setDashboardLine(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-white/10 text-white pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all appearance-none cursor-pointer hover:bg-zinc-800"
                      >
                        {dashboardViewMode === 'mes' && <option value="Todas">Todas as Linhas (Geral)</option>}
                        {PRODUCTION_LINES.map(line => (
                          <option key={line} value={line}>{line}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filtro MÊS */}
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Mês de Referência</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                        <Calendar size={18} />
                      </div>
                      <input 
                        type="month"
                        value={dashboardMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDashboardMonth(val);
                          // Atualiza também a data de referência para coincidir com o mesmo mês
                          if (val) {
                            const [y, m] = val.split('-');
                            setDashboardDate(`${y}-${m}-01`);
                          }
                        }}
                        className="w-full bg-zinc-800/50 border border-white/10 text-white pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all cursor-pointer hover:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Filtro DIA (ativo no modo diário) */}
                  {dashboardViewMode === 'dia' && (
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Dia Específico</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                          <Calendar size={18} />
                        </div>
                        <input 
                          type="date"
                          value={dashboardDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDashboardDate(val);
                            if (val) setDashboardMonth(val.slice(0, 7));
                          }}
                          className="w-full bg-zinc-800/50 border border-white/10 text-white pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all cursor-pointer hover:bg-zinc-800"
                        />
                      </div>
                    </div>
                  )}

                  <div className="md:pt-6">
                    <button 
                      onClick={() => {
                        fetchDashboardRecord();
                        fetchAllSystemRecords();
                      }}
                      disabled={isFetchingDashboard || isLoadingAllRecords}
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isFetchingDashboard || isLoadingAllRecords ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                      {isFetchingDashboard || isLoadingAllRecords ? 'Buscando...' : 'Atualizar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* RENDERIZAÇÃO: MODO MÊS OU MODO DIÁRIO */}
              {dashboardViewMode === 'mes' ? (
                dashboardMonthlyData ? (
                  <>
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-500/20">
                            {dashboardLine}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">
                            Visão Mensal Consolidada
                          </span>
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded uppercase tracking-wider border border-purple-500/20">
                            {dashboardMonthlyData.count} apontamento(s)
                          </span>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">Desempenho OEE no Mês</h2>
                        <p className="text-slate-400 mt-1">
                          Consolidação de {new Date(parseInt(dashboardMonth.split('-')[0]), parseInt(dashboardMonth.split('-')[1]) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </p>
                      </div>
                      {isUserAdmin(currentUser) && (
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setShowOnePageReport(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                          >
                            <FileText size={14} />
                            Gerar One Page Report
                          </button>
                        </div>
                      )}
                    </header>

                    {/* KPI Cards Mensais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <KPICard 
                        title="Disponibilidade Média" 
                        value={dashboardMonthlyData.avgDisp} 
                        icon={<Clock className="text-blue-400" />} 
                        color="blue"
                        description="Média consolidada de Disponibilidade no mês"
                      />
                      <KPICard 
                        title="Performance Média" 
                        value={dashboardMonthlyData.avgPerf} 
                        icon={<TrendingUp className="text-orange-400" />} 
                        color="orange"
                        description="Média consolidada de Performance no mês"
                      />
                      <KPICard 
                        title="Qualidade Média" 
                        value={dashboardMonthlyData.avgQual} 
                        icon={<CheckCircle2 className="text-emerald-400" />} 
                        color="emerald"
                        description="Média consolidada de Qualidade no mês"
                      />
                      <KPICard 
                        title="OEE Global Médio" 
                        value={dashboardMonthlyData.avgOee} 
                        icon={<Gauge className="text-indigo-400" />} 
                        color="indigo"
                        isMain
                        isOEE
                        description="Eficiência Global Consolidada no Mês"
                      />
                    </div>

                    {/* Gráfico: Decomposição de Tempos (h) Consolidada no Mês */}
                    <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                            <Activity size={20} className="text-blue-400" />
                            Decomposição de Tempos (h)
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Informações consolidadas no mês de <strong>{dashboardMonth}</strong> para a seleção: <strong>{dashboardLine}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 min-h-[400px]">
                        {dashboardMonthlyData.monthlyDecompChart.length > 0 ? (
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              layout="vertical"
                              data={dashboardMonthlyData.monthlyDecompChart}
                              margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                              barSize={50}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={160} 
                                tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => [`${value.toFixed(1)} h`, 'Valor']}
                              />
                              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                {dashboardMonthlyData.monthlyDecompChart.map((entry, index) => (
                                  <Cell key={`month-decomp-${index}`} fill={entry.color} />
                                ))}
                                <LabelList 
                                  dataKey="value" 
                                  position="right" 
                                  formatter={(v: number) => v.toFixed(1)} 
                                  style={{ fill: '#cbd5e1', fontSize: 14, fontWeight: 700 }} 
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 py-16">
                            <Activity size={48} className="opacity-20" />
                            <p className="text-sm font-medium">Gráfico de decomposição indisponível para este mês.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Secundários Mensais */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm">
                        <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Volume & Produção do Mês</h3>
                        <div className="space-y-4">
                          <StatRow label="Produção Real Total" value={formatNumber(dashboardMonthlyData.totalRealH)} unit="fardos" highlight />
                          <StatRow label="Perda por Qualidade (U)" value={formatNumber(dashboardMonthlyData.totalGarrafasU)} unit="garrafas" color="text-red-400" />
                          <StatRow label="Produtividade Média" value={dashboardMonthlyData.productivity.toFixed(1)} unit="fardos/h" />
                        </div>
                      </div>

                      <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm">
                        <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Perdas Acumuladas no Mês</h3>
                        <div className="space-y-4">
                          <StatRow label="Redução de Velocidade (S)" value={dashboardMonthlyData.totalPerdaS.toFixed(1)} unit="h" color="text-orange-400" />
                          <StatRow label="Perda por Qualidade (V)" value={dashboardMonthlyData.totalPerdaV.toFixed(1)} unit="h" color="text-red-400" />
                          <StatRow label="Paradas Não Programadas (Q)" value={dashboardMonthlyData.totalPerdaQ.toFixed(1)} unit="h" color="text-red-400" />
                        </div>
                      </div>

                      <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
                              <Cpu size={22} />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Índice de Quebra Médio</h3>
                              <p className="text-[10px] text-slate-400">Total Paradas Manutenção / Tempo Programado</p>
                            </div>
                          </div>
                          <p className="text-5xl font-black text-white">
                            {dashboardMonthlyData.maintenanceIndex.toFixed(1)}%
                          </p>
                          <div className={`mt-3 inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-xl border ${dashboardMonthlyData.maintenanceIndex < 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {dashboardMonthlyData.maintenanceIndex < 5 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                            <span>Meta: &lt; 5.0% ({dashboardMonthlyData.maintenanceIndex < 5 ? 'Sob Controle' : 'Acima da Meta'})</span>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                          <span>TEEP Médio do Mês:</span>
                          <span className="font-bold text-indigo-400 text-sm">{dashboardMonthlyData.avgTeep.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <Search size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum registro encontrado no mês</h3>
                    <p className="text-slate-400 max-w-md text-center text-xs">
                      Não encontramos lançamentos para a <strong>{dashboardLine}</strong> no mês <strong>{dashboardMonth}</strong>.
                    </p>
                  </div>
                )
              ) : dashboardRecord ? (
                <>
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">
                          {dashboardRecord.machine_name}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">
                          {dashboardRecord.sku}
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold tracking-tight text-white">Monitoramento de Eficiência</h2>
                      <p className="text-slate-400 mt-1">Dados salvos em {new Date(dashboardRecord.created_at).toLocaleDateString('pt-BR')} às {new Date(dashboardRecord.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {isUserAdmin(currentUser) && (
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleDownloadReport(dashboardData?.inputs, dashboardData?.results)}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/10 cursor-pointer"
                        >
                          <Download size={14} />
                          Download Relatório
                        </button>
                        <button 
                          onClick={generateAIAnalysis}
                          disabled={isAnalyzing}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                        >
                          {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          {isAnalyzing ? 'Analisando...' : 'Gerar Insight IA'}
                        </button>
                      </div>
                    )}
                  </header>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                      title="Disponibilidade" 
                      value={dashboardRecord.availability} 
                      icon={<Clock className="text-blue-400" />} 
                      color="blue"
                      description="Tempo Operação / Tempo Programado"
                    />
                    <KPICard 
                      title="Performance" 
                      value={dashboardRecord.performance} 
                      icon={<TrendingUp className="text-orange-400" />} 
                      color="orange"
                      description="Tempo Líquido / Tempo Operação"
                    />
                    <KPICard 
                      title="Qualidade" 
                      value={dashboardRecord.quality} 
                      icon={<CheckCircle2 className="text-emerald-400" />} 
                      color="emerald"
                      description="Tempo Útil / Tempo Líquido"
                    />
                    <KPICard 
                      title="OEE Global" 
                      value={dashboardRecord.oee_score} 
                      icon={<Gauge className="text-indigo-400" />} 
                      color="indigo"
                      isMain
                      isOEE
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
                        {dashboardChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              layout="vertical"
                              data={dashboardChartData}
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
                                {dashboardChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList dataKey="value" position="right" formatter={(v: number) => v.toFixed(1)} style={{ fill: '#cbd5e1', fontSize: 14, fontWeight: 700 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <Activity size={48} className="opacity-20" />
                            <p className="text-sm font-medium">Gráfico de decomposição indisponível para este registro.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  {dashboardData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm">
                        <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Produção & Velocidade</h3>
                        <div className="space-y-4">
                          <StatRow label="Produção Teórica" value={formatNumber(dashboardData.results.G)} unit="fardos" />
                          <StatRow label="Produção Real" value={formatNumber(dashboardData.inputs.H)} unit="fardos" highlight />
                          <StatRow label="Velocidade Projeto" value={formatNumber(dashboardData.results.F)} unit="gph" />
                        </div>
                      </div>

                      <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">Análise de Perdas</h3>
                          {(() => {
                            const colorInfo = getOEEColorInfo(dashboardRecord.oee_score);
                            return (
                              <div 
                                className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border flex items-center gap-1.5"
                                style={{
                                  backgroundColor: colorInfo.badgeBg,
                                  color: colorInfo.badgeText,
                                  borderColor: colorInfo.badgeBorder
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo.hex }} />
                                {colorInfo.rangeText}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="space-y-4">
                          <StatRow label="Redução Velocidade" value={formatNumber(dashboardData.results.S)} unit="h" color="text-orange-400" />
                          <StatRow label="Perda Qualidade" value={formatNumber(dashboardData.results.V)} unit="h" color="text-red-400" />
                          <StatRow label="Paradas Não Prog." value={formatNumber(dashboardData.results.Q)} unit="h" color="text-red-400" />
                        </div>
                      </div>

                      <div className="bg-zinc-900 rounded-3xl p-10 text-white shadow-2xl overflow-hidden relative border border-white/10 group flex flex-col min-h-[620px]">
                        <div className="relative z-10 flex flex-col h-full gap-2">
                          {/* Top Section: Índice de Quebra */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                                <Cpu size={22} className="text-red-400" />
                              </div>
                              <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest leading-tight">
                                Índice de Quebra<br />Médio (%)
                              </h3>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-6xl font-black tracking-tighter text-white">
                                {dashboardData.results.maintenanceIndex.toFixed(1)}%
                              </p>
                            </div>

                            <div className={`flex items-center gap-2 text-sm font-bold ${dashboardData.results.maintenanceIndex < 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {dashboardData.results.maintenanceIndex < 5 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                              <span>Status: {dashboardData.results.maintenanceIndex < 5 ? 'Sob Controle' : 'Atenção'}</span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5 w-full my-6" />
                          
                          {/* Middle Section: TEEP */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                <Gauge size={22} className="text-indigo-400" />
                              </div>
                              <div className="flex flex-col">
                                <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest">TEEP Médio</h3>
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Total Effective Equipment Performance</span>
                              </div>
                            </div>
                            <p className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">
                              {dashboardData.results.teep.toFixed(1)}%
                            </p>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5 w-full my-6" />

                          {/* Bottom Section: Produtividade */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                <TrendingUp size={22} className="text-emerald-400" />
                              </div>
                              <div className="flex flex-col">
                                <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest">Produtividade de Linha</h3>
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Produção Real / Tempo Programado</span>
                              </div>
                            </div>
                            <p className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-500">
                              {dashboardData.results.productivity.toFixed(1)} <span className="text-xs font-bold tracking-normal text-emerald-400/85">fardos/h</span>
                            </p>
                          </div>
                        </div>
                        <AlertTriangle className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:scale-110 transition-all duration-700 blur-sm" size={240} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhum registro encontrado</h3>
                  <p className="text-slate-400 max-w-md text-center">
                    Não encontramos dados salvos para a <strong>{dashboardLine}</strong> na data <strong>{dashboardDate.split('-').reverse().join('/')}</strong>.
                  </p>
                  {canUserEdit(currentUser) && (
                    <button 
                      onClick={() => setActiveTab('inputs')}
                      className="mt-8 text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      Ir para Preenchimento de Dados
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}

                {/* AI Analysis Section (Apenas Admin) */}
                <AnimatePresence>
                  {isUserAdmin(currentUser) && (aiAnalysis || isAnalyzing) && (
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
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Filtrar Mês</span>
                    <input 
                      type="month"
                      value={monthFilter}
                      onChange={(e) => {
                        setMonthFilter(e.target.value);
                        setSelectedDates(['Todas']);
                      }}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1 relative" ref={dateMenuRef}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Filtrar Data</span>
                    <button
                      type="button"
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer flex items-center justify-between gap-2 min-w-[150px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar size={14} className="text-blue-400 shrink-0" />
                        <span className="truncate">{getDateFilterLabel()}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDateMenuOpen && (
                      <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-72 bg-zinc-900 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Calendar size={14} className="text-blue-400" />
                            Selecionar Período / Datas
                          </span>
                          {!isAllDatesSelected && (
                            <button
                              type="button"
                              onClick={() => setSelectedDates(['Todas'])}
                              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                            >
                              Resetar
                            </button>
                          )}
                        </div>

                        {/* Opção TODAS */}
                        <button
                          type="button"
                          onClick={() => toggleDateSelection('Todas')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all mb-2.5 cursor-pointer ${
                            isAllDatesSelected
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                              : 'bg-zinc-800 text-slate-300 border border-white/5 hover:bg-zinc-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black ${
                              isAllDatesSelected ? 'bg-blue-500 text-white' : 'border border-white/30'
                            }`}>
                              {isAllDatesSelected ? '✓' : ''}
                            </span>
                            TODAS (Mês Inteiro)
                          </span>
                        </button>

                        {/* Grid de Dias do Mês */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dias do Mês</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {isAllDatesSelected ? 'Todas as datas' : `${selectedDates.length} sel.`}
                            </span>
                          </div>

                          <div className="grid grid-cols-7 gap-1 max-h-44 overflow-y-auto p-1 bg-zinc-950/60 rounded-xl border border-white/5">
                            {(() => {
                              const year = parseInt(monthFilter.split('-')[0]);
                              const month = parseInt(monthFilter.split('-')[1]);
                              const daysInMonth = isNaN(year) || isNaN(month) ? 31 : new Date(year, month, 0).getDate();
                              const daysList = [];
                              for (let d = 1; d <= daysInMonth; d++) {
                                daysList.push(d);
                              }

                              return daysList.map(day => {
                                const dayStr = day.toString();
                                const isSelected = !isAllDatesSelected && selectedDates.includes(dayStr);

                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDateSelection(dayStr)}
                                    className={`h-7 rounded-md text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                                        : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 hover:text-white'
                                    }`}
                                    title={`Dia ${day.toString().padStart(2, '0')}`}
                                  >
                                    {day.toString().padStart(2, '0')}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedDates(['Todas'])}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Limpar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDateMenuOpen(false)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1 rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            Concluído
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Filtrar Linha</span>
                    <select 
                      value={lineFilter}
                      onChange={(e) => setLineFilter(e.target.value)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer min-w-[140px]"
                    >
                      <option value="Todas">Todas as Linhas</option>
                      {PRODUCTION_LINES.map(line => (
                        <option key={line} value={line}>{line}</option>
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

              {/* Gráfico de Evolução e Índice de Quebra Consolidado */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                        <BarChart3 size={20} className="text-indigo-400" />
                        Tendência de OEE Global (%)
                      </h3>
                      {/* Faixas OEE Legend */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {OEE_COLOR_THRESHOLDS.map(item => (
                          <div 
                            key={item.rangeText}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-tight"
                            style={{
                              backgroundColor: `${item.hex}18`,
                              borderColor: `${item.hex}35`,
                              color: item.hex
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.hex }} />
                            <span>{item.rangeText}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-[380px] w-full">
                      {history.length > 0 ? (
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
                              content={<CustomOEEEvolutionTooltip />}
                            />
                            <Bar dataKey="oee_score" radius={[4, 4, 0, 0]}>
                              {[...history].reverse().map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={getOEEColorHex(entry.oee_score)} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic border border-dashed border-white/5 rounded-2xl">
                          Nenhum registro para o período selecionado
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 bg-zinc-900 rounded-3xl p-10 text-white shadow-2xl overflow-hidden relative border border-white/10 group flex flex-col min-h-[620px]">
                  <div className="relative z-10 flex flex-col h-full gap-2">
                    {/* Top Section: Índice de Quebra */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                          <Cpu size={22} className="text-red-400" />
                        </div>
                        <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest leading-tight">
                          Índice de Quebra<br />Médio (%)
                        </h3>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-6xl font-black tracking-tighter text-white">
                          {consolidatedMetrics.maintenanceIndex.toFixed(1)}%
                        </p>
                      </div>

                      <div className={`flex items-center gap-2 text-sm font-bold ${consolidatedMetrics.maintenanceIndex < 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {consolidatedMetrics.maintenanceIndex < 5 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>Status: {consolidatedMetrics.maintenanceIndex < 5 ? 'Sob Controle' : 'Atenção'}</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 w-full my-6" />
                    
                    {/* Middle Section: TEEP */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                          <Gauge size={22} className="text-indigo-400" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest">TEEP Médio</h3>
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Total Effective Equipment Performance</span>
                        </div>
                      </div>
                      <p className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">
                        {consolidatedMetrics.teep.toFixed(1)}%
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 w-full my-6" />

                    {/* Bottom Section: Produtividade */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                          <TrendingUp size={22} className="text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-widest">Produtividade de Linhas</h3>
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Produção Real / Tempo Programado</span>
                        </div>
                      </div>
                      <p className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-500">
                        {consolidatedMetrics.productivity.toFixed(1)} <span className="text-xs font-bold tracking-normal text-emerald-400/85">fardos/h</span>
                      </p>
                    </div>
                  </div>
                  <AlertTriangle className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:scale-110 transition-all duration-700 blur-sm" size={240} />
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
                    {consolidatedMetrics.paretoNP.length > 0 ? (
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
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [value + ' min', 'Duração']}
                          />
                          <Bar 
                            dataKey="duration" 
                            fill="#ef4444" 
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => handleStopClick(data)}
                            className="cursor-pointer hover:opacity-85 transition-opacity"
                          >
                            <LabelList dataKey="duration" position="top" style={{ fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic border border-dashed border-white/5 rounded-2xl">
                        Sem paradas não programadas no período
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-blue-400 mb-8">
                    <Clock size={20} />
                    Pareto Programadas (Minutos Acumulados)
                  </h3>
                  <div className="h-[400px] w-full">
                    {consolidatedMetrics.paretoP.length > 0 ? (
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
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [value + ' min', 'Duração']}
                          />
                          <Bar 
                            dataKey="duration" 
                            fill="#3b82f6" 
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => handleStopClick(data)}
                            className="cursor-pointer hover:opacity-85 transition-opacity"
                          >
                            <LabelList dataKey="duration" position="top" style={{ fill: '#3b82f6', fontSize: 11, fontWeight: 'bold' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic border border-dashed border-white/5 rounded-2xl">
                        Sem paradas programadas no período
                      </div>
                    )}
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
                  isOEE
                  description="Média do período filtrado"
                />
              </div>

              {/* Histórico Recente Section */}
              <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
                <div className="px-8 py-5 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} className="text-blue-400" />
                      Registros Detalhados
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                      {history.length} registro(s)
                    </span>
                  </div>

                  {isUserAdmin(currentUser) && (
                    <button
                      type="button"
                      onClick={() => exportToExcelHandler('filtered')}
                      disabled={isExportingExcel || history.length === 0}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
                      title="Download da tabela no formato de planilha Excel (.xls) para análise crítica com IA"
                    >
                      {isExportingExcel ? (
                        <RefreshCw size={13} className="animate-spin text-emerald-400" />
                      ) : (
                        <FileSpreadsheet size={13} className="text-emerald-400" />
                      )}
                      <span>Exportar Planilha Excel (.xls)</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data/Hora</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Linha</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Início</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Término</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Perda U</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Disp.</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Perf.</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Qual.</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">OEE</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {historyError ? (
                        <tr>
                          <td colSpan={11} className="px-8 py-10 text-center">
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
                            <td className="px-3 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(record.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-3 text-[11px] font-bold text-white whitespace-nowrap">{record.machine_name}</td>
                            <td className="px-3 py-3 text-[11px] text-slate-400 max-w-[120px] truncate" title={record.sku}>{record.sku}</td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                              {(() => {
                                try {
                                  const d = JSON.parse(record.downtime_data);
                                  return d.shiftStartTime || '-';
                                } catch(e) { return '-'; }
                              })()}
                            </td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                              {(() => {
                                try {
                                  const d = JSON.parse(record.downtime_data);
                                  return d.shiftEndTime || '-';
                                } catch(e) { return '-'; }
                              })()}
                            </td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                              {(() => {
                                try {
                                  const d = JSON.parse(record.downtime_data);
                                  return d.U?.toLocaleString() || '0';
                                } catch(e) { return '0'; }
                              })()}
                            </td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-300">{record.availability.toFixed(1)}%</td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-300">{record.performance.toFixed(1)}%</td>
                            <td className="px-3 py-3 text-center text-[11px] text-slate-300">{record.quality.toFixed(1)}%</td>
                            <td className="px-3 py-3 text-center">
                              {(() => {
                                const colorInfo = getOEEColorInfo(record.oee_score);
                                return (
                                  <span 
                                    className="text-[11px] font-extrabold px-2 py-0.5 rounded border inline-flex items-center gap-1.5 shadow-sm"
                                    style={{
                                      backgroundColor: colorInfo.badgeBg,
                                      color: colorInfo.badgeText,
                                      borderColor: colorInfo.badgeBorder
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo.hex }} />
                                    {record.oee_score.toFixed(1)}%
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canUserEdit(currentUser) && (
                                  <button 
                                    onClick={() => handleEditRecord(record)}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all cursor-pointer"
                                    title="Corrigir Apontamento"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => setSelectedRecord(record)}
                                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all cursor-pointer"
                                  title="Visualizar Detalhes"
                                >
                                  <Search size={14} />
                                </button>
                                {isUserAdmin(currentUser) && (
                                  <button 
                                    onClick={() => deleteRecord(record.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
                                    title="Excluir Registro"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="px-8 py-10 text-center text-slate-500 text-sm italic">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'inputs' && canUserEdit(currentUser) ? (
            <motion.div 
              key="inputs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <header className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white">
                    {isEditing ? 'Correção de Apontamento' : 'Parâmetros de Entrada'}
                  </h2>
                  <p className="text-slate-400 mt-1">
                    {isEditing ? 'Ajuste os dados do registro selecionado.' : 'Configure os dados base para o cálculo do OEE.'}
                  </p>
                </div>
                {isEditing && (
                  <button 
                    onClick={cancelEdit}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10"
                  >
                    Cancelar Edição
                  </button>
                )}
              </header>

              <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
                {isEditing && (
                  <div className="bg-amber-600/10 border-b border-amber-600/20 px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-600 rounded-lg">
                        <Pencil size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-amber-200 font-bold text-xs">Editando Registro Existente</p>
                        <p className="text-amber-500/70 text-[10px] uppercase font-black tracking-widest mt-0.5">
                          ID: {editingRecordId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
                        <span className="text-blue-400 opacity-70"><Activity size={16} /></span>
                        Linha de Produção
                      </label>
                      <select 
                        value={inputs.line} 
                        onChange={(e) => handleInputChange('line', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-white text-sm appearance-none cursor-pointer"
                      >
                        {PRODUCTION_LINES.map(line => (
                          <option key={line} value={line}>{line}</option>
                        ))}
                      </select>
                    </div>
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
                    <div className="grid grid-cols-2 gap-4 col-span-2">
                      <InputField 
                        label="Hora Início Turno" 
                        value={inputs.shiftStartTime} 
                        onChange={(v) => handleInputChange('shiftStartTime', v)} 
                        icon={<Clock size={16} />}
                        type="time"
                      />
                      <InputField 
                        label="Hora Término Turno" 
                        value={inputs.shiftEndTime} 
                        onChange={(v) => handleInputChange('shiftEndTime', v)} 
                        icon={<Clock size={16} />}
                        type="time"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 col-span-2">
                      <InputField 
                        label="Contador Inicial" 
                        value={inputs.initialCounter} 
                        onChange={(v) => handleInputChange('initialCounter', v)} 
                        icon={<Hash size={16} />}
                      />
                      <InputField 
                        label="Contador Final" 
                        value={inputs.finalCounter} 
                        onChange={(v) => handleInputChange('finalCounter', v)} 
                        icon={<Hash size={16} />}
                      />
                    </div>
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
                    <div className="col-span-2 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">U - Perda por Qualidade (Calculada)</span>
                        <AlertTriangle size={14} className="text-blue-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">
                          {(inputs.initialCounter === 0 || inputs.finalCounter === 0) 
                            ? 0 
                            : Math.max(0, (inputs.finalCounter - inputs.initialCounter) - (inputs.H * inputs.C)).toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase">Garrafas</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 italic">
                        {inputs.initialCounter === 0 || inputs.finalCounter === 0 
                          ? "Informe os contadores para calcular a perda." 
                          : "Cálculo: (Cont. Final - Cont. Inicial) - (Prod. Real * Fator Conv.)"}
                      </p>
                    </div>
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
                          const stopConfig = stopCodes.find(c => c.code === stop.code);
                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={stop.id} 
                              className="flex items-start gap-4 bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all flex-col md:flex-row md:items-center"
                            >
                              <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                                  {index + 1}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col gap-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Código e Descrição</label>
                                    <select 
                                      value={stop.code}
                                      onChange={(e) => {
                                        const newStops = [...inputs.stops];
                                        newStops[index].code = parseInt(e.target.value);
                                        if (newStops[index].code !== 500) {
                                          newStops[index].reasonCategory = undefined;
                                          newStops[index].customReason = undefined;
                                        }
                                        setInputs(prev => ({ ...prev, stops: newStops }));
                                      }}
                                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    >
                                      {stopCodes.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} - {c.description} ({c.category})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hora Início</label>
                                    <input 
                                      type="time"
                                      value={stop.startTime || ''}
                                      onChange={(e) => {
                                        const newStops = [...inputs.stops];
                                        newStops[index].startTime = e.target.value;
                                        newStops[index].duration = calculateDurationMinutes(e.target.value, newStops[index].endTime);
                                        setInputs(prev => ({ ...prev, stops: newStops }));
                                      }}
                                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hora Término</label>
                                    <div className="relative">
                                      <input 
                                        type="time"
                                        value={stop.endTime || ''}
                                        onChange={(e) => {
                                          const newStops = [...inputs.stops];
                                          newStops[index].endTime = e.target.value;
                                          newStops[index].duration = calculateDurationMinutes(newStops[index].startTime, e.target.value);
                                          setInputs(prev => ({ ...prev, stops: newStops }));
                                        }}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                                      />
                                      {stop.duration > 0 && (
                                        <div className="absolute -bottom-5 right-0 text-[9px] font-bold text-blue-400 uppercase">
                                          {stop.duration} min
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {stop.code === 500 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                    <div>
                                      <label className="text-[10px] font-bold text-amber-400 uppercase mb-1 block">Categoria do Motivo (Campo Suspenso)</label>
                                      <select 
                                        value={stop.reasonCategory || ''}
                                        onChange={(e) => {
                                          const newStops = [...inputs.stops];
                                          newStops[index].reasonCategory = e.target.value;
                                          setInputs(prev => ({ ...prev, stops: newStops }));
                                        }}
                                        className="w-full bg-zinc-900 border border-amber-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
                                      >
                                        <option value="">-- Selecione a Categoria do Motivo --</option>
                                        <option value="Falha Operacional">Falha Operacional</option>
                                        <option value="Ajuste Mecânico">Ajuste Mecânico</option>
                                        <option value="Problema de Infraestrutura">Problema de Infraestrutura</option>
                                        <option value="Aguardando Insumo/Material">Aguardando Insumo/Material</option>
                                        <option value="Aguardando Manutenção">Aguardando Manutenção</option>
                                        <option value="Limpeza/Organização">Limpeza/Organização</option>
                                        <option value="Outro Motivo Específico">Outro Motivo Específico</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-amber-400 uppercase mb-1 block">Justificativa Detalhada (Texto)</label>
                                      <input 
                                        type="text"
                                        value={stop.customReason || ''}
                                        onChange={(e) => {
                                          const newStops = [...inputs.stops];
                                          newStops[index].customReason = e.target.value;
                                          setInputs(prev => ({ ...prev, stops: newStops }));
                                        }}
                                        className="w-full bg-zinc-900 border border-amber-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
                                        placeholder="Digite aqui o motivo detalhado..."
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  const newStops = inputs.stops.filter((_, i) => i !== index);
                                  setInputs(prev => ({ ...prev, stops: newStops }));
                                }}
                                className="p-2.5 text-slate-600 hover:text-red-400 transition-colors bg-white/5 rounded-lg shrink-0 mt-2 md:mt-0"
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
                            startTime: '',
                            endTime: '',
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
                  className={`${
                    isEditing 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  } text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : (isEditing ? <Pencil size={20} /> : <Box size={20} />)}
                  {isSaving ? 'Salvando...' : (isEditing ? 'Atualizar Registro' : 'Salvar Registro no Banco')}
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Calcular e Ver Dashboard
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'maintenance' ? (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              {/* Header Manutenção Industrial */}
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg uppercase tracking-wider border border-amber-500/30 flex items-center gap-1.5">
                      <Wrench size={12} />
                      PCM & Manutenção Industrial
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/5 text-slate-400 text-[10px] font-bold rounded-lg border border-white/5">
                      Códigos 1-3, 31-35
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    Painel de Manutenção Industrial
                  </h2>
                  <p className="text-slate-400 mt-1">
                    Gestão e controle analítico de paradas por quebra mecânica, elétrica e intervenções de manutenção.
                  </p>
                </div>

                {/* Filtros da Manutenção */}
                <div className="flex flex-wrap items-center gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mês de Análise</span>
                    <input 
                      type="month"
                      value={maintenanceMonth}
                      onChange={(e) => setMaintenanceMonth(e.target.value)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Linha</span>
                    <select
                      value={maintenanceLine}
                      onChange={(e) => setMaintenanceLine(e.target.value)}
                      className="bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer min-w-[130px]"
                    >
                      <option value="Todas">Todas as Linhas</option>
                      {PRODUCTION_LINES.map(line => (
                        <option key={line} value={line}>{line}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={fetchAllSystemRecords}
                    disabled={isLoadingAllRecords}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 mt-5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isLoadingAllRecords ? 'animate-spin' : ''} />
                    <span>Atualizar</span>
                  </button>
                </div>
              </header>

              {/* Cards de KPIs de Manutenção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Cpu size={22} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-white">
                      {maintenanceData.overallMonthlyIndex.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Índice de Quebra Médio</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">
                      Meta &lt; 5.0% • {maintenanceData.overallMonthlyIndex < 5 ? 'Status Sob Controle' : 'Requer Atenção'}
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <Clock size={22} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-red-400">
                      {maintenanceData.totalMaintHours.toFixed(1)}h
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horas Paradas (Manutenção)</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">
                      Tempo total perdido por quebras mecânicas/elétricas
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Calendar size={22} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-blue-400">
                      {maintenanceData.totalProgHours.toFixed(1)}h
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo Programado (P)</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">
                      Base horária operacional do mês selecionado
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Layers size={22} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-emerald-400">
                      {maintenanceData.recordsCount}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turnos / Lançamentos</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">
                      Apontamentos contabilizados no período
                    </p>
                  </div>
                </div>
              </div>

              {/* GRÁFICO 1: RESULTADOS CONSOLIDADOS POR MÊS DO ÍNDICE DE QUEBRA */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="font-bold text-lg text-white">
                        1. Índice de Quebra Consolidado por Mês (%)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Visão macro da evolução mensal do indicador de quebra de equipamentos (Linha: <strong>{maintenanceLine}</strong>). Linha pontilhada vermelha representa a meta de 5.0%.
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 self-start sm:self-auto">
                    Meta Industrial: &lt; 5.0%
                  </span>
                </div>

                <div className="h-80 w-full">
                  {maintenanceData.monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceData.monthlyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 'auto']} stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 border border-white/10 p-3.5 rounded-2xl shadow-2xl">
                                  <p className="text-xs text-slate-400 font-bold mb-1 uppercase">{item.mes}</p>
                                  <p className="text-sm font-black text-amber-400">
                                    Índice de Quebra: {item.indiceQuebra.toFixed(1)}%
                                  </p>
                                  <p className="text-[11px] text-slate-300 mt-1">
                                    Horas Paradas: {item.horasParadas}h / Prog: {item.horasProgramadas}h
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="indiceQuebra" radius={[6, 6, 0, 0]}>
                          {maintenanceData.monthlyChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.indiceQuebra < 5 ? '#3CB043' : entry.indiceQuebra <= 10 ? '#eab308' : '#ef4444'} 
                            />
                          ))}
                          <LabelList 
                            dataKey="indiceQuebra" 
                            position="top" 
                            formatter={(v: number) => `${v.toFixed(1)}%`} 
                            style={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                      Nenhum histórico de manutenção disponível no banco de dados.
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICO 2: VARIAÇÃO DIÁRIA DO ÍNDICE DE QUEBRA NO MÊS ESCOLHIDO */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <h3 className="font-bold text-lg text-white">
                        2. Variação Diária do Índice de Quebra no Mês ({maintenanceMonth})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Dispersão diária do índice de quebras para identificar picos de falhas mecânicas e dias críticos.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3CB043]" />
                    <span>&lt; 5%</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] ml-2" />
                    <span>5 a 10%</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] ml-2" />
                    <span>&gt; 10%</span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  {maintenanceData.dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceData.dailyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis domain={[0, 'auto']} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 border border-white/10 p-3.5 rounded-2xl shadow-2xl">
                                  <p className="text-xs text-slate-400 font-bold mb-1">{item.dia}</p>
                                  <p className="text-sm font-black text-amber-400">
                                    Índice de Quebra: {item.indiceQuebra.toFixed(1)}%
                                  </p>
                                  <p className="text-[11px] text-slate-300 mt-1">
                                    Horas Paradas no Dia: {item.horasParadas}h
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="indiceQuebra" radius={[6, 6, 0, 0]}>
                          {maintenanceData.dailyChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-daily-${index}`} 
                              fill={entry.indiceQuebra < 5 ? '#3CB043' : entry.indiceQuebra <= 10 ? '#eab308' : '#ef4444'} 
                            />
                          ))}
                          <LabelList 
                            dataKey="indiceQuebra" 
                            position="top" 
                            formatter={(v: number) => `${v.toFixed(0)}%`} 
                            style={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                      Nenhum apontamento com paradas de manutenção registrado no mês {maintenanceMonth}.
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhamento das Causas de Parada por Manutenção no Mês */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Wrench size={18} className="text-amber-400" />
                      Ranking de Causas de Manutenção no Mês ({maintenanceMonth})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Equipamentos com maior tempo acumulado de intervenção de manutenção.
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">
                    {maintenanceData.topBreakdownCauses.length} causa(s) identificada(s)
                  </span>
                </div>

                {maintenanceData.topBreakdownCauses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {maintenanceData.topBreakdownCauses.map((cause, idx) => (
                      <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">#{idx + 1} Equipamento</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{cause.name}</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">{cause.count} ocorrência(s)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-amber-400">{(cause.duration / 60).toFixed(1)}h</span>
                          <span className="text-[10px] text-slate-500 block">({cause.duration} min)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-6">
                    Sem paradas de manutenção registradas para os filtros selecionados.
                  </p>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* MODAL ONE PAGE REPORT (OPR) NO FORMATO PAISAGEM (Apenas Admin) */}
        <AnimatePresence>
          {showOnePageReport && isUserAdmin(currentUser) && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-slate-100 w-full max-w-7xl max-h-[98vh] flex flex-col rounded-2xl border border-slate-300 shadow-2xl overflow-hidden"
              >
                {/* OPR Modal Toolbar */}
                <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        ONE PAGE REPORT (OPR) — RELATÓRIO EXECUTIVO MENSAL
                      </h2>
                      <p className="text-[11px] text-slate-500">Folha única • Formato Paisagem (Landscape A4) • Fundo 100% Branco</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Mês:</span>
                      <input 
                        type="month"
                        value={oprMonth}
                        onChange={(e) => {
                          setOprMonth(e.target.value);
                          setPdfExportError(null);
                        }}
                        className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={printOnePageReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 shadow-sm cursor-pointer"
                      title="Imprimir diretamente em folha A4 Paisagem (1 página exata)"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">Imprimir (1 Página)</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadOnePageReportPdf}
                      disabled={isExportingPdf || !oprData}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isExportingPdf ? (
                        <RefreshCw size={13} className="animate-spin text-white" />
                      ) : (
                        <Download size={13} className="text-white" />
                      )}
                      <span>{isExportingPdf ? 'Gerando PDF...' : 'Download PDF (Folha Única)'}</span>
                    </button>

                    <button 
                      onClick={() => setShowOnePageReport(false)}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {pdfExportError && (
                  <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      {pdfExportError}
                    </span>
                    <button 
                      onClick={() => setPdfExportError(null)}
                      className="text-amber-700 hover:text-amber-900 text-xs font-bold underline cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Print CSS Rules */}
                <style>{`
                  @media print {
                    @page {
                      size: A4 landscape;
                      margin: 4mm 6mm;
                    }
                    html, body {
                      width: 100% !important;
                      height: 100% !important;
                      max-height: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      background: #ffffff !important;
                      overflow: hidden !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body > * {
                      display: none !important;
                    }
                    /* Exibe apenas o modal ativo sem duplicação de páginas */
                    .fixed.inset-0.z-\\[120\\] {
                      display: block !important;
                      position: static !important;
                      inset: auto !important;
                      width: 100% !important;
                      height: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      background: #ffffff !important;
                      overflow: hidden !important;
                    }
                    #opr-printable-report {
                      position: static !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      height: auto !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: #ffffff !important;
                      color: #0f172a !important;
                      page-break-after: avoid !important;
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }
                  }
                `}</style>

                {/* OPR Printable Sheet (Strict A4 Landscape, 1 Single Page, 100% White Background) */}
                <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-200/70 flex justify-center items-start">
                  {oprData ? (
                    <div 
                      ref={oprPrintRef}
                      id="opr-printable-report"
                      className="w-full max-w-[1200px] bg-white border border-slate-300 rounded-xl p-5 sm:p-6 text-slate-900 space-y-3.5 shadow-xl"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      {/* 1. Cabeçalho Executivo do OPR */}
                      <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-sm">
                            OG
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">OEE GUIDEWAY INDUSTRIAL</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 uppercase">
                                Relatório Gerencial
                              </span>
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                              ONE PAGE REPORT — CONSOLIDAÇÃO MENSAL
                            </h1>
                            <p className="text-[11px] text-slate-600 font-medium">
                              Período: <strong className="text-slate-800">{oprData.monthFormatted} ({oprData.monthKey})</strong> • Total de Apontamentos: <strong className="text-slate-800">{oprData.totalRecords}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-mono block">Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
                          <span className="text-xs font-bold text-slate-800 block">Responsável: {currentUser.name}</span>
                          <span className="text-[9px] font-semibold text-emerald-700">Formato Paisagem A4 • Folha Única</span>
                        </div>
                      </div>

                      {/* 2. a) BOX com indicadores CONSOLIDADOS no mês */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                            A) Indicadores Globais Consolidados da Fábrica no Mês ({oprData.monthFormatted})
                          </h3>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">OEE Global</span>
                            <span 
                              className="text-xl font-black mt-0.5 leading-none" 
                              style={{ color: getOEEColorHex(oprData.globalOee) }}
                            >
                              {oprData.globalOee}%
                            </span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{getOEEColorInfo(oprData.globalOee).rangeText}</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Disponibilidade</span>
                            <span className="text-xl font-black text-blue-700 mt-0.5 leading-none">{oprData.globalDisp}%</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Oper. / Prog.</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Performance</span>
                            <span className="text-xl font-black text-amber-700 mt-0.5 leading-none">{oprData.globalPerf}%</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Líq. / Oper.</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Qualidade</span>
                            <span className="text-xl font-black text-emerald-700 mt-0.5 leading-none">{oprData.globalQual}%</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Útil / Líq.</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Índ. Quebras</span>
                            <span className="text-xl font-black text-red-700 mt-0.5 leading-none">{oprData.globalMaintenanceIndex}%</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Meta &lt; 5.0%</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Total Paradas</span>
                            <span className="text-xl font-black text-purple-700 mt-0.5 leading-none">{oprData.totalStopsHours}h</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Horas Perdidas</span>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Produtividade</span>
                            <span className="text-xl font-black text-teal-700 mt-0.5 leading-none">{oprData.globalProductivity}</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">Fardos/h Prog.</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. GRÁFICOS LADO A LADO: b) OEE Global do Mês e c) OEE Individual por Linha */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Gráfico B: OEE Global Diário (Todas as Linhas) */}
                        <div className="bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                                B) OEE Global Diário (Todas as Linhas)
                              </h4>
                            </div>
                            <span className="text-[8px] text-slate-500 font-mono">Variação no Mês</span>
                          </div>
                          <div className="h-36 w-full">
                            {oprData.monthlyDailyChart.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={oprData.monthlyDailyChart} margin={{ top: 8, right: 6, left: -22, bottom: 2 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 8, fill: '#475569' }} />
                                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 8, fill: '#475569' }} />
                                  <Bar dataKey="oee" radius={[3, 3, 0, 0]}>
                                    {oprData.monthlyDailyChart.map((entry, index) => (
                                      <Cell key={`opr-daily-${index}`} fill={getOEEColorHex(entry.oee)} />
                                    ))}
                                    <LabelList 
                                      dataKey="oee" 
                                      position="top" 
                                      formatter={(v: number) => `${v.toFixed(0)}%`} 
                                      style={{ fill: '#0f172a', fontSize: 8, fontWeight: 800 }} 
                                    />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                                Sem lançamentos diários suficientes.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gráfico C: OEE Consolidado por Linha */}
                        <div className="bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                                C) Comparativo de OEE Individual por Linha
                              </h4>
                            </div>
                            <span className="text-[8px] text-slate-500 font-mono">Linhas 01 a 09</span>
                          </div>
                          <div className="h-36 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={oprData.linesData} margin={{ top: 8, right: 6, left: -22, bottom: 2 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="lineName" stroke="#64748b" tick={{ fontSize: 8, fill: '#475569' }} />
                                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 8, fill: '#475569' }} />
                                <Bar dataKey="oee" radius={[3, 3, 0, 0]}>
                                  {oprData.linesData.map((entry, index) => (
                                    <Cell key={`opr-line-${index}`} fill={entry.hasRecords ? getOEEColorHex(entry.oee) : '#cbd5e1'} />
                                  ))}
                                  <LabelList 
                                    dataKey="oee" 
                                    position="top" 
                                    formatter={(v: number) => v > 0 ? `${v.toFixed(1)}%` : '—'} 
                                    style={{ fill: '#0f172a', fontSize: 8, fontWeight: 800 }} 
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* 4. TABELA CONSOLIDADA ALINHADA COM COLUNAS FIXAS */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                              D) Detalhamento e Indicadores Consolidados por Linha de Produção
                            </h3>
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">9 Linhas • Valores consolidados no mês</span>
                        </div>

                        {/* Tabela dos Indicadores Detalhados por Linha com colgroup e table-fixed */}
                        <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                          <table className="w-full table-fixed border-collapse text-left">
                            <colgroup>
                              <col style={{ width: '13%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '11%' }} />
                              <col style={{ width: '11%' }} />
                              <col style={{ width: '11%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '11%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '11%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300 text-[9px] uppercase font-bold text-slate-700 tracking-wider">
                                <th className="px-2.5 py-1.5 text-left font-black text-slate-800">Linha</th>
                                <th className="px-2 py-1.5 text-center text-slate-600">Apontam.</th>
                                <th className="px-2 py-1.5 text-center text-blue-700 font-extrabold">Disp.</th>
                                <th className="px-2 py-1.5 text-center text-amber-700 font-extrabold">Perf.</th>
                                <th className="px-2 py-1.5 text-center text-emerald-700 font-extrabold">Qual.</th>
                                <th className="px-2 py-1.5 text-center text-slate-900 font-black">OEE Global</th>
                                <th className="px-2 py-1.5 text-center text-red-700 font-extrabold">Índ. Quebras</th>
                                <th className="px-2 py-1.5 text-center text-purple-700 font-extrabold">Paradas (h)</th>
                                <th className="px-2 py-1.5 text-center text-teal-700 font-extrabold">Produtiv.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-[10px] tabular-nums">
                              {oprData.linesData.map(l => (
                                <tr key={l.lineName} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-2.5 py-1 text-left font-bold text-slate-900 font-sans">{l.lineName}</td>
                                  <td className="px-2 py-1 text-center text-slate-600 font-medium">
                                    {l.hasRecords ? (
                                      <span className="font-bold text-slate-700">{l.count}</span>
                                    ) : (
                                      <span className="text-slate-400">0</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-center text-slate-700 font-semibold">{l.hasRecords ? `${l.disp}%` : '—'}</td>
                                  <td className="px-2 py-1 text-center text-slate-700 font-semibold">{l.hasRecords ? `${l.perf}%` : '—'}</td>
                                  <td className="px-2 py-1 text-center text-slate-700 font-semibold">{l.hasRecords ? `${l.qual}%` : '—'}</td>
                                  <td className="px-2 py-1 text-center font-black">
                                    {l.hasRecords ? (
                                      <span 
                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black border"
                                        style={{ 
                                          backgroundColor: getOEEColorInfo(l.oee).badgeBg, 
                                          color: getOEEColorHex(l.oee),
                                          borderColor: getOEEColorInfo(l.oee).badgeBorder 
                                        }}
                                      >
                                        {l.oee}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">—</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-center font-bold text-red-700">{l.hasRecords ? `${l.maintenanceIndex}%` : '—'}</td>
                                  <td className="px-2 py-1 text-center font-bold text-purple-700">{l.hasRecords ? `${l.totalStopsHours}h` : '—'}</td>
                                  <td className="px-2 py-1 text-center font-bold text-teal-700">{l.hasRecords ? `${l.productivity}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100/95 border-t-2 border-slate-300 text-[10px] font-black text-slate-900 tabular-nums">
                                <td className="px-2.5 py-1.5 text-left font-black text-blue-900 uppercase">Média Fábrica</td>
                                <td className="px-2 py-1.5 text-center text-slate-700">{oprData.totalRecords}</td>
                                <td className="px-2 py-1.5 text-center text-blue-800">{oprData.globalDisp}%</td>
                                <td className="px-2 py-1.5 text-center text-amber-800">{oprData.globalPerf}%</td>
                                <td className="px-2 py-1.5 text-center text-emerald-800">{oprData.globalQual}%</td>
                                <td className="px-2 py-1.5 text-center font-black">
                                  <span 
                                    className="inline-block px-2 py-0.5 rounded text-[10px] font-black border"
                                    style={{ 
                                      backgroundColor: getOEEColorInfo(oprData.globalOee).badgeBg, 
                                      color: getOEEColorHex(oprData.globalOee),
                                      borderColor: getOEEColorInfo(oprData.globalOee).badgeBorder 
                                    }}
                                  >
                                    {oprData.globalOee}%
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-center text-red-800">{oprData.globalMaintenanceIndex}%</td>
                                <td className="px-2 py-1.5 text-center text-purple-800">{oprData.totalStopsHours}h</td>
                                <td className="px-2 py-1.5 text-center text-teal-800">{oprData.globalProductivity}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* 5. Rodapé e Nota de Confiabilidade */}
                      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[8px] text-slate-500 font-medium">
                        <span>OEE GUIDEWAY • Relatório Gerencial Automatizado One Page Report (OPR) • Formato Paisagem A4 (Folha Única)</span>
                        <span>Auditoria e Validação de Confiabilidade Industrial • 100% Fundo Branco</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-300">
                      Nenhum registro encontrado no mês selecionado ({oprMonth}) para geração do One Page Report.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedRecord && (
            <RecordDetailModal 
              record={selectedRecord} 
              stopCodes={stopCodes}
              onClose={() => setSelectedRecord(null)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedStopTrace && (
            <StopTraceModal 
              trace={selectedStopTrace} 
              stopCodes={stopCodes}
              onClose={() => setSelectedStopTrace(null)}
              onSelectRecord={(recId) => {
                const rec = history.find(r => r.id === recId);
                if (rec) {
                  setSelectedRecord(rec);
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Modal de Redefinição de Senha com Criptografia SHA-256 */}
        <AnimatePresence>
          {resettingUserEmail && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 relative flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                      <Key size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Redefinir Senha</h3>
                      <p className="text-xs text-slate-400 font-mono">{resettingUserEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setResettingUserEmail(null);
                      setNewPasswordForUser('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 my-2">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs">
                    <ShieldCheck size={16} className="shrink-0" />
                    <span>A nova senha será salva protegida com <strong>criptografia SHA-256 + salt de segurança</strong>.</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      placeholder="Digite a nova senha segura..."
                      value={newPasswordForUser}
                      onChange={(e) => setNewPasswordForUser(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleResetPassword(resettingUserEmail, newPasswordForUser);
                        }
                      }}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUserEmail(null);
                      setNewPasswordForUser('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(resettingUserEmail, newPasswordForUser)}
                    className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock size={14} />
                    Salvar com Criptografia
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Edição Completa de Usuário (Nome, Login, Senha e Perfil) */}
        <AnimatePresence>
          {editingUserOriginalEmail && (() => {
            const targetUser = users.find(u => u.email.toLowerCase() === editingUserOriginalEmail.toLowerCase());
            const isPrimaryAdminAccount = editingUserOriginalEmail.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
            const lastUserLog = accessLogs.find(
              l => l.user_email.toLowerCase() === editingUserOriginalEmail.toLowerCase() && l.status === 'sucesso'
            );

            return (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl p-6 relative flex flex-col"
                >
                  <div className="flex items-start justify-between mb-5 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400">
                        <Pencil size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Editar Usuário Cadastrado</h3>
                        <p className="text-xs text-slate-400 font-mono">{editingUserOriginalEmail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUserOriginalEmail(null)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Resumo das Informações Salvas */}
                  <div className="mb-5 bg-black/50 border border-white/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proteção de Senha</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck size={14} />
                        {targetUser?.password?.startsWith('sha256:') ? 'Criptografia SHA-256 Ativa' : 'Proteção Padrão'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Último Login Registrado</span>
                      <span className="text-slate-300 font-medium mt-0.5 block">
                        {lastUserLog
                          ? `${new Date(lastUserLog.login_at).toLocaleDateString('pt-BR')} às ${new Date(lastUserLog.login_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Nenhum login registrado'}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={editUserName}
                        onChange={(e) => setEditUserName(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Nome completo do colaborador"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Login / E-mail de Acesso
                      </label>
                      <input
                        type="email"
                        value={editUserEmail}
                        onChange={(e) => setEditUserEmail(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="email@empresa.com"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Nova Senha (opcional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(prev => !prev)}
                          className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          {showEditPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        </button>
                      </div>
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editUserPassword}
                        onChange={(e) => setEditUserPassword(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Deixe em branco para manter a senha atual"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ao digitar uma nova senha, ela será automaticamente criptografada com SHA-256 + salt.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Perfil de Acesso
                      </label>
                      {isPrimaryAdminAccount && (
                        <p className="text-[11px] text-amber-400 mb-2">
                          O perfil do Administrador Principal permanece como ADMIN por segurança.
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${editUserRole === 'admin' ? 'bg-emerald-500/15 border-emerald-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editUserRole"
                            value="admin"
                            checked={editUserRole === 'admin'}
                            onChange={() => setEditUserRole('admin')}
                            className="mt-0.5 text-emerald-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-400 block">ADMIN</span>
                            <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                              Acesso total, OPR, Excel, IA e Gestão
                            </span>
                          </div>
                        </label>

                        <label className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${isPrimaryAdminAccount ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'} ${editUserRole === 'operador' ? 'bg-blue-500/15 border-blue-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editUserRole"
                            value="operador"
                            disabled={isPrimaryAdminAccount}
                            checked={editUserRole === 'operador'}
                            onChange={() => setEditUserRole('operador')}
                            className="mt-0.5 text-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-blue-400 block">OPERADOR</span>
                            <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                              Apontamentos, Edição e Parâmetros
                            </span>
                          </div>
                        </label>

                        <label className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${isPrimaryAdminAccount ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'} ${editUserRole === 'usuario' ? 'bg-purple-500/15 border-purple-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editUserRole"
                            value="usuario"
                            disabled={isPrimaryAdminAccount}
                            checked={editUserRole === 'usuario'}
                            onChange={() => setEditUserRole('usuario')}
                            className="mt-0.5 text-purple-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-purple-400 block">USUÁRIO</span>
                            <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                              Somente Visualização Desktop
                            </span>
                          </div>
                        </label>

                        <label className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all ${isPrimaryAdminAccount ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'} ${editUserRole === 'diretoria' ? 'bg-amber-500/15 border-amber-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editUserRole"
                            value="diretoria"
                            disabled={isPrimaryAdminAccount}
                            checked={editUserRole === 'diretoria'}
                            onChange={() => setEditUserRole('diretoria')}
                            className="mt-0.5 text-amber-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-amber-400 block">DIRETORIA EXECUTIVA</span>
                            <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                              App Mobile · Consulta + Face ID
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {editUserError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0" />
                        <span>{editUserError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingUserOriginalEmail(null)}
                        className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEditedUser}
                        className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 size={15} />
                        {isSavingEditedUser ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>
      </main>
    </div>
    </ErrorBoundary>
  );
}

function RecordDetailModal({ record, stopCodes, onClose }: { record: any, stopCodes: StopCode[], onClose: () => void }) {
  const data = useMemo(() => {
    try {
      return JSON.parse(record.downtime_data);
    } catch (e) {
      return null;
    }
  }, [record]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md px-8 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="text-blue-400" />
              Detalhes do Registro
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ID: {record.id} • {new Date(record.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8">
          {/* Info Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Operador Original</p>
              <p className="text-sm font-bold text-white">{data.operator_name || 'Não registrado'}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Original do Salvamento</p>
              <p className="text-sm font-bold text-white">
                {data.saved_at ? new Date(data.saved_at).toLocaleString('pt-BR') : 'Não registrado'}
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Linha / Máquina</p>
              <p className="text-sm font-bold text-white">{record.machine_name}</p>
            </div>
          </div>

          {/* Audit History (Optional if edited) */}
          {data.last_edited_by && (
            <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <Pencil size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-amber-200 font-bold text-xs">Histórico: Correção Efetuada</p>
                  <p className="text-amber-500/70 text-[10px] uppercase font-black tracking-widest leading-tight">
                    Alterado por: <span className="text-amber-400">{data.last_edited_by}</span>
                  </p>
                </div>
              </div>
              <div className="md:text-right border-l md:border-l-0 md:border-t-0 border-amber-500/10 pl-4 md:pl-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data da Última Edição</p>
                <p className="text-xs font-bold text-amber-200/80">
                  {new Date(data.last_edited_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* OEE Results */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Disponibilidade</p>
              <p className="text-xl font-black text-white">{record.availability.toFixed(1)}%</p>
            </div>
            <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
              <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Performance</p>
              <p className="text-xl font-black text-white">{record.performance.toFixed(1)}%</p>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Qualidade</p>
              <p className="text-xl font-black text-white">{record.quality.toFixed(1)}%</p>
            </div>
            {(() => {
              const colorInfo = getOEEColorInfo(record.oee_score);
              return (
                <div 
                  className="p-4 rounded-2xl border shadow-lg flex flex-col justify-between"
                  style={{
                    backgroundColor: colorInfo.badgeBg,
                    borderColor: colorInfo.badgeBorder
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colorInfo.badgeText }}>OEE Score</p>
                    <span 
                      className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase"
                      style={{
                        backgroundColor: `${colorInfo.hex}25`,
                        color: colorInfo.hex,
                        borderColor: `${colorInfo.hex}40`
                      }}
                    >
                      {colorInfo.rangeText}
                    </span>
                  </div>
                  <p className="text-xl font-black text-white">{record.oee_score.toFixed(1)}%</p>
                </div>
              );
            })()}
          </div>

          {/* Detailed Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Dados de Produção</h4>
              <div className="grid grid-cols-2 gap-4">
                <StatRow label="Tempo Total (A)" value={data.A?.toString() || '0'} unit="h" />
                <StatRow label="% Projeto (B)" value={data.B?.toString() || '0'} unit="%" />
                <StatRow label="Fator Conv. (C)" value={data.C?.toString() || '0'} unit="G/F" />
                <StatRow label="Vel. Nominal (D)" value={data.D?.toString() || '0'} unit="GPH" />
                <StatRow label="Prod. Real (H)" value={data.H?.toString() || '0'} unit="Fardos" />
                <StatRow label="Turnos (K)" value={data.K?.toString() || '0'} unit="Qtd" />
                <StatRow label="Início Turno" value={data.shiftStartTime || '-'} unit="" />
                <StatRow label="Término Turno" value={data.shiftEndTime || '-'} unit="" />
                <StatRow label="Cont. Inicial" value={data.initialCounter?.toString() || '0'} unit="" />
                <StatRow label="Cont. Final" value={data.finalCounter?.toString() || '0'} unit="" />
                <StatRow label="Perda Qual. (U)" value={data.U?.toString() || '0'} unit="Garr." />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Informações Adicionais</h4>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 min-h-[100px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Observações / Notas</p>
                <p className="text-sm text-slate-300 italic">{record.notes || 'Sem observações'}</p>
                <p className="text-sm text-slate-300 mt-2">{record.shift}</p>
              </div>
            </div>
          </div>

          {/* Stops Table */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Detalhamento de Paradas</h4>
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-3 font-bold text-slate-500 uppercase">Código</th>
                    <th className="px-6 py-3 font-bold text-slate-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 font-bold text-slate-500 uppercase">Início</th>
                    <th className="px-6 py-3 font-bold text-slate-500 uppercase">Término</th>
                    <th className="px-6 py-3 font-bold text-slate-500 uppercase text-right">Duração (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.stops && data.stops.length > 0 ? (
                    data.stops.map((stop: any, idx: number) => {
                      const stopInfo = stopCodes.find(s => s.code === stop.code);
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 font-mono text-blue-400">{stop.code}</td>
                          <td className="px-6 py-3 text-slate-300">
                            <div className="flex flex-col">
                              <span>{stopInfo?.description || 'Desconhecido'}</span>
                              <span className={`text-[9px] font-bold ${stopInfo?.category === 'P' ? 'text-blue-400' : 'text-red-400'}`}>
                                {stopInfo?.category === 'P' ? 'Programada' : 'Não Programada'}
                              </span>
                              {stop.code === 500 && (stop.reasonCategory || stop.customReason) && (
                                <div className="mt-1.5 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[10px] text-amber-200">
                                  <span className="font-bold uppercase tracking-wider block text-[8px] text-amber-400 mb-0.5">Motivo de OUTROS:</span>
                                  {stop.reasonCategory && <span className="font-semibold">{stop.reasonCategory}</span>}
                                  {stop.reasonCategory && stop.customReason && <span className="mx-1">•</span>}
                                  {stop.customReason && <span className="italic">"{stop.customReason}"</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-400">{stop.startTime || '-'}</td>
                          <td className="px-6 py-3 text-slate-400">{stop.endTime || '-'}</td>
                          <td className="px-6 py-3 text-right font-bold text-white">{stop.duration} min</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">Nenhuma parada registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function KPICard({ title, value, icon, color, isMain = false, isOEE = false, description }: { 
  title: string, 
  value: number, 
  icon: React.ReactNode, 
  color: string,
  isMain?: boolean,
  isOEE?: boolean,
  description: string
}) {
  const oeeColor = isOEE ? getOEEColorInfo(value) : null;

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
  }[color as 'blue' | 'orange' | 'emerald' | 'indigo'];

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      style={isOEE && oeeColor ? {
        borderColor: `${oeeColor.hex}40`,
        boxShadow: `0 10px 25px -5px ${oeeColor.hex}1a`
      } : {}}
      className={`bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col justify-between relative overflow-hidden ${
        isMain && !isOEE ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-black' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div 
          className={`p-3 rounded-2xl ${isOEE && oeeColor ? '' : colorClasses}`}
          style={isOEE && oeeColor ? {
            backgroundColor: `${oeeColor.hex}20`,
            color: oeeColor.hex,
            border: `1px solid ${oeeColor.hex}35`
          } : {}}
        >
          {icon}
        </div>
        <div className="text-right">
          <span 
            className="text-3xl font-black tracking-tighter"
            style={isOEE && oeeColor ? { color: oeeColor.hex } : { color: '#ffffff' }}
          >
            {value.toFixed(1)}%
          </span>
          {isOEE && oeeColor && (
            <span 
              className="block text-[9px] font-extrabold uppercase tracking-wider mt-0.5"
              style={{ color: oeeColor.hex }}
            >
              {oeeColor.rangeText}
            </span>
          )}
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="font-bold text-slate-200">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{description}</p>
      </div>
      {isMain && (
        <div 
          className="absolute -right-4 -bottom-4 opacity-[0.06]"
          style={isOEE && oeeColor ? { color: oeeColor.hex } : { color: '#ffffff' }}
        >
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

interface StopOccurrence {
  date: string;
  line: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  reasonCategory?: string;
  customReason?: string;
  recordId: string;
}

interface StopTrace {
  code: number;
  description: string;
  category: 'P' | 'NP';
  occurrences: StopOccurrence[];
}

function StopTraceModal({ 
  trace, 
  stopCodes, 
  onClose,
  onSelectRecord
}: { 
  trace: StopTrace, 
  stopCodes: StopCode[], 
  onClose: () => void,
  onSelectRecord: (recordId: string) => void
}) {
  const totalOccurrences = trace.occurrences.length;
  const totalDuration = trace.occurrences.reduce((acc, curr) => acc + curr.duration, 0);
  const averageDuration = totalOccurrences > 0 ? (totalDuration / totalOccurrences) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md px-8 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${trace.category === 'P' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {trace.category === 'P' ? <Clock size={18} /> : <AlertTriangle size={18} />}
              </span>
              Rastreabilidade de Paradas: Código {trace.code}
            </h2>
            <p className="text-sm font-semibold text-slate-400 mt-1">
              {trace.description}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Ocorrências</p>
                <p className="text-3xl font-black text-white">{totalOccurrences}</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Número total de paradas deste tipo registradas no mês</p>
            </div>
            
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Duração Total Acumulada</p>
                <p className="text-3xl font-black text-white">{totalDuration} <span className="text-sm font-bold text-slate-400">min</span></p>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Soma do tempo de parada de todas as ocorrências</p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Duração Média</p>
                <p className="text-3xl font-black text-white">{averageDuration.toFixed(1)} <span className="text-sm font-bold text-slate-400">min</span></p>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Tempo médio gasto por parada desse código</p>
            </div>
          </div>

          {/* Occurrences Table */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center justify-between">
              <span>Histórico de Ocorrências Detalhado</span>
              <span className="text-[10px] font-medium text-slate-500 lowercase">Mostrando {totalOccurrences} registros</span>
            </h4>
            
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase">Data</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase">Linha / Máquina</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase">Horário</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-right">Duração</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trace.occurrences && trace.occurrences.length > 0 ? (
                    trace.occurrences.map((occ: StopOccurrence, idx: number) => {
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-white font-semibold">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {occ.date}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-medium">
                            <div className="flex flex-col">
                              <span>{occ.line}</span>
                              {(occ.reasonCategory || occ.customReason) && (
                                <div className="mt-1 p-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] text-amber-300 max-w-xs leading-normal">
                                  {occ.reasonCategory && <span className="font-bold">{occ.reasonCategory}</span>}
                                  {occ.reasonCategory && occ.customReason && <span className="mx-1">•</span>}
                                  {occ.customReason && <span className="italic">"{occ.customReason}"</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {occ.startTime && occ.endTime ? (
                              <span className="font-mono">{occ.startTime} - {occ.endTime}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                              {occ.duration} min
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => onSelectRecord(occ.recordId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-xl border border-blue-500/20 text-xs font-bold transition-all"
                              title="Ver Registro Completo"
                            >
                              <Search size={12} />
                              Ver Registro
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                        Nenhuma ocorrência encontrada para este código de parada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

