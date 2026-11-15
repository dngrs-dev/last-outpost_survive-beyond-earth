import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// jsdom has dialog elements but does not implement the browser's top layer.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

beforeEach(() => {
  for (const key of Object.keys(localStorage)) if (key.startsWith('last-outpost.week-plan.')) localStorage.removeItem(key);
});
