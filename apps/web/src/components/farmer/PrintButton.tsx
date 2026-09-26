"use client";
import { Icon } from "@/components/ui/Icon";
export function PrintButton() {
  return <button className="m3-btn m3-btn-filled" onClick={() => window.print()}><Icon name="print" /><span>In tem</span></button>;
}
