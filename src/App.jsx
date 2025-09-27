import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import {
  TrendingUp,
  ShieldCheck,
  Layers,
  Calculator,
  Sparkles,
  Wand2,
  Upload,
  BarChart3,
  Gauge,
  GitBranch,
  Info,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

/**
 * NextGen Market Analyzer – React front-end (with Dark Mode + JSON output)
 * - TailwindCSS styling, modern UI
 * - Lucide icons, Recharts charts, Framer Motion animations
 * - Confetti on high scores
 * - Dark-mode toggle (class strategy) and pretty JSON output panes
 */

// ---------- Utility ----------
const cn = (...xs) => xs.filter(Boolean).join(" ");
const round2 = (x)=>Math.round(x*100)/100;

// ---------- Demo Defaults ----------
const DEFAULT_STOCK_JSON = `{
  "stockSymbol": "AAPL",
  "parameters": {
    "priceEarningsRatio": 35.2,
    "earningsPerShare": 5.6,
    "dividendYield": 0.65,
    "marketCap": 2.3e12,
    "debtToEquityRatio": 1.2,
    "returnOnEquity": 0.15,
    "returnOnAssets": 0.08,
    "currentRatio": 1.5,
    "quickRatio": 1.3,
    "bookValuePerShare": 3.5
  }
}`;

const DEFAULT_PORTFOLIO_JSON = `{
  "clientId": "C101",
  "currency": "INR",
  "funds": [
    {
      "fundCode": "FUND_A",
      "amount": 1000000,
      "holdings": {"INFY": 0.30, "HDFCBANK": 0.50, "ITC": 0.20},
      "sectors": {"IT": 0.30, "Banking": 0.50, "FMCG": 0.20}
    },
    {
      "fundCode": "FUND_B",
      "amount": 1000000,
      "holdings": {"INFY": 0.40, "RELIANCE": 0.30, "HDFCBANK": 0.30},
      "sectors": {"IT": 0.40, "Energy": 0.30, "Banking": 0.30}
    },
    {
      "fundCode": "FUND_C",
      "amount": 500000,
      "holdings": {"TCS": 0.50, "INFY": 0.30, "ITC": 0.20},
      "sectors": {"IT": 0.80, "FMCG": 0.20}
    }
  ]
}`;

// ---------- Stock Evaluator (deterministic rules) ----------
function evaluateStockRules(input) {
  const p = input?.parameters || {};
  const fb = {};

  // 1) P/E
  const pe = Number(p.priceEarningsRatio);
  if (pe < 15) fb.priceEarningsRatio = `The P/E ratio of ${pe} suggests the stock is cheap relative to earnings.`;
  else if (pe <= 30) fb.priceEarningsRatio = `The P/E ratio of ${pe} is fairly typical.`;
  else fb.priceEarningsRatio = `The P/E ratio of ${pe} indicates the stock is relatively expensive compared to its earnings.`;

  // 2) EPS
  const eps = Number(p.earningsPerShare);
  if (eps < 1) fb.earningsPerShare = `The EPS of ${eps} is low; profitability may be a concern.`;
  else if (eps < 5) fb.earningsPerShare = `The EPS of ${eps} shows modest profitability.`;
  else fb.earningsPerShare = `The EPS of ${eps} is a strong indicator of the company's profitability.`;

  // 3) Dividend Yield (%)
  const dy = Number(p.dividendYield);
  if (dy < 1) fb.dividendYield = `The dividend yield of ${dy}% is lower than the market average.`;
  else if (dy <= 3) fb.dividendYield = `The dividend yield of ${dy}% is around the market norm.`;
  else fb.dividendYield = `The dividend yield of ${dy}% is attractive for income focused investors.`;

  // 4) Market Cap (trillions)
  const trillion = 1_000_000_000_000;
  const mc = Number(p.marketCap);
  if (mc >= 500 * trillion) fb.marketCap = `The market cap of $${(mc / trillion).toFixed(1)} trillion makes it one of the world’s giants.`;
  else if (mc >= 100 * trillion) fb.marketCap = `The market cap of $${(mc / trillion).toFixed(1)} trillion indicates a very large, stable company.`;
  else fb.marketCap = `The market capitalization of $${(mc / trillion).toFixed(1)} trillion indicates a sizable player.`;

  // 5) Debt/Equity
  const dte = Number(p.debtToEquityRatio);
  if (dte < 0.5) fb.debtToEquityRatio = `The debt to equity ratio of ${dte} suggests very little leverage.`;
  else if (dte <= 1.5) fb.debtToEquityRatio = `The debt to equity ratio of ${dte} suggests a moderate level of leverage.`;
  else fb.debtToEquityRatio = `The debt to equity ratio of ${dte} indicates high leverage; watch for risk.`;

  // 6) ROE (%)
  const roePct = Number(p.returnOnEquity) * 100;
  if (roePct < 8) fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is below average.`;
  else if (roePct <= 15) fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is healthy.`;
  else fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is very strong, showing efficient profit generation.`;

  // 7) ROA (%)
  const roaPct = Number(p.returnOnAssets) * 100;
  if (roaPct < 5) fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% is modest.`;
  else if (roaPct <= 10) fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% indicates efficient asset utilization.`;
  else fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% is excellent, showing superb asset productivity.`;

  // 8) Current Ratio
  const cr = Number(p.currentRatio);
  if (cr < 1) fb.currentRatio = `The current ratio of ${cr} signals potential short term liquidity issues.`;
  else if (cr <= 2) fb.currentRatio = `The current ratio of ${cr} suggests the company has a good short term liquidity position.`;
  else fb.currentRatio = `The current ratio of ${cr} indicates a very comfortable liquidity cushion.`;

  // 9) Quick Ratio
  const qr = Number(p.quickRatio);
  if (qr < 1) fb.quickRatio = `The quick ratio of ${qr} may be insufficient for immediate obligations.`;
  else if (qr <= 2) fb.quickRatio = `The quick ratio of ${qr} indicates a strong ability to meet short term obligations.`;
  else fb.quickRatio = `The quick ratio of ${qr} shows an exceptionally strong liquidity position.`;

  // 10) Book Value per Share
  const bv = Number(p.bookValuePerShare);
  fb.bookValuePerShare = `The book value per share of ${bv} is a measure of the company's net asset value on a per share basis.`;

  // Build summary (simple concatenation of key lines)
  const summaryParts = [
    fb.priceEarningsRatio,
    fb.earningsPerShare,
    fb.returnOnEquity,
    fb.returnOnAssets,
    fb.currentRatio,
    fb.quickRatio,
    fb.debtToEquityRatio,
    fb.dividendYield,
    fb.marketCap,
  ];
  const summary = summaryParts.join(" ");

  // Basic pillar scores (optional; keep for visuals)
  const quality = Math.round(
    (roePct >= 15 ? 30 : roePct >= 8 ? 20 : 10) +
    (roaPct >= 10 ? 25 : roaPct >= 5 ? 18 : 10) +
    (qr >= 1 ? 15 : 8) +
    (cr >= 1 && cr <= 2 ? 15 : cr > 2 ? 12 : 6) +
    (dte < 0.5 ? 15 : dte <= 1.5 ? 12 : 6)
  );
  const value = Math.round(
    (pe < 15 ? 30 : pe <= 30 ? 20 : 10) +
    (dy >= 3 ? 25 : dy >= 1 ? 18 : 10) +
    (bv > 0 ? 10 : 0)
  );
  const overall = Math.max(0, Math.min(100, Math.round(0.6 * quality + 0.4 * value)));

  return { stockSymbol: input.stockSymbol, feedback: fb, summary, quality, value, overall };
}


function clampScore(n){ return Math.max(0, Math.min(100, Math.round(n))); }

// ---------- Portfolio Analyzer (Overlap + HHI) ----------
function pairwiseOverlap(wi, wj){
  const keys = new Set([...(Object.keys(wi||{})), ...(Object.keys(wj||{}))]);
  let s = 0; keys.forEach(k => { s += Math.min(wi?.[k]||0, wj?.[k]||0); });
  return s; // 0..1
}

function averageOverlap(funds){
  let tot = 0, pairs = 0;
  for (let i=0;i<funds.length;i++){
    for (let j=i+1;j<funds.length;j++){
      tot += pairwiseOverlap(funds[i].holdings, funds[j].holdings);
      pairs += 1;
    }
  }
  return pairs ? tot/pairs : 0;
}

function weightedSectors(funds){
  const tv = funds.reduce((a,f)=>a+Number(f.amount||0),0);
  const agg = {};
  for (const f of funds){
    const w = Number(f.amount||0)/tv;
    for (const [sec,p] of Object.entries(f.sectors||{})){
      agg[sec] = (agg[sec]||0) + w*Number(p);
    }
  }
  return agg; // values sum ~1
}

function hhi(sectorWeights){
  return Object.values(sectorWeights).reduce((a,v)=>a+v*v,0);
}

function buildOverlapMatrix(funds){
  const n = funds.length; const M = Array.from({length:n},()=>Array(n).fill(0));
  for (let i=0;i<n;i++){
    for (let j=i;j<n;j++){
      const v = i===j ? 1 : pairwiseOverlap(funds[i].holdings, funds[j].holdings);
      M[i][j]=M[j][i]=v;
    }
  }
  return M; // values 0..1
}

function analyzePortfolio(input, alpha=0.5){
  const funds = input.funds||[];
  const ov = averageOverlap(funds);
  const overlapScore = (1-ov)*100;
  const sectors = weightedSectors(funds);
  const sectorScore = (1-hhi(sectors))*100;
  const finalScore = alpha*overlapScore + (1-alpha)*sectorScore;
  const totalValue = (funds||[]).reduce((a,f)=>a+Number(f.amount||0),0);

  const findings = [];
  if (ov>0.45) findings.push("Significant cross-fund holdings overlap.");
  const sortedSectors = Object.entries(sectors).sort((a,b)=>b[1]-a[1]);
  if (sortedSectors[0]) findings.push(`Top sector: ${sortedSectors[0][0]} ${(sortedSectors[0][1]*100).toFixed(0)}%`);
  if (sectorScore<65) findings.push("Sector concentration elevated by HHI.");

  const recommendations = [];
  if (sortedSectors[0]) recommendations.push(`Trim ${sortedSectors[0][0]} by 10–15% and add Utilities/Pharma for balance.`);
  if (ov>0.45) recommendations.push("Reduce overlapping names (e.g., INFY/HDFCBANK) to lower duplicate exposure.");

  return { finalScore: round2(finalScore), overlapScore: round2(overlapScore), sectorScore: round2(sectorScore), sectors, totalValue, findings, recommendations, overlapsMatrix: buildOverlapMatrix(funds) };
}

// ---------- Pretty UI Bits ----------
const GlassCard = ({children, className}) => (
  <div className={cn("rounded-3xl border bg-white/60 backdrop-blur-xl shadow-xl p-5",
    "border-white/20 dark:border-white/10",
    "dark:bg-slate-800/70 dark:text-slate-100",
    className)}>
    {children}
  </div>
);

const Pill = ({icon:Icon, label, value, tone="emerald"}) => (
  <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium shadow-sm",
    tone==="emerald" && "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
    tone==="amber" && "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
    tone==="rose" && "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30")}
  >
    <Icon className="h-4 w-4" />
    <span>{label}: <b>{value}</b></span>
  </div>
);

