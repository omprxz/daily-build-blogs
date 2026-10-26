import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useTheme } from '../store/themeContext.js';
import {
  Globe,
  Gauge,
  Zap,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Laptop,
  Tablet,
  Smartphone,
  TrendingUp,
  BarChart3,
  Layers,
  Settings,
  Key,
  HelpCircle,
  Info,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  ArrowRight,
  Activity,
  Award,
  ChevronRight,
  ChevronDown,
  Users,
  Timer,
  Target,
  MousePointer,
  Eye,
  Percent,
  PieChart,
} from 'lucide-react';

interface ManagedSite {
  id: string;
  name: string;
  url: string;
  gscPropertyUrl?: string;
  ga4PropertyId?: string;
  ga4MeasurementId?: string;
  isDefault: boolean;
  notes?: string;
}

interface CoreWebVital {
  name: string;
  acronym: string;
  value: number;
  unit: string;
  displayValue: string;
  status: 'good' | 'needs-improvement' | 'poor';
  thresholds: { good: number; poor: number };
  description: string;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  savingsMs?: number;
  savingsBytes?: number;
}

interface LighthouseAudit {
  id?: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: Record<string, CoreWebVital>;
  opportunities: Opportunity[];
  diagnostics: Array<{ id: string; title: string; displayValue?: string }>;
  auditedAt: string;
  isCached?: boolean;
}

