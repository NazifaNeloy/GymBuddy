import { useCallback, useMemo, useState } from 'react';

/**
 * Minimal form helper: values, setters, and validation errors that only appear
 * after the first submit attempt (so users are not shouted at while typing).
 */
export function useFormFields(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => (submitted ? validate(values) : {}), [submitted, validate, values]);

  const setField = useCallback((name) => (text) => setValues((v) => ({ ...v, [name]: text })), []);

  /** Marks the form as submitted; returns true when it is valid. */
  const trySubmit = useCallback(() => {
    setSubmitted(true);
    return Object.keys(validate(values)).length === 0;
  }, [validate, values]);

  return { values, errors, setField, trySubmit };
}
