import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let db: Database | null = null;
const DB_NAME = 'FitnessSQLiteDB';
const STORE_NAME = 'sqlite_file';

// 初始化 SQLite 数据库
export const initSQLite = async (): Promise<Database> => {
    if (db) return db;

    try {
        const SQL = await initSqlJs({
            locateFile: file => {
                // Safari 兼容：确保正确的 WASM 路径
                if (import.meta.env.DEV) {
                    return `/${file}`;
                }
                // 生产环境：从根目录加载
                return `${import.meta.env.BASE_URL}${file}`;
            }
        });

        // 从 IndexedDB 加载数据库文件
        const savedDb = await loadFromIndexedDB();

        if (savedDb) {
            db = new SQL.Database(new Uint8Array(savedDb));
        } else {
            db = new SQL.Database();
            // 创建初始表结构
            createTables(db);
            await saveToIndexedDB(db.export());
        }

        return db;
    } catch (error) {
        console.error('SQLite 初始化失败:', error);
        // Safari 降级方案：创建内存数据库
        const SQL = await initSqlJs();
        db = new SQL.Database();
        createTables(db);
        return db;
    }
};

// 创建表结构
const createTables = (database: Database) => {
    database.run(`
        CREATE TABLE IF NOT EXISTS workouts (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
};

// 从 IndexedDB 加载
const loadFromIndexedDB = (): Promise<ArrayBuffer | null> => {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                resolve(null);
                return;
            }
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get('db');
            getRequest.onsuccess = () => resolve(getRequest.result || null);
            getRequest.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
    });
};

// 保存到 IndexedDB
export const saveToIndexedDB = async (data: Uint8Array): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const putRequest = store.put(data, 'db');
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
};

// 执行查询
export const executeQuery = async <T>(query: string, params: any[] = []): Promise<T[]> => {
    const database = await initSQLite();
    const stmt = database.prepare(query);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
};

// 执行修改
export const executeRun = async (query: string, params: any[] = []): Promise<void> => {
    try {
        const database = await initSQLite();
        database.run(query, params);
        await saveToIndexedDB(database.export());
    } catch (error) {
        console.error('SQLite executeRun 失败:', error);
        throw error;
    }
};
