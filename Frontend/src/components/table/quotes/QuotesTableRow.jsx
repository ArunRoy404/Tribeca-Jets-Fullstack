"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";

export default function QuotesTableRow({ item, getRowActions, onSelectQuote }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectQuote?.(item)}
    >
      <TableCell className="p-[12px] font-montserrat font-medium text-[13px] text-purple text-left whitespace-nowrap">
        <Link
          href={`/dashboard/quotes/${item?.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {item?.id}
        </Link>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[13px] text-foreground text-left whitespace-nowrap">
        {item?.client}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.broker}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-foreground">
          <span>{item?.origin}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{item?.destination}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
        {item?.date}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.aircraft}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.basePriceFormatted}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
        {item?.fetFormatted}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[13px] text-success text-center whitespace-nowrap">
        {item?.totalPriceFormatted}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
          {item?.version}
        </span>
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="flex justify-center">
          <StatusBadge status={item?.status} bordered />
        </div>
      </TableCell>
      <TableCell
        className="p-[12px] text-center whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
