import { useEffect, useState } from 'react';
import { type TrainingWeek, parseRawCsv, getWeeksFromRaw, updateRawData, rawToCSV } from './lib/parser';
import { WeekCard } from './components/WeekCard';
import { Activity, Trophy, Calendar, Check } from 'lucide-react';

function App() {
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/plan.csv')
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

  const savePlan = async (currentGrid: string[][]) => {
    setSaving(true);
    try {
      // Convert raw grid back to CSV
      const csvText = rawToCSV(currentGrid);
      const res = await fetch('/api/save', {
        method: 'POST',
        body: csvText,
        headers: { 'Content-Type': 'text/plain' }
      });
      if (!res.ok) throw new Error('Failed to save');
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

  // Debounce autosave on RAW GRID change
  // We use a ref or check if rawGrid has changed significantly?
  // Just dependency on rawGrid is enough.
  useEffect(() => {
    if (rawGrid.length === 0 || loading) return;
    const timer = setTimeout(() => {
      savePlan(rawGrid);
    }, 1500);
    return () => clearTimeout(timer);
  }, [rawGrid]);


  const currentWeekIndex = weeks.findIndex(w => !w.actualMileage);

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
              {saving ? (
                <span className="text-yellow-400 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="text-emerald-400 flex items-center gap-1.5 opacity-50">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-4 text-sm font-medium text-white/50">
              <div className="hidden sm:flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>2Q Program</span>
              </div>
              <div className="hidden sm:block h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>{weeks.length} Weeks</span>
              </div>
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
                  week={week}
                  isCurrent={index === currentWeekIndex}
                  onUpdate={(newWeek) => handleUpdate(index, newWeek)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="py-8 text-center text-white/20 text-xs">
        <p>Training Plan Viewer • Built with React & Tailwind</p>
      </footer>
    </div>
  );
}

export default App;
