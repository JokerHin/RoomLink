"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Globe, Zap, FileText } from 'lucide-react';
import { WorkspaceDeal } from '@/types/ledger';

export default function Home() {
  const router = useRouter();
  const [deals, setDeals] = useState<WorkspaceDeal[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Topic Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyer, setBuyer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [topicName, setTopicName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/room');
      if (res.ok) {
        const data = await res.json();
        const allDeals: WorkspaceDeal[] = data.deals || [];
        setDeals(allDeals);
        
        // Extract unique domains (normalized)
        const domSet = new Set<string>();
        allDeals.forEach(d => {
          domSet.add(d.supplier.toLowerCase().trim());
          domSet.add(d.buyer.toLowerCase().trim());
        });
        setDomains(Array.from(domSet).map(d => d.toUpperCase()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer || !supplier) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer: buyer.toLowerCase(), supplier: supplier.toLowerCase(), topic_name: topicName }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchDeals(); // Refresh graph
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const getDomainSize = (domain: string) => {
    const linkCount = deals.filter(d => 
      d.supplier.toLowerCase() === domain.toLowerCase() || 
      d.buyer.toLowerCase() === domain.toLowerCase()
    ).length;
    return 100 + (linkCount * 15); // Balanced: Base 100px + 15px per link
  };

  const domainColors: any = {
    'UM': '#FF00FF',
    'APU': '#00FFFF',
    'SUNWAY': '#FFFF00',
    'MONASH': '#00FF00'
  };

  const getDomainColor = (name: string) => {
    const base = name.split('.')[0].toUpperCase();
    return domainColors[base] || '#FFFFFF';
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-[#00FFFF] selection:text-black">
      
      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00FFFF] rounded-full blur-[180px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FF00FF] rounded-full blur-[180px]"></div>
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 px-12 py-8 flex justify-between items-center">
        <div className="text-2xl font-black tracking-tighter cursor-default flex items-center gap-2">
          <Zap className="text-[#00FFFF]" fill="#00FFFF" size={24} />
          LinkRoom
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 bg-black/40 backdrop-blur px-8 py-4 hover:bg-[#00FFFF] hover:text-black hover:border-[#00FFFF] transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        >
          <Plus size={14} /> Establish Connection
        </button>
      </header>

      {/* MAIN GRAPH */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20">
        <div className="text-center mb-8">
          <h1 className="text-7xl font-black tracking-tighter mb-2 animate-in fade-in zoom-in duration-1000">LinkRoom</h1>
          <p className="text-[10px] text-[#00FFFF] font-mono tracking-[0.8em] uppercase opacity-60">Your All-in-One Solution</p>
        </div>

        <div className="relative w-full max-w-6xl h-[700px] flex items-center justify-center">
          
          {/* LAYER 1: BACKGROUND LINES (Behind Nodes) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* CURVED LINES FOR EACH TOPIC */}
            {deals.map((deal) => {
              const idxA = domains.indexOf(deal.supplier.toUpperCase());
              const idxB = domains.indexOf(deal.buyer.toUpperCase());
              if (idxA === -1 || idxB === -1) return null;

              const angleA = (idxA / domains.length) * 2 * Math.PI;
              const angleB = (idxB / domains.length) * 2 * Math.PI;
              const radius = 280;
              const x1 = 576 + Math.cos(angleA) * radius; 
              const y1 = 350 + Math.sin(angleA) * radius;
              const x2 = 576 + Math.cos(angleB) * radius;
              const y2 = 350 + Math.sin(angleB) * radius;

              const samePairDeals = deals.filter(d => 
                (d.supplier.toUpperCase() === deal.supplier.toUpperCase() && d.buyer.toUpperCase() === deal.buyer.toUpperCase()) ||
                (d.supplier.toUpperCase() === deal.buyer.toUpperCase() && d.buyer.toUpperCase() === deal.supplier.toUpperCase())
              );
              const dealIdx = samePairDeals.indexOf(deal);
              const curveFactor = (dealIdx - (samePairDeals.length - 1) / 2) * 80;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const normalX = -dy / Math.sqrt(dx * dx + dy * dy);
              const normalY = dx / Math.sqrt(dx * dx + dy * dy);
              const cx = midX + normalX * curveFactor;
              const cy = midY + normalY * curveFactor;

              const isHovered = hoveredLink === deal.id;
              const color = getDomainColor(deal.supplier);

              return (
                <path 
                  key={deal.id}
                  d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? "12" : "6"}
                  strokeOpacity={isHovered ? "1" : "0.5"}
                  className="transition-all duration-300"
                  filter={isHovered ? "url(#glow)" : ""}
                />
              );
            })}
          </svg>

          {/* LAYER 2: DOMAIN NODES (Middle) */}
          {domains.map((domain, idx) => {
            const angle = (idx / domains.length) * 2 * Math.PI;
            const radius = 280;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const size = getDomainSize(domain);
            const color = getDomainColor(domain);

            return (
              <div 
                key={domain}
                className="absolute transition-all duration-1000 ease-in-out z-20 pointer-events-auto"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <div 
                  className="rounded-full border-2 bg-black flex flex-col items-center justify-center p-4 text-center transition-all duration-500 hover:scale-105 shadow-2xl"
                  style={{ 
                    width: `${size}px`, 
                    height: `${size}px`,
                    borderColor: `${color}66`,
                    boxShadow: `0 0 50px ${color}22`
                  }}
                >
                  <Globe size={size/4} className="mb-2 opacity-50" style={{ color: color }} />
                  <span className="font-black uppercase tracking-widest leading-none" style={{ fontSize: `${size/8}px` }}>
                    {domain.split('.')[0]}
                  </span>
                </div>
              </div>
            );
          })}

          {/* LAYER 3: FOREGROUND INTERACTION (Top - Invisible hit areas + Labels) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
            {[...deals].sort((a, b) => (hoveredLink === a.id ? 1 : hoveredLink === b.id ? -1 : 0)).map((deal) => {
              const idxA = domains.indexOf(deal.supplier.toUpperCase());
              const idxB = domains.indexOf(deal.buyer.toUpperCase());
              if (idxA === -1 || idxB === -1) return null;

              const angleA = (idxA / domains.length) * 2 * Math.PI;
              const angleB = (idxB / domains.length) * 2 * Math.PI;
              const radius = 280;
              const x1 = 576 + Math.cos(angleA) * radius; 
              const y1 = 350 + Math.sin(angleA) * radius;
              const x2 = 576 + Math.cos(angleB) * radius;
              const y2 = 350 + Math.sin(angleB) * radius;

              const samePairDeals = deals.filter(d => 
                (d.supplier.toUpperCase() === deal.supplier.toUpperCase() && d.buyer.toUpperCase() === deal.buyer.toUpperCase()) ||
                (d.supplier.toUpperCase() === deal.buyer.toUpperCase() && d.buyer.toUpperCase() === deal.supplier.toUpperCase())
              );
              const dealIdx = samePairDeals.indexOf(deal);
              const curveFactor = (dealIdx - (samePairDeals.length - 1) / 2) * 80;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const normalX = -dy / Math.sqrt(dx * dx + dy * dy);
              const normalY = dx / Math.sqrt(dx * dx + dy * dy);
              const cx = midX + normalX * curveFactor;
              const cy = midY + normalY * curveFactor;

              const isHovered = hoveredLink === deal.id;

              return (
                <g key={deal.id} className="pointer-events-auto cursor-pointer" onMouseEnter={() => setHoveredLink(deal.id)} onMouseLeave={() => setHoveredLink(null)} onClick={() => router.push(`/deal/${deal.id}`)}>
                  {/* Invisible wide hit-area path */}
                  <path 
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="40"
                  />
                  {/* Topic Label on hover */}
                  {isHovered && (
                    <foreignObject x={cx - 150} y={cy - 50} width="300" height="100" className="overflow-visible">
                      <div className="bg-white text-black text-xs font-black uppercase tracking-tight px-6 py-3 rounded-xl shadow-[0_0_60px_rgba(255,255,255,0.8)] border-4 border-black animate-in fade-in zoom-in duration-200 text-center flex items-center justify-center gap-3">
                        <FileText size={16} className="shrink-0 text-[#00FFFF]" fill="black" />
                        <span className="whitespace-nowrap">{deal.topic_name || 'General'}</span>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 text-white/10 font-mono text-[8px] uppercase tracking-[1em] animate-pulse">
          Hover over connections to reveal project streams
        </div>
      </main>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-lg bg-black p-16 shadow-[0_0_100px_rgba(0,255,255,0.1)] border border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={28} /></button>
            <h2 className="text-4xl font-black tracking-tighter mb-2">Protocol Init</h2>
            <p className="text-[10px] text-[#00FFFF] font-bold tracking-[0.4em] uppercase mb-12">Universal Link Establishment</p>
            
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Supplier</label>
                  <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="bg-transparent border-b-2 border-white/10 py-2 focus:border-[#00FFFF] outline-none text-xl transition-all" placeholder="UM" required />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Buyer</label>
                  <input type="text" value={buyer} onChange={(e) => setBuyer(e.target.value)} className="bg-transparent border-b-2 border-white/10 py-2 focus:border-[#00FFFF] outline-none text-xl transition-all" placeholder="APU" required />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Stream Topic</label>
                <input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)} className="bg-transparent border-b-2 border-white/10 py-2 focus:border-[#00FFFF] outline-none text-xl transition-all" placeholder="e.g. Quantum Infrastructure" />
              </div>
              <button type="submit" disabled={isCreating} className="bg-white text-black font-black py-6 uppercase tracking-[0.3em] text-xs hover:bg-[#00FFFF] transition-all duration-500">
                {isCreating ? 'SYNCING...' : 'CONFIRM CONNECTION'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
