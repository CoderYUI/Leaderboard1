import React, { useEffect, useState } from 'react';
import { Trophy, Plus, Edit2, Trash2, MinusCircle, LogIn, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  created_at: string;
}

function App() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newPoints, setNewPoints] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase
      .channel('leaderboard_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leaderboard' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
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
          <div className="mb-6">
            <form onSubmit={handleAdminLogin} className="flex gap-2">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-white/20 focus:ring-0 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200"
              >
                Login
              </button>
            </form>
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
            </form>
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry, index) => (
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

        {entries.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No entries yet</p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          {isAdmin ? (
            <button
              onClick={handleAdminLogout}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout Admin</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all duration-200 flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Admin Login</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;