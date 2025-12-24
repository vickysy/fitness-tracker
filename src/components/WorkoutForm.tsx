import { useState, useEffect } from 'react';
import type { WorkoutSession, Exercise, ExerciseSet, BodyPart } from '../types';
import { BODY_PARTS, COMMON_EXERCISES } from '../types';
import { Plus, Trash2, Camera, X, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutFormProps {
    workout: WorkoutSession | null;
    onSave: (workout: WorkoutSession) => void;
    onCancel: () => void;
}

export default function WorkoutForm({ workout, onSave, onCancel }: WorkoutFormProps) {
    const [date, setDate] = useState(workout ? new Date(workout.date) : new Date());
    const [duration, setDuration] = useState(workout ? workout.duration : 60);
    const [exercises, setExercises] = useState<Exercise[]>(workout ? workout.exercises : []);
    const [photos, setPhotos] = useState<string[]>(workout ? workout.photos : []);
    const [notes, setNotes] = useState(workout ? workout.notes : '');
    const [coachFeedback, setCoachFeedback] = useState(workout ? workout.coachFeedback || '' : '');
    const [startTime] = useState<Date | null>(workout ? null : new Date());
    const [manualDuration, setManualDuration] = useState(!!workout); // 编辑模式不自动计时
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // 自动计算训练时长(仅在未手动编辑时)
        if (startTime && !workout && !manualDuration) {
            const interval = setInterval(() => {
                const now = new Date();
                const minutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
                setDuration(minutes);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [startTime, workout, manualDuration]);

    const handleDurationChange = (value: number) => {
        setDuration(value);
        setManualDuration(true); // 标记为手动编辑
    };

    const handleAddExercise = () => {
        const newExercise: Exercise = {
            id: uuidv4(),
            name: '',
            bodyPart: '胸',
            sets: []
        };
        setExercises([...exercises, newExercise]);
    };

    const handleUpdateExercise = (index: number, field: keyof Exercise, value: string | BodyPart | ExerciseSet[]) => {
        const updated = [...exercises];
        updated[index] = { ...updated[index], [field]: value };
        setExercises(updated);
    };

    const handleRemoveExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const handleAddSet = (exerciseIndex: number) => {
        const updated = [...exercises];
        const newSet: ExerciseSet = {
            setNumber: updated[exerciseIndex].sets.length + 1,
            reps: 10,
            weight: 0
        };
        updated[exerciseIndex].sets.push(newSet);
        setExercises(updated);
    };

    // 快速批量添加组数
    const handleQuickAddSets = (exerciseIndex: number, totalSets: number, reps: number, weight: number) => {
        const updated = [...exercises];
        const sets: ExerciseSet[] = [];

        for (let i = 0; i < totalSets; i++) {
            sets.push({
                setNumber: i + 1,
                reps,
                weight
            });
        }

        updated[exerciseIndex].sets = sets;
        setExercises(updated);
    };

    const handleUpdateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: number) => {
        const updated = [...exercises];
        updated[exerciseIndex].sets[setIndex] = {
            ...updated[exerciseIndex].sets[setIndex],
            [field]: value
        };
        setExercises(updated);
    };

    const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
        const updated = [...exercises];
        updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
        // 重新编号
        updated[exerciseIndex].sets.forEach((set, i) => {
            set.setNumber = i + 1;
        });
        setExercises(updated);
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('无法创建canvas'));
                        return;
                    }

                    // 压缩到最大800px宽度
                    const maxWidth = 800;
                    const scale = Math.min(1, maxWidth / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // 压缩质量0.7
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedDataUrl);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        try {
            const compressedPhotos = await Promise.all(
                Array.from(files).map(file => compressImage(file))
            );
            setPhotos(prev => [...prev, ...compressedPhotos]);
        } catch (error) {
            console.error('图片压缩失败:', error);
            alert('图片上传失败,请重试');
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (isSaving) return;
        console.log('开始保存训练...', { exercises, duration });

        if (exercises.length === 0) {
            alert('请至少添加一个训练动作');
            return;
        }

        // 验证每个动作是否有名称和组数
        for (let i = 0; i < exercises.length; i++) {
            if (!exercises[i].name || !exercises[i].name.trim()) {
                alert(`请为第${i + 1}个动作输入名称`);
                return;
            }
            if (exercises[i].sets.length === 0) {
                alert(`请为「${exercises[i].name}」添加至少一组`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const workoutData: WorkoutSession = {
                id: workout?.id || uuidv4(),
                date,
                duration,
                exercises,
                photos,
                notes,
                coachFeedback,
                createdAt: workout?.createdAt || new Date(),
                updatedAt: new Date()
            };

            console.log('准备保存数据:', workoutData);
            await onSave(workoutData);
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in pb-8">
            {/* 基本信息 */}
            <div className="glass-card p-6 space-y-4">
                <h2 className="text-lg font-bold mb-2">基本信息</h2>

                <div>
                    <label className="block text-sm font-medium mb-2">训练日期</label>
                    <input
                        type="date"
                        value={date.toISOString().split('T')[0]}
                        onChange={(e) => setDate(new Date(e.target.value))}
                        className="input-field w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">训练时长(分钟)</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                        className="input-field w-full"
                        min="0"
                    />
                </div>
            </div>

            {/* 训练动作 */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">训练动作</h2>
                    <button onClick={handleAddExercise} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
                        <Plus className="w-4 h-4" />
                        添加动作
                    </button>
                </div>

                <div className="space-y-3">
                    {exercises.map((exercise, exerciseIndex) => (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            exerciseIndex={exerciseIndex}
                            onUpdate={handleUpdateExercise}
                            onRemove={handleRemoveExercise}
                            onAddSet={handleAddSet}
                            onQuickAddSets={handleQuickAddSets}
                            onUpdateSet={handleUpdateSet}
                            onRemoveSet={handleRemoveSet}
                        />
                    ))}

                    {exercises.length === 0 && (
                        <div className="text-center py-6 text-white/60">
                            点击"添加动作"开始记录训练
                        </div>
                    )}

                    {/* 底部添加动作按钮 - 方便连续添加 */}
                    {exercises.length > 0 && (
                        <button
                            onClick={handleAddExercise}
                            className="w-full py-3 border-2 border-dashed border-orange-500/30 rounded-xl text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            添加下一个动作
                        </button>
                    )}
                </div>
            </div>

            {/* 训练照片 */}
            <div className="glass-card p-4">
                <h2 className="text-lg font-bold mb-3">训练照片</h2>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                            <img
                                src={photo}
                                alt={`训练照片 ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-2 right-2 bg-red-500 p-1 rounded-full hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <label className="aspect-square border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all">
                        <Camera className="w-8 h-8 text-white/60 mb-2" />
                        <span className="text-xs text-white/60">添加照片</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* 备注 */}
            <div className="glass-card p-4 space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-2">训练感受</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="记录今天的训练感受..."
                        className="input-field w-full h-20 resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">教练反馈(可选)</label>
                    <textarea
                        value={coachFeedback}
                        onChange={(e) => setCoachFeedback(e.target.value)}
                        placeholder="教练的建议和反馈..."
                        className="input-field w-full h-20 resize-none"
                    />
                </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
                >
                    取消
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/50 hover:from-orange-500 hover:to-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSaving ? '正在保存...' : (workout ? '更新训练' : '完成训练')}
                </button>
            </div>
        </div>
    );
}

interface ExerciseCardProps {
    exercise: Exercise;
    exerciseIndex: number;
    onUpdate: (index: number, field: keyof Exercise, value: string | BodyPart | ExerciseSet[]) => void;
    onRemove: (index: number) => void;
    onAddSet: (index: number) => void;
    onQuickAddSets: (exerciseIndex: number, totalSets: number, reps: number, weight: number) => void;
    onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: number) => void;
    onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
}

function ExerciseCard({
    exercise,
    exerciseIndex,
    onUpdate,
    onRemove,
    onAddSet,
    onQuickAddSets,
    onUpdateSet,
    onRemoveSet
}: ExerciseCardProps) {
    const [showExerciseList, setShowExerciseList] = useState(false);
    const [quickMode, setQuickMode] = useState(exercise.sets.length === 0); // 只在没有组数时使用快速模式
    const [quickSets, setQuickSets] = useState(3);
    const [quickReps, setQuickReps] = useState(10);
    const [quickWeight, setQuickWeight] = useState(0);

    const handleQuickGenerate = () => {
        if (quickSets > 0) {
            onQuickAddSets(exerciseIndex, quickSets, quickReps, quickWeight);
            setQuickMode(false); // 生成后切换到详细模式
        }
    };

    return (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                        <select
                            value={exercise.bodyPart}
                            onChange={(e) => onUpdate(exerciseIndex, 'bodyPart', e.target.value as BodyPart)}
                            className="input-field flex-1"
                        >
                            {BODY_PARTS.map(part => (
                                <option key={part} value={part}>{part}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => onRemove(exerciseIndex)}
                            className="bg-red-500/20 hover:bg-red-500/30 p-3 rounded-xl text-red-400"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => onUpdate(exerciseIndex, 'name', e.target.value)}
                            onFocus={() => setShowExerciseList(true)}
                            placeholder="输入动作名称"
                            className="input-field w-full"
                        />

                        {showExerciseList && COMMON_EXERCISES[exercise.bodyPart].length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/20 rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                                {COMMON_EXERCISES[exercise.bodyPart].map(name => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            onUpdate(exerciseIndex, 'name', name);
                                            setShowExerciseList(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 组数记录 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">组数记录</span>
                    {exercise.sets.length > 0 && (
                        <button
                            onClick={() => setQuickMode(!quickMode)}
                            className="text-xs text-orange-400 hover:text-orange-300"
                        >
                            {quickMode ? '切换到详细模式' : '切换到快速模式'}
                        </button>
                    )}
                </div>

                {quickMode && exercise.sets.length === 0 ? (
                    // 快速输入模式
                    <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
                        <div className="text-sm text-gray-400 mb-2">快速输入</div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">总组数</label>
                                <input
                                    type="number"
                                    value={quickSets}
                                    onChange={(e) => setQuickSets(parseInt(e.target.value) || 1)}
                                    className="input-field w-full text-sm py-2"
                                    min="1"
                                    max="20"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">每组次数</label>
                                <input
                                    type="number"
                                    value={quickReps}
                                    onChange={(e) => setQuickReps(parseInt(e.target.value) || 1)}
                                    className="input-field w-full text-sm py-2"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">重量(kg)</label>
                                <input
                                    type="number"
                                    value={quickWeight}
                                    onChange={(e) => setQuickWeight(parseFloat(e.target.value) || 0)}
                                    className="input-field w-full text-sm py-2"
                                    min="0"
                                    step="0.5"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleQuickGenerate}
                            className="btn-primary w-full text-sm py-2"
                        >
                            生成 {quickSets} 组
                        </button>
                    </div>
                ) : (
                    // 详细模式 - 显示所有组
                    <>
                        {exercise.sets.map((set, setIndex) => (
                            <div key={setIndex} className="flex items-center gap-2">
                                <span className="text-sm text-white/60 w-12">第{set.setNumber}组</span>
                                <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                                    placeholder="次数"
                                    className="input-field flex-1 text-sm py-2"
                                    min="0"
                                />
                                <span className="text-sm text-white/60">次</span>
                                <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                                    placeholder="重量"
                                    className="input-field flex-1 text-sm py-2"
                                    min="0"
                                    step="0.5"
                                />
                                <span className="text-sm text-white/60">kg</span>
                                <button
                                    onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                                    className="text-red-400 hover:text-red-300 p-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {exercise.sets.length === 0 && (
                            <div className="text-center py-4 text-sm text-white/40">
                                点击"添加组"开始记录
                            </div>
                        )}

                        <button
                            onClick={() => onAddSet(exerciseIndex)}
                            className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 w-full justify-center py-2 border border-orange-500/30 rounded-lg hover:bg-orange-500/10"
                        >
                            <Plus className="w-4 h-4" />
                            添加一组
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
