import { useEffect, useState } from "react";

type UseDebounceProps<T> = {
  value: T;
  delayTime: number;
};

const useDebounce = <T>({ value, delayTime }: UseDebounceProps<T>) => {
  const [debounceValue, setDebounceValue] = useState(value);

  useEffect(() => {
    const timeoutNum = setTimeout(() => {
      setDebounceValue(value);
    }, delayTime);

    return () => {
      clearTimeout(timeoutNum);
    };
  }, [value, delayTime]);

  return debounceValue;
};

export default useDebounce;
