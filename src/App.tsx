import React, { useEffect, useState } from 'react';
import { Trophy, Plus, Edit2, Trash2, MinusCircle, LogIn, LogOut, Crown, Medal, Award } from 'lucide-react';
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

  const addPoints = async (id: string, currentPoints: number) => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({ points: currentPoints + 1 })
        .eq('id', id);
      
      if (updateError) throw updateError;
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error in addPoints:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const reducePoints = async (id: string, currentPoints: number) => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({ points: Math.max(0, currentPoints - 1) })
        .eq('id', id);
      
      if (updateError) throw updateError;
      setError(null);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Error in reducePoints:', err);
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-[#39FF14]" />;
      case 2:
        return <Medal className="h-6 w-6 text-[#32CD32]" />;
      case 3:
        return <Award className="h-6 w-6 text-[#98FB98]" />;
      default:
        return <span className="text-lg font-semibold text-[#39FF14]">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-b border-[#39FF14]/30 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/src/assets/linpack-logo.svg" 
              alt="Linpack Club" 
              className="h-10 w-10 animate-pulse"
            />
          </div>
          <div className="text-[#39FF14] text-2xl font-bold tracking-wider drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
            LINPACK CLUB
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8" 
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(57,255,20,0.1) 0%, transparent 60%), 
                           repeating-linear-gradient(45deg, rgba(57,255,20,0.02) 0px, rgba(57,255,20,0.02) 1px, transparent 1px, transparent 10px)`
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl shadow-[0_0_15px_rgba(57,255,20,0.3)] border border-[#39FF14]/30 overflow-hidden">
            <div className="px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="bg-black p-3 rounded-xl shadow-[0_0_10px_rgba(57,255,20,0.5)] border border-[#39FF14] mr-4">
                    <Trophy className="h-10 w-10 text-[#39FF14]" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                      Leaderboard
                    </h1>
                    <p className="text-[#98FB98] mt-1">Track and manage player scores</p>
                  </div>
                </div>
                <div>
                  {isAdmin ? (
                    <button
                      onClick={handleAdminLogout}
                      className="inline-flex items-center px-4 py-2 border border-red-500 rounded-xl shadow-[0_0_10px_rgba(255,0,0,0.3)] text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAdminLogin(true)}
                      className="inline-flex items-center px-4 py-2 border border-[#39FF14] rounded-xl shadow-[0_0_10px_rgba(57,255,20,0.3)] text-[#39FF14] hover:bg-[#39FF14]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39FF14] transition-all duration-200"
                    >
                      <LogIn className="h-5 w-5 mr-2" />
                      Admin Login
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-xl text-red-500 animate-fadeIn">
                  {error}
                </div>
              )}

              {showAdminLogin && !isAdmin && (
                <form onSubmit={handleAdminLogin} className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="flex-1 rounded-xl border-[#39FF14] bg-black text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.2)] focus:border-[#39FF14] focus:ring-[#39FF14] transition-all duration-200"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-[#39FF14] rounded-xl shadow-[0_0_10px_rgba(57,255,20,0.3)] text-[#39FF14] hover:bg-[#39FF14]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39FF14] transition-all duration-200"
                    >
                      Login
                    </button>
                  </div>
                </form>
              )}

              {isAdmin && (
                <form onSubmit={addEntry} className="mb-8">
                  <div className="flex gap-3 p-4 bg-black/50 rounded-xl border border-[#39FF14]/30">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter player name"
                      className="flex-1 rounded-xl border-[#39FF14] bg-black text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.2)] focus:border-[#39FF14] focus:ring-[#39FF14] transition-all duration-200"
                    />
                    <input
                      type="number"
                      value={newPoints}
                      onChange={(e) => setNewPoints(Number(e.target.value))}
                      placeholder="Points"
                      className="w-28 rounded-xl border-[#39FF14] bg-black text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.2)] focus:border-[#39FF14] focus:ring-[#39FF14] transition-all duration-200"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-[#39FF14] rounded-xl shadow-[0_0_10px_rgba(57,255,20,0.3)] text-[#39FF14] hover:bg-[#39FF14]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39FF14] transition-all duration-200"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Player
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden shadow-[0_0_15px_rgba(57,255,20,0.2)] border border-[#39FF14]/30 rounded-xl">
                <table className="min-w-full divide-y divide-[#39FF14]/30">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#39FF14]">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#39FF14]">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#39FF14]">Points</th>
                      {isAdmin && (
                        <th className="px-6 py-4 text-right text-sm font-semibold text-[#39FF14]">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#39FF14]/30 bg-black/30">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-[#98FB98]">
                          <Trophy className="h-12 w-12 text-[#39FF14]/50 mx-auto mb-3" />
                          No players yet. {isAdmin && 'Add your first player above!'}
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry, index) => (
                        <tr 
                          key={entry.id} 
                          className="transition-colors duration-200 hover:bg-[#39FF14]/5"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getRankIcon(index + 1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${index < 3 ? 'font-semibold' : 'font-medium'} text-[#98FB98]`}>
                              {entry.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingId === entry.id ? (
                              <input
                                type="number"
                                value={editPoints}
                                onChange={(e) => setEditPoints(Number(e.target.value))}
                                className="w-24 rounded-lg border-[#39FF14] bg-black text-[#39FF14] focus:border-[#39FF14] focus:ring-[#39FF14] transition-all duration-200"
                              />
                            ) : (
                              <span className={`text-sm font-semibold ${
                                index === 0 ? 'text-[#39FF14]' :
                                index === 1 ? 'text-[#32CD32]' :
                                index === 2 ? 'text-[#98FB98]' :
                                'text-[#98FB98]'
                              }`}>
                                {entry.points}
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {editingId === entry.id ? (
                                <button
                                  onClick={() => updatePoints(entry.id, editPoints)}
                                  className="text-[#39FF14] hover:text-[#32CD32]"
                                >
                                  Save
                                </button>
                              ) : (
                                <div className="flex items-center justify-end space-x-3">
                                  <button
                                    onClick={() => {
                                      setEditingId(entry.id);
                                      setEditPoints(entry.points);
                                    }}
                                    className="text-[#39FF14] hover:text-[#32CD32] transition-colors duration-200"
                                    title="Edit points"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => addPoints(entry.id, entry.points)}
                                    className="text-[#39FF14] hover:text-[#32CD32] transition-colors duration-200"
                                    title="Add point"
                                  >
                                    +1
                                  </button>
                                  <button
                                    onClick={() => reducePoints(entry.id, entry.points)}
                                    className="text-[#39FF14] hover:text-[#32CD32] transition-colors duration-200"
                                    title="Reduce point"
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteEntry(entry.id)}
                                    className="text-red-500 hover:text-red-400 transition-colors duration-200"
                                    title="Delete player"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;