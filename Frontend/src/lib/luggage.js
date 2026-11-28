/** Staff-only display; zero bags is a real value and missing weight stays absent. */
export function formatLuggage(record) {
  return [
    record?.luggageCount != null ? `${record.luggageCount} ${record.luggageCount === 1 ? "bag" : "bags"}` : null,
    record?.luggageWeightLb != null ? `${record.luggageWeightLb} lb` : null,
  ].filter(Boolean).join(" · ") || "—";
}