const Radial = ({value=72, label="Score"}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped/100)*360;
  const bg = `conic-gradient(rgb(79,70,229) ${angle}deg, rgba(15,23,42,0.08) ${angle}deg)`;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32 rounded-full" style={{background:bg}}>
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-inner dark:bg-slate-900">
          <div className="text-center">
            <div className="text-2xl font-extrabold">{clamped}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const JsonBlock = ({data, title="JSON Output"}) => (
  <GlassCard>
    <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-indigo-600"/><div className="font-semibold">{title}</div></div>
    <pre className="text-xs overflow-auto max-h-80 rounded-2xl p-3 bg-slate-900 text-emerald-200 shadow-inner">
      {JSON.stringify(data, null, 2)}
    </pre>
  </GlassCard>
);

// ---------- Header with Dark Mode Toggle ----------
function Header({dark, setDark}){
  useEffect(()=>{
    const root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
  },[dark]);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-indigo-600"/>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">NextGen Market Analyzer</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4"/>
          <span>Explainable · Secure · Advisor-ready</span>
        </div>
        <button onClick={()=>setDark(!dark)}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
          {dark ? (<><Sun className="h-4 w-4 text-amber-400"/> Light</>) : (<><Moon className="h-4 w-4 text-indigo-600"/> Dark</>)}
        </button>
      </div>
    </div>
  );
}

