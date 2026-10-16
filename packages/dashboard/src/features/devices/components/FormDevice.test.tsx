import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormDevice, { type DeviceCreateFormState } from "./FormDevice";

const form: DeviceCreateFormState = {
  deviceName: "",
  deviceType: "sensor",
  deviceDescription: "",
  deviceFirmwareVersion: "v1.0.0",
} as DeviceCreateFormState;

const renderCreate = (setForm = vi.fn()) =>
  render(
    <FormDevice
      open
      mode="create"
      submitLoading={false}
      formError={null}
      form={form}
      setForm={setForm}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );

describe("FormDevice device type", () => {
  it("offers only sensor and actuator", () => {
    renderCreate();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Device Type/ }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual(["sensor", "actuator"]);
  });

  it("no longer offers hybrid", () => {
    renderCreate();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Device Type/ }));

    expect(within(screen.getByRole("listbox")).queryByText("hybrid")).not.toBeInTheDocument();
  });

  it("selects actuator", () => {
    const setForm = vi.fn();
    renderCreate(setForm);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Device Type/ }));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("actuator"));

    const update = setForm.mock.calls[0][0] as (state: DeviceCreateFormState) => DeviceCreateFormState;
    expect(update(form).deviceType).toBe("actuator");
  });
});
