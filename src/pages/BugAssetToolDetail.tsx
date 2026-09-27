import { ConfirmAssetDelete } from "@/components/assets/ConfirmAssetDelete";
import { CopyValue } from "@/components/assets/CopyValue";
import { ToolFormModal } from "@/components/assets/AssetModals";
import { AssetSelect } from "@/components/assets/AssetFormFields";
import { VaultRevealModal } from "@/components/assets/VaultRevealModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn, getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { assetsService } from "@/services/assetsService";
import { userService } from "@/services/userService";
import type { AssetTool, AssetToolSeat } from "@/types/assets";
import type { User } from "@/types";
import {
  ArrowLeft,
  ExternalLink,
  KeyRound,
  Pencil,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "trial") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  }
  if (s === "paused" || s === "pending") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }
  if (s === "expired" || s === "cancelled") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

function seatLabel(seat: AssetToolSeat): string {
  if (seat.user_name || seat.user_email) {
    return seat.user_name || seat.user_email || seat.user_id || "User";
  }
  return seat.external_name || seat.external_email || "External";
}

export default function BugAssetToolDetail() {
  const { toolId } = useParams<{ toolId: string }>();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canEdit = hasPermissionOrAdmin(role, hasPermission, "ASSETS_EDIT");
  const canReveal = hasPermissionOrAdmin(role, hasPermission, "ASSETS_VAULT_REVEAL");
  const showFinance = hasPermissionOrAdmin(role, hasPermission, "ASSETS_FINANCE_VIEW");
  const navigate = useNavigate();

  const [item, setItem] = useState<AssetTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [seatRole, setSeatRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassignSeat, setUnassignSeat] = useState<AssetToolSeat | null>(null);

  const load = useCallback(async () => {
    if (!toolId) return;
    setLoading(true);
    try {
      setItem(await assetsService.getTool(toolId));
    } catch (err) {
      toast({
        title: "Tool not found",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      navigate(`/${role}/bugassets`);
    } finally {
      setLoading(false);
    }
  }, [toolId, navigate, role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canEdit) return;
    userService.getUsers().then(setUsers).catch(() => setUsers([]));
  }, [canEdit]);

  const assignedUserIds = useMemo(
    () => new Set((item?.seats || []).map((s) => s.user_id).filter(Boolean) as string[]),
    [item?.seats]
  );

  const userOptions = useMemo(
    () =>
      [...users]
        .filter((u) => !assignedUserIds.has(u.id))
        .sort((a, b) =>
          (a.name || a.username || a.email || "").localeCompare(
            b.name || b.username || b.email || ""
          )
        )
        .map((u) => ({
          value: u.id,
          label: u.name || u.username || u.email || u.id,
        })),
    [users, assignedUserIds]
  );

  const canAssign =
    Boolean(assignUserId) || Boolean(externalName.trim());

  const handleAssign = async () => {
    if (!item || assigning || !canAssign) return;
    setAssigning(true);
    try {
      const updated = await assetsService.assignToolSeat({
        tool_id: item.id,
        user_id: assignUserId || null,
        external_name: externalName.trim() || null,
        external_email: externalEmail.trim() || null,
        seat_role: seatRole.trim() || null,
      });
      setItem(updated);
      setAssignUserId("");
      setExternalName("");
      setExternalEmail("");
      setSeatRole("");
      toast({ title: "Seat assigned" });
    } catch (err) {
      toast({
        title: "Assign failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignSeat) return;
    const updated = await assetsService.unassignToolSeat(unassignSeat.id);
    setItem(updated);
    setUnassignSeat(null);
    toast({ title: "Seat removed" });
  };

  if (loading || !item) {
    return (
      <ListPageShell>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl mt-4" />
      </ListPageShell>
    );
  }

  const seats = item.seats || [];
  const seatsLabel =
    item.seats_total != null
      ? `${item.seats_used ?? seats.length}/${item.seats_total}`
      : String(item.seats_used ?? seats.length);

  return (
    <ListPageShell>
      <ListPageHeader
        leading={
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            asChild
          >
            <Link to={`/${role}/bugassets`} aria-label="Back to BugAssets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        icon={<Sparkles className="h-6 w-6" />}
        title={item.name}
        description={[item.vendor, item.plan_name, item.category]
          .filter(Boolean)
          .join(" · ")}
        count={
          <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(item.status))}>
            {item.status}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setVaultOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Vault
            </Button>
            {canEdit && (
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        <Card className="rounded-xl col-span-12 lg:col-span-7">
          <CardContent className="p-5 grid grid-cols-12 gap-4 text-sm">
            <div className="col-span-12 md:col-span-6">
              <div className="text-muted-foreground text-xs mb-1">Account email</div>
              <CopyValue value={item.account_email} label="account email" />
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="text-muted-foreground text-xs mb-1">Login</div>
              {item.login_url ? (
                <a
                  href={item.login_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                >
                  Open <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                "—"
              )}
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="text-muted-foreground text-xs mb-1">Seats</div>
              <span className="tabular-nums font-medium">{seatsLabel}</span>
            </div>
            <div className="col-span-6 md:col-span-4">
              <div className="text-muted-foreground text-xs mb-1">Billing</div>
              <span className="capitalize">{item.billing_cycle || "—"}</span>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="text-muted-foreground text-xs mb-1">Expires</div>
              <span className="tabular-nums">{item.expires_at || "—"}</span>
            </div>
            {showFinance ? (
              <>
                <div className="col-span-6">
                  <div className="text-muted-foreground text-xs mb-1">Vendor cost</div>
                  {item.vendor_cost != null ? `${item.vendor_cost} ${item.currency || "INR"}` : "—"}
                </div>
                <div className="col-span-6">
                  <div className="text-muted-foreground text-xs mb-1">Margin</div>
                  {item.margin_amount != null ? String(item.margin_amount) : "—"}
                </div>
              </>
            ) : null}
            {item.notes ? (
              <div className="col-span-12">
                <div className="text-muted-foreground text-xs mb-1">Notes</div>
                <p className="whitespace-pre-wrap">{item.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl col-span-12 lg:col-span-5">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sm">Seats / users</h2>
              <Badge variant="secondary" className="rounded-xl tabular-nums">
                {seats.length}
              </Badge>
            </div>

            {canEdit ? (
              <div className="grid grid-cols-12 gap-3 rounded-xl border border-border/50 p-3">
                <div className="col-span-12 space-y-1.5">
                  <Label>BugRicer user</Label>
                  <AssetSelect
                    value={assignUserId}
                    onValueChange={setAssignUserId}
                    placeholder="Unassigned"
                    emptyLabel="No user"
                    options={userOptions}
                    searchable
                  />
                </div>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <Label htmlFor="ext-name">External name</Label>
                  <Input
                    id="ext-name"
                    maxLength={120}
                    className="h-11 rounded-xl"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value.slice(0, 120))}
                    placeholder="If not in BugRicer"
                  />
                </div>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <Label htmlFor="ext-email">External email</Label>
                  <Input
                    id="ext-email"
                    maxLength={255}
                    className="h-11 rounded-xl"
                    value={externalEmail}
                    onChange={(e) => setExternalEmail(e.target.value.slice(0, 255))}
                  />
                </div>
                <div className="col-span-12 space-y-1.5">
                  <Label htmlFor="seat-role">Seat role</Label>
                  <Input
                    id="seat-role"
                    maxLength={80}
                    className="h-11 rounded-xl"
                    placeholder="admin / editor / viewer"
                    value={seatRole}
                    onChange={(e) => setSeatRole(e.target.value.slice(0, 80))}
                  />
                </div>
                <div className="col-span-12">
                  <Button
                    className="rounded-xl w-full"
                    disabled={!canAssign || assigning}
                    onClick={() => void handleAssign()}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {assigning ? "Assigning…" : "Assign seat"}
                  </Button>
                </div>
              </div>
            ) : null}

            {seats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seats assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {seats.map((seat) => (
                  <div
                    key={seat.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{seatLabel(seat)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[seat.seat_role, seat.user_email || seat.external_email]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    {canEdit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive shrink-0"
                        onClick={() => setUnassignSeat(seat)}
                      >
                        Unassign
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ToolFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => void load()}
        initial={item}
        showFinance={showFinance}
      />
      <VaultRevealModal
        open={vaultOpen}
        onOpenChange={setVaultOpen}
        entityType="tool"
        entityId={item.id}
        canReveal={canReveal}
        canEdit={canEdit}
      />
      <ConfirmAssetDelete
        open={Boolean(unassignSeat)}
        title="Unassign seat"
        description={
          unassignSeat
            ? `Remove ${seatLabel(unassignSeat)} from ${item.name}?`
            : ""
        }
        onOpenChange={(open) => {
          if (!open) setUnassignSeat(null);
        }}
        onConfirm={handleUnassign}
      />
    </ListPageShell>
  );
}
