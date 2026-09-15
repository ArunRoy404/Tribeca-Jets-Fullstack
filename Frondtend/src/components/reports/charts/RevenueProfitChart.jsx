"use client";

import { cn } from "@/lib/utils";
import useIsDesktop from "./useIsDesktop";
import useBarColumns from "./useBarColumns";
import ChartTooltip from "./ChartTooltip";

const ROWS = 20;
const GAP = 2;
const BAR_GAP = 6;

function formatK(value) {
  return `$${Math.round(value / 1000)}k`;
}

function niceMax(rawMax) {
  const magnitude = 10 ** Math.floor(Math.log10(rawMax || 1));
  const normalized = rawMax / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export default function RevenueProfitChart({ data }) {
  const isDesktop = useIsDesktop();
  const blockSize = isDesktop ? 8 : 5;
  const { containerRef, columns: subColumns } = useBarColumns({
    itemCount: data.length,
    blockSize,
    gap: GAP,
    barGap: BAR_GAP,
  });
  const maxValue = niceMax(Math.max(...data.map((d) => d.revenue)));
  const yLabels = [4, 3, 2, 1, 0].map((n) => (maxValue * n) / 4);
  const height = ROWS * blockSize + (ROWS - 1) * GAP;
  const labelStride = isDesktop ? 1 : Math.ceil(data.length / 6);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-2 sm:gap-4">
        <div className="flex flex-col justify-between shrink-0 w-8 sm:w-11 pb-[1px]" style={{ height }}>
          {yLabels.map((label) => (
            <p key={label} className="font-montserrat font-normal text-[11px] sm:text-[14px] text-muted-foreground text-right">
              {formatK(label)}
            </p>
          ))}
        </div>

        <div ref={containerRef} className="flex-1 flex items-stretch justify-between min-w-0" style={{ height }}>
          {data.map((month) => {
            const revenueRows = Math.round((month.revenue / maxValue) * ROWS);
            const profitRows = Math.round((month.profit / maxValue) * ROWS);

            return (
              <div key={month.label} className="group relative flex h-full" style={{ gap: GAP }}>
                {Array.from({ length: subColumns }).map((_, colIdx) => (
                  <div key={colIdx} className="flex flex-col-reverse" style={{ width: blockSize, gap: GAP }}>
                    {Array.from({ length: ROWS }).map((__, rowIdx) => (
                      <div
                        key={rowIdx}
                        className={cn(
                          "rounded-[2px] shrink-0",
                          rowIdx < profitRows ? "bg-primary" : rowIdx < revenueRows ? "bg-border" : "bg-secondary"
                        )}
                        style={{ height: blockSize }}
                      />
                    ))}
                  </div>
                ))}

                <div
                  className="absolute inset-x-0 bottom-0 pointer-events-none"
                  style={{ height: `${(revenueRows / ROWS) * 100}%` }}
                >
                  <div className="absolute inset-0 hidden group-hover:block">
                    <ChartTooltip
                      label={month.label}
                      rows={[
                        { label: "Revenue", value: formatK(month.revenue), color: "var(--color-border)" },
                        { label: "Profit", value: formatK(month.profit), color: "var(--color-primary)" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pl-8 sm:pl-11 ml-2 sm:ml-4">
        {data.map((month, i) => (
          <span
            key={month.label}
            className="font-montserrat font-normal text-[11px] sm:text-[14px] text-muted-foreground text-center shrink-0"
            style={{ width: subColumns * blockSize + (subColumns - 1) * GAP }}
          >
            {i % labelStride === 0 ? month.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
