/** Package id shown on catalog cards and in the details dialog. */
export function catalogPackageLabel(name: string, version: string): string {
  return version.length > 0 ? `${name}@${version}` : name
}
