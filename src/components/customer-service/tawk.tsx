/**
 * Tawk.to live chat widget.
 * @see https://developer.tawk.to/jsapi/
 */
export function Tawk({
  propertyId,
  widgetId,
}: {
  propertyId: string;
  widgetId: string;
}) {
  if (!propertyId || !widgetId) return null;
  const scriptUrl = `https://embed.tawk.to/${encodeURIComponent(propertyId)}/${encodeURIComponent(widgetId)}`;
  return (
    <script
      id="tawk-widget"
      async
      dangerouslySetInnerHTML={{
        __html: `var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src=${JSON.stringify(scriptUrl)};s1.charset="UTF-8";s1.setAttribute("crossorigin","*");s0.parentNode.insertBefore(s1,s0);})();`,
      }}
    />
  );
}
