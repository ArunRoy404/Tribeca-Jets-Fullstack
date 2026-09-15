import Image from "next/image";

const stats = [
  { value: "240+", label: "Active Clients" },
  { value: "$18M", label: "YTD Revenue" },
  { value: "96%", label: "Trip Success" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <div className="relative hidden w-1/2 shrink-0 overflow-hidden lg:block">
        <Image src="/auth/bg/hero.png" alt="" fill priority className="object-cover" sizes="50vw" />
        <div className="absolute inset-0 bg-[rgba(13,18,32,0.6)]" />
        <Image
          src="/auth/img/ellipse-glow.svg"
          alt=""
          width={1985.2}
          height={1591.2}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[1591.2px] w-[1985.2px] -translate-x-1/2 -translate-y-1/2"
        />

        <Image src="/auth/img/logo-white.svg" alt="Tribeca Jets" width={168} height={100} className="absolute left-20 top-12 h-[100px] w-[168px]" />

        <div className="absolute left-1/2 top-1/2 flex w-[457px] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 pt-16">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="h-px w-[38px] bg-white" />
              <p className="font-montserrat font-medium text-[14px] text-white">Command Center</p>
            </div>
            <div className="font-montserrat font-bold text-[32px] leading-tight text-white">
              <p>Private aviation.</p>
              <p>Precision execution.</p>
            </div>
            <p className="font-montserrat font-normal text-[14px] text-border">
              Your integrated workspace for managing clients, charter trips, operators, and revenue — built for
              professional brokers.
            </p>
          </div>

          <div className="flex w-full">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-1 flex-col gap-2 p-4">
                <p className="font-montserrat font-bold text-[24px] text-purple">{stat.value}</p>
                <p className="font-montserrat font-normal text-[12px] text-white">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">{children}</div>
    </div>
  );
}
