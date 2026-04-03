export default function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="grid gap-3 animate-pulse"
                    style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                >
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="h-8 bg-white/5 rounded" />
                    ))}
                </div>
            ))}
        </div>
    );
}
