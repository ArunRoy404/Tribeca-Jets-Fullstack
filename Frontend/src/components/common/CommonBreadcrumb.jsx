import * as React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function CommonBreadcrumb({ items = [], className }) {
  if (!items?.length) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="font-montserrat text-[12px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item?.label}</BreadcrumbPage>
                ) : item?.href ? (
                  <BreadcrumbLink render={<Link href={item?.href} />}>
                    {item?.label}
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground">{item?.label}</span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
