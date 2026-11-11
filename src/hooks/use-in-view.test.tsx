import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInView } from "./use-in-view";

class MockObserver {
  static instances: MockObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  disconnected = false;
  targets: Element[] = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.push(target);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(isIntersecting: boolean) {
    const target = this.targets[0];
    if (!target) throw new Error("observer has no target");
    act(() => {
      this.callback(
        [
          {
            isIntersecting,
            intersectionRatio: isIntersecting ? 0.25 : 0,
            target,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

function Probe(props: { settleMs?: number }) {
  const { settleMs } = props;
  const { ref, inView } = useInView<HTMLDivElement>(settleMs === undefined ? {} : { settleMs });
  return <div ref={ref} data-testid="probe" data-in-view={String(inView)} />;
}

function inView() {
  return document.querySelector('[data-testid="probe"]')?.getAttribute("data-in-view");
}

describe("useInView", () => {
  beforeEach(() => {
    MockObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("watches 20% of the section and shrinks the viewport at the bottom", () => {
    render(<Probe />);
    const observer = MockObserver.instances[0];
    expect(observer?.options).toEqual({ threshold: 0.2, rootMargin: "0px 0px -60px 0px" });
    expect(observer?.targets).toHaveLength(1);
  });

  it("starts immediately on entry and pauses when fully off screen", () => {
    render(<Probe />);
    const observer = MockObserver.instances[0]!;

    expect(inView()).toBe("false");
    observer.fire(true);
    expect(inView()).toBe("true");
    observer.fire(false);
    expect(inView()).toBe("false");

    // Scrolling back up restarts it right away.
    observer.fire(true);
    expect(inView()).toBe("true");
  });

  it("waits for the short settle window so a fast scroll does not miss the scene", () => {
    vi.useFakeTimers();
    render(<Probe settleMs={150} />);
    const observer = MockObserver.instances[0]!;

    observer.fire(true);
    expect(inView()).toBe("false");
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(inView()).toBe("false");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(inView()).toBe("true");
  });

  it("cancels a pending start when the section leaves during the settle window", () => {
    vi.useFakeTimers();
    render(<Probe settleMs={150} />);
    const observer = MockObserver.instances[0]!;

    observer.fire(true);
    observer.fire(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(inView()).toBe("false");
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Probe />);
    const observer = MockObserver.instances[0]!;
    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
