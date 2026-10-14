import { Link } from "react-router";

type AuthHeaderProps = {
  buttonText: string;
  description: string;
  to: string;
};

const AuthFooter = ({ buttonText, description, to }: AuthHeaderProps) => {
  return (
    <p className="mt-6 text-center text-sm text-slate-500">
      {`${description} `}
      <Link
        to={to}
        className="font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {buttonText}
      </Link>
    </p>
  );
};

export default AuthFooter;
