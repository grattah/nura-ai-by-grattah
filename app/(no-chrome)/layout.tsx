export default function NoChrome({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background pb-[calc(env(safe-area-inset-bottom,0px)+56px)]">{children}</div>;
}
