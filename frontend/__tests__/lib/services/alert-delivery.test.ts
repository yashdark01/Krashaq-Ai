import { renderAlertTemplate } from '@/lib/server/utils/alert-template';

describe('renderAlertTemplate', () => {
  it('substitutes name, location, and message', () => {
    const out = renderAlertTemplate('Hi {{name}} in {{location}} — {{message}}', {
      name: 'Ram',
      location: 'Bhopal',
      message: 'water crops',
    });
    expect(out).toBe('Hi Ram in Bhopal — water crops');
  });

  it('uses fallback for empty location', () => {
    const out = renderAlertTemplate('Weather for {{location}}', {
      name: 'Ram',
      location: '',
    });
    expect(out).toContain('your area');
  });
});
