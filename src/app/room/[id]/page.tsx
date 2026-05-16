"use client";

import React, { useState, useEffect, use } from 'react';
import { Search, PlusSquare, CheckSquare, Square, ChevronRight, Loader2, RefreshCw, X, ArrowLeft } from 'lucide-react';
import { WorkspaceDeal, LedgerChunk, ActionItem, RoomSummary } from '@/types/ledger';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RoomDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // UI State
  const [ingestText, setIngestText] = useState('');
  const [ingestType, setIngestType] = useState("schedule a meeting");
  const [ingestCompany, setIngestCompany] = useState('');
  const [ingestPlatform, setIngestPlatform] = useState('google meet');
  const [ingestLink, setIngestLink] = useState('');
  const [ingestToCompany, setIngestToCompany] = useState('');
  const [ingestEmail, setIngestEmail] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  
  const ledgerEndRef = React.useRef<HTMLDivElement>(null);
  
  const [isIngesting, setIsIngesting] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // Data State
  const [deals, setDeals] = useState<WorkspaceDeal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [chunks, setChunks] = useState<LedgerChunk[]>([]);
  const [globalSummary, setGlobalSummary] = useState<RoomSummary | null>(null);
  const [searchResults, setSearchResults] = useState<LedgerChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(true);

  // Fetch Deals for Sidebar
  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/room');
        if (res.ok) {
          const data = await res.json();
          const allDeals: WorkspaceDeal[] = data.deals || [];
          setDeals(allDeals);
        }
      } catch (err) {
        console.error('Failed to load deals', err);
      } finally {
        setIsLoadingDeals(false);
      }
    }
    fetchDeals();
  }, []);

  // Derive unique relationships
  const relationships = Array.from(new Set(deals.map(d => `${d.supplier}-${d.buyer}`)));

  // Fetch Ledger Chunks for this specific room
  const fetchLedger = async () => {
    setIsLoadingChunks(true);
    try {
      const res = await fetch(`/api/room/${id}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks || []);
        if (data.global_summary) {
          if (globalSummary && data.global_summary.updated_at !== globalSummary.updated_at) {
            setToastMessage("AI Briefing Updated!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
          }
          setGlobalSummary(data.global_summary);
        }
      }
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  useEffect(() => {
    if (id) fetchLedger();
  }, [id]);

  // Auto-scroll to bottom of ledger
  useEffect(() => {
    if (ledgerEndRef.current) {
      ledgerEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [chunks]);

  const activeDeal = deals.find(d => id.includes(d.shared_room_id) || id.includes(d.internal_room_id));

  // Initialize company dropdown when active deal loads
  useEffect(() => {
    if (activeDeal && !ingestCompany) {
      setIngestCompany(activeDeal.supplier);
    }
  }, [activeDeal]);

  // Derived state: aggregate action items (DEPRECATED, using globalSummary instead)
  // const allActionItems = chunks.flatMap(chunk => chunk.action_items || []);

  const handleIngest = async () => {
    if (!ingestText.trim() || !ingestCompany.trim()) return;
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          uploaded_by: ingestCompany,
          source_type: ingestType,
          raw_text: ingestType === 'schedule a meeting' 
            ? `[LINK: ${ingestLink}]\n\n${ingestText}`
            : ingestType === 'update email'
            ? `[SENT TO: ${ingestToCompany} (${ingestEmail})]\n\n${ingestText}`
            : ingestType === 'paperwork'
            ? `[DOCUMENT: ${fileName}]\n\n${ingestText}`
            : ingestText,
          file_data: fileData, // Persist base64 to Firestore
          file_name: fileName
        }),
      });

      if (res.ok) {
        setIngestText('');
        setIsIngestModalOpen(false);
        // Poll multiple times to ensure we catch the AI worker finishing (in case API timeouts are slow)
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          await fetchLedger();
          if (attempts >= 5) clearInterval(interval); // Poll at 3s, 6s, 9s, 12s, 15s
        }, 3000);
      }
    } catch (err) {
      console.error('Ingest failed', err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          query: searchQuery,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTask = async (index: number) => {
    if (!globalSummary) return;
    const newItems = [...globalSummary.action_items];
    newItems[index].status = newItems[index].status === 'completed' ? 'pending' : 'completed';
    
    try {
      await fetch(`/api/room/${id}/summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_items: newItems })
      });
      setGlobalSummary({ ...globalSummary, action_items: newItems });
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const scrollToChunk = (chunkId: string) => {
    setIsSearchModalOpen(false);
    
    // Check if the chunk is in the visible list
    const sorted = [...chunks].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const chunkIndex = sorted.findIndex(c => c.id === chunkId);
    
    if (chunkIndex !== -1) {
      // If the chunk is further back than current visibleCount, expand visibleCount
      const total = sorted.length;
      const indexFromEnd = total - 1 - chunkIndex;
      if (indexFromEnd >= visibleCount) {
        setVisibleCount(indexFromEnd + 1);
      }
      
      // Delay slightly to allow React to render the newly visible items
      setTimeout(() => {
        const element = document.getElementById(`chunk-${chunkId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-white/10');
          setTimeout(() => element.classList.remove('bg-white/10'), 2000);
        }
      }, 100);
    }
  };

  const triggerAISummary = async () => {
    if (chunks.length === 0) return;
    // We trigger the AI by sending a specialized ingest message that the worker knows is a refresh
    try {
      setToastMessage("AI is analyzing room activity...");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          uploaded_by: 'SYSTEM',
          source_type: 'refresh_ai',
          raw_text: 'Manual trigger for AI re-summarization.',
        }),
      });
      const previousUpdatedAt = globalSummary?.updated_at;

      // Poll until the summary actually changes (max 10 attempts x 3s = 30s)
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const res = await fetch(`/api/room/${id}/ledger`);
        if (res.ok) {
          const data = await res.json();
          const newUpdatedAt = data.global_summary?.updated_at;
          if (newUpdatedAt && newUpdatedAt !== previousUpdatedAt) {
            // Summary has been updated — refresh the full state
            setGlobalSummary(data.global_summary);
            setChunks(data.chunks || []);
            setToastMessage("AI Briefing Updated!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
            return; // done
          }
        }
        if (attempts < 10) {
          setTimeout(poll, 3000); // try again in 3s
        } else {
          setToastMessage("AI analysis complete. Refresh if needed.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          fetchLedger(); // final fallback fetch
        }
      };
      setTimeout(poll, 4000); // first check after 4s (give the worker time to start)
    } catch (err) {
      console.error('Trigger failed', err);
    }
  };

  // Auto-trigger AI if summary is missing but events exist
  useEffect(() => {
    if (!isLoadingChunks && chunks.length > 0 && !globalSummary) {
      triggerAISummary();
    }
  }, [isLoadingChunks, chunks.length, !!globalSummary]);

  const isSharedRoom = id.startsWith('shared-');
  const roomTypeLabel = isSharedRoom ? "PUBLIC SHARED ROOM" : "INTERNAL PRIVATE ROOM";

  return (
    <div className="h-screen flex flex-col bg-black text-white font-sans selection:bg-[#00FFFF] selection:text-black overflow-hidden">
      
      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#00FFFF] text-black px-6 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(0,255,255,0.3)] flex items-center gap-3">
            <RefreshCw size={18} className="animate-spin" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* GLOBAL HEADER */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tight hover:text-[#00FFFF] transition-none">LinkRoom</Link>
          <span className="text-white/30 px-4 border-l border-white/10">{roomTypeLabel}</span>
          <span className="text-[#00FFFF] px-4 border-l border-white/10 text-xs uppercase tracking-widest">{id}</span>
        </div>
        <button 
          onClick={() => setIsSearchModalOpen(true)}
          className="bg-[#00FFFF] text-black font-bold px-6 py-2 transition-none hover:bg-white hover:text-black uppercase tracking-widest text-sm flex items-center gap-2"
        >
          <Search size={16} strokeWidth={3} />
          Query Ledger Vault
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-4 font-semibold flex justify-between items-center">
            Relationships
            <Link href="/" title="Create New Relationship" className="hover:text-[#00FFFF] transition-none"><PlusSquare size={14} /></Link>
          </div>
          
          {isLoadingDeals ? (
            <div className="text-white/30 text-xs flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Loading...</div>
          ) : relationships.length > 0 ? (
            relationships.map((relId) => {
              const [s, b] = relId.split('-');
              const isCurrent = activeDeal && relId === `${activeDeal.supplier}-${activeDeal.buyer}`;
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
        <main className="flex-1 flex overflow-hidden">
          
          {/* LEFT: TRANSACTION LEDGER */}
          <section className="flex-1 border-r border-white/10 flex flex-col">
            <div className="p-6 border-b border-white/10 bg-black/50 backdrop-blur shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-white/50 hover:text-white transition-none" title="Back to Deal">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-sm uppercase tracking-widest font-semibold text-white/70">Transaction Ledger</h2>
                <button onClick={fetchLedger} className="text-white/30 hover:text-white transition-none" title="Refresh Ledger">
                  <RefreshCw size={14} className={isLoadingChunks ? 'animate-spin text-[#00FFFF]' : ''} />
                </button>
              </div>
              
              <button 
                onClick={() => setIsIngestModalOpen(true)}
                className="bg-black border border-white text-white px-6 py-2 transition-none hover:bg-white hover:text-black uppercase tracking-widest text-xs font-bold flex items-center gap-2"
              >
                <PlusSquare size={16} />
                Add Event
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 custom-scrollbar">
              {isLoadingChunks ? (
                <div className="flex items-center justify-center h-full text-white/20">
                  <Loader2 className="animate-spin mr-2" /> Loading ledger...
                </div>
              ) : chunks.length > 0 ? (
                <>
                  {/* LOAD OLDER BUTTON */}
                  {chunks.length > visibleCount && (
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 15)}
                      className="w-full py-4 border border-white/5 bg-white/5 text-white/40 text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-none mb-4"
                    >
                      Load Previous History ({chunks.length - visibleCount} more)
                    </button>
                  )}

                  {/* Sort ascending for chat-app behavior (Newest at BOTTOM) */}
                  {[...chunks]
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .slice(-visibleCount)
                    .map((chunk) => {
                      const isSupplier = activeDeal && chunk.uploaded_by.toLowerCase() === activeDeal.supplier.toLowerCase();
                      const borderColor = isSupplier ? 'bg-[#00FFFF]/50' : 'bg-[#FF00FF]/50';
                      const textColor = isSupplier ? 'text-[#00FFFF]' : 'text-[#FF00FF]';

                      return (
                        <div 
                          key={chunk.id} 
                          id={`chunk-${chunk.id}`}
                          className="border border-white/10 p-6 bg-black flex flex-col gap-3 relative group hover:border-white/30 transition-all duration-500 w-full"
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${borderColor}`}></div>
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-3">
                        <div className="flex gap-4 items-center">
                          <h3 className="text-xs uppercase tracking-widest text-white/40">{chunk.source_type.replace('_', ' ')}</h3>
                          <span className={`text-xs uppercase tracking-widest font-bold ${textColor}`}>From: {chunk.uploaded_by}</span>
                        </div>
                        <span className="text-xs font-mono text-white/40">{new Date(chunk.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-white/90 leading-relaxed text-sm whitespace-pre-wrap mt-2">
                        {chunk.raw_text.split('\n').map((line, i) => {
                          if (line.startsWith('[LINK: ') && line.endsWith(']')) {
                            const link = line.substring(7, line.length - 1);
                            return (
                              <div key={i} className="mb-4">
                                <a 
                                  href={link.startsWith('http') ? link : `https://${link}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-[#00FFFF]/10 border border-[#00FFFF]/30 px-4 py-2 text-[#00FFFF] hover:bg-[#00FFFF]/20 transition-none"
                                >
                                  <PlusSquare size={14} /> JOIN MEETING: {link}
                                </a>
                              </div>
                            );
                          }
                          if (line.startsWith('[DOCUMENT: ') && line.endsWith(']')) {
                            const doc = line.substring(11, line.length - 1);
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc);
                            const downloadUrl = chunk.file_data || `https://www.google.com/search?q=${encodeURIComponent(doc)}`;
                            return (
                              <div key={i} className="mb-4">
                                <a 
                                  href={downloadUrl} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={chunk.file_data ? doc : undefined}
                                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 text-white hover:bg-[#00FFFF]/20 hover:border-[#00FFFF]/50 transition-none"
                                >
                                  {isImage ? <PlusSquare size={14} className="text-[#00FFFF]" /> : <PlusSquare size={14} />}
                                  {isImage ? 'OPEN FULL IMAGE:' : 'DOWNLOAD ASSET:'} {doc}
                                </a>
                              </div>
                            );
                          }
                          return <div key={i}>{line}</div>;
                        })}
                      </div>

                      {/* PERSISTED IMAGE VIEW */}
                      {chunk.file_data && /\.(jpg|jpeg|png|gif|webp)$/i.test(chunk.file_name || '') && (
                        <div className="mt-4 border border-white/10 p-2 bg-white/5">
                          <img src={chunk.file_data} alt="uploaded content" className="max-w-full h-auto object-contain max-h-[400px]" />
                        </div>
                      )}
                    </div>
                  );
                })}
                </>
              ) : (
                <div className="text-white/30 text-center p-12 text-sm flex flex-col items-center">
                  <div className="mb-4 text-white/20"><Square size={48} /></div>
                  No events in this ledger yet.<br/>Click "Add Event" to ingest a meeting or task.
                </div>
              )}
              <div ref={ledgerEndRef} />
            </div>
          </section>

          {/* RIGHT: ACTION PANEL & GLOBAL SUMMARY */}
          <section className="w-[400px] bg-black flex flex-col overflow-y-auto shrink-0 p-6">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm uppercase tracking-widest font-semibold text-[#00FFFF]">Global Executive Briefing</h2>
              <button 
                onClick={triggerAISummary}
                className="text-white/30 hover:text-[#00FFFF] transition-none"
                title="Refresh AI Analysis"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            {globalSummary ? (
              <div className="flex flex-col gap-8">
                {/* GLOBAL SUMMARY */}
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap border border-white/10 p-5 bg-white/5 flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
                  {globalSummary.summary_markdown}
                </div>

                {/* GLOBAL ACTION ITEMS */}
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 text-white/50 border-b border-white/10 pb-2">Pending Action Items</h3>
                  <div className="flex flex-col gap-4">
                    {globalSummary.action_items && globalSummary.action_items.length > 0 ? (
                      globalSummary.action_items.map((action, i) => (
                        <div key={i} className="flex gap-4 items-start group border-b border-white/5 pb-4">
                          <button 
                            onClick={() => toggleTask(i)}
                            className="mt-0.5 text-white/30 group-hover:text-white transition-none shrink-0"
                          >
                            {action.status === 'completed' ? (
                              <CheckSquare size={18} className="text-[#00FFFF]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                          <div className="flex flex-col">
                            <span className={`text-sm leading-relaxed ${action.status === 'completed' ? 'text-white/40 line-through' : 'text-white'}`}>
                              {action.task}
                            </span>
                            <span className="text-xs font-mono text-[#00FFFF] mt-2 uppercase">
                              @{action.assignee_domain || 'unassigned'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/30 text-sm">No pending action items.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/30 text-sm p-4 border border-white/10 text-center">
                Waiting for AI to generate a Global Executive Briefing...<br/><br/>
                Add an event to the ledger to trigger the analysis.
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ADD EVENT MODAL */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/20 w-full max-w-2xl flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-lg font-bold tracking-widest uppercase">Add Event to Ledger</h3>
              <button onClick={() => setIsIngestModalOpen(false)} className="text-white/50 hover:text-white transition-none"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-6">
                {/* CATEGORY SELECTOR */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Event Category</label>
                  <select 
                    value={ingestType} 
                    onChange={(e) => setIngestType(e.target.value)}
                    className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF] appearance-none cursor-pointer"
                  >
                    <option value="schedule a meeting">Schedule a Meeting</option>
                    <option value="paperwork">Paperwork</option>
                    <option value="update email">Update Email</option>
                    <option value="sticky note reminder">Sticky Note Reminder</option>
                  </select>
                </div>

                {/* COMPANY ORIGIN */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-semibold text-white/50">From Company</label>
                  <select 
                    value={ingestCompany}
                    onChange={(e) => setIngestCompany(e.target.value)}
                    className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF] appearance-none cursor-pointer"
                  >
                    {activeDeal && (
                      <>
                        <option value={activeDeal.supplier}>{activeDeal.supplier}</option>
                        <option value={activeDeal.buyer}>{activeDeal.buyer}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* DYNAMIC FIELDS BASED ON TYPE */}
              {ingestType === 'schedule a meeting' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Meeting Platform</label>
                    <select 
                      value={ingestPlatform} 
                      onChange={(e) => setIngestPlatform(e.target.value)}
                      className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF] appearance-none cursor-pointer"
                    >
                      <option value="google meet">Google Meet</option>
                      <option value="microsoft teams">Microsoft Teams</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Meeting Link</label>
                    <input 
                      type="text"
                      value={ingestLink}
                      onChange={(e) => setIngestLink(e.target.value)}
                      placeholder="meet.google.com/abc-defg-hij"
                      className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>
              )}

              {ingestType === 'update email' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Sent To Company</label>
                    <select 
                      value={ingestToCompany}
                      onChange={(e) => setIngestToCompany(e.target.value)}
                      className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF] appearance-none cursor-pointer"
                    >
                      <option value="">Select Recipient</option>
                      {activeDeal && (
                        <>
                          <option value={activeDeal.supplier}>{activeDeal.supplier}</option>
                          <option value={activeDeal.buyer}>{activeDeal.buyer}</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Recipient Email</label>
                    <input 
                      type="email"
                      value={ingestEmail}
                      onChange={(e) => setIngestEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="bg-black border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-[#00FFFF]"
                    />
                  </div>
                </div>
              )}

              {ingestType === 'paperwork' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Upload Document (Any Format)</label>
                  <div className="relative border-2 border-dashed border-white/20 p-8 flex flex-col items-center justify-center gap-2 hover:border-[#00FFFF] cursor-pointer group">
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFileName(file.name);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFileData(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <PlusSquare className="text-white/30 group-hover:text-[#00FFFF]" size={32} />
                    <span className="text-sm text-white/40">{fileName || "Click to upload doc, pdf, xls, etc."}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest font-semibold text-white/50">Raw Content</label>
                <textarea 
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  placeholder="Paste meeting notes, tasks, or updates here. AI will summarize and extract actions..." 
                  className="bg-black border border-white/20 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00FFFF] transition-none min-h-[200px] resize-y"
                />
              </div>

              <button 
                onClick={handleIngest}
                disabled={isIngesting || !ingestText.trim() || !ingestCompany.trim()}
                className="mt-4 bg-[#00FFFF] text-black font-bold px-6 py-4 uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-none hover:bg-white disabled:opacity-50"
              >
                {isIngesting ? <><Loader2 size={18} className="animate-spin" /> Processing via AI...</> : "Submit to Ledger"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEMANTIC SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/20 w-full max-w-3xl flex flex-col shadow-2xl">
            <div className="flex items-center p-4 border-b border-white/10">
              <Search size={20} className="text-[#00FFFF] mr-4" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
                placeholder="Query Semantic Memory Vault..." 
                className="flex-1 bg-transparent border-none text-xl text-white placeholder-white/30 focus:outline-none"
              />
              <button onClick={() => setIsSearchModalOpen(false)} className="text-white/50 hover:text-white ml-4">
                <X size={24} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4">
              {isSearching ? (
                <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>
              ) : searchResults.length > 0 ? (
                searchResults.map(result => (
                  <div 
                    key={result.id} 
                    onClick={() => scrollToChunk(result.id!)}
                    className="border border-white/10 p-4 bg-white/5 hover:bg-white/10 transition-none cursor-pointer group"
                  >
                    <div className="text-xs text-[#00FFFF] mb-2 uppercase tracking-widest font-semibold flex justify-between group-hover:text-white">
                      Matched Chunk
                      <span className="text-white/30">{new Date(result.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-white/80 group-hover:text-white">{result.summary_markdown || result.raw_text}</div>
                  </div>
                ))
              ) : searchQuery && !isSearching ? (
                <div className="p-8 text-center text-white/30">No relevant semantic matches found.</div>
              ) : (
                <div className="p-8 text-center text-white/30">Enter a query to perform a vector search across this isolated workspace.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
