export const reportsPeriodOptions = ["Today", "This Week", "This Month", "This Year"];

export const reportsMonthOptions = ["August 2026", "July 2026", "June 2026", "Q3 2026", "Q2 2026", "YTD 2026"];

export const reportsChartRangeOptions = ["Weekly", "Monthly", "Yearly"];

export const reportsExportFormatOptions = ["CSV", "EXCEL", "PDF"];

export const reportsStats = [
  { label: "TOTAL REVENUE", value: "$284,500", tone: "success" },
  { label: "TOTAL PROFIT", value: "$42,675", tone: "info" },
  { label: "FET COLLECTED", value: "$21,338", tone: "purple" },
  { label: "TOTAL TRIPS", value: "16", tone: "warning" },
];

export const totalOperationsCount = 16;

export const monthlyFinancials = [
  { label: "Jan", revenue: 100000, profit: 45000 },
  { label: "Feb", revenue: 190000, profit: 85000 },
  { label: "Mar", revenue: 50000, profit: 22000 },
  { label: "Apr", revenue: 230000, profit: 95000 },
  { label: "May", revenue: 110000, profit: 48000 },
  { label: "Jun", revenue: 100000, profit: 50000 },
  { label: "Jul", revenue: 90000, profit: 40000 },
  { label: "Aug", revenue: 130000, profit: 58000 },
  { label: "Sep", revenue: 160000, profit: 70000 },
  { label: "Oct", revenue: 140000, profit: 60000 },
  { label: "Nov", revenue: 175000, profit: 80000 },
  { label: "Dec", revenue: 200000, profit: 90000 },
];

export const weeklyFinancials = [
  { label: "W1", revenue: 32000, profit: 13000 },
  { label: "W2", revenue: 45000, profit: 19000 },
  { label: "W3", revenue: 28000, profit: 11000 },
  { label: "W4", revenue: 52000, profit: 22000 },
  { label: "W5", revenue: 41000, profit: 17000 },
  { label: "W6", revenue: 38000, profit: 16000 },
  { label: "W7", revenue: 60000, profit: 26000 },
  { label: "W8", revenue: 35000, profit: 15000 },
  { label: "W9", revenue: 47000, profit: 20000 },
  { label: "W10", revenue: 55000, profit: 24000 },
  { label: "W11", revenue: 30000, profit: 12000 },
  { label: "W12", revenue: 65000, profit: 28000 },
];

export const yearlyFinancials = [
  { label: "2022", revenue: 1450000, profit: 580000 },
  { label: "2023", revenue: 1680000, profit: 690000 },
  { label: "2024", revenue: 1920000, profit: 810000 },
  { label: "2025", revenue: 2150000, profit: 910000 },
  { label: "2026", revenue: 1701500, profit: 255225 },
];

export const tripsByMonth = [
  { label: "Jan", trips: 8 },
  { label: "Feb", trips: 6 },
  { label: "Mar", trips: 8 },
  { label: "Apr", trips: 9 },
  { label: "May", trips: 5 },
  { label: "Jun", trips: 16 },
  { label: "Jul", trips: 11 },
  { label: "Aug", trips: 13 },
  { label: "Sep", trips: 12 },
  { label: "Oct", trips: 10 },
  { label: "Nov", trips: 14 },
  { label: "Dec", trips: 15 },
];

export const tripsByWeek = [
  { label: "W1", trips: 5 },
  { label: "W2", trips: 9 },
  { label: "W3", trips: 4 },
  { label: "W4", trips: 11 },
  { label: "W5", trips: 7 },
  { label: "W6", trips: 6 },
  { label: "W7", trips: 14 },
  { label: "W8", trips: 8 },
  { label: "W9", trips: 10 },
  { label: "W10", trips: 13 },
  { label: "W11", trips: 5 },
  { label: "W12", trips: 16 },
];

export const tripsByYear = [
  { label: "2022", trips: 180 },
  { label: "2023", trips: 195 },
  { label: "2024", trips: 210 },
  { label: "2025", trips: 218 },
  { label: "2026", trips: 224 },
];

export const brokerPerformance = [
  { broker: "Barry", revenue: 485000, profit: 72750, trips: 28, margin: "15%" },
  { broker: "Benny", revenue: 412000, profit: 61800, trips: 24, margin: "15%" },
  { broker: "Mark", revenue: 378000, profit: 56700, trips: 22, margin: "15%" },
  { broker: "Mark", revenue: 378000, profit: 56700, trips: 22, margin: "15%" },
  { broker: "Ari", revenue: 326000, profit: 48900, trips: 19, margin: "15%" },
  { broker: "Ari", revenue: 326000, profit: 48900, trips: 19, margin: "15%" },
];

export const topClientsByRevenue = [
  { client: "Hope Sterling", trips: 28, revenue: 485000, profit: 72750 },
  { client: "James Kellner", trips: 24, revenue: 412000, profit: 61800 },
  { client: "Mike Anderson", trips: 22, revenue: 378000, profit: 56700 },
  { client: "Mike Anderson", trips: 22, revenue: 378000, profit: 56700 },
  { client: "Robert Walsh", trips: 19, revenue: 326000, profit: 48900 },
  { client: "Robert Walsh", trips: 19, revenue: 326000, profit: 48900 },
  { client: "Sarah Chen", trips: 22, revenue: 378000, profit: 56700 },
];

export const topRoutes = [
  { from: "KTEB", to: "KPBI", trips: 28, revenue: 485000 },
  { from: "KTEB", to: "KMIA", trips: 24, revenue: 412000 },
  { from: "KMIA", to: "EGLL", trips: 22, revenue: 378000 },
  { from: "KTEB", to: "KPBI", trips: 22, revenue: 378000 },
  { from: "KTEB", to: "KPBI", trips: 19, revenue: 326000 },
  { from: "KTEB", to: "KPBI", trips: 19, revenue: 326000 },
];

export const financialSummary = [
  { label: "Total Revenue", value: "$1,701,500", tone: "success" },
  { label: "Total FET Collected", value: "$127,613", tone: "info" },
  { label: "Total Profit", value: "$255,225", tone: "purple" },
  { label: "Profit Margin", value: "15.0%", tone: "foreground" },
  { label: "Avg Revenue / Trip", value: "$17,724", tone: "foreground" },
  { label: "Avg Profit / Trip", value: "$2,659", tone: "foreground" },
  { label: "Outstanding AR", value: "$42,000", tone: "destructive" },
  { label: "Outstanding AP", value: "$30,300", tone: "warning" },
];
