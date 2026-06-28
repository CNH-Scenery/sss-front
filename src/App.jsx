import React from "react";
import { css } from "./css.js";
import Topbar from "./components/Topbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SurveyTab from "./tabs/SurveyTab.jsx";
import StrategyTab from "./tabs/StrategyTab.jsx";
import BacktestTab from "./tabs/BacktestTab.jsx";
import MonitorTab from "./tabs/MonitorTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import AlertToasts from "./components/AlertToasts.jsx";
import { notifPermission, requestNotifyPermission, sendNotification } from "./notify.js";
import { normalizeUpbitMarket } from "./upbit.js";
import { evaluateBackendMonitor, fetchBackendCandles } from "./api/tradingData.js";
import { ALERT_MODES, createMonitorAlertPayload, loadConfig, saveConfig, normalizePayload, formatAlert, pickColor } from "./alerts/alertConfig.js";
import { createAlertSocket } from "./alerts/alertSocket.js";
import { beep } from "./alerts/sound.js";
import { generateTradingCode } from "./api/codegen.js";
import { runBacktestApi } from "./api/backtest.js";
import { API_BASE_URL } from "./api/base.js";

// 백엔드 WebSocket URL 빌더. 배포(VITE_API_BASE_URL)면 http→ws/https→wss 로 변환,
// 개발이면 현재 호스트(5173)로 붙어 Vite 프록시(ws:true)가 :8000 으로 전달한다.
const backendWsUrl = (path) => {
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  if (base) return base.replace(/^http/, "ws") + path;
  const loc = (typeof window !== "undefined") ? window.location : { protocol: "http:", host: "localhost:5173" };
  return (loc.protocol === "https:" ? "wss:" : "ws:") + "//" + loc.host + path;
};

const dateOnly = (value) => String(value || "").slice(0, 10);
const toLocalDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const toLocalDateTime = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16) + ":00";
};
const createDefaultBacktestRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 199);
  return { start: toLocalDateInput(start), end: toLocalDateInput(end) };
};
const parseChartTime = (value) => {
  const time = new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(time.getTime()) ? null : time;
};
const chartNeedsTime = (candles) => {
  for(let i=1;i<candles.length;i++){
    const prev=parseChartTime(candles[i-1]?.t),cur=parseChartTime(candles[i]?.t);
    if(prev&&cur) return Math.abs(cur-prev)<20*60*60*1000;
  }
  return false;
};
const CHART_SPANS = [
  { key: "second", label: "초", count: 200, candleLabel: "초봉", source: "second", bucketSeconds: 1 },
  { key: "minute", label: "분", count: 200, candleLabel: "1분봉", source: "minute", unit: 1 },
  { key: "day", label: "일", count: 200, candleLabel: "일봉", source: "daily" },
  { key: "week", label: "주", count: 200, candleLabel: "주봉", source: "week" },
  { key: "month", label: "월", count: 200, candleLabel: "월봉", source: "month" },
  { key: "year", label: "년", count: 200, candleLabel: "연봉", source: "year" },
];
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const FREE_SURVEY_LIMIT = 5;
const PREMIUM_SURVEY_PRICE = 9900;
const PREMIUM_SURVEY_PRICE_LABEL = "₩" + PREMIUM_SURVEY_PRICE.toLocaleString("ko-KR");
const PREMIUM_UNLOCK_KEY = "tt_precision_pass_unlocked";
const PRECISION_PAYMENT_URL = (import.meta.env.VITE_PREMIUM_PAYMENT_URL || "").trim();
class App extends React.Component {
  constructor(props){
    super(props);
    this._backtestMarketInput=React.createRef();
    this._backtestStartInput=React.createRef();
    this._backtestEndInput=React.createRef();
    const defaultBacktestRange=createDefaultBacktestRange();
    this._codeParams={rsiBuy:42,volBuy:1.05,rsiSell:60,pnlTake:10,pnlStop:-6,extra:[]};
    this._backtestCandleCache={};
    this._backtestChartCache={};
    this._monitorHistoryCache={};
    this._open=null; this._openReal=false;
    this._mon={holding:false,entry:0};  // 실시간 모니터링용 가상 포지션
    this.surveys=this._buildSurveys();
    this.state={ screen:'survey', surveyIndex:0, responses:{}, draftAction:null, draftReason:'',
      strategy:null, codifying:false, codifyError:'', versions:[], correctionDraft:'',
      backtest:null, backtesting:false, backtestError:'', backtestMarket:'KRW-BTC', backtestMarketDraft:'KRW-BTC', backtestStartDate:defaultBacktestRange.start, backtestEndDate:defaultBacktestRange.end, backtestChartSpan:'day', backtestChartCandles:[], backtestChartLoading:false, backtestChartError:'', consistency:null,
      monitorMarket:'KRW-BTC', monitorMarketDraft:'KRW-BTC', monitorError:'', lastCandleTime:'', monitorCandles:[], monitorHistoryCandles:[], monitorHistoryLoading:false, monitorChartSpan:'minute', monitorMarkers:[],
      price:null, prevPrice:null, signal:'HOLD', signalReason:'조건 불충족 — 관망', alerts:[], webhookDraft:'', notifPerm:notifPermission(), wsConnected:false, backendMonStatus:'off',
      alertConfig:loadConfig(), toasts:[], backendStatus:'off',
      precisionUnlocked:this._loadPrecisionPass(), paymentPending:false, paymentMessage:'',
      chartRange:this.surveys[0]?.candles.length||132,
      chartIndicators:{maBinance:true,maClassic:false,bb:true,vwap:false,volume:true,rsi:true,macd:false},
      chartTool:'cursor', chartDrawings:{}, pendingDrawing:null, chartViews:{} };
  }
  componentDidMount(){ this._unmounted=false; this._connectWs(); this._poll=setInterval(this._pollSignal,4000); this._pollSignal(); this._initBackend(); if(this.props.demoMode) this.fillDemo(); }
  componentDidUpdate(prevProps, prevState){ if(!prevProps.demoMode && this.props.demoMode && this.doneCount()===0) this.fillDemo(); if(!prevState?.strategy && this.state.strategy) this._loadMonitorHistory(); const cid=this.state.strategy&&this.state.strategy.codeId; const pcid=prevState&&prevState.strategy&&prevState.strategy.codeId; if(cid&&cid!==pcid) this._connectBackendMonitor(); }
  componentWillUnmount(){ this._unmounted=true; clearInterval(this._poll); if(this._tickerSock) this._tickerSock.close(); if(this._alertSock) this._alertSock.close(); this._disconnectBackendMonitor(); }

  // ── 백엔드 알림 소켓 + 통합 알림 발생기 ─────────────────────────
  _initBackend(){
    if(this._alertSock){ this._alertSock.close(); this._alertSock=null; }
    const url=this.state.alertConfig.backendUrl;
    if(url){ this.setState({backendStatus:'connecting'}); this._alertSock=createAlertSocket(url, this._emitAlert, (stt)=>this.setState({backendStatus:stt})); }
    else this.setState({backendStatus:'off'});
  }
  saveAlertConfig=(cfg)=>{ const prevUrl=this.state.alertConfig.backendUrl; this.setState({alertConfig:cfg},()=>{ saveConfig(cfg); if(cfg.backendUrl!==prevUrl) this._initBackend(); }); };
  setAlertMode=(alertMode)=>this.saveAlertConfig({...this.state.alertConfig,alertMode});

  // ── 백엔드 실시간 모니터 소켓 (생성된 동일 코드 decide() 를 서버가 주기 실행) ──
  _connectBackendMonitor(){
    this._disconnectBackendMonitor();
    const st=this.state.strategy;
    if(!st||!st.codeId) return;
    const market=this.state.monitorMarket;
    const url=backendWsUrl('/api/trading-code/'+st.codeId+'/stream?market='+encodeURIComponent(market)+'&timeframe=15m&interval=15');
    this._lastBackendAction=null;
    this.setState({backendMonStatus:'connecting'});
    this._backendMonSock=createAlertSocket(url, this._onBackendDecision, (stt)=>{ if(!this._unmounted) this.setState({backendMonStatus:stt}); });
  }
  _disconnectBackendMonitor(){ if(this._backendMonSock){ this._backendMonSock.close(); this._backendMonSock=null; } }
  _backendMonitorActive(){ return !!(this.state.strategy && this.state.strategy.codeId); }
  _onBackendDecision=(msg)=>{
    if(this._unmounted || !msg) return;
    const action=String(msg.action||'HOLD').toUpperCase();
    const reason=msg.reason||(action==='HOLD'?'관망':'');
    this.setState(s=>({ signal:action, signalReason:reason, ...(Number.isFinite(msg.price)?{prevPrice:Number.isFinite(s.price)?s.price:msg.price,price:msg.price}:{}) }));
    if((action==='BUY'||action==='SELL') && action!==this._lastBackendAction){
      const price=Number.isFinite(msg.price)?msg.price:this.state.price;
      this._emitAlert(createMonitorAlertPayload({action,market:msg.market||this.state.monitorMarket,price,reason,features:(msg.decision&&msg.decision.indicators)||{}}));
    }
    this._lastBackendAction=action;
  };
  dismissToast=(id)=>this.setState(s=>({toasts:s.toasts.filter(t=>t.id!==id)}));
  _emitAlert=(payload)=>{
    const cfg=this.state.alertConfig;
    const norm=normalizePayload(payload);
    const view=formatAlert(cfg,norm);
    const color=view.color||pickColor(cfg,norm);
    const id=this._toastId=(this._toastId||0)+1;
    const feedItem={action:norm.action,color,text:'['+norm.market+'] '+norm.actionLabel+' · '+(norm.reason||'-')+' · '+norm.priceFmt+'원',time:norm.time};
    this.setState(s=>({ alerts:[feedItem,...s.alerts].slice(0,8), toasts:[...s.toasts,{id,...view}] }));
    if(cfg.sound) beep();
    sendNotification(view.title, view.body, 'tt-alert', {
      icon: view.notificationImage,
      image: view.notificationImage,
    });
    if(cfg.autoDismissMs>0) setTimeout(()=>this.dismissToast(id), cfg.autoDismissMs);
  };
  sendTestAlert=()=>{
    const last=this.state.monitorCandles[this.state.monitorCandles.length-1];
    const price=Number.isFinite(this.state.price)?this.state.price:Math.round(last?.c||0);
    this._emitAlert(createMonitorAlertPayload({action:'BUY',market:this.state.monitorMarket,price,reason:'[테스트] 전략 매수 조건 예시',features:{rsi14:31,vol_ratio:1.7}}));
  };

  // ── 업비트 실시간 시세 (WebSocket) ──────────────────────────────
  _connectWs(){
    if(this._tickerSock) this._tickerSock.close();
    this._tickerSock=null;
  }

  _chartSpan(spanKey){
    return CHART_SPANS.find(x=>x.key===spanKey)||CHART_SPANS[0];
  }
  _backtestChartKey(market=this.state.backtestMarket,spanKey=this.state.backtestChartSpan){
    return 'backtest-'+market+'-'+spanKey;
  }
  _monitorChartKey(market=this.state.monitorMarket,spanKey=this.state.monitorChartSpan){
    return 'monitor-'+market+'-'+spanKey;
  }
  _monitorSpanCount(span){
    return span.count||200;
  }
  _fetchMonitorSpanCandles(market,span){
    const count=this._monitorSpanCount(span);
    return fetchBackendCandles({
      market,
      source:span.source,
      count,
      unit:span.unit||1,
      seconds:span.seconds||count,
      bucketSeconds:span.bucketSeconds||1,
    });
  }
  _setBacktestChartCandles(span,market,candles){
    const key=this._backtestChartKey(market,span.key);
    const range=Math.max(1,candles.length);
    this.setState(s=>({
      backtestChartSpan:span.key,
      backtestChartCandles:candles,
      backtestChartLoading:false,
      backtestChartError:'',
      chartViews:{...s.chartViews,[key]:{range,endIndex:range-1}},
    }));
  }
  _selectBacktestChartSpan=(spanKey)=>{
    this._loadBacktestChartSpan(spanKey);
  };
  _loadBacktestChartSpan=async(spanKey=this.state.backtestChartSpan)=>{
    if(!this.state.backtest) return;
    const span=this._chartSpan(spanKey);
    const market=this.state.backtest.summary?.market||this.state.backtestMarket;
    const requestId=this._backtestChartRequest=(this._backtestChartRequest||0)+1;
    const cacheKey=market+':'+span.key;
    const cached=this._backtestChartCache[cacheKey];
    if(cached?.length){
      this._setBacktestChartCandles(span,market,cached);
      return;
    }
    this.setState({backtestChartSpan:span.key,backtestChartCandles:[],backtestChartLoading:true,backtestChartError:''});
    try{
      const candles=await this._fetchMonitorSpanCandles(market,span);
      if(this._unmounted || requestId!==this._backtestChartRequest || market!==(this.state.backtest?.summary?.market||this.state.backtestMarket)) return;
      this._backtestChartCache[cacheKey]=candles;
      this._setBacktestChartCandles(span,market,candles);
    }catch(error){
      if(this._unmounted || requestId!==this._backtestChartRequest) return;
      this.setState({backtestChartLoading:false,backtestChartError:error?.message||'백테스트 차트 데이터를 가져오지 못했습니다.'});
    }
  };
  _setMonitorChartCandles(span,market,candles){
    const key=this._monitorChartKey(market,span.key);
    const range=Math.max(1,candles.length);
    this.setState(s=>({
      monitorChartSpan:span.key,
      monitorHistoryCandles:candles,
      monitorHistoryLoading:false,
      monitorError:'',
      chartViews:{...s.chartViews,[key]:{range,endIndex:range-1}},
    }));
  }
  _selectMonitorChartSpan=(spanKey)=>{
    this._loadMonitorHistory(spanKey);
  };
  _loadMonitorHistory=async(spanKey=this.state.monitorChartSpan)=>{
    if(!this.state.strategy) return;
    const span=this._chartSpan(spanKey);
    const market=this.state.monitorMarket;
    const requestId=this._monitorHistoryRequest=(this._monitorHistoryRequest||0)+1;
    const cacheKey=market+':'+span.key;
    const cached=this._monitorHistoryCache[cacheKey];
    if(cached?.length){
      this._setMonitorChartCandles(span,market,cached);
      return;
    }
    this.setState({monitorChartSpan:span.key,monitorHistoryCandles:[],monitorHistoryLoading:true,monitorError:''});
    try{
      const candles=await this._fetchMonitorSpanCandles(market,span);
      if(this._unmounted || requestId!==this._monitorHistoryRequest || market!==this.state.monitorMarket) return;
      this._monitorHistoryCache[cacheKey]=candles;
      this._setMonitorChartCandles(span,market,candles);
    }catch(error){
      if(this._unmounted || requestId!==this._monitorHistoryRequest || market!==this.state.monitorMarket) return;
      this.setState({monitorHistoryLoading:false,monitorError:error?.message||'Monitoring history request failed.'});
    }
  };

