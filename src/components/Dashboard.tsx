import type { WorkoutSession } from '../types';
import { Calendar, Clock, Flame, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DashboardProps {
    workouts: WorkoutSession[];
    onViewChange: (view: 'weekly' | 'monthly' | 'list') => void;
}

export default function Dashboard({ workouts, onViewChange }: DashboardProps) {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 本周训练统计
    const thisWeekWorkouts = workouts.filter(w => {
        const date = new Date(w.date);
        return date >= weekStart && date <= weekEnd;
    });

    const totalSessions = thisWeekWorkouts.length;
    const totalDuration = thisWeekWorkouts.reduce((sum, w) => sum + w.duration, 0);
    const totalSets = thisWeekWorkouts.reduce(
        (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
        0
    );

    // 最近的训练
    const recentWorkouts = [...workouts]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 本周统计 */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    本周概览
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard
                        icon={<Calendar className="w-6 h-6" />}
                        label="训练次数"
                        value={totalSessions}
                        unit="次"
                        color="from-orange-600 to-orange-500"
                    />
                    <StatCard
                        icon={<Clock className="w-6 h-6" />}
                        label="总时长"
                        value={totalDuration}
                        unit="分钟"
                        color="from-zinc-600 to-zinc-500"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="总组数"
                        value={totalSets}
                        unit="组"
                        color="from-orange-500 to-orange-400"
                    />
                </div>
            </div>

            {/* 快捷入口 */}
            <div>
                <h2 className="text-xl font-bold mb-4">报告中心</h2>
                <div className="grid grid-cols-2 gap-4">
                    <QuickActionCard
                        title="周报"
                        description="查看本周训练总结"
                        icon="📊"
                        onClick={() => onViewChange('weekly')}
                    />
                    <QuickActionCard
                        title="月报"
                        description="查看本月进步曲线"
                        icon="📈"
                        onClick={() => onViewChange('monthly')}
                    />
                </div>
            </div>

            {/* 最近训练 */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">最近训练</h2>
                    <button
                        onClick={() => onViewChange('list')}
                        className="text-sm text-orange-400 hover:text-orange-300"
                    >
                        查看全部 →
                    </button>
                </div>

                {recentWorkouts.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-white/60">还没有训练记录</p>
                        <p className="text-sm text-white/40 mt-2">点击右上角"新建训练"开始记录</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentWorkouts.map(workout => (
                            <WorkoutCard key={workout.id} workout={workout} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    unit: string;
    color: string;
}

function StatCard({ icon, label, value, unit, color }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className={`bg-gradient-to-r ${color} p-2 rounded-lg w-fit mb-3`}>
                {icon}
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-100">
                {value}
                <span className="text-lg text-gray-400 ml-1">{unit}</span>
            </div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    );
}

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
}

function QuickActionCard({ title, description, icon, onClick }: QuickActionCardProps) {
    return (
        <button
            onClick={onClick}
            className="glass-card p-6 text-left hover:border-orange-500/30 transition-all duration-300 transform hover:-translate-y-1 group"
        >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-lg font-bold mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </button>
    );
}

interface WorkoutCardProps {
    workout: WorkoutSession;
}

function WorkoutCard({ workout }: WorkoutCardProps) {
    const exerciseCount = workout.exercises.length;
    const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);

    return (
        <div className="glass-card p-4 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="font-semibold">
                        {format(new Date(workout.date), 'MM月dd日 EEEE', { locale: zhCN })}
                    </div>
                    <div className="text-sm text-gray-400">
                        {exerciseCount} 个动作 · {totalSets} 组 · {workout.duration} 分钟
                    </div>
                </div>
                <div className="text-xs text-gray-500">
                    {format(new Date(workout.date), 'HH:mm')}
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                {workout.exercises.slice(0, 3).map((exercise, idx) => (
                    <span
                        key={idx}
                        className="text-xs bg-white/10 px-2 py-1 rounded-lg"
                    >
                        {exercise.name}
                    </span>
                ))}
                {workout.exercises.length > 3 && (
                    <span className="text-xs text-white/40">
                        +{workout.exercises.length - 3}
                    </span>
                )}
            </div>
        </div>
    );
}
