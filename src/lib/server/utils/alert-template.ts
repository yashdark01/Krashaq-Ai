export function renderAlertTemplate(
  template: string,
  vars: { name: string; location: string; message?: string }
) {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{location\}\}/g, vars.location || 'your area')
    .replace(/\{\{message\}\}/g, vars.message ?? '');
}
