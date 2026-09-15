import { create } from "zustand";

const initialLeg = () => ({ from: "", to: "", date: "", time: "" });

const initialState = {
  client: "",
  broker: "",
  tripType: "One Way",
  status: "Draft",

  departureAirport: "",
  arrivalAirport: "",
  departureDate: "",
  departureTime: "",
  returnDate: "",
  returnTime: "",
  legs: [initialLeg(), initialLeg()],

  operator: "",
  aircraftType: "",
  tailRegistration: "",
  operatorConfirmation: "Pending",

  passengerCount: 2,
  passengerNames: [
    { name: "", dob: "", passport: "" },
    { name: "", dob: "", passport: "" },
  ],

  fetApplies: true,
  clientQuote: "",
  operatorCost: "",
  leadSource: "Broker bought personally (50%)",
  commissionRecipient: "Broker / referral partner",
  commissionAmount: "",
  paymentStatus: "Pending",

  internalNotes: "",
  clientNotes: "",
  attachments: [],
};

export const useCreateTripStore = create((set) => ({
  ...initialState,

  setField: (field, value) => set({ [field]: value }),

  setTripType: (tripType) => set({ tripType }),

  setPassengerCount: (delta) =>
    set((state) => {
      const passengerCount = Math.max(1, state.passengerCount + delta);
      const passengerNames = [...state.passengerNames];
      while (passengerNames.length < passengerCount) passengerNames.push({ name: "", dob: "", passport: "" });
      while (passengerNames.length > passengerCount) passengerNames.pop();
      return { passengerCount, passengerNames };
    }),
  addPassenger: () =>
    set((state) => ({
      passengerCount: state.passengerCount + 1,
      passengerNames: [...state.passengerNames, { name: "", dob: "", passport: "" }],
    })),
  removePassenger: (index) =>
    set((state) => ({
      passengerCount: Math.max(1, state.passengerCount - 1),
      passengerNames: state.passengerNames.filter((_, i) => i !== index),
    })),
  updatePassenger: (index, field, value) =>
    set((state) => ({
      passengerNames: state.passengerNames.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    })),

  addLeg: () => set((state) => ({ legs: [...state.legs, initialLeg()] })),
  removeLeg: (index) => set((state) => ({ legs: state.legs.filter((_, i) => i !== index) })),
  updateLeg: (index, field, value) =>
    set((state) => ({ legs: state.legs.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)) })),

  addAttachment: (file) => set((state) => ({ attachments: [...state.attachments, file] })),
  removeAttachment: (index) => set((state) => ({ attachments: state.attachments.filter((_, i) => i !== index) })),

  reset: () => set(initialState),
}));
