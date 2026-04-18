export function normalizePassword(value) {
  return String(value || '');
}

export const PASSWORD_REQUIREMENTS = Object.freeze([
  Object.freeze({
    id: 'length',
    label: 'At least 8 characters',
  }),
  Object.freeze({
    id: 'number',
    label: 'At least 1 number',
  }),
]);

export function evaluatePasswordRules(value) {
  const password = normalizePassword(value);

  return PASSWORD_REQUIREMENTS.map((requirement) => {
    if (requirement.id === 'length') {
      return {
        ...requirement,
        satisfied: password.length >= 8,
      };
    }

    if (requirement.id === 'number') {
      return {
        ...requirement,
        satisfied: /\d/.test(password),
      };
    }

    return {
      ...requirement,
      satisfied: false,
    };
  });
}

export function arePasswordRulesSatisfied(value) {
  return evaluatePasswordRules(value).every((requirement) => requirement.satisfied);
}

export function validatePasswordRules(value) {
  const password = normalizePassword(value);

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }

  return password;
}
