import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export interface KpiCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly description?: ReactNode;
  readonly title: ReactNode;
  readonly value: ReactNode;
}

export function KpiCard({ className, description, title, value, ...props }: KpiCardProps): ReactNode {
  return (
    <article className={clsx("dl-kpi", className)} {...props}>
      <span className="dl-kpi__title">{title}</span>
      <strong className="dl-kpi__value">{value}</strong>
      {description ? <small className="dl-kpi__description">{description}</small> : null}
    </article>
  );
}
