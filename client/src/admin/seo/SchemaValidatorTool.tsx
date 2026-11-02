import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Code2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const SchemaValidatorTool: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [schemaType, setSchemaType] = useState<string>('TechArticle');
  const [jsonLdCode, setJsonLdCode] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getArticles({ limit: 40 })
      .then((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.articles)
          ? res.articles
          : Array.isArray(res)
          ? res
          : [];
        setArticles(list);
        if (list.length > 0) {
          setSelectedArticleId(list[0].id);
          generateSchemaForArticle(list[0].id, 'TechArticle');
        }
      })
      .catch((err) => {
        console.error(err);
        setArticles([]);
      });
  }, []);

  const generateSchemaForArticle = async (articleId: string, type: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateSchema({ articleId, schemaType: type });
      const formatted = JSON.stringify(data.schemaJson, null, 2);
      setJsonLdCode(formatted);
      // Automatically validate
      validateJsonLd(formatted, articleId);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schema');
    } finally {
      setLoading(false);
    }
  };

  const validateJsonLd = async (code: string, articleId?: string) => {
    setValidating(true);
    try {
      const res = await api.validateSchema({
        jsonLdString: code,
        articleId: articleId || selectedArticleId,
      });
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        schemaType: 'Unknown',
        errors: [err.message],
        warnings: [],
        missingRequired: [],
        missingRecommended: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonLdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" />
            <span>Schema &amp; Structured Data Validator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generates and validates Google Search Central compliant JSON-LD for Articles, Breadcrumbs, and Organizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm" className="text-xs">
              <span>Google Rich Results Test</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generator Controls */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-1/2 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Article
            </label>
            <select
              value={selectedArticleId}
              onChange={(e) => {
                setSelectedArticleId(e.target.value);
                generateSchemaForArticle(e.target.value, schemaType);
              }}
              className="w-full text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
            >
              {(Array.isArray(articles) ? articles : []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/4 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Schema.org Type
            </label>
            <select
              value={schemaType}
              onChange={(e) => {
                setSchemaType(e.target.value);
                if (selectedArticleId) generateSchemaForArticle(selectedArticleId, e.target.value);
              }}
              className="w-full text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
            >
              <option value="TechArticle">TechArticle (Recommended)</option>
              <option value="Article">Article</option>
              <option value="NewsArticle">NewsArticle</option>
              <option value="BreadcrumbList">BreadcrumbList</option>
            </select>
          </div>

          <div className="w-full sm:w-1/4 flex items-end">
            <Button
              onClick={() => generateSchemaForArticle(selectedArticleId, schemaType)}
              disabled={loading}
              className="w-full text-xs"
            >
              {loading ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              Re-Generate JSON-LD
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor & Validation Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Editor */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <span>Structured Data Preview (JSON-LD)</span>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <textarea
              value={jsonLdCode}
              onChange={(e) => {
                setJsonLdCode(e.target.value);
                validateJsonLd(e.target.value);
              }}
              rows={18}
              className="w-full text-xs font-mono p-3 rounded-lg bg-slate-900 text-slate-100 border border-slate-800 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Right: Validation Inspector */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Google Search Central Verification</CardTitle>
                {validationResult && (
                  <Badge
                    variant={validationResult.isValid ? 'success' : 'destructive'}
                    size="sm"
                    className="font-bold uppercase tracking-wider"
                  >
                    {validationResult.isValid ? 'Valid Schema' : 'Errors Detected'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Checks required properties, author entities, publisher logos, and visible content consistency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationResult ? (
                <div className="space-y-3 text-xs">
                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Critical Syntax / Schema Errors</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {validationResult.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Required */}
                  {validationResult.missingRequired.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Missing Required Google Properties</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {validationResult.missingRequired.map((prop: string, i: number) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                            {prop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Recommended */}
                  {validationResult.missingRecommended.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Missing Recommended Rich Result Properties</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {validationResult.missingRecommended.map((prop: string, i: number) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            {prop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clean State */}
                  {validationResult.isValid && validationResult.missingRequired.length === 0 && (
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs">Schema Perfectly Compliant</div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                          All required and recommended properties for <strong>{validationResult.schemaType}</strong> are properly populated with valid types.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Select an article to inspect structured data.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
