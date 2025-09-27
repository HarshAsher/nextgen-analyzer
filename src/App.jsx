import React, { useEffect, useMemo, useState, useContext, createContext } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import {
  Home,
  TrendingUp,
  Layers,
  BarChart3,
  Gauge,
  Sparkles,
  ShieldCheck,
  Search,
  Moon,
  Sun,
  ChevronRight,
  Info,
  Wand2,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  BookmarkPlus,
  Check,
  X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

/**
 * NextGen Market Analyzer – Multi‑page React (Routing + Lists + Toasts + Watchlist)
 * Pages:
 *  - Stock Evaluator: left list of 100 stocks; click to see analysis (text + visuals + JSON)
 *  - Portfolio Analyzer: choose client from ClientPortfolio.json; computes overlap/HHI final score
 *
 * Tailwind via CDN (darkMode:'class'). Icons (lucide), animations (Framer Motion), charts (Recharts), confetti on high scores.
 *
 * ▶️ Place the two JSON files in your app's public/ folder:
 *    public/StockTickerSymbols.json
 *    public/ClientPortfolio.json
 * The code fetches them at runtime.
 */

// ---------------- Util ----------------
const cn = (...xs) => xs.filter(Boolean).join(" ");
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------- Dark Mode Hook ----------------
function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);
  return [dark, setDark];
}

