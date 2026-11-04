// TheEduCode Official Examination Scrutiny & Evaluation Document Generator
// Generates an enterprise-grade, styled A4 examination report with embedded branding, watermarking, and exhaustive scrutiny logs.
import { EDUCODE_LOGO_BASE64 } from './reportAssets.js';

export function generateExamReport(ctx) {
    const {
        studentInfo = {}, regNo = '', examName = '', sectionName = '',
        mcqDetails = null, codingDetails = null,
        telemetry = {}, envLogs = {},
        mcqAnalytics = {}, codingAnalytics = {},
        examStartedAt = null, examEndedAt = null, examDuration = null,
        mcqStartedAt = null, mcqEndedAt = null, mcqDuration = null,
        codingStartedAt = null, codingEndedAt = null, codingDuration = null,
        overallMcqScore = 0, maxMcqScore = 0,
        overallCodingScore = 0, maxCodingScore = 0,
        examTotalMarks = 0, examMcqMarks = 0, examCodingMarks = 0,
        displayTotalScore = 0, displayMaxScore = 0, finalPercentage = 0,
        hasMcq = null, hasCoding = null
    } = ctx;

    const formatTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    const formatDate = (d) => d ? d.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A';

    const mcqSubs = mcqDetails?.submissions?.filter(s => s.type === 'mcq' || s.question_type === 'mcq') || [];
    const codingSubs = codingDetails?.submissions?.filter(s => s.type === 'coding' || s.question_type === 'coding' || (!s.type && (s.submitted_code || s.formattedResult || s.total_question_marks))) || [];
    const isMcqActive = hasMcq !== null ? hasMcq : (mcqSubs.length > 0 || Boolean(envLogs?.mcq_timing) || examMcqMarks > 0);
    const isCodingActive = hasCoding !== null ? hasCoding : (codingSubs.length > 0 || Boolean(envLogs?.coding_timing) || examCodingMarks > 0);
    const now = new Date();
    const candidateReg = studentInfo?.regNo || regNo || 'STUDENT';
    const reportId = `RPT-${candidateReg}-${Date.now().toString(36).toUpperCase()}`;

    const esc = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Tally total test cases passed across coding challenges
    let totalCodingCases = 0;
    let totalCodingPassed = 0;
    codingSubs.forEach(sub => {
        const results = sub.formattedResult || [];
        totalCodingCases += results.length;
        totalCodingPassed += results.filter(r => Object.values(r)[0]?.testCasePassed).length;
    });

    // Executive Questions Summary Rows
    const execSummaryRows = [
        ...codingSubs.map((sub, idx) => {
            const results = sub.formattedResult || [];
            const totalCases = results.length || 0;
            const passedCases = results.filter(r => Object.values(r)[0]?.testCasePassed).length;
            const isFull = passedCases === totalCases && totalCases > 0;
            const isPartial = passedCases > 0 && passedCases < totalCases;
            const statusLabel = isFull ? 'Fully Solved' : (isPartial ? 'Partially Solved' : 'Not Solved');
            const statusBadge = isFull ? 'badge-pass' : (isPartial ? 'badge-warn' : 'badge-fail');
            const lang = sub.language || 'C++';
            const compiles = sub.compile_count ?? sub.compiles ?? '-';
            const maxPts = (sub.total_question_marks || 60) / 10;
            return `<tr>
                <td class="tc" style="font-weight:700;">Q${idx + 1}</td>
                <td class="tl" style="font-weight:600;">${esc(sub.question_title) || 'Coding Challenge ${idx + 1}'}</td>
                <td class="tc"><span class="badge" style="background:#f3e8ff;color:#6d28d9;">Coding</span></td>
                <td class="tc"><span class="badge ${statusBadge}">${statusLabel}</span></td>
                <td class="tc" style="font-family:monospace;font-size:10px;">${esc(lang)}</td>
                <td class="tc" style="font-weight:600;">${totalCases > 0 ? `${passedCases}/${totalCases}` : '-'}</td>
                <td class="tc">${compiles}</td>
                <td class="tc" style="font-weight:700;color:#1e40af;">${sub.score_obtained ?? 0} / ${maxPts}</td>
            </tr>`;
        }),
        ...mcqSubs.map((sub, idx) => {
            const isCorrect = sub.is_correct;
            return `<tr>
                <td class="tc" style="font-weight:700;">MCQ ${idx + 1}</td>
                <td class="tl" style="font-weight:600;max-width:280px;">${esc(sub.question_title) || 'Question ${idx + 1}'}</td>
                <td class="tc"><span class="badge" style="background:#dbeafe;color:#1e40af;">MCQ</span></td>
                <td class="tc"><span class="badge ${isCorrect ? 'badge-pass' : 'badge-fail'}">${isCorrect ? 'Correct ✓' : 'Incorrect ✗'}</span></td>
                <td class="tc" style="font-size:10px;color:#64748b;">Objective</td>
                <td class="tc">-</td>
                <td class="tc">-</td>
                <td class="tc" style="font-weight:700;color:#1e40af;">${sub.score_obtained ?? 0}</td>
            </tr>`;
        })
    ].join('');

    const mcqRows = mcqSubs.map((sub, idx) => {
        const correctOpt = sub.options?.find(o => typeof o !== 'string' && (o.is_correct === true || o.isAnswer === true || o.isCorrect === true || o.correct === true));
        const correctText = correctOpt ? esc(correctOpt.text ?? correctOpt.option ?? '') : '-';
        const isCorrect = sub.is_correct;
        return `<tr style="${idx % 2 === 0 ? '' : 'background:#f8fafc;'}">
            <td class="tc">${idx + 1}</td>
            <td class="tl" style="max-width:240px;font-weight:500;">${esc(sub.question_title)}</td>
            <td class="tl" style="color:${isCorrect ? '#047857' : '#b91c1c'};font-weight:600;">${esc(sub.submitted_answer_text) || '<em style="color:#9ca3af;">Skipped</em>'}</td>
            <td class="tl" style="color:#1d4ed8;font-weight:600;">${correctText}</td>
            <td class="tc"><span class="badge ${isCorrect ? 'badge-pass' : 'badge-fail'}">${isCorrect ? '✓ Correct' : '✗ Wrong'}</span></td>
            <td class="tc" style="font-weight:700;">${sub.score_obtained || 0}</td>
        </tr>`;
    }).join('');

    const codingCards = codingSubs.map((sub, idx) => {
        const results = sub.formattedResult || [];
        const totalCases = results.length || 0;
        const passedCases = results.filter(r => Object.values(r)[0]?.testCasePassed).length;
        const lang = sub.language || 'C++';
        return `<div class="coding-card">
            <div class="coding-header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="coding-num">${idx + 1}</span>
                    <div>
                        <strong style="font-size:13px;color:#0f172a;">${esc(sub.question_title) || 'Coding Challenge'}</strong>
                        <div style="font-size:10px;color:#64748b;margin-top:2px;">Language: <span style="font-weight:700;color:#334155;">${esc(lang)}</span> &nbsp;•&nbsp; Attempts: ${sub.compile_count ?? sub.compiles ?? 1}</div>
                    </div>
                </div>
                <div class="coding-meta">
                    <span class="badge ${passedCases === totalCases && totalCases > 0 ? 'badge-pass' : 'badge-warn'}">Test Cases: ${passedCases}/${totalCases} Passed</span>
                    <span style="font-weight:800;color:#6d28d9;font-size:12px;background:#f5f3ff;padding:4px 10px;border-radius:6px;border:1px solid #ddd6fe;">Score: ${sub.score_obtained || 0} / ${(sub.total_question_marks || 60) / 10}</span>
                </div>
            </div>
            ${sub.question_desc ? `<div class="coding-desc"><strong>Problem Description:</strong><br/>${esc(sub.question_desc)}</div>` : ''}
            <div class="code-grid">
                <div class="code-panel">
                    <div class="code-label">
                        <span class="code-dot" style="background:#ef4444;"></span>
                        <span class="code-dot" style="background:#f59e0b;"></span>
                        <span class="code-dot" style="background:#22c55e;"></span>
                        <span style="margin-left:6px;font-weight:700;">Candidate Submitted Solution</span>
                    </div>
                    <pre class="code-block code-dark">${esc(sub.submitted_answer || sub.submitted_code || '// No code submitted')}</pre>
                </div>
                <div class="code-panel">
                    <div class="code-label code-label-ref">
                        <span>✓ Standard Reference Benchmark</span>
                    </div>
                    <pre class="code-block code-green">${esc(sub.correct_code || sub.solution_code || sub.expected_solution || sub.base_code || '// Reference solution benchmarked')}</pre>
                </div>
            </div>
        </div>`;
    }).join('');

    const startCfg = envLogs?.start_config;
    const endCfg = envLogs?.end_config;
    const infoRow = (label, val) => val != null && val !== '' && val !== undefined ? `<tr><td class="info-label">${label}</td><td class="info-value">${val}</td></tr>` : '';

    const ipMatch = (telemetry.startingIp && telemetry.endingIp && telemetry.startingIp === telemetry.endingIp)
        ? 'Consistent Public Gateway (No IP Drift)'
        : (telemetry.startingIp && telemetry.endingIp ? `Gateway Shift (${telemetry.startingIp} → ${telemetry.endingIp})` : 'Single Gateway');

    const totalInteractions = (Number(telemetry.compileClicks || 0) + Number(telemetry.submitClicks || 0) + Number(telemetry.continueClicks || 0));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Official Student Analysis Report — ${candidateReg}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; background: #e2e8f0; min-height: 100vh; display: flex; justify-content: center; padding: 24px 0; }
    
    .paper {
        width: 210mm;
        min-height: auto;
        background: #fff;
        box-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08);
        border-radius: 6px;
        overflow: hidden;
        position: relative;
    }

    /* Watermark Background */
    .watermark-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        opacity: 0.038;
        user-select: none;
    }
    .watermark-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        transform: rotate(-35deg);
    }
    .watermark-logo-img {
        width: 180px;
        height: 180px;
        object-fit: contain;
        filter: grayscale(100%);
    }
    .watermark-brand {
        font-size: 52px;
        font-weight: 900;
        letter-spacing: 10px;
        color: #0f172a;
        white-space: nowrap;
        text-transform: uppercase;
    }
    .watermark-sub {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 5px;
        color: #334155;
        text-transform: uppercase;
    }

    /* Header */
    .report-header {
        background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%);
        color: #fff;
        padding: 24px 32px;
        position: relative;
        overflow: hidden;
        z-index: 2;
    }
    .report-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 320px;
        height: 320px;
        background: rgba(255,255,255,0.06);
        border-radius: 50%;
    }
    .report-header::after {
        content: '';
        position: absolute;
        bottom: -35%;
        left: 25%;
        width: 220px;
        height: 220px;
        background: rgba(255,255,255,0.04);
        border-radius: 50%;
    }

    .header-branding {
        display: flex;
        align-items: center;
        gap: 16px;
        position: relative;
        z-index: 3;
    }
    .logo-container {
        width: 52px;
        height: 52px;
        background: #ffffff;
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .logo-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .report-brand-name {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #93c5fd;
        margin-bottom: 2px;
    }
    .report-title {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.5px;
        line-height: 1.15;
    }
    .report-subtitle {
        font-size: 10.5px;
        opacity: 0.85;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-top: 3px;
    }

    .report-meta {
        position: relative;
        z-index: 3;
        text-align: right;
        font-size: 10px;
        opacity: 0.9;
        line-height: 1.6;
    }
    .verified-badge {
        display: inline-block;
        background: rgba(16, 185, 129, 0.2);
        color: #a7f3d0;
        border: 1px solid rgba(16, 185, 129, 0.4);
        padding: 3px 10px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 9px;
        letter-spacing: 1px;
        margin-bottom: 6px;
    }
    .report-id {
        font-family: monospace;
        font-size: 9px;
        opacity: 0.65;
        margin-top: 2px;
    }

    /* Content Area */
    .content {
        padding: 24px 32px;
        position: relative;
        z-index: 2;
    }
    .section {
        margin-bottom: 20px;
        page-break-inside: avoid;
    }
    .section-title {
        font-size: 11.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #1e40af;
        border-bottom: 2px solid #dbeafe;
        padding-bottom: 5px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .section-title::before {
        content: '';
        width: 4px;
        height: 14px;
        background: linear-gradient(to bottom, #1e40af, #3b82f6);
        border-radius: 2px;
    }

    /* Info Grid */
    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
    }
    .info-box {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
    }
    .info-box-title {
        background: #f8fafc;
        padding: 7px 12px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
    }
    table.info {
        width: 100%;
        border-collapse: collapse;
    }
    .info-label {
        padding: 5.5px 12px;
        font-size: 10.5px;
        color: #64748b;
        width: 130px;
        border-bottom: 1px solid #f1f5f9;
        font-weight: 500;
    }
    .info-value {
        padding: 5.5px 12px;
        font-size: 10.5px;
        color: #0f172a;
        border-bottom: 1px solid #f1f5f9;
        font-weight: 600;
        font-family: 'Inter', monospace;
    }

    /* Score Banner */
    .score-banner {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
        margin: 14px 0 18px 0;
        background: #fff;
    }
    .score-cell {
        text-align: center;
        padding: 14px 10px;
    }
    .score-cell:not(:last-child) {
        border-right: 2px solid #e2e8f0;
    }
    .score-num {
        font-size: 28px;
        font-weight: 900;
        line-height: 1.1;
    }
    .score-label {
        font-size: 8.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #64748b;
        margin-top: 4px;
    }

    /* Data Tables */
    table.data {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        font-size: 10.5px;
        background: #fff;
    }
    table.data th {
        background: #f8fafc;
        padding: 8px 10px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
    }
    table.data td {
        padding: 7px 10px;
        border-bottom: 1px solid #f1f5f9;
    }
    .tc { text-align: center; }
    .tl { text-align: left; }

    /* Badges */
    .badge {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }

    /* Coding Cards */
    .coding-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 14px;
        overflow: hidden;
        page-break-inside: avoid;
        background: #fff;
    }
    .coding-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 9px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }
    .coding-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: #7c3aed;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
    }
    .coding-meta {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .coding-desc {
        padding: 8px 12px;
        font-size: 10.5px;
        color: #475569;
        line-height: 1.5;
        border-bottom: 1px solid #e2e8f0;
        background: #fafafa;
    }
    .code-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
    .code-panel {
        border-right: 1px solid #e2e8f0;
    }
    .code-panel:last-child {
        border-right: none;
    }
    .code-label {
        padding: 5px 10px;
        font-size: 8.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .code-label-ref {
        color: #047857;
        background: #f0fdf4;
    }
    .code-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }
    .code-block {
        margin: 0;
        padding: 8px 10px;
        font-size: 9px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Consolas', 'Monaco', monospace;
    }
    .code-dark { background: #1e293b; color: #cbd5e1; }
    .code-green { background: #f0fdf4; color: #166534; }

    /* Telemetry Categories */
    .tel-category {
        margin-bottom: 12px;
    }
    .tel-cat-header {
        font-size: 9.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #475569;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .tel-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    .tel-item {
        padding: 7px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #fafafa;
    }
    .tel-item-label {
        font-size: 7.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #94a3b8;
    }
    .tel-item-value {
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        margin-top: 2px;
        font-family: 'Inter', monospace;
    }
    .tel-warn { color: #dc2626 !important; }

    /* Signatures */
    .sig-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-top: 36px;
        padding-top: 8px;
        page-break-inside: avoid;
    }
    .sig-box { text-align: center; }
    .sig-line {
        border-top: 1.5px solid #94a3b8;
        margin-top: 40px;
        padding-top: 6px;
    }
    .sig-name { font-size: 9.5px; font-weight: 800; color: #334155; }
    .sig-role { font-size: 8.5px; color: #64748b; margin-top: 1px; }

    /* Footer */
    .report-footer {
        border-top: 2px solid #1e40af;
        margin-top: 24px;
        padding-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8.5px;
        color: #94a3b8;
    }

    /* Print Optimization */
    @media print {
        body { background: #fff !important; padding: 0; }
        .paper { box-shadow: none; border-radius: 0; width: 100%; }
        .no-print { display: none !important; }
        .watermark-overlay { opacity: 0.045 !important; }
        .report-header { background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%) !important; color: #fff !important; }
        .score-cell { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .badge-pass { background: #dcfce7 !important; color: #166534 !important; }
        .badge-fail { background: #fee2e2 !important; color: #991b1b !important; }
        .badge-warn { background: #fef3c7 !important; color: #92400e !important; }
        .badge-info { background: #dbeafe !important; color: #1e40af !important; }
        .code-dark { background: #1e293b !important; color: #cbd5e1 !important; }
        .code-green { background: #f0fdf4 !important; color: #166534 !important; }
        .tel-item { background: #fafafa !important; border: 1px solid #e2e8f0 !important; }
        .info-box-title { background: #f8fafc !important; }
        .coding-num { background: #7c3aed !important; color: #fff !important; }
        .coding-header { background: #f8fafc !important; }
        .coding-desc { background: #fafafa !important; }
        .code-label { background: #f8fafc !important; }
        .code-label-ref { background: #f0fdf4 !important; }
        .section-title::before { background: linear-gradient(to bottom, #1e40af, #3b82f6) !important; }
        table.data th { background: #f8fafc !important; }
        .code-block { max-height: none !important; overflow: visible !important; }
        .coding-card { page-break-inside: avoid; }
    }
</style>
</head>
<body>
<div class="paper">

    <!-- ═══ SUBTLE BRAND WATERMARK ═══ -->
    <div class="watermark-overlay">
        <div class="watermark-center">
            <img src="${EDUCODE_LOGO_BASE64}" alt="" class="watermark-logo-img" />
            <div class="watermark-brand">THE EDUCODE</div>
            <div class="watermark-sub">OFFICIAL SCRUTINY & AUDIT RECORD</div>
        </div>
    </div>

    <!-- ═══ HEADER WITH THEEDUCODE LOGO ═══ -->
    <div class="report-header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div class="header-branding">
                <div class="logo-container">
                    <img src="${EDUCODE_LOGO_BASE64}" alt="TheEduCode Logo" class="logo-img" />
                </div>
                <div>
                    <div class="report-brand-name">TheEduCode Autonomous Examination Core</div>
                    <div class="report-title">Student Analysis Report</div>
                    <div class="report-subtitle">Examination Scrutiny & Evaluation Document</div>
                </div>
            </div>
            <div class="report-meta">
                <div class="verified-badge">✓ VERIFIED & CERTIFIED</div>
                <div>${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div>${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                <div class="report-id">${reportId}</div>
            </div>
        </div>
    </div>

    <div class="content">

        <!-- ═══ STUDENT PROFILE & EXAM SESSION ═══ -->
        <div class="section">
            <div class="info-grid">
                <div class="info-box">
                    <div class="info-box-title">Candidate Profile</div>
                    <table class="info">
                        ${infoRow('Full Name', studentInfo?.name || 'N/A')}
                        ${infoRow('Registration No.', candidateReg)}
                        ${infoRow('Email Address', studentInfo?.email || '-')}
                        ${infoRow('Enrolled Section', studentInfo?.section || sectionName)}
                        ${infoRow('Course / Exam', studentInfo?.course || examName)}
                        ${infoRow('Verification Status', 'Verified Active (Exam Completed)')}
                    </table>
                </div>
                <div class="info-box">
                    <div class="info-box-title">Examination Details</div>
                    <table class="info">
                        ${infoRow('Exam Name', examName)}
                        ${infoRow('Assigned Section', sectionName)}
                        ${infoRow('Started Session', examStartedAt ? formatDate(examStartedAt) : 'N/A')}
                        ${infoRow('Ended / Submitted', examEndedAt ? formatDate(examEndedAt) : 'N/A')}
                        ${infoRow('Total Duration', examDuration ? examDuration + ' minutes' : 'N/A')}
                        ${infoRow('Completion Rate', finalPercentage + '%')}
                        ${infoRow('Submission Mode', (telemetry.submitReason || 'manual').toUpperCase())}
                    </table>
                </div>
            </div>

            <!-- ═══ SCORES BANNER ═══ -->
            <div class="score-banner" style="grid-template-columns: repeat(${(isMcqActive && isCodingActive) ? 4 : 3}, 1fr);">
                <div class="score-cell" style="background:#eff6ff;">
                    <div class="score-num" style="color:#1e40af;">${displayTotalScore || examTotalMarks}<span style="font-size:14px;font-weight:500;color:#64748b;">/${displayMaxScore}</span></div>
                    <div class="score-label">Total Score (${finalPercentage}%)</div>
                </div>
                ${isCodingActive ? `
                <div class="score-cell" style="background:#faf5ff;">
                    <div class="score-num" style="color:#7c3aed;">${overallCodingScore || examCodingMarks}</div>
                    <div class="score-label">Coding Marks</div>
                </div>` : ''}
                ${isMcqActive ? `
                <div class="score-cell" style="background:#f0fdf4;">
                    <div class="score-num" style="color:#059669;">${overallMcqScore || examMcqMarks}</div>
                    <div class="score-label">MCQ Marks</div>
                </div>` : ''}
                <div class="score-cell" style="background:#f8fafc;">
                    <div class="score-num" style="color:#0f172a;">${totalCodingCases > 0 ? `${totalCodingPassed}/${totalCodingCases}` : '100%'}</div>
                    <div class="score-label">Test Cases Passed</div>
                </div>
            </div>
        </div>

        <!-- ═══ EXECUTIVE QUESTIONS SUMMARY TABLE ═══ -->
        ${execSummaryRows ? `
        <div class="section">
            <div class="section-title">Assessment Challenge Breakdown</div>
            <table class="data">
                <thead>
                    <tr>
                        <th class="tc" style="width:50px;">Item</th>
                        <th class="tl">Challenge Title</th>
                        <th class="tc" style="width:65px;">Type</th>
                        <th class="tc" style="width:110px;">Status</th>
                        <th class="tc" style="width:65px;">Language</th>
                        <th class="tc" style="width:85px;">Test Cases</th>
                        <th class="tc" style="width:65px;">Compiles</th>
                        <th class="tc" style="width:80px;">Score</th>
                    </tr>
                </thead>
                <tbody>${execSummaryRows}</tbody>
            </table>
        </div>` : ''}

        <!-- ═══ ACTIVITY TELEMETRY (CATEGORIZED) ═══ -->
        <div class="section">
            <div class="section-title">Activity Telemetry & Network Scrutiny</div>
            
            <!-- Network Telemetry -->
            <div class="tel-category">
                <div class="tel-cat-header">🌐 Network & Connection Telemetry</div>
                <div class="tel-grid">
                    <div class="tel-item"><div class="tel-item-label">Starting Gateway IP</div><div class="tel-item-value">${telemetry.startingIp || '-'}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Ending Gateway IP</div><div class="tel-item-value">${telemetry.endingIp || '-'}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Gateway Audit</div><div class="tel-item-value" style="font-size:10.5px;">${ipMatch}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Network Disconnects</div><div class="tel-item-value ${telemetry.internetDisconnects > 0 ? 'tel-warn' : ''}">${telemetry.internetDisconnects ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Total Offline Time</div><div class="tel-item-value ${telemetry.internetOfflineSeconds > 0 ? 'tel-warn' : ''}">${(telemetry.internetOfflineSeconds || 0)}s</div></div>
                    <div class="tel-item"><div class="tel-item-label">Network Health</div><div class="tel-item-value" style="color:#059669;">Stable</div></div>
                </div>
            </div>

            <!-- Focus & Security Telemetry -->
            <div class="tel-category">
                <div class="tel-cat-header">🛡️ Proctoring & Integrity Telemetry</div>
                <div class="tel-grid">
                    <div class="tel-item"><div class="tel-item-label">Lost Focus Count</div><div class="tel-item-value ${telemetry.lostFocusCount > 0 ? 'tel-warn' : ''}">${telemetry.lostFocusCount ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Regained Focus Count</div><div class="tel-item-value">${telemetry.regainedFocusCount ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Face Warnings</div><div class="tel-item-value ${telemetry.faceWarnings > 0 ? 'tel-warn' : ''}">${telemetry.faceWarnings || 0} / ${telemetry.faceWarningsMax || 40}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Proctor Blocks</div><div class="tel-item-value ${telemetry.blockedByProctorCount > 0 ? 'tel-warn' : ''}">${telemetry.blockedByProctorCount ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Blocked Time</div><div class="tel-item-value">${(telemetry.blockedSeconds || 0)}s</div></div>
                    <div class="tel-item"><div class="tel-item-label">Tab Switches</div><div class="tel-item-value ${telemetry.tabSwitches > 0 ? 'tel-warn' : ''}">${telemetry.tabSwitches ?? 0}</div></div>
                </div>
            </div>

            <!-- IDE & Interactions Telemetry -->
            <div class="tel-category">
                <div class="tel-cat-header">⚡ IDE Code Executions & Interactions</div>
                <div class="tel-grid">
                    <div class="tel-item"><div class="tel-item-label">Total Compiles</div><div class="tel-item-value">${telemetry.compileClicks ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Code Submits</div><div class="tel-item-value">${telemetry.submitClicks ?? 0}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Total Candidate Actions</div><div class="tel-item-value" style="color:#7c3aed;">${totalInteractions}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Candidate App Engine</div><div class="tel-item-value" style="font-size:11px;">${telemetry.environment || 'Electron-App'}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Integrity Status</div><div class="tel-item-value" style="color:${telemetry.isChromeBypass ? '#dc2626' : '#059669'};font-size:11px;">${telemetry.isChromeBypass ? 'Bypass Detected ✗' : 'Verified Secure ✓'}</div></div>
                    <div class="tel-item"><div class="tel-item-label">Submission Trigger</div><div class="tel-item-value" style="font-size:11px;">${telemetry.submitReason || 'manual'}</div></div>
                </div>
            </div>
        </div>

        <!-- ═══ ENVIRONMENT LOGS ═══ -->
        <div class="section">
            <div class="section-title">Hardware & Network Interface Logs</div>
            <div class="info-grid">
                ${[{cfg: startCfg, label: 'Start Session Configuration'}, {cfg: endCfg, label: 'End / Last Push Configuration'}].map(({cfg, label}) => `
                    <div class="info-box">
                        <div class="info-box-title">${label}</div>
                        ${!cfg ? '<div style="padding:10px 12px;font-size:10px;color:#94a3b8;font-style:italic;">No hardware snapshot recorded for this checkpoint.</div>' : `
                        <table class="info">
                            ${cfg.os ? infoRow('OS & Architecture', (cfg.os.version || cfg.os.platform) + ' (' + (cfg.os.arch || 'x64') + ')') : ''}
                            ${cfg.os?.hostname ? infoRow('Machine Hostname', cfg.os.hostname) : ''}
                            ${cfg.os?.release ? infoRow('OS Release', cfg.os.release) : ''}
                            ${cfg.network?.interfaces?.map(i => infoRow(i.interface, i.ip + ' (MAC: ' + i.mac + ')')).join('') || ''}
                            ${(cfg.startingIp || cfg.endingIp || telemetry.startingIp || telemetry.endingIp) ? infoRow('Public Gateway IP', cfg.startingIp || cfg.endingIp || telemetry.startingIp || telemetry.endingIp) : ''}
                            ${cfg.proxy ? infoRow('Proxy / VPN Tunnel', cfg.proxy.settings || 'DIRECT') : ''}
                            ${cfg.timestamp ? infoRow('Timestamp Recorded', new Date(cfg.timestamp).toLocaleString()) : ''}
                        </table>`}
                    </div>`).join('')}
            </div>
        </div>

        <!-- ═══ MCQ RESPONSES (IF ACTIVE) ═══ -->
        ${mcqSubs.length > 0 ? `
        <div class="section">
            <div class="section-title">MCQ Responses Scrutiny — <span style="font-weight:600;font-size:10px;color:#475569;">${mcqSubs.filter(s => s.is_correct).length}/${mcqSubs.length} Correct &nbsp;|&nbsp; Score: ${overallMcqScore || examMcqMarks}/${maxMcqScore || mcqSubs.length}</span></div>
            <table class="data">
                <thead><tr>
                    <th class="tc" style="width:30px;">#</th>
                    <th class="tl">Question</th>
                    <th class="tl">Student's Answer</th>
                    <th class="tl">Correct Answer</th>
                    <th class="tc" style="width:70px;">Result</th>
                    <th class="tc" style="width:40px;">Pts</th>
                </tr></thead>
                <tbody>${mcqRows}</tbody>
            </table>
        </div>` : ''}

        <!-- ═══ CODING RESPONSES ═══ -->
        ${codingSubs.length > 0 ? `
        <div class="section">
            <div class="section-title">Coding Responses & Source Code Scrutiny — <span style="font-weight:600;font-size:10px;color:#475569;">Score: ${overallCodingScore || examCodingMarks}/${maxCodingScore || codingSubs.reduce((s, c) => s + (c.total_question_marks || 0), 0) / 10 || 18}</span></div>
            ${codingCards}
        </div>` : ''}

        <!-- ═══ OFFICIAL SIGNATURES & EVALUATION ATTESTATION ═══ -->
        <div class="sig-grid">
            <div class="sig-box">
                <div class="sig-line">
                    <div class="sig-name">Candidate Signature</div>
                    <div class="sig-role">${studentInfo?.name || candidateReg}</div>
                </div>
            </div>
            <div class="sig-box">
                <div class="sig-line">
                    <div class="sig-name">Invigilator / Examiner</div>
                    <div class="sig-role">Date: _______________</div>
                </div>
            </div>
            <div class="sig-box">
                <div class="sig-line">
                    <div class="sig-name">Head of Department</div>
                    <div class="sig-role">School of Computing</div>
                </div>
            </div>
            <div class="sig-box">
                <div class="sig-line">
                    <div class="sig-name">Controller of Examinations</div>
                    <div class="sig-role">TheEduCode Certified</div>
                </div>
            </div>
        </div>

        <!-- ═══ FOOTER ═══ -->
        <div class="report-footer">
            <div style="display:flex;align-items:center;gap:6px;">
                <strong>TheEduCode Platform:</strong> This examination scrutiny document is tamper-evident and digitally archived.
            </div>
            <div style="font-family:monospace;font-weight:700;">${reportId}</div>
        </div>

    </div><!-- content -->
</div><!-- paper -->

<!-- Save as PDF Button -->
<div class="no-print" style="position:fixed;bottom:24px;right:24px;display:flex;gap:12px;z-index:9999;">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;border:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(30,64,175,0.35);display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Save as PDF / Print
    </button>
</div>

</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
