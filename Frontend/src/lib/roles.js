/**
 * Roles that can own a book of business — who a "broker" picker or filter
 * offers.
 *
 * The one copy. There were eight, and they disagreed: the Clients screens left
 * out ADMIN, so an administrator who owns clients could be assigned them in
 * one dialog and not found by the filter on the next screen. Import this;
 * never re-list the roles in a component.
 */
export const BROKER_ROLES = new Set(["BROKER", "SENIOR_BROKER", "ADMIN"]);
