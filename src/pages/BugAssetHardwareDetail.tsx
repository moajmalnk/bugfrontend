import { CopyValue } from "@/components/assets/CopyValue";
import { VaultRevealModal } from "@/components/assets/VaultRevealModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { assetsService } from "@/services/assetsService";
import type { AssetHardware } from "@/types/assets";
import { ArrowLeft, HardDrive, KeyRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function BugAssetHardwareDetail() {
  const { hardwareId } = useParams<{ hardwareId: string }>();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canEdit = hasPermissionOrAdmin(role, hasPermission, "ASSETS_EDIT");
  const canReveal = hasPermissionOrAdmin(role, hasPermission, "ASSETS_VAULT_REVEAL");
  const showFinance = hasPermissionOrAdmin(role, hasPermission, "ASSETS_FINANCE_VIEW");
  const navigate = useNavigate();
  const [item, setItem] = useState<AssetHardware | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultOpen, setVaultOpen] = useState(false);

  const load = useCallback(async () => {
    if (!hardwareId) return;
    setLoading(true);
    try {
      setItem(await assetsService.getHardware(hardwareId));
    } catch (err) {
      toast({ title: "Hardware not found", description: err instanceof Error ? err.message : "", variant: "destructive" });
      navigate(`/${role}/bugassets`);
    } finally {
      setLoading(false);
    }
  }, [hardwareId, navigate, role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !item) {
    return (
      <ListPageShell>
        <Skeleton className="h-32 rounded-2xl" />
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <Button variant="ghost" className="rounded-xl" asChild>
        <Link to={`/${role}/bugassets`}><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
      </Button>
      <ListPageHeader
        icon={<HardDrive className="h-6 w-6" />}
        title={item.asset_tag}
        description={[item.brand, item.model].filter(Boolean).join(" ") || "Office hardware"}
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => setVaultOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />Vault
          </Button>
        }
      />
      <Card className="rounded-xl">
        <CardContent className="p-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6 text-sm">Category: {item.category}</div>
          <div className="col-span-12 md:col-span-6"><Badge className="rounded-xl" variant="outline">{item.status}</Badge></div>
          <div className="col-span-12 md:col-span-6">Serial: <CopyValue value={item.serial_no} label="serial" /></div>
          <div className="col-span-12 md:col-span-6">IMEI: <CopyValue value={item.imei} label="IMEI" /></div>
          <div className="col-span-12 md:col-span-6 text-sm">Assignee: {item.assigned_user_name || "Unassigned"}</div>
          <div className="col-span-12 md:col-span-6 text-sm">Warranty: {item.warranty_expires_at || "—"}</div>
          {showFinance && <div className="col-span-12 text-sm">Vendor cost: {item.vendor_cost ?? "—"} INR</div>}
        </CardContent>
      </Card>
      <VaultRevealModal
        open={vaultOpen}
        onOpenChange={setVaultOpen}
        entityType="hardware"
        entityId={item.id}
        canReveal={canReveal}
        canEdit={canEdit}
      />
    </ListPageShell>
  );
}
