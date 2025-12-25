import type { WorkoutSession } from '../types';
import { supabase } from './supabase';
import { executeQuery, executeRun } from './sqlite';

const DB_NAME = 'FitnessTrackerDB';
const STORE_NAME = 'workouts';
const DB_VERSION = 1;
const SYNC_CODE_KEY = 'fitness_sync_code';

// 初始化旧的 IndexedDB (仅用于迁移)
const initOldDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const storage = {
    // 获取同步口令
    getSyncCode(): string | null {
        return localStorage.getItem(SYNC_CODE_KEY);
    },

    // 设置同步口令
    setSyncCode(code: string | null): void {
        if (code) {
            localStorage.setItem(SYNC_CODE_KEY, code);
        } else {
            localStorage.removeItem(SYNC_CODE_KEY);
        }
    },

    // 获取所有训练记录
    async getAllWorkouts(): Promise<WorkoutSession[]> {
        const syncCode = this.getSyncCode();

        // 如果有同步口令且 Supabase 已配置，优先尝试从云端获取
        if (syncCode && supabase) {
            try {
                const { data, error } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('sync_code', syncCode)
                    .order('date', { ascending: false });

                if (error) throw error;

                if (data) {
                    const workouts = data.map(item => ({
                        ...item.data,
                        id: item.id,
                        date: new Date(item.date),
                        createdAt: new Date(item.created_at),
                        updatedAt: new Date(item.updated_at),
                    }));

                    // 同时同步到本地 SQLite
                    for (const w of workouts) {
                        await executeRun(
                            'INSERT OR REPLACE INTO workouts (id, date, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                            [w.id, w.date.toISOString(), JSON.stringify(w), w.createdAt.toISOString(), w.updatedAt.toISOString()]
                        );
                    }

                    return workouts;
                }
            } catch (error) {
                console.error('从云端获取数据失败，切换到本地数据:', error);
            }
        }

        // 本地 SQLite 获取
        try {
            const rows = await executeQuery<{ data: string }>('SELECT data FROM workouts ORDER BY date DESC');
            return rows.map(row => {
                const w = JSON.parse(row.data);
                return {
                    ...w,
                    date: new Date(w.date),
                    createdAt: new Date(w.createdAt),
                    updatedAt: new Date(w.updatedAt),
                };
            });
        } catch (error) {
            console.error('从 SQLite 获取数据失败:', error);
            return [];
        }
    },

    // 保存训练记录
    async saveWorkout(workout: WorkoutSession): Promise<void> {
        try {
            // 先保存到本地 SQLite
            await executeRun(
                'INSERT OR REPLACE INTO workouts (id, date, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [
                    workout.id,
                    workout.date.toISOString(),
                    JSON.stringify(workout),
                    workout.createdAt.toISOString(),
                    workout.updatedAt.toISOString()
                ]
            );

            // 如果有同步口令且已配置，同步到云端
            const syncCode = this.getSyncCode();
            if (syncCode && supabase) {
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
                    console.error('同步到云端失败:', error);
                }
            }
        } catch (error) {
            console.error('保存训练记录失败:', error);
            throw error;
        }
    },

    // 删除训练记录
    async deleteWorkout(id: string): Promise<void> {
        // 本地 SQLite 删除
        await executeRun('DELETE FROM workouts WHERE id = ?', [id]);

        // 云端删除
        const syncCode = this.getSyncCode();
        if (syncCode && supabase) {
            try {
                const { error } = await supabase
                    .from('workouts')
                    .delete()
                    .eq('id', id)
                    .eq('sync_code', syncCode);

                if (error) throw error;
            } catch (error) {
                console.error('云端删除失败:', error);
            }
        }
    },

    // 获取单个训练记录
    async getWorkout(id: string): Promise<WorkoutSession | undefined> {
        try {
            const rows = await executeQuery<{ data: string }>('SELECT data FROM workouts WHERE id = ?', [id]);
            if (rows.length === 0) return undefined;
            const w = JSON.parse(rows[0].data);
            return {
                ...w,
                date: new Date(w.date),
                createdAt: new Date(w.createdAt),
                updatedAt: new Date(w.updatedAt),
            };
        } catch (error) {
            console.error('从 SQLite 获取单个记录失败:', error);
            return undefined;
        }
    },

    // 清空所有数据
    async clearAll(): Promise<void> {
        await executeRun('DELETE FROM workouts');
    },

    // 迁移数据从旧的 IndexedDB 到 SQLite
    async migrateToSQLite(): Promise<void> {
        try {
            const oldDb = await initOldDB();
            const transaction = oldDb.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = async () => {
                const workouts = request.result as WorkoutSession[];
                if (workouts.length > 0) {
                    console.log(`正在迁移 ${workouts.length} 条数据到 SQLite...`);
                    for (const w of workouts) {
                        await this.saveWorkout({
                            ...w,
                            date: new Date(w.date),
                            createdAt: new Date(w.createdAt),
                            updatedAt: new Date(w.updatedAt),
                        });
                    }
                    console.log('数据迁移到 SQLite 完成');
                }
            };
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }
};

