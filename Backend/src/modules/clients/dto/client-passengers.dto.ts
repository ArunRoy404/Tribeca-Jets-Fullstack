import { z } from 'zod';
import { pageFields } from '../../../common/dto/pagination.dto.js';
import { createZodDto } from '../../../common/dto/zod-dto.js';

/** Fixed newest-trip order. Search is applied after de-duplication. */
export const queryClientPassengersSchema = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(200).optional(),
}).strict();
export type QueryClientPassengersInput = z.infer<typeof queryClientPassengersSchema>;
export class QueryClientPassengersDto extends createZodDto(queryClientPassengersSchema) {}
