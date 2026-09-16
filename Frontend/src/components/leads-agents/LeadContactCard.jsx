"use client";

/**
 * LeadContactCard
 *
 * API Integration Guidelines:
 * - Data source: `lead` row mapped from `GET /api/clients/{id}`
 * - Fields:
 *   - Name: lead.name (Client.firstName + Client.lastName)
 *   - Company: lead.company (Client.companyName)
 *   - Email: lead.email (Client.email)
 *   - Phone: lead.phone (Client.phone)
 */
export default function LeadContactCard({ lead }) {
  const name = lead?.name || "—";
  const company = lead?.company && lead.company !== "—" ? lead.company : "—";
  const email = lead?.email && lead.email !== "—" ? lead.email : "—";
  const phone = lead?.phone && lead.phone !== "—" ? lead.phone : "—";

  return (
    <div className="rounded-lg border border-border p-3.5 sm:p-4 bg-white flex flex-col gap-2.5 shadow-sm">
      <h4 className="font-montserrat font-bold text-[13px] text-foreground">
        Contact
      </h4>
      <div className="flex flex-col divide-y divide-border/50 text-[11px] sm:text-[12px] font-montserrat">
        <div className="flex items-center justify-between py-2 first:pt-0">
          <span className="text-muted-foreground">Name</span>
          <span className="font-bold text-foreground">{name}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">Company</span>
          <span className="font-bold text-foreground">{company}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">Email</span>
          <span className="font-bold text-foreground truncate max-w-[170px] sm:max-w-none">
            {email}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 last:pb-0">
          <span className="text-muted-foreground">Phone</span>
          <span className="font-bold text-foreground">{phone}</span>
        </div>
      </div>
    </div>
  );
}
