import { APPLICATION_NAME } from "./workspace.constants.js";

export function formatApplicationTitle(sectionName: string): string {
  const trimmedSectionName = sectionName.trim();

  if (trimmedSectionName.length === 0) {
    return APPLICATION_NAME;
  }

  return `${trimmedSectionName} | ${APPLICATION_NAME}`;
}
