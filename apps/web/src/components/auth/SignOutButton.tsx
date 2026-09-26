"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";

export function SignOutButton() {
  return (
    <button className="m3-btn m3-btn-outlined is-error" onClick={() => signOut({ callbackUrl: "/" })}>
      <Icon name="logout" size={20} /><span>Đăng xuất</span>
    </button>
  );
}
