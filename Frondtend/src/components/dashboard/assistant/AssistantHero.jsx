import Image from "next/image";

export default function AssistantHero({
  title = "How can I help?",
  subtitle = "Ask about any workflow in the Command Center.",
  avatarSrc = "/dashboard/icons/assistant-avatar.svg",
}) {
  return (
    <div className="flex flex-col gap-4 items-center text-center w-full">
      <div className="relative overflow-hidden rounded-full size-12">
        <Image src={avatarSrc} alt="" fill className="object-cover" />
      </div>
      <div className="flex flex-col gap-2 items-center text-center">
        <p className="font-montserrat font-bold text-[16px] text-foreground">{title}</p>
        <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
