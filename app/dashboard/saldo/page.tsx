'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Loader2, TrendingUp, RefreshCw, Download, Wallet,
  AlertCircle, CheckCircle2, Filter, Zap, Building2,
  ToggleLeft, ToggleRight, Settings, ChevronDown,
} from 'lucide-react';
import PixLinkModal from '@/components/dashboard/PixLinkModal';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyBalance {
  company_id: string;
  available_balance_cents: number;
  total_received_cents: number;
  total_transferred_cents: number;
  user_id: string;
}

interface CreditPackage {
  id: string;
  name: string;
  price_cents: number;
  interactions: number;
  package_type: 'credits' | 'monthly';
  is_highlighted: boolean;
  display_order: number;
}

interface CommissionPending {
  company_id: string;
  valor_comissao: number;
  valor_venda: number;
}

interface UnifiedTransaction {
  id: string;
  source: 'pix' | 'cobranca';
  is_withdrawal: boolean;
  company_id: string;
  company_name: string;
  amount_cents: number;
  status: string;
  date: string;
  tipo_label: string;
  notes?: string;
  pix_key?: string;
  is_vendas?: boolean;
  comissao_cents?: number;
  is_consulta_fee?: boolean;
}

interface AutoRechargeSettings {
  enabled: boolean;
  threshold: number;
  package_id: string;
}

type TypeFilter = 'all' | 'pix' | 'outros';
type StatusFilter = 'confirmed' | 'cancelled' | 'all';
type WithdrawTab = 'withdraw' | 'buy' | 'auto';

const PAGE_SIZE = 50;

const THRESHOLD_OPTIONS = [1, 5, 10, 15];

const COMPANY_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
];

