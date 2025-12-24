import type { WorkoutSession } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Edit, Trash2, Clock, Dumbbell } from 'lucide-react';

interface WorkoutListProps {
    workouts: WorkoutSession[];
    onEdit: (workout: WorkoutSession) => void;
    onDelete: (id: string) => void;
}

export default function WorkoutList({ workouts, onEdit, onDelete }: WorkoutListProps) {
    const sortedWorkouts = [...workouts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">训练历史</h2>

            {sortedWorkouts.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Dumbbell className="w-16 h-16 mx-auto mb-4 text-white/40" />
                    <p className="text-white/60 text-lg">还没有训练记录</p>
                    <p className="text-sm text-white/40 mt-2">开始记录你的健身之旅吧!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedWorkouts.map(workout => (
                        <WorkoutCard
                            key={workout.id}
                            workout={workout}
                            onEdit={() => onEdit(workout)}
                            onDelete={() => onDelete(workout.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface WorkoutCardProps {
    workout: WorkoutSession;
    onEdit: () => void;
    onDelete: () => void;
}

function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
    const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);
    const totalVolume = workout.exercises.reduce(
        (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
        0
    );

    return (
        <div className="glass-card p-5 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-lg font-bold mb-1">
                        {format(new Date(workout.date), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/60">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {workout.duration} 分钟
                        </span>
                        <span>{workout.exercises.length} 个动作</span>
                        <span>{totalSets} 组</span>
                        <span>{totalVolume.toFixed(0)} kg总量</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Edit className="w-5 h-5 text-blue-400" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                </div>
            </div>

            {/* 训练动作 */}
            <div className="space-y-2 mb-4">
                {workout.exercises.map((exercise, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded">
                                    {exercise.bodyPart}
                                </span>
                                <span className="font-medium">{exercise.name}</span>
                            </div>
                            <span className="text-sm text-white/60">{exercise.sets.length} 组</span>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {exercise.sets.map((set, setIdx) => (
                                <span key={setIdx} className="text-xs text-white/60">
                                    {set.reps}×{set.weight}kg
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 照片 */}
            {workout.photos.length > 0 && (
                <div className="mb-4">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {workout.photos.map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo}
                                alt={`训练照片 ${idx + 1}`}
                                className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 备注 */}
            {workout.notes && (
                <div className="bg-white/5 rounded-lg p-3 mb-2">
                    <div className="text-xs text-white/60 mb-1">训练感受</div>
                    <div className="text-sm">{workout.notes}</div>
                </div>
            )}

            {/* 教练反馈 */}
            {workout.coachFeedback && (
                <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-lg p-3 border border-pink-500/20">
                    <div className="text-xs text-pink-300 mb-1">💪 教练反馈</div>
                    <div className="text-sm">{workout.coachFeedback}</div>
                </div>
            )}
        </div>
    );
}
