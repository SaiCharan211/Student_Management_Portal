// Label (with a red * when required) + input/select/textarea + hint/error.
export default function Field({ label, name, error, hint, required, as = 'input', children, ...props }) {
  const Tag = as;
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      <Tag id={name} name={name} aria-invalid={Boolean(error)} aria-required={required || undefined} {...props}>
        {children}
      </Tag>
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
