import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const logDir = 'e:/MOHIT/EducodeCode/new-testing-chnges/logs';

export async function POST(req) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ success: true });
    }
    
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const data = await req.json();
        const filePath = path.join(logDir, 'admin-portal.log');
        const timestamp = new Date().toISOString();
        const logEntry = `\n[${timestamp}]\n${JSON.stringify(data, null, 2)}\n${'-'.repeat(80)}\n`;
        
        fs.appendFileSync(filePath, logEntry, 'utf8');
        return NextResponse.json({ success: true });
    } catch (e) {
        console.warn('[DevLogger] Failed to write admin portal log, skipping:', e.message);
        return NextResponse.json({ success: true, warning: 'Logging disabled due to file system restrictions' });
    }
}
