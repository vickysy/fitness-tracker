import { useState } from 'react';
import type { WorkoutSession } from '../types';
import { reportGenerator } from '../utils/reportGenerator';
import { format, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';

interface MonthlyReportViewProps {
    workouts: WorkoutSession[];
}

export default function MonthlyReportView({ workouts }: MonthlyReportViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const report = reportGenerator.generateMonthlyReport(workouts, currentDate);

    const handlePreviousMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const handleExport = async () => {
        if (isExporting) return;

        const element = document.getElementById('monthly-report');
        if (!element) {
            alert('找不到报告元素');
            return;
        }

        setIsExporting(true);

        try {
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: element.offsetWidth || 800,
                height: element.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('monthly-report');
                    const exportHeader = clonedDoc.getElementById('export-header-month');
                    
                    if (exportHeader) {
                        exportHeader.classList.remove('hidden');
                        exportHeader.style.display = 'block';
                    }

                    if (clonedElement) {
                        clonedElement.style.padding = '40px';
                        clonedElement.style.width = '800px'; 
                        clonedElement.style.background = '#0f172a';

                        const glassCards = clonedElement.getElementsByClassName('glass-card');
                        for (let i = 0; i < glassCards.length; i++) {
                            const card = glassCards[i] as HTMLElement;
                            card.style.backdropFilter = 'none';
                            card.style.setProperty('-webkit-backdrop-filter', 'none');
                            card.style.background = '#1e293b';
                            card.style.border = '1px solid rgba(255,255,255,0.1)';
                        }

                        const chartContainers = clonedElement.querySelectorAll('.recharts-responsive-container');
                        chartContainers.forEach(container => {
                            (container as HTMLElement).style.width = '720px';
                            (container as HTMLElement).style.height = '300px';
                        });
                    }
                }
            });

            const dataUrl = canvas.toDataURL('image/png', 0.9);
            const link = document.createElement('a');
            link.download = `月报_${format(report.month, 'yyyy-MM')}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败(代码102): ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    // 准备图表数据
    const bodyPartData = Object.entries(report.bodyPartDistribution)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 头部导航 */}
            <div className="glass-card p-4 flex items-center justify-between">
                <button onClick={handlePreviousMonth} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="text-center">
                    <div className="text-lg font-bold">
                        {format(report.month, 'yyyy年 MM月', { locale: zhCN })}
                    </div>
                    <div className="text-sm text-white/60">月度训练报告</div>
                </div>

                <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* 报告内容 */}
            <div id="monthly-report" className="space-y-6">
                {/* 导出时的标题和日期 - 默认隐藏 */}
                <div id="export-header-month" className="hidden text-center space-y-2 mb-8 border-b border-white/10 pb-6">
                    <h2 className="text-3xl font-black tracking-widest text-orange-400">
                        健身记录
                    </h2>
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-xl font-bold text-white/90">
                            {format(report.month, 'yyyy年MM月', { locale: zhCN })}月报
                        </div>
                    </div>
                </div>

                {/* 概览统计 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass-card p-4 sm:p-6">
                        <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2">总训练次数</div>
                        <div className="text-2xl sm:text-4xl font-bold text-white">
                            {report.totalSessions}
                            <span className="text-sm sm:text-lg ml-1 sm:ml-2">次</span>
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-pink-400 to-violet-400 rounded-full mt-2"></div>
                    </div>
                    <div className="glass-card p-4 sm:p-6">
                        <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2">总训练时长</div>
                        <div className="text-2xl sm:text-4xl font-bold text-white">
                            {report.totalDuration}
                            <span className="text-sm sm:text-lg ml-1 sm:ml-2">分钟</span>
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mt-2"></div>
                    </div>
                </div>

                {/* 每周训练趋势 */}
                {report.weeklyProgress.some(w => w.sessions > 0) && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">📊 每周训练趋势</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={report.weeklyProgress}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="week"
                                    stroke="rgba(255,255,255,0.6)"
                                    tickFormatter={(value) => `第${value}周`}
                                />
                                <YAxis stroke="rgba(255,255,255,0.6)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="sessions" name="训练次数" fill="#ec4899" />
                                <Bar dataKey="duration" name="训练时长(分钟)" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* 训练量进步曲线 */}
                {report.progressCurve.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">📈 训练量进步曲线</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={report.progressCurve}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.6)"
                                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                                />
                                <YAxis stroke="rgba(255,255,255,0.6)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={(value) => format(new Date(value), 'MM月dd日')}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalVolume"
                                    name="总训练量(kg)"
                                    stroke="#ec4899"
                                    strokeWidth={3}
                                    dot={{ fill: '#ec4899', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* 身体部位分布 */}
                {bodyPartData.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">💪 训练部位分布</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={bodyPartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {bodyPartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* 最常练习的动作 */}
                {report.topExercises.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-400" />
                            本月TOP5动作
                        </h3>
                        <div className="space-y-3">
                            {report.topExercises.map((exercise, idx) => (
                                <div key={idx} className="bg-white/5 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`text-2xl font-bold ${idx === 0 ? 'text-yellow-400' :
                                                idx === 1 ? 'text-gray-300' :
                                                    idx === 2 ? 'text-orange-400' :
                                                        'text-white/60'
                                                }`}>
                                                #{idx + 1}
                                            </div>
                                            <span className="font-medium">{exercise.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-white/60 ml-12">
                                        <span>总组数: {exercise.totalSets}</span>
                                        <span>最大重量: {exercise.maxWeight}kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 前后对比照片 */}
                {report.beforeAfterPhotos.before && report.beforeAfterPhotos.after && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">🔥 本月身体变化</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-white/60 mb-2 text-center">月初</div>
                                <img
                                    src={report.beforeAfterPhotos.before}
                                    alt="月初照片"
                                    className="w-full h-auto object-contain rounded-lg bg-black/20"
                                />
                            </div>
                            <div>
                                <div className="text-sm text-white/60 mb-2 text-center">月末</div>
                                <img
                                    src={report.beforeAfterPhotos.after}
                                    alt="月末照片"
                                    className="w-full h-auto object-contain rounded-lg bg-black/20"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 空状态 */}
                {report.totalSessions === 0 && (
                    <div className="glass-card p-12 text-center">
                        <p className="text-white/60 text-lg">本月还没有训练记录</p>
                        <p className="text-sm text-white/40 mt-2">开始训练吧!</p>
                    </div>
                )}

                {/* 月度总结 */}
                {report.totalSessions > 0 && (
                    <div className="glass-card p-6 bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                        <h3 className="text-lg font-bold mb-3">🎉 月度成就</h3>
                        <div className="space-y-2 text-sm">
                            <p>✨ 本月共完成 <span className="font-bold text-pink-400">{report.totalSessions}</span> 次训练</p>
                            <p>⏱️ 累计训练时长 <span className="font-bold text-violet-400">{report.totalDuration}</span> 分钟</p>
                            {report.topExercises[0] && (
                                <p>💪 最常练习的动作是 <span className="font-bold text-blue-400">{report.topExercises[0].name}</span></p>
                            )}
                            <p className="mt-4 text-white/80">坚持就是胜利,继续加油! 💪</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 导出按钮 */}
            {report.totalSessions > 0 && (
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`btn-primary w-full flex items-center justify-center gap-2 transition-opacity ${
                        isExporting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                    <span>{isExporting ? '正在导出...' : '导出为图片'}</span>
                </button>
            )}
        </div>
    );
}
