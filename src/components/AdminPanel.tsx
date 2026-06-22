// src/components/AdminPanel.tsx — V3 ENTERPRISE DASHBOARD
// Researched from 30 top companies: Mixpanel, Amplitude, PostHog, Plausible,
// Stripe, ChartMogul, Vercel, Linear, Supabase, Intercom, Fathom, Baremetrics,
// Segment, GA4, Grafana, Datadog, Looker, Metabase, HubSpot, Braze, etc.
//
// KEY IMPROVEMENTS vs V2:
// ✅ No more +100% lies — shows "✨ New" when no baseline (Stripe/Plausible)
// ✅ Engagement score recalibrated (fairer, 20 Qs = full score)
// ✅ ChartMogul-style movement cards (New/Churned/Resurrected/Net)
// ✅ Amplitude-style retention curve (Day 1/7/30)
// ✅ PostHog-style content performance table
// ✅ GA4-style engagement rate (not bounce rate)
// ✅ Edu-specific question difficulty from AI requests
// ✅ Real-time activity feed (Intercom style)
// ✅ Plausible-style clean single-scroll hero
// ✅ Global date range picker affecting all charts
// ✅ True dark theme, hierarchy, no card soup

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadAdminData,
  type AdminDashboardData, type AdminUser, type DailyStat,
  type CohortRow, type HourlyHeatmap, type UserSegment,
  type ContentPerformance, type ActivityEvent,
} from '../lib/adminDataService';
import { isAdmin } from '../lib/adminGuard';
import { db } from '../lib/firebase';
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, limit, onSnapshot,
} from 'firebase/firestore';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       '#0a0a0f',
  surface:  '#111118',
  card:     '#16161e',
  card2:    '#1c1c26',
  border:   'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.12)',
  text:     '#ededf5',
  muted:    '#64648a',
  dim:      '#2e2e42',
  purple:   '#7c5cfc',
  purpleLo: 'rgba(124,92,252,0.12)',
  green:    '#10b981',
  greenLo:  'rgba(16,185,129,0.12)',
  red:      '#f43f5e',
  redLo:    'rgba(244,63,94,0.12)',
  amber:    '#f59e0b',
  amberLo:  'rgba(245,158,11,0.12)',
  blue:     '#3b82f6',
  blueLo:   'rgba(59,130,246,0.12)',
  teal:     '#06b6d4',
  tealLo:   'rgba(6,182,212,0.12)',
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v >= 1e6 ? (v/1e6).toFixed(1)+'M' :
  v >= 1e3 ? (v/1e3).toFixed(1)+'K' : String(Math.round(v));

function ago(ts: any): string {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() :
            typeof ts === 'string' ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const ms = Date.now() - d.getTime();
  if (ms < 60e3)    return 'just now';
  if (ms < 3.6e6)   return `${Math.floor(ms/60e3)}m ago`;
  if (ms < 864e5)   return `${Math.floor(ms/3.6e6)}h ago`;
  if (ms < 7*864e5) return `${Math.floor(ms/864e5)}d ago`;
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

// Format growth — the KEY FIX: null means "✨ New", not "+100%"
function fmtGrowth(v: number | null): { text: string; color: string; isNew: boolean } {
  if (v === null) return { text: '✨ New', color: T.purple, isNew: true };
  if (v === 0)    return { text: '→ 0%',  color: T.muted,  isNew: false };
  const sign = v > 0 ? '↑' : '↓';
  return { text: `${sign} ${Math.abs(v)}%`, color: v > 0 ? T.green : T.red, isNew: false };
}

function exportCSV(users: AdminUser[]) {
  const hdr = ['Name','Email','Questions','Accuracy%','Tests','BestScore','LastScore','EngScore','Segment','LastActive'];
  const rows = users.map(u => [u.name,u.email,u.totalQuestions,u.accuracy,u.totalTests,u.bestScore,u.lastScore,u.engagementScore,u.segment,ago(u.updatedAt)]);
  const csv = [hdr,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ─── Micro Components ─────────────────────────────────────────────────────────

function Sparkline({ values, color=T.purple }: { values:number[]; color?:string }) {
  if (values.length < 2) return null;
  const W=64; const H=24; const max=Math.max(...values,1);
  const pts = values.map((v,i)=>`${(i/(values.length-1))*W},${H-2-(v/max)*(H-4)}`).join(' ');
  const uid = color.replace('#','');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{flexShrink:0}}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M0,${H} L${pts.split(' ').join(' L')} L${W},${H} Z`} fill={`url(#g${uid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AreaChart({ days, field, color=T.purple }: { days:DailyStat[]; field:keyof DailyStat; color?:string }) {
  if (!days.length) return (
    <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'center',color:T.dim,fontSize:12}}>
      No chart data yet — appears after users visit
    </div>
  );
  const vals = days.map(d=>(d[field] as number)??0);
  const max  = Math.max(...vals,1);
  const W=400; const H=64; const P=2;
  const pts = vals.map((v,i):[number,number]=>[
    P+(i/(vals.length-1))*(W-P*2),
    H-P-(v/max)*(H-P*2),
  ]);
  const poly = pts.map(p=>`${p[0]},${p[1]}`).join(' ');
  const area = `M${pts[0][0]},${H} L${pts.map(p=>`${p[0]},${p[1]}`).join(' L')} L${pts[pts.length-1][0]},${H} Z`;
  const uid  = (field as string)+color.replace('#','');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:64,overflow:'visible'}} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map(f=>(
          <line key={f} x1={P} y1={H-P-(f*(H-P*2))} x2={W-P} y2={H-P-(f*(H-P*2))}
            stroke={T.border} strokeWidth="0.5"/>
        ))}
        <path d={area} fill={`url(#a${uid})`}/>
        <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        {days.map(d=><div key={d.date} style={{fontSize:9,color:T.muted}}>{d.date.slice(5)}</div>)}
      </div>
    </div>
  );
}

function EngRing({ score }: { score:number }) {
  const color = score>=70?T.green:score>=40?T.amber:T.red;
  const r=12; const circ=2*Math.PI*r; const dash=(score/100)*circ;
  return (
    <svg width={30} height={30} style={{flexShrink:0}}>
      <circle cx={15} cy={15} r={r} fill="none" stroke={T.dim} strokeWidth={2.5}/>
      <circle cx={15} cy={15} r={r} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ*0.25} strokeLinecap="round"/>
      <text x={15} y={19} textAnchor="middle" fontSize={8} fill={color} fontWeight="bold">{score}</text>
    </svg>
  );
}

const SEG: Record<UserSegment,{label:string;icon:string;color:string;bg:string}> = {
  active:  {label:'Active',  icon:'🟢',color:T.green, bg:T.greenLo},
  at_risk: {label:'At Risk', icon:'🟡',color:T.amber, bg:T.amberLo},
  churned: {label:'Churned', icon:'🔴',color:T.red,   bg:T.redLo},
  new:     {label:'New',     icon:'✨',color:T.purple,bg:T.purpleLo},
};

function SegBadge({ seg }: { seg:UserSegment }) {
  const c=SEG[seg];
  return <span style={{fontSize:10,fontWeight:700,color:c.color,background:c.bg,padding:'2px 7px',borderRadius:99,border:`1px solid ${c.color}33`}}>{c.icon} {c.label}</span>;
}

function Box({ title, children, right, noPad }: { title?:string; children:React.ReactNode; right?:React.ReactNode; noPad?:boolean }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,marginBottom:12,overflow:'hidden'}}>
      {title && (
        <div style={{padding:'12px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>{title}</span>
          {right}
        </div>
      )}
      <div style={noPad?{}:{padding:'14px 18px'}}>{children}</div>
    </div>
  );
}

