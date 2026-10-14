type SubmitErrorProps = { message: string };

const SubmitError = ({ message }: SubmitErrorProps) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-red-200
              bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
};

export default SubmitError;
