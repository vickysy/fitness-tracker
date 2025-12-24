import type { WorkoutSession, WeeklyReport, MonthlyReport, BodyPart } from '../types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const reportGenerator = {
    // 生成周报
    generateWeeklyReport(workouts: WorkoutSession[], date: Date): WeeklyReport {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // 周一开始
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

        const weekWorkouts = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= weekStart && workoutDate <= weekEnd;
        });

        // 计算身体部位分布
        const bodyPartDistribution: Record<BodyPart, number> = {
            '胸': 0, '背': 0, '腿': 0, '肩': 0, '手臂': 0, '臀': 0, '核心': 0, '有氧': 0, '拉伸': 0, '其他': 0
        };

        let totalSets = 0;
        weekWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                bodyPartDistribution[exercise.bodyPart] += exercise.sets.length;
                totalSets += exercise.sets.length;
            });
        });

        // 收集所有照片
        const photos = weekWorkouts.flatMap(w => w.photos);

        // 计算进步对比(与上周对比)
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        const previousWeekEnd = new Date(weekEnd);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

        const previousWeekWorkouts = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= previousWeekStart && workoutDate <= previousWeekEnd;
        });

        const progressComparison = this.calculateProgressComparison(previousWeekWorkouts, weekWorkouts);

        return {
            weekStart,
            weekEnd,
            totalSessions: weekWorkouts.length,
            totalDuration: weekWorkouts.reduce((sum, w) => sum + w.duration, 0),
            totalSets,
            bodyPartDistribution,
            progressComparison,
            photos
        };
    },

    // 生成月报
    generateMonthlyReport(workouts: WorkoutSession[], date: Date): MonthlyReport {
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const monthWorkouts = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= monthStart && workoutDate <= monthEnd;
        });

        // 按周统计
        const weeklyProgress: { week: number; sessions: number; duration: number }[] = [];
        for (let week = 1; week <= 5; week++) {
            const weekWorkouts = monthWorkouts.filter(w => {
                const workoutDate = new Date(w.date);
                const weekOfMonth = Math.ceil(workoutDate.getDate() / 7);
                return weekOfMonth === week;
            });

            weeklyProgress.push({
                week,
                sessions: weekWorkouts.length,
                duration: weekWorkouts.reduce((sum, w) => sum + w.duration, 0)
            });
        }

        // 身体部位分布
        const bodyPartDistribution: Record<BodyPart, number> = {
            '胸': 0, '背': 0, '腿': 0, '肩': 0, '手臂': 0, '臀': 0, '核心': 0, '有氧': 0, '拉伸': 0, '其他': 0
        };

        monthWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                bodyPartDistribution[exercise.bodyPart] += exercise.sets.length;
            });
        });

        // 统计最常练的动作
        const exerciseStats: Record<string, { totalSets: number; maxWeight: number }> = {};
        monthWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                if (!exerciseStats[exercise.name]) {
                    exerciseStats[exercise.name] = { totalSets: 0, maxWeight: 0 };
                }
                exerciseStats[exercise.name].totalSets += exercise.sets.length;
                const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
                exerciseStats[exercise.name].maxWeight = Math.max(
                    exerciseStats[exercise.name].maxWeight,
                    maxWeight
                );
            });
        });

        const topExercises = Object.entries(exerciseStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.totalSets - a.totalSets)
            .slice(0, 5);

        // 进步曲线(总训练量)
        const progressCurve = monthWorkouts.map(workout => ({
            date: new Date(workout.date),
            totalVolume: workout.exercises.reduce((sum, ex) =>
                sum + ex.sets.reduce((setSum, set) => setSum + set.reps * set.weight, 0), 0
            )
        }));

        // 前后对比照片
        const allPhotos = monthWorkouts.flatMap(w => w.photos);
        const beforeAfterPhotos = {
            before: allPhotos[0] || '',
            after: allPhotos[allPhotos.length - 1] || ''
        };

        return {
            month: monthStart,
            totalSessions: monthWorkouts.length,
            totalDuration: monthWorkouts.reduce((sum, w) => sum + w.duration, 0),
            weeklyProgress,
            bodyPartDistribution,
            topExercises,
            progressCurve,
            beforeAfterPhotos
        };
    },

    // 计算进步对比
    calculateProgressComparison(
        previousWorkouts: WorkoutSession[],
        currentWorkouts: WorkoutSession[]
    ) {
        const exerciseMaxWeights: Record<string, { previous: number; current: number }> = {};

        // 统计上周最大重量
        previousWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                const maxWeight = Math.max(...exercise.sets.map(s => s.weight), 0);
                if (!exerciseMaxWeights[exercise.name]) {
                    exerciseMaxWeights[exercise.name] = { previous: 0, current: 0 };
                }
                exerciseMaxWeights[exercise.name].previous = Math.max(
                    exerciseMaxWeights[exercise.name].previous,
                    maxWeight
                );
            });
        });

        // 统计本周最大重量
        currentWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                const maxWeight = Math.max(...exercise.sets.map(s => s.weight), 0);
                if (!exerciseMaxWeights[exercise.name]) {
                    exerciseMaxWeights[exercise.name] = { previous: 0, current: 0 };
                }
                exerciseMaxWeights[exercise.name].current = Math.max(
                    exerciseMaxWeights[exercise.name].current,
                    maxWeight
                );
            });
        });

        return Object.entries(exerciseMaxWeights)
            .filter(([, weights]) => weights.current > 0)
            .map(([exerciseName, weights]) => ({
                exerciseName,
                previousWeekMax: weights.previous,
                currentWeekMax: weights.current,
                improvement: weights.previous > 0
                    ? ((weights.current - weights.previous) / weights.previous) * 100
                    : 0
            }))
            .sort((a, b) => b.improvement - a.improvement);
    }
};
