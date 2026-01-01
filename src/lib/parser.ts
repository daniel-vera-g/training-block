import Papa from 'papaparse';

export interface Workout {
    description: string;
    notes?: string;
    targetDistance?: number;
}

export interface TrainingWeek {
    weeksUntilRace: number;
    fractionOfPeak: number;
    q1: Workout;
    q2: Workout;
    weeklyEasyMileage: number;
    actualMileage?: number;
    difference?: number;
    notes?: string;
}

export const parseRawCsv = (csvText: string): string[][] => {
    // We use dynamicTyping: false to preserve exact string representations
    // We use header: false to get a raw grid
    const { data } = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false, // Keep empty lines to preserve file structure
    });
    return data as string[][];
};

// Helper to extract distance from description
const extractDistance = (text: string): number => {
    if (!text) return 0;

    // 1. Convert specific units first
    // 400m -> 0.4k
    let processedText = text.replace(/(\d+)\s*m\b/gi, (_, val) => {
        return (parseFloat(val) / 1000) + 'k';
    });

    // 2. Normalize "13 Ez" -> "13k"
    // Match numbers followed by typical running types (Ez, Mp, Thr, I, R) BUT NOT if immediately followed by ' (minutes)
    processedText = processedText.replace(/(\d+(?:\.\d+)?)\s*(?:Ez|Mp|Thr|I|R)\b/gi, '$1k');

    // 3. Match format "Num (x or *) Num k"
    const multiRegex = /([0-9]+)\s*[x×*]\s*\(?(\d+(?:\.\d+)?)\s*k/gi;

    // 4. Match simple "Num k"
    const simpleRegex = /(\d+(?:\.\d+)?)\s*k/gi;

    let total = 0;

    // Split by '+' to separate segments logic
    const segments = processedText.split('+');

    for (const segment of segments) {
        let matched = false;

        // Check for multiplication 
        let multiMatch;
        // simpleRegex and multiRegex index handling
        multiRegex.lastIndex = 0; // Reset for each segment
        while ((multiMatch = multiRegex.exec(segment)) !== null) {
            const reps = parseFloat(multiMatch[1]);
            const dist = parseFloat(multiMatch[2]);
            total += reps * dist;
            matched = true;
        }

        if (!matched) {
            // Check for simple distance
            let match;
            simpleRegex.lastIndex = 0; // Reset for each segment
            while ((match = simpleRegex.exec(segment)) !== null) {
                total += parseFloat(match[1]);
            }
        }
    }

    return Math.round(total * 10) / 10;
};

export const getWeeksFromRaw = (rawRows: string[][]): TrainingWeek[] => {
    // Data starts at index 10 (line 11)
    // Row 10 is Header. Check header length to determine layout.
    const headerRow = rawRows[9]; // Line 10
    // Check if we have the "shifted" layout (approx 15 cols) vs original (approx 13)
    const isShiftedLayout = headerRow && headerRow.length >= 15;

    // Layout configuration
    const IDX = isShiftedLayout ? {
        WEEKS: 3,
        FRACTION: 4,
        Q1_DESC: 5,
        Q1_NOTE: 6,
        // Column 7 is extra (e.g. " for Q1")
        Q2_DESC: 8, // Shifted from 7
        Q2_NOTE: 9, // Shifted from 8
        // Column 10 is extra (e.g. " for Q2")
        EASY: 11,   // Shifted from 9
        ACTUAL: 12, // Shifted from 10
        DIFF: 13,   // Shifted from 11
        NOTES: 14   // Shifted from 12
    } : {
        WEEKS: 3,
        FRACTION: 4,
        Q1_DESC: 5,
        Q1_NOTE: 6,
        Q2_DESC: 7,
        Q2_NOTE: 8,
        EASY: 9,
        ACTUAL: 10,
        DIFF: 11,
        NOTES: 12
    };

    const weeks: TrainingWeek[] = [];

    for (let i = 10; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length < 5) continue;

        const getNum = (idx: number) => {
            const val = row[idx];
            if (!val) return undefined;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? undefined : parsed;
        };
        const getStr = (idx: number) => row[idx] || '';

        const q1Desc = getStr(IDX.Q1_DESC);
        const q2Desc = getStr(IDX.Q2_DESC);

        const w: TrainingWeek = {
            weeksUntilRace: getNum(IDX.WEEKS) || 0,
            fractionOfPeak: getNum(IDX.FRACTION) || 0,
            q1: {
                description: q1Desc,
                notes: getStr(IDX.Q1_NOTE),
                targetDistance: extractDistance(q1Desc)
            },
            q2: {
                description: q2Desc,
                notes: getStr(IDX.Q2_NOTE),
                targetDistance: extractDistance(q2Desc)
            },
            weeklyEasyMileage: getNum(IDX.EASY) || 0,
            actualMileage: getNum(IDX.ACTUAL),
            difference: getNum(IDX.DIFF),
            notes: getStr(IDX.NOTES)
        };

        if (w.weeksUntilRace !== 0 || w.q1.description !== '') {
            weeks.push(w);
        }
    }
    return weeks;
};

export const updateRawData = (rawRows: string[][], weekIndex: number, updatedWeek: TrainingWeek): string[][] => {
    const targetRowIndex = 10 + weekIndex;
    if (targetRowIndex >= rawRows.length) return rawRows;

    const headerRow = rawRows[9];
    const isShiftedLayout = headerRow && headerRow.length >= 15;

    const IDX = isShiftedLayout ? {
        Q1_NOTE: 6,
        Q2_NOTE: 9,
        ACTUAL: 12,
        DIFF: 13,
        NOTES: 14
    } : {
        Q1_NOTE: 6,
        Q2_NOTE: 8,
        ACTUAL: 10,
        DIFF: 11,
        NOTES: 12
    };

    const newRows = [...rawRows];
    // Use safe copy
    const newRow = [...(newRows[targetRowIndex] || [])];

    // Ensure row has enough columns
    const minCols = isShiftedLayout ? 15 : 13;
    while (newRow.length < minCols) newRow.push('');

    // Update fields
    newRow[IDX.ACTUAL] = updatedWeek.actualMileage !== undefined ? String(updatedWeek.actualMileage) : '';
    newRow[IDX.NOTES] = updatedWeek.notes || '';
    newRow[IDX.Q1_NOTE] = updatedWeek.q1.notes || '';
    newRow[IDX.Q2_NOTE] = updatedWeek.q2.notes || '';

    // Also update difference if provided
    newRow[IDX.DIFF] = updatedWeek.difference !== undefined ? String(updatedWeek.difference) : '';

    newRows[targetRowIndex] = newRow;
    return newRows;
};

export const rawToCSV = (rawRows: string[][]): string => {
    return Papa.unparse(rawRows, {
        quotes: true,
    });
};