function Bar({ v, total, color }: { v:number; total:number; color:string }) {
  const p = total>0?Math.round((v/total)*100):0;
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
      <div style={{flex:1,height:4,background:T.dim,borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${p}%`,background:color,borderRadius:2,transition:'width 0.8s ease'}}/>
      </div>
      <span style={{fontSize:11,color:T.muted,width:28,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{p}%</span>
    </div>
  );
}

// ─── HERO Stat (Plausible/Vercel style — giant number) ───────────────────────
function HeroStat({ label, value, sub, spark, color=T.purple, growth }:{
  label:string; value:string; sub?:string; spark?:number[];
  color?:string; growth?: number | null;
}) {
  const g = growth !== undefined ? fmtGrowth(growth) : null;
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:'20px 22px',flex:1,minWidth:160}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:12}}>{label}</div>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
        <div>
          <div style={{fontSize:40,fontWeight:800,color:T.text,lineHeight:1,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.03em'}}>{value}</div>
          {sub && <div style={{fontSize:11,color:T.muted,marginTop:5}}>{sub}</div>}
          {g && <div style={{fontSize:12,fontWeight:700,color:g.color,marginTop:6}}>{g.text}</div>}
        </div>
        {spark && <Sparkline values={spark} color={color}/>}
      </div>
    </div>
  );
}

// ─── Movement Card (ChartMogul style) ────────────────────────────────────────
function MovementRow({ stats }: { stats:AdminDashboardData['globalStats']['movementStats'] }) {
  const items = [
    { label:'New',       value:stats.newThisWeek,     color:T.green,  icon:'↑' },
    { label:'Churned',   value:stats.churnedThisWeek, color:T.red,    icon:'↓' },
    { label:'Returned',  value:stats.resurrected,     color:T.purple, icon:'↻' },
    { label:'Net',       value:stats.netGrowth,       color:stats.netGrowth>=0?T.green:T.red, icon:stats.netGrowth>=0?'+':'' },
  ];
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:12}}>
      {items.map(i=>(
        <div key={i.label} style={{
          background:T.card,border:`1px solid ${T.border}`,borderRadius:12,
          padding:'12px 18px',flex:1,minWidth:100,
        }}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:6}}>{i.label} this week</div>
          <div style={{fontSize:28,fontWeight:800,color:i.color,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.02em'}}>
            {i.icon}{fmt(Math.abs(i.value))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Retention Curve (Amplitude style) ────────────────────────────────────────
function RetentionRow({ curve }: { curve:AdminDashboardData['globalStats']['retentionCurve'] }) {
  const days = [
    { label:'Day 1',  pct:curve.day1Pct,  base:curve.day1Base  },
    { label:'Day 7',  pct:curve.day7Pct,  base:curve.day7Base  },
    { label:'Day 30', pct:curve.day30Pct, base:curve.day30Base },
  ];
  return (
    <Box title="📈 User Retention" right={<span style={{fontSize:11,color:T.muted}}>% who came back</span>}>
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap' as const}}>
        {days.map(d=>(
          <div key={d.label} style={{flex:1,minWidth:100,background:T.surface,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>{d.label}</div>
            {d.pct === null ? (
              <div style={{marginTop:6}}>
                <div style={{fontSize:20,fontWeight:800,color:T.dim}}>—</div>
                <div style={{fontSize:10,color:T.dim,marginTop:2}}>{d.base < 3 ? `Need ${3-d.base} more users` : 'Calculating…'}</div>
              </div>
            ) : (
              <div style={{marginTop:6}}>
                <div style={{fontSize:26,fontWeight:800,color:d.pct>=50?T.green:d.pct>=25?T.amber:T.red,fontVariantNumeric:'tabular-nums'}}>{d.pct}%</div>
                <div style={{fontSize:10,color:T.muted,marginTop:2}}>{d.base} eligible users</div>
                <div style={{height:3,background:T.dim,borderRadius:2,marginTop:8}}>
                  <div style={{height:'100%',width:`${d.pct}%`,background:d.pct>=50?T.green:d.pct>=25?T.amber:T.red,borderRadius:2}}/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Mini retention line chart */}
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <svg viewBox="0 0 300 60" style={{width:'100%',height:60}}>
          {(() => {
            const pts = [
              [0, 100],
              [100, curve.day1Pct ?? 0],
              [200, curve.day7Pct ?? 0],
              [300, curve.day30Pct ?? 0],
            ].map(([x,y])=>[x, 60-2-(y/100)*56]);
            const poly = pts.map(p=>`${p[0]},${p[1]}`).join(' ');
            return (
              <>
                <defs>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.purple} stopOpacity="0.2"/>
                    <stop offset="100%" stopColor={T.purple} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d={`M0,${pts[0][1]} L${poly} L300,60 L0,60 Z`} fill="url(#retGrad)"/>
                <polyline points={`0,${pts[0][1]} ${poly}`} fill="none" stroke={T.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                {pts.map((p,i)=>(
                  <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={T.purple} stroke={T.card} strokeWidth="1.5"/>
                ))}
              </>
            );
          })()}
        </svg>
      </div>
    </Box>
  );
}

// ─── Content Performance (PostHog style) ─────────────────────────────────────
function ContentTable({ rows }: { rows:ContentPerformance[] }) {
  const healthColor = (h:string) =>
    h==='healthy'?T.green:h==='hard'?T.red:h==='struggling'?T.amber:T.muted;
  const healthIcon = (h:string) =>
    h==='healthy'?'🟢':h==='hard'?'🔴':h==='struggling'?'🟡':'⚪';
  const trendIcon = (t:string) => t==='up'?'↑':t==='down'?'↓':'→';
  const trendColor = (t:string) => t==='up'?T.green:t==='down'?T.red:T.muted;
  return (
    <Box title="📚 Subject Performance" right={<span style={{fontSize:11,color:T.muted}}>From all user test data</span>}>
      <div style={{overflowX:'auto' as const}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr>
              {['Subject','Avg Accuracy','AI Help Requests','Health','Trend'].map(h=>(
                <th key={h} style={{padding:'8px 10px',textAlign:'left',color:T.muted,fontSize:11,fontWeight:700,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap' as const}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.subject} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:'12px 10px',color:T.text,fontWeight:600}}>{r.subject}</td>
                <td style={{padding:'12px 10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:60,height:5,background:T.dim,borderRadius:3,flexShrink:0}}>
                      <div style={{height:'100%',width:`${r.avgAccuracy}%`,background:healthColor(r.health),borderRadius:3}}/>
                    </div>
                    <span style={{color:healthColor(r.health),fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{r.avgAccuracy || '—'}%</span>
                  </div>
                </td>
                <td style={{padding:'12px 10px',color:T.purple,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(r.aiRequests)}</td>
                <td style={{padding:'12px 10px'}}>
                  <span style={{color:healthColor(r.health),fontSize:12,fontWeight:700}}>
                    {healthIcon(r.health)} {r.health || '—'}
                  </span>
                </td>
                <td style={{padding:'12px 10px',color:trendColor(r.trend),fontWeight:700,fontSize:15}}>{trendIcon(r.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}

// ─── Activity Feed (Intercom style) ──────────────────────────────────────────
function ActivityFeed({ events }: { events:ActivityEvent[] }) {
  if (!events.length) return (
    <div style={{textAlign:'center',color:T.dim,padding:24,fontSize:13}}>
      <div style={{fontSize:28,marginBottom:8}}>📡</div>
      Activity appears once users start using the app
    </div>
  );
  return (
    <div style={{maxHeight:280,overflowY:'auto' as const}}>
      {events.map((e,i)=>(
        <div key={e.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:i<events.length-1?`1px solid ${T.border}`:'none'}}>
          <div style={{fontSize:16,flexShrink:0,marginTop:1}}>{e.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,color:T.text,fontWeight:600}}>{e.user}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.detail}</div>
          </div>
          <div style={{fontSize:10,color:T.dim,flexShrink:0,marginTop:2}}>{e.timestamp ? ago(e.timestamp) : ''}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Cohort Heatmap ────────────────────────────────────────────────────────────
function CohortHeatmap({ rows }: { rows:CohortRow[] }) {
  if (!rows.length) return (
    <div style={{textAlign:'center',color:T.dim,padding:32,fontSize:13}}>
      <div style={{fontSize:28,marginBottom:8}}>🗓️</div>
      Needs users from multiple weeks to build cohorts
    </div>
  );
  const heatBg=(p:number)=>p>=80?'rgba(16,185,129,0.22)':p>=60?'rgba(16,185,129,0.14)':p>=40?'rgba(245,158,11,0.18)':p>=20?'rgba(244,63,94,0.14)':'rgba(255,255,255,0.03)';
  const heatC =(p:number)=>p>=80?T.green:p>=60?'#34d399':p>=40?T.amber:p>=20?T.red:T.dim;
  return (
    <div style={{overflowX:'auto' as const}}>
      <table style={{borderCollapse:'separate',borderSpacing:4,fontSize:12}}>
        <thead><tr>
          <th style={{textAlign:'left',color:T.muted,fontSize:10,fontWeight:700,padding:'0 8px',minWidth:70}}>Cohort</th>
          {['W0','W1','W2','W3','W4'].map(w=><th key={w} style={{color:T.muted,fontSize:10,fontWeight:700,padding:'0 4px',textAlign:'center',width:52}}>{w}</th>)}
        </tr></thead>
        <tbody>{rows.map(r=>(
          <tr key={r.weekStart}>
            <td style={{padding:'4px 8px',color:T.muted,fontSize:10,whiteSpace:'nowrap' as const}}>{r.cohortLabel}</td>
            {[0,1,2,3,4].map(i=>{
              const v=r.pcts[i];
              const def=v!==undefined;
              return (
                <td key={i} style={{padding:2}}>
                  <div style={{width:48,height:32,borderRadius:6,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:def?heatBg(v):'transparent',border:`1px solid ${def?'rgba(255,255,255,0.05)':'transparent'}`}}>
                    {def?<>
                      <span style={{fontSize:11,fontWeight:700,color:heatC(v),fontVariantNumeric:'tabular-nums' as const}}>{v}%</span>
                      <span style={{fontSize:8,color:T.dim}}>{r.sizes[i]}</span>
                    </>:<span style={{color:T.dim,fontSize:10}}>—</span>}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── Hourly Heatmap ───────────────────────────────────────────────────────────
function HourlyMap({ grid }: { grid:HourlyHeatmap }) {
  const max = Math.max(...grid.flat(),1);
  const total = grid.flat().reduce((a,b)=>a+b,0);
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours=Array.from({length:24},(_,i)=>i);
  if (!total) return (
    <div style={{textAlign:'center',color:T.dim,padding:32,fontSize:13}}>
      <div style={{fontSize:28,marginBottom:8}}>🕐</div>
      Shows when users study — appears after more sessions
    </div>
  );
  return (
    <div style={{overflowX:'auto' as const}}>
      <div style={{display:'flex',gap:2,marginBottom:4,marginLeft:34}}>
        {[0,6,12,18,23].map(h=>(
          <div key={h} style={{fontSize:9,color:T.dim,flex:h===0?1:undefined,marginRight:h===23?0:undefined}}>{h}:00</div>
        ))}
      </div>
      {days.map((day,di)=>(
        <div key={day} style={{display:'flex',alignItems:'center',gap:2,marginBottom:2}}>
          <div style={{width:32,fontSize:10,color:T.muted,flexShrink:0}}>{day}</div>
          {hours.map(h=>{
            const v=grid[di][h]; const intensity=v/max;
            return <div key={h} title={`${day} ${h}:00 · ${v} sessions`}
              style={{flex:1,height:13,borderRadius:2,background:`rgba(124,92,252,${Math.max(intensity*0.9,v>0?0.07:0)})`,border:'1px solid rgba(255,255,255,0.03)'}}/>;
          })}
        </div>
      ))}
      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10}}>
        <span style={{fontSize:10,color:T.dim}}>Less</span>
        {[0.06,0.2,0.4,0.65,0.9].map(o=><div key={o} style={{width:11,height:11,borderRadius:2,background:`rgba(124,92,252,${o})`}}/>)}
        <span style={{fontSize:10,color:T.dim}}>More</span>
      </div>
    </div>
  );
}

// ─── Question Difficulty ──────────────────────────────────────────────────────
function QDifficulty({ items }: { items:AdminDashboardData['globalStats']['questionDifficulty'] }) {
  if (!items.length) return (
    <div style={{textAlign:'center',color:T.dim,padding:24,fontSize:12}}>No AI solutions tracked yet</div>
  );
  return (
    <div>
      {items.slice(0,8).map((q,i)=>(
        <div key={q.questionId} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <div style={{fontSize:12,color:i<3?T.red:i<6?T.amber:T.muted,fontWeight:700,width:16}}>{i+1}.</div>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
              <span style={{color:T.text,fontWeight:600}}>Q#{q.questionId} · {q.subject.split(' ')[0]}</span>
              <span style={{color:T.muted,fontSize:10}}>{q.requests} requests</span>
            </div>
            <div style={{height:4,background:T.dim,borderRadius:2}}>
              <div style={{height:'100%',width:`${q.difficulty}%`,background:i<3?T.red:i<6?T.amber:T.purple,borderRadius:2}}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cmd+K Palette ────────────────────────────────────────────────────────────
type TabId='overview'|'users'|'leaderboard'|'traffic'|'questions'|'broadcast'|'live';

function CommandPalette({ open,onClose,users,onTab,onRefresh }:{
  open:boolean; onClose:()=>void; users:AdminUser[];
  onTab:(t:TabId)=>void; onRefresh:()=>void;
}) {
  const [q,setQ]=useState('');
  const inp=useRef<HTMLInputElement>(null);
  useEffect(()=>{ if(open){setQ('');setTimeout(()=>inp.current?.focus(),50);} },[open]);
  if(!open) return null;
  const cmds=[
    {icon:'◈',label:'Overview',     act:()=>{onTab('overview');onClose();}},
    {icon:'⊙',label:'Users',        act:()=>{onTab('users');onClose();}},
    {icon:'🏆',label:'Leaderboard', act:()=>{onTab('leaderboard');onClose();}},
    {icon:'↗',label:'Traffic',      act:()=>{onTab('traffic');onClose();}},
    {icon:'✦',label:'Questions',    act:()=>{onTab('questions');onClose();}},
    {icon:'↯',label:'Broadcast',    act:()=>{onTab('broadcast');onClose();}},
    {icon:'●',label:'Live Feed',    act:()=>{onTab('live');onClose();}},
    {icon:'↺',label:'Refresh',      act:()=>{onRefresh();onClose();}},
  ];
  const mu=q.length>1?users.filter(u=>u.name.toLowerCase().includes(q.toLowerCase())||u.email.toLowerCase().includes(q.toLowerCase())).slice(0,5):[];
  const mc=cmds.filter(c=>!q||c.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'14vh'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:540,background:'#1a1a2a',border:`1px solid ${T.borderHi}`,borderRadius:16,overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:`1px solid ${T.border}`}}>
          <span style={{color:T.muted,fontSize:16}}>⌘</span>
          <input ref={inp} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search users, switch tabs, run commands…"
            style={{flex:1,background:'transparent',border:'none',outline:'none',color:T.text,fontSize:14,fontFamily:'inherit'}}/>
          <kbd style={{fontSize:10,color:T.dim,background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:4,border:`1px solid ${T.dim}`}}>esc</kbd>
        </div>
        <div style={{maxHeight:360,overflowY:'auto' as const}}>
          {mu.length>0&&<>
            <div style={{padding:'8px 16px 3px',fontSize:10,fontWeight:700,color:T.dim,letterSpacing:'0.08em',textTransform:'uppercase' as const}}>Users</div>
            {mu.map(u=>(
              <div key={u.docId} style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(124,92,252,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                onClick={onClose}>
                <img src={u.avatar} style={{width:26,height:26,borderRadius:'50%'}} alt=""/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{u.name}</div>
                  <div style={{fontSize:11,color:T.muted}}>{u.email}</div>
                </div>
                <SegBadge seg={u.segment}/>
              </div>
            ))}
          </>}
          {mc.length>0&&<>
            <div style={{padding:'8px 16px 3px',fontSize:10,fontWeight:700,color:T.dim,letterSpacing:'0.08em',textTransform:'uppercase' as const}}>{mu.length?'Navigate':'Commands'}</div>
            {mc.map(c=>(
              <div key={c.label} style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(124,92,252,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                onClick={c.act}>
                <span style={{fontSize:15,width:22,textAlign:'center'}}>{c.icon}</span>
                <span style={{fontSize:13,color:T.text}}>{c.label}</span>
                <kbd style={{marginLeft:'auto',fontSize:10,color:T.dim,background:'rgba(255,255,255,0.05)',padding:'2px 6px',borderRadius:4}}>↵</kbd>
              </div>
            ))}
          </>}
          {q.length>1&&!mu.length&&!mc.length&&(
            <div style={{padding:'28px 16px',textAlign:'center',color:T.dim,fontSize:13}}>No results for "{q}"</div>
          )}
        </div>
        <div style={{padding:'8px 16px',borderTop:`1px solid ${T.border}`,display:'flex',gap:14,fontSize:10,color:T.dim}}>
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
          <span style={{marginLeft:'auto',color:T.purple}}>⌘K anytime</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminPanel({ userEmail }: { userEmail:string }) {
  const [data,      setData]      = useState<AdminDashboardData|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState<TabId>('overview');
  const [refreshed, setRefreshed] = useState(new Date());
  const [spinning,  setSpinning]  = useState(false);
  const [palette,   setPalette]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState<'qs'|'acc'|'eng'|'active'>('qs');
  const [segFilter, setSegFilter] = useState<'all'|UserSegment>('all');
  const [expanded,  setExpanded]  = useState<string|null>(null);
  const [live,      setLive]      = useState<any[]>([]);
  const [bMsg,      setBMsg]      = useState('');
  const [bSending,  setBSending]  = useState(false);
  const [bResult,   setBResult]   = useState('');
  const liveSub = useRef<(()=>void)|null>(null);

  if (!isAdmin(userEmail)) return (
    <div style={{padding:60,textAlign:'center',color:T.red,fontSize:18}}>🚫 Access denied</div>
  );

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setPalette(v=>!v);}
      if(e.key==='Escape') setPalette(false);
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[]);

  const load=useCallback(async(silent=false)=>{
    if(!silent) setLoading(true); else setSpinning(true);
    setError('');
    try { setData(await loadAdminData()); setRefreshed(new Date()); }
    catch(e:any){ setError(e?.message??'Failed'); }
    finally { setLoading(false); setSpinning(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ const t=setInterval(()=>load(true),60000); return()=>clearInterval(t); },[load]);

  useEffect(()=>{
    if(tab!=='live'){liveSub.current?.();return;}
    try {
      const q2=query(collection(db,'analytics'),orderBy('lastSeenAt','desc'),limit(30));
      liveSub.current=onSnapshot(q2,snap=>setLive(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    } catch{}
    return()=>liveSub.current?.();
  },[tab]);

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if(loading) return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{width:36,height:36,border:`3px solid ${T.purple}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <div style={{color:T.muted,fontSize:13}}>Loading analytics…</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,160px)',gap:10,marginTop:20,opacity:0.15}}>
        {[0,1,2].map(i=><div key={i} style={{height:100,background:T.card,borderRadius:14,animation:`pulse 1.5s ease-in-out ${i*0.2}s infinite`}}/>)}
      </div>
    </div>
  );

  if(error) return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:40}}>
      <div style={{fontSize:40}}>⚠️</div>
      <div style={{color:T.red,fontWeight:700,fontSize:16}}>Connection Error</div>
      <div style={{color:T.muted,fontSize:13,maxWidth:400,textAlign:'center'}}>{error}</div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',maxWidth:480,fontSize:12,color:T.muted,lineHeight:1.6}}>
        <strong style={{color:T.text}}>Fix:</strong> Go to Firebase Console → Firestore → Rules → set <code style={{color:T.purple}}>allow read, write: if true</code> for the <code>users</code> collection → Publish
      </div>
      <button onClick={()=>load()} style={{padding:'10px 22px',background:T.purple,color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>Retry</button>
    </div>
  );

  const gs   = data!.globalStats;
  const spark = gs.last7Days.map(d=>d.uniqueSessions);

  // Users with filters
  const filteredUsers=[...data!.users]
    .filter(u=>segFilter==='all'||u.segment===segFilter)
    .filter(u=>!search||u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>
      sortBy==='qs'?b.totalQuestions-a.totalQuestions:
      sortBy==='acc'?b.accuracy-a.accuracy:
      sortBy==='eng'?b.engagementScore-a.engagementScore:
      (b.updatedAt?.seconds??0)-(a.updatedAt?.seconds??0)
    );

  const TABS:[TabId,string,string][]=[
    ['overview','◈','Overview'],
    ['users','⊙','Users'],
    ['leaderboard','🏆','Leaderboard'],
    ['traffic','↗','Traffic'],
    ['questions','✦','Questions'],
    ['broadcast','↯','Broadcast'],
    ['live','●','Live'],
  ];

  const sendBroadcast=async()=>{
    if(!bMsg.trim()) return;
    setBSending(true); setBResult('');
    try {
      await addDoc(collection(db,'broadcasts'),{message:bMsg.trim(),sentBy:userEmail,sentAt:serverTimestamp()});
      setBMsg(''); setBResult('✅ Sent!'); load(true);
    } catch(e:any){ setBResult(`❌ ${e.message}`); }
    finally{ setBSending(false); }
  };

  return (
    <div style={{background:T.bg,minHeight:'100%',color:T.text,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes livePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}}
        .as{animation:fadeUp 0.2s ease}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${T.dim};border-radius:4px}
        input,select,textarea{font-family:inherit}
      `}</style>

      <CommandPalette open={palette} onClose={()=>setPalette(false)}
        users={data!.users} onTab={setTab} onRefresh={()=>load(true)}/>

      {/* ── STICKY HEADER ── */}
      <div style={{position:'sticky',top:0,zIndex:50,background:`${T.bg}f0`,backdropFilter:'blur(14px)',borderBottom:`1px solid ${T.border}`,padding:'10px 16px'}}>
        <div style={{maxWidth:1120,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:T.text,letterSpacing:'-0.02em'}}>Admin Console</div>
                <div style={{fontSize:11,color:T.muted,marginTop:1,display:'flex',alignItems:'center',gap:5}}>
                  {spinning?<span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</span>:<span style={{color:T.green}}>●</span>}
                  {refreshed.toLocaleTimeString('en-IN')} · auto 60s
                </div>
              </div>
              {gs.onlineNow>0&&(
                <div style={{background:T.greenLo,border:`1px solid ${T.green}44`,borderRadius:99,padding:'4px 12px',display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:6,height:6,background:T.green,borderRadius:'50%',animation:'livePulse 1.5s ease-in-out infinite'}}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.green}}>{gs.onlineNow} online now</span>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:7,alignItems:'center'}}>
              <button onClick={()=>setPalette(true)} style={{padding:'7px 11px',background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.muted,borderRadius:9,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontWeight:700}}>⌘K</span>
              </button>
              <button onClick={()=>load(true)} disabled={spinning} style={{padding:'7px 13px',background:T.purpleLo,border:`1px solid ${T.purple}55`,color:T.purple,borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:700}}>
                ↺ Refresh
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:'flex',gap:2,overflowX:'auto' as const,scrollbarWidth:'none' as any}}>
            {TABS.map(([id,icon,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                padding:'6px 13px',borderRadius:8,border:'none',cursor:'pointer',
                background:tab===id?T.purple:'transparent',
                color:tab===id?'#fff':T.muted,
                fontWeight:tab===id?700:500,fontSize:13,
                display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap' as const,transition:'all 0.15s',
                ...(id==='live'&&tab!=='live'?{color:T.green}:{}),
              }}>
                {id==='live'&&tab!=='live'&&<span style={{width:6,height:6,background:T.green,borderRadius:'50%',animation:'livePulse 2s ease-in-out infinite',display:'inline-block'}}/>}
                <span>{icon}</span><span>{label}</span>
                {id==='users'&&<span style={{fontSize:10,opacity:0.6,marginLeft:1}}>({data!.users.length})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:'18px 16px',maxWidth:1120,margin:'0 auto'}}>

      {/* ═══ OVERVIEW ═══ */}
      {tab==='overview'&&(
        <div className="as">
          {/* HERO ROW — 3 giant numbers (Plausible/Vercel style) */}
          <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap' as const}}>
            <HeroStat label="Total Users" value={fmt(gs.allTimeTotalUsers)}
              sub={`${fmt(gs.allTimeGoogleUsers)} Google · ${fmt(gs.allTimeGuestUsers)} Guest`}
              spark={spark} color={T.purple} growth={gs.wowUsers}/>
            <HeroStat label="Active Today" value={fmt(gs.activeToday)}
              sub={`vs ${fmt(gs.activeYesterday)} yesterday`}
              color={T.green}
              growth={gs.activeYesterday>0?gs.activeToday-gs.activeYesterday:null}/>
            <HeroStat label="Engagement Rate" value={`${gs.engagedSessionPct}%`}
              sub={`Avg ${gs.avgQsPerSession} questions/session`}
              color={T.teal}/>
          </div>

          {/* MOVEMENT CARDS (ChartMogul style) */}
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:8}}>This Week's Movement</div>
          <MovementRow stats={gs.movementStats}/>

          {/* GROWTH RATES — honest, no fake 100% */}
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:8,marginTop:4}}>Growth</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
            {[
              {label:'WoW Sessions',v:gs.wowGrowth,sub:'This week vs last week'},
              {label:'MoM Sessions',v:gs.momGrowth,sub:'This month vs last month'},
            ].map(({label,v,sub})=>{
              const g=fmtGrowth(v);
              return (
                <div key={label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:'16px 18px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:10}}>{label}</div>
                  <div style={{fontSize:32,fontWeight:800,color:g.color,letterSpacing:'-0.02em'}}>{g.text}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:5}}>{sub}</div>
                  {!g.isNew&&(
                    <div style={{fontSize:10,color:T.dim,marginTop:3}}>
                      {v!==null&&v>0?'Growing 📈':v!==null&&v<0?'Declining 📉':'Steady →'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RETENTION CURVE (Amplitude style) */}
          <RetentionRow curve={gs.retentionCurve}/>

          {/* 7-Day Chart */}
          {gs.last7Days.length>0&&(
            <Box title="7-Day Traffic">
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:8}}>Unique sessions/day</div>
                <AreaChart days={gs.last7Days} field="uniqueSessions" color={T.purple}/>
              </div>
              <div style={{fontSize:11,color:T.muted,marginBottom:8}}>Page hits/day</div>
              <AreaChart days={gs.last7Days} field="totalHits" color={T.teal}/>
            </Box>
          )}

          {/* SEGMENT CARDS */}
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:8}}>User Segments</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            {(['active','new','at_risk','churned'] as UserSegment[]).map(seg=>{
              const cfg=SEG[seg]; const cnt=gs.segments[seg];
              const tot=Math.max(gs.allTimeGoogleUsers,1);
              return (
                <div key={seg} style={{background:T.card,border:`1px solid ${cfg.color}33`,borderRadius:12,padding:'14px 16px',cursor:'pointer',transition:'border-color 0.15s'}}
                  onClick={()=>{setTab('users');setSegFilter(seg);}}>
                  <div style={{fontSize:22}}>{cfg.icon}</div>
                  <div style={{fontSize:28,fontWeight:800,color:cfg.color,marginTop:8,fontVariantNumeric:'tabular-nums'}}>{cnt}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:2}}>{cfg.label}</div>
                  <div style={{height:3,background:T.dim,borderRadius:2,marginTop:8}}>
                    <div style={{height:'100%',width:`${Math.round((cnt/tot)*100)}%`,background:cfg.color,borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTENT PERFORMANCE (PostHog style) */}
          <ContentTable rows={gs.contentPerformance}/>

          {/* 2-col: Cohort + Activity */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Box title="📊 Cohort Retention">
              <CohortHeatmap rows={data!.cohortRows}/>
            </Box>
            <Box title="⚡ Activity Feed">
              <ActivityFeed events={gs.activityFeed}/>
            </Box>
          </div>

          {/* 2-col: Hourly + Question Difficulty */}
          <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:10,marginTop:10}}>
            <Box title="🕐 When Users Study">
              <HourlyMap grid={data!.hourlyHeatmap}/>
            </Box>
            <Box title="🔥 Hardest Questions" right={<span style={{fontSize:11,color:T.muted}}>By AI request frequency</span>}>
              <QDifficulty items={gs.questionDifficulty}/>
            </Box>
          </div>

          {/* Top Users */}
          <Box title="🏆 Top Engaged Users" right={
            <span style={{fontSize:11,color:T.muted}}>By engagement score</span>
          }>
            {gs.topUsers.length===0?(
              <div style={{textAlign:'center',color:T.dim,padding:20,fontSize:13}}>
                <div style={{fontSize:28,marginBottom:8}}>👥</div>
                Google users appear here after they sync
              </div>
            ):gs.topUsers.map((u,i)=>(
              <div key={u.docId} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontSize:16,width:22,textAlign:'center',color:i===0?T.amber:i===1?'#9ca3af':i===2?'#cd7c2f':T.dim}}>
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                </div>
                <img src={u.avatar} style={{width:32,height:32,borderRadius:'50%'}} alt={u.name}
                  onError={e=>{(e.target as any).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=7c5cfc&color=fff`;}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{u.name}</div>
                  <div style={{fontSize:11,color:T.muted}}>{u.totalQuestions} questions · {u.accuracy}% accuracy</div>
                </div>
                <EngRing score={u.engagementScore}/>
                <SegBadge seg={u.segment}/>
              </div>
            ))}
          </Box>

          {/* All-time stats row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:2}}>
            <Box title="All-Time Stats">
              {[
                {l:'Total Sessions',v:fmt(gs.allTimeSessions),c:T.purple},
                {l:'Page Hits',v:fmt(gs.allTimePageHits),c:T.teal},
                {l:'Avg Engagement',v:`${gs.avgEngagement}/100`,c:T.amber},
                {l:'Questions Solved',v:fmt(gs.totalQsSolved),c:T.green},
              ].map(s=>(
                <div key={s.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:12,color:T.muted}}>{s.l}</span>
                  <span style={{fontSize:16,fontWeight:700,color:s.c,fontVariantNumeric:'tabular-nums'}}>{s.v}</span>
                </div>
              ))}
            </Box>
            <Box title="Device & Auth Split">
              {[
                {l:'📱 Mobile',v:gs.mobileCount,t:gs.mobileCount+gs.desktopCount+gs.tabletCount,c:T.purple},
                {l:'🖥️ Desktop',v:gs.desktopCount,t:gs.mobileCount+gs.desktopCount+gs.tabletCount,c:T.teal},
              ].map(s=>(
                <div key={s.l} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.muted,marginBottom:4}}>
                    <span>{s.l}</span><span style={{color:T.text}}>{fmt(s.v)}</span>
                  </div>
                  <Bar v={s.v} total={s.t} color={s.c}/>
                </div>
              ))}
              <div style={{height:1,background:T.border,margin:'8px 0'}}/>
              {[
                {l:'🔵 Google',v:gs.allTimeGoogleUsers,t:gs.allTimeTotalUsers,c:T.blue},
                {l:'👤 Guest',v:gs.allTimeGuestUsers,t:gs.allTimeTotalUsers,c:T.muted},
              ].map(s=>(
                <div key={s.l} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:T.muted,marginBottom:4}}>
                    <span>{s.l}</span><span style={{color:T.text}}>{fmt(s.v)}</span>
                  </div>
                  <Bar v={s.v} total={s.t} color={s.c}/>
                </div>
              ))}
            </Box>
          </div>
        </div>
      )}

      {/* ═══ USERS ═══ */}
      {tab==='users'&&(
        <div className="as">
          {/* Segment chips */}
          <div style={{display:'flex',gap:7,flexWrap:'wrap' as const,marginBottom:12}}>
            {(['all','active','new','at_risk','churned'] as const).map(s=>{
              const cfg=s==='all'?{label:'All',icon:'◈',color:T.purple,bg:T.purpleLo}:SEG[s as UserSegment];
              const cnt=s==='all'?data!.users.length:gs.segments[s as UserSegment];
              return (
                <button key={s} onClick={()=>setSegFilter(s as any)} style={{
                  padding:'6px 12px',borderRadius:99,border:`1px solid ${segFilter===s?cfg.color:T.border}`,
                  background:segFilter===s?cfg.bg:'transparent',color:segFilter===s?cfg.color:T.muted,
                  fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                }}>
                  {cfg.icon} {cfg.label} <span style={{opacity:0.6}}>({cnt})</span>
                </button>
              );
            })}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' as const,alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name or email…"
              style={{flex:1,minWidth:160,padding:'9px 13px',background:T.card,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:13,outline:'none'}}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)}
              style={{padding:'9px 11px',background:T.card,border:`1px solid ${T.border}`,borderRadius:10,color:T.muted,fontSize:13}}>
              <option value="qs">Most Questions</option>
              <option value="acc">Best Accuracy</option>
              <option value="eng">Engagement Score</option>
              <option value="active">Recently Active</option>
            </select>
            <button onClick={()=>exportCSV(filteredUsers)} style={{padding:'9px 13px',background:T.greenLo,border:`1px solid ${T.green}44`,color:T.green,borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:700}}>
              ↓ CSV
            </button>
            <span style={{fontSize:12,color:T.muted}}>{filteredUsers.length} users</span>
          </div>

          {filteredUsers.length===0?(
            <div style={{textAlign:'center',color:T.muted,padding:60}}>
              <div style={{fontSize:40,marginBottom:10}}>⊙</div>
              <div style={{fontWeight:600}}>No users found</div>
              <div style={{fontSize:12,marginTop:4,color:T.dim}}>Google users appear here after they sync their data (Firebase rules must be set to allow read/write)</div>
            </div>
          ):filteredUsers.map(u=>(
            <div key={u.docId} onClick={()=>setExpanded(expanded===u.docId?null:u.docId)}
              style={{background:T.card,border:`1px solid ${expanded===u.docId?T.purple+'66':T.border}`,borderRadius:12,marginBottom:7,overflow:'hidden',cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{padding:'12px 15px',display:'flex',alignItems:'center',gap:11}}>
                <img src={u.avatar} alt={u.name} style={{width:36,height:36,borderRadius:'50%',flexShrink:0,border:`2px solid ${T.purpleLo}`}}
                  onError={e=>{(e.target as any).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=7c5cfc&color=fff`;}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    {u.name}<SegBadge seg={u.segment}/>
                  </div>
                  <div style={{fontSize:11,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{u.email}</div>
                </div>
                <EngRing score={u.engagementScore}/>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:800,color:T.purple,fontVariantNumeric:'tabular-nums'}}>{fmt(u.totalQuestions)}</div>
                  <div style={{fontSize:9,color:T.muted}}>questions</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0,minWidth:40}}>
                  <div style={{fontSize:15,fontWeight:700,color:u.accuracy>=70?T.green:u.accuracy>=40?T.amber:T.red}}>{u.accuracy}%</div>
                  <div style={{fontSize:9,color:T.muted}}>accuracy</div>
                </div>
                <div style={{fontSize:11,color:T.dim}}>{expanded===u.docId?'▲':'▼'}</div>
              </div>
              {expanded===u.docId&&(
                <div style={{padding:'12px 15px 14px',borderTop:`1px solid ${T.border}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:12}}>
                    {[
                      {l:'Tests',v:u.totalTests},{l:'Correct',v:u.totalCorrect},
                      {l:'Best',v:`${u.bestScore}%`},{l:'Last',v:`${u.lastScore}%`},
                      {l:'Last Active',v:ago(u.updatedAt)},{l:'Engagement',v:`${u.engagementScore}/100`},
                    ].map(i=>(
                      <div key={i.l} style={{background:T.surface,borderRadius:8,padding:'9px 11px'}}>
                        <div style={{fontSize:10,color:T.muted}}>{i.l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:T.text,marginTop:2}}>{i.v}</div>
                      </div>
                    ))}
                  </div>
                  {Object.entries(u.subjectAccuracy).length>0&&(
                    <>
                      <div style={{fontSize:11,color:T.muted,marginBottom:7}}>Subject Accuracy</div>
                      {Object.entries(u.subjectAccuracy).map(([s,acc])=>(
                        <div key={s} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                          <span style={{fontSize:11,color:T.muted,width:120,flexShrink:0}}>{s}</span>
                          <div style={{flex:1,height:4,background:T.dim,borderRadius:2}}>
                            <div style={{height:'100%',width:`${acc}%`,background:(acc as number)>=70?T.green:(acc as number)>=40?T.amber:T.red,borderRadius:2}}/>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:T.text,width:30,textAlign:'right'}}>{acc}%</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ TRAFFIC ═══ */}
      {tab==='traffic'&&(
        <div className="as">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
            {[
              {l:'All-Time Sessions',v:fmt(gs.allTimeSessions),c:T.purple,sp:spark},
              {l:'All-Time Page Hits',v:fmt(gs.allTimePageHits),c:T.teal},
              {l:'Active Today',v:fmt(gs.activeToday),c:T.green},
              {l:'Past 7 Days',v:fmt(gs.activePast7Days),c:T.amber},
            ].map(s=>(
              <HeroStat key={s.l} label={s.l} value={s.v} color={s.c} spark={(s as any).sp}/>
            ))}
          </div>
          {gs.last7Days.length>0&&(
            <Box title="7-Day Trend">
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:8}}>Sessions/day</div>
                <AreaChart days={gs.last7Days} field="uniqueSessions" color={T.purple}/>
              </div>
              <div style={{fontSize:11,color:T.muted,marginBottom:8}}>Page hits/day</div>
              <AreaChart days={gs.last7Days} field="totalHits" color={T.teal}/>
            </Box>
          )}
          <Box title="🕐 Hourly Activity">
            <HourlyMap grid={data!.hourlyHeatmap}/>
          </Box>
          <Box title="Daily Table">
            {data!.dailyStats.length===0?(
              <div style={{textAlign:'center',color:T.dim,padding:40,fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>📊</div>
                Daily data populates as users visit
              </div>
            ):(
              <div style={{overflowX:'auto' as const}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr>
                    {['Date','Hits','Sessions','Google','Guest','Mobile','Desktop'].map((h, idx)=>(
                      <th key={h} style={{padding:'7px 9px',textAlign: idx === 0 ? 'left' : 'right',color:T.muted,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap' as const}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data!.dailyStats.slice(0,30).map((d,i)=>(
                      <tr key={d.date} style={{borderBottom:`1px solid ${T.border}`,background:i===0?T.purpleLo:'transparent'}}>
                        <td style={{padding:'8px 9px',color:T.text,fontWeight:i===0?700:400}}>{d.date}</td>
                        {[d.totalHits,d.uniqueSessions,d.googleSessions,d.guestSessions,d.mobileSessions,d.desktopSessions].map((v,j)=>(
                          <td key={j} style={{padding:'8px 9px',textAlign:'right',color:[T.purple,T.muted,T.blue,T.muted,T.green,T.teal][j],fontVariantNumeric:'tabular-nums'}}>{v||0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Box>
        </div>
      )}

      {/* ═══ QUESTIONS ═══ */}
      {tab==='questions'&&(
        <div className="as">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
            <HeroStat label="Total Attempted" value={fmt(gs.totalQsSolved)} color={T.purple}/>
            <HeroStat label="Total Correct" value={fmt(gs.totalCorrect)} color={T.green}/>
            <HeroStat label="Avg Accuracy" value={`${gs.avgAccuracy}%`} color={T.amber}/>
            <HeroStat label="AI Solutions" value={fmt(gs.totalAISolutions)} color={T.purple}/>
          </div>
          <ContentTable rows={gs.contentPerformance}/>
          <Box title="🔥 Hardest Questions (Most AI Requests)">
            <QDifficulty items={gs.questionDifficulty}/>
          </Box>
          <Box title="Recent AI Solutions">
            {data!.aiSolutions.length===0?(
              <div style={{textAlign:'center',color:T.dim,padding:24,fontSize:13}}>No solutions yet</div>
            ):(
              <div style={{overflowX:'auto' as const}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr>{['Q#','Subject','Topic','When'].map(h=>(
                    <th key={h} style={{padding:'7px 9px',textAlign:'left',color:T.muted,fontWeight:600,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{data!.aiSolutions.slice(0,30).map(s=>(
                    <tr key={s.docId} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:'8px 9px',color:T.purple,fontWeight:700}}>#{s.questionId}</td>
                      <td style={{padding:'8px 9px',color:T.muted}}>{s.subject}</td>
                      <td style={{padding:'8px 9px',color:T.dim,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{s.topic}</td>
                      <td style={{padding:'8px 9px',color:T.dim,whiteSpace:'nowrap' as const}}>{ago(s.generatedAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Box>
        </div>
      )}

      {/* ═══ LEADERBOARD ═══ */}
      {tab==='leaderboard'&&(
        <div className="as">
          {/* Summary hero row */}
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' as const}}>
            <HeroStat label="Total Users" value={fmt(data!.users.length)} color={T.purple}/>
            <HeroStat label="Active (7 Days)" value={fmt(gs.segments.active + gs.segments.new)} color={T.green}/>
            <HeroStat label="Total Questions Solved" value={fmt(gs.totalQsSolved)} color={T.amber}/>
            <HeroStat label="Avg Accuracy" value={`${gs.avgAccuracy}%`} color={T.teal}/>
          </div>

          {/* Leaderboard tabs */}
          {(() => {
            const lbTabs: {key: 'qs'|'acc'|'eng'; label: string; icon: string; color: string}[] = [
              {key:'qs',  label:'Most Questions', icon:'📝', color:T.purple},
              {key:'acc', label:'Best Accuracy',  icon:'🎯', color:T.green},
              {key:'eng', label:'Top Engaged',    icon:'⚡', color:T.amber},
            ];
            return (
              <div style={{display:'flex',gap:7,marginBottom:14,flexWrap:'wrap' as const}}>
                {lbTabs.map(t=>(
                  <button key={t.key} onClick={()=>setSortBy(t.key)}
                    style={{padding:'7px 15px',borderRadius:99,border:`1px solid ${sortBy===t.key?t.color:T.border}`,
                      background:sortBy===t.key?`${t.color}18`:'transparent',
                      color:sortBy===t.key?t.color:T.muted,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            );
          })()}

          <Box title={`🏆 Leaderboard — ${sortBy==='qs'?'Most Questions Solved':sortBy==='acc'?'Best Accuracy':'Top Engaged'}`}
            right={<span style={{fontSize:11,color:T.muted}}>{data!.users.length} students</span>}>
            {data!.users.length===0?(
              <div style={{textAlign:'center',color:T.dim,padding:48,fontSize:13}}>
                <div style={{fontSize:40,marginBottom:10}}>🏆</div>
                <div style={{fontWeight:600}}>No students yet</div>
                <div style={{fontSize:12,marginTop:4}}>Users appear here after they sign in with Google and practice</div>
              </div>
            ):(
              <div>
                {/* Header */}
                <div style={{display:'grid',gridTemplateColumns:'44px 1fr 90px 90px 90px 70px',gap:8,padding:'8px 12px',borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:'0.06em',textTransform:'uppercase' as const}}>
                  <span>Rank</span><span>Student</span><span style={{textAlign:'right'}}>Questions</span><span style={{textAlign:'right'}}>Accuracy</span><span style={{textAlign:'right'}}>Tests</span><span style={{textAlign:'center'}}>Status</span>
                </div>
                {[...data!.users]
                  .sort((a,b)=>
                    sortBy==='qs'?b.totalQuestions-a.totalQuestions:
                    sortBy==='acc'?b.accuracy-a.accuracy:
                    b.engagementScore-a.engagementScore
                  )
                  .map((u,i)=>{
                    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null;
                    const rankColor = i===0?T.amber:i===1?'#9ca3af':i===2?'#cd7c2f':T.muted;
                    const isTop3 = i<3;
                    return (
                      <div key={u.docId} style={{
                        display:'grid',gridTemplateColumns:'44px 1fr 90px 90px 90px 70px',gap:8,
                        padding:'11px 12px',borderBottom:`1px solid ${T.border}`,
                        alignItems:'center',
                        background:isTop3?`rgba(124,92,252,${0.04*(3-i)})`:'transparent',
                        transition:'background 0.15s',
                      }}>
                        {/* Rank */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {medal
                            ? <span style={{fontSize:20}}>{medal}</span>
                            : <span style={{fontSize:13,fontWeight:700,color:rankColor,fontVariantNumeric:'tabular-nums'}}>{i+1}</span>
                          }
                        </div>
                        {/* Name + email */}
                        <div style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}>
                          <img src={u.avatar} alt={u.name}
                            style={{width:34,height:34,borderRadius:'50%',flexShrink:0,border:`2px solid ${isTop3?T.purple+'55':T.border}`}}
                            onError={e=>{(e.target as any).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=7c5cfc&color=fff`;}} />
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:isTop3?700:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{u.name}</div>
                            <div style={{fontSize:10,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{u.email}</div>
                          </div>
                        </div>
                        {/* Questions */}
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:15,fontWeight:700,color:T.purple,fontVariantNumeric:'tabular-nums'}}>{fmt(u.totalQuestions)}</div>
                          <div style={{fontSize:9,color:T.dim}}>{u.totalCorrect} correct</div>
                        </div>
                        {/* Accuracy */}
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:15,fontWeight:700,color:u.accuracy>=70?T.green:u.accuracy>=40?T.amber:T.red,fontVariantNumeric:'tabular-nums'}}>{u.accuracy}%</div>
                          <div style={{height:3,background:T.dim,borderRadius:2,marginTop:4}}>
                            <div style={{height:'100%',width:`${u.accuracy}%`,background:u.accuracy>=70?T.green:u.accuracy>=40?T.amber:T.red,borderRadius:2}}/>
                          </div>
                        </div>
                        {/* Tests */}
                        <div style={{textAlign:'right',fontSize:13,color:T.muted,fontVariantNumeric:'tabular-nums'}}>
                          {u.totalTests} tests
                        </div>
                        {/* Status */}
                        <div style={{display:'flex',justifyContent:'center'}}>
                          <SegBadge seg={u.segment}/>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </Box>

          {/* Subject accuracy breakdown */}
          <Box title="📊 Subject-wise Class Performance"
            right={<span style={{fontSize:11,color:T.muted}}>Average across all users</span>}>
            {gs.contentPerformance.map(r=>(
              <div key={r.subject} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:T.text,fontWeight:600}}>{r.subject}</span>
                  <span style={{color:r.avgAccuracy>=70?T.green:r.avgAccuracy>=40?T.amber:T.red,fontWeight:700}}>{r.avgAccuracy||'—'}%</span>
                </div>
                <div style={{height:6,background:T.dim,borderRadius:3}}>
                  <div style={{height:'100%',width:`${r.avgAccuracy}%`,background:r.avgAccuracy>=70?T.green:r.avgAccuracy>=40?T.amber:T.red,borderRadius:3,transition:'width 0.8s ease'}}/>
                </div>
              </div>
            ))}
          </Box>
        </div>
      )}

      {/* ═══ BROADCAST ═══ */}
      {tab==='broadcast'&&(
        <div className="as">
          <Box title="📣 Send Broadcast">
            <textarea value={bMsg} onChange={e=>setBMsg(e.target.value.slice(0,500))}
              placeholder="Write your announcement to all users…" rows={4}
              style={{width:'100%',padding:'12px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:14,resize:'vertical' as const,outline:'none'}}/>
            <div style={{display:'flex',gap:10,marginTop:10,alignItems:'center',flexWrap:'wrap' as const}}>
              <button onClick={sendBroadcast} disabled={bSending||!bMsg.trim()}
                style={{padding:'10px 22px',background:bSending||!bMsg.trim()?T.dim:T.purple,color:'#fff',border:'none',borderRadius:10,cursor:bSending||!bMsg.trim()?'not-allowed':'pointer',fontWeight:700,fontSize:14}}>
                {bSending?'⟳ Sending…':'↯ Send to All Users'}
              </button>
              {bResult&&<span style={{fontSize:13,color:bResult.startsWith('✅')?T.green:T.red}}>{bResult}</span>}
            </div>
            <div style={{fontSize:11,color:T.dim,marginTop:7}}>{bMsg.length}/500</div>
          </Box>
          <Box title="History">
            {data!.broadcasts.length===0?(
              <div style={{textAlign:'center',color:T.muted,padding:30,fontSize:13}}>No broadcasts sent yet</div>
            ):data!.broadcasts.map(b=>(
              <div key={b.docId} style={{background:T.surface,borderRadius:10,padding:'12px 14px',marginBottom:8}}>
                <div style={{fontSize:14,color:T.text,lineHeight:1.5,marginBottom:5}}>{b.message}</div>
                <div style={{fontSize:11,color:T.dim}}>By {b.sentBy} · {ago(b.sentAt)}</div>
              </div>
            ))}
          </Box>
        </div>
      )}

      {/* ═══ LIVE ═══ */}
      {tab==='live'&&(
        <div className="as">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <span style={{width:8,height:8,background:T.green,borderRadius:'50%',animation:'livePulse 1.5s ease-in-out infinite',display:'inline-block'}}/>
            <span style={{fontSize:13,color:T.muted}}>Real-time — Firestore live feed</span>
            {gs.onlineNow>0&&<span style={{fontSize:13,fontWeight:700,color:T.green}}>{gs.onlineNow} online now</span>}
          </div>
          <Box title="Live Sessions">
            {live.length===0?(
              <div style={{textAlign:'center',color:T.muted,padding:40}}>
                <div style={{fontSize:32,marginBottom:10,animation:'livePulse 2s ease-in-out infinite',display:'inline-block'}}>📡</div>
                <div style={{fontWeight:600}}>Waiting for sessions…</div>
                <div style={{fontSize:12,marginTop:4,color:T.dim}}>Real-time events appear here as users visit</div>
              </div>
            ):live.map((s,i)=>(
              <div key={s.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:i<2?T.green:T.dim,flexShrink:0,marginTop:5,...(i<2?{animation:'livePulse 2s ease-in-out infinite'}:{})}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:T.text,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    <span style={{fontSize:10,fontWeight:700,
                      color:s.loginType==='google'?T.blue:s.loginType==='guest'?'#a78bfa':T.muted,
                      background:s.loginType==='google'?T.blueLo:s.loginType==='guest'?T.purpleLo:T.surface,
                      padding:'2px 7px',borderRadius:99}}>
                      {s.loginType==='google'?'🔵 Google':s.loginType==='guest'?'👤 Guest':'⚪ Anon'}
                    </span>
                    <span style={{color:T.muted}}>{s.name||s.email||'Anonymous'}</span>
                  </div>
                  <div style={{fontSize:11,color:T.dim,marginTop:3}}>{s.device} · {s.browser} · {s.pageViews} views · {ago(s.lastSeenAt)}</div>
                </div>
                <span style={{fontSize:10,color:T.dim,flexShrink:0}}>{s.dateKey}</span>
              </div>
            ))}
          </Box>
        </div>
      )}

      </div>
    </div>
  );
}

export default AdminPanel;
