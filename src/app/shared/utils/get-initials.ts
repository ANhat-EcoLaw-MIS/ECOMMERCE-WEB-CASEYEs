export function getInitials(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) return 'CE';

  const parts = trimmedName.split(/\s+/u);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return trimmedName.slice(0, 2).toUpperCase();
}