// ---------------- Toast System ----------------
const ToastCtx = createContext(null);
function useToast(){ return useContext(ToastCtx); }
function ToastProvider({children}){
  const [toasts, setToasts] = useState([]);
  const addToast = (title, desc, tone="success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t=>[...t, {id, title, desc, tone}]);
    setTimeout(()=> removeToast(id), 3000);
  };
  const removeToast = (id)=> setToasts(t=> t.filter(x=>x.id!==id));
  return (
    <ToastCtx.Provider value={{addToast}}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map(t=> (
          <div key={t.id} className={cn(
              "w-72 rounded-2xl border shadow-lg p-3 backdrop-blur-xl",
              "bg-white/90 border-slate-200 text-slate-800",
              "dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-100",
              t.tone==="success" && "border-emerald-300/60",
              t.tone==="warn" && "border-amber-300/60",
              t.tone==="error" && "border-rose-300/60",
            )}>
            <div className="flex items-start gap-2">
              <div className="pt-0.5">{t.tone==="success"? <Check className="h-4 w-4 text-emerald-500"/> : t.tone==="warn"? <AlertTriangle className="h-4 w-4 text-amber-500"/> : <X className="h-4 w-4 text-rose-500"/>}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.desc && <div className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</div>}
              </div>
              <button onClick={()=>removeToast(t.id)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Data Loading ----------------
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

// ---------------- Stock Rule Engine (Basic Tasks) ----------------
function evaluateStockRules(input) {
  const p = input?.parameters || {}; const fb = {};
  const pe = Number(p.priceEarningsRatio);
  if (pe < 15) fb.priceEarningsRatio = `The P/E ratio of ${pe} suggests the stock is cheap relative to earnings.`;
  else if (pe <= 30) fb.priceEarningsRatio = `The P/E ratio of ${pe} is fairly typical.`;
  else fb.priceEarningsRatio = `The P/E ratio of ${pe} indicates the stock is relatively expensive compared to its earnings.`;

  const eps = Number(p.earningsPerShare);
  if (eps < 1) fb.earningsPerShare = `The EPS of ${eps} is low; profitability may be a concern.`;
  else if (eps < 5) fb.earningsPerShare = `The EPS of ${eps} shows modest profitability.`;
  else fb.earningsPerShare = `The EPS of ${eps} is a strong indicator of the company's profitability.`;

  const dy = Number(p.dividendYield);
  if (dy < 1) fb.dividendYield = `The dividend yield of ${dy}% is lower than the market average.`;
  else if (dy <= 3) fb.dividendYield = `The dividend yield of ${dy}% is around the market norm.`;
  else fb.dividendYield = `The dividend yield of ${dy}% is attractive for income focused investors.`;

  const trillion = 1_000_000_000_000; const mc = Number(p.marketCap);
  if (mc >= 500 * trillion) fb.marketCap = `The market cap of $${(mc / trillion).toFixed(1)} trillion makes it one of the world’s giants.`;
  else if (mc >= 100 * trillion) fb.marketCap = `The market cap of $${(mc / trillion).toFixed(1)} trillion indicates a very large, stable company.`;
  else fb.marketCap = `The market capitalization of $${(mc / trillion).toFixed(1)} trillion indicates a sizable player.`;

  const dte = Number(p.debtToEquityRatio);
  if (dte < 0.5) fb.debtToEquityRatio = `The debt to equity ratio of ${dte} suggests very little leverage.`;
  else if (dte <= 1.5) fb.debtToEquityRatio = `The debt to equity ratio of ${dte} suggests a moderate level of leverage.`;
  else fb.debtToEquityRatio = `The debt to equity ratio of ${dte} indicates high leverage; watch for risk.`;

  const roePct = Number(p.returnOnEquity) * 100;
  if (roePct < 8) fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is below average.`;
  else if (roePct <= 15) fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is healthy.`;
  else fb.returnOnEquity = `The ROE of ${roePct.toFixed(2)}% is very strong, showing efficient profit generation.`;

  const roaPct = Number(p.returnOnAssets) * 100;
  if (roaPct < 5) fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% is modest.`;
  else if (roaPct <= 10) fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% indicates efficient asset utilization.`;
  else fb.returnOnAssets = `The ROA of ${roaPct.toFixed(2)}% is excellent, showing superb asset productivity.`;

  const cr = Number(p.currentRatio);
  if (cr < 1) fb.currentRatio = `The current ratio of ${cr} signals potential short term liquidity issues.`;
  else if (cr <= 2) fb.currentRatio = `The current ratio of ${cr} suggests the company has a good short term liquidity position.`;
  else fb.currentRatio = `The current ratio of ${cr} indicates a very comfortable liquidity cushion.`;

  const qr = Number(p.quickRatio);
  if (qr < 1) fb.quickRatio = `The quick ratio of ${qr} may be insufficient for immediate obligations.`;
  else if (qr <= 2) fb.quickRatio = `The quick ratio of ${qr} indicates a strong ability to meet short term obligations.`;
  else fb.quickRatio = `The quick ratio of ${qr} shows an exceptionally strong liquidity position.`;

  const bv = Number(p.bookValuePerShare);
  fb.bookValuePerShare = `The book value per share of ${bv} is a measure of the company's net asset value on a per share basis.`;

  const summary = [
    fb.priceEarningsRatio, fb.earningsPerShare, fb.returnOnEquity, fb.returnOnAssets,
    fb.currentRatio, fb.quickRatio, fb.debtToEquityRatio, fb.dividendYield, fb.marketCap
  ].join(" ");

  // simple visuals scoring
  const quality = Math.round((roePct >= 15 ? 30 : roePct >= 8 ? 20 : 10) + (roaPct >= 10 ? 25 : roaPct >= 5 ? 18 : 10) + (qr >= 1 ? 15 : 8) + (cr >= 1 && cr <= 2 ? 15 : cr > 2 ? 12 : 6) + (dte < 0.5 ? 15 : dte <= 1.5 ? 12 : 6));
  const value = Math.round((pe < 15 ? 30 : pe <= 30 ? 20 : 10) + (dy >= 3 ? 25 : dy >= 1 ? 18 : 10) + (bv > 0 ? 10 : 0));
  const overall = Math.max(0, Math.min(100, Math.round(0.6 * quality + 0.4 * value)));

  return { stockSymbol: input.stockSymbol, feedback: fb, summary, quality, value, overall };
}

// ---------------- Portfolio Metrics ----------------
function pairwiseOverlap(wi, wj) {
  const keys = new Set([...(Object.keys(wi || {})), ...(Object.keys(wj || {}))]);
  let s = 0; keys.forEach((k) => (s += Math.min(wi?.[k] || 0, wj?.[k] || 0)));
  return s; // 0..1
}
function averageOverlap(funds) {
  let tot = 0, pairs = 0;
  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      tot += pairwiseOverlap(funds[i].holdings, funds[j].holdings); pairs += 1;
    }
  }
  return pairs ? tot / pairs : 0;
}
function weightedSectors(funds) {
  const tv = funds.reduce((a, f) => a + Number(f.amount || 0), 0);
  const agg = {};
  for (const f of funds) {
    const w = Number(f.amount || 0) / tv;
    for (const [sec, p] of Object.entries(f.sectors || {})) {
      agg[sec] = (agg[sec] || 0) + w * Number(p);
    }
  }
  return agg;
}
function hhi(sectorWeights) { return Object.values(sectorWeights).reduce((a, v) => a + v * v, 0); }
function buildOverlapMatrix(funds) {
  const n = funds.length; const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = i === j ? 1 : pairwiseOverlap(funds[i].holdings, funds[j].holdings);
      M[i][j] = M[j][i] = v;
    }
  }
  return M;
}
function analyzePortfolio(input, alpha = 0.5) {
  const funds = input.funds || [];
  const ov = averageOverlap(funds);
  const overlapScore = (1 - ov) * 100;
  const sectors = weightedSectors(funds);
  const sectorScore = (1 - hhi(sectors)) * 100;
  const finalScore = alpha * overlapScore + (1 - alpha) * sectorScore;
  const totalValue = (funds || []).reduce((a, f) => a + Number(f.amount || 0), 0);
  const findings = [];
  const sortedSectors = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  if (ov > 0.45) findings.push("Significant cross-fund holdings overlap.");
  if (sortedSectors[0]) findings.push(`Top sector: ${sortedSectors[0][0]} ${(sortedSectors[0][1] * 100).toFixed(0)}%`);
  if (sectorScore < 65) findings.push("Sector concentration elevated by HHI.");
  const recommendations = [];
  if (sortedSectors[0]) recommendations.push(`Trim ${sortedSectors[0][0]} by 10–15% and add Utilities/Pharma for balance.`);
  if (ov > 0.45) recommendations.push("Reduce overlapping names (e.g., INFY/HDFCBANK) to lower duplicate exposure.");
  return { finalScore: round2(finalScore), overlapScore: round2(overlapScore), sectorScore: round2(sectorScore), sectors, totalValue, findings, recommendations, overlapsMatrix: buildOverlapMatrix(funds) };
}

