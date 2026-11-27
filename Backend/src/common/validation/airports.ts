import { BadRequestException } from '@nestjs/common';

/** Call with the merged route on update; null clears an optional airport. */
export function assertDifferentAirports(
  originId: string | null | undefined,
  destinationId: string | null | undefined,
): void {
  if (!originId || originId !== destinationId) return;
  const message = "Departure and arrival can't be the same airport";
  throw new BadRequestException({ message, errors: { destinationAirportId: message } });
}
