"use client";

import { useEvent, useEventSubEntities, useStoreActions, useContractTemplates, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SignaturePad from "@/components/ui/SignaturePad";
import {
  ArrowLeft, FileText, Plus, Download, Trash2, Upload, X, Check,
  UserCheck, Building2, PenTool, History, Shield,
} from "lucide-react";
import { downloadBase64File, formatBytes, PDF_MAX_SIZE, validatePdfFile, downloadFromUrl } from "@/lib/pdf-utils";
import { uploadToStorage, getSignedUrl, deleteFromStorage, uploadBase64ToStorage } from "@/lib/supabase/storage";
import { getUserId, logContractAudit, fetchContractAuditLog } from "@/lib/supabase/db";
import type { EventContract, ContractAuditEntry } from "@/lib/types";

export default function EventContractsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["contracts"]);
  const { updateEvent } = useStoreActions();
  const templates = useContractTemplates();

  const [showAssign, setShowAssign] = useState<"planner" | "vendor" | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<{ file: File; fileName: string; fileSize: number } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [sigUrls, setSigUrls] = useState<Record<string, string>>({});
  const [auditLogId, setAuditLogId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<ContractAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Fetch signed URLs for signatures stored in Supabase Storage
  useEffect(() => {
    if (!event) return;
    const contracts = event.contracts ?? [];
    let cancelled = false;
    async function fetchSigUrls() {
      const urls: Record<string, string> = {};
      for (const c of contracts) {
        if (c.storagePlannerSig) {
          try {
            urls[`${c.id}-planner`] = await getSignedUrl("event-files", c.storagePlannerSig);
          } catch { /* ignore */ }
        }
        if (c.storageClientSig) {
          try {
            urls[`${c.id}-client`] = await getSignedUrl("event-files", c.storageClientSig);
          } catch { /* ignore */ }
        }
      }
      if (!cancelled) setSigUrls(urls);
    }
    fetchSigUrls();
    return () => { cancelled = true; };
  }, [event]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const contracts = event.contracts ?? [];
  const vendors = event.vendors ?? [];
  const plannerContracts = contracts.filter((c) => c.type === "planner");
  const vendorContracts = contracts.filter((c) => c.type === "vendor");

  const vendorsWithoutContract = vendors.filter(
    (v) => !vendorContracts.some((c) => c.vendorId === v.id)
  );

  function resetModal() {
    setShowAssign(null);
    setSelectedVendorId("");
    setUploadMode(false);
    setUploadName("");
    setUploadFile(null);
    setUploadError("");
  }

  function makeContract(overrides: Partial<EventContract> & { name: string; fileData: string; fileName: string; fileSize: number }): EventContract {
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    return {
      id: crypto.randomUUID(),
      templateId: null,
      type: showAssign === "vendor" ? "vendor" : "planner",
      vendorId: showAssign === "vendor" ? selectedVendorId : null,
      vendorName: vendor ? vendor.name : null,
      signedFileData: null,
      signedFileName: null,
      signedAt: null,
      assignedAt: new Date().toISOString(),
      plannerSignature: null,
      plannerSignedAt: null,
      plannerSignedName: null,
      clientSignature: null,
      clientSignedAt: null,
      clientSignedName: null,
      storagePath: null,
      storageSignedPath: null,
      storagePlannerSig: null,
      storageClientSig: null,
      plannerDisclosureAcceptedAt: null,
      plannerDisclosureIp: null,
      clientDisclosureAcceptedAt: null,
      clientDisclosureIp: null,
      ...overrides,
    };
  }

  function assignTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const contract = makeContract({
      templateId: template.id,
      name: template.name,
      fileData: template.fileData,
      fileName: template.fileName,
      fileSize: template.fileSize,
      storagePath: template.storagePath ?? null,
    });
    updateEvent(event!.id, { contracts: [...contracts, contract] });
    logContractAudit({ eventId: event!.id, contractId: contract.id, action: "contract_created", metadata: { contractName: template.name } });
    showToast(`Assigned "${template.name}"${vendor ? ` to ${vendor.name}` : ""}`);
    resetModal();
  }

  async function handleUploadFile(file: File) {
    setUploadError("");
    try {
      validatePdfFile(file);
      setUploadFile({ file, fileName: file.name, fileSize: file.size });
      if (!uploadName) setUploadName(file.name.replace(/\.pdf$/i, ""));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to read file.");
    }
  }

  async function saveUpload() {
    if (!uploadFile || !uploadName.trim()) return;
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const contractId = crypto.randomUUID();
    try {
      const userId = await getUserId();
      const storagePath = await uploadToStorage(
        "event-files",
        `${userId}/${eventId}/contracts/${contractId}/original.pdf`,
        uploadFile.file
      );
      const contract = makeContract({
        id: contractId,
        name: uploadName.trim(),
        fileData: "",
        fileName: uploadFile.fileName,
        fileSize: uploadFile.fileSize,
        storagePath,
      });
      updateEvent(event!.id, { contracts: [...contracts, contract] });
      logContractAudit({ eventId: event!.id, contractId: contract.id, action: "contract_created", metadata: { contractName: uploadName.trim() } });
      showToast(`Added "${uploadName}"${vendor ? ` for ${vendor.name}` : ""}`);
      resetModal();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function removeContract(contractId: string) {
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      if (contract.storagePath) deleteFromStorage("event-files", contract.storagePath).catch(console.error);
      if (contract.storageSignedPath) deleteFromStorage("event-files", contract.storageSignedPath).catch(console.error);
      if (contract.storagePlannerSig) deleteFromStorage("event-files", contract.storagePlannerSig).catch(console.error);
      if (contract.storageClientSig) deleteFromStorage("event-files", contract.storageClientSig).catch(console.error);
    }
    logContractAudit({ eventId: event!.id, contractId, action: "contract_deleted", metadata: { contractName: contract?.name } });
    updateEvent(event!.id, { contracts: contracts.filter((c) => c.id !== contractId) });
    showToast("Contract removed");
  }

  function handlePlannerDisclosureAccepted() {
    if (!signingContractId) return;
    const now = new Date().toISOString();
    const updated = contracts.map((c) =>
      c.id === signingContractId
        ? { ...c, plannerDisclosureAcceptedAt: now }
        : c
    );
    updateEvent(event!.id, { contracts: updated });
    logContractAudit({ eventId: event!.id, contractId: signingContractId, action: "disclosure_accepted" });
  }

  async function handlePlannerSign(signature: string, signedName: string) {
    if (!signingContractId) return;
    const contractName = contracts.find((c) => c.id === signingContractId)?.name;
    try {
      const userId = await getUserId();
      const path = await uploadBase64ToStorage(
        "event-files",
        `${userId}/${eventId}/contracts/${signingContractId}/planner_sig.png`,
        signature
      );
      const updated = contracts.map((c) =>
        c.id === signingContractId
          ? { ...c, plannerSignature: "", plannerSignedAt: new Date().toISOString(), plannerSignedName: signedName, storagePlannerSig: path }
          : c
      );
      updateEvent(event!.id, { contracts: updated });
      showToast("Planner signature applied");
    } catch {
      // Fallback: store base64 directly if Storage upload fails
      const updated = contracts.map((c) =>
        c.id === signingContractId
          ? { ...c, plannerSignature: signature, plannerSignedAt: new Date().toISOString(), plannerSignedName: signedName }
          : c
      );
      updateEvent(event!.id, { contracts: updated });
      showToast("Planner signature applied (stored locally)");
    }
    logContractAudit({ eventId: event!.id, contractId: signingContractId, action: "signature_applied", metadata: { actorName: signedName, contractName } });
    setSigningContractId(null);
  }

  function removePlannerSignature(contractId: string) {
    const contract = contracts.find((c) => c.id === contractId);
    if (contract?.storagePlannerSig) {
      deleteFromStorage("event-files", contract.storagePlannerSig).catch(console.error);
    }
    const updated = contracts.map((c) =>
      c.id === contractId
        ? { ...c, plannerSignature: null, plannerSignedAt: null, plannerSignedName: null, storagePlannerSig: null, plannerDisclosureAcceptedAt: null, plannerDisclosureIp: null }
        : c
    );
    updateEvent(event!.id, { contracts: updated });
    logContractAudit({ eventId: event!.id, contractId, action: "signature_removed", metadata: { contractName: contract?.name } });
    showToast("Planner signature removed");
  }

  function getSignatureStatus(contract: EventContract) {
    const plannerSigned = !!contract.storagePlannerSig || !!contract.plannerSignature;
    const clientSigned = !!contract.storageClientSig || !!contract.clientSignature;
    if (plannerSigned && clientSigned) return "fully-signed";
    if (plannerSigned || clientSigned) return "partially-signed";
    return "unsigned";
  }

  function ContractCard({ contract }: { contract: EventContract }) {
    const status = getSignatureStatus(contract);

    return (
      <div className="bg-white rounded-xl border border-stone-200 group overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800">{contract.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-stone-400">{contract.fileName} &middot; {formatBytes(contract.fileSize)}</span>
              {status === "fully-signed" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={10} /> Fully Signed
                </span>
              )}
              {status === "partially-signed" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-1">
                  <PenTool size={10} /> Awaiting {!(contract.storagePlannerSig || contract.plannerSignature) ? "Planner" : "Client"}
                </span>
              )}
              {status === "unsigned" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                  Unsigned
                </span>
              )}
              {contract.signedAt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex items-center gap-1">
                  <Upload size={10} /> Signed Copy
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                if (contract.storagePath) {
                  try {
                    const url = await getSignedUrl("event-files", contract.storagePath);
                    downloadFromUrl(url, contract.fileName);
                  } catch {
                    showToast("Download failed");
                  }
                } else {
                  downloadBase64File(contract.fileData, contract.fileName);
                }
                logContractAudit({ eventId: event!.id, contractId: contract.id, action: "contract_downloaded", metadata: { contractName: contract.name } });
              }}
              className="p-1.5 text-stone-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download size={14} />
            </button>
            {(contract.storageSignedPath || (contract.signedFileData && contract.signedFileName)) && (
              <button
                onClick={async () => {
                  if (contract.storageSignedPath) {
                    try {
                      const url = await getSignedUrl("event-files", contract.storageSignedPath);
                      downloadFromUrl(url, contract.signedFileName || "signed-contract.pdf");
                    } catch {
                      showToast("Download failed");
                    }
                  } else if (contract.signedFileData && contract.signedFileName) {
                    downloadBase64File(contract.signedFileData, contract.signedFileName);
                  }
                }}
                className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Download signed copy"
              >
                <UserCheck size={14} />
              </button>
            )}
            <button
              onClick={async () => {
                setAuditLogId(contract.id);
                setAuditLoading(true);
                try {
                  const entries = await fetchContractAuditLog(contract.id);
                  setAuditEntries(entries);
                } catch { setAuditEntries([]); }
                setAuditLoading(false);
              }}
              className="p-1.5 text-stone-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Audit trail"
            >
              <History size={14} />
            </button>
            <button
              onClick={() => setConfirmDeleteId(contract.id)}
              className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Signature section */}
        <div className="border-t border-stone-100 px-4 py-3 bg-stone-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Planner signature */}
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Planner</p>
              {(contract.storagePlannerSig || contract.plannerSignature) ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sigUrls[`${contract.id}-planner`] || contract.plannerSignature || ""}
                    alt="Planner signature"
                    className="h-12 object-contain mb-1.5"
                  />
                  <p className="text-xs font-medium text-stone-700">{contract.plannerSignedName}</p>
                  <p className="text-[10px] text-stone-400">
                    {new Date(contract.plannerSignedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  {contract.plannerDisclosureAcceptedAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
                      <Shield size={10} /> Disclosure accepted
                    </span>
                  )}
                  <button
                    onClick={() => removePlannerSignature(contract.id)}
                    className="text-[10px] text-stone-400 hover:text-red-500 mt-1.5 block"
                  >
                    Remove signature
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSigningContractId(contract.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors w-full justify-center border border-dashed border-rose-200"
                >
                  <PenTool size={12} />
                  Sign as Planner
                </button>
              )}
            </div>

            {/* Client signature */}
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Client</p>
              {(contract.storageClientSig || contract.clientSignature) ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sigUrls[`${contract.id}-client`] || contract.clientSignature || ""}
                    alt="Client signature"
                    className="h-12 object-contain mb-1.5"
                  />
                  <p className="text-xs font-medium text-stone-700">{contract.clientSignedName}</p>
                  <p className="text-[10px] text-stone-400">
                    {new Date(contract.clientSignedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  {contract.clientDisclosureAcceptedAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
                      <Shield size={10} /> Disclosure accepted
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-12">
                  <p className="text-xs text-stone-300 italic">Awaiting client signature</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/planner/${event.id}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
          <p className="text-xs text-stone-400">Contracts & E-Signatures</p>
        </div>
      </div>

      {/* Planner Contract Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-rose-400" />
            <h2 className="text-sm font-heading font-semibold text-stone-800">Planner Contract</h2>
          </div>
          <button
            onClick={() => { setShowAssign("planner"); setSelectedVendorId(""); }}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <Plus size={13} />
            {plannerContracts.length > 0 ? "Add Another" : "Assign Contract"}
          </button>
        </div>

        {plannerContracts.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center">
            <FileText size={24} className="text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No planner contract assigned yet</p>
            <button
              onClick={() => { setShowAssign("planner"); setSelectedVendorId(""); }}
              className="text-xs text-rose-500 hover:text-rose-600 mt-2"
            >
              Assign from template or upload
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {plannerContracts.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        )}
      </div>

      {/* Vendor Contracts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-teal-500" />
            <h2 className="text-sm font-heading font-semibold text-stone-800">Vendor Contracts</h2>
          </div>
          {vendorsWithoutContract.length > 0 && (
            <button
              onClick={() => { setShowAssign("vendor"); setSelectedVendorId(vendorsWithoutContract[0]?.id || ""); }}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-500 hover:text-teal-600 px-3 py-1.5 rounded-xl hover:bg-teal-50 transition-colors"
            >
              <Plus size={13} />
              Attach Contract
            </button>
          )}
        </div>

        {vendors.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center">
            <Building2 size={24} className="text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No vendors added to this event yet</p>
            <Link href={`/planner/${event.id}/vendors`} className="text-xs text-rose-500 hover:text-rose-600 mt-2 inline-block">
              Go to vendors page to add vendors
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor) => {
              const vContracts = vendorContracts.filter((c) => c.vendorId === vendor.id);
              return (
                <div key={vendor.id} className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-stone-50/50 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{vendor.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{vendor.category}</span>
                    </div>
                    <button
                      onClick={() => { setShowAssign("vendor"); setSelectedVendorId(vendor.id); }}
                      className="flex items-center gap-1 text-[11px] text-teal-500 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                    >
                      <Plus size={11} />
                      {vContracts.length > 0 ? "Add" : "Attach"}
                    </button>
                  </div>
                  {vContracts.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-stone-400">No contract attached</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {vContracts.map((c) => (
                        <ContractCard key={c.id} contract={c} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign / Upload Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetModal}>
          <div className="absolute inset-0 bg-stone-900/30" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-heading font-semibold text-stone-800">
                {showAssign === "planner" ? "Assign Planner Contract" : "Attach Vendor Contract"}
              </h2>
              <button onClick={resetModal} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {showAssign === "vendor" && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Vendor</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setUploadMode(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    !uploadMode ? "bg-teal-50 text-teal-600 border border-teal-200" : "bg-stone-50 text-stone-400 border border-stone-200"
                  }`}
                >
                  From Template
                </button>
                <button
                  onClick={() => setUploadMode(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    uploadMode ? "bg-teal-50 text-teal-600 border border-teal-200" : "bg-stone-50 text-stone-400 border border-stone-200"
                  }`}
                >
                  Upload New
                </button>
              </div>

              {!uploadMode ? (
                <>
                  {templates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={24} className="text-stone-300 mx-auto mb-2" />
                      <p className="text-sm text-stone-400">No templates available</p>
                      <Link href="/planner/contracts" className="text-xs text-rose-500 hover:text-rose-600 mt-1 inline-block">
                        Upload templates first
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => assignTemplate(t.id)}
                          className="w-full flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-teal-300 hover:bg-teal-50/30 text-left transition-colors"
                        >
                          <FileText size={16} className="text-teal-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800">{t.name}</p>
                            {t.description && <p className="text-xs text-stone-400 mt-0.5">{t.description}</p>}
                            <p className="text-xs text-stone-400 mt-1">{formatBytes(t.fileSize)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {!uploadFile ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-2xl p-8 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                      <Upload size={24} className="text-stone-300 mb-2" />
                      <p className="text-sm font-medium text-stone-600">Click to upload a PDF</p>
                      <p className="text-xs text-stone-400 mt-1">Max {formatBytes(PDF_MAX_SIZE)}</p>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile(file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                      <FileText size={18} className="text-teal-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{uploadFile.fileName}</p>
                        <p className="text-xs text-stone-400">{formatBytes(uploadFile.fileSize)}</p>
                      </div>
                      <button onClick={() => setUploadFile(null)} className="text-xs text-stone-400 hover:text-stone-600">Change</button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{uploadError}</p>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Contract Name *</label>
                    <input
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="e.g. Photography Contract - Smith Wedding"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={saveUpload}
                      disabled={!uploadFile || !uploadName.trim()}
                      className="text-xs font-medium bg-teal-500 text-white px-5 py-2.5 rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Attach Contract
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Pad Modal */}
      <SignaturePad
        open={!!signingContractId}
        title="Sign as Planner"
        onSign={handlePlannerSign}
        onCancel={() => setSigningContractId(null)}
        onDisclosureAccepted={handlePlannerDisclosureAccepted}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remove Contract?"
        message="This contract will be removed from the event. The original template will not be affected."
        confirmLabel="Remove"
        onConfirm={() => { if (confirmDeleteId) removeContract(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Audit Trail Modal */}
      {auditLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAuditLogId(null)}>
          <div className="absolute inset-0 bg-stone-900/30" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <History size={16} className="text-indigo-500" />
                <h2 className="text-sm font-heading font-semibold text-stone-800">Audit Trail</h2>
              </div>
              <button onClick={() => setAuditLogId(null)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {auditLoading ? (
                <p className="text-sm text-stone-400 text-center py-8">Loading audit trail...</p>
              ) : auditEntries.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-8">No audit entries yet. Entries are recorded when the migration is applied.</p>
              ) : (
                <div className="space-y-0">
                  {auditEntries.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          entry.action === "signature_applied" ? "bg-emerald-500" :
                          entry.action === "signature_removed" ? "bg-red-400" :
                          entry.action === "disclosure_accepted" ? "bg-indigo-500" :
                          entry.action === "contract_deleted" ? "bg-red-500" :
                          "bg-stone-300"
                        }`} />
                        {i < auditEntries.length - 1 && <div className="w-px flex-1 bg-stone-200 my-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-xs font-medium text-stone-700">
                          {entry.action.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {entry.actorType === "planner" ? "Planner" : "Client"}
                          {entry.metadata.actorName ? ` (${entry.metadata.actorName as string})` : ""}
                          {" · "}
                          {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                        {entry.ipAddress && (
                          <p className="text-[10px] text-stone-300 mt-0.5">IP: {entry.ipAddress}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
