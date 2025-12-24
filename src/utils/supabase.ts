import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 只有在配置存在且有效时才初始化
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
