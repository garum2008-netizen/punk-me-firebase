/** Deny unless a signed-in session has an admin claim and the database accepts an admin read. */
export function ownerSessionAllowed({ signedIn, anonymous, adminClaim, databaseConfirmed }) {
  if (signedIn !== true || anonymous === true) return false;
  if (adminClaim !== true) return false;
  if (databaseConfirmed !== true) return false;
  return true;
}
