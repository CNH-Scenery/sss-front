import React from "react";
import { css } from "./css.js";

class App extends React.Component {
  constructor(props){
    super(props);
    this._codeParams={rsiBuy:42,volBuy:1.05,rsiSell:60,pnlTake:10,pnlStop:-6,extra:[]};
    this._open=92418000;
    this.surveys=this._buildSurveys();
    this.state={ screen:'survey', surveyIndex:0, responses:{}, draftAction:null, draftReason:'',
      strategy:null, codifying:false, versions:[], correctionDraft:'',
      backtest:null, backtesting:false, consistency:null,
      price:92418000, prevPrice:92418000, signal:'HOLD', signalReason:'조건 불충족 — 관망', alerts:[], webhookDraft:'' };
  }
  componentDidMount(){ this._t=setInterval(this._tick,2300); if(this.props.demoMode) this.fillDemo(); }
  componentDidUpdate(prev){ if(!prev.demoMode && this.props.demoMode && this.doneCount()===0) this.fillDemo(); }
  componentWillUnmount(){ clearInterval(this._t); }

  _mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  _marketBase(m){ const b={'KRW-BTC':92000000,'KRW-ETH':5200000,'KRW-SOL':245000,'KRW-XRP':780,'KRW-DOGE':190}; return b[m]||100000; }
  _genCandles(seed,n,drift,base){ const rng=this._mulberry(seed); let price=base; const out=[]; for(let i=0;i<n;i++){ const ch=(rng()-0.5)*0.026+drift; const open=price; const close=price*(1+ch); const hi=Math.max(open,close)*(1+rng()*0.007); const lo=Math.min(open,close)*(1-rng()*0.007); const v=Math.round((0.5+rng()*1.8)*1000); out.push({o:open,h:hi,l:lo,c:close,v}); price=close; } return out; }
  _rsi(cl,p){ if(cl.length<p+1)return 50; let ag=0,al=0; for(let i=1;i<=p;i++){ const d=cl[i]-cl[i-1]; if(d>0)ag+=d; else al-=d; } ag/=p; al/=p; for(let i=p+1;i<cl.length;i++){ const d=cl[i]-cl[i-1]; ag=(ag*(p-1)+(d>0?d:0))/p; al=(al*(p-1)+(d<0?-d:0))/p; } const rs=ag/(al||1e-9); return 100-100/(1+rs); }
  _features(c){ const cl=c.map(x=>x.c),vs=c.map(x=>x.v),hi=c.map(x=>x.h),lo=c.map(x=>x.l); const last=cl[cl.length-1];
    const ma=n=>{ const s=cl.slice(-n); return s.reduce((a,b)=>a+b,0)/s.length; };
    const ma5=ma(5),ma20=ma(20),ma60=ma(Math.min(60,cl.length));
    const align=(ma5>ma20&&ma20>ma60)?'정배열':(ma5<ma20&&ma20<ma60)?'역배열':'혼조';
    const rsi=this._rsi(cl,14);
    const va=vs.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,vs.length);
    const volr=vs[vs.length-1]/va;
    const ema=p=>{ const k=2/(p+1); let e=cl[0]; for(let i=1;i<cl.length;i++) e=cl[i]*k+e*(1-k); return e; };
    const macd=ema(12)-ema(26);
    const sl=cl.slice(-20),m20=sl.reduce((a,b)=>a+b,0)/sl.length; const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m20)*(b-m20),0)/sl.length);
    const up=m20+2*sd,lw=m20-2*sd; const bbp=(last-lw)/((up-lw)||1); const bbw=(up-lw)/m20;
    let tr=0; for(let i=1;i<c.length;i++){ tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1])); } const atr=tr/Math.max(1,c.length-1);
    const h20=Math.max.apply(null,hi.slice(-20)),l20=Math.min.apply(null,lo.slice(-20));
    return {close:last,rsi14:rsi,vol_ratio:volr,ma5,ma20,ma60,ma_align:align,macd,bb_pct:bbp,bb_width:bbw,atr,atr_pct:atr/last*100,dist_from_high20:(last-h20)/h20*100,dist_from_low20:(last-l20)/l20*100}; }
  _featuresAt(c,i){ return this._features(c.slice(0,i+1)); }
  _buildSurveys(){ const M=['KRW-BTC','KRW-ETH','KRW-SOL','KRW-XRP','KRW-DOGE','KRW-BTC','KRW-ETH','KRW-SOL','KRW-XRP','KRW-DOGE']; const tf=['15','60','일','15','240','60','일','15','60','240']; const dr=[-0.006,0.004,-0.003,0.006,-0.008,0.0015,0.005,-0.004,0.0025,-0.0015]; const arr=[]; for(let i=0;i<10;i++){ const m=M[i]; const c=this._genCandles(1000+i*131,52,dr[i],this._marketBase(m)); arr.push({market:m,tf:tf[i],candles:c,features:this._features(c)}); } return arr; }
  _strategyDecide(f,holding,pnl){ const p=this._codeParams; if(!holding && f.rsi14<p.rsiBuy && f.vol_ratio>p.volBuy) return 'BUY'; if(holding && (f.rsi14>p.rsiSell || pnl>p.pnlTake || pnl<p.pnlStop)) return 'SELL'; return 'HOLD'; }
  _runBacktestData(){ const c=this._genCandles(2298,120,0.0006,this._marketBase('KRW-BTC')); const cl=c.map(x=>x.c); let holding=false,entry=0,equity=1; const eq=[],bh=[],mk=[],tr=[]; const p0=cl[0]; for(let i=20;i<c.length;i++){ const f=this._featuresAt(c,i); const pnl=holding?(cl[i]-entry)/entry*100:0; const a=this._strategyDecide(f,holding,pnl); if(a==='BUY'&&!holding){ holding=true; entry=cl[i]; mk.push({i,type:'BUY'}); } else if(a==='SELL'&&holding){ const r=(cl[i]-entry)/entry; tr.push(r); equity*=(1+r); mk.push({i,type:'SELL'}); holding=false; } const cur=holding?equity*(cl[i]/entry):equity; eq.push(cur); bh.push(cl[i]/p0); } if(holding){ const r=(cl[cl.length-1]-entry)/entry; tr.push(r); equity*=(1+r); } const fin=eq[eq.length-1]; const tot=(fin-1)*100; const bhr=(bh[bh.length-1]-1)*100; const wins=tr.filter(x=>x>0).length; const wr=tr.length?wins/tr.length*100:0; let peak=-1e9,mdd=0; eq.forEach(v=>{ if(v>peak)peak=v; const dd=(v-peak)/peak; if(dd<mdd)mdd=dd; }); return {candles:c,markers:mk,eq,bh,metrics:{totalReturn:tot,bhReturn:bhr,winRate:wr,trades:tr.length,mdd:mdd*100,vsBH:tot-bhr}}; }
  _computeConsistency(){ const r=this.state.responses; const ids=Object.keys(r); let match=0; const mism=[]; ids.forEach(id=>{ const a=r[id].action; const s=this._strategyDecide(this.surveys[id].features,false,0); if(s===a)match++; else mism.push({survey:Number(id)+1,user:a,strat:s}); }); return {pct:ids.length?Math.round(match/ids.length*100):0,total:ids.length,match,mism}; }
  _genCode(v){ const p=this._codeParams; const n=this.doneCount(); const buys=Object.keys(this.state.responses).filter(id=>this.state.responses[id].action==='BUY').map(id=>'#'+(Number(id)+1)).join(', ')||'—'; let s='';
    s+='# Tacit Trader 자동 생성 전략  ·  v'+v+'\n';
    s+='# 근거: 설문 응답 '+n+'건'+(p.extra.length?' + 수정 멘트 '+p.extra.length+'건':'')+'\n';
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
  _candleChart(c,o){ o=o||{}; const R=React.createElement; const W=820,H=o.height||300,pT=14,pB=22,pL=10,pR=58; const lows=c.map(x=>x.l),highs=c.map(x=>x.h); const mn=Math.min.apply(null,lows),mx=Math.max.apply(null,highs),rg=(mx-mn)||1; const pw=W-pL-pR,ph=H-pT-pB,n=c.length,cw=pw/n; const y=v=>pT+(1-(v-mn)/rg)*ph; const x=i=>pL+cw*(i+0.5); const e=[]; for(let g=0;g<=4;g++){ const val=mn+rg*g/4,yy=y(val); e.push(R('line',{key:'g'+g,x1:pL,x2:pL+pw,y1:yy,y2:yy,stroke:'#1a212c',strokeWidth:1})); e.push(R('text',{key:'gl'+g,x:pL+pw+6,y:yy+3,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace'},this._kfmt(val))); } c.forEach((d,i)=>{ const up=d.c>=d.o,col=up?'#22c55e':'#ef4444',xx=x(i); e.push(R('line',{key:'w'+i,x1:xx,x2:xx,y1:y(d.h),y2:y(d.l),stroke:col,strokeWidth:1})); const bw=Math.max(1.4,cw*0.6),yo=y(d.o),yc=y(d.c); e.push(R('rect',{key:'b'+i,x:xx-bw/2,y:Math.min(yo,yc),width:bw,height:Math.max(0.8,Math.abs(yc-yo)),fill:col})); }); (o.markers||[]).forEach((m,k)=>{ const xx=x(m.i),buy=m.type==='BUY'; const yy=buy?y(c[m.i].l)+13:y(c[m.i].h)-13,col=buy?'#22c55e':'#ef4444',dir=buy?1:-1; e.push(R('path',{key:'m'+k,d:'M '+xx+' '+(yy-6*dir)+' L '+(xx-5)+' '+(yy+2*dir)+' L '+(xx+5)+' '+(yy+2*dir)+' Z',fill:col,stroke:'#0a0e14',strokeWidth:0.8})); }); return R('svg',{viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:'auto',display:'block'}},e); }
  _equityChart(st,bh,A){ const R=React.createElement; const W=820,H=230,pT=12,pB=22,pL=10,pR=46; const all=st.concat(bh),mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),rg=(mx-mn)||1; const pw=W-pL-pR,ph=H-pT-pB,n=st.length; const x=i=>pL+pw*(i/(n-1||1)); const y=v=>pT+(1-(v-mn)/rg)*ph; const path=a=>a.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' '); const e=[]; for(let g=0;g<=3;g++){ const val=mn+rg*g/3,yy=y(val); e.push(R('line',{key:'g'+g,x1:pL,x2:pL+pw,y1:yy,y2:yy,stroke:'#1a212c'})); e.push(R('text',{key:'t'+g,x:pL+pw+6,y:yy+3,fill:'#5a6472',fontSize:9,fontFamily:'JetBrains Mono, monospace'},((val-1)*100).toFixed(0)+'%')); } const yb=y(1); e.push(R('line',{key:'b',x1:pL,x2:pL+pw,y1:yb,y2:yb,stroke:'#2a3340',strokeDasharray:'3 3'})); e.push(R('path',{key:'bh',d:path(bh),fill:'none',stroke:'#5a6472',strokeWidth:1.5})); e.push(R('path',{key:'ar',d:path(st)+' L '+x(n-1).toFixed(1)+' '+(pT+ph).toFixed(1)+' L '+x(0).toFixed(1)+' '+(pT+ph).toFixed(1)+' Z',fill:A+'1f'})); e.push(R('path',{key:'st',d:path(st),fill:'none',stroke:A,strokeWidth:2})); return R('svg',{viewBox:'0 0 '+W+' '+H,style:{width:'100%',height:'auto',display:'block'}},e); }
  _now(){ return new Date().toTimeString().slice(0,8); }
  doneCount(){ return Object.keys(this.state.responses).length; }
  fillDemo(){ const r={}; this.surveys.forEach((sv,i)=>{ const f=sv.features; let a,t; if(f.rsi14<38){ a='BUY'; t='RSI '+f.rsi14.toFixed(0)+'로 과매도인데 거래량 '+f.vol_ratio.toFixed(1)+'x 터져서 반등 노리고 분할 매수.'; } else if(f.rsi14>62){ a='SELL'; t='RSI '+f.rsi14.toFixed(0)+' 과열에 고점 부담이라 일부 익절.'; } else { a='HOLD'; t='방향 애매하고 '+f.ma_align+' 구간이라 일단 관망.'; } r[i]={action:a,reason:t,time:this._now()}; }); this.setState({responses:r}); }

  goSurvey=()=>this.setState({screen:'survey'});
  goStrategy=()=>this.setState({screen:'strategy'});
  goBacktest=()=>this.setState({screen:'backtest'});
  goMonitor=()=>this.setState({screen:'monitor'});
  _setSurvey=(i)=>{ i=Math.max(0,Math.min(9,i)); const r=this.state.responses[i]; this.setState({surveyIndex:i,draftAction:r?r.action:null,draftReason:r?r.reason:''}); };
  goPrev=()=>this._setSurvey(this.state.surveyIndex-1);
  goNext=()=>this._setSurvey(this.state.surveyIndex+1);
  setBuy=()=>this.setState({draftAction:'BUY'});
  setSell=()=>this.setState({draftAction:'SELL'});
  setHold=()=>this.setState({draftAction:'HOLD'});
  onReason=(e)=>this.setState({draftReason:e.target.value});
  submitResponse=()=>{ if(!this.state.draftAction||!this.state.draftReason.trim())return; this.setState(s=>{ const responses={...s.responses}; responses[s.surveyIndex]={action:s.draftAction,reason:s.draftReason.trim(),time:this._now()}; let nx=null; for(let k=0;k<10;k++){ if(!responses[k]){ nx=k; break; } } return {responses,surveyIndex:nx===null?s.surveyIndex:nx,draftAction:nx===null?s.draftAction:null,draftReason:nx===null?s.draftReason:''}; }); };
  runCodify=()=>{ if(this.state.codifying||this.doneCount()===0)return; this.setState({codifying:true}); setTimeout(()=>{ const v=(this.state.strategy?this.state.strategy.version:0)+1; const code=this._genCode(v); const cons=this._computeConsistency(); const cnt=this.doneCount(); this.setState(s=>({codifying:false,strategy:{version:v,code},consistency:cons,backtest:null,versions:[{version:v,label:'초기 코드화 · 응답 '+cnt+'건',time:this._now()},...s.versions]})); },1500); };
  onCorrection=(e)=>this.setState({correctionDraft:e.target.value});
  runRefine=()=>{ const t=this.state.correctionDraft.trim(); if(!t||this.state.codifying||!this.state.strategy)return; const p={...this._codeParams}; if(/손절|stop|빠르|리스크|보수/.test(t)) p.pnlStop=Math.min(-2,p.pnlStop+1); else if(/거래량|volume|볼륨|엄격/.test(t)) p.volBuy=Math.round((p.volBuy+0.2)*100)/100; else if(/익절|목표|수익|길게|버티|버텨/.test(t)) p.pnlTake=p.pnlTake+1.5; else if(/과매도|rsi|민감|덜|공격/.test(t)) p.rsiBuy=Math.min(45,p.rsiBuy+3); else p.rsiBuy=Math.min(45,p.rsiBuy+2); p.extra=[...p.extra,t]; this._codeParams=p; this.setState({codifying:true}); setTimeout(()=>{ const v=this.state.strategy.version+1; const code=this._genCode(v); const cons=this._computeConsistency(); this.setState(s=>({codifying:false,correctionDraft:'',strategy:{version:v,code},consistency:cons,backtest:null,versions:[{version:v,label:'정제: '+(t.length>20?t.slice(0,20)+'…':t),time:this._now()},...s.versions]})); },1400); };
  runBacktest=()=>{ if(this.state.backtesting||!this.state.strategy)return; this.setState({backtesting:true}); setTimeout(()=>{ this.setState({backtesting:false,backtest:this._runBacktestData()}); },1500); };
  onWebhook=(e)=>this.setState({webhookDraft:e.target.value});
  testAlert=()=>{ const al={action:'BUY',color:'#22c55e',text:'[테스트] KRW-BTC BUY 신호 · RSI 31 과매도 + 거래량 1.7x · '+this.state.price.toLocaleString()+'원',time:this._now()}; this.setState(s=>({alerts:[al,...s.alerts].slice(0,8)})); };
  _tick=()=>{ this.setState(s=>{ const ch=(Math.random()-0.48)*0.0035; const np=Math.round(s.price*(1+ch)); const u={prevPrice:s.price,price:np}; if(this.props.liveSim!==false && s.screen==='monitor' && s.strategy && Math.random()<0.28){ const r=Math.random(); let sig='HOLD',rs='조건 불충족 — 관망'; if(r<0.16){ sig='BUY'; rs='RSI 32 과매도 + 거래량 1.6x'; } else if(r<0.27){ sig='SELL'; rs='RSI 74 과열 / 목표 도달'; } if(sig!=='HOLD'){ const col=sig==='BUY'?'#22c55e':'#ef4444'; u.signal=sig; u.signalReason=rs; u.alerts=[{action:sig,color:col,text:'[KRW-BTC] '+sig+' 신호 · '+rs+' · '+np.toLocaleString()+'원',time:this._now()},...s.alerts].slice(0,8); } } return u; }); };

  renderVals(){
    const s=this.state; const A=this.props.accent||'#4f8cff';
    const actColor=a=>a==='BUY'?'#22c55e':a==='SELL'?'#ef4444':'#f59e0b';
    const cur=this.surveys[s.surveyIndex]; const f=cur.features;
    const navBase='display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:500;transition:all .12s;';
    const nav=k=>navBase+(s.screen===k?'color:#e6edf3;background:#161d28;':'color:#7d8794;background:transparent;');
    const actStyle=k=>{ const map={BUY:'#22c55e',SELL:'#ef4444',HOLD:'#f59e0b'}; const col=map[k]; const b='flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:14px;border-radius:10px;cursor:pointer;transition:all .12s;font-weight:700;'; return s.draftAction===k? b+'border:1.5px solid '+col+';background:'+col+'1f;color:'+col+';' : b+'border:1.5px solid #1f2630;background:#0e131b;color:#8b95a3;'; };
    const subOk=!!s.draftAction&&!!s.draftReason.trim();
    const fr=[
      {label:'RSI (14)',value:f.rsi14.toFixed(0),tone:f.rsi14<35?'u':f.rsi14>65?'d':'m'},
      {label:'거래량비',value:f.vol_ratio.toFixed(2)+'x',tone:f.vol_ratio>1.3?'u':f.vol_ratio<0.7?'d':'m'},
      {label:'MA 배열',value:f.ma_align,tone:f.ma_align==='정배열'?'u':f.ma_align==='역배열'?'d':'m'},
      {label:'MACD',value:(f.macd/f.close*100).toFixed(2),tone:f.macd>=0?'u':'d'},
      {label:'볼린저 %B',value:(f.bb_pct*100).toFixed(0)+'%',tone:f.bb_pct<0.2?'u':f.bb_pct>0.8?'d':'m'},
      {label:'밴드폭',value:(f.bb_width*100).toFixed(1)+'%',tone:'m'},
      {label:'20일 고점대비',value:f.dist_from_high20.toFixed(1)+'%',tone:f.dist_from_high20>-1.5?'d':'m'},
      {label:'20일 저점대비',value:'+'+f.dist_from_low20.toFixed(1)+'%',tone:f.dist_from_low20<3?'u':'m'},
      {label:'ATR',value:f.atr_pct.toFixed(2)+'%',tone:'m'}
    ].map(r=>({label:r.label,value:r.value,color:r.tone==='u'?'#22c55e':r.tone==='d'?'#ef4444':'#aeb7c2'}));
    const ctx=Object.keys(s.responses).map(id=>({survey:'#'+(Number(id)+1),action:s.responses[id].action,color:actColor(s.responses[id].action),reason:s.responses[id].reason,time:s.responses[id].time}));
    const bt=s.backtest; const cons=s.consistency;
    let metricCards=[];
    if(bt){ const m=bt.metrics; metricCards=[
      {label:'총 수익률',value:(m.totalReturn>=0?'+':'')+m.totalReturn.toFixed(1)+'%',color:m.totalReturn>=0?'#22c55e':'#ef4444',sub:'전략 누적'},
      {label:'vs 보유(B&H)',value:(m.vsBH>=0?'+':'')+m.vsBH.toFixed(1)+'%p',color:m.vsBH>=0?'#22c55e':'#ef4444',sub:'보유 '+m.bhReturn.toFixed(1)+'%'},
      {label:'승률',value:m.winRate.toFixed(0)+'%',color:'#e6edf3',sub:m.trades+'회 거래'},
      {label:'MDD',value:m.mdd.toFixed(1)+'%',color:'#f59e0b',sub:'최대 낙폭'} ]; }
    const mism=cons?cons.mism.map(x=>({survey:x.survey,user:x.user,strat:x.strat,userColor:actColor(x.user),stratColor:actColor(x.strat)})):[];
    const brandBtn=(disabled,wait)=>{ const b='border:none;border-radius:10px;padding:13px;font-weight:700;font-size:14px;width:100%;transition:all .12s;'; if(wait)return b+'background:#1a212c;color:#9aa4b1;cursor:wait;'; if(disabled)return b+'background:#1a212c;color:#5a6472;cursor:not-allowed;'; return b+'background:linear-gradient(90deg,'+A+',#22c55e);color:#06101f;cursor:pointer;'; };
    return {
      livePriceFmt:s.price.toLocaleString(),
      topPriceColor:s.price>=s.prevPrice?'#22c55e':'#ef4444',
      navSurveyStyle:nav('survey'),navStrategyStyle:nav('strategy'),navBacktestStyle:nav('backtest'),navMonitorStyle:nav('monitor'),
      doneCount:this.doneCount(),
      isSurvey:s.screen==='survey',isStrategy:s.screen==='strategy',isBacktest:s.screen==='backtest',isMonitor:s.screen==='monitor',
      goSurvey:this.goSurvey,goStrategy:this.goStrategy,goBacktest:this.goBacktest,goMonitor:this.goMonitor,
      progressWidth:(this.doneCount()/10*100)+'%',
      curMarket:cur.market,curTf:cur.tf,surveyNo:s.surveyIndex+1,
      surveyChartEl:this._candleChart(cur.candles,{height:300}),
      featureRows:fr,
      goPrev:this.goPrev,goNext:this.goNext,
      setBuy:this.setBuy,setSell:this.setSell,setHold:this.setHold,
      buyStyle:actStyle('BUY'),sellStyle:actStyle('SELL'),holdStyle:actStyle('HOLD'),
      draftReason:s.draftReason,onReason:this.onReason,
      submitResponse:this.submitResponse,
      submitStyle:'border:none;border-radius:9px;padding:10px 18px;font-weight:700;font-size:13.5px;transition:all .12s;'+(subOk?'background:'+A+';color:#06101f;cursor:pointer;':'background:#1a212c;color:#5a6472;cursor:not-allowed;'),
      allDone:this.doneCount()===10,
      hasResponses:this.doneCount()>0,noResponses:this.doneCount()===0,
      contextItems:ctx,
      codifying:s.codifying,notCodifying:!s.codifying,
      runCodify:this.runCodify,
      codifyStyle:brandBtn(this.doneCount()===0,s.codifying),
      codifyLabel:s.strategy?'코드 재생성 ↻ (컨텍스트 누적)':'코드화 실행 →',
      hasStrategy:!!s.strategy,
      codeEl:s.strategy?this._highlight(s.strategy.code):null,
      versionLabel:s.strategy?('v'+s.strategy.version):'',
      correctionDraft:s.correctionDraft,onCorrection:this.onCorrection,runRefine:this.runRefine,
      refineStyle:'border:none;border-radius:9px;padding:11px 16px;font-weight:700;font-size:13px;white-space:nowrap;transition:all .12s;'+((s.correctionDraft.trim()&&!s.codifying)?'background:'+A+';color:#06101f;cursor:pointer;':'background:#1a212c;color:#5a6472;cursor:not-allowed;'),
      hasVersions:s.versions.length>0,versionItems:s.versions,
      btNeedStrategy:!s.strategy,
      btVersionLabel:s.strategy?('v'+s.strategy.version):'—',
      backtesting:s.backtesting,notBacktesting:!s.backtesting,
      runBacktest:this.runBacktest,
      backtestBtnStyle:'border:none;border-radius:9px;padding:11px 20px;font-weight:700;font-size:13.5px;transition:all .12s;'+(s.backtesting?'background:#1a212c;color:#9aa4b1;cursor:wait;':'background:'+A+';color:#06101f;cursor:pointer;'),
      backtestLabel:s.backtest?'다시 실행 ↻':'백테스트 실행 →',
      showBtIdle:!!s.strategy&&!s.backtest&&!s.backtesting,
      hasBacktest:!!s.backtest,
      metricCards,
      equityChartEl:bt?this._equityChart(bt.eq,bt.bh,A):null,
      backtestChartEl:bt?this._candleChart(bt.candles,{markers:bt.markers,height:300}):null,
      consistencyPct:cons?cons.pct:0,consistencyTotal:cons?cons.total:0,consistencyWidth:cons?(cons.pct+'%'):'0%',
      hasMismatch:!!cons&&cons.mism.length>0,noMismatch:!!cons&&cons.mism.length===0,mismatchItems:mism,
      monNeedStrategy:!s.strategy,
      signalText:s.signal==='BUY'?'BUY · 매수 신호':s.signal==='SELL'?'SELL · 매도 신호':'HOLD · 관망',
      signalColor:s.signal==='BUY'?'#22c55e':s.signal==='SELL'?'#ef4444':'#f59e0b',
      signalReason:s.signalReason,
      priceChangePct:(((s.price-this._open)/this._open*100)>=0?'+':'')+((s.price-this._open)/this._open*100).toFixed(2)+'%',
      webhookDraft:s.webhookDraft,onWebhook:this.onWebhook,testAlert:this.testAlert,
      alertItems:s.alerts,hasAlerts:s.alerts.length>0,noAlerts:s.alerts.length===0,
      liveHint:this.props.liveSim===false?'(시뮬레이션 꺼짐 — 테스트 발송으로 확인)':''
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div style={css(`height:100vh;display:flex;flex-direction:column;background:#0a0e14;color:#e6edf3;font-family:'Pretendard',-apple-system,sans-serif;font-size:14px;overflow:hidden`)}>

        <div style={css(`display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 20px;border-bottom:1px solid #1f2630;background:#0c1118;flex:0 0 auto`)}>
          <div style={css(`display:flex;align-items:center;gap:10px`)}>
            <div style={css(`width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#4f8cff,#22c55e);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06101f;font-size:15px;font-family:'JetBrains Mono',monospace`)}>T</div>
            <div style={css(`font-weight:700;font-size:15px;letter-spacing:-0.01em`)}>Tacit Trader</div>
            <div style={css(`font-size:10.5px;color:#5a6472;border:1px solid #1f2630;border-radius:5px;padding:2px 6px;margin-left:2px`)}>internal</div>
          </div>
          <div style={css(`display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:12.5px`)}>
            <span style={css(`width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 7px #22c55e`)}></span>
            <span style={css(`color:#7d8794`)}>업비트 시세 연결됨</span>
            <span style={css(`color:#e6edf3;margin-left:8px`)}>KRW-BTC</span>
            <span style={{ color: v.topPriceColor }}>{v.livePriceFmt}</span>
          </div>
        </div>

        <div style={css(`flex:1;display:flex;min-height:0`)}>

          <div style={css(`width:222px;flex:0 0 auto;border-right:1px solid #1f2630;background:#0c1118;padding:16px 12px;display:flex;flex-direction:column;gap:3px`)}>
            <div style={css(`font-size:10px;letter-spacing:0.09em;color:#5a6472;font-weight:800;padding:4px 10px 8px`)}>워크플로우</div>
            <div onClick={v.goSurvey} style={css(v.navSurveyStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="12" y2="16"></line></svg>
              <span>설문</span><span style={css(`margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;opacity:.8`)}>{v.doneCount}/10</span>
            </div>
            <div onClick={v.goStrategy} style={css(v.navStrategyStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 6 3 12 8 18"></polyline><polyline points="16 6 21 12 16 18"></polyline></svg>
              <span>전략 코드화</span>
            </div>
            <div onClick={v.goBacktest} style={css(v.navBacktestStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"></line><polyline points="4 15 9 9 13 13 20 5"></polyline></svg>
              <span>백테스트</span>
            </div>
            <div onClick={v.goMonitor} style={css(v.navMonitorStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg>
              <span>모니터링</span>
            </div>
            <div style={css(`margin-top:auto;padding:12px 10px;border-top:1px solid #1a212c`)}>
              <div style={css(`font-size:10.5px;color:#5a6472;line-height:1.55`)}>읽기 전용 시세만 사용 · 주문 없음<br />최종 결정은 사용자</div>
            </div>
          </div>

          <div style={css(`flex:1;overflow-y:auto;min-width:0`)}>
            <div style={css(`max-width:1080px;margin:0 auto;padding:26px 30px 60px`)}>

              {v.isSurvey && (
              <div>
                <div style={css(`display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px`)}>
                  <div>
                    <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 1 · 암묵지 수집</div>
                    <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>매매 설문</h1>
                    <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>미래를 가린 과거 차트입니다. 이 시점이라면 어떻게 할지 자연어로 답하세요.</div>
                  </div>
                  <div style={css(`text-align:right;min-width:170px`)}>
                    <div style={css(`font-family:'JetBrains Mono',monospace;font-size:13px;color:#7d8794`)}><span style={css(`color:#e6edf3;font-size:20px;font-weight:700`)}>{v.doneCount}</span> / 10 응답</div>
                    <div style={css(`height:6px;background:#1a212c;border-radius:4px;margin-top:8px;overflow:hidden;width:170px`)}>
                      <div style={css(`height:100%;background:linear-gradient(90deg,#4f8cff,#22c55e);border-radius:4px;transition:width .4s;width:${v.progressWidth}`)}></div>
                    </div>
                  </div>
                </div>

                <div style={css(`display:grid;grid-template-columns:1.5fr 1fr;gap:16px;align-items:stretch`)}>
                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px`)}>
                      <div style={css(`display:flex;align-items:center;gap:8px`)}>
                        <span style={css(`font-weight:700;font-size:15px`)}>{v.curMarket}</span>
                        <span style={css(`font-size:11px;color:#7d8794;border:1px solid #1f2630;border-radius:5px;padding:2px 7px`)}>{v.curTf}봉</span>
                      </div>
                      <div style={css(`display:flex;align-items:center;gap:6px;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:6px;padding:3px 9px`)}>
                        <span style={css(`width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block`)}></span>이후 구간 가림
                      </div>
                    </div>
                    <div>{v.surveyChartEl}</div>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #1a212c`)}>
                      <button onClick={v.goPrev} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:6px 13px;font-size:12.5px;cursor:pointer`)}>← 이전</button>
                      <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#7d8794`)}>설문 {v.surveyNo} / 10</span>
                      <button onClick={v.goNext} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:6px 13px;font-size:12.5px;cursor:pointer`)}>다음 →</button>
                    </div>
                  </div>

                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                    <div style={css(`font-size:12px;font-weight:700;color:#9aa4b1;letter-spacing:0.02em;margin-bottom:3px`)}>지표 스냅샷</div>
                    <div style={css(`font-size:10.5px;color:#5a6472;margin-bottom:10px`)}>이 시점의 숫자가 응답과 함께 저장됩니다</div>
                    <div style={css(`display:flex;flex-direction:column`)}>
                      {v.featureRows.map((row, i) => (
                        <div key={i} style={css(`display:flex;align-items:center;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #161c25`)}>
                          <span style={css(`font-size:12.5px;color:#9aa4b1`)}>{row.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '13px', fontWeight: 600, color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;margin-top:16px`)}>
                  <div style={css(`font-weight:700;font-size:15px;margin-bottom:14px`)}>이 시점, 당신이라면?</div>
                  <div style={css(`display:flex;gap:10px;margin-bottom:14px`)}>
                    <button onClick={v.setBuy} style={css(v.buyStyle)}><span style={css(`font-size:15px`)}>매수</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>BUY</span></button>
                    <button onClick={v.setSell} style={css(v.sellStyle)}><span style={css(`font-size:15px`)}>매도</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>SELL</span></button>
                    <button onClick={v.setHold} style={css(v.holdStyle)}><span style={css(`font-size:15px`)}>관망</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>HOLD</span></button>
                  </div>
                  <textarea value={v.draftReason} onChange={v.onReason} placeholder="왜 그렇게 판단했나요? 예) 거래량이 터지면서 RSI가 30 아래로 빠져서 반등 노리고 분할 매수…" style={css(`width:100%;min-height:84px;resize:vertical;background:#0d1117;border:1.5px solid #1f2630;border-radius:10px;padding:12px 14px;color:#e6edf3;font-size:13.5px;line-height:1.5`)}></textarea>
                  <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-top:12px`)}>
                    <span style={css(`font-size:11.5px;color:#5a6472`)}>자연어로 자세히 쓸수록 코드 정확도가 올라갑니다</span>
                    <button onClick={v.submitResponse} style={css(v.submitStyle)}>응답 저장 →</button>
                  </div>
                </div>

                {v.allDone && (
                  <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(90deg,rgba(79,140,255,0.12),rgba(34,197,94,0.1));border:1px solid rgba(79,140,255,0.3);border-radius:12px;padding:16px 18px;margin-top:16px`)}>
                    <div><div style={css(`font-weight:700;font-size:15px`)}>설문 10개 완료</div><div style={css(`font-size:12.5px;color:#9aa4b1;margin-top:2px`)}>이제 누적된 응답을 파이썬 전략으로 코드화할 수 있어요.</div></div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:11px 18px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap`)}>코드화하러 가기 →</button>
                  </div>
                )}
              </div>
              )}

              {v.isStrategy && (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 2 · 코드화</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>전략 코드화</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>누적된 자연어 응답 + 지표 스냅샷에서 LLM이 임계값을 역설계해 <span style={css(`color:#d2a8ff;font-family:'JetBrains Mono',monospace`)}>decide()</span> 함수를 만듭니다.</div>
                </div>

                <div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start`)}>
                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;min-width:0`)}>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px`)}>
                      <div style={css(`font-weight:700;font-size:14px`)}>누적 컨텍스트</div>
                      <span style={css(`font-size:11px;color:#7d8794;font-family:'JetBrains Mono',monospace`)}>{v.doneCount}건</span>
                    </div>
                    {v.hasResponses && (
                      <div style={css(`display:flex;flex-direction:column;gap:8px;max-height:440px;overflow-y:auto`)}>
                        {v.contextItems.map((c, i) => (
                          <div key={i} style={css(`display:flex;gap:10px;padding:10px;background:#0e131b;border:1px solid #181f29;border-radius:9px`)}>
                            <span style={css(`font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#5a6472;padding-top:3px;min-width:22px`)}>{c.survey}</span>
                            <div style={css(`flex:1;min-width:0`)}>
                              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: c.color, border: '1px solid ' + c.color, borderRadius: '5px', padding: '1px 6px', marginBottom: '5px' }}>{c.action}</span>
                              <div style={css(`font-size:12.5px;color:#c2cad4;line-height:1.45`)}>{c.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {v.noResponses && (
                      <div style={css(`text-align:center;padding:44px 12px;color:#5a6472;font-size:13px;line-height:1.6`)}>아직 응답이 없습니다.<br />설문에 먼저 답해주세요.</div>
                    )}
                  </div>

                  <div style={css(`display:flex;flex-direction:column;gap:16px;min-width:0`)}>
                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                      <div style={css(`font-weight:700;font-size:14px;margin-bottom:14px`)}>전략 생성</div>
                      <button onClick={v.runCodify} style={css(v.codifyStyle)}>
                        {v.codifying && (<span><span style={css(`display:inline-block;width:14px;height:14px;border:2px solid rgba(6,16,31,.35);border-top-color:#06101f;border-radius:50%;animation:tt-spin .7s linear infinite;margin-right:8px;vertical-align:-2px`)}></span>LLM 분석 중…</span>)}
                        {v.notCodifying && (<span>{v.codifyLabel}</span>)}
                      </button>
                    </div>

                    {v.hasStrategy && (
                      <div style={css(`background:#0d1117;border:1px solid #1f2630;border-radius:12px;overflow:hidden`)}>
                        <div style={css(`display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#11151c;border-bottom:1px solid #1f2630`)}>
                          <div style={css(`display:flex;align-items:center;gap:8px`)}>
                            <span style={css(`display:flex;gap:5px`)}><span style={css(`width:10px;height:10px;border-radius:50%;background:#ef4444`)}></span><span style={css(`width:10px;height:10px;border-radius:50%;background:#f59e0b`)}></span><span style={css(`width:10px;height:10px;border-radius:50%;background:#22c55e`)}></span></span>
                            <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#9aa4b1;margin-left:6px`)}>strategy.py</span>
                          </div>
                          <span style={css(`font-family:'JetBrains Mono',monospace;font-size:11px;color:#4f8cff;background:rgba(79,140,255,.12);border-radius:5px;padding:2px 8px`)}>{v.versionLabel}</span>
                        </div>
                        <div style={css(`padding:14px 16px;max-height:360px;overflow:auto`)}>{v.codeEl}</div>
                      </div>
                    )}
                  </div>
                </div>

                {v.hasStrategy && (
                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-top:16px`)}>
                    <div style={css(`font-weight:700;font-size:14px;margin-bottom:4px`)}>전략 정제</div>
                    <div style={css(`font-size:12px;color:#7d8794;margin-bottom:12px`)}>결과가 감각과 다르거나 운용 중 생각이 바뀌면, 수정 멘트를 더해 재코드화하세요. 컨텍스트에 누적됩니다.</div>
                    <div style={css(`display:flex;gap:10px;align-items:flex-end`)}>
                      <textarea value={v.correctionDraft} onChange={v.onCorrection} placeholder="예) 손절을 더 빠르게 잡아줘 · 거래량 조건을 더 엄격하게 · 익절은 길게 버텨줘" style={css(`flex:1;min-height:48px;resize:vertical;background:#0d1117;border:1.5px solid #1f2630;border-radius:10px;padding:11px 13px;color:#e6edf3;font-size:13px;line-height:1.5`)}></textarea>
                      <button onClick={v.runRefine} style={css(v.refineStyle)}>재코드화 ↻</button>
                    </div>
                    {v.hasVersions && (
                      <div style={css(`margin-top:14px;border-top:1px solid #1a212c;padding-top:12px`)}>
                        <div style={css(`font-size:11px;color:#5a6472;font-weight:700;margin-bottom:9px`)}>버전 이력</div>
                        <div style={css(`display:flex;flex-direction:column;gap:7px`)}>
                          {v.versionItems.map((ver, i) => (
                            <div key={i} style={css(`display:flex;align-items:center;gap:12px;font-size:12.5px`)}>
                              <span style={css(`font-family:'JetBrains Mono',monospace;color:#4f8cff;font-weight:700;min-width:30px`)}>v{ver.version}</span>
                              <span style={css(`color:#c2cad4;flex:1;min-width:0`)}>{ver.label}</span>
                              <span style={css(`color:#5a6472;font-family:'JetBrains Mono',monospace;font-size:11px`)}>{ver.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {v.isBacktest && (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 3 · 검증</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>백테스트 &amp; 자기일관성</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>전략을 과거 구간에 적용하고, 설문 시점의 실제 선택과 얼마나 일치하는지 검증합니다.</div>
                </div>

                {v.btNeedStrategy && (
                  <div style={css(`text-align:center;padding:60px 20px;background:#11151c;border:1px dashed #26303d;border-radius:12px`)}>
                    <div style={css(`font-size:15px;font-weight:700;margin-bottom:6px`)}>아직 전략이 없습니다</div>
                    <div style={css(`font-size:13px;color:#7d8794;margin-bottom:18px`)}>설문에 답하고 코드화를 먼저 진행하세요.</div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer`)}>코드화로 이동 →</button>
                  </div>
                )}

                {v.hasStrategy && (
                  <div>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:16px;background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:13px 16px;margin-bottom:16px;flex-wrap:wrap`)}>
                      <div style={css(`display:flex;align-items:center;gap:12px;flex-wrap:wrap`)}>
                        <span style={css(`font-size:13px;color:#9aa4b1`)}>적용 전략</span>
                        <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#4f8cff;background:rgba(79,140,255,.12);border-radius:5px;padding:3px 9px`)}>{v.btVersionLabel}</span>
                        <span style={css(`font-size:13px;color:#9aa4b1;margin-left:6px`)}>구간</span>
                        <span style={css(`display:flex;gap:5px`)}>
                          <span style={css(`font-size:12px;color:#5a6472;border:1px solid #1f2630;border-radius:6px;padding:4px 9px`)}>60봉</span>
                          <span style={css(`font-size:12px;color:#e6edf3;border:1px solid #4f8cff;background:rgba(79,140,255,.12);border-radius:6px;padding:4px 9px`)}>120봉</span>
                          <span style={css(`font-size:12px;color:#5a6472;border:1px solid #1f2630;border-radius:6px;padding:4px 9px`)}>240봉</span>
                        </span>
                      </div>
                      <button onClick={v.runBacktest} style={css(v.backtestBtnStyle)}>
                        {v.backtesting && (<span><span style={css(`display:inline-block;width:13px;height:13px;border:2px solid rgba(6,16,31,.35);border-top-color:#06101f;border-radius:50%;animation:tt-spin .7s linear infinite;margin-right:7px;vertical-align:-2px`)}></span>실행 중…</span>)}
                        {v.notBacktesting && (<span>{v.backtestLabel}</span>)}
                      </button>
                    </div>

                    {v.showBtIdle && (
                      <div style={css(`text-align:center;padding:54px 20px;color:#5a6472;font-size:13px;background:#11151c;border:1px solid #1f2630;border-radius:12px`)}>백테스트를 실행해 전략의 과거 성과를 확인하세요.</div>
                    )}

                    {v.backtesting && (
                      <div style={css(`text-align:center;padding:54px 20px;color:#9aa4b1;font-size:13px;background:#11151c;border:1px solid #1f2630;border-radius:12px`)}><span style={css(`display:inline-block;width:22px;height:22px;border:3px solid #1f2630;border-top-color:#4f8cff;border-radius:50%;animation:tt-spin .8s linear infinite`)}></span><div style={css(`margin-top:12px`)}>과거 구간을 순회하며 decide() 를 호출하는 중…</div></div>
                    )}

                    {v.hasBacktest && (
                      <div>
                        <div style={css(`display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px`)}>
                          {v.metricCards.map((m, i) => (
                            <div key={i} style={css(`background:#11151c;border:1px solid #1f2630;border-radius:11px;padding:14px`)}>
                              <div style={css(`font-size:11.5px;color:#7d8794;margin-bottom:8px`)}>{m.label}</div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '22px', fontWeight: 700, color: m.color }}>{m.value}</div>
                              <div style={css(`font-size:11px;color:#5a6472;margin-top:4px`)}>{m.sub}</div>
                            </div>
                          ))}
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-bottom:16px`)}>
                          <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:8px`)}>
                            <div style={css(`font-weight:700;font-size:14px`)}>누적 수익곡선</div>
                            <div style={css(`display:flex;gap:14px;font-size:11.5px`)}>
                              <span style={css(`display:flex;align-items:center;gap:6px;color:#9aa4b1`)}><span style={css(`width:14px;height:3px;background:#4f8cff;border-radius:2px;display:inline-block`)}></span>전략</span>
                              <span style={css(`display:flex;align-items:center;gap:6px;color:#9aa4b1`)}><span style={css(`width:14px;height:3px;background:#5a6472;border-radius:2px;display:inline-block`)}></span>보유(B&amp;H)</span>
                            </div>
                          </div>
                          <div>{v.equityChartEl}</div>
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-bottom:16px`)}>
                          <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:8px`)}>
                            <div style={css(`font-weight:700;font-size:14px`)}>매매 시점</div>
                            <div style={css(`display:flex;gap:14px;font-size:11.5px`)}>
                              <span style={css(`color:#22c55e`)}>▲ 매수</span><span style={css(`color:#ef4444`)}>▼ 매도</span>
                            </div>
                          </div>
                          <div>{v.backtestChartEl}</div>
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px`)}>
                          <div style={css(`display:flex;gap:24px;align-items:center;flex-wrap:wrap`)}>
                            <div style={css(`text-align:center;min-width:120px`)}>
                              <div style={css(`font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:700;color:#4f8cff;line-height:1`)}>{v.consistencyPct}%</div>
                              <div style={css(`font-size:11.5px;color:#7d8794;margin-top:6px`)}>자기일관성</div>
                            </div>
                            <div style={css(`flex:1;min-width:260px`)}>
                              <div style={css(`font-size:13px;color:#c2cad4;margin-bottom:10px`)}>생성된 전략을 설문 {v.consistencyTotal}개 시점에 직접 돌려 당신의 실제 선택과 비교했습니다.</div>
                              <div style={css(`height:8px;background:#1a212c;border-radius:5px;overflow:hidden;margin-bottom:13px`)}><div style={css(`height:100%;background:linear-gradient(90deg,#4f8cff,#22c55e);width:${v.consistencyWidth};transition:width .6s`)}></div></div>
                              {v.hasMismatch && (
                                <div>
                                  <div style={css(`font-size:11px;color:#5a6472;margin-bottom:7px`)}>어긋난 지점</div>
                                  <div style={css(`display:flex;flex-wrap:wrap;gap:6px`)}>
                                    {v.mismatchItems.map((mm, i) => (
                                      <span key={i} style={css(`font-size:11.5px;background:#0e131b;border:1px solid #181f29;border-radius:6px;padding:4px 9px;color:#9aa4b1`)}>설문 #{mm.survey} · 나 <span style={{ color: mm.userColor }}>{mm.user}</span> → 전략 <span style={{ color: mm.stratColor }}>{mm.strat}</span></span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {v.noMismatch && (
                                <div style={css(`font-size:12.5px;color:#22c55e`)}>모든 설문 시점에서 전략이 당신의 선택을 재현했습니다.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {v.isMonitor && (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 4 · 운용</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>실시간 모니터링 &amp; 알림</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>현재가를 폴링해 전략 신호를 계산하고 알림을 보냅니다. 주문은 직접 하세요.</div>
                </div>

                {v.monNeedStrategy && (
                  <div style={css(`text-align:center;padding:60px 20px;background:#11151c;border:1px dashed #26303d;border-radius:12px`)}>
                    <div style={css(`font-size:15px;font-weight:700;margin-bottom:6px`)}>아직 전략이 없습니다</div>
                    <div style={css(`font-size:13px;color:#7d8794;margin-bottom:18px`)}>설문에 답하고 코드화를 먼저 진행하세요.</div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer`)}>코드화로 이동 →</button>
                  </div>
                )}

                {v.hasStrategy && (
                  <div>
                    <div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px`)}>
                      <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px`)}>
                        <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:14px`)}>
                          <span style={css(`font-weight:700;font-size:15px`)}>KRW-BTC</span>
                          <span style={css(`display:flex;align-items:center;gap:6px;font-size:11px;color:#22c55e`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#22c55e;animation:tt-pulse 1.5s infinite`)}></span>실시간</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '34px', fontWeight: 700, color: v.topPriceColor, lineHeight: 1 }}>{v.livePriceFmt}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '13px', marginTop: '9px', color: v.topPriceColor }}>{v.priceChangePct} <span style={css(`color:#5a6472`)}>· 세션 기준</span></div>
                      </div>
                      <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;display:flex;flex-direction:column;justify-content:center`)}>
                        <div style={css(`font-size:11.5px;color:#7d8794;margin-bottom:8px`)}>현재 전략 신호 · {v.btVersionLabel}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: v.signalColor, letterSpacing: '-0.01em' }}>{v.signalText}</div>
                        <div style={css(`font-size:12.5px;color:#9aa4b1;margin-top:7px`)}>{v.signalReason}</div>
                      </div>
                    </div>

                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px`)}>
                        <div style={css(`font-weight:700;font-size:14px`)}>알림 피드</div>
                        <div style={css(`display:flex;gap:8px;align-items:center`)}>
                          <input value={v.webhookDraft} onChange={v.onWebhook} placeholder="https://hooks.slack.com/…" style={css(`background:#0d1117;border:1px solid #1f2630;border-radius:7px;padding:7px 10px;color:#9aa4b1;font-size:11.5px;width:210px;font-family:'JetBrains Mono',monospace`)} />
                          <button onClick={v.testAlert} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer;white-space:nowrap`)}>테스트 발송</button>
                        </div>
                      </div>
                      {v.hasAlerts && (
                        <div style={css(`display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto`)}>
                          {v.alertItems.map((a, i) => (
                            <div key={i} style={css(`display:flex;gap:11px;align-items:flex-start;padding:11px 12px;background:#0e131b;border:1px solid #181f29;border-radius:9px;animation:tt-in .3s ease`)}>
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: a.color, marginTop: '4px', flex: '0 0 auto' }}></span>
                              <div style={css(`flex:1;min-width:0`)}><div style={css(`font-size:12.5px;color:#dfe5ec;line-height:1.45`)}>{a.text}</div><div style={css(`font-size:10.5px;color:#5a6472;font-family:'JetBrains Mono',monospace;margin-top:3px`)}>{a.time}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                      {v.noAlerts && (
                        <div style={css(`text-align:center;padding:34px 12px;color:#5a6472;font-size:12.5px`)}>신호가 발생하면 여기에 알림이 쌓입니다. {v.liveHint}</div>
                      )}
                    </div>

                    <div style={css(`display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 16px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:10px`)}>
                      <span style={css(`width:7px;height:7px;border-radius:50%;background:#f59e0b;flex:0 0 auto`)}></span>
                      <span style={css(`font-size:12.5px;color:#c7a96a`)}>이 앱은 분석·알림까지만 합니다. 실제 매수·매도 주문은 회원님이 직접 결정하세요.</span>
                    </div>
                  </div>
                )}
              </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

}

App.defaultProps = { accent: "#4f8cff", demoMode: false, liveSim: true };

export default App;
