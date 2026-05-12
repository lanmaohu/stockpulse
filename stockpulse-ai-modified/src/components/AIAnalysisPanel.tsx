import { useState } from 'react';
import type { DCFInputData, DCFResult } from '@/types/dcf';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisPanelProps {
  symbol: string;
  companyName: string;
  dcfData: DCFInputData;
  dcfResult: DCFResult;
}

export function AIAnalysisPanel({ symbol, companyName, dcfData, dcfResult }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const runAnalysis = async () => {
    setAnalysis('');
    setError(null);
    setIsStreaming(true);
    setHasStarted(true);

    try {
      const response = await fetch('/api/stock/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, companyName, dcfData, dcfResult }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setAnalysis(prev => prev + parsed.text);
          } catch {
            // ignore malformed SSE frames
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-500/10 rounded-xl shrink-0">
              <Brain className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">AI 智能分析</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                由 Claude claude-opus-4-7 驱动，对当前 DCF 估值结果进行深度解读，生成专业投资分析报告。
              </p>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isStreaming}
            className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl"
          >
            {isStreaming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : hasStarted ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新分析
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                生成分析
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">分析失败</p>
            <p className="text-xs text-red-400/70">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis output */}
      {(analysis || isStreaming) && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-800/50">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              {companyName || symbol} · AI Analysis Report
            </span>
            {isStreaming && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-violet-400/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                Streaming...
              </span>
            )}
          </div>
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:my-2
            prose-li:text-zinc-400 prose-li:leading-relaxed
            prose-ul:my-2 prose-ul:space-y-1
            prose-strong:text-zinc-200
            prose-hr:border-zinc-800">
            <ReactMarkdown>{analysis}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded-sm ml-0.5 align-middle" />
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasStarted && !error && (
        <div className="bg-zinc-950/50 border border-zinc-900/50 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 text-zinc-600">
          <Brain className="h-12 w-12 opacity-30" />
          <p className="text-sm text-center">点击「生成分析」按钮，AI 将基于当前 DCF 估值数据<br />为您生成专业的投资分析报告</p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-zinc-700 text-center px-4">
        AI 分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。
      </p>
    </div>
  );
}
