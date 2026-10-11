import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import PhotoUploader from "./PhotoUploader";
const helpers = vi.hoisted(() => ({
  decodePhoto: vi.fn(),
  exportPhoto: vi.fn(),
}));
vi.mock("./smartPhoto", () => helpers);
vi.mock("react-easy-crop", () => ({
  default: () => <div>Crop adjustment</div>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const select = () =>
  fireEvent.change(screen.getByLabelText("Choose photo file"), {
    target: {
      files: [new File(["photo"], "photo.jpg", { type: "image/jpeg" })],
    },
  });
const prepare = () => {
  URL.revokeObjectURL = vi.fn();
  helpers.decodePhoto.mockResolvedValue({
    url: "blob:preview",
    area: { x: 0, y: 0, width: 700, height: 900 },
    manual: false,
  });
  helpers.exportPhoto.mockResolvedValue({
    dataUrl: "data:image/jpeg;base64,QA",
    warning: null,
  });
};
it("previews without saving, saves only the photo on explicit confirmation", async () => {
  prepare();
  const save = vi.fn().mockResolvedValue({});
  render(<PhotoUploader onSave={save} />);
  select();
  await screen.findByAltText("Your photo preview");
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save Photo" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith("data:image/jpeg;base64,QA"),
  );
  await waitFor(() =>
    expect(screen.queryByAltText("Your photo preview")).not.toBeInTheDocument(),
  );
});
it("cancels without replacing the existing photo", async () => {
  prepare();
  const save = vi.fn();
  render(<PhotoUploader onSave={save} />);
  select();
  await screen.findByAltText("Your photo preview");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByAltText("Your photo preview")).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it("keeps the preview for retry after a failed save", async () => {
  prepare();
  const save = vi.fn().mockRejectedValue(new Error("Network error"));
  render(<PhotoUploader onSave={save} />);
  select();
  await screen.findByAltText("Your photo preview");
  fireEvent.click(screen.getByRole("button", { name: "Save Photo" }));
  await screen.findByRole("alert");
  expect(screen.getByAltText("Your photo preview")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Photo" })).toBeEnabled();
});
it("opens manual adjustment when detection is unavailable, without blocking save", async () => {
  prepare();
  helpers.decodePhoto.mockResolvedValue({
    url: "blob:preview",
    area: { x: 0, y: 0, width: 700, height: 900 },
    manual: true,
  });
  render(<PhotoUploader onSave={vi.fn()} />);
  select();
  await screen.findByText("Crop adjustment");
  expect(screen.getByRole("button", { name: "Save Photo" })).toBeEnabled();
  expect(screen.getByLabelText("Photo zoom")).toBeInTheDocument();
});
