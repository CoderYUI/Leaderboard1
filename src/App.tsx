import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Plus, Edit2, Trash2, Search, Clock, SortAsc, SortDesc, LogOut, Upload, X, AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabase';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  created_at: string;
}

type SortField = 'points' | 'name' | 'created_at';
type SortOrder = 'asc' | 'desc';

function App() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LeaderboardEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newPoints, setNewPoints] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvData, setCsvData] = useState<{ name: string; points: number }[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase
      .channel('leaderboard_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leaderboard' },
        () => fetchLeaderboard()
      )
      .subscribe();

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAdminLogin(true);
      }
      if (e.key === 'Escape') {
        setShowAdminLogin(false);
        setAdminPassword('');
        setShowCsvUpload(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  useEffect(() => {
    const filtered = entries.filter(entry =>
      entry.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'points') {
        return sortOrder === 'desc' ? b.points - a.points : a.points - b.points;
      }
      if (sortField === 'name') {
        return sortOrder === 'desc' 
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    setFilteredEntries(sorted);
  }, [entries, searchTerm, sortField, sortOrder]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('leaderboard')
        .select('*')
        .order('points', { ascending: false });
      
      if (fetchError) throw fetchError;
      if (data) setEntries(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '66789035611') {
      setIsAdmin(true);
      setAdminPassword('');
      setShowAdminLogin(false);
      setError(null);
    } else {
      setError('Invalid admin password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setError(null);
    setShowCsvUpload(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',');
      const nameIndex = headers.indexOf('name');
      const pointsIndex = headers.indexOf('points');

      if (nameIndex === -1 || pointsIndex === -1) {
        setError('CSV must have "name" and "points" columns');
        return;
      }

      const parsedData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          return {
            name: values[nameIndex].trim(),
            points: parseInt(values[pointsIndex], 10)
          };
        })
        .filter(entry => !isNaN(entry.points) && entry.name);

      setCsvData(parsedData);
    };
    reader.readAsText(file);
  };

  const importCsvData = async () => {
    if (!csvData.length) return;

    try {
      for (const entry of csvData) {
        const { data: existingPlayer } = await supabase
          .from('leaderboard')
          .select('*')
          .ilike('name', entry.name)
          .single();

        if (existingPlayer) {
          await supabase
            .from('leaderboard')
            .update({ points: existingPlayer.points + entry.points })
            .eq('id', existingPlayer.id);
        } else {
          await supabase
            .from('leaderboard')
            .insert([{ name: entry.name, points: entry.points }]);
        }
      }

      setShowCsvUpload(false);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error importing CSV data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during import');
    }
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    if (!newName.trim()) return;

    try {
      const { data: existingPlayer } = await supabase
        .from('leaderboard')
        .select('*')
        .ilike('name', newName.trim())
        .single();

      if (existingPlayer) {
        const { error: updateError } = await supabase
          .from('leaderboard')
          .update({ points: existingPlayer.points + newPoints })
          .eq('id', existingPlayer.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert([{ name: newName.trim(), points: newPoints }]);

        if (insertError) throw insertError;
      }

      setNewName('');
      setNewPoints(0);
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error in addEntry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updatePoints = async (id: string, points: number) => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({ points })
        .eq('id', id);
      
      if (updateError) throw updateError;
      setEditingId(null);
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error in updatePoints:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteEntry = async (id: string) => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    try {
      const { error: deleteError } = await supabase
        .from('leaderboard')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error in deleteEntry:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const clearLeaderboard = async () => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('leaderboard')
        .delete()
        .gte('created_at', '1970-01-01'); // Delete all rows by using a date condition

      if (deleteError) throw deleteError;
      
      setShowClearConfirm(false);
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error clearing leaderboard:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while clearing the leaderboard');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 leaderboard-gradient">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-white mb-8 tracking-wider">
          LEADERBOARD
        </h1>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {showAdminLogin && !isAdmin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/90 p-6 rounded-xl border border-white/10 shadow-xl w-full max-w-md">
              <h2 className="text-xl font-semibold text-white mb-4">Admin Access</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-white/20 focus:ring-0"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminPassword('');
                    }}
                    className="px-4 py-2 rounded-lg hover:bg-white/5 text-white/70 text-sm transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCsvUpload && isAdmin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/90 p-6 rounded-xl border border-white/10 shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Import CSV</h2>
                <button
                  onClick={() => setShowCsvUpload(false)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-sm text-white/70 mb-2">CSV Format:</p>
                  <code className="text-xs text-white/60 block">
                    name,points<br />
                    John Doe,100<br />
                    Jane Smith,200
                  </code>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="block w-full text-sm text-white/70
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-white/10 file:text-white
                    hover:file:bg-white/20
                    file:cursor-pointer cursor-pointer"
                />
                {csvData.length > 0 && (
                  <div>
                    <p className="text-sm text-white/70 mb-2">Preview:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {csvData.map((entry, index) => (
                        <div key={index} className="text-sm text-white/60 flex justify-between">
                          <span>{entry.name}</span>
                          <span>{entry.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCsvUpload(false)}
                    className="px-4 py-2 rounded-lg hover:bg-white/5 text-white/70 text-sm transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={importCsvData}
                    disabled={!csvData.length}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/90 p-6 rounded-xl border border-white/10 shadow-xl w-full max-w-md">
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-xl font-semibold">Clear Leaderboard</h2>
              </div>
              <p className="text-white/70 mb-6">
                Are you sure you want to clear the entire leaderboard? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-lg hover:bg-white/5 text-white/70 text-sm transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={clearLeaderboard}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 text-sm transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mb-6">
            <form onSubmit={addEntry} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Player name"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-white/20 focus:ring-0 text-sm"
              />
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                placeholder="Points"
                className="w-full sm:w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-white/20 focus:ring-0 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCsvUpload(true)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 flex items-center justify-center gap-2"
                title="Import CSV"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 text-sm transition-all duration-200 flex items-center justify-center gap-2"
                title="Clear Leaderboard"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </form>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-white/20 focus:ring-0 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSort('points')}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-all duration-200 ${
                sortField === 'points'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              Points
              {sortField === 'points' && (
                sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => toggleSort('created_at')}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-all duration-200 ${
                sortField === 'created_at'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Clock className="h-4 w-4" />
              {sortField === 'created_at' && (
                sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="leaderboard-item rounded-lg p-3 flex items-center gap-4 shimmer"
              >
                <div className="rank-number opacity-30">{String(index + 1).padStart(2, '0')}</div>
                <div className="flex-1 h-6 bg-white/10 rounded"></div>
                <div className="w-20 h-6 bg-white/10 rounded"></div>
              </div>
            ))
          ) : filteredEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="leaderboard-item rounded-lg p-3 flex items-center gap-4"
            >
              <div className="rank-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="flex-1 truncate">
                {editingId === entry.id ? (
                  <input
                    type="text"
                    value={entry.name}
                    readOnly
                    className="w-full bg-transparent border-none text-white focus:ring-0 p-0"
                  />
                ) : (
                  <span className="text-white/90">{entry.name}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {editingId === entry.id ? (
                  <input
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-right focus:border-white/20 focus:ring-0 text-sm"
                  />
                ) : (
                  <span className="text-white/90 tabular-nums">{entry.points}</span>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    {editingId === entry.id ? (
                      <button
                        onClick={() => updatePoints(entry.id, editPoints)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        Save
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditPoints(entry.points);
                          }}
                          className="p-1 hover:bg-white/10 rounded opacity-50 hover:opacity-100"
                          title="Edit points"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100"
                          title="Delete player"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? 'No matching players found' : 'No entries yet'}</p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleAdminLogout}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout Admin</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;