import { Button } from "@/components/ui/button";

export default function PriorityActions({ actions, markComplete, onActionClick }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap justify-start sm:justify-end shrink-0 pl-5 sm:pl-0">
      {actions?.map((action) => (
        <Button
          key={action}
          variant="secondary"
          size="sm"
          onClick={() => onActionClick?.(action)}
        >
          {action}
        </Button>
      ))}
      {markComplete && (
        <Button
          variant="outline"
          size="sm"
          className="border-success bg-success/10 text-success hover:bg-success/20"
          onClick={() => onActionClick?.("Mark Complete")}
        >
          Mark Complete
        </Button>
      )}
    </div>
  );
}