export const SitesManager: React.FC = () => {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tabs
  type MainTab = 'lighthouse' | 'search_console' | 'google_analytics' | 'ai_insights' | 'setup_guide' | 'manage_sites';
  const initialTab = (searchParams.get('tab') as MainTab) || 'lighthouse';
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);

  // Sites state
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('db_last_selected_site_id') : '') || '';
  });
  const [loadingSites, setLoadingSites] = useState(true);

  // Lighthouse state
  const [auditUrl, setAuditUrl] = useState('');
  const [strategyTab, setStrategyTab] = useState<'mobile' | 'desktop'>('mobile');
  const [mobileAudit, setMobileAudit] = useState<LighthouseAudit | null>(null);
  const [desktopAudit, setDesktopAudit] = useState<LighthouseAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState('');
  const [auditHistory, setAuditHistory] = useState<LighthouseAudit[]>([]);

  // Search Console state
  const [gscStatus, setGscStatus] = useState<any>(null);
  const [gscProperties, setGscProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('db_last_gsc_property') : '') || '';
  });
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '28d' | '3m' | '6m'>('24h');
  const [comparePeriod, setComparePeriod] = useState(true);
  const [gscData, setGscData] = useState<any>(null);
  const [loadingGsc, setLoadingGsc] = useState(false);
  const [gscTableTab, setGscTableTab] = useState<'queries' | 'pages' | 'countries' | 'devices'>('queries');

  // Google Analytics 4 (GA4) state
  const [ga4Status, setGa4Status] = useState<any>(null);
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [selectedGA4Property, setSelectedGA4Property] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('db_last_ga4_property') : '') || '';
  });
  const [ga4DateRange, setGa4DateRange] = useState<'24h' | '7d' | '28d' | '3m' | '6m'>('24h');
  const [ga4ComparePeriod, setGa4ComparePeriod] = useState(true);
  const [ga4Data, setGa4Data] = useState<any>(null);
  const [loadingGA4, setLoadingGA4] = useState(false);
  const [ga4TableTab, setGa4TableTab] = useState<'channels' | 'pages' | 'countries' | 'devices' | 'events'>('channels');

  // AI Insights state
  const [aiReport, setAiReport] = useState<any>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Setup Guide state
  const [setupData, setSetupData] = useState<any>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Site modal / creation
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteGscProperty, setNewSiteGscProperty] = useState('');
  const [newSiteGA4Property, setNewSiteGA4Property] = useState('');
  const [newSiteGA4Measurement, setNewSiteGA4Measurement] = useState('');
  const [newSiteIsDefault, setNewSiteIsDefault] = useState(false);
  const [savingSite, setSavingSite] = useState(false);

  // URL notification banners (from Google OAuth callbacks)
  const gscParam = searchParams.get('gsc');
  const gscMsg = searchParams.get('msg');
  const gscEmail = searchParams.get('email');

  const ga4Param = searchParams.get('ga4');
  const ga4Msg = searchParams.get('msg');
  const ga4Email = searchParams.get('email');

  // Selected site object
  const currentSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) || sites[0] || null,
    [sites, selectedSiteId]
  );

  // Active fetch race-condition trackers
  const activeGscFetchRef = useRef<number>(0);
  const activeGA4FetchRef = useRef<number>(0);

  // Sync tab with URL
  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);

    if (tab === 'search_console') {
      const propToLoad = selectedProperty || localStorage.getItem('db_last_gsc_property') || (gscProperties[0]?.siteUrl);
      loadGscAnalytics(propToLoad, dateRange, comparePeriod);
    } else if (tab === 'google_analytics' || tab === 'ai_insights') {
      const propToLoad = selectedGA4Property || localStorage.getItem('db_last_ga4_property') || ga4Status?.selectedPropertyId || (ga4Properties[0]?.cleanId);
      loadGA4Analytics(propToLoad || '', ga4DateRange, ga4ComparePeriod);
    }
  };

  // 1. Initial Load: Sites, GSC Status, GA4 Status, Setup Guide
  useEffect(() => {
    loadSites();
    loadGscStatus();
    loadGA4Status();
    loadSetupStatus();
  }, []);

  // When selected site changes, load its overview and restore associated properties
  useEffect(() => {
    if (currentSite) {
      setAuditUrl(currentSite.url);
      if (currentSite.gscPropertyUrl) {
        setSelectedProperty(currentSite.gscPropertyUrl);
        localStorage.setItem('db_last_gsc_property', currentSite.gscPropertyUrl);
      }
      if (currentSite.ga4PropertyId) {
        setSelectedGA4Property(currentSite.ga4PropertyId);
        localStorage.setItem('db_last_ga4_property', currentSite.ga4PropertyId);
      }
      loadSiteOverview(currentSite.id);
    }
  }, [selectedSiteId]);

  // When Search Console property, date range, or tab changes, fetch telemetry
  useEffect(() => {
    if (activeTab === 'search_console') {
      const prop = selectedProperty || localStorage.getItem('db_last_gsc_property') || (gscProperties[0]?.siteUrl);
      if (prop) {
        if (prop !== selectedProperty) {
          setSelectedProperty(prop);
        }
        loadGscAnalytics(prop, dateRange, comparePeriod);
      }
    }
  }, [selectedProperty, dateRange, comparePeriod, activeTab]);

  // When GA4 property, date range, or tab changes, fetch analytics
  useEffect(() => {
    if (activeTab === 'google_analytics' || activeTab === 'ai_insights') {
      const prop = selectedGA4Property || localStorage.getItem('db_last_ga4_property') || ga4Status?.selectedPropertyId || (ga4Properties[0]?.cleanId);
      if (prop && prop !== selectedGA4Property) {
        setSelectedGA4Property(prop);
      }
      loadGA4Analytics(prop || '', ga4DateRange, ga4ComparePeriod);
    }
  }, [selectedGA4Property, ga4DateRange, ga4ComparePeriod, activeTab]);

  const loadSites = async () => {
    setLoadingSites(true);
    try {
      const res = await api.getSites();
      if (res?.sites && res.sites.length > 0) {
        setSites(res.sites);
        const storedSiteId = localStorage.getItem('db_last_selected_site_id');
        const matched = res.sites.find((s: any) => s.id === storedSiteId);
        const def = matched || res.sites.find((s: any) => s.isDefault) || res.sites[0];
        if (def) {
          setSelectedSiteId(def.id);
          localStorage.setItem('db_last_selected_site_id', def.id);
          setAuditUrl(def.url);
          const storedGsc = localStorage.getItem('db_last_gsc_property');
          const gscToUse = storedGsc || def.gscPropertyUrl || '';
          if (gscToUse) {
            setSelectedProperty(gscToUse);
            localStorage.setItem('db_last_gsc_property', gscToUse);
          }
          const storedGa4 = localStorage.getItem('db_last_ga4_property');
          const ga4ToUse = storedGa4 || def.ga4PropertyId || '';
          if (ga4ToUse) {
            setSelectedGA4Property(ga4ToUse);
            localStorage.setItem('db_last_ga4_property', ga4ToUse);
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not load sites:', err.message);
    } finally {
      setLoadingSites(false);
    }
  };

  const loadSiteOverview = async (siteId: string) => {
    try {
      const overview = await api.getSiteOverview(siteId);
      if (overview?.mobileAudit) setMobileAudit(overview.mobileAudit);
      if (overview?.desktopAudit) setDesktopAudit(overview.desktopAudit);
      if (overview?.gscStatus) setGscStatus(overview.gscStatus);
      if (overview?.ga4Status) setGa4Status(overview.ga4Status);
    } catch (err: any) {
      console.warn('Overview load error:', err.message);
    }
  };

  const loadGscStatus = async () => {
    try {
      const status = await api.getGscStatus();
      setGscStatus(status);
      const props = await api.getGscProperties();
      if (props?.properties && props.properties.length > 0) {
        setGscProperties(props.properties);
        const stored = localStorage.getItem('db_last_gsc_property');
        const matchedStored = props.properties.find((p: any) => p.siteUrl === stored);
        const currentProp = (matchedStored ? stored : null) || selectedProperty || props.properties[0].siteUrl;
        if (currentProp) {
          setSelectedProperty(currentProp);
          localStorage.setItem('db_last_gsc_property', currentProp);
        }
      }
    } catch (err: any) {
      console.warn('GSC status error:', err.message);
    }
  };

  const loadGA4Status = async () => {
    try {
      const status = await api.getGA4Status();
      setGa4Status(status);
      const props = await api.getGA4Properties();
      if (props?.properties && props.properties.length > 0) {
        setGa4Properties(props.properties);
        const stored = localStorage.getItem('db_last_ga4_property');
        const matchedStored = props.properties.find((p: any) => p.cleanId === stored || p.propertyId === stored);
        const currentProp = (matchedStored ? matchedStored.cleanId : null) || status.selectedPropertyId || selectedGA4Property || props.properties[0].cleanId;
        if (currentProp) {
          setSelectedGA4Property(currentProp);
          localStorage.setItem('db_last_ga4_property', currentProp);
        }
      } else if (status.selectedPropertyId) {
        setSelectedGA4Property(status.selectedPropertyId);
        localStorage.setItem('db_last_ga4_property', status.selectedPropertyId);
      }
    } catch (err: any) {
      console.warn('GA4 status error:', err.message);
    }
  };

  const loadSetupStatus = async () => {
    setLoadingSetup(true);
    try {
      const data = await api.getSitesSetupStatus();
      setSetupData(data);
    } catch (err: any) {
      console.warn('Setup status error:', err.message);
    } finally {
      setLoadingSetup(false);
    }
  };

  const loadGscAnalytics = async (propertyUrl?: string, range = dateRange, compare = comparePeriod, forceRefresh = false) => {
    const fetchId = ++activeGscFetchRef.current;
    const targetProperty = (
      propertyUrl ||
      selectedProperty ||
      localStorage.getItem('db_last_gsc_property') ||
      currentSite?.gscPropertyUrl ||
      currentSite?.url ||
      'https://blogs.dailybuild.tech'
    ).trim();

    setLoadingGsc(true);
    try {
      let days = 28;
      if (range === '24h') days = 1;
      if (range === '7d') days = 7;
      if (range === '3m') days = 90;
      if (range === '6m') days = 180;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0];

      // For 24h, target yesterday to today (last 24 hours); for other ranges, end on today
      const endDate = today;
      const startDate = range === '24h'
        ? yesterday
        : new Date(Date.now() - days * 86400 * 1000).toISOString().split('T')[0];

      const data = await api.queryGscAnalytics({
        propertyUrl: targetProperty,
        startDate,
        endDate,
        compare,
        forceRefresh,
      });

      if (fetchId === activeGscFetchRef.current) {
        setGscData(data);
      }
    } catch (err: any) {
      console.error('Failed to load GSC analytics:', err.message);
    } finally {
      if (fetchId === activeGscFetchRef.current) {
        setLoadingGsc(false);
      }
    }
  };

  const loadGA4Analytics = async (propertyId?: string, range = ga4DateRange, compare = ga4ComparePeriod, forceRefresh = false) => {
    const fetchId = ++activeGA4FetchRef.current;
    setLoadingGA4(true);
    const targetProperty = (
      propertyId !== undefined
        ? propertyId
        : (selectedGA4Property || localStorage.getItem('db_last_ga4_property') || currentSite?.ga4PropertyId || '')
    ).trim();

    try {
      let days = 28;
      if (range === '24h') days = 1;
      if (range === '7d') days = 7;
      if (range === '3m') days = 90;
      if (range === '6m') days = 180;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0];

      // For 24h, target yesterday to today (last 24 hours); for other ranges, end on today
      const endDate = today;
      const startDate = range === '24h'
        ? yesterday
        : new Date(Date.now() - days * 86400 * 1000).toISOString().split('T')[0];

      const data = await api.queryGA4Analytics({
        propertyId: targetProperty || undefined,
        startDate,
        endDate,
        compare,
        forceRefresh,
      });

      if (fetchId === activeGA4FetchRef.current) {
        setGa4Data(data);
      }
    } catch (err: any) {
      console.error('Failed to load GA4 analytics:', err.message);
    } finally {
      if (fetchId === activeGA4FetchRef.current) {
        setLoadingGA4(false);
      }
    }
  };

  // Run Lighthouse Audit
  const handleRunAudit = async (forceRefresh = false) => {
    if (!auditUrl) return;
    setAuditing(true);
    setAuditProgress('Connecting to Google PageSpeed Insights API in parallel...');

    try {
      setAuditProgress('Running parallel Mobile & Desktop audits via Google Lighthouse...');
      const res = await api.runLighthouseAudit({
        url: auditUrl,
        strategy: 'both',
        forceRefresh,
        siteId: currentSite?.id,
      });

      if (res?.results) {
        if (!('error' in res.results.mobile)) {
          setMobileAudit(res.results.mobile);
        }
        if (!('error' in res.results.desktop)) {
          setDesktopAudit(res.results.desktop);
        }
      }

      setAuditProgress('Audit completed successfully.');
      loadAuditHistory(auditUrl);
    } catch (err: any) {
      alert(`Lighthouse Audit Error: ${err.message}`);
    } finally {
      setAuditing(false);
      setAuditProgress('');
    }
  };

  const loadAuditHistory = async (url: string) => {
    try {
      const res = await api.getLighthouseHistory({ url, limit: 10 });
      if (res?.audits) setAuditHistory(res.audits);
    } catch (err: any) {
      console.warn('History error:', err.message);
    }
  };

  // Run AI Guidance
  const handleGenerateAIInsights = async () => {
    setGeneratingAi(true);
    try {
      const report = await api.generateSiteAIInsights({
        siteUrl: auditUrl || currentSite?.url || 'https://blogs.dailybuild.tech',
        mobileLighthouse: mobileAudit,
        desktopLighthouse: desktopAudit,
        searchConsole: gscData,
        googleAnalytics: ga4Data,
      });
      setAiReport(report);
      setActiveTab('ai_insights');
    } catch (err: any) {
      alert(`AI Guidance Error: ${err.message}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  // GSC OAuth Connect & Disconnect
  const handleConnectGoogle = async () => {
    try {
      const res = await api.getGscAuthUrl();
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      alert(`OAuth URL Error: ${err.message}. Please configure GOOGLE_CLIENT_ID in server/.env.`);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console?')) return;
    try {
      await api.disconnectGsc();
      setGscStatus((prev: any) => ({ ...prev, isConnected: false, email: null }));
      setGscData(null);
      alert('Google Search Console disconnected.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // GA4 OAuth Connect & Disconnect
  const handleConnectGA4 = async () => {
    try {
      const res = await api.getGA4AuthUrl();
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      alert(`GA4 OAuth URL Error: ${err.message}. Please configure GOOGLE_CLIENT_ID in server/.env.`);
    }
  };

  const handleDisconnectGA4 = async () => {
    if (!confirm('Are you sure you want to disconnect Google Analytics 4?')) return;
    try {
      await api.disconnectGA4();
      setGa4Status((prev: any) => ({ ...prev, isConnected: false, email: null, selectedPropertyId: null }));
      setGa4Data(null);
      alert('Google Analytics 4 disconnected.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    localStorage.setItem('db_last_selected_site_id', siteId);
    const siteObj = sites.find((s) => s.id === siteId);
    if (siteObj) {
      setAuditUrl(siteObj.url);
      if (siteObj.gscPropertyUrl) {
        setSelectedProperty(siteObj.gscPropertyUrl);
        localStorage.setItem('db_last_gsc_property', siteObj.gscPropertyUrl);
        if (activeTab === 'search_console') {
          loadGscAnalytics(siteObj.gscPropertyUrl, dateRange, comparePeriod, true);
        }
      }
      if (siteObj.ga4PropertyId) {
        setSelectedGA4Property(siteObj.ga4PropertyId);
        localStorage.setItem('db_last_ga4_property', siteObj.ga4PropertyId);
        if (activeTab === 'google_analytics' || activeTab === 'ai_insights') {
          loadGA4Analytics(siteObj.ga4PropertyId, ga4DateRange, ga4ComparePeriod, true);
        }
      }
      loadSiteOverview(siteId);
    }
  };

  const handleSelectGscProperty = async (propertyUrl: string) => {
    setSelectedProperty(propertyUrl);
    localStorage.setItem('db_last_gsc_property', propertyUrl);
    if (currentSite?.id) {
      try {
        await api.selectGscProperty({ propertyUrl, siteId: currentSite.id });
        setSites((prev) =>
          prev.map((s) => (s.id === currentSite.id ? { ...s, gscPropertyUrl: propertyUrl } : s))
        );
      } catch (err: any) {
        console.warn('Could not save GSC property to site:', err.message);
      }
    }
    loadGscAnalytics(propertyUrl, dateRange, comparePeriod, true);
  };

  const handleSelectGA4Property = async (propertyId: string) => {
    setSelectedGA4Property(propertyId);
    localStorage.setItem('db_last_ga4_property', propertyId);
    const propObj = ga4Properties.find((p) => p.cleanId === propertyId || p.propertyId === propertyId);
    if (currentSite?.id) {
      setSites((prev) =>
        prev.map((s) => (s.id === currentSite.id ? { ...s, ga4PropertyId: propertyId } : s))
      );
    }
    try {
      await api.selectGA4Property({
        propertyId,
        displayName: propObj?.displayName,
        siteId: currentSite?.id,
      });
    } catch (err: any) {
      console.warn('Could not save GA4 property selection:', err.message);
    }
    loadGA4Analytics(propertyId, ga4DateRange, ga4ComparePeriod, true);
  };

  // Add Site
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteUrl) return;
    setSavingSite(true);
    try {
      const res = await api.createSite({
        name: newSiteName,
        url: newSiteUrl,
        gscPropertyUrl: newSiteGscProperty,
        ga4PropertyId: newSiteGA4Property,
        ga4MeasurementId: newSiteGA4Measurement,
        isDefault: newSiteIsDefault,
      });
      setShowAddSiteModal(false);
      setNewSiteName('');
      setNewSiteUrl('');
      setNewSiteGscProperty('');
      setNewSiteGA4Property('');
      setNewSiteGA4Measurement('');
      setNewSiteIsDefault(false);
      await loadSites();
      if (res?.site) setSelectedSiteId(res.site.id);
    } catch (err: any) {
      alert(`Failed to create site: ${err.message}`);
    } finally {
      setSavingSite(false);
    }
  };

  // Delete Site
  const handleDeleteSite = async (id: string, name: string) => {
    if (!confirm(`Delete site "${name}"? This will not delete public articles.`)) return;
    try {
      await api.deleteSite(id);
      await loadSites();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Copy Callback URL
  const handleCopyCallbackUrl = () => {
    const url = setupData?.deploymentCallbackUrl || `${window.location.origin}/api/sites/gsc/oauth-callback`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Active Lighthouse audit view (mobile or desktop)
  const currentLighthouse = strategyTab === 'mobile' ? mobileAudit : desktopAudit;

  // Helper for score gauge color
  const getScoreColor = (score: number) => {
    if (score >= 90) return { text: 'text-emerald-500', stroke: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' };
    if (score >= 50) return { text: 'text-amber-500', stroke: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' };
    return { text: 'text-rose-500', stroke: '#EF4444', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800' };
  };

  // Score Circular Gauge Component
  const ScoreGauge: React.FC<{ score: number; label: string; icon: any }> = ({ score, label, icon: Icon }) => {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const colors = getScoreColor(score);

    return (
      <div className="flex flex-col items-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative group hover:border-primary transition-all">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-2xl font-black ${colors.text} tracking-tight`}>{score}</span>
            <Icon className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 text-center">{label}</span>
        <span className={`text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {score >= 90 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* ===================================================================== */}
      {/* Notification Banner (e.g. from Google OAuth callback)                 */}
      {/* ===================================================================== */}
      {gscParam === 'success' && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Google Search Console Connected!
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                Authenticated account: <strong>{gscEmail || 'Your Google Account'}</strong>. Verified properties are now active.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('gsc');
              p.delete('email');
              setSearchParams(p);
            }}
            className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {gscParam === 'error' && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Google Search Console Authorization Issue
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-400">
                {gscMsg || 'OAuth token exchange could not be completed. Check redirect URIs in Google Cloud Console.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('gsc');
              p.delete('msg');
              setSearchParams(p);
            }}
            className="text-xs font-semibold text-rose-800 dark:text-rose-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {ga4Param === 'success' && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Google Analytics 4 Connected!
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                Connected account: <strong>{ga4Email || 'Your Google Account'}</strong>. GA4 properties are now synchronized and ready for analysis.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('ga4');
              p.delete('email');
              setSearchParams(p);
            }}
            className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {ga4Param === 'error' && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Google Analytics 4 Authorization Issue
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-400">
                {ga4Msg || 'OAuth token exchange could not be completed. Check redirect URIs and scopes in Google Cloud Console.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('ga4');
              p.delete('msg');
              setSearchParams(p);
            }}
            className="text-xs font-semibold text-rose-800 dark:text-rose-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Header & Site Selector                                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Sites &amp; Performance Center
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary">
                Automation Module
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Google PageSpeed Lighthouse telemetry, Search Console organic growth metrics &amp; AI-driven optimization.
            </p>
          </div>
        </div>

        {/* Site Selector + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Site:</span>
            <select
              value={selectedSiteId}
              onChange={(e) => handleSelectSite(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-slate-900">
                  {s.name} {s.isDefault ? '★ (Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleRunAudit(true)}
            disabled={auditing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
            <span>{auditing ? 'Auditing...' : 'Run Fast Audit'}</span>
          </button>

          <button
            onClick={handleGenerateAIInsights}
            disabled={generatingAi}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
            <span>{generatingAi ? 'Synthesizing...' : 'AI Guidance'}</span>
          </button>

          <button
            onClick={() => setShowAddSiteModal(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Add New Site"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* Navigation Tabs Pill Bar                                              */}
      {/* ===================================================================== */}
      <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl border border-slate-300/80 dark:border-slate-700 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => handleTabChange('lighthouse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'lighthouse'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Lighthouse Page Insights</span>
        </button>

        <button
          onClick={() => handleTabChange('search_console')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'search_console'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Google Search Console</span>
          {gscStatus?.isConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('google_analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'google_analytics'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Google Analytics 4 (GA4)</span>
          {ga4Status?.isConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('ai_insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'ai_insights'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Agent Guidance</span>
          {aiReport && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              {aiReport.overallHealthGrade}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('setup_guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'setup_guide'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Setup Guide</span>
        </button>

        <button
          onClick={() => handleTabChange('manage_sites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0 ${
            activeTab === 'manage_sites'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Sites ({sites.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: LIGHTHOUSE PAGE INSIGHTS                                   */}
      {/* ===================================================================== */}
      {activeTab === 'lighthouse' && (
        <div className="space-y-6">
          {/* Audit URL Controls Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {/* Mobile / Desktop switcher */}
              <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setStrategyTab('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    strategyTab === 'mobile'
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
                <button
                  onClick={() => setStrategyTab('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    strategyTab === 'desktop'
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              <button
                onClick={() => handleRunAudit(true)}
                disabled={auditing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 ${auditing ? 'animate-bounce' : ''}`} />
                <span>{auditing ? 'Analyzing...' : 'Analyze URL'}</span>
              </button>
            </div>
          </div>

          {/* Auditing Progress / Skeleton */}
          {auditing && (
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  {auditProgress || 'Performing Lighthouse analysis on mobile & desktop targets...'}
                </span>
                <span>Parallel Speed &amp; A11y Scanner</span>
              </div>
              <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Current Audit Results */}
          {currentLighthouse ? (
            <div className="space-y-6">
              {/* Category Gauges Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreGauge
                  score={currentLighthouse.performanceScore}
                  label="Performance"
                  icon={Zap}
                />
                <ScoreGauge
                  score={currentLighthouse.accessibilityScore}
                  label="Accessibility"
                  icon={ShieldCheck}
                />
                <ScoreGauge
                  score={currentLighthouse.bestPracticesScore}
                  label="Best Practices"
                  icon={Award}
                />
                <ScoreGauge
                  score={currentLighthouse.seoScore}
                  label="SEO Score"
                  icon={Search}
                />
              </div>

              {/* Core Web Vitals Section */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Core Web Vitals Assessment ({strategyTab.toUpperCase()})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      Standardized metrics used by Google Search algorithms to evaluate real user page experience.
                    </p>
                  </div>
                  {currentLighthouse.isCached && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Cached snapshot ({new Date(currentLighthouse.auditedAt).toLocaleTimeString()})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(currentLighthouse.coreWebVitals || {}).map(([key, vital]) => {
                    const statusColor =
                      vital.status === 'good'
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        : vital.status === 'needs-improvement'
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                        : 'border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400';

                    const badgeColor =
                      vital.status === 'good'
                        ? 'bg-emerald-500 text-white'
                        : vital.status === 'needs-improvement'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white';

                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-xl border ${statusColor} flex flex-col justify-between space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {vital.name} ({vital.acronym})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeColor}`}>
                            {vital.status.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          {vital.displayValue || `${vital.value} ${vital.unit}`}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {vital.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opportunities & Key Optimization Recommendations */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Key Opportunities &amp; Estimated Savings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      Targeted recommendations that can directly improve your Lighthouse performance rating.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {currentLighthouse.opportunities?.length || 0} issues identified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(currentLighthouse.opportunities || []).length > 0 ? (
                    currentLighthouse.opportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {opp.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {opp.description?.split('[')[0]}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {opp.savingsMs && (
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              ~{(opp.savingsMs / 1000).toFixed(2)}s faster
                            </span>
                          )}
                          {opp.savingsBytes && (
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-primary/15 text-primary">
                              ~{(opp.savingsBytes / 1024).toFixed(0)} KB saved
                            </span>
                          )}
                          {opp.displayValue && !opp.savingsMs && !opp.savingsBytes && (
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {opp.displayValue}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">
                      No high-severity opportunities detected! Your site is performing in top tiers.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Gauge className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  No Audit Cached for This URL Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click <strong>Analyze URL</strong> above to fetch official Google PageSpeed Insights and Lighthouse performance metrics.
                </p>
              </div>
              <button
                onClick={() => handleRunAudit(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Analyze {auditUrl || 'Target Site'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: GOOGLE SEARCH CONSOLE ANALYTICS                            */}
      {/* ===================================================================== */}
      {activeTab === 'search_console' && (
        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  gscStatus?.isConnected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Google Search Console Status
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      gscStatus?.isConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {gscStatus?.isConnected ? 'OAuth Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {gscStatus?.isConnected
                    ? `Connected Account: ${gscStatus.email || 'Authenticated User'} • Real verified properties active`
                    : 'Connect your verified Google account to retrieve real clicks, impressions, CTR, and search queries.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {gscStatus?.isConnected ? (
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                >
                  Disconnect Account
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Connect Google Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Bar: Property, Date Range, Compare */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Property:</span>
              <select
                value={selectedProperty}
                onChange={(e) => handleSelectGscProperty(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                {selectedProperty && !gscProperties.some((p) => p.siteUrl === selectedProperty) && (
                  <option value={selectedProperty}>{selectedProperty} (Saved)</option>
                )}
                {gscProperties.map((p) => (
                  <option key={p.siteUrl} value={p.siteUrl}>
                    {p.siteUrl}
                  </option>
                ))}
                {gscProperties.length === 0 && !selectedProperty && (
                  <option value="">No verified properties</option>
                )}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Date Range pills */}
              <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                {(['24h', '7d', '28d', '3m', '6m'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-2.5 py-1 rounded-md transition-all uppercase text-[11px] ${
                      dateRange === r
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r === '24h' ? '24h' : r}
                  </button>
                ))}
              </div>

              {/* Compare Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={comparePeriod}
                  onChange={(e) => setComparePeriod(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Compare previous period</span>
              </label>

              <button
                onClick={() => loadGscAnalytics(selectedProperty, dateRange, comparePeriod, true)}
                disabled={loadingGsc}
                className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh Search Data"
              >
                <RefreshCw className={`w-4 h-4 ${loadingGsc ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Demo Data Notice if not connected */}
          {gscData?.isDemoData && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Interactive Benchmark Telemetry:</strong> Google OAuth is not yet connected. Showing realistic search dataset for demonstration.
                </span>
              </div>
              <button
                onClick={handleConnectGoogle}
                className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                Connect Now
              </button>
            </div>
          )}

          {/* Search Console Query Notice if any */}
          {gscData?.errorNotice && (
            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>
                  <strong>Search Console Query Notice:</strong> {gscData.errorNotice}
                </span>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loadingGsc && !gscData && (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 h-28" />
                ))}
              </div>
              <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 h-72" />
            </div>
          )}

          {/* Empty State */}
          {!loadingGsc && !gscData && (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Search Analytics Data Available
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Unable to retrieve search metrics for "{selectedProperty || 'current site'}". Ensure your property is verified in Google Search Console, or click refresh below.
              </p>
              <button
                onClick={() => loadGscAnalytics(selectedProperty, dateRange, comparePeriod, true)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm"
              >
                Fetch Search Console Data
              </button>
            </div>
          )}

          {/* Search Console KPI Cards */}
          {gscData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Clicks */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Total Clicks</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {gscData.totalClicks?.toLocaleString() || 0}
                </div>
                {gscData.comparison && (
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span
                      className={
                        gscData.comparison.clicksDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 flex items-center'
                          : 'text-rose-600 dark:text-rose-400 flex items-center'
                      }
                    >
                      {gscData.comparison.clicksDeltaPct >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {gscData.comparison.clicksDeltaPct >= 0 ? '+' : ''}
                      {gscData.comparison.clicksDeltaPct}%
                    </span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </div>
                )}
              </div>

              {/* Total Impressions */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Total Impressions</span>
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {gscData.totalImpressions?.toLocaleString() || 0}
                </div>
                {gscData.comparison && (
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span
                      className={
                        gscData.comparison.impressionsDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 flex items-center'
                          : 'text-rose-600 dark:text-rose-400 flex items-center'
                      }
                    >
                      {gscData.comparison.impressionsDeltaPct >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {gscData.comparison.impressionsDeltaPct >= 0 ? '+' : ''}
                      {gscData.comparison.impressionsDeltaPct}%
                    </span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </div>
                )}
              </div>

              {/* Average CTR */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Average CTR</span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {gscData.averageCtr || 0}%
                </div>
                {gscData.comparison && (
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span
                      className={
                        gscData.comparison.ctrDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 flex items-center'
                          : 'text-rose-600 dark:text-rose-400 flex items-center'
                      }
                    >
                      {gscData.comparison.ctrDeltaPct >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {gscData.comparison.ctrDeltaPct >= 0 ? '+' : ''}
                      {gscData.comparison.ctrDeltaPct}%
                    </span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </div>
                )}
              </div>

              {/* Average Position */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Average Position</span>
                  <Search className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {gscData.averagePosition || 0}
                </div>
                {gscData.comparison && (
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span
                      className={
                        gscData.comparison.positionDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400 flex items-center'
                          : 'text-rose-600 dark:text-rose-400 flex items-center'
                      }
                    >
                      {gscData.comparison.positionDeltaPct >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {gscData.comparison.positionDeltaPct >= 0 ? '+' : ''}
                      {gscData.comparison.positionDeltaPct}%
                    </span>
                    <span className="text-slate-400 font-normal">rank trend</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Time Series Trend Chart (Clicks & Impressions) */}
          {gscData?.timeSeries && gscData.timeSeries.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Organic Performance Trend
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {dateRange === '24h' ? '24-hour clicks & impressions timeline' : 'Daily clicks & impressions timeline'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-primary">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    Clicks
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    Impressions
                  </span>
                </div>
              </div>

              {/* Sparkline / Bar Chart */}
              <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                {(() => {
                  const maxClicks = Math.max(...gscData.timeSeries.map((t: any) => t.clicks), 1);
                  return gscData.timeSeries.map((item: any, idx: number) => {
                    const heightPct = Math.max(6, Math.round((item.clicks / maxClicks) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[12px] flex flex-col items-center gap-1 group relative cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {item.date}: {item.clicks} clicks / {item.impressions} impr ({item.ctr}%)
                        </div>
                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full rounded-t bg-primary group-hover:bg-primary transition-all"
                        />
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{gscData.timeSeries[0]?.date}</span>
                <span>{gscData.timeSeries[gscData.timeSeries.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Breakdown Tabs: Queries, Pages, Countries, Devices */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGscTableTab('queries')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gscTableTab === 'queries'
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Top Queries ({gscData?.topQueries?.length || 0})
                </button>
                <button
                  onClick={() => setGscTableTab('pages')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gscTableTab === 'pages'
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Top Landing Pages ({gscData?.topPages?.length || 0})
                </button>
                <button
                  onClick={() => setGscTableTab('countries')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gscTableTab === 'countries'
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Countries ({gscData?.topCountries?.length || 0})
                </button>
                <button
                  onClick={() => setGscTableTab('devices')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gscTableTab === 'devices'
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Devices
                </button>
              </div>
            </div>

            {/* Table: Queries */}
            {gscTableTab === 'queries' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Search Query</th>
                      <th className="py-2.5 text-right">Clicks</th>
                      <th className="py-2.5 text-right">Impressions</th>
                      <th className="py-2.5 text-right">CTR</th>
                      <th className="py-2.5 text-right">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(gscData?.topQueries || []).map((q: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {q.query}
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {q.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {q.impressions.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-semibold">{q.ctr}%</td>
                        <td className="py-3 text-right font-semibold">{q.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: Pages */}
            {gscTableTab === 'pages' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Landing Page URL</th>
                      <th className="py-2.5 text-right">Clicks</th>
                      <th className="py-2.5 text-right">Impressions</th>
                      <th className="py-2.5 text-right">CTR</th>
                      <th className="py-2.5 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(gscData?.topPages || []).map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
                          <a
                            href={p.page}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary flex items-center gap-1"
                          >
                            <span className="truncate">{p.page}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                          </a>
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {p.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {p.impressions.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-semibold">{p.ctr}%</td>
                        <td className="py-3 text-right font-semibold">{p.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: Countries */}
            {gscTableTab === 'countries' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Country</th>
                      <th className="py-2.5 text-right">Clicks</th>
                      <th className="py-2.5 text-right">Impressions</th>
                      <th className="py-2.5 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(gscData?.topCountries || []).map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {c.countryName} ({c.country})
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {c.clicks.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {c.impressions.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-semibold">{c.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: Devices */}
            {gscTableTab === 'devices' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {(gscData?.devices || []).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {d.device}
                      </span>
                      <span className="text-xs font-black text-primary">
                        {d.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${d.percentage}%` }}
                        className="bg-primary h-full rounded-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{d.clicks.toLocaleString()} clicks</span>
                      <span>{d.impressions.toLocaleString()} impr</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2.5: GOOGLE ANALYTICS 4 (GA4)                                 */}
      {/* ===================================================================== */}
      {activeTab === 'google_analytics' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Google Analytics 4 (GA4) Telemetry
                  </h2>
                  {ga4Status?.isConnected ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected ({ga4Status.email})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <Info className="w-3 h-3" />
                      Benchmark Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official Google Analytics Data API reporting: active users, dwell time, traffic channels, and conversions.
                </p>
              </div>
            </div>

            {/* Quick Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Property Selector */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Property:</span>
                <select
                  value={selectedGA4Property}
                  onChange={(e) => handleSelectGA4Property(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none max-w-xs cursor-pointer"
                >
                  {selectedGA4Property && !ga4Properties.some((p) => p.cleanId === selectedGA4Property || p.propertyId === selectedGA4Property) && (
                    <option value={selectedGA4Property} className="dark:bg-slate-900">
                      {ga4Status?.selectedPropertyName || `Property ${selectedGA4Property}`} (Saved)
                    </option>
                  )}
                  {ga4Properties.length > 0 ? (
                    ga4Properties.map((p, idx) => (
                      <option key={idx} value={p.cleanId} className="dark:bg-slate-900">
                        {p.displayName} ({p.cleanId})
                      </option>
                    ))
                  ) : (
                    <option value={selectedGA4Property || 'demo-property'} className="dark:bg-slate-900">
                      {ga4Status?.selectedPropertyName || (selectedGA4Property ? `Property ${selectedGA4Property}` : 'DailyBuild Production GA4 (Demo)')}
                    </option>
                  )}
                </select>
              </div>

              {/* Date Range Selector */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                {(['24h', '7d', '28d', '3m', '6m'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setGa4DateRange(r)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      ga4DateRange === r
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r === '24h' ? '24H' : r === '7d' ? '7D' : r === '28d' ? '28D' : r === '3m' ? '3M' : '6M'}
                  </button>
                ))}
              </div>

              {/* Compare toggle */}
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ga4ComparePeriod}
                  onChange={(e) => setGa4ComparePeriod(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Compare</span>
              </label>

              {/* Refresh Button */}
              <button
                onClick={() => loadGA4Analytics(selectedGA4Property, ga4DateRange, ga4ComparePeriod, true)}
                disabled={loadingGA4}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                title="Force Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGA4 ? 'animate-spin' : ''}`} />
              </button>

              {/* OAuth Connect/Disconnect Button */}
              {ga4Status?.isConnected ? (
                <button
                  onClick={handleDisconnectGA4}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                >
                  Disconnect GA4
                </button>
              ) : (
                <button
                  onClick={handleConnectGA4}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Connect GA4</span>
                </button>
              )}
            </div>
          </div>

          {/* Benchmark Demo Notice */}
          {ga4Data?.isDemoData && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Verified Production Benchmark Data Active:
                  </span>{' '}
                  The Google Analytics Data API engine is operational. Authorize your Google account to stream real metrics directly from your GA4 properties.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleConnectGA4}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Connect GA4 Account
                </button>
                <button
                  onClick={() => handleTabChange('setup_guide')}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  View Setup Guide
                </button>
              </div>
            </div>
          )}

          {/* GA4 Query Notice if any */}
          {ga4Data?.errorNotice && (
            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>
                  <strong>Google Analytics Query Notice:</strong> {ga4Data.errorNotice}
                </span>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loadingGA4 && !ga4Data && (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 h-24" />
                ))}
              </div>
              <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 h-72" />
            </div>
          )}

          {/* Empty State */}
          {!loadingGA4 && !ga4Data && (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
              <Activity className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Google Analytics 4 Data Available
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Unable to query GA4 data for property "{selectedGA4Property || 'default'}". Click below to trigger a live report query or verify credentials.
              </p>
              <button
                onClick={() => loadGA4Analytics(selectedGA4Property, ga4DateRange, ga4ComparePeriod, true)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm"
              >
                Fetch Google Analytics Data
              </button>
            </div>
          )}

          {/* KPI Cards Grid */}
          {ga4Data && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Active Users */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Active Users</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {ga4Data.activeUsers?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Total: {ga4Data.totalUsers?.toLocaleString() || 0}</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.activeUsersDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.activeUsersDeltaPct >= 0 ? '+' : ''}
                      {ga4Data.comparison.activeUsersDeltaPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Sessions */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Sessions</span>
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {ga4Data.sessions?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Views: {ga4Data.pageViews?.toLocaleString() || 0}</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.sessionsDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.sessionsDeltaPct >= 0 ? '+' : ''}
                      {ga4Data.comparison.sessionsDeltaPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Engagement Rate */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Engagement Rate</span>
                  <Percent className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {ga4Data.engagementRate || 0}%
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Target: &gt;55%</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.engagementRateDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.engagementRateDeltaPct >= 0 ? '+' : ''}
                      {ga4Data.comparison.engagementRateDeltaPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Avg Session Duration */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Avg Duration</span>
                  <Timer className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {Math.floor((ga4Data.averageSessionDuration || 0) / 60)}m{' '}
                  {(ga4Data.averageSessionDuration || 0) % 60}s
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Dwell time</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.avgDurationDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.avgDurationDeltaPct >= 0 ? '+' : ''}
                      {ga4Data.comparison.avgDurationDeltaPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Bounce Rate */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Bounce Rate</span>
                  <MousePointer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {ga4Data.bounceRate || 0}%
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Benchmark &lt;45%</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.bounceRateDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.bounceRateDeltaPct >= 0 ? '-' : '+'}
                      {Math.abs(ga4Data.comparison.bounceRateDeltaPct)}%
                    </span>
                  )}
                </div>
              </div>

              {/* 6. Conversions */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Conversions</span>
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {ga4Data.conversions?.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Goal actions</span>
                  {ga4Data.comparison && (
                    <span
                      className={`font-bold flex items-center ${
                        ga4Data.comparison.conversionsDeltaPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ga4Data.comparison.conversionsDeltaPct >= 0 ? '+' : ''}
                      {ga4Data.comparison.conversionsDeltaPct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Timeline Chart (Sessions & Active Users) */}
          {ga4Data?.timeSeries && ga4Data.timeSeries.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    User Activity &amp; Traffic Progression
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {ga4DateRange === '24h'
                      ? 'Hourly Active Users, Sessions, and Pageview engagement over last 24 hours'
                      : 'Daily Active Users, Sessions, and Pageview engagement over selected date range'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-primary">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    Sessions
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Active Users
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Pageviews
                  </span>
                </div>
              </div>

              {/* SVG Area Chart */}
              <div className="h-56 w-full pt-2">
                {(() => {
                  const data = ga4Data.timeSeries;
                  const maxVal = Math.max(
                    ...data.map((d: any) => Math.max(d.sessions, d.activeUsers, d.pageViews)),
                    10
                  );
                  const w = 1000;
                  const h = 200;
                  const padX = 20;
                  const padY = 20;
                  const chartW = w - padX * 2;
                  const chartH = h - padY * 2;

                  const getX = (index: number) => padX + (index / (data.length - 1 || 1)) * chartW;
                  const getY = (val: number) => padY + chartH - (val / maxVal) * chartH;

                  // Points for Sessions line
                  const sessionsPoints = data
                    .map((d: any, i: number) => `${getX(i)},${getY(d.sessions)}`)
                    .join(' ');
                  const sessionsArea = `${padX},${padY + chartH} ${sessionsPoints} ${padX + chartW},${padY + chartH}`;

                  // Points for Active Users line
                  const usersPoints = data
                    .map((d: any, i: number) => `${getX(i)},${getY(d.activeUsers)}`)
                    .join(' ');

                  // Points for Pageviews line
                  const pageviewsPoints = data
                    .map((d: any, i: number) => `${getX(i)},${getY(d.pageViews)}`)
                    .join(' ');

                  return (
                    <svg className="w-full h-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="ga4SessionsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Reference Grid lines */}
                      <line
                        x1={padX}
                        y1={padY}
                        x2={w - padX}
                        y2={padY}
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={padX}
                        y1={padY + chartH / 2}
                        x2={w - padX}
                        y2={padY + chartH / 2}
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={padX}
                        y1={padY + chartH}
                        x2={w - padX}
                        y2={padY + chartH}
                        className="stroke-slate-200 dark:stroke-slate-700"
                      />

                      {/* Sessions Area Fill */}
                      <polygon points={sessionsArea} fill="url(#ga4SessionsGrad)" />

                      {/* Pageviews Line (Purple dashed) */}
                      <polyline
                        points={pageviewsPoints}
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        strokeLinecap="round"
                      />

                      {/* Sessions Line (Primary) */}
                      <polyline
                        points={sessionsPoints}
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Active Users Line (Amber) */}
                      <polyline
                        points={usersPoints}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Circles on dots (sample sparse dots) */}
                      {data.map((d: any, i: number) => {
                        if (i % Math.ceil(data.length / 10) !== 0 && i !== data.length - 1) return null;
                        return (
                          <g key={i}>
                            <circle cx={getX(i)} cy={getY(d.sessions)} r="3.5" fill="#4F46E5" />
                            <circle cx={getX(i)} cy={getY(d.activeUsers)} r="3" fill="#F59E0B" />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Date Labels below chart */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-2">
                <span>{ga4Data.timeSeries[0]?.formattedDate}</span>
                <span>
                  {ga4Data.timeSeries[Math.floor(ga4Data.timeSeries.length / 2)]?.formattedDate}
                </span>
                <span>{ga4Data.timeSeries[ga4Data.timeSeries.length - 1]?.formattedDate}</span>
              </div>
            </div>
          )}

          {/* Breakdown Tables (Channels, Pages, Countries, Devices, Events) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            {/* Table Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setGa4TableTab('channels')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    ga4TableTab === 'channels'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Acquisition Channels
                </button>

                <button
                  onClick={() => setGa4TableTab('pages')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    ga4TableTab === 'pages'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Top Landing Pages
                </button>

                <button
                  onClick={() => setGa4TableTab('countries')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    ga4TableTab === 'countries'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Audience Countries
                </button>

                <button
                  onClick={() => setGa4TableTab('devices')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    ga4TableTab === 'devices'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Device Categories
                </button>

                <button
                  onClick={() => setGa4TableTab('events')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    ga4TableTab === 'events'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Events &amp; Conversions
                </button>
              </div>

              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                Data API v1beta
              </span>
            </div>

            {/* Table 1: Acquisition Channels */}
            {ga4TableTab === 'channels' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Traffic Channel Group</th>
                      <th className="py-2.5 text-right">Sessions</th>
                      <th className="py-2.5 text-right">Active Users</th>
                      <th className="py-2.5 text-right">Engagement Rate</th>
                      <th className="py-2.5 text-right">% Traffic Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(ga4Data?.trafficSources || []).map((ch: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {ch.channel}
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {ch.sessions.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {ch.activeUsers.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              ch.engagementRate >= 65
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {ch.engagementRate}%
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${ch.percentage}%` }}
                                className="bg-primary h-full rounded-full"
                              />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                              {ch.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table 2: Top Landing Pages */}
            {ga4TableTab === 'pages' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Landing Page Path</th>
                      <th className="py-2.5 text-right">Pageviews</th>
                      <th className="py-2.5 text-right">Active Users</th>
                      <th className="py-2.5 text-right">Avg Engagement Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(ga4Data?.topPages || []).map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
                          <a
                            href={p.path.startsWith('http') ? p.path : `${currentSite?.url || ''}${p.path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary flex items-center gap-1"
                          >
                            <span className="truncate">{p.path}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                          </a>
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {p.pageViews.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {p.activeUsers.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                          {Math.floor(p.averageEngagementTime / 60)}m {p.averageEngagementTime % 60}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table 3: Audience Countries */}
            {ga4TableTab === 'countries' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Country / Region</th>
                      <th className="py-2.5 text-right">Active Users</th>
                      <th className="py-2.5 text-right">Sessions</th>
                      <th className="py-2.5 text-right">% Audience</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(ga4Data?.topCountries || []).map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {c.country}
                          </span>
                          <span>{c.countryName}</span>
                        </td>
                        <td className="py-3 text-right font-bold text-primary">
                          {c.activeUsers.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {c.sessions.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${c.percentage}%` }}
                                className="bg-primary h-full rounded-full"
                              />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                              {c.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table 4: Device Categories */}
            {ga4TableTab === 'devices' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {(ga4Data?.devices || []).map((dev: any, idx: number) => {
                  const isMobile = dev.device.toLowerCase() === 'mobile';
                  const isTablet = dev.device.toLowerCase() === 'tablet';

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isMobile ? (
                            <Smartphone className="w-4 h-4 text-primary" />
                          ) : isTablet ? (
                            <Tablet className="w-4 h-4 text-purple-500" />
                          ) : (
                            <Laptop className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200">
                            {dev.device}
                          </span>
                        </div>
                        <span className="text-xs font-black text-primary">
                          {dev.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${dev.percentage}%` }}
                          className="bg-primary h-full rounded-full"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{dev.activeUsers.toLocaleString()} active users</span>
                        <span>{dev.sessions.toLocaleString()} sessions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table 5: Events & Conversions */}
            {ga4TableTab === 'events' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Event Name</th>
                      <th className="py-2.5 text-right">Event Count</th>
                      <th className="py-2.5 text-right">Total Users</th>
                      <th className="py-2.5 text-right">Avg Events / User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(ga4Data?.topEvents || []).map((ev: any, idx: number) => {
                      const avgPerUser =
                        ev.totalUsers > 0
                          ? Math.round((ev.eventCount / ev.totalUsers) * 10) / 10
                          : 0;
                      const isConversion =
                        ev.eventName.includes('lead') ||
                        ev.eventName.includes('purchase') ||
                        ev.eventName.includes('convert');

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isConversion ? 'bg-emerald-500' : 'bg-purple-500'
                              }`}
                            />
                            <code className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {ev.eventName}
                            </code>
                            {isConversion && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Conversion
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right font-bold text-primary">
                            {ev.eventCount.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-slate-500">
                            {ev.totalUsers.toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {avgPerUser}x
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 3: AI AGENT GUIDANCE                                          */}
      {/* ===================================================================== */}
      {activeTab === 'ai_insights' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/10 via-primary/5 to-transparent dark:from-purple-950/40 dark:via-primary/10 border border-purple-200 dark:border-purple-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Autonomous Joint AI Performance &amp; SEO Engine
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Cross-correlates Google Lighthouse Core Web Vitals with real Google Search Console organic traffic.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateAIInsights}
              disabled={generatingAi}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
              <span>{generatingAi ? 'Generating Analysis...' : 'Re-synthesize Guidance'}</span>
            </button>
          </div>

          {aiReport ? (
            <div className="space-y-6">
              {/* Executive Verdict & Health Grade */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Executive Audit Verdict
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {aiReport.executiveSummary}
                  </p>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {aiReport.groundingNotice}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 min-w-[120px]">
                  <span className="text-4xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                    {aiReport.overallHealthGrade}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 mt-1">
                    Health Grade
                  </span>
                </div>
              </div>

              {/* Joint Correlation Findings */}
              {aiReport.jointAnalysis && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Cross-Cutting Performance &amp; Traffic Correlation
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="text-xs font-bold text-primary">
                        Speed &amp; Bounce Correlation
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {aiReport.jointAnalysis.correlationFinding}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Device Discrepancy
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {aiReport.jointAnalysis.mobileVsDesktopTrafficGap}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        High-Leverage Query Corridors
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {aiReport.jointAnalysis.underperformingHighVolumeOpportunities}
                      </p>
                    </div>

                    {aiReport.jointAnalysis.ga4EngagementAnalysis && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          GA4 Engagement &amp; Dwell Time
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          {aiReport.jointAnalysis.ga4EngagementAnalysis}
                        </p>
                      </div>
                    )}

                    {aiReport.jointAnalysis.conversionOpportunity && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Conversions &amp; Retention Target
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          {aiReport.jointAnalysis.conversionOpportunity}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prioritized Recommendations */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Impact-Prioritized Action Plan
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Ranked by estimated ROI
                  </span>
                </div>

                <div className="space-y-4">
                  {(aiReport.prioritizedRecommendations || []).map((rec: any, idx: number) => {
                    const priorityBadge =
                      rec.priority === 'high'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                        : rec.priority === 'medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';

                    return (
                      <div
                        key={idx}
                        className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${priorityBadge}`}
                            >
                              {rec.priority} Priority
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {rec.category}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {rec.title}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {rec.metricImpact}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {rec.issueExplanation}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Implementation Steps:
                          </span>
                          <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {rec.concreteActionSteps.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Wins */}
              {aiReport.quickWins && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Quick Wins (Deployable in &lt; 1 hour)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {aiReport.quickWins.map((win: string, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/70 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{win}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Generate Joint AI Recommendations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Synthesize Lighthouse performance bottlenecks and Search Console traffic metrics into an actionable, prioritized roadmap.
                </p>
              </div>
              <button
                onClick={handleGenerateAIInsights}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate AI Guidance
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 4: INTERACTIVE API SETUP GUIDE & CREDENTIALS                  */}
      {/* ===================================================================== */}
      {activeTab === 'setup_guide' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Google Cloud &amp; Search Console API Integration Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              This interactive guide details every required Google API, credential type, Cloud Console deep-link, and deployment callback URL. All secrets are securely encrypted in PostgreSQL and never exposed on the client bundle.
            </p>
          </div>

          {/* Callback URL Copy Widget */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Authorized OAuth 2.0 Redirect URI (Callback URL)
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Must match Google Cloud Console exactly
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 select-all overflow-x-auto">
                {setupData?.deploymentCallbackUrl || `${window.location.origin}/api/sites/gsc/oauth-callback`}
              </div>
              <button
                onClick={handleCopyCallbackUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied!' : 'Copy URI'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Add this URI in <strong>Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials &rarr; OAuth 2.0 Client IDs &rarr; Authorized redirect URIs</strong>.
            </p>
          </div>

          {/* API Setup Checklist */}
          <div className="space-y-4">
            {(setupData?.setupItems || []).map((item: any, i: number) => {
              const statusBadge = item.isConfigured
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';

              return (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          item.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge}`}>
                        {item.isConfigured ? 'Ready / Active' : 'Configuration Required'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={item.cloudConsoleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        Open Cloud Console <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {item.purpose}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-500 block text-[11px]">
                        Environment Variable:
                      </span>
                      <code className="text-primary font-mono text-[11px]">
                        {item.envVarName}
                      </code>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 block text-[11px]">Status Note:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        {item.statusNote}
                      </span>
                    </div>
                  </div>

                  {item.requiredScopes && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      <strong>Required Scopes:</strong>{' '}
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">
                        {item.requiredScopes.join(', ')}
                      </code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 5: MANAGE SITES                                               */}
      {/* ===================================================================== */}
      {activeTab === 'manage_sites' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Managed Properties &amp; Subdomains
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage all registered domains for automated audits and search telemetry.
              </p>
            </div>
            <button
              onClick={() => setShowAddSiteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Site</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {site.name}
                      </h3>
                      {site.isDefault && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      {site.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <button
                    onClick={() => handleDeleteSite(site.id, site.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Delete Site"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <strong>Search Console Property:</strong>{' '}
                    <span className="font-mono text-[10px]">
                      {site.gscPropertyUrl || 'Not Linked'}
                    </span>
                  </div>
                  {site.notes && <div>{site.notes}</div>}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      setSelectedSiteId(site.id);
                      setAuditUrl(site.url);
                      setActiveTab('lighthouse');
                    }}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    Inspect Lighthouse <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedSiteId(site.id);
                      if (site.gscPropertyUrl) setSelectedProperty(site.gscPropertyUrl);
                      setActiveTab('search_console');
                    }}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    View Search Analytics <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD SITE                                                       */}
      {/* ===================================================================== */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Add New Managed Site
            </h3>

            <form onSubmit={handleAddSite} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Build Tech"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://blogs.dailybuild.tech"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Search Console Property (Optional)
                </label>
                <input
                  type="text"
                  placeholder="sc-domain:blogs.dailybuild.tech or URL prefix"
                  value={newSiteGscProperty}
                  onChange={(e) => setNewSiteGscProperty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Google Analytics 4 Property ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 431289123 or properties/431289123"
                  value={newSiteGA4Property}
                  onChange={(e) => setNewSiteGA4Property(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  GA4 Measurement ID (Optional tag)
                </label>
                <input
                  type="text"
                  placeholder="e.g. G-4NWNVQ4KGG"
                  value={newSiteGA4Measurement}
                  onChange={(e) => setNewSiteGA4Measurement(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSiteIsDefault}
                  onChange={(e) => setNewSiteIsDefault(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Set as primary default site</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSite}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingSite ? 'Saving...' : 'Add Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
