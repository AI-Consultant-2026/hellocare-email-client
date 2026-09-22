import { escapeHtml } from "./escapeHtml";

export interface PersonalizationFields {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  extraFields: Record<string, string>;
}

const BUILT_IN_VARS: Record<string, keyof PersonalizationFields> = {
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
  company: "company",
};

// {{variable}} is case-insensitive and tolerant of spaces ({{ first_name }}). A field
// missing for a given recipient (or a variable name that doesn't exist at all) is
// replaced with an empty string rather than left as literal "{{...}}" text or throwing --
// a broken merge must never become a broken send.
function resolveVar(name: string, fields: PersonalizationFields): string {
  const key = name.trim().toLowerCase();
  const builtIn = BUILT_IN_VARS[key];
  if (builtIn) return fields[builtIn] as string;
  return fields.extraFields[key] ?? "";
}

function mergeTemplate(template: string, fields: PersonalizationFields, escapeValues: boolean): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_ ]+?)\s*\}\}/g, (_match, varName: string) => {
    const value = resolveVar(varName, fields);
    return escapeValues ? escapeHtml(value) : value;
  });
}

// HTML body: escape each merged-in value (protects against a malicious CSV cell like
// "<script>"), but never touch the admin's own HTML markup around it.
export function mergeHtml(template: string, fields: PersonalizationFields): string {
  return mergeTemplate(template, fields, true);
}

// Plain-text body / subject: no HTML injection risk, so values are inserted as-is.
export function mergePlainText(template: string, fields: PersonalizationFields): string {
  return mergeTemplate(template, fields, false);
}
