import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import {
  AccountProfileLayout,
  getAccountMetadata,
} from "@/features/account/server";

interface AccountLayoutProps {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: AccountLayoutProps): Promise<Metadata> {
  return getAccountMetadata((await params).username);
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps): Promise<JSX.Element> {
  return (
    <AccountProfileLayout username={(await params).username}>
      {children}
    </AccountProfileLayout>
  );
}