export default function SaldoPage() {
  const supabase = createClient();

  // ── Auth / perfil ─────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // ── Companies ─────────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyColorMap, setCompanyColorMap] = useState<Record<string, string>>({});
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // ── Saldo ─────────────────────────────────────────────────────────────────
  const [companyBalances, setCompanyBalances] = useState<CompanyBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState({
    available_balance_cents: 0,
    total_received_cents: 0,
    total_transferred_cents: 0,
  });

  // ── Transações unificadas ─────────────────────────────────────────────────
  const [allTransactions, setAllTransactions] = useState<UnifiedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<UnifiedTransaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('confirmed');

  // ── Paginação ─────────────────────────────────────────────────────────────
  const [pixOffset, setPixOffset] = useState(0);
  const [cobrancasOffset, setCobrancasOffset] = useState(0);
  const [mpOrdersOffset, setMpOrdersOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadCtx, setLoadCtx] = useState<{
    companyNameMap: Record<string, string>;
    companyTypeMap: Record<string, string>;
    companyIds: string[];
    withdrawalIds: Set<string>;
    commissionsPending: CommissionPending[];
  } | null>(null);

  // ── UI geral ──────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historico' | 'withdraw'>('historico');
  const [pixLinkModalOpen, setPixLinkModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Saque PIX ─────────────────────────────────────────────────────────────
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // ── Comprar créditos com saldo ────────────────────────────────────────────
  const [activeWithdrawTab, setActiveWithdrawTab] = useState<WithdrawTab>('withdraw');
  const [availablePackages, setAvailablePackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isBuyingWithBalance, setIsBuyingWithBalance] = useState(false);

  // ── Auto-recarga ──────────────────────────────────────────────────────────
  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeSettings>({
    enabled: false,
    threshold: 15,
    package_id: '',
  });
  const [autoRechargeLoaded, setAutoRechargeLoaded] = useState(false);
  const [isSavingAuto, setIsSavingAuto] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [commissionsPending, setCommissionsPending] = useState<CommissionPending[]>([]);
  const [totalCommissionCents, setTotalCommissionCents] = useState(0);
  const [hasVendasCompany, setHasVendasCompany] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (userId) { loadBalanceData(); loadAutoRecharge(); } }, [userId]);
  useEffect(() => { filterTransactions(); }, [allTransactions, typeFilter, statusFilter, companyFilter]);
  useEffect(() => { loadPackages(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function filterTransactions() {
    let filtered = [...allTransactions];

    if (companyFilter !== 'all') {
      filtered = filtered.filter(tx => tx.company_id === companyFilter);
    }
    if (typeFilter === 'pix') {
      filtered = filtered.filter(tx => tx.source === 'pix');
    } else if (typeFilter === 'outros') {
      filtered = filtered.filter(tx => tx.source === 'cobranca');
    }
    if (statusFilter === 'confirmed') {
      filtered = filtered.filter(tx =>
        tx.status === 'confirmed' || tx.status === 'transferred' || tx.status === 'PAGA' || tx.status === 'paid'
      );
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter(tx =>
        tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'CANCELADA'
      );
    }

    setFilteredTransactions(filtered);
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatPixKey(key: string) {
    if (!key) return '';
    if (key.length > 20) return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    return key;
  }

  function toSaoPauloDateKey(dateStr: string): string {
    return new Date(dateStr)
      .toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .split('/')
      .reverse()
      .join('-');
  }

  function getTipoLabel(tipo: string, nfc_payment_method?: string | null): string {
    if (tipo === 'LINK_PAGAMENTO') return 'Link InfinitePay';
    if (tipo === 'NFC') return nfc_payment_method === 'debit' ? 'NFC Débito' : 'NFC Crédito';
    return tipo;
  }

  function getStatusBadge(tx: UnifiedTransaction) {
    const isConfirmed = tx.status === 'confirmed' || tx.status === 'transferred' || tx.status === 'PAGA' || tx.status === 'paid';
    const isCancelled = tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'CANCELADA';

    if (isConfirmed) return (
      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
        {tx.status === 'transferred' ? 'Concluído' : 'Confirmado'}
      </span>
    );
    if (isCancelled) return (
      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
        {tx.status === 'expired' ? 'Expirado' : 'Cancelado'}
      </span>
    );
    return (
      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
        Pendente
      </span>
    );
  }

  function getTipoBadge(tx: UnifiedTransaction) {
    const colorClass = tx.is_withdrawal
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
      : tx.is_consulta_fee
        ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
        : tx.source === 'pix'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
          : tx.tipo_label.includes('Link')
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${colorClass}`}>
        {tx.tipo_label}
      </span>
    );
  }

  function getCompanyBadge(tx: UnifiedTransaction) {
    const color = companyColorMap[tx.company_id] ?? COMPANY_COLORS[0];
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold truncate max-w-[120px] inline-block ${color}`}>
        {tx.company_name}
      </span>
    );
  }

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function loadInitialData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (profile) setUserProfile(profile);

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, slug, assistant_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (companiesData?.some((c: any) => c.assistant_type === 'vendas')) {
        setHasVendasCompany(true);
      }

      if (companiesData?.length) {
        setCompanies(companiesData);
        const colorMap: Record<string, string> = {};
        companiesData.forEach((c, i) => {
          colorMap[c.id] = COMPANY_COLORS[i % COMPANY_COLORS.length];
        });
        setCompanyColorMap(colorMap);
      }

      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (creditsData) setUserCredits(creditsData.available_credits);

    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setIsLoading(false);
    }
  }

  async function loadBalanceData() {
    setIsLoading(true);
    try {
      // ── Saldo ────────────────────────────────────────────────────────────
      const { data: balanceData } = await supabase
        .from('company_balance')
        .select('*')
        .eq('user_id', userId);

      if (balanceData?.length) {
        setCompanyBalances(balanceData);
        const total = balanceData.reduce(
          (acc, curr) => ({
            available_balance_cents: acc.available_balance_cents + curr.available_balance_cents,
            total_received_cents: acc.total_received_cents + curr.total_received_cents,
            total_transferred_cents: acc.total_transferred_cents + curr.total_transferred_cents,
          }),
          { available_balance_cents: 0, total_received_cents: 0, total_transferred_cents: 0 }
        );
        setTotalBalance(total);
      }

      // ── Mapa de companies ────────────────────────────────────────────────
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name, assistant_type')
        .eq('user_id', userId);

      const companyNameMap: Record<string, string> = {};
      const companyTypeMap: Record<string, string> = {};
      (allCompanies ?? []).forEach((c: any) => {
        companyNameMap[c.id] = c.name;
        companyTypeMap[c.id] = c.assistant_type ?? 'smart';
      });
      const companyIds = (allCompanies ?? []).map((c: any) => c.id);

      // ── Comissões pendentes ──────────────────────────────────────────────
      let commissionsData: CommissionPending[] = [];
      if (companyIds.length > 0) {
        const { data } = await supabase
          .from('commission_pending')
          .select('company_id, valor_comissao, valor_venda')
          .in('company_id', companyIds)
          .eq('status', 'pendente');

        commissionsData = data ?? [];
        if (commissionsData.length) {
          setCommissionsPending(commissionsData);
          const total = commissionsData.reduce((acc, c) => acc + Number(c.valor_comissao), 0);
          setTotalCommissionCents(Math.round(total * 100));
        } else {
          setCommissionsPending([]);
          setTotalCommissionCents(0);
        }
      }

      // ── IDs de saques ────────────────────────────────────────────────────
      const { data: withdrawalData } = await supabase
        .from('balance_transactions')
        .select('pix_transaction_id')
        .eq('user_id', userId)
        .eq('transaction_type', 'withdrawal');

      const withdrawalIds = new Set<string>(
        (withdrawalData ?? [])
          .map((w: { pix_transaction_id: string | null }) => w.pix_transaction_id)
          .filter((id): id is string => id !== null)
      );

      // ── Consultas pagas via saldo ────────────────────────────────────
      const { data: consultasSaldoData } = await supabase
        .from('balance_transactions')
        .select('id, company_id, amount_cents, description, created_at')
        .eq('user_id', userId)
        .eq('transaction_type', 'consulta_fee')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      // Salva contexto para reutilizar no "carregar mais"
      const ctx = { companyNameMap, companyTypeMap, companyIds, withdrawalIds, commissionsPending: commissionsData };
      setLoadCtx(ctx);

      // ── Primeira página: PIX ─────────────────────────────────────────────
      const { data: pixData } = await supabase
        .from('pix_transactions')
        .select('id, company_id, amount_cents, status, requested_at, notes, destination_pix_key')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      // ── Primeira página: Cobranças ───────────────────────────────────────
      const { data: cobrancasData } = companyIds.length > 0
        ? await supabase
            .from('cobrancas')
            .select('id, valor, status, created_at, paid_at, tipo, nfc_payment_method, descricao, company_id')
            .in('company_id', companyIds)
            .eq('status', 'PAGA')
            .order('paid_at', { ascending: false })
            .range(0, PAGE_SIZE - 1)
        : { data: [] };

      const { data: mpOrdersData } = companyIds.length > 0
        ? await supabase
            .from('mp_orders')
            .select('id, company_id, amount_cents, payment_type, installments, description, status, created_at, paid_at')
            .in('company_id', companyIds)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .range(0, PAGE_SIZE - 1)
        : { data: [] };

      const pixCount = (pixData ?? []).length;
      const cobrancasCount = (cobrancasData ?? []).length;
      const mpOrdersCount = (mpOrdersData ?? []).length;

      setHasMore(pixCount >= PAGE_SIZE || cobrancasCount >= PAGE_SIZE || mpOrdersCount >= PAGE_SIZE);
      setPixOffset(pixCount);
      setCobrancasOffset(cobrancasCount);
      setMpOrdersOffset(mpOrdersCount);

      const merged = [
        ...normalizePix(pixData ?? [], withdrawalIds, companyNameMap, companyTypeMap, commissionsData),
        ...normalizeCobrancas(cobrancasData ?? [], companyNameMap, companyTypeMap),
        ...normalizeMpOrders(mpOrdersData ?? [], companyNameMap, companyTypeMap),
        ...normalizeConsultaFeesSaldo(consultasSaldoData ?? [], companyNameMap),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllTransactions(merged);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    if (!loadCtx || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const { companyNameMap, companyTypeMap, companyIds, withdrawalIds, commissionsPending: commissions } = loadCtx;

      const [{ data: pixData }, { data: cobrancasData }, { data: mpOrdersData }] = await Promise.all([
        supabase
          .from('pix_transactions')
          .select('id, company_id, amount_cents, status, requested_at, notes, destination_pix_key, purpose')
          .eq('user_id', userId)
          .order('requested_at', { ascending: false })
          .range(pixOffset, pixOffset + PAGE_SIZE - 1),

        companyIds.length > 0
          ? supabase
              .from('cobrancas')
              .select('id, valor, status, created_at, paid_at, tipo, nfc_payment_method, descricao, company_id')
              .in('company_id', companyIds)
              .eq('status', 'PAGA')
              .order('paid_at', { ascending: false })
              .range(cobrancasOffset, cobrancasOffset + PAGE_SIZE - 1)
          : Promise.resolve({ data: [] }),

        companyIds.length > 0
          ? supabase
              .from('mp_orders')
              .select('id, company_id, amount_cents, payment_type, installments, description, status, created_at, paid_at')
              .in('company_id', companyIds)
              .eq('status', 'paid')
              .order('paid_at', { ascending: false })
              .range(mpOrdersOffset, mpOrdersOffset + PAGE_SIZE - 1)
          : Promise.resolve({ data: [] }),
      ]);

      const pixCount = (pixData ?? []).length;
      const cobrancasCount = (cobrancasData ?? []).length;
      const mpOrdersCount = (mpOrdersData ?? []).length;

      setPixOffset(prev => prev + pixCount);
      setCobrancasOffset(prev => prev + cobrancasCount);
      setMpOrdersOffset(prev => prev + mpOrdersCount);
      setHasMore(pixCount >= PAGE_SIZE || cobrancasCount >= PAGE_SIZE || mpOrdersCount >= PAGE_SIZE);

      const newBatch = [
        ...normalizePix(pixData ?? [], withdrawalIds, companyNameMap, companyTypeMap, commissions),
        ...normalizeCobrancas(cobrancasData ?? [], companyNameMap, companyTypeMap),
        ...normalizeMpOrders(mpOrdersData ?? [], companyNameMap, companyTypeMap),
      ];

      setAllTransactions(prev => {
        const merged = [...prev, ...newBatch].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return merged;
      });
    } catch (error) {
      console.error('Erro ao carregar mais transações:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // ── Normalizadores ────────────────────────────────────────────────────────
  function normalizePix(
    data: any[],
    withdrawalIds: Set<string>,
    companyNameMap: Record<string, string>,
    companyTypeMap: Record<string, string>,
    commissions: CommissionPending[],
  ): UnifiedTransaction[] {
    return data
      .map(tx => {
      const isWithdrawal = withdrawalIds.has(tx.id);
      const isVendas = companyTypeMap[tx.company_id] === 'vendas';
      const comissaoEntry = isVendas && !isWithdrawal
        ? commissions.find(c => c.company_id === tx.company_id)
        : undefined;
      return {
        id: tx.id,
        source: 'pix' as const,
        is_withdrawal: isWithdrawal,
        company_id: tx.company_id ?? '',
        company_name: companyNameMap[tx.company_id] ?? 'Desconhecido',
        amount_cents: tx.amount_cents,
        status: tx.status,
        date: tx.requested_at,
        tipo_label: isWithdrawal ? 'Saque' : 'PIX',
        notes: tx.notes,
        pix_key: tx.destination_pix_key,
        is_vendas: isVendas && !isWithdrawal,
        comissao_cents: comissaoEntry
          ? Math.round(Number(comissaoEntry.valor_comissao) * 100)
          : isVendas && !isWithdrawal
            ? Math.round(tx.amount_cents * 0.10)
            : undefined,
      };
    });
  }

  function normalizeCobrancas(
    data: any[],
    companyNameMap: Record<string, string>,
    companyTypeMap: Record<string, string>,
  ): UnifiedTransaction[] {
    return data.map(tx => {
      const isVendas = companyTypeMap[tx.company_id] === 'vendas';
      const amountCents = Math.round(Number(tx.valor) * 100);
      return {
        id: tx.id,
        source: 'cobranca' as const,
        is_withdrawal: false,
        company_id: tx.company_id,
        company_name: companyNameMap[tx.company_id] ?? 'Desconhecido',
        amount_cents: amountCents,
        status: tx.status,
        date: tx.paid_at ?? tx.created_at,
        tipo_label: getTipoLabel(tx.tipo, tx.nfc_payment_method),
        notes: tx.descricao,
        is_vendas: isVendas,
        comissao_cents: isVendas ? Math.round(amountCents * 0.10) : undefined,
      };
    });
  }

  function normalizeMpOrders(
    data: any[],
    companyNameMap: Record<string, string>,
    companyTypeMap: Record<string, string>,
  ): UnifiedTransaction[] {
    return data.map(tx => {
      const isVendas = companyTypeMap[tx.company_id] === 'vendas';
      const label = tx.payment_type === 'debit_card'
        ? tx.installments > 1 ? `TEF Débito ${tx.installments}x` : 'TEF Débito'
        : tx.installments > 1 ? `TEF Crédito ${tx.installments}x` : 'TEF Crédito';
      return {
        id: tx.id,
        source: 'cobranca' as const,
        is_withdrawal: false,
        company_id: tx.company_id,
        company_name: companyNameMap[tx.company_id] ?? 'Desconhecido',
        amount_cents: tx.amount_cents,
        status: tx.status,
        date: tx.paid_at ?? tx.created_at,
        tipo_label: label,
        notes: tx.description ?? undefined,
        is_vendas: isVendas,
        comissao_cents: isVendas ? Math.round(tx.amount_cents * 0.10) : undefined,
      };
    });
  }

    function normalizeConsultaFees(         // ← adiciona aqui
    data: any[],
    companyNameMap: Record<string, string>,
  ): UnifiedTransaction[] {
    return data.map(tx => ({
      id: tx.id,
      source: 'cobranca' as const,
      is_withdrawal: false,
      company_id: tx.company_id ?? '',
      company_name: companyNameMap[tx.company_id] ?? 'Desconhecido',
      amount_cents: Math.abs(tx.amount_cents),
      status: 'confirmed',
      date: tx.created_at,
      tipo_label: 'Consulta',
      notes: tx.description ?? '',
      is_consulta_fee: true,
    }));
  }

  async function loadPackages() {
    const { data } = await supabase
      .from('credits_packages')
      .select('id, name, price_cents, interactions, package_type, is_highlighted, display_order')
      .eq('is_active', true)
      .gt('price_cents', 0)
      .order('display_order');
    setAvailablePackages(data || []);
  }

  async function loadAutoRecharge() {
    const { data } = await supabase
      .from('auto_recharge_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setAutoRecharge({
        enabled: data.enabled,
        threshold: data.threshold,
        package_id: data.package_id,
      });
    }
    setAutoRechargeLoaded(true);
  }

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function handleWithdraw() {
    setMessage(null);
    const pixKey = userProfile?.withdrawal_pix_key;

    if (!pixKey) { setMessage({ type: 'error', text: 'Configure sua chave Pix no Perfil antes de solicitar um saque.' }); return; }
    if (!withdrawAmount) { setMessage({ type: 'error', text: 'Informe o valor do saque.' }); return; }

    const amount = parseFloat(withdrawAmount);
    const amountCents = Math.floor(amount * 100);

    if (amountCents < 100) { setMessage({ type: 'error', text: 'O valor mínimo para saque é R$ 1,00.' }); return; }
    if (amountCents > totalBalance.available_balance_cents) { setMessage({ type: 'error', text: 'Saldo insuficiente.' }); return; }

    setIsWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('request-withdrawal', {
        body: { amount, userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Solicitação de saque enviada! O valor será creditado em breve.' });
      setWithdrawAmount('');
      setTimeout(() => loadBalanceData(), 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao processar saque: ' + (error.message || 'Tente novamente.') });
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleBuyWithBalance() {
    if (!selectedPackage) { setMessage({ type: 'error', text: 'Selecione um pacote.' }); return; }
    const pkg = availablePackages.find(p => p.id === selectedPackage);
    if (!pkg) return;
    if (pkg.price_cents > totalBalance.available_balance_cents) { setMessage({ type: 'error', text: 'Saldo insuficiente.' }); return; }

    setIsBuyingWithBalance(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('purchase-with-balance', {
        body: { package_id: selectedPackage },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      setMessage({ type: 'success', text: `✅ ${pkg.name} ativado! ${pkg.interactions.toLocaleString('pt-BR')} créditos adicionados.` });
      setSelectedPackage(null);
      setTimeout(() => loadBalanceData(), 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao processar compra.' });
    } finally {
      setIsBuyingWithBalance(false);
    }
  }

  async function handleSaveAutoRecharge() {
    if (!autoRecharge.package_id) { setMessage({ type: 'error', text: 'Selecione um pacote para a recarga automática.' }); return; }

    setIsSavingAuto(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('auto_recharge_settings')
        .upsert({
          user_id: userId,
          enabled: autoRecharge.enabled,
          threshold: autoRecharge.threshold,
          package_id: autoRecharge.package_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setMessage({
        type: 'success',
        text: autoRecharge.enabled
          ? `✅ Recarga automática ativada! Será recarregado quando restar ${autoRecharge.threshold} crédito${autoRecharge.threshold > 1 ? 's' : ''}.`
          : '✅ Recarga automática desativada.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar configuração.' });
    } finally {
      setIsSavingAuto(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const fee = withdrawAmount ? parseFloat(withdrawAmount) * 0.01 : 0;
  const netAmount = withdrawAmount ? parseFloat(withdrawAmount) - fee : 0;
  const pixKey = userProfile?.withdrawal_pix_key;
  const autoRechargePkg = availablePackages.find(p => p.id === autoRecharge.package_id);

  const typeCounts = {
    all: allTransactions.length,
    pix: allTransactions.filter(tx => tx.source === 'pix').length,
    outros: allTransactions.filter(tx => tx.source === 'cobranca').length,
  };
  const statusCounts = {
    confirmed: allTransactions.filter(tx => tx.status === 'confirmed' || tx.status === 'transferred' || tx.status === 'PAGA').length,
    cancelled: allTransactions.filter(tx => tx.status === 'cancelled' || tx.status === 'expired' || tx.status === 'CANCELADA').length,
    all: allTransactions.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recebimentos</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie seus recebimentos e solicite saque imediato</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPixLinkModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Link de Cobrança
            </button>
            <button
              onClick={loadBalanceData}
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Cards de resumo ──────────────────────────────────────────────── */}
        <div className={`grid grid-cols-1 ${hasVendasCompany ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Disponível</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.available_balance_cents)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Considera apenas recebimentos via PIX</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Recebido</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.total_received_cents)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Considera apenas recebimentos via PIX</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
                <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sacado</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.total_transferred_cents)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total sacado em todo o período</p>
          </div>

          {hasVendasCompany && (
            <div className="bg-lime-50 dark:bg-lime-500/5 rounded-2xl p-6 shadow-xl border border-lime-200 dark:border-lime-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-lime-100 dark:bg-lime-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                </div>
                <p className="text-sm font-medium text-lime-800 dark:text-lime-500">Comissões (Vendas)</p>
              </div>
              <p className="text-3xl font-bold text-lime-900 dark:text-lime-400">
                {formatCurrency(totalCommissionCents)}
              </p>
              <p className="text-xs text-lime-700 dark:text-lime-500/70 mt-2">Comissões pendentes</p>
            </div>
          )}
        </div>

        {/* ── Tabs principais ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                activeTab === 'historico'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Histórico de Transações
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                activeTab === 'withdraw'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Saque e Créditos
            </button>
          </div>

          <div className="p-8">

            {/* ════════════════════════════════════════════════════════
                ABA: HISTÓRICO
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'historico' && (
              <div className="space-y-5">

                {/* Filtro tipo + assistente */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {([
                      { key: 'all',    label: `Todos (${typeCounts.all})` },
                      { key: 'pix',    label: `PIX (${typeCounts.pix})` },
                      { key: 'outros', label: `Outros (${typeCounts.outros})` },
                    ] as { key: TypeFilter; label: string }[]).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setTypeFilter(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          typeFilter === opt.key
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 ring-2 ring-blue-500'
                            : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {companies.length > 1 && (
                    <>
                      <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-white/10" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <button
                          onClick={() => setCompanyFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            companyFilter === 'all'
                              ? 'bg-slate-200 text-slate-700 dark:bg-white/20 dark:text-white ring-2 ring-slate-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          Todos
                        </button>
                        {companies.map((c, i) => (
                          <button
                            key={c.id}
                            onClick={() => setCompanyFilter(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              companyFilter === c.id
                                ? `${COMPANY_COLORS[i % COMPANY_COLORS.length]} ring-2 ring-offset-1 ring-current`
                                : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Filtro status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status:</span>
                  {([
                    { key: 'confirmed', label: `Confirmados (${statusCounts.confirmed})`, color: 'green' },
                    { key: 'cancelled', label: `Cancelados (${statusCounts.cancelled})`,  color: 'red' },
                    { key: 'all',       label: `Todos (${statusCounts.all})`,              color: 'blue' },
                  ] as { key: StatusFilter; label: string; color: string }[]).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setStatusFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === opt.key
                          ? opt.color === 'green'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 ring-2 ring-green-500'
                            : opt.color === 'red'
                              ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 ring-2 ring-red-500'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 ring-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Tabela */}
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma transação encontrada para os filtros selecionados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-white/5">
                          <th className="pb-4 font-bold">Data</th>
                          <th className="pb-4 font-bold">Tipo</th>
                          {companies.length > 1 && <th className="pb-4 font-bold">Assistente</th>}
                          <th className="pb-4 font-bold">Valor</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 font-bold">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows: React.ReactNode[] = [];
                          let lastDay = '';
                          let dayReceived = 0;
                          let dayWithdrawn = 0;
                          let dayGroup: UnifiedTransaction[] = [];
                          const colSpan = companies.length > 1 ? 6 : 5;

                          const flushDay = (day: string, group: UnifiedTransaction[], received: number, withdrawn: number) => {
                            rows.push(
                              <tr key={`sep-${day}`}>
                                <td colSpan={colSpan} className="pt-5 pb-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      {new Date(day + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
                                        timeZone: 'America/Sao_Paulo',
                                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                                      })}
                                    </span>
                                    <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
                                    {received > 0 && (
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        Recebido: <span className="text-green-600 dark:text-green-400">{formatCurrency(received)}</span>
                                      </span>
                                    )}
                                    {received > 0 && withdrawn > 0 && (
                                      <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                                    )}
                                    {withdrawn > 0 && (
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        Sacado: <span className="text-orange-500 dark:text-orange-400">{formatCurrency(withdrawn)}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                            group.forEach(tx => {
                              rows.push(
                                <tr key={tx.id} className="text-sm border-t border-gray-100 dark:border-white/5">
                                  <td className="py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    {new Date(tx.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                  </td>
                                  <td className="py-4">{getTipoBadge(tx)}</td>
                                  {companies.length > 1 && <td className="py-4">{getCompanyBadge(tx)}</td>}
                                  <td className={`py-4 font-bold whitespace-nowrap ${
                                    tx.is_withdrawal || tx.is_consulta_fee
                                      ? 'text-red-500 dark:text-red-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {(tx.is_withdrawal || tx.is_consulta_fee) ? '−' : ''}{formatCurrency(tx.amount_cents)}
                                    {tx.is_vendas && tx.comissao_cents && (
                                      <div className="text-[11px] font-medium text-amber-500 dark:text-amber-400 mt-0.5">
                                        Comissão minhAi: {formatCurrency(tx.comissao_cents)} (10%)
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4">{getStatusBadge(tx)}</td>
                                  <td className="py-4 text-gray-500 dark:text-gray-500 font-mono text-xs max-w-[160px] truncate">
                                    {tx.notes || (tx.pix_key ? formatPixKey(tx.pix_key) : '—')}
                                  </td>
                                </tr>
                              );
                            });
                          };

                          filteredTransactions.forEach(tx => {
                            const day = toSaoPauloDateKey(tx.date);
                            if (day !== lastDay) {
                              if (lastDay) flushDay(lastDay, dayGroup, dayReceived, dayWithdrawn);
                              lastDay = day;
                              dayReceived = 0;
                              dayWithdrawn = 0;
                              dayGroup = [];
                            }
                            const isConfirmed = tx.status === 'confirmed' || tx.status === 'transferred' || tx.status === 'PAGA';
                            if (isConfirmed) {
                              if (tx.is_withdrawal) {
                                dayWithdrawn += tx.amount_cents;
                              } else {
                                dayReceived += tx.amount_cents;
                              }
                            }
                            dayGroup.push(tx);
                          });
                          if (lastDay) flushDay(lastDay, dayGroup, dayReceived, dayWithdrawn);

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition disabled:opacity-50"
                    >
                      {isLoadingMore
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Carregando...</>
                        : <><ChevronDown className="w-4 h-4" />Carregar mais 50</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                ABA: SAQUE E CRÉDITOS
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'withdraw' && (
              <div className="max-w-2xl mx-auto space-y-6">

                {message && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  }`}>
                    {message.type === 'success'
                      ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                {/* Sub-tabs */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                  {([
                    { key: 'withdraw', label: 'Saque PIX' },
                    { key: 'buy',      label: 'Comprar com Saldo' },
                    { key: 'auto',     label: 'Recarga Automática' },
                  ] as { key: WithdrawTab; label: string }[]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveWithdrawTab(tab.key); setMessage(null); }}
                      className={`flex-1 py-2.5 text-xs font-semibold transition ${
                        activeWithdrawTab === tab.key
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── SAQUE PIX ──────────────────────────────────────── */}
                {activeWithdrawTab === 'withdraw' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-blue-800 dark:text-blue-300">Saldo Disponível Total</span>
                        <span className="text-xl font-bold text-blue-900 dark:text-white">{formatCurrency(totalBalance.available_balance_cents)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-700 dark:text-blue-400">
                        <span>Chave Pix</span>
                        <span className="font-mono">{pixKey ? formatPixKey(pixKey) : 'Não configurada'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Valor do Saque (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                        <input
                          type="number" step="0.01" value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-lg font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2 border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Taxa de Serviço (1%)</span>
                          <span className="text-red-500 font-medium">-{fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-white/10 pt-2">
                          <span className="text-gray-900 dark:text-white">Valor Líquido</span>
                          <span className="text-green-600 dark:text-green-400">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !pixKey || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isWithdrawing ? <><Loader2 className="w-5 h-5 animate-spin" />Processando...</> : <><Download className="w-5 h-5" />Solicitar Saque</>}
                    </button>
                    {!pixKey && <p className="text-center text-xs text-red-500 font-medium">⚠️ Configure sua chave Pix no Perfil para habilitar saques.</p>}
                  </div>
                )}

                {/* ── COMPRAR COM SALDO ──────────────────────────────── */}
                {activeWithdrawTab === 'buy' && (
                  <div className="space-y-5">
                    <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/10 flex justify-between items-center">
                      <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">Saldo disponível</span>
                      <span className="text-xl font-bold text-blue-900 dark:text-white">{formatCurrency(totalBalance.available_balance_cents)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Selecione um pacote — <strong>sem taxa de serviço</strong>. O valor é debitado do seu saldo e os créditos são ativados instantaneamente.
                    </p>

                    {availablePackages.length === 0 ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" /></div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availablePackages.map(pkg => {
                          const isSelected = selectedPackage === pkg.id;
                          const canAfford = pkg.price_cents <= totalBalance.available_balance_cents;
                          return (
                            <button key={pkg.id}
                              onClick={() => canAfford && setSelectedPackage(isSelected ? null : pkg.id)}
                              disabled={!canAfford}
                              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                  : canAfford ? 'border-gray-200 dark:border-white/10 hover:border-blue-300 bg-white dark:bg-white/5'
                                  : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {pkg.is_highlighted && (
                                <span className="absolute -top-2 right-3 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{pkg.name}</p>
                                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {pkg.interactions.toLocaleString('pt-BR')} créditos{pkg.package_type === 'monthly' && ' · 30 dias'}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`font-bold text-base ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(pkg.price_cents)}</p>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto mt-1" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedPackage && (() => {
                      const pkg = availablePackages.find(p => p.id === selectedPackage)!;
                      return (
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Pacote</span><span className="font-semibold text-gray-900 dark:text-white">{pkg.name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Créditos</span><span className="font-semibold text-gray-900 dark:text-white">+{pkg.interactions.toLocaleString('pt-BR')}</span></div>
                          {pkg.package_type === 'monthly' && <div className="flex justify-between"><span className="text-gray-500">Validade</span><span className="font-semibold text-gray-900 dark:text-white">30 dias</span></div>}
                          <div className="flex justify-between"><span className="text-gray-500">Taxa</span><span className="font-semibold text-green-600 dark:text-green-400">Sem taxa</span></div>
                          <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 font-bold">
                            <span className="text-gray-900 dark:text-white">Débito no saldo</span>
                            <span className="text-red-500">-{formatCurrency(pkg.price_cents)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900 dark:text-white">Saldo após compra</span>
                            <span className="text-gray-900 dark:text-white">{formatCurrency(totalBalance.available_balance_cents - pkg.price_cents)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={handleBuyWithBalance}
                      disabled={isBuyingWithBalance || !selectedPackage}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isBuyingWithBalance ? <><Loader2 className="w-5 h-5 animate-spin" />Processando...</> : <><Zap className="w-5 h-5" />Confirmar Compra com Saldo</>}
                    </button>
                  </div>
                )}

                {/* ── RECARGA AUTOMÁTICA ─────────────────────────────── */}
                {activeWithdrawTab === 'auto' && (
                  <div className="space-y-6">
                    {!autoRechargeLoaded ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                    ) : (
                      <>
                        {/* Toggle card */}
                        <div className={`rounded-2xl p-5 border flex items-start justify-between gap-4 ${
                          autoRecharge.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                        }`}>
                          <div>
                            <p className={`text-sm font-bold ${autoRecharge.enabled ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                              Recarga Automática {autoRecharge.enabled ? 'Ativada' : 'Desativada'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {autoRecharge.enabled && autoRechargePkg
                                ? `Recarrega "${autoRechargePkg.name}" quando restar ${autoRecharge.threshold} crédito${autoRecharge.threshold > 1 ? 's' : ''}.`
                                : 'Configure abaixo para recarregar automaticamente usando seu saldo.'}
                            </p>
                            {userCredits !== null && (
                              <p className="text-xs font-semibold mt-2 text-gray-600 dark:text-gray-400">
                                Créditos atuais:{' '}
                                <span className={userCredits <= autoRecharge.threshold ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                                  {userCredits}
                                </span>
                              </p>
                            )}
                          </div>
                          <button onClick={() => setAutoRecharge(prev => ({ ...prev, enabled: !prev.enabled }))}>
                            {autoRecharge.enabled
                              ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                              : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                          </button>
                        </div>

                        {/* Threshold */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Recarregar quando restar</label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">A verificação acontece de hora em hora automaticamente.</p>
                          <div className="grid grid-cols-4 gap-2">
                            {THRESHOLD_OPTIONS.map(t => (
                              <button key={t}
                                onClick={() => setAutoRecharge(prev => ({ ...prev, threshold: t }))}
                                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                  autoRecharge.threshold === t
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                                }`}
                              >
                                {t} {t === 1 ? 'crédito' : 'créditos'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Pacote */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pacote a recarregar</label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">O valor será debitado automaticamente do seu saldo disponível.</p>
                          {availablePackages.length === 0 ? (
                            <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto" /></div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {availablePackages.map(pkg => {
                                const isSelected = autoRecharge.package_id === pkg.id;
                                const canAfford = pkg.price_cents <= totalBalance.available_balance_cents;
                                return (
                                  <button key={pkg.id}
                                    onClick={() => setAutoRecharge(prev => ({ ...prev, package_id: pkg.id }))}
                                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                      isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                        : 'border-gray-200 dark:border-white/10 hover:border-blue-300 bg-white dark:bg-white/5'
                                    }`}
                                  >
                                    {pkg.is_highlighted && (
                                      <span className="absolute -top-2 right-3 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
                                    )}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{pkg.name}</p>
                                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                          {pkg.interactions.toLocaleString('pt-BR')} créditos{pkg.package_type === 'monthly' && ' · 30 dias'}
                                        </p>
                                        {!canAfford && <p className="text-[10px] text-red-400 mt-1">Saldo insuficiente</p>}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className={`font-bold text-base ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(pkg.price_cents)}</p>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto mt-1" />}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Resumo */}
                        {autoRecharge.package_id && autoRechargePkg && (
                          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Dispara quando</span><span className="font-semibold text-gray-900 dark:text-white">≤ {autoRecharge.threshold} crédito{autoRecharge.threshold > 1 ? 's' : ''}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Pacote</span><span className="font-semibold text-gray-900 dark:text-white">{autoRechargePkg.name}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Créditos</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">+{autoRechargePkg.interactions.toLocaleString('pt-BR')}</span></div>
                            <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 font-bold">
                              <span className="text-gray-900 dark:text-white">Débito no saldo</span>
                              <span className="text-red-500">-{formatCurrency(autoRechargePkg.price_cents)}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-500">Verificação</span><span className="font-semibold text-gray-900 dark:text-white">De hora em hora</span></div>
                          </div>
                        )}

                        <button
                          onClick={handleSaveAutoRecharge}
                          disabled={isSavingAuto || !autoRecharge.package_id}
                          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                          {isSavingAuto ? <><Loader2 className="w-5 h-5 animate-spin" />Salvando...</> : <><Settings className="w-5 h-5" />Salvar Configuração</>}
                        </button>
                      </>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>

      {pixLinkModalOpen && <PixLinkModal onClose={() => setPixLinkModalOpen(false)} />}
    </div>
  );
}
