"use client";

import TopNav from "./TopNav";

const currentUser = {
  name: "Ari Wohl",
  role: "Admin",
  avatarUrl: "/dashboard/icons/user-avatar.svg",
};

export default function DashboardTopNav() {
  return <TopNav user={currentUser} />;
}
