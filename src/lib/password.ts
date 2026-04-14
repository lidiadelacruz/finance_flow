const MIN = 12;

export function validateStrongPassword(password: string): string | null {
  if (password.length < MIN) {
    return `Password must be at least ${MIN} characters.`;
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "Password must include at least one symbol (e.g. !@#$%).";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  return null;
}
