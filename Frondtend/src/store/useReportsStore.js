import { create } from "zustand";
import {
  reportsStats,
  monthlyFinancials,
  weeklyFinancials,
  yearlyFinancials,
  tripsByMonth,
  tripsByWeek,
  tripsByYear,
  brokerPerformance,
  topClientsByRevenue,
  topRoutes,
  financialSummary,
  totalOperationsCount,
} from "@/dummyData/reports";

const financialsByRange = { Weekly: weeklyFinancials, Monthly: monthlyFinancials, Yearly: yearlyFinancials };
const tripsByRange = { Weekly: tripsByWeek, Monthly: tripsByMonth, Yearly: tripsByYear };

export const useReportsStore = create((set, get) => ({
  period: "This Week",
  selectedMonth: "August 2026",
  revenueChartRange: "Monthly",
  tripsChartRange: "Monthly",

  stats: reportsStats,
  brokerPerformance,
  topClientsByRevenue,
  topRoutes,
  financialSummary,
  totalOperationsCount,

  exportModalOpen: false,
  exportScope: "current",
  exportFormat: "CSV",

  setPeriod: (period) => set({ period }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
  setRevenueChartRange: (revenueChartRange) => set({ revenueChartRange }),
  setTripsChartRange: (tripsChartRange) => set({ tripsChartRange }),

  getRevenueChartData: () => financialsByRange[get().revenueChartRange],
  getTripsChartData: () => tripsByRange[get().tripsChartRange],

  openExportModal: () => set({ exportModalOpen: true }),
  closeExportModal: () => set({ exportModalOpen: false }),
  setExportScope: (exportScope) => set({ exportScope }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
}));
