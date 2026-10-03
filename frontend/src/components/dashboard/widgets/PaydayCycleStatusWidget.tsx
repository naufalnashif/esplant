import React from "react";
import { FinancialCycleBanner } from "@/components/FinancialCycleBanner";
import type { FinanceState } from "@/lib/localDb";

export interface PaydayCycleStatusWidgetProps {
  state: FinanceState;
  onOpenEditCycle: () => void;
}

export const PaydayCycleStatusWidget: React.FC<PaydayCycleStatusWidgetProps> = ({
  state,
  onOpenEditCycle,
}) => {
  return (
    <div data-testid="payday-cycle-widget" className="w-full">
      <FinancialCycleBanner state={state} onOpenEditCycle={onOpenEditCycle} />
    </div>
  );
};
