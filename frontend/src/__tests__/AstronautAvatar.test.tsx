import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AstronautAvatar } from '../components/AstronautAvatar';

it('keeps each character gradient and clipping resource scoped to its own SVG', () => {
  const { container } = render(
    <>
      <AstronautAvatar id="nora" role="engineer" />
      <AstronautAvatar id="nik" role="technician" mood="unwell" />
      <AstronautAvatar id="theo" role="medic" portrait />
    </>
  );
  const allIds = [...container.querySelectorAll('[id]')].map(
    (element) => element.id
  );
  expect(new Set(allIds).size).toBe(allIds.length);
  for (const avatar of Array.from(container.children)) {
    for (const element of avatar.querySelectorAll('[fill], [clip-path]')) {
      const reference = (
        element.getAttribute('fill') || element.getAttribute('clip-path')
      )?.match(/^url\(#(.+)\)$/)?.[1];
      if (reference)
        expect(avatar.querySelector(`defs [id="${reference}"]`)).not.toBeNull();
    }
  }
});

it('paints seated forearms in front of the torso and keeps the entire avatar inside its container', () => {
  const { container } = render(
    <AstronautAvatar id="priya" role="medic" pose="seated" />
  );
  const avatar = container.firstElementChild!;
  const chest = avatar.querySelector('[data-part="chest-controls"]')!;
  const arms = avatar.querySelector('[data-part="front-forearms"]')!;
  expect(
    chest.compareDocumentPosition(arms) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(avatar).toHaveAttribute('width', '100%');
  expect(avatar).toHaveAttribute('height', '100%');
  expect(avatar).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
});
