export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function normalizeInternationalPhone(phone) {
  return phone.replace(/[\s()-]/g, "");
}

export function maskEmail(email) {
  const [localPart, domain] = normalizeEmail(email).split("@");

  if (!localPart || !domain) return email;

  const visibleCharacters = localPart.slice(0, Math.min(2, localPart.length));
  const maskedCharacters = "*".repeat(Math.max(3, localPart.length - visibleCharacters.length));

  return `${visibleCharacters}${maskedCharacters}@${domain}`;
}
