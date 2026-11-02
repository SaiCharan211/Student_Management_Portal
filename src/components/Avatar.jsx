import { initials } from '../utils.js';

export default function Avatar({ name, large = false }) {
  return <span className={large ? 'avatar avatar-lg' : 'avatar'} aria-hidden="true">{initials(name)}</span>;
}
