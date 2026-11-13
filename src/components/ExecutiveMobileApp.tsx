import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Gauge,
  Layers,
  LogOut,
  Package,
  RefreshCw,
  ScanFace,
  Share,
  ShieldCheck,
  Smartphone,
  Trash2,
  TrendingUp,
  Wrench,
  X,
  PlusSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall, useOnlineStatus } from '@/hooks/usePWAInstall';
import {
  BiometricCredentialProfile,
  detectBiometricPlatform,
  enrollBiometricFaceId,
  getEnrolledBiometricForEmail,
  removeBiometricForEmail,
} from '@/lib/biometricAuth';

export interface MobileUser {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  role: string;
}

export interface MobileStopCode {
  code: number;
  description: string;
  category: 'P' | 'NP';
}

export interface MobileOEEColorInfo {
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

interface ExecutiveMobileAppProps {
  currentUser: MobileUser;
  allSystemRecords: any[];
  isLoadingRecords: boolean;
  productionLines: string[];
  stopCodes: MobileStopCode[];
  calculateOEEResults: (data: any, currentStopCodes: MobileStopCode[]) => any;
  getOEEColorInfo: (oee: number) => MobileOEEColorInfo;
  onRefresh: () => void;
  onLogout: () => void;
}

type PeriodMode = 'dia' | 'mes' | 'periodo' | 'ano';
type PeriodPreset = '7d' | '15d' | '30d' | '90d' | 'custom';
type MobileTab = 'resumo' | 'linhas' | 'paradas' | 'acesso';

const MAINTENANCE_CODES = [1, 2, 3, 31, 32, 33, 34, 35];

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const formatDateKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatMonthBR = (ym: string): string => {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${MONTH_NAMES_PT[m - 1]} de ${y}`;
};

const formatNumberBR = (val: number, decimals = 0): string => {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const ExecutiveMobileApp: React.FC<ExecutiveMobileAppProps> = ({
  currentUser,
  allSystemRecords,
  isLoadingRecords,
  productionLines,
  stopCodes,
  calculateOEEResults,
  getOEEColorInfo,
  onRefresh,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('resumo');

  // Filtros em Lista Suspensa
  const [periodMode, setPeriodMode] = useState<PeriodMode>('mes');
  const [selectedDay, setSelectedDay] = useState<string>(() => formatDateKey(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateKey(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateKey(new Date()));
  const [selectedLine, setSelectedLine] = useState<string>('Todas');
  const [selectedSku, setSelectedSku] = useState<string>('Todos');
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  // PWA & Biometria / Leitura Facial
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuideModal, setShowIOSGuideModal] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  const platformBiometric = useMemo(() => detectBiometricPlatform(), []);
  const [enrolledFaceProfile, setEnrolledFaceProfile] = useState<BiometricCredentialProfile | null>(() =>
    getEnrolledBiometricForEmail(currentUser.email)
  );
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [faceEnrollSuccess, setFaceEnrollSuccess] = useState<string | null>(null);
  const [faceEnrollError, setFaceEnrollError] = useState<string | null>(null);

  // Extrai opções reais disponíveis para listas suspensas (Dias, Meses, Anos, SKUs)
  const filterOptions = useMemo(() => {
    const daySet = new Set<string>();
    const monthSet = new Set<string>();
    const yearSet = new Set<string>();
    const skuSet = new Set<string>();

    allSystemRecords.forEach((rec) => {
      const d = new Date(rec.created_at);
      if (!isNaN(d.getTime())) {
        daySet.add(formatDateKey(d));
        monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        yearSet.add(String(d.getFullYear()));
      }
      if (rec.sku && typeof rec.sku === 'string') {
        skuSet.add(rec.sku);
      }
    });

    const days = Array.from(daySet).sort((a, b) => b.localeCompare(a));
    const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
    const skus = Array.from(skuSet).sort();

    return { days, months, years, skus };
  }, [allSystemRecords]);

  // Sincroniza o filtro inicial com o mês/dia mais recente caso o mês atual não tenha lançamentos
  useEffect(() => {
    if (filterOptions.months.length > 0 && !filterOptions.months.includes(selectedMonth)) {
      setSelectedMonth(filterOptions.months[0]);
    }
    if (filterOptions.days.length > 0 && !filterOptions.days.includes(selectedDay)) {
      setSelectedDay(filterOptions.days[0]);
    }
    if (filterOptions.years.length > 0 && !filterOptions.years.includes(selectedYear)) {
      setSelectedYear(filterOptions.years[0]);
    }
  }, [filterOptions.months.length, filterOptions.days.length, filterOptions.years.length]);

  // Registros filtrados por Período (Dia / Mês / Período / Ano), Linha e Produto
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const referenceLatestDate =
      filterOptions.days.length > 0 ? new Date(`${filterOptions.days[0]}T23:59:59`) : now;

    return allSystemRecords.filter((rec) => {
      const d = new Date(rec.created_at);
      if (isNaN(d.getTime())) return false;

      const recDay = formatDateKey(d);
      const recMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const recYear = String(d.getFullYear());

      let matchPeriod = true;
      if (periodMode === 'dia') {
        matchPeriod = recDay === selectedDay;
      } else if (periodMode === 'mes') {
        matchPeriod = recMonth === selectedMonth;
      } else if (periodMode === 'ano') {
        matchPeriod = recYear === selectedYear;
      } else if (periodMode === 'periodo') {
        if (periodPreset === 'custom') {
          matchPeriod = recDay >= customStartDate && recDay <= customEndDate;
        } else {
          const daysCount =
            periodPreset === '7d' ? 7 : periodPreset === '15d' ? 15 : periodPreset === '30d' ? 30 : 90;
          const cutoff = new Date(referenceLatestDate);
          cutoff.setDate(cutoff.getDate() - (daysCount - 1));
          cutoff.setHours(0, 0, 0, 0);
          matchPeriod = d >= cutoff && d <= referenceLatestDate;
        }
      }

      const matchLine = selectedLine === 'Todas' || rec.machine_name === selectedLine;
      const matchSku = selectedSku === 'Todos' || rec.sku === selectedSku;

      return matchPeriod && matchLine && matchSku;
    });
  }, [
    allSystemRecords,
    periodMode,
    selectedDay,
    selectedMonth,
    selectedYear,
    periodPreset,
    customStartDate,
    customEndDate,
    selectedLine,
    selectedSku,
    filterOptions.days,
  ]);

  // Consolidação completa de todos os indicadores para a Diretoria Executiva
  const executiveSummary = useMemo(() => {
    if (filteredRecords.length === 0) {
      return null;
    }

    let sumOee = 0;
    let sumDisp = 0;
    let sumPerf = 0;
    let sumQual = 0;
    let sumTeep = 0;
    let teepCount = 0;

    let totalRealH = 0;
    let totalTeoricaG = 0;
    let totalGarrafasU = 0;
    let totalTempoTotalA = 0;
    let totalProgrammedP = 0;
    let totalOperacaoR = 0;
    let totalLiquidoT = 0;
    let totalUtilX = 0;
    let totalPerdaS = 0;
    let totalPerdaV = 0;
    let totalParadasNP_Q = 0;
    let totalParadasP_N = 0;
    let totalMaintMins = 0;

    const trendMap: Record<string, { label: string; sortKey: string; oeeSum: number; count: number }> = {};
    const lineMap: Record<
      string,
      {
        line: string;
        count: number;
        oeeSum: number;
        dispSum: number;
        perfSum: number;
        qualSum: number;
        progH: number;
        maintMins: number;
        stopsHours: number;
        realH: number;
      }
    > = {};
    const stopsParetoMap: Record<number, { code: number; durationMins: number; occurrences: number }> = {};

    filteredRecords.forEach((rec) => {
      const oeeVal = Number(rec.oee_score) || 0;
      const dispVal = Number(rec.availability) || 0;
      const perfVal = Number(rec.performance) || 0;
      const qualVal = Number(rec.quality) || 0;

      sumOee += oeeVal;
      sumDisp += dispVal;
      sumPerf += perfVal;
      sumQual += qualVal;

      const d = new Date(rec.created_at);
      const dayKey = formatDateKey(d);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      // Agrupamento do gráfico de tendência de acordo com o período selecionado
      let bucketKey = dayKey;
      let bucketLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (periodMode === 'ano') {
        bucketKey = monthKey;
        bucketLabel = MONTH_NAMES_PT[d.getMonth()].slice(0, 3);
      } else if (periodMode === 'dia') {
        bucketKey = `${rec.machine_name}-${rec.id}`;
        bucketLabel = rec.machine_name.replace('Linha ', 'L');
      }

      if (!trendMap[bucketKey]) {
        trendMap[bucketKey] = { label: bucketLabel, sortKey: bucketKey, oeeSum: 0, count: 0 };
      }
      trendMap[bucketKey].oeeSum += oeeVal;
      trendMap[bucketKey].count += 1;

      const lineName = rec.machine_name || 'Sem Linha';
      if (!lineMap[lineName]) {
        lineMap[lineName] = {
          line: lineName,
          count: 0,
          oeeSum: 0,
          dispSum: 0,
          perfSum: 0,
          qualSum: 0,
          progH: 0,
          maintMins: 0,
          stopsHours: 0,
          realH: 0,
        };
      }
      lineMap[lineName].count += 1;
      lineMap[lineName].oeeSum += oeeVal;
      lineMap[lineName].dispSum += dispVal;
      lineMap[lineName].perfSum += perfVal;
      lineMap[lineName].qualSum += qualVal;

      let parsedOk = false;
      try {
        const raw = rec.raw_data || rec.downtime_data;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && !Array.isArray(parsed) && parsed.A !== undefined) {
            const res = calculateOEEResults(parsed, stopCodes);
            totalTempoTotalA += Number(parsed.A) || 0;
            totalProgrammedP += res.P;
            totalOperacaoR += res.R;
            totalLiquidoT += res.T;
            totalUtilX += res.X;
            totalRealH += Number(parsed.H) || 0;
            totalTeoricaG += res.G;
            totalGarrafasU += Number(parsed.U) || 0;
            totalPerdaS += res.S;
            totalPerdaV += res.V;
            totalParadasNP_Q += res.Q;
            totalParadasP_N += res.N;
            sumTeep += res.teep;
            teepCount += 1;
            parsedOk = true;

            lineMap[lineName].progH += res.P;
            lineMap[lineName].stopsHours += res.Q;
            lineMap[lineName].realH += Number(parsed.H) || 0;

            const stops = Array.isArray(parsed.stops) ? parsed.stops : [];
            stops.forEach((s: any) => {
              const code = Number(s.code);
              const mins = Number(s.duration) || 0;
              if (!stopsParetoMap[code]) {
                stopsParetoMap[code] = { code, durationMins: 0, occurrences: 0 };
              }
              stopsParetoMap[code].durationMins += mins;
              stopsParetoMap[code].occurrences += 1;

              if (MAINTENANCE_CODES.includes(code)) {
                totalMaintMins += mins;
                lineMap[lineName].maintMins += mins;
              }
            });
          }
        }
      } catch {
        // Ignora falha de parse pontual
      }

      if (!parsedOk) {
        const a = 24;
        const p = a * 0.85;
        const r = p * (dispVal / 100);
        const t = r * (perfVal / 100);
        const x = t * (qualVal / 100);
        totalTempoTotalA += a;
        totalProgrammedP += p;
        totalOperacaoR += r;
        totalLiquidoT += t;
        totalUtilX += x;
        lineMap[lineName].progH += p;
      }
    });

    const count = filteredRecords.length;
    const avgOee = sumOee / count;
    const avgDisp = sumDisp / count;
    const avgPerf = sumPerf / count;
    const avgQual = sumQual / count;
    const avgTeep = teepCount > 0 ? sumTeep / teepCount : totalTempoTotalA > 0 ? (totalUtilX / totalTempoTotalA) * 100 : 0;
    const maintenanceIndex = totalProgrammedP > 0 ? (totalMaintMins / 60 / totalProgrammedP) * 100 : 0;
    const productivity = totalProgrammedP > 0 ? totalRealH / totalProgrammedP : 0;
    const volumeEfficiency = totalTeoricaG > 0 ? (totalRealH / totalTeoricaG) * 100 : 0;
    const totalStopsHours = totalParadasNP_Q + totalParadasP_N;

    const trendChart = Object.values(trendMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((item) => ({
        label: item.label,
        oee: Number((item.oeeSum / item.count).toFixed(1)),
      }));

    const timeDecomposition = [
      { name: 'Tempo Total', value: Number(totalTempoTotalA.toFixed(1)), color: '#8b5cf6' },
      { name: 'Programado', value: Number(totalProgrammedP.toFixed(1)), color: '#0ea5e9' },
      { name: 'Operação', value: Number(totalOperacaoR.toFixed(1)), color: '#22c55e' },
      { name: 'Líquido', value: Number(totalLiquidoT.toFixed(1)), color: '#f97316' },
      { name: 'Tempo Útil', value: Number(totalUtilX.toFixed(1)), color: '#2563eb' },
    ];

    const linesRanking = productionLines.map((lineName) => {
      const data = lineMap[lineName];
      if (!data || data.count === 0) {
        return {
          line: lineName,
          shortLine: lineName.replace('Linha ', 'L'),
          count: 0,
          oee: 0,
          disp: 0,
          perf: 0,
          qual: 0,
          maintIndex: 0,
          stopsHours: 0,
          productivity: 0,
          realH: 0,
        };
      }
      return {
        line: lineName,
        shortLine: lineName.replace('Linha ', 'L'),
        count: data.count,
        oee: Number((data.oeeSum / data.count).toFixed(1)),
        disp: Number((data.dispSum / data.count).toFixed(1)),
        perf: Number((data.perfSum / data.count).toFixed(1)),
        qual: Number((data.qualSum / data.count).toFixed(1)),
        maintIndex: data.progH > 0 ? Number(((data.maintMins / 60 / data.progH) * 100).toFixed(1)) : 0,
        stopsHours: Number(data.stopsHours.toFixed(1)),
        productivity: data.progH > 0 ? Number((data.realH / data.progH).toFixed(1)) : 0,
        realH: data.realH,
      };
    });

    const allPareto = Object.values(stopsParetoMap)
      .map((item) => {
        const cfg = stopCodes.find((s) => s.code === item.code);
        return {
          code: item.code,
          description: cfg ? cfg.description : `Código ${item.code}`,
          category: cfg?.category || 'NP',
          isMaintenance: MAINTENANCE_CODES.includes(item.code),
          durationHours: Number((item.durationMins / 60).toFixed(1)),
          durationMins: item.durationMins,
          occurrences: item.occurrences,
        };
      })
      .sort((a, b) => b.durationMins - a.durationMins);

    const paretoNP = allPareto.filter((p) => p.category === 'NP');
    const paretoMaintenance = allPareto.filter((p) => p.isMaintenance);

    return {
      count,
      avgOee,
      avgDisp,
      avgPerf,
      avgQual,
      avgTeep,
      maintenanceIndex,
      productivity,
      volumeEfficiency,
      totalRealH,
      totalTeoricaG,
      totalGarrafasU,
      totalPerdaS,
      totalPerdaV,
      totalParadasNP_Q,
      totalParadasP_N,
      totalStopsHours,
      totalMaintHours: totalMaintMins / 60,
      totalProgrammedP,
      trendChart,
      timeDecomposition,
      linesRanking,
      paretoNP,
      paretoMaintenance,
    };
  }, [filteredRecords, periodMode, productionLines, stopCodes, calculateOEEResults]);

  // Rótulo legível do período selecionado
  const activePeriodLabel = useMemo(() => {
    if (periodMode === 'dia') return `Dia ${formatDateBR(selectedDay)}`;
    if (periodMode === 'mes') return formatMonthBR(selectedMonth);
    if (periodMode === 'ano') return `Ano de ${selectedYear}`;
    if (periodPreset === 'custom') return `${formatDateBR(customStartDate)} a ${formatDateBR(customEndDate)}`;
    const labels: Record<string, string> = {
      '7d': 'Últimos 7 dias',
      '15d': 'Últimos 15 dias',
      '30d': 'Últimos 30 dias',
      '90d': 'Últimos 90 dias',
    };
    return labels[periodPreset] || 'Período';
  }, [periodMode, selectedDay, selectedMonth, selectedYear, periodPreset, customStartDate, customEndDate]);

  // Fluxo de cadastro de Leitura Facial dentro do App Mobile
  const handleEnrollFaceId = async () => {
    setIsEnrollingFace(true);
    setFaceEnrollSuccess(null);
    setFaceEnrollError(null);

    try {
      const res = await enrollBiometricFaceId({
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        passwordHash: currentUser.password,
      });

      if (!res.success || !res.profile) {
        setFaceEnrollError(res.error || 'Não foi possível concluir o cadastro facial.');
        return;
      }

      setEnrolledFaceProfile(res.profile);
      setFaceEnrollSuccess(
        res.usedNativeWebAuthn
          ? `Leitura Facial (${platformBiometric.shortLabel}) cadastrada com sucesso! Nos próximos acessos você entrará direto sem digitar senha.`
          : `Leitura Facial cadastrada e vinculada com segurança a este dispositivo! Nos próximos acessos você poderá entrar com 1 toque.`
      );
    } catch (err: any) {
      setFaceEnrollError(err?.message || 'Erro ao configurar leitura facial.');
    } finally {
      setIsEnrollingFace(false);
    }
  };

  const handleRemoveFaceId = () => {
    removeBiometricForEmail(currentUser.email);
    setEnrolledFaceProfile(null);
    setFaceEnrollSuccess(null);
    setFaceEnrollError(null);
  };

  const handleAddHomeScreenIcon = async () => {
    setInstallFeedback(null);
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallFeedback('Ícone OEE GUIDEWAY adicionado à tela inicial com sucesso!');
      }
      return;
    }
    setShowIOSGuideModal(true);
  };

  const oeeColor = executiveSummary ? getOEEColorInfo(executiveSummary.avgOee) : null;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Compact Sticky Mobile Top Bar (56px) */}
      <header className="sticky top-0 z-40 h-14 bg-black/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="OEE Guideway"
            className="w-9 h-9 rounded-xl border border-white/15 shrink-0 object-cover"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-tight text-white truncate leading-tight">
              OEE GUIDEWAY
            </h1>
            <p className="text-[11px] font-medium text-blue-400 truncate leading-tight">
              Diretoria Executiva · Consulta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingRecords}
            aria-label="Atualizar dados"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw size={19} className={isLoadingRecords ? 'animate-spin text-blue-400' : ''} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair do sistema"
            className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-4 pb-24 space-y-5">
        {/* Banner de Status Offline caso desconectado */}
        {!isOnline && (
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>Modo offline ativo — exibindo últimos indicadores salvos no dispositivo.</span>
          </div>
        )}

        {/* Banner discreto para primeiro cadastro da Leitura Facial */}
        {!enrolledFaceProfile && activeTab !== 'acesso' && (
          <button
            type="button"
            onClick={() => setActiveTab('acesso')}
            className="w-full text-left bg-zinc-950 border border-blue-500/35 rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <ScanFace size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  Ative o login por Leitura Facial
                </p>
                <p className="text-xs text-slate-400 truncate">
                  Toque para cadastrar {platformBiometric.shortLabel} e entrar sem senha
                </p>
              </div>
            </div>
            <ChevronDown size={18} className="-rotate-90 text-blue-400 shrink-0" />
          </button>
        )}

        {/* FILTROS EXECUTIVOS EM LISTA SUSPENSA (Visível nas abas de análise) */}
        {activeTab !== 'acesso' && (
          <section
            aria-label="Filtros em Lista Suspensa"
            className="bg-zinc-950 border border-white/15 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                Filtros de Consulta
              </span>
              <span className="text-xs font-semibold text-blue-400 tabular-nums truncate">
                {activePeriodLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Lista Suspensa: Tipo de Período */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tipo de Filtro
                </label>
                <div className="relative">
                  <select
                    value={periodMode}
                    onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                    className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="dia">Por Dia</option>
                    <option value="mes">Por Mês</option>
                    <option value="periodo">Por Período</option>
                    <option value="ano">Por Ano</option>
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* 2. Lista Suspensa Dinâmica: Dia / Mês / Período / Ano */}
              {periodMode === 'dia' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Selecionar Dia
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer tabular-nums"
                    >
                      {filterOptions.days.length === 0 ? (
                        <option value={selectedDay}>{formatDateBR(selectedDay)}</option>
                      ) : (
                        filterOptions.days.map((day) => (
                          <option key={day} value={day}>
                            {formatDateBR(day)}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              )}

              {periodMode === 'mes' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Selecionar Mês
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {filterOptions.months.length === 0 ? (
                        <option value={selectedMonth}>{formatMonthBR(selectedMonth)}</option>
                      ) : (
                        filterOptions.months.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthBR(m)}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              )}

              {periodMode === 'periodo' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Intervalo de Tempo
                  </label>
                  <div className="relative">
                    <select
                      value={periodPreset}
                      onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                      className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="7d">Últimos 7 dias</option>
                      <option value="15d">Últimos 15 dias</option>
                      <option value="30d">Últimos 30 dias</option>
                      <option value="90d">Últimos 90 dias</option>
                      <option value="custom">Intervalo Personalizado</option>
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              )}

              {periodMode === 'ano' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Selecionar Ano
                  </label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer tabular-nums"
                    >
                      {filterOptions.years.length === 0 ? (
                        <option value={selectedYear}>{selectedYear}</option>
                      ) : (
                        filterOptions.years.map((y) => (
                          <option key={y} value={y}>
                            Ano {y}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* 3. Lista Suspensa: Linha de Produção */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Linha de Produção
                </label>
                <div className="relative">
                  <select
                    value={selectedLine}
                    onChange={(e) => setSelectedLine(e.target.value)}
                    className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Todas">Todas as Linhas (Fábrica)</option>
                    {productionLines.map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* 4. Lista Suspensa: Produto / SKU */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Produto (SKU)
                </label>
                <div className="relative">
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full min-h-[46px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl pl-3.5 pr-10 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Todos">Todos os Produtos</option>
                    {filterOptions.skus.map((sku) => (
                      <option key={sku} value={sku}>
                        {sku}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Datas customizadas se Período = Personalizado */}
            {periodMode === 'periodo' && periodPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full min-h-[44px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl px-3 focus:outline-none focus:border-blue-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full min-h-[44px] bg-black border border-white/20 text-white text-sm font-semibold rounded-xl px-3 focus:outline-none focus:border-blue-500 tabular-nums"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* CONTEÚDO DAS ABAS */}
        <AnimatePresence mode="wait">
          {/* ABA 1: RESUMO EXECUTIVO & BOX DE INDICADORES */}
          {activeTab === 'resumo' && (
            <motion.div
              key="mobile-resumo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {executiveSummary && oeeColor ? (
                <>
                  {/* BOX HERO: OEE GLOBAL */}
                  <div
                    className="bg-zinc-950 rounded-3xl p-5 border shadow-xl"
                    style={{ borderColor: `${oeeColor.hex}55` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          OEE Global Consolidado · {selectedLine}
                        </p>
                        <div className="flex items-baseline gap-3 mt-1.5">
                          <span
                            className="text-5xl font-black tracking-tight tabular-nums"
                            style={{ color: oeeColor.hex }}
                          >
                            {executiveSummary.avgOee.toFixed(1)}%
                          </span>
                          <span className="text-sm font-bold" style={{ color: oeeColor.hex }}>
                            {oeeColor.label} ({oeeColor.rangeText})
                          </span>
                        </div>
                      </div>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${oeeColor.hex}20`, color: oeeColor.hex }}
                      >
                        <Gauge size={26} />
                      </div>
                    </div>

                    {/* Barra visual de desempenho OEE */}
                    <div className="mt-4 h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, executiveSummary.avgOee))}%`,
                          backgroundColor: oeeColor.hex,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 tabular-nums">
                      <span>{executiveSummary.count} apontamento(s) analisado(s)</span>
                      <span>TEEP Global: {executiveSummary.avgTeep.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* BOX PILARES OEE: DISPONIBILIDADE, PERFORMANCE, QUALIDADE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                          <Clock size={16} />
                          <span>Disponibilidade</span>
                        </div>
                        <p className="text-3xl font-black text-white mt-1.5 tabular-nums">
                          {executiveSummary.avgDisp.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Operação / Programado</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0">
                        <Clock size={22} />
                      </div>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                          <TrendingUp size={16} />
                          <span>Performance</span>
                        </div>
                        <p className="text-3xl font-black text-white mt-1.5 tabular-nums">
                          {executiveSummary.avgPerf.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Ritmo vs Nominal</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                        <TrendingUp size={22} />
                      </div>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span>Qualidade</span>
                        </div>
                        <p className="text-3xl font-black text-white mt-1.5 tabular-nums">
                          {executiveSummary.avgQual.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Unidades Conformes</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 size={22} />
                      </div>
                    </div>
                  </div>

                  {/* BOX INDICADORES EXECUTIVOS COMPLEMENTARES */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Wrench size={15} className="text-red-400" />
                        <span>Índice Quebras</span>
                      </div>
                      <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                        {executiveSummary.maintenanceIndex.toFixed(1)}%
                      </p>
                      <p
                        className={`text-xs font-semibold mt-1 ${
                          executiveSummary.maintenanceIndex < 5 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {executiveSummary.maintenanceIndex < 5 ? 'Dentro da meta (<5%)' : 'Acima da meta (≥5%)'}
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Package size={15} className="text-emerald-400" />
                        <span>Produtividade</span>
                      </div>
                      <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                        {formatNumberBR(executiveSummary.productivity, 1)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">fardos / hora prog.</p>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <AlertTriangle size={15} className="text-purple-400" />
                        <span>Horas Paradas</span>
                      </div>
                      <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                        {executiveSummary.totalParadasNP_Q.toFixed(1)}h
                      </p>
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        Prog.: {executiveSummary.totalParadasP_N.toFixed(1)}h
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <BarChart3 size={15} className="text-blue-400" />
                        <span>Produção Real</span>
                      </div>
                      <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                        {formatNumberBR(executiveSummary.totalRealH)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        Teórica: {formatNumberBR(executiveSummary.totalTeoricaG)}
                      </p>
                    </div>
                  </div>

                  {/* GRÁFICOS EXECUTIVOS EM FUNDO PRETO */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Tendência de OEE no Período */}
                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <TrendingUp size={17} className="text-blue-400" />
                          Evolução do OEE ({activePeriodLabel})
                        </h3>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {executiveSummary.trendChart.length} pontos
                        </span>
                      </div>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={executiveSummary.trendChart}
                            margin={{ top: 18, right: 8, left: -18, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${value.toFixed(1)}%`, 'OEE']}
                            />
                            <Bar dataKey="oee" radius={[6, 6, 0, 0]} maxBarSize={38}>
                              {executiveSummary.trendChart.map((entry, idx) => (
                                <Cell key={`trend-${idx}`} fill={getOEEColorInfo(entry.oee).hex} />
                              ))}
                              <LabelList
                                dataKey="oee"
                                position="top"
                                formatter={(v: number) => `${v}%`}
                                style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 700 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Decomposição de Tempos (h) */}
                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Activity size={17} className="text-emerald-400" />
                          Decomposição de Tempos (h)
                        </h3>
                        <span className="text-xs text-slate-400 tabular-nums">Horas consolidadas</span>
                      </div>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={executiveSummary.timeDecomposition}
                            margin={{ top: 4, right: 44, left: 10, bottom: 4 }}
                            barSize={24}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={94}
                              tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${value.toFixed(1)} h`, 'Tempo']}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {executiveSummary.timeDecomposition.map((entry, idx) => (
                                <Cell key={`decomp-${idx}`} fill={entry.color} />
                              ))}
                              <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(v: number) => `${v}h`}
                                style={{ fill: '#f8fafc', fontSize: 11, fontWeight: 700 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* RESUMO DE PERDAS EXECUTIVAS */}
                  <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3">Resumo de Perdas no Período</h3>
                    <div className="divide-y divide-white/10 text-sm">
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-300">Paradas Não Programadas (Q)</span>
                        <span className="font-bold text-red-400 tabular-nums">
                          {executiveSummary.totalParadasNP_Q.toFixed(1)} h
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-300">Redução de Velocidade (S)</span>
                        <span className="font-bold text-orange-400 tabular-nums">
                          {executiveSummary.totalPerdaS.toFixed(1)} h
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-300">Perda por Qualidade (U / V)</span>
                        <span className="font-bold text-amber-400 tabular-nums">
                          {formatNumberBR(executiveSummary.totalGarrafasU)} garrafas ({executiveSummary.totalPerdaV.toFixed(1)} h)
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-300">Eficiência de Volume Realizado</span>
                        <span className="font-bold text-blue-400 tabular-nums">
                          {executiveSummary.volumeEfficiency.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-zinc-950 border border-dashed border-white/15 rounded-3xl p-10 text-center space-y-2">
                  <BarChart3 size={36} className="mx-auto text-slate-600" />
                  <h3 className="text-base font-bold text-white">Sem dados para os filtros atuais</h3>
                  <p className="text-xs text-slate-400">
                    Altere o período, linha ou produto nas listas suspensas acima para visualizar os indicadores.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ABA 2: COMPARATIVO POR LINHA DE PRODUÇÃO */}
          {activeTab === 'linhas' && (
            <motion.div
              key="mobile-linhas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {executiveSummary ? (
                <>
                  {/* Gráfico Comparativo das Linhas */}
                  <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers size={17} className="text-blue-400" />
                        Comparativo de OEE por Linha
                      </h3>
                      <span className="text-xs text-slate-400">{activePeriodLabel}</span>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={executiveSummary.linesRanking}
                          margin={{ top: 18, right: 6, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                          <XAxis
                            dataKey="shortLine"
                            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                              backgroundColor: '#09090b',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                            formatter={(v: number) => [`${v.toFixed(1)}%`, 'OEE']}
                          />
                          <Bar dataKey="oee" radius={[6, 6, 0, 0]}>
                            {executiveSummary.linesRanking.map((entry, idx) => (
                              <Cell
                                key={`line-bar-${idx}`}
                                fill={entry.count > 0 ? getOEEColorInfo(entry.oee).hex : '#27272a'}
                              />
                            ))}
                            <LabelList
                              dataKey="oee"
                              position="top"
                              formatter={(v: number) => (v > 0 ? `${v}%` : '-')}
                              style={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 700 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Cards individuais por linha (tap para expandir detalhes) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {executiveSummary.linesRanking.map((item) => {
                      const c = getOEEColorInfo(item.oee);
                      const isOpen = expandedLine === item.line;
                      return (
                        <button
                          key={item.line}
                          type="button"
                          onClick={() => setExpandedLine(isOpen ? null : item.line)}
                          className="w-full text-left bg-zinc-950 border border-white/15 rounded-2xl p-4 transition-all active:scale-[0.99] cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-bold text-white">{item.line}</p>
                              <p className="text-xs text-slate-400 tabular-nums">
                                {item.count} apontamento(s) · Quebra: {item.maintIndex.toFixed(1)}%
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span
                                  className="text-xl font-black tabular-nums block"
                                  style={{ color: item.count > 0 ? c.hex : '#64748b' }}
                                >
                                  {item.count > 0 ? `${item.oee.toFixed(1)}%` : '--'}
                                </span>
                                <span
                                  className="text-[11px] font-semibold block"
                                  style={{ color: item.count > 0 ? c.hex : '#64748b' }}
                                >
                                  {item.count > 0 ? c.label : 'Sem dados'}
                                </span>
                              </div>
                              <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>

                          {isOpen && item.count > 0 && (
                            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs tabular-nums">
                              <div>
                                <span className="text-slate-400 block">Disponib.</span>
                                <span className="text-blue-400 font-bold text-sm">{item.disp.toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Perform.</span>
                                <span className="text-orange-400 font-bold text-sm">{item.perf.toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Qualidade</span>
                                <span className="text-emerald-400 font-bold text-sm">{item.qual.toFixed(1)}%</span>
                              </div>
                              <div className="pt-2">
                                <span className="text-slate-400 block">Paradas NP</span>
                                <span className="text-red-400 font-bold">{item.stopsHours.toFixed(1)}h</span>
                              </div>
                              <div className="pt-2">
                                <span className="text-slate-400 block">Produtiv.</span>
                                <span className="text-white font-bold">{item.productivity.toFixed(1)} f/h</span>
                              </div>
                              <div className="pt-2">
                                <span className="text-slate-400 block">Produção</span>
                                <span className="text-white font-bold">{formatNumberBR(item.realH)} f</span>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="bg-zinc-950 border border-dashed border-white/15 rounded-3xl p-10 text-center">
                  <p className="text-sm text-slate-400">Nenhuma linha com registros no filtro selecionado.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ABA 3: PARADAS & MANUTENÇÃO INDUSTRIAL */}
          {activeTab === 'paradas' && (
            <motion.div
              key="mobile-paradas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {executiveSummary ? (
                <>
                  {/* Resumo Executivo de Manutenção */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                        <Wrench size={16} />
                        <span>Índice de Quebras</span>
                      </div>
                      <p className="text-3xl font-black text-white mt-1.5 tabular-nums">
                        {executiveSummary.maintenanceIndex.toFixed(1)}%
                      </p>
                      <p
                        className={`text-xs font-semibold mt-1 ${
                          executiveSummary.maintenanceIndex < 5 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        Meta &lt; 5,0% · {executiveSummary.totalMaintHours.toFixed(1)}h manutenção
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                        <AlertTriangle size={16} />
                        <span>Total Paradas (Q+N)</span>
                      </div>
                      <p className="text-3xl font-black text-white mt-1.5 tabular-nums">
                        {executiveSummary.totalStopsHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        NP: {executiveSummary.totalParadasNP_Q.toFixed(1)}h · P: {executiveSummary.totalParadasP_N.toFixed(1)}h
                      </p>
                    </div>
                  </div>

                  {/* Pareto de Paradas Não Programadas */}
                  <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle size={17} className="text-red-400" />
                      Principais Paradas Não Programadas
                    </h3>
                    {executiveSummary.paretoNP.length > 0 ? (
                      <div className="space-y-3">
                        {executiveSummary.paretoNP.slice(0, 8).map((item) => {
                          const maxMins = executiveSummary.paretoNP[0]?.durationMins || 1;
                          const pct = Math.min(100, (item.durationMins / maxMins) * 100);
                          return (
                            <div key={item.code} className="space-y-1">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-white truncate">
                                  {item.code} · {item.description}
                                </span>
                                <span className="font-bold text-red-400 tabular-nums shrink-0">
                                  {item.durationHours}h ({item.occurrences}x)
                                </span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${item.isMaintenance ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Nenhuma parada não programada registrada no período.
                      </p>
                    )}
                  </div>

                  {/* Quebras por Equipamento (Manutenção) */}
                  <div className="bg-zinc-950 border border-white/15 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Wrench size={17} className="text-amber-400" />
                      Falhas de Manutenção (Equipamentos)
                    </h3>
                    {executiveSummary.paretoMaintenance.length > 0 ? (
                      <div className="divide-y divide-white/10">
                        {executiveSummary.paretoMaintenance.map((m) => (
                          <div key={m.code} className="py-3 flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{m.description}</p>
                              <p className="text-xs text-slate-400">Código {m.code} · {m.occurrences} ocorrência(s)</p>
                            </div>
                            <span className="font-black text-amber-400 tabular-nums shrink-0">
                              {m.durationHours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Sem ocorrências de quebra mecânica/elétrica neste período.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-zinc-950 border border-dashed border-white/15 rounded-3xl p-10 text-center">
                  <p className="text-sm text-slate-400">Sem paradas registradas para os filtros atuais.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ABA 4: SEGURANÇA FACIAL (FACE ID) & ÍCONE NA TELA DE INÍCIO */}
          {activeTab === 'acesso' && (
            <motion.div
              key="mobile-acesso"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {/* Cartão 1: Cadastro da Leitura Facial (Face ID / Android Biometria) */}
              <div className="bg-zinc-950 border border-white/15 rounded-3xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                      enrolledFaceProfile
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                        : 'bg-blue-500/15 border-blue-500/35 text-blue-400'
                    }`}
                  >
                    <ScanFace size={30} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-white">
                      Login por Leitura Facial
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Compatível com Face ID (iPhone) e Biometria Facial (Android). Após cadastrar aqui, seus próximos acessos dispensam digitação de senha.
                    </p>
                  </div>
                </div>

                {enrolledFaceProfile ? (
                  <div className="bg-black border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                        <ShieldCheck size={18} />
                        <span>Leitura Facial Ativa</span>
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {new Date(enrolledFaceProfile.enrolledAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Dispositivo: <strong className="text-white">{enrolledFaceProfile.deviceLabel}</strong>
                    </p>
                    <p className="text-xs text-slate-400">
                      Conta vinculada: <span className="text-white">{enrolledFaceProfile.userEmail}</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleEnrollFaceId}
                        disabled={isEnrollingFace}
                        className="flex-1 min-h-[46px] bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl px-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <ScanFace size={18} />
                        {isEnrollingFace ? 'Verificando...' : 'Recadastrar Leitura Facial'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFaceId}
                        className="min-h-[46px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl px-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Trash2 size={17} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnrollFaceId}
                    disabled={isEnrollingFace}
                    className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm rounded-2xl px-5 flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <ScanFace size={22} className={isEnrollingFace ? 'animate-pulse' : ''} />
                    {isEnrollingFace
                      ? 'Aguardando verificação biométrica...'
                      : `Cadastrar Acesso por ${platformBiometric.shortLabel}`}
                  </button>
                )}

                {faceEnrollSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{faceEnrollSuccess}</span>
                  </div>
                )}

                {faceEnrollError && (
                  <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <span>{faceEnrollError}</span>
                  </div>
                )}
              </div>

              {/* Cartão 2: Ícone Ilustrativo na Tela de Início (iPhone / Android) */}
              <div className="bg-zinc-950 border border-white/15 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 flex flex-col items-center gap-1.5">
                    <img
                      src="/pwa-192x192.png"
                      alt="Ícone OEE Guideway"
                      className="w-16 h-16 rounded-2xl border border-white/20 shadow-lg"
                    />
                    <span className="text-[11px] font-semibold text-slate-300">OEE Guideway</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Smartphone size={18} className="text-blue-400 shrink-0" />
                      Ícone na Tela de Início
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Adicione este ícone ilustrativo à tela inicial do seu iPhone ou Android para abrir o App Executivo em tela cheia com um toque.
                    </p>
                  </div>
                </div>

                {isInstalled ? (
                  <div className="bg-black border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>Aplicativo já instalado na tela de início deste dispositivo.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddHomeScreenIcon}
                    className="w-full min-h-[50px] bg-white text-black hover:bg-slate-200 font-bold text-sm rounded-2xl px-5 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Download size={19} />
                    {isInstallable
                      ? 'Adicionar Ícone à Tela Inicial'
                      : isIOS
                      ? 'Como Adicionar no iPhone (iOS)'
                      : 'Adicionar Ícone na Tela de Início'}
                  </button>
                )}

                {installFeedback && (
                  <p className="text-xs text-emerald-400 font-semibold text-center">{installFeedback}</p>
                )}
              </div>

              {/* Cartão 3: Sessão Executiva Atual */}
              <div className="bg-zinc-950 border border-white/15 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400">Usuário Conectado</p>
                    <p className="text-base font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-400 shrink-0">
                    Diretoria Executiva
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full min-h-[48px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <LogOut size={18} />
                  Encerrar Sessão
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Tab Bar (64px) — Ergonomia para o polegar */}
      <nav
        aria-label="Navegação Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-black/95 backdrop-blur-md border-t border-white/15"
      >
        <div className="max-w-6xl mx-auto h-full grid grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab('resumo')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'resumo' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge size={22} />
            <span className="text-[11px] font-bold tracking-tight">Resumo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('linhas')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'linhas' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={22} />
            <span className="text-[11px] font-bold tracking-tight">Linhas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paradas')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'paradas' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench size={22} />
            <span className="text-[11px] font-bold tracking-tight">Paradas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('acesso')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'acesso' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ScanFace size={22} />
            <span className="text-[11px] font-bold tracking-tight">Face ID</span>
          </button>
        </div>
      </nav>

      {/* Modal Guia para Adicionar Ícone na Tela Inicial (iOS / Android) */}
      <AnimatePresence>
        {showIOSGuideModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/pwa-192x192.png"
                    alt="OEE Guideway Icon"
                    className="w-12 h-12 rounded-2xl border border-white/15"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white">Adicionar Ícone na Tela Inicial</h3>
                    <p className="text-xs text-slate-400">OEE GUIDEWAY · Acesso Rápido</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuideModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-200">
                <div className="bg-black border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="font-bold text-white flex items-center gap-2">
                    <Share size={16} className="text-blue-400" />
                    No iPhone / iPad (Safari):
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    1. Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.<br />
                    2. Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                    3. Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                  </p>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="font-bold text-white flex items-center gap-2">
                    <PlusSquare size={16} className="text-emerald-400" />
                    No Android (Chrome):
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    1. Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito.<br />
                    2. Selecione <strong>Adicionar à tela inicial</strong> ou <strong>Instalar aplicativo</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuideModal(false)}
                className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl cursor-pointer"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
