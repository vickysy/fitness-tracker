import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, TrendingUp, Dumbbell, Share2, Settings } from 'lucide-react';
import type { WorkoutSession } from './types';
import { storage } from './utils/storage';
import { supabase } from './utils/supabase';
import WorkoutForm from './components/WorkoutForm';
import WorkoutList from './components/WorkoutList';
import WeeklyReportView from './components/WeeklyReportView';
import MonthlyReportView from './components/MonthlyReportView';
import Dashboard from './components/Dashboard';

type View = 'dashboard' | 'add' | 'list' | 'weekly' | 'monthly' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncCode, setSyncCode] = useState<string | null>(storage.getSyncCode());

  const loadWorkouts = useCallback(async () => {
    const data = await storage.getAllWorkouts();
    setWorkouts(data);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 检查 URL 参数中的 syncCode
        const params = new URLSearchParams(window.location.search);
        const urlSyncCode = params.get('syncCode');
        if (urlSyncCode && urlSyncCode !== syncCode) {
          if (confirm(`检测到同步口令: ${urlSyncCode}\n是否要绑定此口令并同步数据？`)) {
            storage.setSyncCode(urlSyncCode);
            setSyncCode(urlSyncCode);
            // 清除 URL 中的参数，避免刷新时再次提示
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        await storage.migrateToSQLite();
        await loadWorkouts();
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, [loadWorkouts]);

  // 监听云端实时更新
  useEffect(() => {
    if (!syncCode || !supabase) return;

    const channel = supabase
      .channel('workouts_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `sync_code=eq.${syncCode}`
        },
        () => {
          console.log('检测到云端更新，正在同步...');
          loadWorkouts();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [syncCode, loadWorkouts]);

  const handleSaveWorkout = async (workout: WorkoutSession) => {
    try {
      await storage.saveWorkout(workout);
      await loadWorkouts();
      setCurrentView('dashboard');
      setEditingWorkout(null);
    } catch (error) {
      console.error('保存失败', error);
      alert('保存失败: ' + error);
    }
  };

  const handleSyncCodeChange = async (newCode: string | null) => {
    storage.setSyncCode(newCode);
    setSyncCode(newCode);
    setIsLoading(true);
    try {
      await loadWorkouts();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSyncCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    handleSyncCodeChange(code);
  };

  const handleEditWorkout = (workout: WorkoutSession) => {
    setEditingWorkout(workout);
    setCurrentView('add');
  };

  const handleDeleteWorkout = async (id: string) => {
    if (confirm('确定要删除这条训练记录吗?')) {
      await storage.deleteWorkout(id);
      await loadWorkouts();
    }
  };

  const handleCancelEdit = () => {
    setEditingWorkout(null);
    setCurrentView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
          <p className="text-gray-400 animate-pulse">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col overflow-x-hidden">
      {/* Header - 统一头部，减少闪烁 */}
      <header className="glass-card m-3 p-4 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {currentView === 'add' ? (editingWorkout ? '编辑训练' : '新建训练') : '健身记录'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentView === 'add' ? (
              <button
                onClick={handleCancelEdit}
                className="text-sm text-gray-400 hover:text-white px-2 py-1"
              >
                取消
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('settings')}
                className={`p-2 rounded-lg ${currentView === 'settings' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - 增加底部间距确保不被遮挡 */}
      <main className="flex-1 px-4 pb-24 safe-bottom">
        {currentView === 'dashboard' && (
          <Dashboard workouts={workouts} onViewChange={setCurrentView} />
        )}

        {currentView === 'add' && (
          <WorkoutForm
            key={editingWorkout?.id || 'new'}
            workout={editingWorkout}
            onSave={handleSaveWorkout}
            onCancel={handleCancelEdit}
          />
        )}

        {currentView === 'list' && (
          <WorkoutList
            workouts={workouts}
            onEdit={handleEditWorkout}
            onDelete={handleDeleteWorkout}
          />
        )}

        {currentView === 'weekly' && <WeeklyReportView workouts={workouts} />}
        {currentView === 'monthly' && <MonthlyReportView workouts={workouts} />}

        {currentView === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            {/* ... 设置内容保持不变 ... */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <Share2 className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold">云端同步</h2>
              </div>

              {syncCode ? (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-orange-500/20">
                    <p className="text-sm text-gray-400 mb-1">当前同步口令</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-black tracking-wider text-orange-400">
                        {syncCode}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const shareUrl = `${window.location.origin}${window.location.pathname}?syncCode=${syncCode}`;
                            navigator.clipboard.writeText(shareUrl);
                            alert('专属同步链接已复制！发给教练，她打开链接即可直接绑定并录入数据。');
                          }}
                          className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                        >
                          分享链接
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(syncCode);
                            alert('口令已复制！');
                          }}
                          className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                        >
                          复制口令
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    将此口令发送给教练。她在她的应用中输入此口令后，你们即可实时同步训练记录和照片。
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('断开同步后，你将回到本地存储模式。确定吗？')) {
                        handleSyncCodeChange(null);
                      }
                    }}
                    className="w-full py-3 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    断开同步
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    启用云端同步后，教练录入的数据会实时同步到你的手机上。
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={generateSyncCode}
                      className="btn-primary w-full py-4"
                    >
                      生成新口令
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#09090b] px-2 text-gray-500">或者</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入教练给的口令"
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSyncCodeChange(e.currentTarget.value.toUpperCase());
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input.value) handleSyncCodeChange(input.value.toUpperCase());
                        }}
                        className="px-6 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors"
                      >
                        绑定
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">关于应用</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                这是一个专业的健身数字化交付工具。旨在帮助教练更高效地记录数据，帮助学员更直观地看到进步。
              </p>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/20">
                <span>版本: 1.0.6 (Build 1224-2200)</span>
                <button 
                  onClick={() => {
                    if(confirm('确定要清除所有缓存并重新加载吗？这不会删除你的训练数据。')) {
                      window.location.reload();
                    }
                  }}
                  className="hover:text-orange-500 transition-colors"
                >
                  强制刷新
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation - 仅在非编辑模式显示 */}
      {currentView !== 'add' && (
        <nav className="fixed bottom-4 left-4 right-4 glass-card p-2 z-20">
          <div className="flex justify-around items-center">
            <NavButton
              icon={<Dumbbell className="w-5 h-5" />}
              label="首页"
              active={currentView === 'dashboard'}
              onClick={() => setCurrentView('dashboard')}
            />
            <NavButton
              icon={<Calendar className="w-5 h-5" />}
              label="周报"
              active={currentView === 'weekly'}
              onClick={() => setCurrentView('weekly')}
            />
            <NavButton
              icon={<TrendingUp className="w-5 h-5" />}
              label="月报"
              active={currentView === 'monthly'}
              onClick={() => setCurrentView('monthly')}
            />
          </div>
        </nav>
      )}

      {/* 悬浮新建按钮 - 仅在首页显示 */}
      {currentView === 'dashboard' && (
        <button
          onClick={() => setCurrentView('add')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 rounded-full shadow-xl shadow-orange-900/50 flex items-center justify-center z-30 animate-bounce-slow"
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl transition-all duration-200 ${active
        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white scale-105 shadow-lg shadow-orange-900/50'
        : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50'
        }`}
    >
      {icon}
      <span className="text-[10px] sm:text-xs font-medium">{label}</span>
    </button>
  );
}

export default App;