  // ── 실시간 지표·신호 (REST 캔들) ─────────────────────────────────
  _signalReason(action,f,holding){
    if(action==='BUY') return 'RSI '+f.rsi14.toFixed(0)+' 과매도 + 거래량 '+f.vol_ratio.toFixed(1)+'x';
    if(action==='SELL') return '과열/목표·손절 도달 · RSI '+f.rsi14.toFixed(0);
    return holding ? ('보유 중 · 청산 대기 · RSI '+f.rsi14.toFixed(0)) : ('조건 불충족 — 관망 · RSI '+f.rsi14.toFixed(0));
  }
  _pollSignal=async()=>{
    if(this._unmounted || !this.state.strategy) return;
    const market=this.state.monitorMarket;
    try{
      const useBackend=this._backendMonitorActive();
      let c=[];
      let price=null;
      let lastCandleTime='';
      let fired=null;
      let signalPatch={};
      if(useBackend){
        c=await fetchBackendCandles({market,source:'minute',count:120,unit:1});
        if(this._unmounted || market!==this.state.monitorMarket || c.length<20) return;
        price=Math.round(Number(c[c.length-1]?.c)||0);
        lastCandleTime=c[c.length-1]?.t||'';
        if(!this._openReal || !Number.isFinite(this._open)){ this._open=price; this._openReal=true; }
      } else {
        const result=await evaluateBackendMonitor({market,strategyParams:this._codeParams,position:this._mon});
        if(this._unmounted || market!==this.state.monitorMarket || !Array.isArray(result.candles) || result.candles.length<20) return;
        c=result.candles;
        const f=result.features||{};
        price=Math.round(Number(result.price)||c[c.length-1].c);
        lastCandleTime=result.lastCandleTime||c[c.length-1]?.t||'';
        const action=result.signal||'HOLD';
        const reason=result.signalReason||'Backend monitor signal received.';
        fired=result.fired||null;
        this._mon=result.position||this._mon;
        if(!this._openReal || !Number.isFinite(this._open)){ this._open=price; this._openReal=true; }
        const mon=this._mon;
        const pnl=mon.holding ? (price-mon.entry)/mon.entry*100 : 0;
        if(!fired){
          const localAction=this._strategyDecide(f,mon.holding,pnl);
          const localReason=this._signalReason(localAction,f,mon.holding);
          if(localAction==='BUY' && !mon.holding){ mon.holding=true; mon.entry=price; fired={sig:'BUY',reason:localReason}; }
          else if(localAction==='SELL' && mon.holding){ mon.holding=false; fired={sig:'SELL',reason:localReason}; }
        }
        signalPatch={signal:action,signalReason:reason};
        if(fired) this._emitAlert(createMonitorAlertPayload({action:fired.sig,market,price,reason:fired.reason,features:f}));
      }
      this.setState(s=>({
        ...signalPatch,
        monitorError:'',
        monitorCandles:c,
        lastCandleTime,
        prevPrice:Number.isFinite(s.price)?s.price:price,
        price,
        wsConnected:true,
      }));
    }catch(error){
      if(!this._unmounted && market===this.state.monitorMarket) {
        this.setState({monitorError:error?.message||'업비트 모니터링 데이터를 가져오지 못했습니다.'});
      }
    }
  };

