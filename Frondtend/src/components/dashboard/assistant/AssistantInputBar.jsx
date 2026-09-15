import Image from "next/image";

export default function AssistantInputBar({ message, setMessage, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(message, e);
      }}
      className="bg-white flex gap-4 items-center justify-center px-4 py-4 w-full border-t border-border"
    >
      <Image src="/dashboard/icons/assistant-attach.svg" alt="" width={24} height={24} className="shrink-0" />
      <input
        type="text"
        value={message ?? ""}
        onChange={(e) => setMessage?.(e.target.value)}
        placeholder="Share what's on your mind..."
        className="flex-1 min-w-0 bg-transparent font-montserrat font-medium text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
      />
      <button
        type="submit"
        className="bg-purple flex items-center justify-center rounded-full shrink-0 size-10 cursor-pointer hover:opacity-90 transition-opacity"
      >
        <Image src="/dashboard/icons/assistant-send.svg" alt="Send" width={24} height={24} />
      </button>
    </form>
  );
}
