"use client";

import React, { useState, useEffect, use } from 'react';
import { PlusSquare, ChevronRight, Loader2, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { WorkspaceDeal } from '@/types/ledger';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DealDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [deal, setDeal] = useState<WorkspaceDeal | null>(null);
  const [relationships, setRelationships] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDealsAndDeal() {
      try {
        const dealsRes = await fetch('/api/room');
        if (dealsRes.ok) {
          const data = await dealsRes.json();
          const allDeals: WorkspaceDeal[] = data.deals || [];
          const relSet = new Set<string>();
          allDeals.forEach(d => relSet.add(`${d.supplier}-${d.buyer}`));
          setRelationships(Array.from(relSet));
        }

        // Fetch specific deal
        const dealRes = await fetch(`/api/deal/${id}`);
        if (dealRes.ok) {
          const data = await dealRes.json();
          setDeal(data.deal);
        }
      } catch (err) {
        console.error('Failed to load deal data', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDealsAndDeal();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 size={32} className="animate-spin text-[#00FFFF]" />
      </div>
    );
  }

  if (!deal) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Deal not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-[#00FFFF] selection:text-black">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">LinkRoom</h1>
          <span className="text-white/30 px-4 border-l border-white/10">{id}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR (Now lists Relationships) */}
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-4 font-semibold flex justify-between items-center">
            Relationships
            <Link href="/" title="Create New Relationship" className="hover:text-[#00FFFF] transition-none"><PlusSquare size={14} /></Link>
          </div>
          
          {relationships.length > 0 ? (
            relationships.map((relId) => {
              const [s, b] = relId.split('-');
              const isCurrent = deal && relId === `${deal.supplier}-${deal.buyer}`;
              return (
                <Link 
                  key={relId}
                  href={`/relationship/${relId}`}
                  className={`text-left w-full flex items-center justify-between transition-none p-3 group ${isCurrent ? 'bg-[#00FFFF]/10 border-l-2 border-[#00FFFF]' : 'border-l-2 border-transparent hover:bg-white/5 hover:border-white/20'}`}
                >
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-widest ${isCurrent ? 'text-[#00FFFF]' : 'text-white/80 group-hover:text-white'}`}>
                      {s.split('.')[0]} - {b.split('.')[0]}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 ${isCurrent ? 'opacity-100 text-[#00FFFF]' : 'text-white'}`} />
                </Link>
              );
            })
          ) : (
            <div className="text-white/30 text-xs">No active relationships.</div>
          )}
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 flex flex-col p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <Link href={`/relationship/${deal.supplier}-${deal.buyer}`} className="text-[#00FFFF] text-xs uppercase tracking-widest font-bold mb-4 inline-flex items-center hover:text-white transition-none"><ChevronRight className="rotate-180 mr-2" size={14} /> Back to Relationship Hub</Link>
            <h2 className="text-3xl font-bold mb-2 mt-4">{deal.topic_name || 'General'}</h2>
            <p className="text-white/50 mb-12 uppercase tracking-widest text-sm">Select a Workspace to enter this Topic's Ledger</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* PUBLIC / SHARED ROOM BUTTON */}
              <button 
                onClick={() => router.push(`/room/${deal.shared_room_id}`)}
                className="group relative flex flex-col items-start p-8 border border-white/10 bg-black hover:border-[#00FFFF] transition-none text-left"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10 group-hover:bg-[#00FFFF] transition-none"></div>
                <Users size={32} className="text-white/50 group-hover:text-[#00FFFF] mb-6 transition-none" />
                <h3 className="text-2xl font-bold mb-2 group-hover:text-[#00FFFF] transition-none">Public Shared Room</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Fully transparent ledger visible to both {deal.supplier} and {deal.buyer}. Used for external meetings, shared tasks, and updates.
                </p>
                <div className="mt-auto flex items-center text-xs uppercase tracking-widest font-bold text-white/50 group-hover:text-[#00FFFF] transition-none">
                  Enter Shared Ledger <ArrowRight size={14} className="ml-2" />
                </div>
              </button>

              {/* INTERNAL ROOM BUTTON */}
              <button 
                onClick={() => router.push(`/room/${deal.internal_room_id}`)}
                className="group relative flex flex-col items-start p-8 border border-white/10 bg-black hover:border-[#00FFFF] transition-none text-left"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10 group-hover:bg-[#00FFFF] transition-none"></div>
                <ShieldCheck size={32} className="text-white/50 group-hover:text-[#00FFFF] mb-6 transition-none" />
                <h3 className="text-2xl font-bold mb-2 group-hover:text-[#00FFFF] transition-none">Internal Private Room</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Strictly isolated environment for {deal.supplier}. Completely invisible to the buyer. Used for internal strategy, private notes, and draft tasks.
                </p>
                <div className="mt-auto flex items-center text-xs uppercase tracking-widest font-bold text-white/50 group-hover:text-[#00FFFF] transition-none">
                  Enter Internal Ledger <ArrowRight size={14} className="ml-2" />
                </div>
              </button>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
