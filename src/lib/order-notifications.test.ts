import { afterEach, describe, expect, it } from "vitest";
import { orderNotificationPermission, showOrderNotification } from "./order-notifications";

const realNotification = Object.getOwnPropertyDescriptor(window, "Notification");

function stubPermission(permission: NotificationPermission) {
  const fake = class {
    static permission = permission;
    static requestPermission = async () => permission;
  };
  Object.defineProperty(window, "Notification", { configurable: true, value: fake });
}

afterEach(() => {
  if (realNotification) Object.defineProperty(window, "Notification", realNotification);
  else Reflect.deleteProperty(window, "Notification");
});

describe("order notifications", () => {
  it("reports the current browser permission", () => {
    stubPermission("granted");
    expect(orderNotificationPermission()).toBe("granted");
  });

  it("never paints a notification without permission", async () => {
    stubPermission("denied");
    await expect(showOrderNotification({ title: "طلب جديد", body: "زبون · 4 500,00 دج" })).resolves.toBeUndefined();
  });
});
