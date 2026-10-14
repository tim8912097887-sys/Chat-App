interface AuthHeaderProps {
  title: string;
  description: string;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <header className="mb-8 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-sm shadow-indigo-600/20"
      >
        C
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </header>
  );
}
