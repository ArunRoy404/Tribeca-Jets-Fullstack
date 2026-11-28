/** LOST is the request's closed state; archived rows remain read-only. */
export function canConvertRequest(request) {
  return Boolean(request?.id) && !request.isArchived && !request.deletedAt &&
    !["CONVERTED", "LOST"].includes(request.rawStatus ?? request.status);
}