// ---------------- Watchlist (localStorage) ----------------
function useWatchlist(){
  const [list, setList] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('watchlist')||'[]'); } catch { return []; }
  });
  useEffect(()=>{ localStorage.setItem('watchlist', JSON.stringify(list)); }, [list]);
  const add = (symbol) => setList(l=> l.includes(symbol)? l : [...l, symbol]);
  const remove = (symbol) => setList(l=> l.filter(x=>x!==symbol));
  return { list, add, remove };
}

// ---------------- UI Atoms ----------------
const Glass = ({ className, children }) => (
  <div className={cn("rounded-3xl border bg-white/70 backdrop-blur-xl shadow-xl p-4 md:p-6",
    "border-white/20 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-100", className)}>{children}</div>
);
const Pill = ({ icon: Icon, label, value, tone = "emerald" }) => (
  <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium shadow-sm",
    tone === "emerald" && "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
    tone === "amber" && "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
    tone === "rose" && "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30")}
  >
    <Icon className="h-4 w-4" />
    <span>{label}: <b>{value}</b></span>
  </div>
);
const Radial = ({ value = 72, label = "Score" }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped / 100) * 360;
  const bg = `conic-gradient(rgb(79,70,229) ${angle}deg, rgba(15,23,42,0.08) ${angle}deg)`;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-inner dark:bg-slate-900">
          <div className="text-center">
            <div className="text-xl font-extrabold">{clamped}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
const JsonBlock = ({ data, title = "JSON" }) => (
  <Glass>
    <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-indigo-600" /><div className="font-semibold">{title}</div></div>
    <pre className="text-xs overflow-auto max-h-80 rounded-2xl p-3 bg-slate-900 text-emerald-200 shadow-inner">
      {JSON.stringify(data, null, 2)}
    </pre>
  </Glass>
);

