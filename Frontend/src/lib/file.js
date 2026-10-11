/**
 * A filename shortened in the middle, so its type stays readable:
 * "Tribeca_Jets_Command_Center_Team_Scope.docx" → "Trib….docx".
 *
 * End-truncation ("Tribeca_J…") hides the one part a person scans for — is
 * this the PDF or the Word file? — so the extension is always kept whole and
 * the start of the name gives up the room. Show the full name in a `title`
 * beside it. `max` counts characters, the ellipsis included.
 */
export function shortFilename(name, max = 10) {
  const chars = Array.from(name ?? "");
  if (chars.length <= max) return name ?? "";

  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? Array.from(name.slice(dot)) : [];
  // An extension too long to leave room for any of the name is not worth
  // keeping; end-truncate instead.
  if (extension.length === 0 || extension.length > max - 3) {
    return `${chars.slice(0, max - 1).join("")}…`;
  }
  const keep = max - extension.length - 1;
  return `${chars.slice(0, keep).join("").trimEnd()}…${extension.join("")}`;
}
