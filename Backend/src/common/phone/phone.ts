/** Digits only, as Meta sends a WhatsApp phone number. */
export const phoneDigits = (phone: string) => phone.replace(/\D/g, '');