// ---------------- Layout ----------------
function Header({ dark, setDark }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-indigo-600" />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">NextGen Market Analyzer</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <NavLink to="/" className={({isActive})=>cn("hidden sm:inline-flex items-center gap-2 text-sm rounded-2xl px-3 py-1.5 border",
          isActive?"bg-indigo-600 text-white border-indigo-600":"bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}> <Home className="h-4 w-4"/> Home </NavLink>
        <NavLink to="/stocks" className={({isActive})=>cn("inline-flex items-center gap-2 text-sm rounded-2xl px-3 py-1.5 border",
          isActive?"bg-indigo-600 text-white border-indigo-600":"bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}> <TrendingUp className="h-4 w-4"/> Stock Evaluator </NavLink>
        <NavLink to="/portfolio" className={({isActive})=>cn("inline-flex items-center gap-2 text-sm rounded-2xl px-3 py-1.5 border",
          isActive?"bg-indigo-600 text-white border-indigo-600":"bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}> <Layers className="h-4 w-4"/> Portfolio Analyzer </NavLink>
        <button onClick={() => setDark(!dark)}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
          {dark ? (<><Sun className="h-4 w-4 text-amber-400" /> Light</>) : (<><Moon className="h-4 w-4 text-indigo-600" /> Dark</>)}
        </button>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const [dark, setDark] = useTheme();
  return (
    <ToastProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Header dark={dark} setDark={setDark} />
          <div className="mt-6">{children}</div>
          <footer className="mt-12 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Designed for advisory explainability · Demo UI
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}

// ---------------- Home ----------------
function HomePage(){
  const nav = useNavigate();
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Glass>
        <div className="flex items-center justify-between mb-3"><div className="font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-600"/>Stock Evaluator</div><button onClick={()=>nav('/stocks')} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 text-white px-4 py-2 font-semibold shadow-md hover:shadow-indigo-400/30"><ChevronRight className="h-4 w-4"/>Open</button></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Browse 100 stocks, click one to view its evaluator output in text + visuals + JSON.</p>
      </Glass>
      <Glass>
        <div className="flex items-center justify-between mb-3"><div className="font-bold flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600"/>Portfolio Analyzer</div><button onClick={()=>nav('/portfolio')} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 text-white px-4 py-2 font-semibold shadow-md hover:shadow-indigo-400/30"><ChevronRight className="h-4 w-4"/>Open</button></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Pick a client from ClientPortfolio.json and compute overlap + sector mix → final diversification score.</p>
      </Glass>
    </div>
  );
}

// ---------------- Stock Evaluator Page ----------------
function StocksPage(){
  const toast = useToast();
  const { list: watchlist, add: addWatch } = useWatchlist();

  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [boom, setBoom] = useState(false);

  useEffect(()=>{ fetchJSON("/StockTickerSymbols.json").then(setAll).catch(e=>console.error(e)); },[]);
  useEffect(()=>{ if(sel){ const out = evaluateStockRules(sel); setBoom(out.overall>=75);} },[sel]);

  const filtered = useMemo(()=> all.filter(x=> (x.stockSymbol||"").toLowerCase().includes(q.toLowerCase())), [all,q]);

  const addToWatchlist = (symbol) => {
    addWatch(symbol);
    toast.addToast("Added to Watchlist", `${symbol} is now on your watchlist`, "success");
  };

  return (
    <div className="grid xl:grid-cols-3 gap-6">
      <Glass className="xl:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Search className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Stocks</div></div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Watchlist: {watchlist.length}</div>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search symbol…" className="w-full mb-3 rounded-2xl px-3 py-2 border border-slate-200 bg-white/80 dark:bg-slate-900/60 dark:border-slate-700"/>
        <div className="max-h-[70vh] overflow-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-2">
          {filtered.map((s,idx)=> (
            <div key={s.stockSymbol+idx} className="rounded-2xl border px-3 py-2 bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <button onClick={()=>setSel(s)} className="text-left block w-full">
                <div className="font-semibold">{s.stockSymbol}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">P/E: {s.parameters?.priceEarningsRatio}</div>
              </button>
              <div className="mt-2 flex justify-end">
                <button onClick={()=>addToWatchlist(s.stockSymbol)} className="inline-flex items-center gap-1.5 text-xs rounded-xl px-2 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <BookmarkPlus className="h-3.5 w-3.5"/> Watch
                </button>
              </div>
            </div>
          ))}
        </div>
      </Glass>

      <div className="xl:col-span-2 flex flex-col gap-6">
        <Glass>
          {!sel ? (
            <div className="h-[18rem] flex items-center justify-center text-slate-500">Select a stock to analyze.</div>
          ) : (
            <StockResult stock={sel} addToWatchlist={addToWatchlist} />
          )}
        </Glass>
        {sel && <JsonBlock title="Stock Evaluator – JSON" data={evaluateStockRules(sel)} />}
      </div>
      {boom && <Confetti numberOfPieces={220} recycle={false} gravity={0.25} />}
    </div>
  );
}

function StockResult({stock, addToWatchlist}){
  const out = evaluateStockRules(stock);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600"/><h3 className="font-bold">{out.stockSymbol} – Summary</h3></div>
        <div className="flex gap-2 items-center">
          <button onClick={()=>addToWatchlist(out.stockSymbol)} className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
            <BookmarkPlus className="h-4 w-4"/> Add to watchlist
          </button>
          <Pill icon={Gauge} label="Overall" value={`${out.overall}/100`} tone={out.overall>=75?"emerald":out.overall>=55?"amber":"rose"} />
          <Pill icon={BarChart3} label="Quality" value={`${out.quality}/100`} />
          <Pill icon={Layers} label="Value" value={`${out.value}/100`} tone="amber" />
        </div>
      </div>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{out.summary}</p>
      <div className="grid md:grid-cols-2 gap-3">
        {Object.entries(out.feedback).map(([k,v])=> (
          <motion.div key={k} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:bg-slate-900 dark:border-slate-700">
            <div className="font-semibold mb-1">{k}</div>
            <div className="text-slate-600 dark:text-slate-300">{v}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Radial value={out.overall} label="Overall"/>
        <Radial value={out.quality} label="Quality"/>
        <Radial value={out.value} label="Value"/>
      </div>
    </div>
  );
}

// ---------------- Portfolio Analyzer Page ----------------
function PortfolioPage(){
  const [clients, setClients] = useState([]);
  const [sel, setSel] = useState(null);
  const [boom, setBoom] = useState(false);

  useEffect(()=>{ fetchJSON("/ClientPortfolio.json").then(setClients).catch(e=>console.error(e)); },[]);
  useEffect(()=>{ if(sel){ const out = analyzePortfolio(sel,0.5); setBoom(out.finalScore>=70);} },[sel]);

  return (
    <div className="grid xl:grid-cols-3 gap-6">
      <Glass className="xl:col-span-1">
        <div className="flex items-center gap-2 mb-3"><Search className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Clients</div></div>
        <div className="max-h-[70vh] overflow-auto grid grid-cols-1 gap-2">
          {clients.map((c)=> (
            <button key={c.clientId} onClick={()=>setSel(c)}
              className={cn("text-left rounded-2xl border px-3 py-2 hover:shadow-md transition",
                sel?.clientId===c.clientId?"bg-indigo-600 text-white border-indigo-600":"bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}
            >
              <div className="font-semibold">{c.clientId}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.currency} · {c.funds?.length||0} funds</div>
            </button>
          ))}
        </div>
      </Glass>

      <div className="xl:col-span-2 flex flex-col gap-6">
        <Glass>
          {!sel ? (
            <div className="h-[18rem] flex items-center justify-center text-slate-500">Select a client portfolio.</div>
          ) : (
            <PortfolioResult client={sel} />
          )}
        </Glass>
        {sel && <JsonBlock title="Portfolio Analyzer – JSON" data={analyzePortfolio(sel,0.5)} />}
      </div>
      {boom && <Confetti numberOfPieces={260} recycle={false} gravity={0.25} />}
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

function PortfolioResult({client}){
  const out = analyzePortfolio(client, 0.5);
  const sectorData = Object.entries(out.sectors).map(([k,v])=>({sector:k, pct: Math.round(v*1000)/10}));
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 p-4 bg-white dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2"><Gauge className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Final Diversification</div></div>
          <Radial value={out.finalScore} label="Final"/>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Pill icon={GitBranch} label="Overlap" value={`${out.overlapScore}`} tone={out.overlapScore>=65?"emerald":"amber"}/>
            <Pill icon={Layers} label="Sector" value={`${out.sectorScore}`} tone={out.sectorScore>=65?"emerald":"amber"}/>
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
          {out.findings.map((t,i)=> (<li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600"/>{t}</li>))}
          {out.recommendations.map((t,i)=> (<li key={"r"+i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600"/>{t}</li>))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4 bg-white overflow-x-auto dark:bg-slate-900 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2"><GitBranch className="h-4 w-4 text-indigo-600"/><div className="font-semibold">Pairwise Overlap Matrix</div></div>
        <OverlapTable matrix={out.overlapsMatrix} />
      </div>
    </div>
  );
}

// ---------------- App + Routing ----------------
export default function App(){
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/stocks" element={<StocksPage/>} />
          <Route path="/portfolio" element={<PortfolioPage/>} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}