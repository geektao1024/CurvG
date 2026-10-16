// Microsoft Clarity tag as a native <script> — see analytics/plausible.tsx
// for why it lands in the SSR HTML. The project ID is restricted to the
// characters Clarity issues, so it can't break out of the inline script.
export function MicrosoftClarity({ projectId }: { projectId: string }) {
  if (!/^[a-z0-9]{6,32}$/i.test(projectId)) return null;
  return (
    // async={true} flags this to React 19 as a hoistable resource — see
    // google-analytics.tsx for the full rationale.
    <script
      id="clarity-init"
      async
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(projectId)});`,
      }}
    />
  );
}
