"use client";

import useIsDesktop from "./useIsDesktop";
import useBarColumns from "./useBarColumns";
import ChartTooltip from "./ChartTooltip";

const ROWS = 20;
const GAP = 2;
const BAR_GAP = 6;

export default function TripsLineChart({ data }) {
  const isDesktop = useIsDesktop();
  const blockSize = isDesktop ? 8 : 5;
  const { containerRef, columns: subColumns, containerWidth } = useBarColumns({
    itemCount: data.length,
    blockSize,
    gap: GAP,
    barGap: BAR_GAP,
  });
  const maxValue = Math.max(16, ...data.map((d) => d.trips));
  const yLabels = [4, 3, 2, 1, 0].map((n) => Math.round((maxValue * n) / 4));
  const height = ROWS * blockSize + (ROWS - 1) * GAP;

  const barWidth = subColumns * blockSize + (subColumns - 1) * GAP;
  const plotWidth = containerWidth || data.length * (barWidth + BAR_GAP);
  const actualGap = data.length > 1 ? (plotWidth - data.length * barWidth) / (data.length - 1) : 0;
  const labelStride = isDesktop ? 1 : Math.ceil(data.length / 6);

  const points = data.map((d, i) => ({
    x: ((i * (barWidth + actualGap) + barWidth / 2) / plotWidth) * 100,
    y: 100 - (d.trips / maxValue) * 100,
  }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-2 sm:gap-4">
        <div className="flex flex-col justify-between shrink-0 w-6 sm:w-8 pb-[1px]" style={{ height }}>
          {yLabels.map((label) => (
            <p key={label} className="font-montserrat font-normal text-[11px] sm:text-[14px] text-muted-foreground text-right">
              {label}
            </p>
          ))}
        </div>

        <div ref={containerRef} className="relative flex-1 flex items-stretch justify-between min-w-0" style={{ height }}>
          {data.map((month) => {
            const rows = Math.round((month.trips / maxValue) * ROWS);
            return (
              <div key={month.label} className="group relative flex h-full" style={{ gap: GAP }}>
                {Array.from({ length: subColumns }).map((_, colIdx) => (
                  <div key={colIdx} className="flex flex-col-reverse" style={{ width: blockSize, gap: GAP }}>
                    {Array.from({ length: ROWS }).map((__, rowIdx) => (
                      <div
                        key={rowIdx}
                        className={`rounded-[2px] shrink-0 ${rowIdx < rows ? "bg-border" : "bg-secondary"}`}
                        style={{ height: blockSize }}
                      />
                    ))}
                  </div>
                ))}

                <div
                  className="absolute inset-x-0 bottom-0 pointer-events-none"
                  style={{ height: `${(rows / ROWS) * 100}%` }}
                >
                  <div className="absolute inset-0 hidden group-hover:block">
                    <ChartTooltip
                      label={month.label}
                      rows={[{ label: "Trips", value: month.trips, color: "var(--color-primary)" }]}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute size-2 rounded-full bg-primary border-2 border-white pointer-events-none"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pl-6 sm:pl-8 ml-2 sm:ml-4">
        {data.map((month, i) => (
          <span
            key={month.label}
            className="font-montserrat font-normal text-[11px] sm:text-[14px] text-muted-foreground text-center shrink-0"
            style={{ width: barWidth }}
          >
            {i % labelStride === 0 ? month.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
