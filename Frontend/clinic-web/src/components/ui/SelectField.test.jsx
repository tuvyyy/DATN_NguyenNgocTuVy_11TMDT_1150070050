import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SelectField from "./SelectField";

jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }), { virtual: true });

const options = [{ value: 1, label: "1 tháng" }, { value: 3, label: "3 tháng", disabled: true }, { value: 6, label: "6 tháng" }, { value: 12, label: "12 tháng" }];
function Example({ onChange = () => {}, disabled = false }) {
  const [value, setValue] = useState(6);
  return <div data-testid="clipped-container" style={{ overflow: "hidden", height: 40 }}><SelectField label="Dự báo" value={value} options={options} disabled={disabled} onChange={next => { setValue(next); onChange(next); }} /></div>;
}

test("popup uses a portal and keeps selected state while returning a typed value", () => {
  const changed = jest.fn();
  render(<Example onChange={changed} />);
  const trigger = screen.getByRole("combobox", { name: "Dự báo" });
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("listbox").parentElement).toBe(document.body);
  expect(screen.getByRole("option", { name: "6 tháng" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("option", { name: "12 tháng" }));
  expect(changed).toHaveBeenCalledWith(12);
  expect(trigger.textContent).toBe("12 tháng");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("keyboard selection skips disabled options and Escape dismisses without changing the value", () => {
  const changed = jest.fn();
  render(<Example onChange={changed} />);
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "ArrowUp" });
  fireEvent.keyDown(trigger, { key: "ArrowUp" });
  expect(trigger.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "1 tháng" }).id);
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(changed).toHaveBeenCalledWith(1);
  fireEvent.click(trigger);
  fireEvent.keyDown(trigger, { key: "End" });
  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("outside pointer, Tab and scrolling dismiss the popup, while internal scrolling keeps it open", () => {
  render(<Example />);
  const trigger = screen.getByRole("combobox");
  fireEvent.click(trigger);
  fireEvent.scroll(screen.getByRole("listbox"));
  expect(screen.getByRole("listbox")).not.toBeNull();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(trigger);
  fireEvent.keyDown(trigger, { key: "Tab" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(trigger);
  fireEvent.scroll(window);
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("typeahead can choose a two-digit value and disabled controls stay closed", () => {
  const { rerender } = render(<Example />);
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "1" });
  fireEvent.keyDown(trigger, { key: "2" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(trigger.textContent).toBe("12 tháng");
  rerender(<Example disabled />);
  fireEvent.click(trigger);
  expect(trigger.disabled).toBe(true);
  expect(screen.queryByRole("listbox")).toBeNull();
});
