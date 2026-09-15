import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function IconInput({ icon: Icon, iconClassName, className, containerClassName, ...props }) {
  return (
    <div className={cn("relative w-full", containerClassName)}>
      <Input className={cn("h-11 pr-10 rounded-md font-montserrat text-[13px]", className)} {...props} />
      {Icon && (
        <Icon className={cn("absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none", iconClassName)} />
      )}
    </div>
  );
}
