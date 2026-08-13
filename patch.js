const fs = require('fs');
const path = 'c:/Users/Saifs/Educode/new_admin_portal/src/components/DeepDive/StudentDetailView.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add progressMode state
content = content.replace(
    /const \[overallCourseProgress, setOverallCourseProgress\] = useState\(0\);/,
    "const [overallCourseProgress, setOverallCourseProgress] = useState(0);\n    const [progressMode, setProgressMode] = useState('attempts');"
);

// 2. Add the useEffect for dynamic calculation
const effectCode = `
    useEffect(() => {
        if (!courseStructure || !Array.isArray(courseStructure)) return;

        let totalCompletion = 0;
        const newUnitCompletions = {};
        const newUnitBreakdowns = {};

        courseStructure.forEach(unit => {
            let unitTotalProgress = 0;
            const subUnitBreakdown = [];
            
            unit.sub_units?.forEach(su => {
                let suProgress = su.progress || 0;
                
                if (progressMode === 'attempts' && su.details) {
                    const { has_mcq, mcq_submitted, has_coding, coding_submitted } = su.details;
                    if (has_mcq && has_coding) {
                        suProgress = 0;
                        if (mcq_submitted) suProgress += 50;
                        if (coding_submitted) suProgress += 50;
                    } else if (has_mcq) {
                        suProgress = mcq_submitted ? 100 : 0;
                    } else if (has_coding) {
                        suProgress = coding_submitted ? 100 : 0;
                    } else {
                        suProgress = su.progress || 0;
                    }
                }
                
                unitTotalProgress += suProgress;
                subUnitBreakdown.push({
                    sub_unit_id: su.sub_unit_id,
                    progress_percentage: suProgress,
                    details: su.details || {}
                });
            });

            const unitProgress = unit.sub_units?.length > 0 ? Math.round(unitTotalProgress / unit.sub_units.length) : (progressMode === 'marks' ? (unit.analytics?.completion_rate || 0) : 0);
            
            newUnitCompletions[unit.unit_id] = unitProgress;
            newUnitBreakdowns[unit.unit_id] = subUnitBreakdown;
            totalCompletion += unitProgress;
        });

        setUnitCompletions(newUnitCompletions);
        setUnitBreakdowns(newUnitBreakdowns);
        setOverallCourseProgress(courseStructure.length > 0 ? Math.round(totalCompletion / courseStructure.length) : 0);
    }, [courseStructure, progressMode]);
`;

content = content.replace(
    /const \[overallCourseProgress, setOverallCourseProgress\] = useState\(0\);\n    const \[progressMode, setProgressMode\] = useState\('attempts'\);/,
    "const [overallCourseProgress, setOverallCourseProgress] = useState(0);\n    const [progressMode, setProgressMode] = useState('attempts');\n" + effectCode
);

// 3. Remove manual setting logic using Regex matching the block
const blockToRemove = /\/\/ Map the unified response into the separate states expected by the UI[\s\S]*?setOverallCourseProgress\(structure\.length > 0 \? Math\.round\(totalCompletion \/ structure\.length\) : 0\);/g;

content = content.replace(blockToRemove, 'setCourseStructure(structure);');

// 4. Inject the UI toggle
const toggleUI = `
                                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg mt-4 w-full">
                                        <button onClick={() => setProgressMode('attempts')} className={\`flex-1 p-2 rounded-md text-xs font-medium transition-colors \${progressMode === 'attempts' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}\`}>Completion (Attempted)</button>
                                        <button onClick={() => setProgressMode('marks')} className={\`flex-1 p-2 rounded-md text-xs font-medium transition-colors \${progressMode === 'marks' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}\`}>Completion (Marks)</button>
                                    </div>
`;

content = content.replace(
    /(<div className="text-xs text-gray-500 dark:text-gray-400">Based on completed units<\/div>\s*<\/div>\s*<\/div>)/g,
    "$1" + toggleUI
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated StudentDetailView.js');
