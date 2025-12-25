import { useState } from 'react';
import type { WorkoutSession } from '../types';
import { reportGenerator } from '../utils/reportGenerator';
import { format, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MonthlyReportViewProps {
    workouts: WorkoutSession[];
}

export default function MonthlyReportView({ workouts }: MonthlyReportViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const report = reportGenerator.generateMonthlyReport(workouts, currentDate);

    const handleExport = async () => {
        if (isExporting) return;
        const element = document.getElementById('monthly-report');
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
                    const clonedElement = clonedDoc.getElementById('monthly-report');
                    const exportHeader = clonedDoc.getElementById('export-header-month');

                    if (clonedElement) {
                        clonedElement.style.padding = '40px';
                        clonedElement.style.width = 'auto';
                        clonedElement.style.maxWidth = '800px';
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
                            // Safari 关键修复：移除 backdrop-filter
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
                    link.download = `月报_${format(report.month, 'yyyyMM')}.png`;
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
                link.download = `月报_${format(report.month, 'yyyyMM')}.png`;
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

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="glass-card p-4 flex items-center justify-between">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft /></button>
                <div className="text-center">
                    <div className="text-lg font-bold">{format(report.month, 'yyyy年 MM月', { locale: zhCN })}</div>
                    <div className="text-sm text-white/60">月度报告</div>
                </div>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight /></button>
            </div>

            <div id="monthly-report" className="space-y-6">
                <div id="export-header-month" className="hidden text-center py-8 border-b border-white/10">
                    <h2 className="text-3xl font-bold text-indigo-400">健身月报</h2>
                    <p className="text-white/40">{format(report.month, 'yyyy MMMM', { locale: zhCN })}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-6">
                        <div className="text-xs text-white/40 mb-1 uppercase">训练次数</div>
                        <div className="text-3xl font-bold text-indigo-400">{report.totalSessions}<span className="text-xs ml-1 text-white/40">次</span></div>
                    </div>
                    <div className="glass-card p-6">
                        <div className="text-xs text-white/40 mb-1 uppercase">活跃时长</div>
                        <div className="text-3xl font-bold text-sky-400">{report.totalDuration}<span className="text-xs ml-1 text-white/40">MIN</span></div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-sm font-bold text-white/40 mb-6 uppercase text-center">本月 TOP 动作</h3>
                    <div className="space-y-4">
                        {report.topExercises.slice(0, 5).map((ex, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{ex.name}</span>
                                <span className="text-indigo-400 font-bold">{ex.totalSets} 组</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-24 left-4 right-4 z-50">
                <button onClick={handleExport} disabled={isExporting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    {isExporting ? '正在导出...' : '导出月报图片'}
                </button>
            </div>
        </div>
    );
}
