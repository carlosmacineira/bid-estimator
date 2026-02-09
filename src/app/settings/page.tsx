"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Building2, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const settingsSchema = z.object({
  companyName: z.string().min(1),
  address: z.string(),
  phone: z.string(),
  license: z.string(),
  email: z.string(),
  website: z.string(),
  defaultLaborRate: z.number().min(0),
  defaultOverhead: z.number().min(0).max(100),
  defaultProfit: z.number().min(0).max(100),
  taxRate: z.number().min(0).max(100),
  defaultTerms: z.string(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        reset({
          ...data,
          defaultOverhead: data.defaultOverhead * 100,
          defaultProfit: data.defaultProfit * 100,
          taxRate: data.taxRate * 100,
        });
        setLoading(false);
      });
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          defaultOverhead: data.defaultOverhead / 100,
          defaultProfit: data.defaultProfit / 100,
          taxRate: data.taxRate / 100,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      reset({
        ...updated,
        defaultOverhead: updated.defaultOverhead * 100,
        defaultProfit: updated.defaultProfit * 100,
        taxRate: updated.taxRate * 100,
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass p-6 space-y-4">
              <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/95">Settings</h1>
          <p className="text-sm text-white/50 mt-1">Company information and default rates</p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={!isDirty || isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#CC0000]" />
            <h2 className="text-lg font-light text-white/90">Company Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Company Name</Label>
              <Input {...register("companyName")} className="glass-input h-10 px-3 text-sm w-full" />
              {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Address</Label>
              <Input {...register("address")} className="glass-input h-10 px-3 text-sm w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Phone</Label>
                <Input {...register("phone")} className="glass-input h-10 px-3 text-sm w-full" />
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Email</Label>
                <Input {...register("email")} className="glass-input h-10 px-3 text-sm w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">License #</Label>
                <Input {...register("license")} className="glass-input h-10 px-3 text-sm w-full" />
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Website</Label>
                <Input {...register("website")} className="glass-input h-10 px-3 text-sm w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Rate Settings */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#CC0000]" />
            <h2 className="text-lg font-light text-white/90">Default Rates</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Default Labor Rate ($/hr)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  {...register("defaultLaborRate", { valueAsNumber: true })}
                  className="glass-input h-10 pl-7 pr-3 text-sm w-full price"
                />
              </div>
              {errors.defaultLaborRate && <p className="text-xs text-red-400 mt-1">{errors.defaultLaborRate.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Overhead %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    {...register("defaultOverhead", { valueAsNumber: true })}
                    className="glass-input h-10 px-3 pr-7 text-sm w-full price"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Profit %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    {...register("defaultProfit", { valueAsNumber: true })}
                    className="glass-input h-10 px-3 pr-7 text-sm w-full price"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1.5 block">Tax Rate %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    {...register("taxRate", { valueAsNumber: true })}
                    className="glass-input h-10 px-3 pr-7 text-sm w-full price"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="glass p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[#CC0000]" />
            <h2 className="text-lg font-light text-white/90">Default Terms & Conditions</h2>
          </div>
          <Textarea
            {...register("defaultTerms")}
            rows={5}
            className="glass-input px-3 py-2 text-sm w-full resize-none"
          />
        </div>
      </form>
    </div>
  );
}
