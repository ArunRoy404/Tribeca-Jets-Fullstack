import Image from "next/image";
import Link from "next/link";

export default function SectionHeader({
  title,
  badgeCount,
  rightText,
  rightHref,
  onRightClick,
  rightIcon,
  className = "",
}) {
  return (
    <div className={`relative flex items-center justify-between p-4 w-full bg-sidebar ${className}`}>
      <div className="flex gap-2 items-center min-w-0">
        <p className="font-montserrat font-bold text-[16px] text-white whitespace-nowrap truncate">{title}</p>
        {badgeCount !== undefined && (
          <div className="bg-white flex items-center justify-center rounded-full size-5 shrink-0">
            <p className="font-montserrat font-bold text-[10px] text-sidebar">{badgeCount}</p>
          </div>
        )}
      </div>

      {rightText && rightHref && (
        <Link href={rightHref} className="font-montserrat font-bold text-[12px] text-purple hover:underline whitespace-nowrap shrink-0">
          {rightText}
        </Link>
      )}

      {rightText && !rightHref && (
        <p className="font-montserrat font-medium text-[10px] text-white whitespace-nowrap shrink-0">{rightText}</p>
      )}

      {rightIcon && (
        <button
          type="button"
          onClick={(e) => onRightClick?.(e)}
          className="flex items-center justify-center p-1 rounded size-5 cursor-pointer hover:bg-white/10 shrink-0"
        >
          <Image src={rightIcon} alt="" width={14} height={14} />
        </button>
      )}
    </div>
  );
}
