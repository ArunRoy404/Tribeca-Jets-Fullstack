export default function AssistantSuggestionItem({ suggestion, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => onClick?.(suggestion, e)}
      className="bg-white border border-purple flex items-center justify-center p-2 rounded-sm w-full cursor-pointer text-left hover:bg-purple/5 transition-colors"
    >
      <p className="flex-1 font-montserrat font-medium text-[12px] text-muted-foreground">{suggestion}</p>
    </button>
  );
}
