"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  variant?: "default" | "secondary" | "outline" | "ghost" | "navy";
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function LogoutButton({ variant = "secondary", size = "sm", className }: LogoutButtonProps) {
  return (
    <form action="/api/logout" method="post">
      <Button type="submit" variant={variant} size={size} className={className}>
        <LogOut className="mr-2 h-4 w-4" aria-hidden />
        Log out
      </Button>
    </form>
  );
}
