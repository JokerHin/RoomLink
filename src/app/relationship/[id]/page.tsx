"use client";

import React, { useState, useEffect, use } from 'react';
import { PlusSquare, ChevronRight, Loader2, Users, FileText } from 'lucide-react';
import { WorkspaceDeal } from '@/types/ledger';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RelationshipHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [supplier, buyer] = id.split('-');
  const [topics, setTopics] = useState<WorkspaceDeal[]>([]);
  const [allRelationships, setAllRelationships] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/room');
      if (res.ok) {
        const data = await res.json();
        const deals: WorkspaceDeal[] = data.deals || [];
        
        // Filter topics for this specific relationship (Order Sensitive: Supplier -> Buyer)
        const matchedTopics = deals.filter(d => 
          d.supplier === supplier && d.buyer === buyer
        );
        setTopics(matchedTopics);

        // Derive unique relationships for the sidebar
        const relSet = new Set<string>();
        deals.forEach(d => relSet.add(`${d.supplier}-${d.buyer}`));
        setAllRelationships(Array.from(relSet));
      }
    } catch (err) {
      console.error('Failed to load deals', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (supplier && buyer) fetchDeals();
  }, [supplier, buyer]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer, supplier, topic_name: newTopicName }),
      });
      if (res.ok) {
        setNewTopicName('');
        await fetchDeals(); // Refresh list
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-[#00FFFF] selection:text-black">
      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tight hover:text-[#00FFFF] transition-none">LinkRoom</Link>
          <span className="text-white/30 px-4 border-l border-white/10">RELATIONSHIP HUB</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR (Now lists Relationships) */}
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-4 font-semibold flex justify-between items-center">
            Relationships
            <Link href="/" title="Create New Deal" className="hover:text-[#00FFFF] transition-none"><PlusSquare size={14} /></Link>
          </div>
          
          {isLoading ? (
            <div className="text-white/30 text-xs flex items-center gap-2"><Loader2 size={12} className="animate-spin" /></div>
          ) : allRelationships.length > 0 ? (
            allRelationships.map((relId) => {
              const [s, b] = relId.split('-');
              const isCurrent = relId === id;
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
            <div className="text-white/30 text-xs">No relationships.</div>
          )}
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 flex flex-col p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <h2 className="text-3xl font-bold mb-2">Relationship: {supplier.toUpperCase()} & {buyer.toUpperCase()}</h2>
            <p className="text-white/50 mb-12 uppercase tracking-widest text-sm">Manage topics and projects under this relationship</p>

            <div className="flex flex-col gap-8">
              
              {/* TOPIC LIST */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold border-b border-white/10 pb-2">Active Topics</h3>
                {topics.length > 0 ? (
                  topics.map(topic => (
                    <button 
                      key={topic.id}
                      onClick={() => router.push(`/deal/${topic.id}`)}
                      className="group flex items-center justify-between p-6 border border-white/10 bg-black hover:border-[#00FFFF] transition-none text-left"
                    >
                      <div className="flex items-center gap-4">
                        <FileText size={24} className="text-white/50 group-hover:text-[#00FFFF] transition-none" />
                        <div>
                          <h4 className="text-xl font-bold group-hover:text-[#00FFFF] transition-none">{topic.topic_name || 'General'}</h4>
                          <span className="text-xs text-white/40">{new Date(topic.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/30 group-hover:text-[#00FFFF]" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 border border-white/10 text-center text-white/50 text-sm">
                    No topics found for this relationship.
                  </div>
                )}
              </div>

              {/* CREATE NEW TOPIC */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-4">Create New Topic</h3>
                <form onSubmit={handleCreateTopic} className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="e.g., Q4 Marketing Campaign" 
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="flex-1 bg-black border border-white/20 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00FFFF] transition-none"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="bg-[#00FFFF] text-black font-bold px-8 py-3 uppercase tracking-widest text-xs transition-none hover:bg-white disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Initialize Topic'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
