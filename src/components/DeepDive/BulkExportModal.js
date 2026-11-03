'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Loader2, Download, AlertCircle, Layers, BookOpen, Users, 
    Check, Clock, AlertTriangle, FileSpreadsheet, CheckSquare, Square, Search
} from 'lucide-react';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import * as XLSX from 'xlsx';

export default function BulkExportModal({ isOpen, onClose, batch, courses = [], sections = [] }) {
    const [selectedCourse, setSelectedCourse] = useState('');
    const modalBodyRef = useRef(null);
    
    // Unit scope state: 'all' or 'custom'
    const [unitScopeMode, setUnitScopeMode] = useState('all'); 
    const [selectedUnitIds, setSelectedUnitIds] = useState([]);
    const [units, setUnits] = useState([]);

    // Report format: 'detailed' (MCQ, Coding, Overall per unit) or 'summary' (Unit X % only)
    const [reportFormat, setReportFormat] = useState('detailed');

    // Multi-section selection state
    const [selectedSectionNames, setSelectedSectionNames] = useState([]);
    const [sectionSearch, setSectionSearch] = useState('');

    // Loading & Progress States
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState(null);

    // Auto-select initial course and initialize sections when modal opens
    useEffect(() => {
        if (isOpen) {
            if (courses.length > 0 && !selectedCourse) {
                setSelectedCourse(courses[0].course_id);
            }
            // By default, select all sections in batch
            const allSecNames = sections.map(s => s.section_name || s.name).filter(Boolean);
            setSelectedSectionNames(allSecNames);
            setElapsedSeconds(0);
            setError(null);
        }
    }, [isOpen, courses, sections]);

    // Live Stopwatch Timer during export
    useEffect(() => {
        let timer = null;
        if (isExporting) {
            setElapsedSeconds(0);
            timer = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [isExporting]);

    // Fetch units whenever selectedCourse changes
    useEffect(() => {
        if (!isOpen || !selectedCourse) {
            setUnits([]);
            setSelectedUnitIds([]);
            return;
        }

        let isMounted = true;
        const fetchUnits = async () => {
            setIsLoadingUnits(true);
            setError(null);
            try {
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(selectedCourse)}`, { headers });
                const json = await res.json();
                if (isMounted) {
                    if (json.success && Array.isArray(json.data)) {
                        setUnits(json.data);
                        // By default, select all unit IDs for custom selector
                        setSelectedUnitIds(json.data.map(u => u.unit_id));
                    } else {
                        setUnits([]);
                        setSelectedUnitIds([]);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to fetch course units:', err);
                    setError('Failed to load course units.');
                }
            } finally {
                if (isMounted) setIsLoadingUnits(false);
            }
        };

        fetchUnits();
        return () => { isMounted = false; };
    }, [isOpen, selectedCourse]);

    if (!isOpen) return null;

    // Helper functions for custom units
    const toggleUnit = (uId) => {
        if (selectedUnitIds.includes(uId)) {
            setSelectedUnitIds(prev => prev.filter(id => id !== uId));
        } else {
            setSelectedUnitIds(prev => [...prev, uId]);
        }
    };

    const handleSelectAllUnits = () => {
        setSelectedUnitIds(units.map(u => u.unit_id));
    };

    const handleDeselectAllUnits = () => {
        setSelectedUnitIds([]);
    };

    // Helper functions for section selection / deselection
    const allSecList = sections.map(s => s.section_name || s.name).filter(Boolean);
    const filteredSections = allSecList.filter(s => s.toLowerCase().includes(sectionSearch.toLowerCase()));

    const handleSelectAllSections = () => {
        setSelectedSectionNames(allSecList);
    };

    const handleDeselectAllSections = () => {
        setSelectedSectionNames([]);
    };

    const toggleSection = (secName) => {
        if (selectedSectionNames.includes(secName)) {
            setSelectedSectionNames(prev => prev.filter(s => s !== secName));
        } else {
            setSelectedSectionNames(prev => [...prev, secName]);
        }
    };

    // Validation condition
    const hasValidUnits = unitScopeMode === 'all' ? (units.length > 0) : (selectedUnitIds.length > 0);
    const canExport = 
        Boolean(selectedCourse) && 
        hasValidUnits && 
        !isLoadingUnits && 
        !isExporting && 
        selectedSectionNames.length > 0;

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
    };

    const handleExport = async () => {
        if (!canExport) return;

        setIsExporting(true);
        setError(null);

        // Smooth scroll to bottom of modal so progress bar and patience notice are immediately visible
        setTimeout(() => {
            if (modalBodyRef.current) {
                modalBodyRef.current.scrollTo({
                    top: modalBodyRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 150);
        setProgress(0);
        setStatusMsg('Initializing bulk matrix engine...');

        try {
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            let allRows = [];
            let page = 1;
            const limit = 50; // 50 students per page with sub-chunking ensures 100% safe URI length
            let hasMore = true;
            let totalStudents = 0;

            const isAllSectionsSelected = selectedSectionNames.length === allSecList.length;

            while (hasMore) {
                setStatusMsg(`Processing batch page ${page}... (${allRows.length} records retrieved)`);
                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.bulkExport}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        course_id: selectedCourse,
                        batch_id: batch?.batch_id,
                        unit_id: unitScopeMode === 'all' ? 'all' : undefined,
                        unit_ids: unitScopeMode === 'custom' ? selectedUnitIds : undefined,
                        section_name: isAllSectionsSelected ? 'all' : undefined,
                        section_names: isAllSectionsSelected ? undefined : selectedSectionNames,
                        format: reportFormat,
                        page,
                        limit
                    })
                });

                const json = await res.json();
                if (!json.success) {
                    throw new Error(json.message || json.error || 'Failed to fetch export data chunk');
                }

                const chunkData = json.data || [];
                allRows = [...allRows, ...chunkData];
                totalStudents = json.total || allRows.length;
                hasMore = json.hasMore;
                page++;

                // Visual progress update
                if (totalStudents > 0) {
                    const currentPct = Math.min(100, Math.round((allRows.length / totalStudents) * 100));
                    setProgress(currentPct);
                } else {
                    setProgress(prev => Math.min(prev + 15, 95));
                }
            }

            setProgress(100);
            setStatusMsg('Compiling and formatting Excel spreadsheet...');

            if (allRows.length === 0) {
                throw new Error('No enrolled students or test records found for the selected criteria.');
            }

            // Sort by Section Name then Student Name
            allRows.sort((a, b) => {
                const secA = a['Section Name'] || '';
                const secB = b['Section Name'] || '';
                if (secA < secB) return -1;
                if (secA > secB) return 1;

                const nameA = a.Name || '';
                const nameB = b.Name || '';
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            // Build Excel workbook
            const worksheet = XLSX.utils.json_to_sheet(allRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Report');

            const courseName = courses.find(c => c.course_id === selectedCourse)?.course_name || 'Course';
            const unitLabel = unitScopeMode === 'all' 
                ? 'All_Units' 
                : `${selectedUnitIds.length}_Custom_Units`;
            const secLabel = isAllSectionsSelected 
                ? 'All_Sections' 
                : `${selectedSectionNames.length}_Sections`;
            const formatLabel = reportFormat === 'detailed' ? 'Detailed_Matrix' : 'Summary';

            const safeCourse = courseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
            const safeUnit = unitLabel.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
            const safeSection = secLabel.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);

            XLSX.writeFile(workbook, `Bulk_Report_${safeCourse}_${safeUnit}_${formatLabel}_${safeSection}.xlsx`);

            setStatusMsg('Report downloaded successfully!');
            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1200);

        } catch (err) {
            console.error('Bulk export failed:', err);
            setError(err.message || 'Export failed. Please check your network and try again.');
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#151c33] rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col neu-raised">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-emerald-50/70 to-green-50/40 dark:from-emerald-950/20 dark:to-green-950/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                            <Download className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Institutional Bulk Export
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {batch?.batch_name || 'Batch'} &bull; Academic Performance Matrix
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <div ref={modalBodyRef} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {/* 1. Course Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            1. Select Course
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                            }}
                            disabled={isExporting}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                            {courses.length === 0 ? (
                                <option value="">No registered courses available</option>
                            ) : (
                                courses.map(c => (
                                    <option key={c.course_id} value={c.course_id} className="dark:bg-[#151c33]">
                                        {c.course_name || c.course_title || 'Untitled Course'}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* 2. Unit Selection (All Units vs Custom Units Multi-Select) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                2. Unit Scope (All or Custom Units)
                            </label>
                            {isLoadingUnits && (
                                <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 animate-pulse">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading course units...
                                </span>
                            )}
                        </div>

                        {/* Mode Switcher */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setUnitScopeMode('all')}
                                disabled={isExporting || isLoadingUnits}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                                    unitScopeMode === 'all'
                                        ? 'bg-cyan-500 text-white border-cyan-600 shadow-sm'
                                        : 'bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" /> All Units Matrix ({units.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setUnitScopeMode('custom')}
                                disabled={isExporting || isLoadingUnits}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                                    unitScopeMode === 'custom'
                                        ? 'bg-cyan-500 text-white border-cyan-600 shadow-sm'
                                        : 'bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <CheckSquare className="w-3.5 h-3.5" /> Select Custom Units ({selectedUnitIds.length})
                            </button>
                        </div>

                        {/* Custom Units Checklist if custom mode is chosen */}
                        {unitScopeMode === 'custom' && (
                            <div className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400 px-1">
                                    <span>Pick specific units to include:</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllUnits}
                                            disabled={isExporting}
                                            className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                                        >
                                            Select All
                                        </button>
                                        <span>&bull;</span>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllUnits}
                                            disabled={isExporting}
                                            className="text-red-500 hover:underline font-semibold"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                    {units.map((u, idx) => {
                                        const isChecked = selectedUnitIds.includes(u.unit_id);
                                        return (
                                            <button
                                                key={u.unit_id}
                                                type="button"
                                                onClick={() => toggleUnit(u.unit_id)}
                                                disabled={isExporting}
                                                className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all text-left ${
                                                    isChecked
                                                        ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                                                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/5'
                                                }`}
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-gray-400 shrink-0 opacity-40" />
                                                )}
                                                <span className="truncate">Unit {idx + 1}: {u.unit_name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedUnitIds.length === 0 && (
                                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 pt-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> Please select at least one unit to export.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. Report Detail Level Format */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                            <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            3. Choose Export Format
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setReportFormat('detailed')}
                                disabled={isExporting}
                                className={`p-3.5 rounded-2xl text-left border transition-all ${
                                    reportFormat === 'detailed'
                                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500'
                                        : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        {reportFormat === 'detailed' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                        Teacher Matrix Format
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">Recommended</span>
                                </div>
                                <p className="text-[11px] opacity-80 leading-snug">
                                    Unit MCQ %, Coding %, Overall % for each unit + Totals
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setReportFormat('summary')}
                                disabled={isExporting}
                                className={`p-3.5 rounded-2xl text-left border transition-all ${
                                    reportFormat === 'summary'
                                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500'
                                        : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        {reportFormat === 'summary' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                        Compact Summary
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-700 dark:text-gray-300 font-semibold">Standard</span>
                                </div>
                                <p className="text-[11px] opacity-80 leading-snug">
                                    Unit 1 %, Unit 2 % ... overall progress per unit + Totals
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* 4. Section Filter with Deselect Option */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                4. Target Sections ({selectedSectionNames.length} of {allSecList.length} Selected)
                            </label>
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={handleSelectAllSections}
                                    disabled={isExporting}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                >
                                    Select All
                                </button>
                                <span className="text-gray-300 dark:text-gray-700">&bull;</span>
                                <button
                                    type="button"
                                    onClick={handleDeselectAllSections}
                                    disabled={isExporting}
                                    className="text-red-500 hover:underline font-semibold"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>

                        {/* Search and Section Checklist */}
                        <div className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filter sections to include/exclude..."
                                    value={sectionSearch}
                                    onChange={(e) => setSectionSearch(e.target.value)}
                                    disabled={isExporting}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#151c33] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="max-h-36 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-1.5 pr-1">
                                {filteredSections.length > 0 ? (
                                    filteredSections.map((secName, idx) => {
                                        const isChecked = selectedSectionNames.includes(secName);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => toggleSection(secName)}
                                                disabled={isExporting}
                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all text-left truncate ${
                                                    isChecked
                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/5'
                                                }`}
                                                title={secName}
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                                ) : (
                                                    <Square className="w-3.5 h-3.5 shrink-0 opacity-40" />
                                                )}
                                                <span className="truncate">{secName}</span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                                        No matching sections found.
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedSectionNames.length === 0 && (
                            <p className="text-[11px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Please select at least one section to export.
                            </p>
                        )}
                    </div>

                    {/* Active Exporting Live Box & Patient Notice */}
                    {isExporting && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                                    {statusMsg}
                                </span>
                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 font-mono text-[11px]">
                                    <Clock className="w-3 h-3" /> {formatTimer(elapsedSeconds)}
                                </span>
                            </div>

                            <div className="w-full h-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="flex items-start gap-2 text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed bg-white/50 dark:bg-black/30 p-2.5 rounded-xl border border-amber-500/10">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Preparing your report:</span> Please have a bit of patience and do not close or refresh the browser. We are safely compiling and cross-verifying student submissions across your {selectedSectionNames.length} selected sections.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isExporting ? (
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> Time Elapsed: {formatTimer(elapsedSeconds)}
                            </span>
                        ) : !canExport ? (
                            <span className="text-gray-400 dark:text-gray-500 text-[11px]">
                                {isLoadingUnits ? 'Loading units...' : !hasValidUnits ? 'Select at least 1 unit' : selectedSectionNames.length === 0 ? 'Select at least 1 section' : 'Complete selections above'}
                            </span>
                        ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                Ready: {selectedSectionNames.length} section{selectedSectionNames.length > 1 ? 's' : ''} &bull; {unitScopeMode === 'all' ? `All ${units.length} Units` : `${selectedUnitIds.length} Custom Units`}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isExporting}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={!canExport}
                            className="px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {isLoadingUnits ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Units...
                                </>
                            ) : isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Exporting ({formatTimer(elapsedSeconds)})...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" /> Download Report
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
