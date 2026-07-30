'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, FileSpreadsheet, LayoutGrid, AlertCircle, TrendingUp, CheckCircle2, Target, Users, BookOpen } from 'lucide-react';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import * as XLSX from 'xlsx';
import PortalWrapper from '@/components/DeepDive/PortalWrapper';

export default function ReportCenterPage() {
    const searchParams = useSearchParams();
    const batch_id = searchParams.get('batch_id');
    const [analytics, setAnalytics] = useState(null);
    const [detailedMatrices, setDetailedMatrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progressPct, setProgressPct] = useState(0);
    const [statusMsg, setStatusMsg] = useState('Initializing Engine...');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (!batch_id) return;
        const fetchData = async () => {
            try {
                setProgressPct(10);
                setStatusMsg('Authenticating request...');
                const token = getAdminToken();
                const headers = { 'Authorization': `Bearer ${token}` };
                
                setProgressPct(20);
                setStatusMsg('Fetching batch overview...');
                const res = await fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/batch-overview?batch_id=${batch_id}`, { headers });
                const overviewData = await res.json();
                const baseData = overviewData.success || overviewData.data ? (overviewData.data || overviewData) : overviewData;
                setAnalytics(baseData);
                
                setProgressPct(40);
                setStatusMsg('Fetching batch sections...');
                // Fetch sections
                const secRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getSectionsByBatch}?batch_id=${batch_id}`, { headers });
                const secData = await secRes.json();
                const sectionsList = secData?.sections || secData?.data?.sections || [];
                
                setProgressPct(60);
                setStatusMsg('Aggregating sub-topic metrics...');
                
                // Fetch detailed matrix for all sections to build Curriculum Report
                if (sectionsList.length > 0) {
                    const matrixPromises = sectionsList.map(sec => 
                        fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/section-matrix?section=${encodeURIComponent(sec)}&limit=1000`, { headers })
                            .then(r => r.json())
                            .catch(e => null)
                    );
                    const matrices = await Promise.all(matrixPromises);
                    setDetailedMatrices(matrices.filter(m => m && !m.error));
                }

                setProgressPct(100);
                setStatusMsg('Finalizing reports...');
                
                setTimeout(() => setLoading(false), 400);
            } catch (err) {
                console.error('Failed to fetch analytics', err);
                setLoading(false);
            }
        };
        fetchData();
    }, [batch_id]);

    const exportToXLSX = (data, filename) => {
        setIsExporting(true);
        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, "Report");
                XLSX.writeFile(wb, `${filename}.xlsx`);
            } catch (e) {
                console.error('Export error', e);
            }
            setIsExporting(false);
        }, 500);
    };

    const getStudents = () => analytics?.student_lists?.all || [];

    // REPORT 1: Curriculum Vulnerability (Marketing Genius)
    const handleCurriculumExport = () => {
        if (!detailedMatrices) return;
        const topicMap = {};
        
        detailedMatrices.forEach(matrix => {
            const dataObj = matrix.data || matrix;
            const courses = dataObj.course_performance || [];
            courses.forEach(c => {
                const topicName = c.course_name;
                const type = c.result_type;
                if (!topicName) return; // Safely skip if no name
                if (!topicMap[topicName]) {
                    topicMap[topicName] = { mcqSum: 0, mcqCount: 0, codSum: 0, codCount: 0 };
                }
                if (type === 'mcq') {
                    topicMap[topicName].mcqSum += c.average_score || 0;
                    topicMap[topicName].mcqCount += 1;
                } else if (type === 'cod') {
                    topicMap[topicName].codSum += c.average_score || 0;
                    topicMap[topicName].codCount += 1;
                }
            });
        });

        const report = Object.entries(topicMap).map(([topic, stats]) => {
            const mcqAvg = stats.mcqCount > 0 ? Math.round(stats.mcqSum / stats.mcqCount) : 0;
            const codAvg = stats.codCount > 0 ? Math.round(stats.codSum / stats.codCount) : 0;
            const divisor = (stats.mcqCount > 0 ? 1 : 0) + (stats.codCount > 0 ? 1 : 0);
            const overall = divisor > 0 ? Math.round((mcqAvg + codAvg) / divisor) : 0;
            
            let insight = 'Strong Concept';
            if (overall < 40) insight = 'Critical: Needs Physical Revision Lecture';
            else if (overall < 60) insight = 'Warning: Assign extra practice modules';
            else if (mcqAvg > 70 && codAvg < 50) insight = 'Theory clear, practical application weak';
            
            return {
                Topic: topic,
                OverallPerformance: overall,
                TheoryScore_MCQ: mcqAvg,
                PracticalScore_Coding: codAvg,
                ActionableInsight: insight
            };
        }).sort((a, b) => a.OverallPerformance - b.OverallPerformance);
        
        exportToXLSX(report, `Curriculum_Vulnerability_Matrix_${batch_id}`);
    };

    // REPORT 2: Predictive EWS (Marketing Genius)
    const handleAtRiskExport = () => {
        if (!analytics) return;
        const students = getStudents().map(s => {
            const logicGap = s.mcq - s.coding;
            let riskLevel = 'Safe';
            if (s.overall < 40) riskLevel = 'Critical Dropout Risk';
            else if (s.overall < 60) riskLevel = 'High Warning';
            else if (logicGap > 30) riskLevel = 'Monitor: Potential Guessing/Integrity Risk';
            
            return {
                Registration: s.reg,
                Name: s.name,
                Section: s.section,
                OverallScore: s.overall,
                LogicGap: logicGap,
                RiskLevel: riskLevel,
                SuggestedIntervention: riskLevel.includes('Critical') ? 'Immediate HOD Meeting' : riskLevel.includes('Warning') ? 'Peer Tutoring' : 'None'
            };
        }).filter(s => s.RiskLevel !== 'Safe').sort((a, b) => a.OverallScore - b.OverallScore);
        exportToXLSX(students, `Predictive_EWS_Report_${batch_id}`);
    };

    // REPORT 3: Corporate Talent Pipeline (Marketing Genius)
    const handlePlacementExport = () => {
        if (!analytics) return;
        const students = getStudents().map(s => ({
            Registration: s.reg,
            Name: s.name,
            Section: s.section,
            Day1Ready: (s.coding > 75 && s.overall > 80) ? 'YES' : 'NO',
            OverallScore: s.overall,
            PracticalCodingScore: s.coding,
            TheoryMCQScore: s.mcq,
            LogicReliability: (100 - Math.abs(s.mcq - s.coding))
        })).sort((a, b) => b.OverallScore - a.OverallScore);
        exportToXLSX(students, `Corporate_Talent_Pipeline_${batch_id}`);
    };

    // REPORT 4: Faculty Efficacy (Marketing Genius)
    const handleSectionPerformanceExport = () => {
        if (!analytics || !analytics.sections) return;
        const sectionsData = Object.entries(analytics.sections).map(([name, score]) => ({
            SectionName: name,
            AverageScore: score,
            Status: score >= 70 ? 'High Efficacy' : score >= 50 ? 'Average Efficacy' : 'Requires Faculty Support'
        })).sort((a, b) => b.AverageScore - a.AverageScore);
        exportToXLSX(sectionsData, `Faculty_Efficacy_Benchmark_${batch_id}`);
    };

    const handleExportAll = () => {
        if (!analytics) return;
        setIsExporting(true);
        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                
                // Pipeline
                const placement = getStudents().map(s => ({
                    Registration: s.reg, Name: s.name, Section: s.section,
                    Day1Ready: (s.coding > 75 && s.overall > 80) ? 'YES' : 'NO',
                    OverallScore: s.overall, PracticalCodingScore: s.coding, LogicReliability: (100 - Math.abs(s.mcq - s.coding))
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(placement), "Talent Pipeline");

                // EWS
                const ews = getStudents().filter(s => s.overall < 60).map(s => ({
                    Registration: s.reg, Name: s.name, Section: s.section,
                    OverallScore: s.overall, RiskLevel: s.overall < 40 ? 'Critical' : 'High Warning'
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ews), "Predictive EWS");
                
                XLSX.writeFile(wb, `Enterprise_Master_Report_${batch_id}.xlsx`);
            } catch (e) {
                console.error(e);
            }
            setIsExporting(false);
        }, 500);
    };

    if (loading) {
        return (
            <PortalWrapper>
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center font-sans transition-colors duration-500 bg-[#f8f9fa] dark:bg-gray-900">
                    <div className="text-center space-y-7 max-w-xs mx-auto px-4">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg animate-pulse">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div className="relative w-28 h-28 mx-auto">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="4" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" />
                                <circle className="text-indigo-600" strokeWidth="4" strokeDasharray={2 * Math.PI * 44} strokeDashoffset={(2 * Math.PI * 44) * (1 - progressPct / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" style={{ transition: 'stroke-dashoffset .4s', filter: 'drop-shadow(0 0 5px rgba(79,70,229,.4))' }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-extrabold text-gray-900 dark:text-white">{progressPct}%</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Enterprise Report Engine</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 animate-pulse">{statusMsg}</p>
                        </div>
                        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                </div>
            </PortalWrapper>
        );
    }

    return (
        <PortalWrapper>
            <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#F8F9FA] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans pb-20">
                {/* Header */}
                <header className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => window.close()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                                </button>
                                <div>
                                    <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                                        Enterprise Report Center
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Advanced B2B Institutional Analytics</p>
                                </div>
                            </div>
                            <button
                                onClick={handleExportAll}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                <Download size={18} />
                                {isExporting ? 'Generating...' : 'Export Master Suite'}
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                    
                    {/* Intro */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm">
                            <Target className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-1">Institutional Success Reports</h2>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed max-w-4xl">
                                Transform raw data into actionable institutional insights. Use these highly curated reports to optimize curriculum, boost corporate placements, and preemptively catch at-risk students before final exams.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        
                        {/* Report 1: Curriculum Vulnerability */}
                        <div className="bg-white dark:bg-[#111827] rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                                    <BookOpen size={20} />
                                </div>
                                <h3 className="text-[17px] font-extrabold text-gray-900 dark:text-white">Curriculum Vulnerability Analysis</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 leading-relaxed">
                                Pinpoint exactly which programming concepts (e.g. Loops, Pointers) the entire batch is failing. Automatically generates actionable insights for syllabus revision.
                            </p>
                            <button onClick={handleCurriculumExport} className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 transition-colors">
                                <FileSpreadsheet size={16} className="text-green-600" /> Export Topic Weakness (.XLSX)
                            </button>
                        </div>

                        {/* Report 2: Predictive EWS */}
                        <div className="bg-white dark:bg-[#111827] rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                                    <AlertCircle size={20} />
                                </div>
                                <h3 className="text-[17px] font-extrabold text-gray-900 dark:text-white">Predictive Early Warning System</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 leading-relaxed">
                                Identifies critical drop-out risks based on logic consistency gaps (Theory vs Practical correlation) and declining trajectory before final exams.
                            </p>
                            <button onClick={handleAtRiskExport} className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 transition-colors">
                                <FileSpreadsheet size={16} className="text-green-600" /> Export EWS Report (.XLSX)
                            </button>
                        </div>

                        {/* Report 3: Placement Pipeline */}
                        <div className="bg-white dark:bg-[#111827] rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h3 className="text-[17px] font-extrabold text-gray-900 dark:text-white">Corporate Talent Pipeline</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 leading-relaxed">
                                Provides corporate recruiters with a pre-vetted list of "Day 1 Ready" engineers based on actual coding velocity and logic reliability.
                            </p>
                            <button onClick={handlePlacementExport} className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 transition-colors">
                                <FileSpreadsheet size={16} className="text-green-600" /> Export Placement Matrix (.XLSX)
                            </button>
                        </div>

                        {/* Report 4: Faculty Efficacy */}
                        <div className="bg-white dark:bg-[#111827] rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <Users size={20} />
                                </div>
                                <h3 className="text-[17px] font-extrabold text-gray-900 dark:text-white">Faculty Efficacy Benchmark</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 leading-relaxed">
                                Compares sections side-by-side to discover which teaching methods yield the highest practical coding outcomes, enabling HOD interventions.
                            </p>
                            <button onClick={handleSectionPerformanceExport} className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 transition-colors">
                                <FileSpreadsheet size={16} className="text-green-600" /> Export Faculty Efficacy (.XLSX)
                            </button>
                        </div>

                    </div>
                </main>
            </div>
        </PortalWrapper>
    );
}
