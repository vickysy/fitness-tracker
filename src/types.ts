// 训练记录类型定义

export interface Exercise {
    id: string;
    name: string;
    bodyPart: BodyPart;
    sets: ExerciseSet[];
}

export interface ExerciseSet {
    setNumber: number;
    reps: number;
    weight: number; // kg
}

export type BodyPart = '胸' | '背' | '腿' | '肩' | '手臂' | '臀' | '核心' | '有氧' | '拉伸' | '其他';

export interface WorkoutSession {
    id: string;
    date: Date;
    duration: number; // 分钟
    exercises: Exercise[];
    photos: string[]; // base64 或 URL
    notes: string;
    coachFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WeeklyReport {
    weekStart: Date;
    weekEnd: Date;
    totalSessions: number;
    totalDuration: number;
    totalSets: number;
    bodyPartDistribution: Record<BodyPart, number>;
    progressComparison: {
        exerciseName: string;
        previousWeekMax: number;
        currentWeekMax: number;
        improvement: number;
    }[];
    photos: string[];
}

export interface MonthlyReport {
    month: Date;
    totalSessions: number;
    totalDuration: number;
    weeklyProgress: {
        week: number;
        sessions: number;
        duration: number;
    }[];
    bodyPartDistribution: Record<BodyPart, number>;
    topExercises: {
        name: string;
        totalSets: number;
        maxWeight: number;
    }[];
    progressCurve: {
        date: Date;
        totalVolume: number;
    }[];
    beforeAfterPhotos: {
        before: string;
        after: string;
    };
}

export const BODY_PARTS: BodyPart[] = ['胸', '背', '腿', '肩', '手臂', '臀', '核心', '有氧', '拉伸', '其他'];

export const COMMON_EXERCISES: Record<BodyPart, string[]> = {
    '胸': [
        '杠铃卧推', '哑铃卧推', '上斜卧推', '下斜卧推',
        '飞鸟', '龙门架夹胸', '俯卧撑', '钻石俯卧撑',
        '器械推胸', '史密斯卧推'
    ],
    '背': [
        '引体向上', '杠铃划船', '哑铃划船', '坐姿划船',
        '高位下拉', '直臂下压', '硬拉', '山羊挺身',
        '反向飞鸟', 'T杠划船', '单臂哑铃划船'
    ],
    '腿': [
        '深蹲', '腿举', '腿屈伸', '腿弯举',
        '箭步蹲', '保加利亚深蹲', '史密斯深蹲', '哈克深蹲',
        '腿部推蹬', '坐姿腿屈伸', '俯卧腿弯举', '站姿提踵',
        '坐姿提踵'
    ],
    '肩': [
        '直臂下压', '反向飞鸟', '侧平举', '坐姿推肩', '站姿推肩', '面拉',
        '杠铃推举', '哑铃推举', '阿诺德推举', '前平举',
        '直立划船', '耸肩', '绳索侧平举', '器械推肩'
    ],
    '手臂': [
        '杠铃弯举', '哑铃弯举', '锤式弯举', '集中弯举',
        '绳索弯举', '三头下压', '臂屈伸', '窄距卧推',
        '过顶臂屈伸', '单臂哑铃臂屈伸', '反向弯举'
    ],
    '臀': [
        '臀桥', '单腿臀桥', '臀推', '蜂式开合',
        '驴踢', '侧卧抬腿', '深蹲', '保加利亚深蹲',
        '罗马尼亚硬拉', '相扑深蹲', '弹力带臀推',
        '哑铃深蹲', '哑铃硬拉', '单腿哑铃硬拉', '犀牛机腰带深蹲'
    ],
    '核心': [
        '卷腹', '平板支撑', '侧平板支撑', '俄罗斯转体',
        '悬垂举腿', '侧卷腹', '仰卧起坐', '反向卷腹',
        '登山跑', '死虫', '鸟狗式', '腹肌轮'
    ],
    '有氧': [
        '跑步', '椭圆机', '动感单车', '划船机',
        '跳绳', '爬楼梯', '游泳', 'HIIT',
        '波比跳', '开合跳', '高抬腿', '战绳'
    ],
    '拉伸': [
        '全身拉伸', '腿部拉伸', '肩部拉伸', '背部拉伸',
        '胸部拉伸', '臀部拉伸', '泡沫轴放松', '瑜伽',
        '动态拉伸', '静态拉伸'
    ],
    '其他': ['热身', '放松', '体能训练', '功能性训练']
};
