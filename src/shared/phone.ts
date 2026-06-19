export function normalizePhoneForSms(phone = "") {
  return String(phone).replace(/[^\d+]/g, "");
}

export function normalizeWhatsAppPhone(rawPhone = "") {
  const cleaned = String(rawPhone).replace(/\s+/g, "").replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+33")) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    return `33${cleaned.slice(1)}`;
  }

  return cleaned.replace(/^\+/, "");
}
