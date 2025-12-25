import type { WorkoutSession } from '../types';
import { supabase } from './supabase';

const SYNC_CODE_KEY = 'fitness_sync_code';

export const storage = {
    getSyncCode(): string | null {
        return localStorage.getItem(SYNC_CODE_KEY);
    },

    setSyncCode(code: string | null): void {
        if (code) {
            localStorage.setItem(SYNC_CODE_KEY, code);
        } else {
            localStorage.removeItem(SYNC_CODE_KEY);
        }
    },

    async getAllWorkouts(): Promise<WorkoutSession[]> {
        const syncCode = this.getSyncCode();
        if (!syncCode || !supabase) return [];

        try {
            const { data, error } = await supabase
                .from('workouts')
                .select('*')
                .eq('sync_code', syncCode)
                .order('date', { ascending: false });

            if (error) throw error;

            return data ? data.map(item => ({
                ...item.data,
                id: item.id,
                date: new Date(item.date),
                createdAt: new Date(item.created_at),
                updatedAt: new Date(item.updated_at),
            })) : [];
        } catch (error) {
            console.error('获取数据失败:', error);
            return [];
        }
    },

    async saveWorkout(workout: WorkoutSession): Promise<void> {
        const syncCode = this.getSyncCode();
        if (!syncCode || !supabase) {
            throw new Error('请先设置同步口令');
        }

        try {
            const { error } = await supabase
                .from('workouts')
                .upsert({
                    id: workout.id,
                    sync_code: syncCode,
                    date: workout.date.toISOString(),
                    data: workout,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('保存失败:', error);
            throw error;
        }
    },

    async deleteWorkout(id: string): Promise<void> {
        const syncCode = this.getSyncCode();
        if (!syncCode || !supabase) return;

        try {
            const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id)
                .eq('sync_code', syncCode);

            if (error) throw error;
        } catch (error) {
            console.error('删除失败:', error);
            throw error;
        }
    }
};
