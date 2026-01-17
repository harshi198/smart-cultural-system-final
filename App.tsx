
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Region, 
  FolkStory, 
  StoryAnalysis, 
  GenerationState, 
  AppStep,
  Language
} from './types.ts';
import { STORY_DATASET } from './constants.tsx';
import { bharaKatha } from './services/geminiService.ts';
import { 
  BookOpen, 
  Play, 
  Pause,
  MapPin, 
  Volume2, 
  ChevronRight, 
  Loader2,
  Sparkles,
  ArrowLeft,
  History,
  Info,
  Globe,
  Headphones,
  Square
} from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('welcome');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<FolkStory | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(Language.English);
  
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isAnalyzing: false,
    isGeneratingAudio: false
  });

  // Audio Playback State
  const [audioStatus, setAudioStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const filteredStories = useMemo(() => {
    if (!selectedRegion) return [];
    let stories = STORY_DATASET.filter(s => s.region === selectedRegion);
    if (selectedTheme) {
      stories = stories.filter(s => s.type.includes(selectedTheme) || s.theme.includes(selectedTheme));
    }
    return stories;
  }, [selectedRegion, selectedTheme]);

  const uniqueThemes = useMemo(() => {
    if (!selectedRegion) return [];
    const themes = new Set<string>();
    STORY_DATASET.filter(s => s.region === selectedRegion).forEach(s => {
      themes.add(s.type.split(' ')[0]);
      s.theme.forEach(t => themes.add(t));
    });
    return Array.from(themes).slice(0, 10);
  }, [selectedRegion]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Source already stopped
      }
      sourceNodeRef.current = null;
    }
    setAudioStatus('idle');
  }, []);

  const handleStartAnalysis = async (story: FolkStory) => {
    stopAudio();
    setSelectedStory(story);
    setStep('processing');
    setGenerationState(prev => ({ ...prev, isAnalyzing: true, error: undefined }));
    
    try {
      const result = await bharaKatha.analyzeStory(story);
      setAnalysis(result);
      setStep('experience');
    } catch (err) {
      console.error(err);
      setStep('story-browse');
      alert("Analysis failed. Please check your network or API key.");
    } finally {
      setGenerationState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const generateFullAudio = async () => {
    if (!analysis) return;
    setGenerationState(prev => ({ ...prev, isGeneratingAudio: true }));
    
    try {
      const audioData = await bharaKatha.generateSpeech(analysis.fullNarration, targetLanguage);
      if (!audioData) throw new Error("The AI did not return any audio data. This can happen for very long narrations.");
      setAnalysis(prev => prev ? ({ ...prev, audioUri: `data:audio/pcm;base64,${audioData}` }) : null);
    } catch (err: any) {
      console.error("Audio generation failed:", err);
      alert(err.message || "Audio generation failed.");
    } finally {
      setGenerationState(prev => ({ ...prev, isGeneratingAudio: false }));
    }
  };

  const togglePause = useCallback(async () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'running') {
      await ctx.suspend();
      setAudioStatus('paused');
    } else if (ctx.state === 'suspended') {
      await ctx.resume();
      setAudioStatus('playing');
    }
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    try {
      // 1. Stop any existing audio immediately
      stopAudio();

      // 2. Setup AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // 3. Decode PCM data
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Ensure byte alignment (16-bit PCM = 2 bytes per sample)
      const alignedLength = Math.floor(bytes.byteLength / 2);
      const dataInt16 = new Int16Array(bytes.buffer, 0, alignedLength);
      
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      // 4. Play
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (sourceNodeRef.current === source) {
          setAudioStatus('idle');
        }
      };
      
      sourceNodeRef.current = source;
      source.start(0);
      setAudioStatus('playing');
    } catch (err) {
      console.error("Audio playback failed:", err);
      setAudioStatus('idle');
      alert("Playback failed. The audio data might be malformed.");
    }
  }, [stopAudio]);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-slate-900 flex flex-col font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#C2410C 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <nav className="bg-white border-b border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setStep('welcome'); stopAudio(); }}>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl text-white shadow-lg shadow-orange-200">
              <Sparkles size={22} />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight text-slate-800">BharatKatha <span className="text-orange-600">AI</span></span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
               <Globe size={14} className="text-slate-400" />
               <select 
                value={targetLanguage} 
                onChange={(e) => {
                   setTargetLanguage(e.target.value as Language);
                   // If audio was already generated, we might want to clear it?
                   // setAnalysis(prev => prev ? ({ ...prev, audioUri: undefined }) : null);
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
               >
                 {Object.values(Language).map(lang => (
                   <option key={lang} value={lang}>{lang}</option>
                 ))}
               </select>
             </div>
            <button onClick={() => { setStep('welcome'); stopAudio(); }} className="text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors">Explorer</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full relative z-10">
        
        {step === 'welcome' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-center max-w-3xl mx-auto py-20">
            <h4 className="text-orange-600 font-bold uppercase tracking-[0.2em] text-xs mb-4">India's Living Heritage</h4>
            <h1 className="text-6xl font-display font-bold text-slate-900 mb-8 leading-tight">BharatKatha: Echoes of Indian Heritage</h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-12">
              Step into an immersive archive of folklore. Experience centuries-old stories expanded by AI and narrated in authentic Indian English or regional tongues.
            </p>
            <button 
              onClick={() => setStep('region-select')}
              className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-orange-600 hover:scale-105 transition-all shadow-xl shadow-orange-100"
            >
              Start Your Journey
            </button>
          </div>
        )}

        {step === 'region-select' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl font-display font-bold mb-12 text-center">Choose a Region</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {Object.values(Region).map(reg => (
                <div 
                  key={reg}
                  onClick={() => { setSelectedRegion(reg); setStep('theme-select'); }}
                  className="group relative bg-white p-10 rounded-[2.5rem] border border-orange-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden text-center"
                >
                  <MapPin size={40} className="mx-auto mb-6 text-orange-200 group-hover:text-orange-500 transition-colors" />
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-orange-600 transition-colors">{reg}</h3>
                  <p className="text-xs text-slate-400 font-medium">10 Stories</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(step === 'theme-select' || step === 'story-browse') && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setStep('region-select')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-3xl font-display font-bold">{selectedRegion} Folklore</h2>
                <p className="text-slate-500 text-sm">Select a narrative style</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-10">
              <button 
                onClick={() => setSelectedTheme(null)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${!selectedTheme ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-orange-200'}`}
              >
                All Themes
              </button>
              {uniqueThemes.map(t => (
                <button 
                  key={t}
                  onClick={() => { setSelectedTheme(t); setStep('story-browse'); }}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${selectedTheme === t ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-orange-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredStories.map(story => (
                <div 
                  key={story.id}
                  onClick={() => handleStartAnalysis(story)}
                  className="bg-white rounded-[2rem] border border-orange-50 overflow-hidden hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="p-8 flex-1">
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-orange-600 transition-colors leading-tight">{story.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed italic line-clamp-4">
                      {story.summary}
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{story.era}</span>
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                      <Play size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-1000">
            <div className="relative mb-12">
              <div className="w-32 h-32 rounded-full border-4 border-orange-100 border-t-orange-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={40} className="text-orange-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">Crafting Your Experience...</h2>
            <p className="text-slate-500 max-w-md text-center">
              Expanding the narrative with rich cultural details from {selectedRegion}.
            </p>
          </div>
        )}

        {step === 'experience' && analysis && selectedStory && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-orange-100 overflow-hidden shadow-2xl">
                <div className="p-10 md:p-14">
                  <div className="flex items-center justify-between mb-12">
                    <h2 className="text-4xl font-display font-bold text-slate-800">{selectedStory.title}</h2>
                    <div className="flex gap-2">
                       <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 text-xs font-bold">
                        {targetLanguage}
                      </div>
                      {audioStatus !== 'idle' && (
                         <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-bold uppercase animate-pulse">
                           <Volume2 size={12} /> Live Narration
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-12 rounded-[2rem] border border-slate-100 mb-12 shadow-inner">
                    <div className="prose prose-slate prose-2xl max-w-none">
                      {analysis.fullNarration.split('\n\n').map((para, i) => (
                        <p key={i} className="text-2xl text-slate-800 leading-[1.7] font-serif mb-10 text-justify last:mb-0 first-letter:text-6xl first-letter:font-bold first-letter:mr-4 first-letter:float-left first-letter:text-orange-600 first-letter:mt-2">
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                       {!analysis.audioUri ? (
                         <button 
                          onClick={generateFullAudio}
                          disabled={generationState.isGeneratingAudio}
                          className="flex-1 md:flex-initial flex items-center justify-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-orange-600 disabled:bg-slate-300 transition-all shadow-xl shadow-orange-900/10"
                         >
                           {generationState.isGeneratingAudio ? (
                             <> <Loader2 className="animate-spin" size={24} /> Synthesizing Audio... </>
                           ) : (
                             <> <Headphones size={24} /> Narrate Story ({targetLanguage}) </>
                           )}
                         </button>
                       ) : (
                         <div className="flex gap-4">
                           {audioStatus === 'idle' ? (
                              <button 
                                onClick={() => playAudio(analysis.audioUri!)}
                                className="flex items-center justify-center gap-3 bg-emerald-600 text-white px-10 py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
                              >
                                <Play size={24} fill="currentColor" /> Play Narration
                              </button>
                           ) : (
                             <>
                               <button 
                                onClick={togglePause}
                                className="flex items-center justify-center gap-3 bg-orange-600 text-white px-8 py-5 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg"
                               >
                                 {audioStatus === 'playing' ? <><Pause size={24} fill="currentColor" /> Pause</> : <><Play size={24} fill="currentColor" /> Resume</>}
                               </button>
                               <button 
                                onClick={stopAudio}
                                className="flex items-center justify-center gap-3 bg-slate-200 text-slate-700 px-8 py-5 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                               >
                                 <Square size={20} fill="currentColor" /> Stop
                               </button>
                             </>
                           )}
                         </div>
                       )}
                    </div>
                    <button 
                      onClick={() => setStep('insight')}
                      className="flex items-center gap-2 text-slate-800 font-bold hover:text-orange-600 transition-colors text-lg"
                    >
                      Insights <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                   <Info className="text-orange-500" size={24} /> Metadata
                </h3>
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Dominant Emotion</span>
                    <span className="px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold border border-purple-100 uppercase inline-block">{analysis.emotion}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-3">Cultural Tokens</span>
                    <div className="flex flex-wrap gap-2">
                      {analysis.culturalNuances.map(n => (
                        <span key={n} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-medium border border-emerald-100">{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Globe size={100} />
                 </div>
                 <h4 className="font-bold text-orange-400 text-lg mb-4 flex items-center gap-2"><Globe size={20}/> Authentic Voices</h4>
                 <p className="text-sm text-slate-400 leading-relaxed">
                   Experience folklore as it was meant to be heard. Our Indian English narration model preserves the distinctive cadence and phonetics of the region.
                 </p>
              </div>
            </div>
          </div>
        )}

        {step === 'insight' && analysis && selectedStory && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="bg-white rounded-[3rem] border border-orange-100 overflow-hidden shadow-2xl">
               <div className="h-48 bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white">
                 <h2 className="text-4xl font-display font-bold">Deep Cultural Context</h2>
               </div>
               <div className="p-14 space-y-12">
                 <section>
                   <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-800">
                     <History className="text-orange-500" size={28} /> Historical Origins
                   </h3>
                   <p className="text-slate-600 leading-relaxed text-xl">
                     {analysis.historicalContext}
                   </p>
                 </section>

                 <section>
                   <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-800">
                     <BookOpen className="text-orange-500" size={28} /> Regional Significance
                   </h3>
                   <p className="text-slate-600 leading-relaxed text-xl">
                     {analysis.significance}
                   </p>
                 </section>

                 <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                   <div className="flex-1">
                     <h4 className="text-2xl font-bold mb-2">Explore More</h4>
                     <p className="text-slate-500">Every story is a window into the soul of a region. Choose another tale to expand your horizons.</p>
                   </div>
                   <button 
                    onClick={() => { setStep('welcome'); stopAudio(); }}
                    className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-orange-600 transition-all text-lg"
                   >
                     Back to Home
                   </button>
                 </div>
               </div>
             </div>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-100 py-8 px-10 flex justify-center items-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
           BharatKatha AI • A Cultural Storytelling Initiative
        </div>
      </footer>
    </div>
  );
};

export default App;
