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
    // We use dynamicTyping: false to preserve exact string representations (e.g. "0.80" vs "0.8")
    // We use header: false to get a raw grid
    const { data } = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false, // Keep empty lines to preserve file structure vertically
    });
    return data as string[][];
};

export const getWeeksFromRaw = (rawRows: string[][]): TrainingWeek[] => {
    // Data starts at index 10 (line 11)
    // Structure:
    // 0-2: Empty
    // 3: Weeks until race
    // 4: Fraction
    // 5: Q1 Desc
    // 6: Q1 Notes
    // 7: Q2 Desc
    // 8: Q2 Notes
    // 9: Easy Mileage
    // 10: Actual
    // 11: Difference
    // 12: Weekly Notes

    const weeks: TrainingWeek[] = [];

    // Slice from line 10 to end
    // Loop through and map safely
    for (let i = 10; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length < 5) continue; // Skip evidently empty/malformed rows

        // Helper
        const getNum = (idx: number) => {
            const val = row[idx];
            if (!val) return undefined;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? undefined : parsed;
        };
        const getStr = (idx: number) => row[idx] || '';

        const w: TrainingWeek = {
            weeksUntilRace: getNum(3) || 0,
            fractionOfPeak: getNum(4) || 0,
            q1: {
                description: getStr(5),
                notes: getStr(6),
            },
            q2: {
                description: getStr(7),
                notes: getStr(8),
            },
            weeklyEasyMileage: getNum(9) || 0,
            actualMileage: getNum(10),
            difference: getNum(11),
            notes: getStr(12)
        };

        // Filter based on existing valid data to avoid showing empty trailing rows
        if (w.weeksUntilRace !== 0 || w.q1.description !== '') {
            weeks.push(w);
        }
    }
    return weeks;
};

export const updateRawData = (rawRows: string[][], weekIndex: number, updatedWeek: TrainingWeek): string[][] => {
    // The first week in `weeks` corresponds to rawRows[10].
    // weekIndex 0 -> rawRows[10]

    const targetRowIndex = 10 + weekIndex;

    if (targetRowIndex >= rawRows.length) return rawRows; // Out of bounds?

    const newRows = [...rawRows]; // Shallow copy array
    const newRow = [...(newRows[targetRowIndex] || [])]; // Shallow copy row

    // Ensure row has enough columns
    while (newRow.length < 13) newRow.push('');

    // Update ONLY editable fields
    // Actual: Index 10
    newRow[10] = updatedWeek.actualMileage !== undefined ? String(updatedWeek.actualMileage) : '';

    // Weekly Notes: Index 12
    newRow[12] = updatedWeek.notes || '';

    // Q1 Notes: Index 6
    newRow[6] = updatedWeek.q1.notes || '';

    // Q2 Notes: Index 8
    newRow[8] = updatedWeek.q2.notes || '';

    newRows[targetRowIndex] = newRow;
    return newRows;
};

export const rawToCSV = (rawRows: string[][]): string => {
    return Papa.unparse(rawRows, {
        quotes: true, // Force quotes for safety, or let Papa decide?
        // If we want "exact as possible", maybe default is better.
        // Papa defaults to quoting only when necessary.
    });
};
