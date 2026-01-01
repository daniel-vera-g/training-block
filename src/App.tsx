import { useEffect, useState, useRef } from 'react';
import { type TrainingWeek, parseRawCsv, getWeeksFromRaw, updateRawData, rawToCSV } from './lib/parser';
import { type GitHubConfig, saveToGitHub } from './lib/github';
import { WeekCard } from './components/WeekCard';
import { Activity, Trophy, Calendar, Check, Settings, X, Github } from 'lucide-react';

function App() {
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // GitHub Config State
  const [showSettings, setShowSettings] = useState(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);

  // Settings Form State
  const [repoUrl, setRepoUrl] = useState('');
  const [ghToken, setGhToken] = useState('');

  const currentWeekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load config from local storage
    const savedConfig = localStorage.getItem('gh_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setGhConfig(config);
      setRepoUrl(`https://github.com/${config.owner}/${config.repo}`);
      setGhToken(config.token);
    }

    // Fix: Use correct base path for fetching assets
    // When base is '/marathon-training-plan/', the file is at '/marathon-training-plan/plan.csv'
    const planUrl = import.meta.env.BASE_URL + 'plan.csv';

    fetch(planUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load training plan');
        return response.text();
      })
      .then(text => {
        // Parse raw grid
        const grid = parseRawCsv(text);
        setRawGrid(grid);

        // Derive UI model
        const data = getWeeksFromRaw(grid);
        setWeeks(data);

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);


  const handleSaveSettings = () => {
    try {
      // Parse "user/repo" or full URL
      const cleanRepo = repoUrl.replace('https://github.com/', '').split('/');
      if (cleanRepo.length < 2) {
        alert('Please enter a valid "owner/repo" or full URL');
        return;
      }

      const config: GitHubConfig = {
        token: ghToken,
        owner: cleanRepo[0],
        repo: cleanRepo[1],
        branch: 'main', // Default to main for now
        path: 'public/plan.csv'
      };

      setGhConfig(config);
      localStorage.setItem('gh_config', JSON.stringify(config));
      setShowSettings(false);
      alert('Settings saved!');
    } catch (e) {
      alert('Invalid settings');
    }
  };

  const handleClearSettings = () => {
    setGhConfig(null);
    setRepoUrl('');
    setGhToken('');
    localStorage.removeItem('gh_config');
    setShowSettings(false);
  };

  const savePlan = async (currentGrid: string[][]) => {
    setSaving(true);
    try {
      const csvText = rawToCSV(currentGrid);

      if (ghConfig) {
        // GITHUB MODE
        await saveToGitHub(ghConfig, csvText);
      } else {
        // LOCAL DEV MODE
        const res = await fetch('/api/save', {
          method: 'POST',
          body: csvText,
          headers: { 'Content-Type': 'text/plain' }
        });
        if (!res.ok) throw new Error('Failed to save');
      }

      setLastSaved(new Date());
    } catch (e) {
      console.error(e);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (index: number, newWeek: TrainingWeek) => {
    // 1. Update UI state
    const newWeeks = [...weeks];
    newWeeks[index] = newWeek;
    setWeeks(newWeeks);

    // 2. Update Raw Grid state
    if (rawGrid.length > 0) {
      const newGrid = updateRawData(rawGrid, index, newWeek);
      setRawGrid(newGrid);
    }
  };

  // Read Only Mode determined by:
  // 1. Production Build AND
  // 2. No GitHub Config present
  const isReadOnly = import.meta.env.PROD && !ghConfig;

  // Debounce autosave on RAW GRID change
  useEffect(() => {
    if (rawGrid.length === 0 || loading || isReadOnly) return;
    const timer = setTimeout(() => {
      savePlan(rawGrid);
    }, 1500);
    return () => clearTimeout(timer);
  }, [rawGrid, isReadOnly]);


  const currentWeekIndex = weeks.findIndex(w => !w.actualMileage);

  // Auto-scroll to current week when loading finishes
  useEffect(() => {
    if (!loading && currentWeekRef.current) {
      // Small timeout to ensure DOM is ready/layout is stable
      setTimeout(() => {
        currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [loading]);



  return (
    <div className="min-h-screen bg-[#111] text-white selection:bg-blue-500/30">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#111]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Marathon<span className="text-white/40 font-normal">Plan</span></h1>
          </div>
          <div className="flex items-center gap-6">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-xs font-medium transition-colors">
              {!isReadOnly && (
                saving ? (
                  <span className="text-yellow-400 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 opacity-50">
                    <Check className="w-3 h-3" />
                    Saved
                  </span>
                ) : null
              )}
              {isReadOnly && (
                <span className="text-white/30 flex items-center gap-1.5 border border-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                  Read Only
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm font-medium text-white/50">
              <div className="hidden sm:flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>2Q Program</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>{weeks.length} Weeks</span>
              </div>

              <div className="hidden sm:block h-4 w-[1px] bg-white/10" />

              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className={`w-4 h-4 ${ghConfig ? 'text-blue-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p>Loading your plan...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-400 text-center">
            <p>Error loading plan: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="flex flex-col gap-6">
              {weeks.map((week, index) => (
                <WeekCard
                  key={week.weeksUntilRace}
                  ref={index === currentWeekIndex ? currentWeekRef : null}
                  week={week}
                  isCurrent={index === currentWeekIndex}
                  onUpdate={(newWeek) => handleUpdate(index, newWeek)}
                  readOnly={isReadOnly}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Github className="w-5 h-5" />
                GitHub Sync
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Personal Access Token</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
                />
                <p className="text-[10px] text-white/20 mt-1.5 leading-relaxed">
                  Token requires <code>repo</code> scope. Stored locally in your browser.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              {ghConfig && (
                <button
                  onClick={handleClearSettings}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSaveSettings}
                className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-8 text-center text-white/20 text-xs">
        <p>Training Plan Viewer • Built with React & Tailwind</p>
      </footer>
    </div>
  );
}

export default App;
