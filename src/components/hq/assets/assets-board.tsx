"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/design/status-badge";

export type AssetRow = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: string;
  stationCode: string | null;
};

export function AssetsBoard({
  assets,
  expeditionId,
}: {
  assets: AssetRow[];
  expeditionId: string;
}) {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vehicle");
  const [busy, setBusy] = useState(false);
  const [registeredAsset, setRegisteredAsset] = useState(false);

  async function setStatus(id: string, status: "OPERATIONAL" | "MAINTENANCE" | "DECOMMISSIONED") {
    const res = await fetch(`/api/hq/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update asset.");
      return;
    }
    toast.success("Asset status updated.");
    router.refresh();
  }

  async function register() {
    setBusy(true);
    try {
      const res = await fetch("/api/hq/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expeditionId,
          assetTag: tag,
          name,
          category,
        }),
      });
      if (!res.ok) {
        toast.error("Could not register asset.");
        return;
      }
      toast.success("Asset registered.");
      setRegisteredAsset(true);
      setTag("");
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface p-4 rounded-[2px]">
        <h3 className="font-display font-semibold">Register asset</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input placeholder="Asset tag" value={tag} onChange={(e) => setTag(e.target.value)} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <Button className="mt-3" size="sm" variant="navy" disabled={busy || !tag || !name} onClick={register}>
          Add asset
        </Button>
        {registeredAsset ? (
          <Link
            href={`/hq/expeditions?expeditionId=${encodeURIComponent(expeditionId)}#expedition-${encodeURIComponent(expeditionId)}`}
            className={`${buttonVariants({ size: "sm", variant: "secondary" })} ml-2 mt-3`}
          >
            Continue to activation <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto border border-border bg-surface rounded-[2px]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left">
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Station</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.length ? assets.map((a) => (
              <tr key={a.id} className="border-b border-border">
                <td className="px-3 py-2 font-mono text-xs">{a.assetTag}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.stationCode ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={a.status}
                    tone={a.status === "OPERATIONAL" ? "success" : a.status === "MAINTENANCE" ? "warning" : "neutral"}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "OPERATIONAL")}>Operational</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "MAINTENANCE")}>Maintenance</Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-text-secondary">No assets registered for this expedition yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