  _mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  _marketBase(m){ const b={'KRW-BTC':92000000,'KRW-ETH':5200000,'KRW-SOL':245000,'KRW-XRP':780,'KRW-DOGE':190}; return b[m]||100000; }
  _genCandles(seed,n,drift,base){ const rng=this._mulberry(seed); let price=base; const out=[]; for(let i=0;i<n;i++){ const ch=(rng()-0.5)*0.026+drift; const open=price; const close=price*(1+ch); const hi=Math.max(open,close)*(1+rng()*0.007); const lo=Math.min(open,close)*(1-rng()*0.007); const v=Math.round((0.5+rng()*1.8)*1000),t=toLocalDateTime(new Date(Date.now()-(n-1-i)*86400000)); out.push({o:open,h:hi,l:lo,c:close,v,t}); price=close; } return out; }
  _timeframeMinutes(tf){ return tf==='일'?1440:(Number(tf)||15); }
  _stampCandles(c,tf,offsetDays=0){ const unit=this._timeframeMinutes(tf),end=new Date(Date.now()-offsetDays*86400000); return c.map((d,i)=>{ const t=new Date(end.getTime()-(c.length-1-i)*unit*60000); return {...d,t:toLocalDateTime(t)}; }); }
  _rsi(cl,p){ if(cl.length<p+1)return 50; let ag=0,al=0; for(let i=1;i<=p;i++){ const d=cl[i]-cl[i-1]; if(d>0)ag+=d; else al-=d; } ag/=p; al/=p; for(let i=p+1;i<cl.length;i++){ const d=cl[i]-cl[i-1]; ag=(ag*(p-1)+(d>0?d:0))/p; al=(al*(p-1)+(d<0?-d:0))/p; } const rs=ag/(al||1e-9); return 100-100/(1+rs); }
  _features(c){ const cl=c.map(x=>x.c),vs=c.map(x=>x.v),hi=c.map(x=>x.h),lo=c.map(x=>x.l); const last=cl[cl.length-1];
    const ma=n=>{ const s=cl.slice(-Math.min(n,cl.length)); return s.reduce((a,b)=>a+b,0)/s.length; };
    const ma5=ma(5),ma7=ma(7),ma20=ma(20),ma25=ma(25),ma30=ma(30),ma60=ma(Math.min(60,cl.length)),ma99=ma(Math.min(99,cl.length)),ma120=ma(Math.min(120,cl.length));
    const align=(ma7>ma25&&ma25>ma99)?'정배열':(ma7<ma25&&ma25<ma99)?'역배열':'혼조';
    const rsi=this._rsi(cl,14);
    const va=vs.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,vs.length);
    const volr=vs[vs.length-1]/va;
    const ema=p=>{ const k=2/(p+1); let e=cl[0]; for(let i=1;i<cl.length;i++) e=cl[i]*k+e*(1-k); return e; };
    const macd=ema(12)-ema(26);
    const sl=cl.slice(-20),m20=sl.reduce((a,b)=>a+b,0)/sl.length; const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m20)*(b-m20),0)/sl.length);
    const up=m20+2*sd,lw=m20-2*sd; const bbp=(last-lw)/((up-lw)||1); const bbw=(up-lw)/m20;
    let tr=0; for(let i=1;i<c.length;i++){ tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1])); } const atr=tr/Math.max(1,c.length-1);
    const h20=Math.max.apply(null,hi.slice(-20)),l20=Math.min.apply(null,lo.slice(-20));
    return {close:last,rsi14:rsi,vol_ratio:volr,ma5,ma7,ma20,ma25,ma30,ma60,ma99,ma120,ma_align:align,macd,bb_pct:bbp,bb_width:bbw,atr,atr_pct:atr/last*100,dist_from_high20:(last-h20)/h20*100,dist_from_low20:(last-l20)/l20*100}; }
  _genScenarioCandles(seed,base,phases){ const rng=this._mulberry(seed); let price=base; const out=[]; phases.forEach((phase)=>{ const len=phase.len||1,drift=phase.drift||0,noise=phase.noise??0.01,vol=phase.vol||1,upper=phase.upperWick??0.006,lower=phase.lowerWick??0.006; for(let i=0;i<len;i++){ const open=price; const change=drift+(rng()-0.5)*noise; const close=Math.max(base*0.2,open*(1+change)); const hiBase=Math.max(open,close),loBase=Math.min(open,close); const high=hiBase*(1+upper*(0.75+rng()*0.65)); const low=loBase*(1-lower*(0.75+rng()*0.65)); const volume=Math.round((650+rng()*520)*vol); out.push({o:open,h:high,l:low,c:close,v:volume}); price=close; } }); return out.slice(-132); }
  _surveyScenarios(){ return [
    {market:'KRW-BTC',tf:'15',title:'급락 후 과매도 반등',intent:'손실 공포 vs 역추세 매수 성향',reason:'큰 하락과 거래량 폭증 뒤 첫 반등을 보여줘서, 사용자가 공포 구간에서 분할 매수하는지 확인을 기다리는지 드러납니다.',tags:['과매도','거래량 폭증','반등 시도'],phases:[{len:45,drift:-0.001,noise:0.009,vol:0.9},{len:34,drift:-0.005,noise:0.012,vol:1.2},{len:25,drift:-0.011,noise:0.014,vol:1.9,lowerWick:0.018},{len:28,drift:0.0048,noise:0.012,vol:1.7,lowerWick:0.014}]},
    {market:'KRW-ETH',tf:'60',title:'상승 추세의 눌림목',intent:'추세 추종과 눌림 매수 성향',reason:'이동평균 정배열 안에서 단기 조정이 나온 구조라, 추세를 믿고 사는지 조정 종료 확인을 기다리는지 구분하기 좋습니다.',tags:['정배열','눌림목','추세 지속'],phases:[{len:58,drift:0.0045,noise:0.010,vol:1.1},{len:32,drift:0.0025,noise:0.008,vol:1.0},{len:28,drift:-0.0042,noise:0.009,vol:0.9},{len:14,drift:0.0014,noise:0.007,vol:1.1,lowerWick:0.01}]},
    {market:'KRW-SOL',tf:'15',title:'저항선 돌파와 거래량 확장',intent:'모멘텀 추격과 돌파 확인 성향',reason:'박스권 저항을 거래량과 함께 넘는 장면이라, 늦어 보여도 돌파를 따라가는지 눌림을 기다리는지 판단할 수 있습니다.',tags:['박스권 돌파','모멘텀','거래량 확인'],phases:[{len:45,drift:0.0004,noise:0.010,vol:0.8},{len:34,drift:-0.0002,noise:0.008,vol:0.75},{len:25,drift:0.001,noise:0.006,vol:0.8},{len:28,drift:0.0085,noise:0.012,vol:2.15,upperWick:0.012}]},
    {market:'KRW-XRP',tf:'60',title:'박스권 하단 재반등',intent:'평균 회귀와 지지선 신뢰 성향',reason:'상하단이 반복된 횡보장 하단에서 반등하는 구간이라, 사용자가 지지선 매매를 선호하는지 방향성 부재를 피하는지 보입니다.',tags:['횡보','지지선','평균 회귀'],phases:[{len:16,drift:0.004,noise:0.010,vol:0.9},{len:18,drift:-0.0042,noise:0.010,vol:0.9},{len:16,drift:0.0041,noise:0.010,vol:0.95},{len:18,drift:-0.0043,noise:0.010,vol:0.9},{len:16,drift:0.0038,noise:0.010,vol:0.9},{len:20,drift:-0.0048,noise:0.011,vol:1.05,lowerWick:0.012},{len:28,drift:0.0037,noise:0.010,vol:1.15,lowerWick:0.012}]},
    {market:'KRW-DOGE',tf:'240',title:'급등 후 과열 윗꼬리',intent:'익절 규율과 탐욕 제어 성향',reason:'가파른 상승 뒤 고점에서 윗꼬리와 거래량이 커지는 장면이라, 수익을 지키는 편인지 더 끌고 가는 편인지 드러납니다.',tags:['과열','윗꼬리','익절 판단'],phases:[{len:45,drift:0.0032,noise:0.010,vol:0.95},{len:34,drift:0.0068,noise:0.012,vol:1.25},{len:25,drift:0.0105,noise:0.015,vol:1.75,upperWick:0.016},{len:28,drift:-0.0045,noise:0.014,vol:1.9,upperWick:0.021}]},
    {market:'KRW-BTC',tf:'60',title:'하락 추세 속 약한 반등',intent:'저가 매수 충동과 추세 필터 성향',reason:'역배열 하락 중 거래량이 약한 반등을 배치해, 싸 보인다는 이유로 들어가는지 하락 추세를 우선하는지 확인합니다.',tags:['역배열','약한 반등','추세 필터'],phases:[{len:54,drift:-0.0038,noise:0.010,vol:1.05},{len:35,drift:-0.006,noise:0.012,vol:1.25},{len:25,drift:0.005,noise:0.011,vol:0.72},{len:18,drift:-0.0028,noise:0.009,vol:0.9,upperWick:0.011}]},
    {market:'KRW-ETH',tf:'일',title:'저변동성 삼각 수렴',intent:'확인 매매와 선진입 성향',reason:'변동성과 거래량이 줄어드는 수렴 구간이라, 방향이 나오기 전 포지션을 잡는지 돌파 확인을 기다리는지 분명히 갈립니다.',tags:['수렴','저변동성','확인 대기'],phases:[{len:35,drift:0.002,noise:0.012,vol:1.0},{len:30,drift:-0.0012,noise:0.009,vol:0.85},{len:30,drift:0.001,noise:0.006,vol:0.72},{len:37,drift:0.0002,noise:0.0028,vol:0.55,upperWick:0.003,lowerWick:0.003}]},
    {market:'KRW-SOL',tf:'15',title:'지지선 이탈 후 되돌림 실패',intent:'손절 민감도와 가짜 반등 회피 성향',reason:'중요 지지 이탈 뒤 약한 되돌림만 나온 장면이라, 손실 구간을 빨리 인정하는지 반등 희망을 더 보는지 판단합니다.',tags:['지지 이탈','되돌림 실패','손절'],phases:[{len:48,drift:0.0025,noise:0.010,vol:0.9},{len:30,drift:-0.0005,noise:0.007,vol:0.8},{len:24,drift:-0.011,noise:0.014,vol:1.95,lowerWick:0.012},{len:30,drift:0.0018,noise:0.009,vol:0.65,upperWick:0.012}]},
    {market:'KRW-XRP',tf:'60',title:'V자 반등 초입',intent:'초기 반전 포착과 확인 비용 감수 성향',reason:'투매 뒤 저점이 빠르게 회복되는 흐름이라, 반전 초입을 공격적으로 잡는지 더 높은 가격에 확인 매수하는지 볼 수 있습니다.',tags:['투매','V자 반등','반전 확인'],phases:[{len:45,drift:-0.0045,noise:0.011,vol:1.05},{len:24,drift:-0.0125,noise:0.016,vol:2.0,lowerWick:0.022},{len:28,drift:0.0095,noise:0.013,vol:1.65,lowerWick:0.014},{len:35,drift:0.0028,noise:0.009,vol:1.0}]},
    {market:'KRW-DOGE',tf:'240',title:'전고점 재도전과 거래량 둔화',intent:'확증 편향과 거래량 검증 성향',reason:'가격은 전고점에 가까워지지만 거래량은 줄어드는 구간이라, 차트 모양만 믿는지 참여 강도까지 검증하는지 확인됩니다.',tags:['전고점','거래량 둔화','확인 매매'],phases:[{len:42,drift:0.0038,noise:0.010,vol:1.25},{len:30,drift:-0.001,noise:0.008,vol:0.95},{len:30,drift:0.0044,noise:0.009,vol:0.75},{len:30,drift:0.0022,noise:0.006,vol:0.48,upperWick:0.014}]}
  ]; }
  _buildSurveys(){ return this._surveyScenarios().map((sc,i)=>{ const candles=this._stampCandles(this._genScenarioCandles(3000+i*193,this._marketBase(sc.market),sc.phases),sc.tf,i*7); const {phases,...meta}=sc; return {...meta,candles,features:this._features(candles)}; }); }
  _strategyDecide(f,holding,pnl){ const p=this._codeParams; if(!holding && f.rsi14<p.rsiBuy && f.vol_ratio>p.volBuy) return 'BUY'; if(holding && (f.rsi14>p.rsiSell || pnl>p.pnlTake || pnl<p.pnlStop)) return 'SELL'; return 'HOLD'; }
  _legacyResolveBacktestRange(c,startDate,endDate){
    const first=dateOnly(c[0]?.t),last=dateOnly(c[c.length-1]?.t);
    const start=startDate||first,end=endDate||last;
    if(start>end) throw new Error('백테스트 시작일이 종료일보다 늦습니다.');
    if(start<first || end>last) throw new Error('선택한 날짜가 수집된 최근 1년 범위를 벗어났습니다. 사용 가능 범위: '+first+' ~ '+last);
    const startIndex=c.findIndex(x=>dateOnly(x.t)>=start);
    let endIndex=-1;
    for(let i=c.length-1;i>=0;i--){ if(dateOnly(c[i].t)<=end){ endIndex=i; break; } }
    if(startIndex<0||endIndex<startIndex) throw new Error('선택한 날짜 범위에 적용할 일봉 데이터가 없습니다.');
    return {start,end,startIndex,endIndex};
  }
  _legacyRunBacktestData(c,market,range={}){ const {start,end,startIndex,endIndex}=this._legacyResolveBacktestRange(c,range.startDate,range.endDate); const cl=c.map(x=>x.c); let holding=false,entry=0,equity=1; const eq=[],bh=[],mk=[],tr=[]; const p0=cl[startIndex]; for(let i=startIndex;i<=endIndex;i++){ const f=this._features(c.slice(0,i+1)); const pnl=holding?(cl[i]-entry)/entry*100:0; const a=this._strategyDecide(f,holding,pnl); if(a==='BUY'&&!holding){ holding=true; entry=cl[i]; mk.push({i:i-startIndex,type:'BUY',label:'B',t:c[i]?.t,price:cl[i]}); } else if(a==='SELL'&&holding){ const r=(cl[i]-entry)/entry; tr.push(r); equity*=(1+r); mk.push({i:i-startIndex,type:'SELL',label:'S',t:c[i]?.t,price:cl[i]}); holding=false; } const cur=holding?equity*(cl[i]/entry):equity; eq.push(cur); bh.push(cl[i]/p0); } if(holding){ const r=(cl[endIndex]-entry)/entry; tr.push(r); equity*=(1+r); } const fin=eq[eq.length-1]||1; const tot=(fin-1)*100; const bhr=((bh[bh.length-1]||1)-1)*100; const wins=tr.filter(x=>x>0).length; const wr=tr.length?wins/tr.length*100:0; let peak=-1e9,mdd=0; eq.forEach(v=>{ if(v>peak)peak=v; const dd=(v-peak)/peak; if(dd<mdd)mdd=dd; }); const chartCandles=c.slice(startIndex,endIndex+1),rangeKey=market+':'+start+':'+end+':'+startIndex+'-'+endIndex; return {rangeKey,candles:chartCandles,markers:mk,eq,bh,summary:{market,rangeKey,fullCandleCount:c.length,rangeCandleCount:chartCandles.length,dataFrom:c[0]?.t,dataTo:c[c.length-1]?.t,from:chartCandles[0]?.t,to:chartCandles[chartCandles.length-1]?.t,requestedFrom:start,requestedTo:end,source:'legacy frontend daily'},metrics:{totalReturn:tot,bhReturn:bhr,winRate:wr,trades:tr.length,mdd:mdd*100,vsBH:tot-bhr}}; }
  _computeConsistency(){ const r=this.state.responses; const ids=Object.keys(r); let match=0; const mism=[]; ids.forEach(id=>{ const a=r[id].action; const s=this._strategyDecide(this.surveys[id].features,false,0); if(s===a)match++; else mism.push({survey:Number(id)+1,user:a,strat:s}); }); return {pct:ids.length?Math.round(match/ids.length*100):0,total:ids.length,match,mism}; }
  _genCode(v){ const p=this._codeParams; const n=this.doneCount(); const tier=n>FREE_SURVEY_LIMIT?'정밀 인식':'기본 인식'; const buys=Object.keys(this.state.responses).filter(id=>this.state.responses[id].action==='BUY').map(id=>'#'+(Number(id)+1)).join(', ')||'—'; let s='';
    s+='# Tacit Trader 자동 생성 전략  ·  v'+v+'\n';
    s+='# 단계: '+tier+' · 근거: 설문 응답 '+n+'건'+(p.extra.length?' + 수정 멘트 '+p.extra.length+'건':'')+'\n';
    s+='# 매수 신호가 나온 설문: '+buys+'\n\n';
    s+='def decide(features: dict, position: dict) -> dict:\n';
    s+='    rsi      = features["rsi14"]\n';
    s+='    vol      = features["vol_ratio"]\n';
    s+='    ma_align = features["ma_align"]\n';
    s+='    holding  = position["holding"]\n';
    s+='    pnl      = position["pnl_pct"]\n\n';
    s+='    # 매수: 과매도 반등 + 거래량 동반\n';
    s+='    if (not holding) and rsi < '+p.rsiBuy+' and vol > '+p.volBuy+':\n';
    s+='        return {"action": "BUY", "reason": f"RSI {rsi:.0f} 과매도 + 거래량 {vol:.1f}x"}\n\n';
    s+='    # 매도: 과열 / 목표 / 손절\n';
    s+='    if holding and (rsi > '+p.rsiSell+' or pnl > '+p.pnlTake.toFixed(1)+' or pnl < '+p.pnlStop.toFixed(1)+'):\n';
    s+='        return {"action": "SELL", "reason": "과열 또는 목표·손절 도달"}\n\n';
    if(p.extra.length){ p.extra.slice(-2).forEach(e=>{ s+='    # 정제 반영: '+e+'\n'; }); }
    s+='    return {"action": "HOLD", "reason": "조건 불충족 — 관망"}\n';
    return s; }
  _highlight(code){ const R=React.createElement; const kw=new Set(['def','return','if','elif','else','and','or','not','in','None','True','False','import','for','while','is']); const fn=new Set(['decide','features','position','dict']); const lines=code.split('\n'); const out=lines.map((line,li)=>{ let parts; if(line.trim().indexOf('#')===0){ parts=[R('span',{key:'c',style:{color:'#8b949e'}},line)]; } else { parts=[]; const re=/("(?:[^"\\]|\\.)*"|#.*$|\b\d+\.?\d*\b|[A-Za-z_]\w*|\s+|[^\sA-Za-z0-9_"]+)/g; let m,k=0; while((m=re.exec(line))){ const t=m[0]; let col=null; if(t[0]==='"')col='#a5d6ff'; else if(t[0]==='#')col='#8b949e'; else if(/^\d/.test(t))col='#79c0ff'; else if(kw.has(t))col='#ff7b72'; else if(fn.has(t))col='#d2a8ff'; parts.push(col?R('span',{key:k++,style:{color:col}},t):t); } } return R('div',{key:li,style:{minHeight:'1.5em',whiteSpace:'pre'}},parts.length?parts:'\u00a0'); }); return R('pre',{style:{margin:0,fontFamily:"'JetBrains Mono', monospace",fontSize:'12.5px',lineHeight:1.5,color:'#e6edf3'}},out); }
  _kfmt(v){ if(v>=1e6) return (v/1e4).toLocaleString(undefined,{maximumFractionDigits:0})+'만'; if(v>=1000) return Math.round(v).toLocaleString(); return v.toFixed(1); }
  _axisDateLabel(value,intraday=false){ const text=String(value||''); if(!text)return ''; if(/^\d{4}-\d{2}-\d{2}/.test(text)){ const md=text.slice(5,10).replace('-','/'),hm=text.slice(11,16); return intraday&&hm?md+' '+hm:md; } return text; }
  _chartIntervalMinutes(c){
    const diffs=[];
    for(let i=1;i<c.length;i++){
      const prev=parseChartTime(c[i-1]?.t),cur=parseChartTime(c[i]?.t);
      if(prev&&cur){
        const diff=Math.abs(cur-prev)/60000;
        if(Number.isFinite(diff)&&diff>0) diffs.push(diff);
      }
      if(diffs.length>=12) break;
    }
    if(!diffs.length) return 1440;
    diffs.sort((a,b)=>a-b);
    return diffs[Math.floor(diffs.length/2)]||1440;
  }
  _chartSpanCount(c,spanKey){
    const span=CHART_SPANS.find(x=>x.key===spanKey);
    if(!span) return c.length;
    return Math.min(c.length,span.count||c.length);
  }
  _chartSpanRange(c,spanKey,o={}){
    const custom=o.spanRanges?.[spanKey];
    const raw=Number.isFinite(custom)?custom:this._chartSpanCount(c,spanKey);
    return clampNumber(Math.round(raw),1,Math.max(1,c.length));
  }
  _surveyChartSpanRange(count,spanKey){
    const max=Math.max(1,count||1);
    const ranges={ second:20, minute:30, day:60, week:90, month:120, year:max };
    return clampNumber(ranges[spanKey]||max,1,max);
  }
  _resolveChartView(c,key,defaultRange){
    const count=c.length;
    const saved=key?this.state.chartViews[key]:null;
    const desired=Math.floor(saved?.range||defaultRange||count);
    const range=clampNumber(Math.max(1,desired),1,Math.max(1,count));
    let end=Number.isFinite(saved?.endIndex)?Math.round(saved.endIndex):count-1;
    end=clampNumber(end,range-1,count-1);
    const start=Math.max(0,end-range+1);
    return {key,range,endIndex:end,startIndex:start,count,spanKey:saved?.spanKey||null};
  }
  _setChartView=(key,range,endIndex,spanKey=null)=>{
    if(!key) return;
    this.setState(s=>({chartViews:{...s.chartViews,[key]:{range,endIndex,spanKey}},pendingDrawing:null}));
  };
  _pageChartView=(key,view,dir)=>{
    const nextEnd=clampNumber(view.endIndex+dir*view.range,view.range-1,view.count-1);
    this._setChartView(key,view.range,nextEnd,view.spanKey);
  };
  _zoomChartView=(key,view,ratio,factor)=>{
    const rawRange=view.range*factor;
    let nextRange=factor>1?Math.ceil(rawRange):Math.floor(rawRange);
    if(factor>1&&nextRange<=view.range) nextRange=view.range+1;
    if(factor<1&&nextRange>=view.range) nextRange=view.range-1;
    nextRange=clampNumber(nextRange,1,view.count);
    if(nextRange===view.range) return;
    const focus=view.startIndex+ratio*Math.max(0,view.range-1);
    const nextStart=focus-ratio*Math.max(0,nextRange-1);
    const nextEnd=clampNumber(Math.round(nextStart+nextRange-1),nextRange-1,view.count-1);
    this._setChartView(key,nextRange,nextEnd);
  };
  _chartButtonStyle(active=false,disabled=false,tone='#4f8cff'){
    return {display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:34,height:26,padding:'0 8px',borderRadius:7,border:'1px solid '+(active?tone:'#1f2630'),background:active?tone+'22':'#0e131b',color:disabled?'#4b5563':(active?'#e6edf3':'#9aa4b1'),fontSize:11,fontWeight:800,cursor:disabled?'not-allowed':'pointer',whiteSpace:'nowrap'};
  }
  _chartWithControls(c,o){
    o=o||{};
    const R=React.createElement,key=o.chartViewKey||o.chartKey||o.clipId||'chart';
    const defaultRange=Math.min(c.length,o.defaultRange||o.range||c.length);
    const view=this._resolveChartView(c,key,defaultRange);
    const intraday=o.intraday??chartNeedsTime(c);
    const startLabel=this._axisDateLabel(c[view.startIndex]?.t,intraday);
    const endLabel=this._axisDateLabel(c[view.endIndex]?.t,intraday);
    const bindWheel=o.chartViewKey?(node)=>{
      if(!node)return;
      node.onwheel=(ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        const r=node.getBoundingClientRect(),sx=(ev.clientX-r.left)/r.width;
        const ratio=clampNumber(sx,0,1),factor=ev.deltaY<0?0.72:1.38;
        this._zoomChartView(o.chartViewKey,view,ratio,factor);
      };
    }:undefined;
    const spanButtons=CHART_SPANS.map(span=>{
      const customSpanRange=Number.isFinite(o.spanRanges?.[span.key]);
      const rawSpanRange=customSpanRange?o.spanRanges[span.key]:this._chartSpanCount(c,span.key);
      const spanRange=this._chartSpanRange(c,span.key,o);
      const active=o.activeSpanKey?o.activeSpanKey===span.key:(view.spanKey?view.spanKey===span.key:(view.range===spanRange&&(customSpanRange||rawSpanRange<=c.length)));
      const onClick=o.onSpanSelect?()=>o.onSpanSelect(span.key):()=>this._setChartView(key,spanRange,c.length-1,span.key);
      return R('button',{key:span.key,type:'button',onClick,style:this._chartButtonStyle(active,false,'#4f8cff'),title:span.label+' · '+span.candleLabel},span.label);
    });
    const canPast=view.startIndex>0,canNewer=view.endIndex<c.length-1;
    return R('div',{ref:bindWheel,style:{display:'grid',gap:8,overscrollBehavior:'contain',touchAction:'none'}},
      R('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}},
        R('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
          R('button',{type:'button',disabled:!canPast,onClick:()=>this._pageChartView(key,view,-1),style:this._chartButtonStyle(false,!canPast,'#f0b90b'),title:'past page'},'<'),
          R('button',{type:'button',disabled:!canNewer,onClick:()=>this._pageChartView(key,view,1),style:this._chartButtonStyle(false,!canNewer,'#f0b90b'),title:'newer page'},'>'),
          R('button',{type:'button',disabled:!canNewer,onClick:()=>this._setChartView(key,view.range,c.length-1),style:this._chartButtonStyle(false,!canNewer,'#22c55e'),title:'latest'},'NOW')
        ),
        R('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},spanButtons),
        R('div',{style:{fontFamily:"'JetBrains Mono', monospace",fontSize:11,color:'#6b7280',whiteSpace:'nowrap'}},startLabel+' - '+endLabel+' / '+view.range)
      ),
      this._candleChart(c,{...o,range:view.range,endIndex:view.endIndex,chartViewKey:key,chartView:view})
    );
  }
  _candleChart(c,o){
    o=o||{}; const R=React.createElement; const ind=o.indicators||{}; const W=920,H=o.height||330,pL=12,pR=66,axisH=20,gap=8;
    const showVol=!!ind.volume,showRsi=!!ind.rsi,showMacd=!!ind.macd;
    const lowerH=(showVol?54:0)+(showRsi?58:0)+(showMacd?64:0)+([showVol,showRsi,showMacd].filter(Boolean).length?gap*([showVol,showRsi,showMacd].filter(Boolean).length-1):0);
    const priceTop=30,priceBottom=H-axisH-lowerH,priceH=Math.max(120,priceBottom-priceTop),pw=W-pL-pR;
    const range=Math.min(o.range||c.length,c.length),end=Number.isFinite(o.endIndex)?Math.max(range-1,Math.min(c.length-1,Math.round(o.endIndex))):c.length-1,start=Math.max(0,end-range+1),visible=c.slice(start,end+1),n=visible.length,cw=pw/(n||1),cl=c.map(x=>x.c);
    const sma=p=>{ const out=Array(c.length).fill(null); let sum=0; for(let i=0;i<c.length;i++){ sum+=cl[i]; if(i>=p)sum-=cl[i-p]; if(i>=p-1)out[i]=sum/p; } return out; };
    const ema=p=>{ const out=[]; const k=2/(p+1); let v=cl[0]; for(let i=0;i<c.length;i++){ v=i===0?cl[i]:cl[i]*k+v*(1-k); out.push(v); } return out; };
    const boll=(p,m)=>{ const mid=sma(p),up=Array(c.length).fill(null),lo=Array(c.length).fill(null); for(let i=p-1;i<c.length;i++){ const a=cl.slice(i-p+1,i+1),avg=mid[i],sd=Math.sqrt(a.reduce((s,v)=>s+(v-avg)*(v-avg),0)/p); up[i]=avg+m*sd; lo[i]=avg-m*sd; } return {mid,up,lo}; };
    const vwap=()=>{ const out=[]; let pv=0,v=0; c.forEach(d=>{ const tp=(d.h+d.l+d.c)/3; pv+=tp*d.v; v+=d.v; out.push(pv/(v||1)); }); return out; };
    const rsi=p=>{ const out=Array(c.length).fill(null); if(c.length<=p)return out; let ag=0,al=0; for(let i=1;i<=p;i++){ const d=cl[i]-cl[i-1]; if(d>0)ag+=d; else al-=d; } ag/=p; al/=p; out[p]=100-100/(1+(ag/(al||1e-9))); for(let i=p+1;i<c.length;i++){ const d=cl[i]-cl[i-1]; ag=(ag*(p-1)+(d>0?d:0))/p; al=(al*(p-1)+(d<0?-d:0))/p; out[i]=100-100/(1+(ag/(al||1e-9))); } return out; };
    const emaFrom=(a,p)=>{ const out=[]; const k=2/(p+1); let v=a[0]||0; for(let i=0;i<a.length;i++){ v=i===0?(a[i]||0):(a[i]||0)*k+v*(1-k); out.push(v); } return out; };
    const ma7=sma(7),ma20=sma(20),ma25=sma(25),ma30=sma(30),ma60=sma(60),ma99=sma(99),ma120=sma(120),bb=boll(20,2),vw=vwap(),rs=rsi(14),ema12=ema(12),ema26=ema(26),macd=ema12.map((v,i)=>v-ema26[i]),sig=emaFrom(macd,9),hist=macd.map((v,i)=>v-sig[i]);
    const intervalMs=(()=>{ const minutes=this._chartIntervalMinutes(c); return Math.max(1,minutes*60000); })();
    const markerToleranceMs=Number.isFinite(o.markerTimeToleranceMs)?o.markerTimeToleranceMs:intervalMs*1.5;
    const markerIndex=(m)=>{
      if(m.t){
        const exact=c.findIndex(d=>d.t===m.t);
        if(exact>=0)return exact;
        const mt=parseChartTime(m.t);
        if(!mt)return -1;
        let best=-1,dist=Infinity;
        c.forEach((d,i)=>{ const dt=parseChartTime(d.t); if(!dt)return; const gap=Math.abs(dt-mt); if(gap<dist){ dist=gap; best=i; } });
        return dist<=markerToleranceMs?best:-1;
      }
      if(Number.isFinite(m.i)){
        const direct=Math.round(m.i);
        return direct>=0&&direct<c.length?direct:-1;
      }
      return -1;
    };
    const visibleMarkers=(o.markers||[]).map((m,k)=>({m,k,idx:markerIndex(m)})).filter(x=>x.idx>=start&&x.idx<=end&&c[x.idx]);
    const priceVals=[]; visible.forEach(d=>priceVals.push(d.l,d.h));
    const pushSeries=a=>visible.forEach((_,i)=>{ const v=a[start+i]; if(Number.isFinite(v))priceVals.push(v); });
    if(ind.maBinance){ [ma7,ma25,ma99].forEach(pushSeries); }
    if(ind.maClassic){ [ma20,ma30,ma60,ma120].forEach(pushSeries); }
    if(ind.bb){ [bb.up,bb.lo].forEach(pushSeries); }
    if(ind.vwap)pushSeries(vw);
    (o.drawings||[]).forEach(d=>{ if(d.type==='hline')priceVals.push(d.price); if(d.type==='trend'){ priceVals.push(d.a.price,d.b.price); } });
    visibleMarkers.forEach(({m})=>{ if(Number.isFinite(m.price))priceVals.push(m.price); });
    if(o.pendingDrawing&&o.pendingDrawing.survey===o.surveyIndex)priceVals.push(o.pendingDrawing.price);
    let mn=Math.min.apply(null,priceVals),mx=Math.max.apply(null,priceVals),pad=(mx-mn||1)*0.06; mn-=pad; mx+=pad; const rg=(mx-mn)||1;
    const y=v=>priceTop+(1-(v-mn)/rg)*priceH, x=i=>pL+cw*(i+0.5), xAbs=i=>pL+cw*(i-start+0.5);
    const pathFor=(series,yfn)=>{ let d='',open=false; visible.forEach((_,i)=>{ const v=series[start+i]; if(!Number.isFinite(v)){ open=false; return; } d+=(open?' L ':' M ')+x(i).toFixed(1)+' '+yfn(v).toFixed(1); open=true; }); return d; };
    // Display-only gap: keep close MA 7/25/99 lines readable without changing series values.
    const maGapPx=Number.isFinite(o.maGapPx)?o.maGapPx:16, shiftedY=(offset)=>(v)=>y(v)+offset;
    const e=[],clipId=o.clipId||'tt-price-clip';
    e.push(R('defs',{key:'defs'},R('clipPath',{id:clipId},R('rect',{x:pL,y:priceTop,width:pw,height:priceH}))));
    for(let g=0;g<=4;g++){ const val=mn+rg*g/4,yy=y(val); e.push(R('line',{key:'pg'+g,x1:pL,x2:pL+pw,y1:yy,y2:yy,stroke:'#1a212c',strokeWidth:1})); e.push(R('text',{key:'pl'+g,x:pL+pw+7,y:yy+3,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace'},this._kfmt(val))); }
    for(let g=0;g<=4;g++){ const xx=pL+pw*g/4; e.push(R('line',{key:'vg'+g,x1:xx,x2:xx,y1:priceTop,y2:H-axisH,stroke:'#121922',strokeWidth:1})); }
    const last=visible[n-1]||c[c.length-1],lastUp=last.c>=last.o,lastColor=lastUp?'#22c55e':'#ef4444',change=(last.c-last.o)/last.o*100;
    e.push(R('text',{key:'ohlc',x:pL,y:18,fill:'#7d8794',fontSize:10,fontFamily:'JetBrains Mono, monospace'},'O '+this._kfmt(last.o)+'  H '+this._kfmt(last.h)+'  L '+this._kfmt(last.l)+'  C '+this._kfmt(last.c)+'  '+(change>=0?'+':'')+change.toFixed(2)+'%'));
    let lx=pL+390; const addLegend=(key,label,color,series)=>{ const v=series?series[c.length-1]:null,txt=label+(Number.isFinite(v)?' '+this._kfmt(v):''); e.push(R('text',{key,x:lx,y:18,fill:color,fontSize:10,fontFamily:'JetBrains Mono, monospace',fontWeight:700},txt)); lx+=Math.max(72,txt.length*7.1); };
    if(ind.maBinance){ addLegend('lma7','MA7','#f0b90b',ma7); addLegend('lma25','MA25','#d946ef',ma25); addLegend('lma99','MA99','#38bdf8',ma99); }
    if(ind.maClassic){ addLegend('lma20','MA20','#f97316',ma20); addLegend('lma30','MA30','#a78bfa',ma30); addLegend('lma60','MA60','#14b8a6',ma60); addLegend('lma120','MA120','#94a3b8',ma120); }
    visible.forEach((d,i)=>{ const up=d.c>=d.o,col=up?'#22c55e':'#ef4444',xx=x(i); e.push(R('line',{key:'w'+i,x1:xx,x2:xx,y1:y(d.h),y2:y(d.l),stroke:col,strokeWidth:1,clipPath:'url(#'+clipId+')'})); const bw=Math.max(2,cw*0.58),yo=y(d.o),yc=y(d.c); e.push(R('rect',{key:'b'+i,x:xx-bw/2,y:Math.min(yo,yc),width:bw,height:Math.max(1,Math.abs(yc-yo)),fill:col,rx:0.8,clipPath:'url(#'+clipId+')'})); });
    const addPath=(key,series,color,w,dash,yfn=y)=>{ const d=pathFor(series,yfn); if(d)e.push(R('path',{key,d,fill:'none',stroke:color,strokeWidth:w||1.4,strokeDasharray:dash||'',strokeLinecap:'round',strokeLinejoin:'round',clipPath:'url(#'+clipId+')'})); };
    const area=(u,l)=>{ const pts=[]; visible.forEach((_,i)=>{ const a=u[start+i],b=l[start+i]; if(Number.isFinite(a)&&Number.isFinite(b))pts.push({i,a,b}); }); if(pts.length>1){ const top=pts.map(p=>(p===pts[0]?'M':'L')+x(p.i).toFixed(1)+' '+y(p.a).toFixed(1)).join(' '); const bot=pts.slice().reverse().map(p=>'L'+x(p.i).toFixed(1)+' '+y(p.b).toFixed(1)).join(' '); e.push(R('path',{key:'bbfill',d:top+' '+bot+' Z',fill:'#f0b90b14',stroke:'none',clipPath:'url(#'+clipId+')'})); } };
    if(ind.bb){ area(bb.up,bb.lo); addPath('bbup',bb.up,'#f0b90b',1,'4 4'); addPath('bbmid',bb.mid,'#a3e635',1.1,''); addPath('bblo',bb.lo,'#f0b90b',1,'4 4'); }
    if(ind.vwap)addPath('vwap',vw,'#60a5fa',1.6,'3 3');
    if(ind.maClassic){ addPath('ma20',ma20,'#f97316'); addPath('ma30',ma30,'#a78bfa'); addPath('ma60',ma60,'#14b8a6'); addPath('ma120',ma120,'#94a3b8'); }
    if(ind.maBinance){ addPath('ma7',ma7,'#f0b90b',1.8,'',shiftedY(-maGapPx)); addPath('ma25',ma25,'#d946ef',1.8); addPath('ma99',ma99,'#38bdf8',1.8,'',shiftedY(maGapPx)); }
    const yy=y(last.c); e.push(R('line',{key:'lastline',x1:pL,x2:pL+pw,y1:yy,y2:yy,stroke:lastColor,strokeWidth:1,strokeDasharray:'5 4',opacity:.75})); e.push(R('rect',{key:'lastbox',x:pL+pw+5,y:yy-9,width:58,height:18,rx:4,fill:lastColor+'22',stroke:lastColor,strokeWidth:.8})); e.push(R('text',{key:'lasttxt',x:pL+pw+10,y:yy+3,fill:lastColor,fontSize:9,fontFamily:'JetBrains Mono, monospace',fontWeight:700},this._kfmt(last.c)));
    (o.drawings||[]).forEach((d,i)=>{ if(d.type==='hline'){ const py=y(d.price); e.push(R('line',{key:'dh'+i,x1:pL,x2:pL+pw,y1:py,y2:py,stroke:d.color,strokeWidth:1.6,strokeDasharray:'6 5',clipPath:'url(#'+clipId+')'})); e.push(R('text',{key:'dht'+i,x:pL+pw-2,y:py-5,fill:d.color,fontSize:9,fontFamily:'JetBrains Mono, monospace',textAnchor:'end'},this._kfmt(d.price))); } else if(d.type==='trend'){ e.push(R('line',{key:'dt'+i,x1:xAbs(d.a.i),y1:y(d.a.price),x2:xAbs(d.b.i),y2:y(d.b.price),stroke:d.color,strokeWidth:2,strokeLinecap:'round',clipPath:'url(#'+clipId+')'})); } });
    if(o.pendingDrawing&&o.pendingDrawing.survey===o.surveyIndex){ const pi=o.pendingDrawing.i-start; if(pi>=0&&pi<n)e.push(R('circle',{key:'pending',cx:x(pi),cy:y(o.pendingDrawing.price),r:4,fill:'#f0b90b',stroke:'#0a0e14',strokeWidth:1.5})); }
    visibleMarkers.forEach(({m,k,idx})=>{ const li=idx-start; const buy=m.type==='BUY',col=buy?'#22c55e':'#ef4444',dir=buy?1:-1,xx=x(li),base=Number.isFinite(m.price)?m.price:(buy?c[idx].l:c[idx].h),py=Math.max(priceTop+12,Math.min(priceBottom-12,buy?y(base)+13:y(base)-13)); e.push(R('path',{key:'m'+k,d:'M '+xx+' '+(py-6*dir)+' L '+(xx-5)+' '+(py+2*dir)+' L '+(xx+5)+' '+(py+2*dir)+' Z',fill:col,stroke:'#0a0e14',strokeWidth:0.8})); if(m.label)e.push(R('text',{key:'ml'+k,x:xx,y:py+(buy?16:-10),fill:col,fontSize:9,fontFamily:'JetBrains Mono, monospace',fontWeight:800,textAnchor:'middle'},m.label)); });
    let panelTop=priceBottom+gap;
    const panel=(key,h,label)=>{ const top=panelTop; panelTop+=h+gap; e.push(R('line',{key:key+'sep',x1:pL,x2:pL+pw,y1:top,y2:top,stroke:'#1f2630'})); e.push(R('text',{key:key+'lab',x:pL,y:top+12,fill:'#7d8794',fontSize:9,fontFamily:'JetBrains Mono, monospace',fontWeight:700},label)); return {top,h,bottom:top+h}; };
    if(showVol){ const p=panel('vol',54,'VOL'),mxv=Math.max.apply(null,visible.map(d=>d.v))||1; visible.forEach((d,i)=>{ const bh=d.v/mxv*(p.h-16),col=d.c>=d.o?'#22c55e66':'#ef444466'; e.push(R('rect',{key:'vol'+i,x:x(i)-Math.max(1,cw*.28),y:p.bottom-bh,width:Math.max(1,cw*.56),height:bh,fill:col})); }); e.push(R('text',{key:'volmax',x:pL+pw+7,y:p.top+12,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace'},this._kfmt(mxv))); }
    if(showRsi){ const p=panel('rsi',58,'RSI 14'),yr=v=>p.top+(1-v/100)*p.h; [70,30].forEach((v,i)=>e.push(R('line',{key:'rsig'+i,x1:pL,x2:pL+pw,y1:yr(v),y2:yr(v),stroke:'#26303d',strokeDasharray:'4 4'}))); const d=pathFor(rs,yr); if(d)e.push(R('path',{key:'rsip',d,fill:'none',stroke:'#f0b90b',strokeWidth:1.5})); e.push(R('text',{key:'rsiv',x:pL+pw+7,y:yr(rs[c.length-1]||50)+3,fill:'#f0b90b',fontSize:9,fontFamily:'JetBrains Mono, monospace'},(rs[c.length-1]||50).toFixed(0))); }
    if(showMacd){ const p=panel('macd',64,'MACD'),vals=visible.flatMap((_,i)=>[macd[start+i],sig[start+i],hist[start+i]]).filter(Number.isFinite),mxm=Math.max.apply(null,vals.map(v=>Math.abs(v)))||1,y0=p.top+p.h/2,ym=v=>y0-v/mxm*(p.h/2-8); e.push(R('line',{key:'macdz',x1:pL,x2:pL+pw,y1:y0,y2:y0,stroke:'#26303d'})); visible.forEach((_,i)=>{ const v=hist[start+i]||0,col=v>=0?'#22c55e88':'#ef444488'; e.push(R('rect',{key:'hist'+i,x:x(i)-Math.max(1,cw*.24),y:Math.min(y0,ym(v)),width:Math.max(1,cw*.48),height:Math.max(1,Math.abs(ym(v)-y0)),fill:col})); }); const md=pathFor(macd,ym),sd=pathFor(sig,ym); if(md)e.push(R('path',{key:'macdp',d:md,fill:'none',stroke:'#38bdf8',strokeWidth:1.4})); if(sd)e.push(R('path',{key:'macds',d:sd,fill:'none',stroke:'#f97316',strokeWidth:1.2})); }
    const intraday=o.intraday??chartNeedsTime(visible);
    for(let g=0;g<=4;g++){ const li=Math.min(n-1,Math.round((n-1)*g/4)),xx=x(li),label=this._axisDateLabel(visible[li]?.t,intraday); e.push(R('text',{key:'xl'+g,x:xx,y:H-6,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace',textAnchor:'middle'},label)); }
    const drawMode=!!o.onChartClick&&o.tool&&o.tool!=='cursor';
    const click=drawMode?(ev)=>{ const r=ev.currentTarget.getBoundingClientRect(),sx=(ev.clientX-r.left)/r.width*W,sy=(ev.clientY-r.top)/r.height*H; if(sx<pL||sx>pL+pw||sy<priceTop||sy>priceBottom)return; const li=Math.max(0,Math.min(n-1,Math.round((sx-pL)/cw-.5))),py=Math.max(priceTop,Math.min(priceBottom,sy)),price=mn+(1-(py-priceTop)/priceH)*rg; o.onChartClick({i:start+li,price}); }:undefined;
    return R('svg',{key:o.chartKey||undefined,viewBox:'0 0 '+W+' '+H,onClick:click,style:{width:'100%',height:'auto',display:'block',cursor:drawMode?'crosshair':'default',touchAction:'manipulation',userSelect:'none'}},e);
  }
  _equityChart(st,bh,A,dates=[],chartKey=''){ const R=React.createElement; const W=820,H=230,pT=12,pB=30,pL=10,pR=46; const all=st.concat(bh),mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),rg=(mx-mn)||1; const pw=W-pL-pR,ph=H-pT-pB,n=st.length; const x=i=>pL+pw*(i/(n-1||1)); const y=v=>pT+(1-(v-mn)/rg)*ph; const path=a=>a.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' '); const e=[]; for(let g=0;g<=3;g++){ const val=mn+rg*g/3,yy=y(val); e.push(R('line',{key:'g'+g,x1:pL,x2:pL+pw,y1:yy,y2:yy,stroke:'#1a212c'})); e.push(R('text',{key:'t'+g,x:pL+pw+6,y:yy+3,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace'},((val-1)*100).toFixed(0)+'%')); } const yb=y(1); e.push(R('line',{key:'b',x1:pL,x2:pL+pw,y1:yb,y2:yb,stroke:'#2a3340',strokeDasharray:'3 3'})); e.push(R('path',{key:'bh',d:path(bh),fill:'none',stroke:'#5a6472',strokeWidth:1.5})); e.push(R('path',{key:'ar',d:path(st)+' L '+x(n-1).toFixed(1)+' '+(pT+ph).toFixed(1)+' L '+x(0).toFixed(1)+' '+(pT+ph).toFixed(1)+' Z',fill:A+'1f'})); e.push(R('path',{key:'st',d:path(st),fill:'none',stroke:A,strokeWidth:2})); for(let g=0;g<=4;g++){ const i=Math.min(n-1,Math.round((n-1)*g/4)),label=this._axisDateLabel(dates[i]?.t||dates[i],false); e.push(R('text',{key:'xl'+g,x:x(i),y:H-7,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace',textAnchor:'middle'},label)); } return R('svg',{key:chartKey||undefined,viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:'auto',display:'block'}},e); }
  _now(){ return new Date().toTimeString().slice(0,8); }
  _loadPrecisionPass(){ try { return localStorage.getItem(PREMIUM_UNLOCK_KEY)==='true'; } catch { return false; } }
  isCurrentSurveyLocked(state=this.state){ const responses=state.responses||{}; return !responses[state.surveyIndex] && Object.keys(responses).length>=FREE_SURVEY_LIMIT && !state.precisionUnlocked; }
  doneCount(){ return Object.keys(this.state.responses).length; }
  fillDemo(){ const r={}; this.surveys.forEach((sv,i)=>{ const f=sv.features; let a,t; if(f.rsi14<38){ a='BUY'; t='RSI '+f.rsi14.toFixed(0)+'로 과매도인데 거래량 '+f.vol_ratio.toFixed(1)+'x 터져서 반등 노리고 분할 매수.'; } else if(f.rsi14>62){ a='SELL'; t='RSI '+f.rsi14.toFixed(0)+' 과열에 고점 부담이라 일부 익절.'; } else { a='HOLD'; t='방향 애매하고 '+f.ma_align+' 구간이라 일단 관망.'; } r[i]={action:a,reason:t,time:this._now()}; }); this.setState({responses:r}); }

  goSurvey=()=>this.setState({screen:'survey'});
  goStrategy=()=>this.setState({screen:'strategy'});
  goBacktest=()=>this.setState({screen:'backtest'});
  goMonitor=()=>this.setState({screen:'monitor'});
  goSettings=()=>this.setState({screen:'settings'});
  _setSurvey=(i)=>{ i=Math.max(0,Math.min(9,i)); const r=this.state.responses[i]; this.setState({surveyIndex:i,draftAction:r?r.action:null,draftReason:r?r.reason:'',pendingDrawing:null}); };
  goPrev=()=>this._setSurvey(this.state.surveyIndex-1);
  goNext=()=>this._setSurvey(this.state.surveyIndex+1);
  setChartRange=(range)=>this.setState(s=>({chartRange:range,pendingDrawing:null,chartViews:{...s.chartViews,['survey-'+s.surveyIndex]:{range,endIndex:this.surveys[s.surveyIndex].candles.length-1,spanKey:null}}}));
  setSurveyChartSpan=(spanKey)=>this.setState(s=>{
    const candles=this.surveys[s.surveyIndex].candles;
    const range=this._surveyChartSpanRange(candles.length,spanKey);
    return {chartRange:range,pendingDrawing:null,chartViews:{...s.chartViews,['survey-'+s.surveyIndex]:{range,endIndex:candles.length-1,spanKey}}};
  });
  toggleChartIndicator=(key)=>this.setState(s=>({chartIndicators:{...s.chartIndicators,[key]:!s.chartIndicators[key]}}));
  setChartTool=(tool)=>this.setState(s=>({chartTool:s.chartTool===tool?'cursor':tool,pendingDrawing:null}));
  clearChartDrawings=()=>this.setState(s=>({chartDrawings:{...s.chartDrawings,[s.surveyIndex]:[]},pendingDrawing:null}));
  onChartPoint=(pt)=>{ const tool=this.state.chartTool; if(tool==='cursor')return; const survey=this.state.surveyIndex; if(tool==='hline'){ const drawing={type:'hline',price:pt.price,color:'#f0b90b'}; this.setState(s=>({chartDrawings:{...s.chartDrawings,[survey]:[...(s.chartDrawings[survey]||[]),drawing]},pendingDrawing:null})); return; } if(tool==='trend'){ const start=this.state.pendingDrawing; if(start&&start.survey===survey){ const drawing={type:'trend',a:{i:start.i,price:start.price},b:{i:pt.i,price:pt.price},color:'#f0b90b'}; this.setState(s=>({chartDrawings:{...s.chartDrawings,[survey]:[...(s.chartDrawings[survey]||[]),drawing]},pendingDrawing:null})); } else { this.setState({pendingDrawing:{survey,i:pt.i,price:pt.price}}); } } };
  setBuy=()=>{ if(this.isCurrentSurveyLocked())return; this.setState({draftAction:'BUY'}); };
  setSell=()=>{ if(this.isCurrentSurveyLocked())return; this.setState({draftAction:'SELL'}); };
  setHold=()=>{ if(this.isCurrentSurveyLocked())return; this.setState({draftAction:'HOLD'}); };
  onReason=(e)=>{ if(this.isCurrentSurveyLocked())return; this.setState({draftReason:e.target.value}); };
  submitResponse=()=>{ if(this.isCurrentSurveyLocked())return; if(!this.state.draftAction||!this.state.draftReason.trim())return; this.setState(s=>{ const responses={...s.responses}; responses[s.surveyIndex]={action:s.draftAction,reason:s.draftReason.trim(),time:this._now()}; let nx=null; for(let k=0;k<10;k++){ if(!responses[k]){ nx=k; break; } } return {responses,surveyIndex:nx===null?s.surveyIndex:nx,draftAction:nx===null?s.draftAction:null,draftReason:nx===null?s.draftReason:''}; }); };
  startPrecisionCheckout=()=>{
    if(this.state.precisionUnlocked)return;
    if(PRECISION_PAYMENT_URL){
      const opened=window.open(PRECISION_PAYMENT_URL,'_blank','noopener,noreferrer');
      this.setState({paymentPending:true,paymentMessage:opened?'결제 후 이 창으로 돌아와 결제 완료 확인을 눌러주세요.':'팝업이 막혔습니다. 결제 링크를 새 탭에서 열 수 있도록 허용해주세요.'});
      return;
    }
    this.unlockPrecisionPass();
  };
  unlockPrecisionPass=()=>{ try { localStorage.setItem(PREMIUM_UNLOCK_KEY,'true'); } catch {} this.setState({precisionUnlocked:true,paymentPending:false,paymentMessage:'정밀 인식 패스가 활성화되었습니다. 10개 설문까지 저장할 수 있어요.'}); };
  _buildStrategyPrompt(extra){ const r=this.state.responses; const ids=Object.keys(r).sort((a,b)=>Number(a)-Number(b)); const lines=ids.map(id=>{ const resp=r[id]; const f=(this.surveys[id]&&this.surveys[id].features)||{}; const fx=['rsi14','vol_ratio','ma_align','macd','bb_pct','dist_from_high20'].map(k=>k+'='+(f[k]!==undefined&&f[k]!==null?f[k]:'?')).join(', '); return '시나리오 '+(Number(id)+1)+': 사용자 판단='+resp.action+', 이유="'+(resp.reason||'')+'", 지표('+fx+')'; }); let p='아래는 사용자가 과거 차트 시나리오에서 내린 매매 판단과 그 시점 지표입니다. 이 사용자의 매매 성향을 최대한 반영한 decide(features, position) 전략을 작성하세요.\n\n'+lines.join('\n'); if(extra) p+='\n\n[추가 수정 요청]\n'+extra; return p; }
  _applyGenerated=(done,version,label)=>{ this.setState(s=>({codifying:false,correctionDraft:'',strategy:{version,code:done.code,codeId:done.code_id},consistency:null,backtest:null,versions:[{version,label,time:this._now()},...s.versions]})); };
  runCodify=async()=>{ if(this.state.codifying||this.doneCount()<FREE_SURVEY_LIMIT)return; this.setState({codifying:true,codifyError:''}); const cnt=this.doneCount(); try{ const done=await generateTradingCode({prompt:this._buildStrategyPrompt(),maxIterations:4}); if(this._unmounted)return; if(!done||!done.passed){ this.setState({codifying:false,codifyError:'코드 검증 실패 — 다시 시도해 주세요.'}); return; } const v=(this.state.strategy?this.state.strategy.version:0)+1; this._applyGenerated(done,v,'초기 코드화 · 응답 '+cnt+'건'); }catch(error){ if(this._unmounted)return; this.setState({codifying:false,codifyError:error?.message||'코드 생성 실패'}); } };
  onCorrection=(e)=>this.setState({correctionDraft:e.target.value});
  runRefine=async()=>{ const t=this.state.correctionDraft.trim(); if(!t||this.state.codifying||!this.state.strategy)return; this.setState({codifying:true,codifyError:''}); try{ const done=await generateTradingCode({prompt:this._buildStrategyPrompt(t),maxIterations:4}); if(this._unmounted)return; if(!done||!done.passed){ this.setState({codifying:false,codifyError:'코드 검증 실패 — 다시 시도해 주세요.'}); return; } const v=this.state.strategy.version+1; this._applyGenerated(done,v,'정제: '+(t.length>20?t.slice(0,20)+'…':t)); }catch(error){ if(this._unmounted)return; this.setState({codifying:false,codifyError:error?.message||'코드 생성 실패'}); } };
  onBacktestMarket=(e)=>this.setState({backtestMarketDraft:e.target.value.toUpperCase(),backtestError:''});
  setBacktestMarket=(market)=>this.setState({backtestMarket:market,backtestMarketDraft:market,backtest:null,backtestError:'',backtestChartCandles:[],backtestChartError:''});
  onBacktestStartDate=(e)=>this.setState({backtestStartDate:e.target.value,backtest:null,backtestError:'',backtestChartCandles:[],backtestChartError:''});
  onBacktestEndDate=(e)=>this.setState({backtestEndDate:e.target.value,backtest:null,backtestError:'',backtestChartCandles:[],backtestChartError:''});
  runBacktest=async()=>{
    if(this.state.backtesting||!this.state.strategy)return;
    const codeId=this.state.strategy.codeId;
    if(!codeId){ this.setState({backtestError:'백엔드 code_id가 없습니다. 먼저 코드를 생성(코드화)해 주세요.'}); return; }
    const market=normalizeUpbitMarket(this._backtestMarketInput.current?.value||this.state.backtestMarketDraft);
    const range={startDate:this._backtestStartInput.current?.value||this.state.backtestStartDate,endDate:this._backtestEndInput.current?.value||this.state.backtestEndDate};
    this.setState({backtesting:true,backtestError:'',backtestChartError:'',backtestMarket:market,backtestMarketDraft:market,backtestStartDate:range.startDate,backtestEndDate:range.endDate});
    try{
      const start=range.startDate?range.startDate+'T00:00:00':null;
      const end=range.endDate?range.endDate+'T23:59:59':null;
      const result=await runBacktestApi({codeId,market,timeframe:'1d',start,end,lookback:400});
      if(this._unmounted)return;
      const candles=Array.isArray(result.candles)?result.candles:[];
      const rangeKey=market+':'+(result.period_start||start||'')+':'+(result.period_end||end||'');
      const backtest={
        rangeKey,
        candles,
        markers:result.markers||[],
        eq:result.eq||[],
        bh:result.bh||[],
        metrics:result.metrics,
        summary:{
          market,
          rangeKey,
          fullCandleCount:candles.length,
          rangeCandleCount:candles.length,
          dataFrom:result.period_start,
          dataTo:result.period_end,
          from:result.period_start,
          to:result.period_end,
          requestedFrom:range.startDate,
          requestedTo:range.endDate,
          source:'백엔드 백테스트('+(result.timeframe||'1d')+') · 생성 코드 실행',
        },
      };
      const span=this._chartSpan('day');
      const cacheKey=market+':'+span.key;
      const chartKey=this._backtestChartKey(market,span.key);
      this._backtestChartCache[cacheKey]=candles;
      this.setState(s=>({
        backtesting:false,
        backtest,
        backtestError:'',
        backtestChartSpan:span.key,
        backtestChartCandles:candles,
        backtestChartLoading:false,
        backtestChartError:'',
        chartViews:{...s.chartViews,[chartKey]:{range:candles.length,endIndex:candles.length-1}},
      }));
    }catch(error){
      if(this._unmounted)return;
      this.setState({backtesting:false,backtestError:error?.message||'백테스트 실패'});
    }
  };
  onMonitorMarket=(e)=>this.setState({monitorMarketDraft:e.target.value.toUpperCase(),monitorError:''});
  onMonitorMarketKeyDown=(e)=>{ if(e.key==='Enter') this.applyMonitorMarket(); };
  applyMonitorMarket=()=>this.setMonitorMarket(this.state.monitorMarketDraft);
  setMonitorMarket=(value)=>{
    const market=normalizeUpbitMarket(value);
    this._mon={holding:false,entry:0};
    if(market===this.state.monitorMarket){
      this.setState({monitorMarketDraft:market,monitorError:''},()=>{ this._pollSignal(); this._connectBackendMonitor(); if(!this.state.monitorHistoryCandles.length) this._loadMonitorHistory(); });
      return;
    }
    this._open=null;
    this._openReal=false;
    this._monitorHistoryCache={};
    this.setState({
      monitorMarket:market,
      monitorMarketDraft:market,
      wsConnected:false,
      price:null,
      prevPrice:null,
      signal:'HOLD',
      signalReason:'새 종목 데이터 수신 대기',
      alerts:[],
      monitorError:'',
      lastCandleTime:'',
      monitorCandles:[],
      monitorHistoryCandles:[],
      monitorHistoryLoading:false,
      monitorMarkers:[],
    },()=>{ this._connectWs(); this._pollSignal(); this._connectBackendMonitor(); this._loadMonitorHistory(); });
  };
  onWebhook=(e)=>this.setState({webhookDraft:e.target.value});
  enableNotifications=()=>{ requestNotifyPermission().then(p=>this.setState({notifPerm:p})); };
  testAlert=()=>this.sendTestAlert();
  markMonitorDecision=(type)=>{
    const candles=this.state.monitorCandles;
    const last=candles[candles.length-1];
    if(!last)return;
    const action=type==='SELL'?'SELL':'BUY';
    const price=Math.round(this.state.price||last.c);
    const marker={id:Date.now(),type:action,label:action==='BUY'?'B':'S',market:this.state.monitorMarket,t:last.t,price,time:this._now()};
    this.setState(s=>({monitorMarkers:[...s.monitorMarkers,marker].slice(-40)}));
  };
  clearMonitorMarkers=()=>this.setState({monitorMarkers:[]});

  renderVals(){
    const s=this.state; const A=this.props.accent||'#4f8cff';
    const livePrice=Number.isFinite(s.price)?s.price:null;
    const prevLivePrice=Number.isFinite(s.prevPrice)?s.prevPrice:livePrice;
    const openPrice=Number.isFinite(this._open)?this._open:null;
    const hasLivePrice=livePrice!==null;
    const topPriceColor=!hasLivePrice?'#9aa4b1':(livePrice>=prevLivePrice?'#22c55e':'#ef4444');
    const priceChangePct=(hasLivePrice&&openPrice)?(((livePrice-openPrice)/openPrice*100)>=0?'+':'')+((livePrice-openPrice)/openPrice*100).toFixed(2)+'%':'-';
    const actColor=a=>a==='BUY'?'#22c55e':a==='SELL'?'#ef4444':'#f59e0b';
    const doneCount=this.doneCount();
    const maxSurveyCount=this.surveys.length;
    const precisionUnlocked=!!s.precisionUnlocked;
    const currentAnswered=!!s.responses[s.surveyIndex];
    const surveyLocked=!currentAnswered&&doneCount>=FREE_SURVEY_LIMIT&&!precisionUnlocked;
    const canCodify=doneCount>=FREE_SURVEY_LIMIT;
    const basicDone=canCodify;
    const freeRemaining=Math.max(0,FREE_SURVEY_LIMIT-doneCount);
    const precisionExtraCount=Math.max(0,maxSurveyCount-FREE_SURVEY_LIMIT);
    const surveyProgressSuffix=' / '+(basicDone?maxSurveyCount:FREE_SURVEY_LIMIT)+' 응답';
    const surveyProgressLabel=doneCount+surveyProgressSuffix;
    const cur=this.surveys[s.surveyIndex]; const f=cur.features; const rangeUnit=cur.tf==='일'?'일':'봉';
    const navBase='display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:500;transition:all .12s;';
    const nav=k=>navBase+(s.screen===k?'color:#e6edf3;background:#161d28;':'color:#7d8794;background:transparent;');
    const actStyle=k=>{ const map={BUY:'#22c55e',SELL:'#ef4444',HOLD:'#f59e0b'}; const col=map[k]; const b='flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:14px;border-radius:10px;cursor:'+(surveyLocked?'not-allowed':'pointer')+';transition:all .12s;font-weight:700;'; return s.draftAction===k? b+'border:1.5px solid '+col+';background:'+col+'1f;color:'+col+';' : b+'border:1.5px solid #1f2630;background:#0e131b;color:#8b95a3;'; };
    const subOk=!surveyLocked&&!!s.draftAction&&!!s.draftReason.trim();
    const chip=(active,tone)=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:28,padding:'0 9px',borderRadius:7,border:'1px solid '+(active?(tone||A):'#1f2630'),background:active?((tone||A)+'24'):'#0e131b',color:active?'#e6edf3':'#8b95a3',fontSize:11.5,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'});
    const backtestMarket=normalizeUpbitMarket(s.backtestMarketDraft);
    const quickBacktestMarkets=['KRW-BTC','KRW-ETH','KRW-SOL','KRW-XRP','KRW-DOGE'].map(m=>({market:m,onClick:()=>this.setBacktestMarket(m),style:chip(backtestMarket===m,'#4f8cff')}));
    const monitorMarket=normalizeUpbitMarket(s.monitorMarketDraft);
    const quickMonitorMarkets=['KRW-BTC','KRW-ETH','KRW-SOL','KRW-XRP','KRW-DOGE'].map(m=>({market:m,onClick:()=>this.setMonitorMarket(m),style:chip(s.monitorMarket===m,'#22c55e')}));
    const monitorDecisionBtn=(tone,disabled=false)=>'border:1px solid '+(disabled?'#1f2630':tone)+';background:'+(disabled?'#0e131b':tone+'1f')+';color:'+(disabled?'#5a6472':tone)+';border-radius:8px;padding:9px 13px;font-size:12.5px;font-weight:800;cursor:'+(disabled?'not-allowed':'pointer')+';white-space:nowrap;';
    const rangeOptions=[20,30,60,120].map(n=>({label:n+rangeUnit,value:n,onClick:()=>this.setChartRange(n),style:chip(s.chartRange===n,'#f0b90b')}));
    const surveySpanRanges=CHART_SPANS.reduce((acc,span)=>{ acc[span.key]=this._surveyChartSpanRange(cur.candles.length,span.key); return acc; },{});
    const indicatorMeta=[
      {key:'maBinance',label:'MA 7/25/99',tone:'#f0b90b'},
      {key:'maClassic',label:'MA 20/30/60/120',tone:'#a78bfa'},
      {key:'bb',label:'BB 20',tone:'#a3e635'},
      {key:'vwap',label:'VWAP',tone:'#60a5fa'},
      {key:'volume',label:'VOL',tone:'#22c55e'},
      {key:'rsi',label:'RSI 14',tone:'#f0b90b'},
      {key:'macd',label:'MACD',tone:'#38bdf8'}
    ];
    const indicatorButtons=indicatorMeta.map(it=>({label:it.label,onClick:()=>this.toggleChartIndicator(it.key),style:chip(!!s.chartIndicators[it.key],it.tone)}));
    const toolButtons=[
      {key:'cursor',label:'커서',tone:'#4f8cff'},
      {key:'trend',label:'추세선',tone:'#f0b90b'},
      {key:'hline',label:'수평선',tone:'#f0b90b'}
    ].map(it=>({label:it.label,onClick:()=>this.setChartTool(it.key),style:chip(s.chartTool===it.key,it.tone)}));
    const drawingCount=(s.chartDrawings[s.surveyIndex]||[]).length;
    const fr=[
      {label:'RSI (14)',value:f.rsi14.toFixed(0),tone:f.rsi14<35?'u':f.rsi14>65?'d':'m'},
      {label:'거래량비',value:f.vol_ratio.toFixed(2)+'x',tone:f.vol_ratio>1.3?'u':f.vol_ratio<0.7?'d':'m'},
      {label:'MA 7/25/99',value:f.ma_align,tone:f.ma_align==='정배열'?'u':f.ma_align==='역배열'?'d':'m'},
      {label:'MA 20/30',value:this._kfmt(f.ma20)+' / '+this._kfmt(f.ma30),tone:f.ma20>f.ma30?'u':f.ma20<f.ma30?'d':'m'},
      {label:'MA 60/120',value:this._kfmt(f.ma60)+' / '+this._kfmt(f.ma120),tone:f.ma60>f.ma120?'u':f.ma60<f.ma120?'d':'m'},
      {label:'MACD',value:(f.macd/f.close*100).toFixed(2),tone:f.macd>=0?'u':'d'},
      {label:'볼린저 %B',value:(f.bb_pct*100).toFixed(0)+'%',tone:f.bb_pct<0.2?'u':f.bb_pct>0.8?'d':'m'},
      {label:'밴드폭',value:(f.bb_width*100).toFixed(1)+'%',tone:'m'},
      {label:'20'+rangeUnit+' 고점대비',value:f.dist_from_high20.toFixed(1)+'%',tone:f.dist_from_high20>-1.5?'d':'m'},
      {label:'20'+rangeUnit+' 저점대비',value:'+'+f.dist_from_low20.toFixed(1)+'%',tone:f.dist_from_low20<3?'u':'m'},
      {label:'ATR',value:f.atr_pct.toFixed(2)+'%',tone:'m'}
    ].map(r=>({label:r.label,value:r.value,color:r.tone==='u'?'#22c55e':r.tone==='d'?'#ef4444':'#aeb7c2'}));
    const ctx=Object.keys(s.responses).map(id=>({survey:'#'+(Number(id)+1),action:s.responses[id].action,color:actColor(s.responses[id].action),reason:s.responses[id].reason,time:s.responses[id].time}));
    const bt=s.backtest; const cons=s.consistency;
    const backtestRangeText=(s.backtestStartDate||'-')+' ~ '+(s.backtestEndDate||'-');
    const backtestMetaText=bt?.summary ? (bt.summary.market+' · 백엔드 수집 '+dateOnly(bt.summary.dataFrom)+' ~ '+dateOnly(bt.summary.dataTo)+' ('+bt.summary.fullCandleCount+'개) · 적용 '+dateOnly(bt.summary.from)+' ~ '+dateOnly(bt.summary.to)+' ('+bt.summary.rangeCandleCount+'개 일봉)') : (backtestMarket+' · 최근 200개 일봉 수집 후 '+backtestRangeText+' 적용');
    const backtestSpan=this._chartSpan(s.backtestChartSpan);
    const backtestChartCandles=bt?(s.backtestChartCandles.length?s.backtestChartCandles:bt.candles):[];
    const backtestChartKey=bt?this._backtestChartKey(bt.summary.market,backtestSpan.key):'';
    const backtestChartHint=s.backtestChartLoading
      ? backtestSpan.label+' · '+backtestSpan.candleLabel+' 불러오는 중'
      : (s.backtestChartError
        ? s.backtestChartError
        : (backtestChartCandles.length
          ? backtestSpan.label+' · '+backtestSpan.candleLabel+' · '+backtestChartCandles.length.toLocaleString()+'개'
          : ''));
    const monitorMarkerItems=s.monitorMarkers.slice().reverse().map(m=>{ const hasPnl=!!m.price&&hasLivePrice; const pnl=hasPnl?((m.type==='BUY'?(livePrice-m.price):(m.price-livePrice))/m.price*100):0; return {id:m.id,type:m.type,label:m.type==='BUY'?'매수':'매도',color:m.type==='BUY'?'#22c55e':'#ef4444',price:m.price.toLocaleString(),time:m.time,date:this._axisDateLabel(m.t,true),pnlText:hasPnl?((pnl>=0?'+':'')+pnl.toFixed(2)+'%'):'-',pnlColor:hasPnl?(pnl>=0?'#22c55e':'#ef4444'):'#7d8794'}; });
    const monitorSpan=this._chartSpan(s.monitorChartSpan);
    const monitorChartCandles=s.monitorHistoryCandles.length?s.monitorHistoryCandles:s.monitorCandles;
    const monitorChartKey=this._monitorChartKey(s.monitorMarket,monitorSpan.key);
    const monitorChartHint=s.monitorHistoryLoading
      ? monitorSpan.label+' · '+monitorSpan.candleLabel+' 불러오는 중'
      : (s.monitorHistoryCandles.length
        ? monitorSpan.label+' · '+monitorSpan.candleLabel+' · '+s.monitorHistoryCandles.length.toLocaleString()+'개'
        : '실시간 신호용 1분봉');
    let metricCards=[];
    if(bt){ const m=bt.metrics; metricCards=[
      {label:'총 수익률',value:(m.totalReturn>=0?'+':'')+m.totalReturn.toFixed(1)+'%',color:m.totalReturn>=0?'#22c55e':'#ef4444',sub:'전략 누적'},
      {label:'vs 보유(B&H)',value:(m.vsBH>=0?'+':'')+m.vsBH.toFixed(1)+'%p',color:m.vsBH>=0?'#22c55e':'#ef4444',sub:'보유 '+m.bhReturn.toFixed(1)+'%'},
      {label:'승률',value:m.winRate.toFixed(0)+'%',color:'#e6edf3',sub:m.trades+'회 거래'},
      {label:'MDD',value:m.mdd.toFixed(1)+'%',color:'#f59e0b',sub:'최대 낙폭'} ]; }
    const mism=cons?cons.mism.map(x=>({survey:x.survey,user:x.user,strat:x.strat,userColor:actColor(x.user),stratColor:actColor(x.strat)})):[];
    const brandBtn=(disabled,wait)=>{ const b='border:none;border-radius:10px;padding:13px;font-weight:700;font-size:14px;width:100%;transition:all .12s;'; if(wait)return b+'background:#1a212c;color:#9aa4b1;cursor:wait;'; if(disabled)return b+'background:#1a212c;color:#5a6472;cursor:not-allowed;'; return b+'background:linear-gradient(90deg,'+A+',#22c55e);color:#06101f;cursor:pointer;'; };
    return {
      wsConnected:s.wsConnected,
      wsStatusText:s.wsConnected?'백엔드 시세 연결됨':'백엔드 연결 중…',
      monitorMarket:s.monitorMarket,
      monitorMarketDraft:s.monitorMarketDraft,
      monitorMarketPreview:monitorMarket,
      onMonitorMarket:this.onMonitorMarket,
      onMonitorMarketKeyDown:this.onMonitorMarketKeyDown,
      applyMonitorMarket:this.applyMonitorMarket,
      quickMonitorMarkets,
      monitorError:s.monitorError,
      lastCandleTime:s.lastCandleTime,
      livePriceFmt:hasLivePrice?livePrice.toLocaleString():'-',
      topPriceColor,
      navSurveyStyle:nav('survey'),navStrategyStyle:nav('strategy'),navBacktestStyle:nav('backtest'),navMonitorStyle:nav('monitor'),navSettingsStyle:nav('settings'),
      doneCount,
      freeSurveyLimit:FREE_SURVEY_LIMIT,
      maxSurveyCount,
      surveyCountBadge:doneCount+'/'+(precisionUnlocked?maxSurveyCount:FREE_SURVEY_LIMIT),
      surveyProgressLabel,
      surveyProgressSuffix,
      basicDone,
      canCodify,
      isSurveyLocked:surveyLocked,
      precisionUnlocked,
      precisionPriceLabel:PREMIUM_SURVEY_PRICE_LABEL,
      precisionExtraCount,
      paymentPrimaryLabel:PRECISION_PAYMENT_URL?'결제 페이지 열기':'데모 결제 완료',
      paymentMessage:s.paymentMessage,
      showPaymentConfirm:s.paymentPending&&!precisionUnlocked,
      startPrecisionCheckout:this.startPrecisionCheckout,
      unlockPrecisionPass:this.unlockPrecisionPass,
      isSurvey:s.screen==='survey',isStrategy:s.screen==='strategy',isBacktest:s.screen==='backtest',isMonitor:s.screen==='monitor',isSettings:s.screen==='settings',
      goSurvey:this.goSurvey,goStrategy:this.goStrategy,goBacktest:this.goBacktest,goMonitor:this.goMonitor,goSettings:this.goSettings,
      progressWidth:(doneCount/maxSurveyCount*100)+'%',
      curMarket:cur.market,curTf:cur.tf,surveyNo:s.surveyIndex+1,
      surveyTitle:cur.title,surveyIntent:cur.intent,surveyReason:cur.reason,surveyTags:cur.tags||[],
      chartRangeOptions:rangeOptions,chartIndicatorButtons:indicatorButtons,chartToolButtons:toolButtons,
      clearChartDrawings:this.clearChartDrawings,
      clearDrawStyle:{...chip(false,'#ef4444'),opacity:drawingCount?0.95:0.55,cursor:drawingCount?'pointer':'not-allowed'},
      chartDrawCount:drawingCount,
      chartPendingText:s.pendingDrawing&&s.pendingDrawing.survey===s.surveyIndex?'추세선 1점 선택됨':'',
      surveyChartEl:this._chartWithControls(cur.candles,{height:520,defaultRange:s.chartRange,spanRanges:surveySpanRanges,onSpanSelect:this.setSurveyChartSpan,indicators:s.chartIndicators,drawings:s.chartDrawings[s.surveyIndex]||[],pendingDrawing:s.pendingDrawing,surveyIndex:s.surveyIndex,tool:s.chartTool,onChartClick:this.onChartPoint,clipId:'survey-price-clip-'+s.surveyIndex,chartViewKey:'survey-'+s.surveyIndex,intraday:chartNeedsTime(cur.candles)}),
      featureRows:fr,
      goPrev:this.goPrev,goNext:this.goNext,
      setBuy:this.setBuy,setSell:this.setSell,setHold:this.setHold,
      buyStyle:actStyle('BUY'),sellStyle:actStyle('SELL'),holdStyle:actStyle('HOLD'),
      draftReason:s.draftReason,onReason:this.onReason,
      submitResponse:this.submitResponse,
      submitStyle:'border:none;border-radius:9px;padding:10px 18px;font-weight:700;font-size:13.5px;transition:all .12s;'+(subOk?'background:'+A+';color:#06101f;cursor:pointer;':'background:#1a212c;color:#5a6472;cursor:not-allowed;'),
      submitLabel:surveyLocked?'결제 후 저장 가능':'응답 저장 →',
      allDone:doneCount===maxSurveyCount,
      hasResponses:doneCount>0,noResponses:doneCount===0,
      contextItems:ctx,
      codifying:s.codifying,notCodifying:!s.codifying,
      codifyError:s.codifyError,hasCodifyError:!!s.codifyError,
      runCodify:this.runCodify,
      codifyStyle:brandBtn(!canCodify,s.codifying),
      codifyLabel:!canCodify?('설문 '+freeRemaining+'개 더 필요'):(s.strategy?'코드 재생성 ↻ (컨텍스트 누적)':'코드화 실행 →'),
      codifyHint:canCodify?(doneCount>FREE_SURVEY_LIMIT?'정밀 응답 '+doneCount+'건을 반영해 더 촘촘하게 코드화합니다.':'기본 응답 5건으로 코드 생성이 가능합니다.'):'기본 코드 생성까지 설문 '+freeRemaining+'개가 더 필요합니다.',
      hasStrategy:!!s.strategy,
      codeEl:s.strategy?this._highlight(s.strategy.code):null,
      versionLabel:s.strategy?('v'+s.strategy.version):'',
      correctionDraft:s.correctionDraft,onCorrection:this.onCorrection,runRefine:this.runRefine,
      refineStyle:'border:none;border-radius:9px;padding:11px 16px;font-weight:700;font-size:13px;white-space:nowrap;transition:all .12s;'+((s.correctionDraft.trim()&&!s.codifying)?'background:'+A+';color:#06101f;cursor:pointer;':'background:#1a212c;color:#5a6472;cursor:not-allowed;'),
      hasVersions:s.versions.length>0,versionItems:s.versions,
      btNeedStrategy:!s.strategy,
      btVersionLabel:s.strategy?('v'+s.strategy.version):'—',
      backtestMarketDraft:s.backtestMarketDraft,onBacktestMarket:this.onBacktestMarket,backtestMarketRef:this._backtestMarketInput,
      backtestStartDate:s.backtestStartDate,backtestEndDate:s.backtestEndDate,
      onBacktestStartDate:this.onBacktestStartDate,onBacktestEndDate:this.onBacktestEndDate,backtestStartRef:this._backtestStartInput,backtestEndRef:this._backtestEndInput,
      quickBacktestMarkets,
      backtestMetaText,
      backtestError:s.backtestError,hasBacktestError:!!s.backtestError,
      backtesting:s.backtesting,notBacktesting:!s.backtesting,
      runBacktest:this.runBacktest,
      backtestBtnStyle:'border:none;border-radius:9px;padding:11px 20px;font-weight:700;font-size:13.5px;transition:all .12s;'+(s.backtesting?'background:#1a212c;color:#9aa4b1;cursor:wait;':'background:'+A+';color:#06101f;cursor:pointer;'),
      backtestLabel:s.backtest?'다시 실행 ↻':'백테스트 실행 →',
      showBtIdle:!!s.strategy&&!s.backtest&&!s.backtesting,
      hasBacktest:!!s.backtest,
      metricCards,
      equityChartEl:bt?this._equityChart(bt.eq,bt.bh,A,bt.candles,bt.rangeKey):null,
      backtestChartHint,
      backtestChartHintColor:s.backtestChartError?'#ef4444':'#7d8794',
      backtestChartEl:bt&&backtestChartCandles.length?this._chartWithControls(backtestChartCandles,{markers:bt.markers,height:300,intraday:backtestSpan.source==='second'||backtestSpan.source==='minute',clipId:'backtest-price-clip',chartKey:bt.rangeKey+'-'+backtestSpan.key,chartViewKey:backtestChartKey,activeSpanKey:backtestSpan.key,onSpanSelect:this._selectBacktestChartSpan}):null,
      consistencyPct:cons?cons.pct:0,consistencyTotal:cons?cons.total:0,consistencyWidth:cons?(cons.pct+'%'):'0%',
      hasMismatch:!!cons&&cons.mism.length>0,noMismatch:!!cons&&cons.mism.length===0,mismatchItems:mism,
      monNeedStrategy:!s.strategy,
      backendMonStatus:s.backendMonStatus,backendMonLive:s.backendMonStatus==='connected',
      monitorSource:(s.strategy&&s.strategy.codeId)?'백엔드 실시간(생성 코드 실행)':'로컬 판단',
      signalText:s.signal==='BUY'?'BUY · 매수 신호':s.signal==='SELL'?'SELL · 매도 신호':'HOLD · 관망',
      signalColor:s.signal==='BUY'?'#22c55e':s.signal==='SELL'?'#ef4444':'#f59e0b',
      signalReason:s.signalReason,
      priceChangePct,
      hasMonitorCandles:monitorChartCandles.length>0,
      monitorHistoryLoading:s.monitorHistoryLoading,
      monitorChartHint,
      monitorChartEl:monitorChartCandles.length?this._chartWithControls(monitorChartCandles,{height:360,defaultRange:monitorChartCandles.length,indicators:{maBinance:true,bb:true,volume:true},markers:s.monitorMarkers,clipId:'monitor-price-clip',chartViewKey:monitorChartKey,activeSpanKey:monitorSpan.key,onSpanSelect:this._selectMonitorChartSpan,intraday:monitorSpan.source==='second'||monitorSpan.source==='minute'}):null,
      markMonitorBuy:()=>this.markMonitorDecision('BUY'),
      markMonitorSell:()=>this.markMonitorDecision('SELL'),
      clearMonitorMarkers:this.clearMonitorMarkers,
      monitorMarkDisabled:s.monitorCandles.length===0,
      monitorBuyBtnStyle:monitorDecisionBtn('#22c55e',s.monitorCandles.length===0),
      monitorSellBtnStyle:monitorDecisionBtn('#ef4444',s.monitorCandles.length===0),
      monitorClearBtnStyle:'background:#0e131b;border:1px solid #1f2630;color:'+(s.monitorMarkers.length?'#9aa4b1':'#5a6472')+';border-radius:8px;padding:9px 12px;font-size:12px;cursor:'+(s.monitorMarkers.length?'pointer':'not-allowed')+';white-space:nowrap;',
      monitorMarkerItems,hasMonitorMarkers:monitorMarkerItems.length>0,noMonitorMarkers:monitorMarkerItems.length===0,
      webhookDraft:s.webhookDraft,onWebhook:this.onWebhook,testAlert:this.testAlert,
      enableNotifications:this.enableNotifications,
      notifPerm:s.notifPerm,
      notifDisabled:s.notifPerm==='granted'||s.notifPerm==='unsupported',
      notifLabel:s.notifPerm==='granted'?'🔔 알림 켜짐':s.notifPerm==='denied'?'알림 차단됨':s.notifPerm==='unsupported'?'알림 미지원':'🔔 데스크톱 알림 켜기',
      notifBtnStyle:(()=>{ const on=s.notifPerm==='granted'; const off=s.notifPerm==='denied'||s.notifPerm==='unsupported'; const b='border-radius:7px;padding:7px 12px;font-size:12px;white-space:nowrap;'; if(on) return b+'background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.4);color:#22c55e;cursor:default;'; if(off) return b+'background:#0e131b;border:1px solid #1f2630;color:#5a6472;cursor:not-allowed;'; return b+'background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;cursor:pointer;'; })(),
      alertItems:s.alerts,hasAlerts:s.alerts.length>0,noAlerts:s.alerts.length===0,
      liveHint:this.props.liveSim===false?'(시뮬레이션 꺼짐 — 테스트 발송으로 확인)':'',
      alertMode:s.alertConfig.alertMode||'expert',alertModeOptions:ALERT_MODES,onAlertModeChange:(e)=>this.setAlertMode(e.target.value),
      alertConfig:s.alertConfig,saveAlertConfig:this.saveAlertConfig,sendTestAlert:this.sendTestAlert,backendStatus:s.backendStatus,samplePrice:livePrice,
      toasts:s.toasts,dismissToast:this.dismissToast
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div className="tt-app" style={css(`height:100vh;display:flex;flex-direction:column;background:#0a0e14;color:#e6edf3;font-family:'Pretendard',-apple-system,sans-serif;font-size:14px;overflow:hidden`)}>
        <Topbar v={v} />
        <div className="tt-main" style={css(`flex:1;display:flex;min-height:0`)}>
          <Sidebar v={v} />
          <div className="tt-scroll" style={css(`flex:1;overflow-y:auto;min-width:0`)}>
            <div className="tt-page" style={css((v.isSurvey?'max-width:1240px;':'max-width:1080px;')+'margin:0 auto;padding:26px 30px 60px')}>
              {v.isSurvey && <SurveyTab v={v} />}
              {v.isStrategy && <StrategyTab v={v} />}
              {v.isBacktest && <BacktestTab v={v} />}
              {v.isMonitor && <MonitorTab v={v} />}
              {v.isSettings && <SettingsTab v={v} />}
            </div>
          </div>
        </div>
        <AlertToasts toasts={v.toasts} onClose={v.dismissToast} />
        <ChatWidget />
      </div>
    );
  }

}

App.defaultProps = { accent: "#4f8cff", demoMode: false, liveSim: true };

export default App;
