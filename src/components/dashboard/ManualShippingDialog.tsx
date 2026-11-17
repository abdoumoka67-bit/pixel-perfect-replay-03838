import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/ui-i18n";
import { ShippingLabelModal } from "./ShippingLabelModal";
import type { Order } from "./OrderDetailsSheet";

/**
 * Manual handover for any carrier whose keys the merchant linked.
 *
 * Honest by design: for carriers without a real dispatch API we never pretend
 * a parcel was created. We print the A6 label, let the merchant hand the parcel
 * over themselves, and record the tracking number the carrier gave them
 * (optional) on the order. Yalidine keeps its real API send path.
 */
export function ManualShippingDialog({
  order,
  carrierName,
  storeName,
  storePhone,
  onClose,
  onSaved,
}: {
  order: Order | null;
  carrierName: string;
  storeName: string;
  storePhone: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTr();
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const confirm = async () => {
    if (!order) return;
    setSaving(true);
    const clean = tracking.trim();
    const { error } = await supabase
      .from("orders")
      .update({ ...(clean ? { tracking_number: clean } : {}), status: "shipping" })
      .eq("id", order.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("تم تسليم الطلب بنجاح"));
    setTracking("");
    onSaved();
    onClose();
  };

  return (
    <>
      <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("تسليم الطلب يدوياً")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            {t(
              "اطبع البوليصة وسلّم الطرد إلى {name}، ثم أدخل رقم التتبع الذي أعطتك به الشركة (إن وُجد).",
              { name: carrierName },
            )}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="manual-tracking">{t("رقم التتبع (اختياري)")}</Label>
            <Input
              id="manual-tracking"
              dir="ltr"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="ORX-..."
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setLabelOpen(true)}>
              <Printer className="size-4" /> {t("طباعة بوليصة A6")}
            </Button>
            <Button className="flex-1" onClick={confirm} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("تأكيد التسليم")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShippingLabelModal
        open={labelOpen}
        onOpenChange={setLabelOpen}
        orders={order ? [order] : []}
        storeName={storeName}
        storePhone={storePhone}
      />
    </>
  );
}
