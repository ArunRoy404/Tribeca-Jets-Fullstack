/** Sales funnel order, shared by every client and lead picker/filter. */
const STAGE_LABELS = {
  NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified",
  PROPOSAL: "Proposal", QUOTED: "Quoted", WON: "Won", LOST: "Lost",
};
export const LEAD_STAGES = Object.keys(STAGE_LABELS);
export const formatLeadStage = (value) => STAGE_LABELS[value] ?? value ?? "";
