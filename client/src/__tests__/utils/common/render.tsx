import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

type CustomRenderProps = {
  uiArray: {
    ui: React.ReactElement;
    path: string;
  }[];
  initialEntries?: string[];
};

export const customRender = ({
  uiArray,
  initialEntries,
}: CustomRenderProps) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        {uiArray.map(({ ui, path }) => {
          return <Route path={path} element={ui} />;
        })}
      </Routes>
    </MemoryRouter>,
  );

  return { user };
};
