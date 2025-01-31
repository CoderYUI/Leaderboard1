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
      
      if (fetchError) {
        console.error('Error fetching leaderboard:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        setEntries(data);
      }
      setError(null);
    } catch (err) {
      console.error('Error in fetchLeaderboard:', err);
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
      // Check if player with same name exists
      const { data: existingPlayer } = await supabase
        .from('leaderboard')
        .select('*')
        .ilike('name', newName.trim())
        .single();

      if (existingPlayer) {
        // Update existing player's points
        const { error: updateError } = await supabase
          .from('leaderboard')
          .update({ points: existingPlayer.points + newPoints })
          .eq('id', existingPlayer.id);

        if (updateError) {
          console.error('Error updating points:', updateError);
          setError(updateError.message);
          return;
        }
      } else {
        // Add new player
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert([{ name: newName.trim(), points: newPoints }]);

        if (insertError) {
          console.error('Error adding entry:', insertError);
          setError(insertError.message);
          return;
        }
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
      
      if (updateError) {
        console.error('Error updating points:', updateError);
        setError(updateError.message);
        return;
      }

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
      
      if (updateError) {
        console.error('Error adding points:', updateError);
        setError(updateError.message);
        return;
      }

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
      
      if (updateError) {
        console.error('Error reducing points:', updateError);
        setError(updateError.message);
        return;
      }

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
      
      if (deleteError) {
        console.error('Error deleting entry:', deleteError);
        setError(deleteError.message);
        return;
      }

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
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-semibold text-gray-600">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-xl shadow-lg mr-4">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                    Leaderboard
                  </h1>
                  <p className="text-gray-500 mt-1">Track and manage player scores</p>
                </div>
              </div>
              <div>
                {isAdmin ? (
                  <button
                    onClick={handleAdminLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout Admin
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAdminLogin(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Admin Login
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 animate-fadeIn">
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
                    className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    Login
                  </button>
                </div>
              </form>
            )}

            {/* Add New Entry Form - Only visible to admin */}
            {isAdmin && (
              <form onSubmit={addEntry} className="mb-8">
                <div className="flex gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter player name"
                    className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  />
                  <input
                    type="number"
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    placeholder="Points"
                    className="w-28 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Player
                  </button>
                </div>
              </form>
            )}

            {/* Leaderboard Table */}
            <div className="overflow-hidden shadow-sm ring-1 ring-black/5 rounded-xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Points</th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
                        <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        No players yet. {isAdmin && 'Add your first player above!'}
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => (
                      <tr 
                        key={entry.id} 
                        className={`${
                          index < 3 ? 'bg-gradient-to-r from-white to-gray-50/30' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        } transition-colors duration-200 hover:bg-gray-50`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(index + 1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${index < 3 ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                            {entry.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              value={editPoints}
                              onChange={(e) => setEditPoints(Number(e.target.value))}
                              className="w-24 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                            />
                          ) : (
                            <span className={`text-sm font-semibold ${
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-600' :
                              index === 2 ? 'text-amber-700' :
                              'text-gray-900'
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
                                className="text-indigo-600 hover:text-indigo-900"
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
                                  className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                                  title="Edit points"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => addPoints(entry.id, entry.points)}
                                  className="text-green-600 hover:text-green-900 transition-colors duration-200"
                                  title="Add point"
                                >
                                  +1
                                </button>
                                <button
                                  onClick={() => reducePoints(entry.id, entry.points)}
                                  className="text-yellow-600 hover:text-yellow-900 transition-colors duration-200"
                                  title="Reduce point"
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors duration-200"
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
  );
}

export default App;