import { useState } from 'react';
import type { WorkoutSession } from '../types';
import { reportGenerator } from '../utils/reportGenerator';
import { format, addWeeks, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from 'lucide-react';
import html2canvas from 'html2canvas';

interface WeeklyReportViewProps {
    workouts: WorkoutSession[];
}

export default function WeeklyReportView({ workouts }: WeeklyReportViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const report = reportGenerator.generateWeeklyReport(workouts, currentDate);

    const handlePreviousWeek = () => {
        setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(addWeeks(currentDate, 1));
    };

    const handleExport = async () => {
        if (isExporting) return;

        const element = document.getElementById('weekly-report');
        if (!element) {
            alert('找不到报告元素');
            return;
        }

        setIsExporting(true);

        try {
            // 确保元素在视口内并渲染完成
            element.scrollIntoView({ block: 'start' });
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a', // 使用更接近背景的颜色 (slate-900)
                scale: 2, // 固定倍率，避免过大导致手机内存溢出
                useCORS: true,
                allowTaint: true,
                logging: true,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('weekly-report');
                    const exportHeader = clonedDoc.getElementById('export-header');
                    
                    if (exportHeader) {
                        exportHeader.classList.remove('hidden');
                    }

                    if (clonedElement) {
                        clonedElement.style.padding = '24px';
                        clonedElement.style.height = 'auto';
                        clonedElement.style.width = '600px'; // 导出时固定宽度，防止布局乱掉
                        clonedElement.style.background = 'linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)';

                        // 移除所有 glass-card 的 backdrop-filter，因为它会导致 html2canvas 渲染失败
                        const glassCards = clonedElement.getElementsByClassName('glass-card');
                        for (let i = 0; i < glassCards.length; i++) {
                            const card = glassCards[i] as HTMLElement;
                            card.style.backdropFilter = 'none';
                            card.style.setProperty('-webkit-backdrop-filter', 'none');
                            card.style.background = 'rgba(24, 24, 27, 0.8)';
                        }
                    }
                }
            });

            const dataUrl = canvas.toDataURL('image/png', 0.9);
            const link = document.createElement('a');
            link.download = `周报_${format(report.weekStart, 'yyyy-MM-dd')}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('导出成功!');
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    // 准备图表数据
    const bodyPartData = Object.entries(report.bodyPartDistribution)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 头部导航 */}
            <div className="glass-card p-4 flex items-center justify-between">
                <button onClick={handlePreviousWeek} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="text-center">
                    <div className="text-lg font-bold">
                        {format(report.weekStart, 'MM月dd日', { locale: zhCN })} - {format(report.weekEnd, 'MM月dd日', { locale: zhCN })}
                    </div>
                    <div className="text-sm text-white/60">
                        {format(report.weekStart, 'yyyy年 第ww周', { locale: zhCN })}
                    </div>
                </div>

                <button onClick={handleNextWeek} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* 报告内容 */}
            <div id="weekly-report" className="space-y-6">
                {/* 导出时的标题和日期 - 只有在克隆导出时才显示 */}
                <div id="export-header" className="hidden text-center space-y-2 mb-8 border-b border-white/10 pb-6">
                    <h2 className="text-3xl font-black tracking-widest text-orange-400">
                        健身记录
                    </h2>
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-lg font-bold text-white/90">
                            {format(report.weekStart, 'yyyy年MM月dd日', { locale: zhCN })} - {format(report.weekEnd, 'MM月dd日', { locale: zhCN })}
                        </div>
                        <div className="text-sm text-white/50 px-3 py-1 bg-white/5 rounded-full">
                            {format(report.weekStart, 'yyyy年 第ww周', { locale: zhCN })}
                        </div>
                    </div>
                </div>

                {/* 概览统计 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="训练次数"
                        value={report.totalSessions}
                        unit="次"
                        color="from-blue-500 to-cyan-500"
                    />
                    <StatCard
                        label="总时长"
                        value={report.totalDuration}
                        unit="分钟"
                        color="from-purple-500 to-pink-500"
                    />
                    <StatCard
                        label="总组数"
                        value={report.totalSets}
                        unit="组"
                        color="from-orange-500 to-red-500"
                    />
                </div>

                {/* 身体部位分布 */}
                {/* 暂时注释图表,测试导出功能 */}
                {bodyPartData.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">训练部位分布</h3>
                        <div className="space-y-2">
                            {bodyPartData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <span className="text-sm">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
                                                style={{ width: `${(item.value / Math.max(...bodyPartData.map(d => d.value))) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-400 w-12 text-right">{item.value}组</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* <ResponsiveContainer width="100%" height={250}>
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
                        </ResponsiveContainer> */}
                    </div>
                )}

                {/* 进步对比 */}
                {report.progressComparison.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">📈 本周进步</h3>
                        <div className="space-y-3">
                            {report.progressComparison.slice(0, 5).map((progress, idx) => (
                                <div key={idx} className="bg-white/5 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{progress.exerciseName}</span>
                                        <div className="flex items-center gap-2">
                                            {progress.improvement > 0 ? (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            ) : progress.improvement < 0 ? (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            ) : null}
                                            <span className={`font-bold ${progress.improvement > 0 ? 'text-green-400' :
                                                progress.improvement < 0 ? 'text-red-400' : 'text-white/60'
                                                }`}>
                                                {progress.improvement > 0 ? '+' : ''}{progress.improvement.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span>上周: {progress.previousWeekMax}kg</span>
                                        <span>→</span>
                                        <span>本周: {progress.currentWeekMax}kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 训练照片集锦 */}
                {report.photos.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">📸 本周照片</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {report.photos.slice(0, 6).map((photo, idx) => (
                                <img
                                    key={idx}
                                    src={photo}
                                    alt={`训练照片 ${idx + 1}`}
                                    className="w-full h-auto object-contain rounded-lg bg-black/20"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 空状态 */}
                {report.totalSessions === 0 && (
                    <div className="glass-card p-12 text-center">
                        <p className="text-white/60 text-lg">本周还没有训练记录</p>
                        <p className="text-sm text-white/40 mt-2">开始训练吧!</p>
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

interface StatCardProps {
    label: string;
    value: number;
    unit: string;
    color: string;
}

function StatCard({ label, value, unit, color }: StatCardProps) {
    return (
        <div className="glass-card p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2">{label}</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
                {value}
                <span className="text-sm sm:text-lg ml-1">{unit}</span>
            </div>
            <div className={`h-1 w-full bg-gradient-to-r ${color} rounded-full mt-2`}></div>
        </div>
    );
}
