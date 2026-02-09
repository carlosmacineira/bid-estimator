"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Building2, DollarSign, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string(),
  phone: z.string(),
  license: z.string(),
  email: z.string(),
  website: z.string(),
  defaultLaborRate: z.number().min(0, "Must be 0 or more"),
  defaultOverhead: z.number().min(0).max(100, "Max 100%"),
  defaultProfit: z.number().min(0).max(100, "Max 100%"),
  taxRate: z.number().min(0).max(100, "Max 100%"),
  defaultTerms: z.string(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function SettingsSkeleton() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-white/[0.05] rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-white/[0.03] rounded animate-pulse" />
        </div>
        <div className="h-11 w-36 bg-white/[0.05] rounded-xl animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2].map((i) => (
          <div key={i} className="glass p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-5 w-40 bg-white/[0.05] rounded animate-pulse" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-20 bg-white/[0.03] rounded animate-pulse" />
                  <div className="h-11 bg-white/[0.04] rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Terms skeleton */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-52 bg-white/[0.05] rounded animate-pulse" />
        </div>
        <div className="h-32 bg-white/[0.04] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  /* ---- Fetch settings on mount ---------------------------------- */

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
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, [reset]);

  /* ---- Save ----------------------------------------------------- */

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

  /* ---- Loading state -------------------------------------------- */

  if (loading) {
    return <SettingsSkeleton />;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white/95">
            Settings
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Company information and default rates
          </p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={!isDirty || isSubmitting}
          className="flex items-center justify-center gap-2 px-5 h-11 min-w-[44px] bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all active:scale-[0.97] shadow-lg shadow-red-900/20"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Company Information ──────────────────────────────── */}
          <div className="glass p-5 sm:p-6 space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#CC0000]/10">
                <Building2 className="w-4.5 h-4.5 text-[#CC0000]" />
              </div>
              <h2 className="text-base font-light text-white/90 tracking-tight">
                Company Information
              </h2>
            </div>

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Company Name <span className="text-red-400">*</span>
                </Label>
                <input
                  {...register("companyName")}
                  className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                  placeholder="Your company name"
                />
                {errors.companyName && (
                  <p className="text-xs text-red-400 mt-1.5">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Address
                </Label>
                <input
                  {...register("address")}
                  className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                  placeholder="Street address"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Phone
                  </Label>
                  <input
                    {...register("phone")}
                    type="tel"
                    className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Email
                  </Label>
                  <input
                    {...register("email")}
                    type="email"
                    className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              {/* License + Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    License #
                  </Label>
                  <input
                    {...register("license")}
                    className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                    placeholder="License number"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Website
                  </Label>
                  <input
                    {...register("website")}
                    type="url"
                    className="glass-input h-11 px-3.5 text-sm w-full rounded-xl"
                    placeholder="https://company.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Default Rates ────────────────────────────────────── */}
          <div className="glass p-5 sm:p-6 space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#CC0000]/10">
                <DollarSign className="w-4.5 h-4.5 text-[#CC0000]" />
              </div>
              <h2 className="text-base font-light text-white/90 tracking-tight">
                Default Rates
              </h2>
            </div>

            <div className="space-y-4">
              {/* Labor Rate */}
              <div>
                <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                  Default Labor Rate ($/hr)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("defaultLaborRate", { valueAsNumber: true })}
                    className="glass-input h-11 pl-7 pr-3.5 text-sm w-full price rounded-xl"
                    placeholder="0.00"
                  />
                </div>
                {errors.defaultLaborRate && (
                  <p className="text-xs text-red-400 mt-1.5">
                    {errors.defaultLaborRate.message}
                  </p>
                )}
              </div>

              {/* Overhead + Profit + Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Overhead %
                  </Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register("defaultOverhead", { valueAsNumber: true })}
                      className="glass-input h-11 px-3.5 pr-8 text-sm w-full price rounded-xl"
                      placeholder="0"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
                      %
                    </span>
                  </div>
                  {errors.defaultOverhead && (
                    <p className="text-xs text-red-400 mt-1.5">
                      {errors.defaultOverhead.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Profit %
                  </Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register("defaultProfit", { valueAsNumber: true })}
                      className="glass-input h-11 px-3.5 pr-8 text-sm w-full price rounded-xl"
                      placeholder="0"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
                      %
                    </span>
                  </div>
                  {errors.defaultProfit && (
                    <p className="text-xs text-red-400 mt-1.5">
                      {errors.defaultProfit.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
                    Tax Rate %
                  </Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register("taxRate", { valueAsNumber: true })}
                      className="glass-input h-11 px-3.5 pr-8 text-sm w-full price rounded-xl"
                      placeholder="0"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
                      %
                    </span>
                  </div>
                  {errors.taxRate && (
                    <p className="text-xs text-red-400 mt-1.5">
                      {errors.taxRate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary helper */}
              <div className="glass p-4 rounded-xl mt-2 space-y-2">
                <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
                  How rates are applied
                </p>
                <p className="text-xs text-white/35 leading-relaxed">
                  Overhead and profit margins are calculated on top of material
                  + labor subtotals. Tax rate is applied to the final total.
                  These defaults can be overridden per estimate.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terms & Conditions (full width) ──────────────────────── */}
        <div className="glass p-5 sm:p-6 space-y-4">
          {/* Section header */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#CC0000]/10">
              <FileText className="w-4.5 h-4.5 text-[#CC0000]" />
            </div>
            <div>
              <h2 className="text-base font-light text-white/90 tracking-tight">
                Default Terms & Conditions
              </h2>
              <p className="text-xs text-white/35 mt-0.5">
                Automatically included on new estimates
              </p>
            </div>
          </div>
          <textarea
            {...register("defaultTerms")}
            rows={6}
            className="glass-input px-3.5 py-3 text-sm w-full resize-none rounded-xl leading-relaxed"
            placeholder="Enter your default terms and conditions..."
          />
        </div>

        {/* ── Mobile save button (duplicate at bottom for convenience) */}
        <div className="sm:hidden pt-2 pb-4">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="w-full flex items-center justify-center gap-2 h-12 bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all active:scale-[0.97] shadow-lg shadow-red-900/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