// in App.jsx (top-level)
function useTheme() {
  const [dark, setDark] = React.useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches; // system default
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // live update if user changes OS theme while app is open
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = e => {
      if (!localStorage.getItem("theme")) setDark(e.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return [dark, setDark];
}


const TabButton = ({active, onClick, icon:Icon, children}) => (
  <button onClick={onClick}
    className={cn("group inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
      active?"bg-indigo-600 text-white shadow-lg":
      "bg-white/70 text-slate-700 hover:bg-white border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700")}
  >
    <Icon className="h-4 w-4"/>{children}
  </button>
);

// ---------- Stock Tab ----------
function StockTab(){
  const [text, setText] = useState(DEFAULT_STOCK_JSON);
  const [res, setRes] = useState(null);
  const [boom, setBoom] = useState(false);

  const analyze = () => {
    try {
      const parsed = JSON.parse(text);
      const out = evaluateStockRules(parsed);
      setRes(out);
      setBoom(out.overall>=75);
    } catch (e) { alert("Invalid JSON: " + e.message); }
  };

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-indigo-600"/><h3 className="font-bold">Stock Evaluator</h3></div>
          <button onClick={analyze} className="rounded-2xl bg-indigo-600 text-white px-4 py-2 font-semibold shadow-md hover:shadow-indigo-400/30 active:scale-95 inline-flex items-center gap-2"><Wand2 className="h-4 w-4"/>Analyze</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} spellCheck={false}
          className="w-full h-72 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-sm dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"/>
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1 dark:text-slate-400"><Info className="h-3 w-3"/>Paste your JSON payload and click Analyze.</p>
      </GlassCard>
      <div className="flex flex-col gap-6">
        <GlassCard>
          {!res ? (
            <div className="h-full min-h-[14rem] flex items-center justify-center text-slate-500">Results will appear here.</div>
          ):(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600"/>
                  <h3 className="font-bold">{res.stockSymbol} – Summary</h3>
                </div>
                <div className="flex gap-2">
                  <Pill icon={Gauge} label="Overall" value={`${res.overall}/100`} tone={res.overall>=75?"emerald":res.overall>=55?"amber":"rose"}/>
                  <Pill icon={BarChart3} label="Quality" value={`${res.quality}/100`}/>
                  <Pill icon={Layers} label="Value" value={`${res.value}/100`} tone="amber"/>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{res.summary}</p>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(res.feedback).map(([k,v])=> (
                  <motion.div key={k} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:bg-slate-900 dark:border-slate-700">
                    <div className="font-semibold mb-1">{k}</div>
                    <div className="text-slate-600 dark:text-slate-300">{v}</div>
                  </motion.div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Radial value={res.overall} label="Overall"/>
                <Radial value={res.quality} label="Quality"/>
                <Radial value={res.value} label="Value"/>
              </div>
            </div>
          )}
        </GlassCard>
        {res && <JsonBlock data={res} title="Stock Evaluator – JSON"/>}
      </div>
      {boom && <Confetti numberOfPieces={240} recycle={false} gravity={0.25} />}
    </div>
  );
}

// ---------- Portfolio Tab ----------
function PortfolioTab(){
  const [text, setText] = useState(DEFAULT_PORTFOLIO_JSON);
  const [res, setRes] = useState(null);
  const [boom, setBoom] = useState(false);

  const analyze = () => {
    try{
      const input = JSON.parse(text);
      const out = analyzePortfolio(input, 0.5);
      setRes(out); setBoom(out.finalScore>=70);
    }catch(e){ alert("Invalid JSON: "+e.message); }
  };

  const sectorData = useMemo(()=>{
    if (!res) return [];
    return Object.entries(res.sectors).map(([k,v])=>({sector:k, pct: Math.round(v*1000)/10}));
  },[res]);

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-600"/><h3 className="font-bold">Portfolio Diversification</h3></div>
          <button onClick={analyze} className="rounded-2xl bg-indigo-600 text-white px-4 py-2 font-semibold shadow-md hover:shadow-indigo-400/30 active:scale-95 inline-flex items-center gap-2"><Wand2 className="h-4 w-4"/>Analyze</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} spellCheck={false}
          className="w-full h-72 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-sm dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100"/>
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1 dark:text-slate-400"><Info className="h-3 w-3"/>Paste your funds JSON and click Analyze.</p>
      </GlassCard>

      <div className="flex flex-col gap-6">
        <GlassCard>
          {!res ? (
            <div className="h-full min-h-[14rem] flex items-center justify-center text-slate-500">Results will appear here.</div>
          ):(
            <div className="space-y-5">
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 bg-white dark:bg-slate-900 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2"><Gauge className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Final Diversification</div></div>
                  <Radial value={res.finalScore} label="Final"/>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Pill icon={GitBranch} label="Overlap" value={`${res.overlapScore}`} tone={res.overlapScore>=65?"emerald":"amber"}/>
                    <Pill icon={Layers} label="Sector" value={`${res.sectorScore}`} tone={res.sectorScore>=65?"emerald":"amber"}/>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-white dark:bg-slate-900 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Sector Mix</div></div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sector" tick={{fontSize:12}}/>
                        <YAxis tick={{fontSize:12}}/>
                        <Tooltip formatter={(v)=>`${v}%`}/>
                        <Bar dataKey="pct" radius={[8,8,0,0]}>
                          {sectorData.map((_, idx)=> <Cell key={idx} fill={`hsl(${(idx*57)%360},85%,55%)`}/>) }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-white dark:bg-slate-900 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3"><Layers className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Findings & Recommendations</div></div>
                <ul className="space-y-2 text-sm">
                  {res.findings.map((t,i)=> (
                    <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600"/>{t}</li>
                  ))}
                  {res.recommendations.map((t,i)=> (
                    <li key={"r"+i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600"/>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-white overflow-x-auto dark:bg-slate-900 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2"><GitBranch className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Pairwise Overlap Matrix</div></div>
                <OverlapTable matrix={res.overlapsMatrix} />
              </div>
            </div>
          )}
        </GlassCard>
        {res && <JsonBlock data={res} title="Portfolio Analyzer – JSON"/>}
      </div>
      {boom && <Confetti numberOfPieces={280} recycle={false} gravity={0.25} />}
    </div>
  );
}

function OverlapTable({matrix}){
  if(!matrix) return null;
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          {matrix.map((_,i)=>(<th key={i} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">F{i+1}</th>))}
        </tr>
      </thead>
      <tbody>
        {matrix.map((row,i)=>(
          <tr key={i}>
            {row.map((v,j)=>{
              const pct = Math.round(v*100);
              const bg = i===j?"bg-emerald-50 dark:bg-emerald-500/15":"";
              return (
                <td key={j} className={cn("px-3 py-2 border border-slate-100 dark:border-slate-800", bg)}>
                  <div className="h-6 w-28 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full" style={{width:`${pct}%`, background:`linear-gradient(90deg, rgb(79,70,229), rgb(56,189,248))`}}/>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{pct}%</div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Main Component ----------
export default function NextGenMarketAnalyzer(){
  const [tab, setTab] = React.useState("stock");
  const [dark, setDark] = useTheme();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Header dark={dark} setDark={setDark} />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <TabButton active={tab==="stock"} onClick={()=>setTab("stock")} icon={TrendingUp}>Stock Evaluator</TabButton>
          <TabButton active={tab==="portfolio"} onClick={()=>setTab("portfolio")} icon={Layers}>Portfolio Diversification</TabButton>
        </div>

        <motion.div key={tab} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:0.25}} className="mt-6">
          {tab==="stock" ? <StockTab/> : <PortfolioTab/>}
        </motion.div>

        <footer className="mt-10 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5"/> Designed for advisory explainability & risk awareness · Demo UI
        </footer>
      </div>
    </div>
  );
}