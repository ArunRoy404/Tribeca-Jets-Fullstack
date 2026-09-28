import { create } from "zustand";
import {
  dashboardStatsRow1,
  dashboardStatsRow2,
  todaysPriorities,
  recentActivities,
  upcomingFollowUps,
  financialReceivables,
  financialPayments,
  upcomingDashboardTrips,
} from "@/dummyData/dashboard";

export const useDashboardStore = create((set) => ({
  statsRow1: dashboardStatsRow1,
  statsRow2: dashboardStatsRow2,
  todaysPriorities: todaysPriorities,
  recentActivities: recentActivities,
  upcomingFollowUps: upcomingFollowUps,
  financialReceivables: financialReceivables,
  financialPayments: financialPayments,
  upcomingDashboardTrips: upcomingDashboardTrips,

  setStatsRow1: (statsRow1) => set({ statsRow1 }),
  setStatsRow2: (statsRow2) => set({ statsRow2 }),
  setTodaysPriorities: (todaysPriorities) => set({ todaysPriorities }),
  setRecentActivities: (recentActivities) => set({ recentActivities }),
  setUpcomingFollowUps: (upcomingFollowUps) => set({ upcomingFollowUps }),
  setFinancialReceivables: (financialReceivables) => set({ financialReceivables }),
  setFinancialPayments: (financialPayments) => set({ financialPayments }),
  setUpcomingDashboardTrips: (upcomingDashboardTrips) => set({ upcomingDashboardTrips }),
}));
