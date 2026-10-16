/**
 * Creator link that opens a template already filled in: the "make it a
 * video" buttons on lab, curve and wonder pages. No model call; the server
 * validates the parameters again when the user renders.
 */
export function templateCreatorHref(
  templateId: string,
  params: Record<string, string | number>
): string {
  return `/creator?template=${encodeURIComponent(templateId)}&params=${encodeURIComponent(JSON.stringify(params))}`;
}
