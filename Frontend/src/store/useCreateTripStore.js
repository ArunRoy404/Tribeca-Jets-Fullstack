import { create } from "zustand";

/**
 * The trip form's draft — client-only state shared by the form's six cards,
 * which is what a store is for. The trips themselves live in React Query.
 *
 * Every value is in the API's vocabulary: ids, enums, "YYYY-MM-DD" and
 * "HH:MM". Nothing is pre-filled — the old draft opened with two passengers
 * and a lead-source percentage nobody had chosen.
 */
const blankLeg = () => ({ id: undefined, originAirportId: "", destinationAirportId: "", departureDate: "", departureTime: "" });
const blankPassenger = () => ({ id: undefined, fullName: "", dateOfBirth: "", passportNumber: "" });

const initialState = {
  /** The trip being edited, or null for a new one. */
  editingId: null,

  clientId: "",
  assignedBrokerId: "",
  type: "ONE_WAY",
  status: "DRAFT",

  legs: [blankLeg()],

  operatorId: "",
  aircraftId: "",
  aircraftDescription: "",
  operatorConfirmed: false,

  passengerCount: "1",
  passengers: [blankPassenger()],

  attachments: [],

  basePrice: "",
  operatorCost: "",
  fetEnabled: true,

  internalNotes: "",
  clientNotes: "",
};

/**
 * Legs for a trip type. A round trip's return is the outbound reversed — the
 * form asks only for its date and time — so switching types keeps what was
 * typed and adds or trims legs rather than starting over.
 */
function legsFor(type, legs) {
  const first = legs[0] ?? blankLeg();
  if (type === "ONE_WAY") return [first];
  if (type === "ROUND_TRIP") {
    const back = legs[1] ?? blankLeg();
    return [first, { ...back, originAirportId: first.destinationAirportId, destinationAirportId: first.originAirportId }];
  }
  return legs.length >= 2 ? legs : [first, legs[1] ?? blankLeg()];
}

const str = (value) => (value === null || value === undefined ? "" : String(value));

export const useCreateTripStore = create((set) => ({
  ...initialState,

  setField: (field, value) => set({ [field]: value }),

  setType: (type) => set((state) => ({ type, legs: legsFor(type, state.legs) })),

  updateLeg: (index, field, value) =>
    set((state) => {
      const legs = state.legs.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg));
      // A round trip's return mirrors the outbound route.
      return { legs: state.type === "ROUND_TRIP" ? legsFor("ROUND_TRIP", legs) : legs };
    }),
  addLeg: () => set((state) => ({ legs: [...state.legs, blankLeg()] })),
  removeLeg: (index) => set((state) => ({ legs: state.legs.filter((_, i) => i !== index) })),

  setPassengerCount: (count) =>
    set((state) => {
      const next = Math.max(1, Math.min(200, count));
      const current = state.passengers.length;
      let nextPassengers = [...state.passengers];
      if (next > current) {
        for (let i = current; i < next; i++) {
          nextPassengers.push(blankPassenger());
        }
      } else if (next < current) {
        nextPassengers = nextPassengers.slice(0, next);
      }
      return { passengerCount: String(next), passengers: nextPassengers };
    }),

  addPassenger: () =>
    set((state) => {
      const nextCount = state.passengers.length + 1;
      return {
        passengerCount: String(nextCount),
        passengers: [...state.passengers, blankPassenger()],
      };
    }),

  removePassenger: (index) =>
    set((state) => {
      if (state.passengers.length <= 1) return state;
      const nextPassengers = state.passengers.filter((_, i) => i !== index);
      return {
        passengerCount: String(nextPassengers.length),
        passengers: nextPassengers,
      };
    }),

  updatePassenger: (index, field, value) =>
    set((state) => ({
      passengers: state.passengers.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    })),

  addAttachment: (file) =>
    set((state) => ({ attachments: [...state.attachments, file] })),
  removeAttachment: (index) =>
    set((state) => ({
      attachments: state.attachments.filter((_, i) => i !== index),
    })),

  /** Opens the form on a saved trip — raw API record, ids kept for the diff. */
  loadTrip: (trip) => {
    const rawPassengers = (trip?.passengers ?? []).map((p) => ({
      id: p?.id,
      fullName: str(p?.fullName),
      dateOfBirth: p?.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : "",
      passportNumber: str(p?.passportNumber),
    }));
    const totalCount = Math.max(1, Number(trip?.passengerCount) || rawPassengers.length || 1);
    const passengers = [...rawPassengers];
    while (passengers.length < totalCount) {
      passengers.push(blankPassenger());
    }

    return set({
      ...initialState,
      editingId: trip?.id ?? null,
      clientId: str(trip?.clientId),
      assignedBrokerId: str(trip?.assignedBrokerId),
      type: trip?.type ?? "ONE_WAY",
      status: trip?.status ?? "DRAFT",
      legs: (trip?.legs ?? []).map((leg) => ({
        id: leg?.id,
        originAirportId: str(leg?.originAirportId),
        destinationAirportId: str(leg?.destinationAirportId),
        departureDate: leg?.departureDate ? String(leg.departureDate).slice(0, 10) : "",
        departureTime: str(leg?.departureTime),
      })),
      operatorId: str(trip?.operatorId),
      aircraftId: str(trip?.aircraftId),
      aircraftDescription: str(trip?.aircraftDescription),
      operatorConfirmed: Boolean(trip?.operatorConfirmed),
      passengerCount: String(totalCount),
      passengers,
      attachments: [],
      basePrice: str(trip?.basePrice),
      operatorCost: trip?.operatorCost === undefined ? "" : str(trip?.operatorCost),
      fetEnabled: trip?.fetEnabled ?? true,
      internalNotes: str(trip?.internalNotes),
      clientNotes: str(trip?.clientNotes),
    });
  },

  reset: () =>
    set({
      ...initialState,
      legs: [blankLeg()],
      passengerCount: "1",
      passengers: [blankPassenger()],
      attachments: [],
    }),
}));
