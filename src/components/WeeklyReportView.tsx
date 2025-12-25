import { useState } from 'react';
import type { WorkoutSession } from '../types';
import { reportGenerator } from '../utils/reportGenerator';
import { format, addWeeks, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface WeeklyReportViewProps {
    workouts: WorkoutSession[];
}

export default function WeeklyReportView({ workouts }: WeeklyReportViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const report = reportGenerator.generateWeeklyReport(workouts, currentDate);

    const handleExport = async () => {
        if (isExporting) return;
        const element = document.getElementById('weekly-report');
        if (!element) return;

        setIsExporting(true);
        try {
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('weekly-report');
                    const exportHeader = clonedDoc.getElementById('export-header');

                    if (clonedElement) {
                        clonedElement.style.padding = '30px';
                        clonedElement.style.width = 'auto';
                        clonedElement.style.maxWidth = '600px';
                        clonedElement.style.height = 'auto';
                        clonedElement.style.background = '#0f172a';
                        clonedElement.style.display = 'block';
                        clonedElement.style.visibility = 'visible';

                        const allElements = clonedElement.getElementsByTagName('*');
                        for (let i = 0; i < allElements.length; i++) {
                            const el = allElements[i] as HTMLElement;
                            el.style.backgroundImage = 'none';
                            el.style.boxShadow = 'none';
                            el.style.textShadow = 'none';
                            el.style.backdropFilter = 'none';
                            el.style.setProperty('-webkit-backdrop-filter', 'none');
                        }

                        if (exportHeader) {
                            exportHeader.classList.remove('hidden');
                            exportHeader.style.display = 'block';
                            exportHeader.style.visibility = 'visible';
                        }

                        const cards = clonedElement.getElementsByClassName('glass-card');
                        for (let i = 0; i < cards.length; i++) {
                            const card = cards[i] as HTMLElement;
                            card.style.background = '#1e293b';
                            card.style.backdropFilter = 'none';
                            card.style.setProperty('-webkit-backdrop-filter', 'none');
                            card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                            card.style.borderRadius = '12px';
                        }
                    }
                }
            });

            // Safari 兼容：检查 toBlob 支持
            if (canvas.toBlob) {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        alert('生成图片失败，请重试');
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `周报_${format(report.weekStart, 'MMdd')}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                }, 'image/png');
            } else {
                // 降级方案：使用 toDataURL
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `周报_${format(report.weekStart, 'MMdd')}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

        } catch (error) {
            console.error('Export error:', error);
            alert('生成失败，请尝试刷新页面。错误: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    const bodyPartData = Object.entries(report.bodyPartDistribution)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="glass-card p-4 flex items-center justify-between">
                <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <div className="text-lg font-bold">
                        {format(report.weekStart, 'MM月dd日', { locale: zhCN })} - {format(report.weekEnd, 'MM月dd日', { locale: zhCN })}
                    </div>
                    <div className="text-sm text-white/60">{format(report.weekStart, 'yyyy年 第ww周', { locale: zhCN })}</div>
                </div>
                <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            <div id="weekly-report" className="space-y-6">
                <div id="export-header" className="hidden text-center py-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-orange-500 mb-1">健身周报</h2>
                    <p className="text-white/40 text-sm">{format(report.weekStart, 'yyyy.MM.dd')} - {format(report.weekEnd, 'MM.dd')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="训练次数" value={report.totalSessions} unit="次" color="bg-orange-500" />
                    <StatCard label="总时长" value={report.totalDuration} unit="分钟" color="bg-blue-500" />
                    <StatCard label="总组数" value={report.totalSets} unit="组" color="bg-emerald-500" />
                </div>

                {bodyPartData.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-white/40 mb-4 uppercase">训练分布</h3>
                        <div className="space-y-3">
                            {bodyPartData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <span className="text-sm">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-orange-500" 
                                                style={{ width: `${(item.value / Math.max(...bodyPartData.map(d => d.value))) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-orange-400 font-mono w-8">{item.value}组</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {report.progressComparison.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-white/40 mb-4 uppercase">本周进步</h3>
                        <div className="space-y-3">
                            {report.progressComparison.slice(0, 3).map((progress, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <span className="text-sm font-medium">{progress.exerciseName}</span>
                                    <span className="text-emerald-400 font-bold">+{progress.improvement.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-24 left-4 right-4 z-50">
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    {isExporting ? '正在导出...' : '导出周报图片'}
                </button>
            </div>
        </div>
    );
}

function StatCard({ label, value, unit, color }: any) {
    return (
        <div className="glass-card p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}<span className="text-xs ml-1 text-white/40">{unit}</span></div>
        </div>
    );
}
