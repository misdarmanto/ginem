import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-token", () => ({
  useToken: () => ({ getToken: () => "token" }),
}));

vi.mock("@/services/agentService", () => ({
  agentService: { reportClientLatency: vi.fn() },
}));

import { agentService } from "@/services/agentService";
import { useChatSocket } from "./useChatSocket";

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 1;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {}
}

describe("useChatSocket command timing", () => {
  let now = 1000;

  beforeEach(() => {
    FakeSocket.instances = [];
    now = 1000;
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const setup = (onMessage = vi.fn()) => {
    const hook = renderHook(() => useChatSocket({ onMessage }));
    return { ...hook, socket: FakeSocket.instances[0], onMessage };
  };

  it("sends each command with a fresh request id and the chat channel", () => {
    const { result, socket } = setup();

    act(() => {
      result.current.sendMessage("hidupkan lampu");
      result.current.sendMessage("matikan lampu");
    });

    const [first, second] = socket.sent.map((frame) => JSON.parse(frame));
    expect(first).toMatchObject({ message: "hidupkan lampu", channel: "chat" });
    expect(second).toMatchObject({ message: "matikan lampu", channel: "chat" });
    expect(first.requestId).toEqual(expect.any(String));
    expect(first.requestId).not.toBe(second.requestId);
  });

  it("reports the time from sending to receiving the reply", () => {
    const { result, socket } = setup();

    act(() => {
      result.current.sendMessage("hidupkan lampu");
    });
    const { requestId } = JSON.parse(socket.sent[0]);

    now = 3345;
    act(() => {
      socket.onmessage?.({
        data: JSON.stringify({ type: "chat.reply", requestId, data: { reply: "ok" } }),
      });
    });

    expect(agentService.reportClientLatency).toHaveBeenCalledWith(requestId, 2345);
  });

  it("still delivers the reply text to the caller", () => {
    const { result, socket, onMessage } = setup();
    act(() => {
      result.current.sendMessage("hidupkan lampu");
    });
    const { requestId } = JSON.parse(socket.sent[0]);

    act(() => {
      socket.onmessage?.({
        data: JSON.stringify({ type: "chat.reply", requestId, data: { reply: "Lampu menyala" } }),
      });
    });

    expect(onMessage).toHaveBeenCalledWith("Lampu menyala");
  });

  it("reports an error frame too, since the command still took that long", () => {
    const { result, socket } = setup();
    act(() => {
      result.current.sendMessage("hidupkan lampu");
    });
    const { requestId } = JSON.parse(socket.sent[0]);

    now = 1500;
    act(() => {
      socket.onmessage?.({
        data: JSON.stringify({ type: "chat.error", requestId, message: "gagal" }),
      });
    });

    expect(agentService.reportClientLatency).toHaveBeenCalledWith(requestId, 500);
  });

  it("reports each command only once", () => {
    const { result, socket } = setup();
    act(() => {
      result.current.sendMessage("hidupkan lampu");
    });
    const { requestId } = JSON.parse(socket.sent[0]);
    const frame = JSON.stringify({ type: "chat.reply", requestId, data: { reply: "ok" } });

    act(() => {
      socket.onmessage?.({ data: frame });
      socket.onmessage?.({ data: frame });
    });

    expect(agentService.reportClientLatency).toHaveBeenCalledTimes(1);
  });

  it("ignores frames that answer nothing this browser sent", () => {
    const { socket } = setup();

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ type: "connected", userId: 1 }) });
      socket.onmessage?.({
        data: JSON.stringify({ type: "chat.reply", requestId: "someone-else", data: { reply: "x" } }),
      });
    });

    expect(agentService.reportClientLatency).not.toHaveBeenCalled();
  });

  it("does not time a command that could not be sent", () => {
    const { result, socket } = setup();
    socket.readyState = 3;

    let sent = true;
    act(() => {
      sent = result.current.sendMessage("hidupkan lampu");
    });

    expect(sent).toBe(false);
    expect(socket.sent).toHaveLength(0);
  });
});
