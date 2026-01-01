import React from 'react';
import { CheckCircle2, Circle, Dumbbell, MapPin, StickyNote, Activity } from 'lucide-react';
import type { TrainingWeek, Workout } from '../lib/parser';
import { cn } from '../lib/utils';

interface WeekCardProps {
    week: TrainingWeek;
    isCurrent?: boolean;
    onUpdate: (updatedWeek: TrainingWeek) => void;
}

const WorkoutSection = ({ title, workout, colorClass, onNotesChange }: { title: string, workout: Workout, colorClass: string, onNotesChange: (notes: string) => void }) => (
    <div className={cn("p-4 rounded-xl bg-white/5 border border-white/10 flex-1 min-w-[300px] flex flex-col", colorClass)}>
        <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4 opacity-70" />
            <h4 className="font-semibold text-sm uppercase tracking-wider opacity-70">{title}</h4>
        </div>
        <p className="text-lg font-medium leading-relaxed mb-4">
            {workout.description || "Rest / Easy"}
        </p>

        <div className="mt-auto group/notes">
            <label className="text-[10px] uppercase tracking-wider opacity-30 mb-1 block group-focus-within/notes:text-blue-400 decoration-slice">Workout Notes</label>
            <div className="flex gap-2 items-start bg-black/20 p-2 rounded focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                <StickyNote className="w-3 h-3 mt-1 shrink-0 opacity-50" />
                <textarea
                    value={workout.notes || ''}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Add workout notes..."
                    className="w-full bg-transparent outline-none resize-y text-sm text-white/70 placeholder:text-white/20 min-h-[60px]"
                    style={{ fieldSizing: 'content' } as any}
                />
            </div>
        </div>
    </div>
);

export const WeekCard = React.forwardRef<HTMLDivElement, WeekCardProps>(({ week, isCurrent, onUpdate }, ref) => {
    const isDone = week.actualMileage !== undefined && week.actualMileage > 0;

    const handleActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            // Calculate total target: Easy + Q1 + Q2
            const targetTotal = (week.weeklyEasyMileage || 0) + (week.q1.targetDistance || 0) + (week.q2.targetDistance || 0);

            // Calculate difference: Actual - Target
            // Round to 1 decimal place
            const diff = Math.round((val - targetTotal) * 10) / 10;

            onUpdate({ ...week, actualMileage: val, difference: diff });
        } else {
            onUpdate({ ...week, actualMileage: undefined, difference: undefined });
        }
    };

    const handleWeeklyNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ ...week, notes: e.target.value });
    };

    const handleQ1NotesChange = (notes: string) => {
        onUpdate({ ...week, q1: { ...week.q1, notes } });
    };

    const handleQ2NotesChange = (notes: string) => {
        onUpdate({ ...week, q2: { ...week.q2, notes } });
    };

    return (
        <div ref={ref} className={cn(
            "rounded-2xl border transition-all duration-300 overflow-hidden group/card",
            isCurrent
                ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                : "bg-[#1a1a1a] border-white/5 hover:border-white/10 hover:bg-[#202020]"
        )}>
            {/* Header */}
            <div className={cn(
                "px-6 py-4 flex items-center justify-between border-b",
                isCurrent ? "border-blue-500/30 bg-blue-500/5 api-header" : "border-white/5 bg-white/5"
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl",
                        isCurrent ? "bg-blue-500 text-white" : "bg-white/10 text-white"
                    )}>
                        {week.weeksUntilRace}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Weeks Out</h3>
                        <p className="text-xs text-white/50 uppercase tracking-widest font-medium">
                            Peak Load: {week.fractionOfPeak * 100}%
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isDone ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Completed</span>
                        </div>
                    ) : isCurrent ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span className="text-sm font-medium">Current Week</span>
                        </div>
                    ) : (
                        <Circle className="w-5 h-5 text-white/10" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 grid gap-6">
                <div className="flex flex-wrap gap-4">
                    <WorkoutSection
                        title="Quality Session 1"
                        workout={week.q1}
                        colorClass="hover:bg-orange-500/5 hover:border-orange-500/20 transition-colors"
                        onNotesChange={handleQ1NotesChange}
                    />
                    <WorkoutSection
                        title="Quality Session 2"
                        workout={week.q2}
                        colorClass="hover:bg-purple-500/5 hover:border-purple-500/20 transition-colors"
                        onNotesChange={handleQ2NotesChange}
                    />
                </div>

                {/* Stats Footer */}
                <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/5">
                    <div className="flex flex-1 items-center gap-3">
                        <MapPin className="w-5 h-5 text-emerald-400" />
                        <div>
                            <p className="text-xs text-white/40 uppercase">Target Easy</p>
                            <p className="font-mono font-medium">{week.weeklyEasyMileage} km</p>
                        </div>
                    </div>

                    <div className="flex flex-1 items-center gap-3">
                        <Activity className={cn("w-5 h-5", isDone ? "text-blue-400" : "text-white/20")} />
                        <div>
                            <p className="text-xs text-white/40 uppercase">Actual Total</p>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    value={week.actualMileage ?? ''}
                                    onChange={handleActualChange}
                                    placeholder="0"
                                    className="bg-transparent font-mono font-medium outline-none border-b border-white/10 focus:border-blue-500 w-20 py-0.5 transition-colors placeholder:text-white/10 text-lg"
                                />
                                <span className="text-sm text-white/40">km</span>
                            </div>
                        </div>
                    </div>

                    {(week.difference !== undefined && week.difference !== 0) && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded font-mono",
                                week.difference > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                                {week.difference > 0 ? "+" : ""}{week.difference} km
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-2 group-focus-within:bg-yellow-500/10 bg-white/5 border border-white/10 group-focus-within:border-yellow-500/20 p-4 rounded-lg flex gap-3 transition-colors">
                    <StickyNote className="w-5 h-5 shrink-0 text-white/20 group-focus-within:text-yellow-500 transition-colors mt-2" />
                    <div className="w-full">
                        <label className="text-[10px] uppercase tracking-wider opacity-30 mb-1 block">Weekly Notes</label>
                        <textarea
                            value={week.notes || ''}
                            onChange={handleWeeklyNotesChange}
                            placeholder="Add generic weekly notes here..."
                            className="w-full bg-transparent outline-none resize-y text-sm text-white/80 placeholder:text-white/20 min-h-[80px]"
                            style={{ fieldSizing: 'content' } as any}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});
WeekCard.displayName = 'WeekCard';
